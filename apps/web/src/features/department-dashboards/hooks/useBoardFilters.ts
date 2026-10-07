import { useUrlParams } from '@/lib/use-url-params';
import { readBoardFilters, type BoardFilters } from '../board.utils';

/** Bộ lọc board đọc / ghi trên URL (`?q=&mine=1&priority=&due=`); giữ nguyên `?task=`. */
export function useBoardFilters() {
  const [params, updateParams] = useUrlParams();
  const filters = readBoardFilters(params);

  const update = (changes: Partial<BoardFilters>) =>
    updateParams({
      ...('q' in changes && { q: changes.q ?? null }),
      ...('mine' in changes && { mine: changes.mine ? '1' : null }),
      ...('priority' in changes && { priority: changes.priority ?? null }),
      ...('due' in changes && { due: changes.due ?? null }),
    });
  const clear = () => updateParams({ q: null, mine: null, priority: null, due: null });

  return { filters, update, clear };
}
