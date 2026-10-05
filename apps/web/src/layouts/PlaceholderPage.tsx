import { ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui';

interface PlaceholderPageProps {
  title: string;
}

/** Trang của module chưa làm tới: có route, có mục menu, không dùng dữ liệu giả (ADR 008). */
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon="settings"
          title="Tính năng đang được xây dựng"
          description="Trang này sẽ có dữ liệu thật khi module tương ứng hoàn thành."
          action={
            <ButtonLink to="/app" variant="secondary">
              Về Tổng quan
            </ButtonLink>
          }
        />
      </Card>
    </>
  );
}
