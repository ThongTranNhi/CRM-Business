import { ButtonLink, EmptyState, PageHeader } from '@/components/ui';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Không tìm thấy trang" />
      <EmptyState
        icon="search"
        title="Không tìm thấy trang"
        description="Đường dẫn không tồn tại hoặc đã bị thay đổi."
        action={<ButtonLink to="/app">Về Tổng quan</ButtonLink>}
      />
    </>
  );
}
