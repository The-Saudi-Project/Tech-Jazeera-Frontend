/**
 * Provider stack, ordered inside-out by dependency:
 *   ThemeProvider (no deps) → QueryClientProvider (no deps) → ToastProvider →
 *   AuthProvider (may use toasts later) → RouterProvider (route guards need
 *   auth state).
 */
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '../lib/queryClient.js';
import { ThemeProvider } from './ThemeContext.jsx';
import { ToastProvider } from '../components/ui/Toast.jsx';
import { AuthProvider } from '../features/auth/AuthContext.jsx';
import { router } from './router.jsx';

export default function AppProviders() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
