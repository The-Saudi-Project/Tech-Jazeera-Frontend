/**
 * Provider stack, ordered inside-out by dependency:
 *   QueryClientProvider (no deps) → ToastProvider → AuthProvider (may use
 *   toasts later) → RouterProvider (route guards need auth state).
 */
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '../lib/queryClient.js';
import { ToastProvider } from '../components/ui/Toast.jsx';
import { AuthProvider } from '../features/auth/AuthContext.jsx';
import { router } from './router.jsx';

export default function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
