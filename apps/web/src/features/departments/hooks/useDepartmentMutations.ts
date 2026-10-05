import { useMutation } from '@tanstack/react-query';
import { useInvalidateQueries } from '@/lib/use-invalidate-queries';
import {
  addMember,
  createDepartment,
  deleteDepartment,
  restoreDepartment,
  updateDepartment,
} from '../api/departments.api';
import type { DepartmentChanges, MoveMemberInput } from '../types';

// Ghi phòng ban làm đổi cả hồ sơ nhân viên (phòng, trưởng phòng) và thông tin người đang đăng nhập.
const AFFECTED_KEYS = [
  ['departments'],
  ['department-options'],
  ['employee-directory'],
  ['employee-detail'],
  ['employee-options'],
  ['account-state'],
];

export function useCreateDepartment() {
  const invalidate = useInvalidateQueries(AFFECTED_KEYS);
  return useMutation({ mutationFn: createDepartment, onSuccess: invalidate });
}

export function useUpdateDepartment(id: string) {
  const invalidate = useInvalidateQueries(AFFECTED_KEYS);
  return useMutation({
    mutationFn: (changes: DepartmentChanges) => updateDepartment(id, changes),
    onSuccess: invalidate,
  });
}

/** [Thêm thành viên] / [Chuyển phòng]: `departmentId` là phòng nhận người. */
export function useAddMember() {
  const invalidate = useInvalidateQueries(AFFECTED_KEYS);
  return useMutation({
    mutationFn: ({ departmentId, ...input }: MoveMemberInput & { departmentId: string }) =>
      addMember(departmentId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteDepartment(id: string) {
  const invalidate = useInvalidateQueries(AFFECTED_KEYS);
  return useMutation({
    mutationFn: (receivingDepartmentId: string | null) =>
      deleteDepartment(id, receivingDepartmentId),
    // Không chờ làm mới: trang chi tiết rời đi ngay, tránh hiện lỗi 404 của chính phòng vừa xoá.
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useRestoreDepartment() {
  const invalidate = useInvalidateQueries(AFFECTED_KEYS);
  return useMutation({ mutationFn: restoreDepartment, onSuccess: invalidate });
}
