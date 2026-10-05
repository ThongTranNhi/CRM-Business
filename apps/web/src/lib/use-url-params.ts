import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

type ParamChanges = Record<string, string | number | null>;

/**
 * Bộ lọc, tab, trang hiện tại lưu trên URL để F5 và chia sẻ link vẫn giữ nguyên.
 * Giá trị null hoặc rỗng → xoá tham số khỏi URL.
 */
export function useUrlParams() {
  const [params, setParams] = useSearchParams();
  const update = useCallback(
    (changes: ParamChanges) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '') next.delete(key);
            else next.set(key, String(value));
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [params, update] as const;
}

/** `?page=` hợp lệ (số nguyên ≥ 1), sai thì về trang 1. */
export function readPage(params: URLSearchParams): number {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Giá trị tham số nằm trong danh sách cho phép, sai thì dùng mặc định. */
export function readOption<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T {
  const value = params.get(key);
  return allowed.find((option) => option === value) ?? allowed[0]!;
}
