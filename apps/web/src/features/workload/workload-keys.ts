// Module khác import file nhỏ này (không qua index) để làm mới bảng sau thao tác trên task mà không kéo trang vào
// bundle chính.
import type { WorkloadParams } from './types';

export const workloadKeys = {
  all: ['workload'] as const,
  list: (params: WorkloadParams) => [...workloadKeys.all, params] as const,
};
