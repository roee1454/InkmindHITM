import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnMount: false,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
      },
    }
  })

  return {
    queryClient,
  }
}
export default function TanstackQueryProvider() {}
