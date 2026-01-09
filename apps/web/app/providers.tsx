'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'bg-bg-secondary text-text-primary border border-border-subtle',
          duration: 4000,
          style: {
            background: '#111113',
            color: '#fafafa',
            border: '1px solid #27272a',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#111113',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#111113',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}
