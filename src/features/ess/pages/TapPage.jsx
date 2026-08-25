/**
 * TapPage — where a physical NFC tap point's URL (/tap/:token) lands. Sits
 * inside RequireAuth (spinner while the session silently restores, redirect
 * to /login?next=... if not logged in) but outside the role-split routers —
 * both a Worker (the real audience) and a stray staff tap need a sane
 * response here, not a hard redirect to a different shell.
 *
 * Same geofence/office-IP verification and check-in/out logic as the Sign
 * in/Sign out buttons in My Attendance — a tap just toggles between them
 * automatically (see attendance.service.js's selfTap()).
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { tapMyAttendance } from '../ess.api.js';
import { apiMessage, formatHours, formatTime } from '../../../lib/utils.js';
import Spinner from '../../../components/ui/Spinner.jsx';
import Button from '../../../components/ui/Button.jsx';

function Centered({ children }) {
  return (
    <div className="grid min-h-screen place-items-center bg-bg p-6 text-center">
      <div className="flex max-w-sm flex-col items-center">{children}</div>
    </div>
  );
}

export default function TapPage() {
  const { token } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState('working'); // 'working' | 'done' | 'error'
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const attempted = useRef(false);

  useEffect(() => {
    if (user?.role !== 'Worker' || attempted.current) return;
    attempted.current = true;

    function submit(coords) {
      tapMyAttendance({ token, ...coords })
        .then((data) => {
          setResult(data);
          setState('done');
        })
        .catch((err) => {
          setError(apiMessage(err));
          setState('error');
        });
    }

    if (!navigator.geolocation) {
      submit({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => submit({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => submit({}),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, [user, token]);

  if (user?.role !== 'Worker') {
    return (
      <Centered>
        <p className="text-sm text-muted">
          This tap point is for worker accounts. Sign in with your worker login to use it.
        </p>
      </Centered>
    );
  }

  if (state === 'working') {
    return (
      <Centered>
        <Spinner className="h-8 w-8 text-primary" />
        <p className="mt-3 text-sm text-muted">Recording your tap…</p>
      </Centered>
    );
  }

  if (state === 'error') {
    return (
      <Centered>
        <p className="text-sm text-danger">{error}</p>
        <Link to="/me/attendance" className="mt-4">
          <Button variant="secondary">Go to My Attendance</Button>
        </Link>
      </Centered>
    );
  }

  return (
    <Centered>
      <p className="text-lg font-semibold">
        {result.action === 'checked-in'
          ? `Signed in at ${formatTime(result.record.checkInTime)}`
          : `Signed out — ${formatHours(result.record.hoursWorked)} hrs today`}
      </p>
      <p className="mt-1 text-sm text-muted">{result.tapPoint}</p>
      <Link to="/me/attendance" className="mt-4">
        <Button variant="secondary">View my attendance</Button>
      </Link>
    </Centered>
  );
}
