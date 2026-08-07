/**
 * Login page. react-hook-form + zodResolver: RHF owns form state with
 * minimal re-renders, Zod owns the rules (same schema family as the server).
 * Field errors render inline; credential rejections from the API render as
 * a form-level message.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { loginSchema } from '../auth.schema.js';
import { apiMessage } from '../../../lib/utils.js';
import Input from '../../../components/ui/Input.jsx';
import Button from '../../../components/ui/Button.jsx';

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  // Already logged in (e.g. typed /login by hand)? Straight to the app.
  if (status === 'authed') return <Navigate to="/" replace />;

  async function onSubmit(values) {
    setServerError(null);
    try {
      await login(values);
      navigate('/', { replace: true });
    } catch (error) {
      // A client-side block (e.g. the P2-M1 worker web gate) carries a ready
      // message; otherwise fall back to the server's message.
      setServerError(error.userMessage ?? apiMessage(error, 'Could not log in. Is the server running?'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="mb-2 text-center">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Use your company account</p>
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="you@company.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      {serverError && (
        <p role="alert" className="rounded-lg bg-danger/10 p-3 text-center text-sm text-danger">
          {serverError}
        </p>
      )}

      <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
        Sign in
      </Button>
    </form>
  );
}
