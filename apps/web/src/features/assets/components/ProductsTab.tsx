import { useState } from 'react';
import { Button, Card, EmptyState, ErrorState, Icon, Pagination, Skeleton } from '@/components/ui';
import { useCan } from '@/features/auth';
import { useUrlParams } from '@/lib/use-url-params';
import { hasProductFilters, readProductParams } from '../assets.utils';
import { useProducts } from '../hooks/useProducts';
import type { Product } from '../types';
import { ArchiveProductDialog } from './ArchiveProductDialog';
import { ProductFilters } from './ProductFilters';
import { ProductFormModal } from './ProductFormModal';
import { ProductTable } from './ProductTable';

/** Form đang mở: thêm mới (`product` undefined) hoặc sửa một sản phẩm. */
type FormState = { product?: Product } | null;

/** Tab Sản phẩm: bộ lọc trên URL, bảng, [Thêm sản phẩm], sửa / xoá theo quyền từng dòng. */
export function ProductsTab() {
  const canDo = useCan();
  const [urlParams, updateParams] = useUrlParams();
  const params = readProductParams(urlParams);
  const query = useProducts(params);
  const [form, setForm] = useState<FormState>(null);
  const [archiving, setArchiving] = useState<Product | null>(null);
  const canCreate = canDo('products.create');
  const clearFilters = () => updateParams({ q: null, department: null, status: null, page: null });

  function renderBody() {
    if (query.isPending) return <Skeleton className="h-64 w-full" />;
    if (query.isError) {
      return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
    }
    if (query.data.data.length === 0) {
      return (
        <Card>
          {hasProductFilters(params) ? (
            <EmptyState
              icon="search"
              title="Không có sản phẩm phù hợp"
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  Xoá lọc
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="package"
              title="Chưa có sản phẩm nào"
              description="Sản phẩm công ty làm ra (website, ứng dụng…) kèm link, mô tả và người phụ trách."
              action={canCreate && <Button onClick={() => setForm({})}>Thêm sản phẩm</Button>}
            />
          )}
        </Card>
      );
    }
    return (
      <>
        <ProductTable
          products={query.data.data}
          canOpenProfile={canDo('employees.view')}
          onEdit={(product) => setForm({ product })}
          onArchive={setArchiving}
        />
        <Pagination {...query.data.meta} onChange={(page) => updateParams({ page })} />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ProductFilters
            params={params}
            onChange={(changes) => updateParams({ ...changes, page: null })}
          />
        </div>
        {canCreate && (
          <Button onClick={() => setForm({})}>
            <Icon name="plus" size={16} />
            Thêm sản phẩm
          </Button>
        )}
      </div>
      {renderBody()}
      {form && <ProductFormModal product={form.product} onClose={() => setForm(null)} />}
      <ArchiveProductDialog product={archiving} onClose={() => setArchiving(null)} />
    </>
  );
}
