import { useQueryClient, type QueryKey } from '@tanstack/react-query';

/** Trả về hàm làm mới các nhóm query sau một thao tác ghi (frontend-spec 1.2). */
export function useInvalidateQueries(queryKeys: readonly QueryKey[]) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
