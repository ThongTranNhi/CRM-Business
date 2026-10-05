import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
import { getOwnProfile, updateOwnProfile } from '../api/profile.api';

export function useOwnProfile() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const queryKey = ['own-profile', session?.user.id];
  const query = useQuery({ queryKey, queryFn: getOwnProfile, enabled: Boolean(session),
    staleTime: 240_000, refetchInterval: 240_000 });
  const mutation = useMutation({ mutationFn: updateOwnProfile,
    onSuccess: (profile) => { queryClient.setQueryData(queryKey, profile); } });
  return { query, mutation };
}
