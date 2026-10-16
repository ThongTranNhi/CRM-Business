import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';
import { useClearCacheOnUserChange } from '@/features/auth';
import { queryClient } from './query-client';

export function Providers({ children }: { children: ReactNode }) {
  useClearCacheOnUserChange(queryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
