// Module khác import file nhỏ này (không qua index) để làm mới Tổng quan sau thao tác trên task mà không kéo trang
// vào bundle chính.
export const overviewKeys = {
  all: ['overview'] as const,
  personal: () => [...overviewKeys.all, 'personal'] as const,
};
