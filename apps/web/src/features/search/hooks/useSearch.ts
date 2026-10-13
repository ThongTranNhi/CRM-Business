import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { searchAll } from '../api/search.api';
import { MIN_QUERY } from '../search.utils';

/** Tìm sau khi ngừng gõ 300ms, khi có ≥ 2 ký tự; giữ kết quả cũ trong lúc chờ kết quả mới. */
export function useSearch(text: string) {
  const q = useDebouncedValue(text.trim());
  const query = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchAll(q),
    enabled: q.length >= MIN_QUERY,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  return { ...query, isReady: q.length >= MIN_QUERY };
}
