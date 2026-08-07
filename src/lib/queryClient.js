/**
 * TanStack Query client — server-state cache configuration.
 *
 * Why TanStack Query at all: it replaces hand-written useEffect fetching,
 * loading flags, error flags, and cache invalidation with one declarative
 * hook per query, and gives us request de-duplication for free.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is "fresh" for 30s — navigating back to a screen inside that
      // window renders instantly from cache with no spinner and no request.
      staleTime: 30_000,
      // One retry covers a network blip; more would make real errors feel
      // like a hung app. 401s are already handled by the axios interceptor.
      retry: 1,
      // An internal tool doesn't need to refetch every time the user
      // alt-tabs back from WhatsApp.
      refetchOnWindowFocus: false,
    },
  },
});
