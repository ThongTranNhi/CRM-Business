import { useCallback } from 'react';
import { can, type Permission } from '../permissions';
import { useCurrentUser } from './useCurrentUser';

/** `const canDo = useCan(); canDo('departments.manage')` — dùng để ẩn nút theo quyền. */
export function useCan() {
  const { data: user } = useCurrentUser();
  return useCallback(
    (permission: Permission, scope?: { departmentId?: string }) => can(user, permission, scope),
    [user],
  );
}
