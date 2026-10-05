import { useQuery } from '@tanstack/react-query';
import { getAccountState } from '../api/auth.api';
import { useSession } from './useSession';

export function useAccountState() {
  const { session } = useSession();
  return useQuery({ queryKey: ['account-state', session?.user.id, session?.access_token],
    queryFn: getAccountState, enabled: Boolean(session), staleTime: 0, refetchInterval: 30_000, retry: false });
}
