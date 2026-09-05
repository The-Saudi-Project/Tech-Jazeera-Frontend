/**
 * NotificationBell (P3-F) — the in-app notification center, mounted in both
 * DashboardLayout and EssLayout headers so every role (staff and Worker
 * alike) gets it: expiry alerts, and status changes on whatever they
 * submitted (leave, timesheets, financial requests, exit documents) or, for
 * a Coordinator, a client they submitted for approval.
 *
 * Polls every 30s for the unread count — simple and sufficient for a
 * handful of users; a websocket/SSE channel would be over-engineering this
 * for the traffic this app actually sees.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../../features/notifications/notifications.api.js';
import { pushSupported, getExistingPushSubscription, enablePushNotifications, disablePushNotifications } from '../../features/notifications/push.js';
import { timeAgo, cn } from '../../lib/utils.js';
import { useToast } from '../ui/Toast.jsx';
import Button from '../ui/Button.jsx';

export default function NotificationBell() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(null); // null = unknown yet
  const [pushBusy, setPushBusy] = useState(false);
  const panelRef = useRef(null);

  const { data } = useQuery({
    queryKey: ['notifications', 'bell'],
    queryFn: () => listNotifications({ limit: 10 }),
    // 30s made a fresh approval-needed notification feel like it never
    // arrived without a manual refresh. 10s is still a handful of requests
    // an hour even with the whole staff logged in — cheap insurance for
    // something people expect to feel near-instant. Overriding
    // refetchOnWindowFocus here (the app-wide default is off, deliberately,
    // for every other query) means switching back to this tab also checks
    // immediately instead of waiting for the next tick.
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!pushSupported()) {
      setPushSubscribed(false);
      return;
    }
    getExistingPushSubscription().then((sub) => setPushSubscribed(Boolean(sub)));
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const readMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: invalidate,
  });
  const readAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: invalidate,
  });

  async function handleTogglePush() {
    setPushBusy(true);
    try {
      if (pushSubscribed) {
        await disablePushNotifications();
        setPushSubscribed(false);
        toast.success(t('notificationsPanel.pushDisabled'));
      } else {
        await enablePushNotifications();
        setPushSubscribed(true);
        toast.success(t('notificationsPanel.pushEnabled'));
      }
    } catch (error) {
      toast.error(error.message || t('notificationsPanel.pushError'));
    } finally {
      setPushBusy(false);
    }
  }

  function handleOpenNotification(n) {
    if (!n.read) readMutation.mutate(n._id);
    setOpen(false);
    if (n.url) navigate(n.url);
  }

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={t('header.notifications')}
        aria-label={t('header.notifications')}
        className="relative rounded-lg p-2 text-muted transition-colors hover:bg-border/40 hover:text-text"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-30 rounded-xl border border-border bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">{t('notificationsPanel.title')}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => readAllMutation.mutate()}
              >
                {t('notificationsPanel.markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">{t('notificationsPanel.empty')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n._id}>
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(n)}
                      className={cn(
                        'block w-full px-4 py-3 text-left text-sm transition-colors hover:bg-border/30',
                        !n.read && 'bg-primary/5'
                      )}
                    >
                      <span className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                        <span className="min-w-0">
                          <span className={cn('block truncate', !n.read && 'font-semibold')}>{n.title}</span>
                          {n.body && <span className="mt-0.5 block truncate text-xs text-muted">{n.body}</span>}
                          <span className="mt-0.5 block text-xs text-muted/70">{timeAgo(n.createdAt)}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pushSupported() && pushSubscribed !== null && (
            <div className="border-t border-border px-4 py-3">
              <Button size="sm" variant="secondary" className="w-full" isLoading={pushBusy} onClick={handleTogglePush}>
                {pushSubscribed ? t('notificationsPanel.disablePush') : t('notificationsPanel.enablePush')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
