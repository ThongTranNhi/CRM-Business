import { ButtonLink, EmptyState, PageHeader } from '@/components/ui';

export function ForbiddenPage() {
  return (
    <>
      <PageHeader title="Không có quyền truy cập" />
      <EmptyState
        icon="lock"
        title="Bạn không có quyền xem trang này"
        description="Nếu cần truy cập, hãy liên hệ quản trị viên hoặc HR."
        action={<ButtonLink to="/app">Về Tổng quan</ButtonLink>}
      />
    </>
  );
}
