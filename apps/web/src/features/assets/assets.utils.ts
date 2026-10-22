import type { BadgeTone } from '@/components/ui';
import { readPage } from '@/lib/use-url-params';
import type { ProductForm } from './schemas/product.schema';
import {
  PRODUCT_KINDS,
  PRODUCT_STATUSES,
  type Product,
  type ProductInput,
  type ProductKind,
  type ProductParams,
  type ProductStatus,
} from './types';

/** Màu trạng thái theo docs/ui-ux/colors.md mục 4 (đang làm info, chạy tốt success, tạm dừng warning). */
export const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; tone: BadgeTone }> = {
  developing: { label: 'Đang phát triển', tone: 'info' },
  active: { label: 'Đang hoạt động', tone: 'success' },
  paused: { label: 'Tạm ngừng', tone: 'warning' },
  discontinued: { label: 'Ngừng hẳn', tone: 'neutral' },
};

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  company: 'Sản phẩm công ty',
  partner: 'Website doanh nghiệp hợp tác',
};

/** Đọc bộ lọc tab Sản phẩm từ URL; giá trị sai → mặc định. */
export function readProductParams(params: URLSearchParams): ProductParams {
  const status = params.get('status');
  const kind = params.get('kind');
  return {
    q: params.get('q') ?? '',
    departmentId: params.get('department') ?? '',
    status: PRODUCT_STATUSES.find((value) => value === status) ?? '',
    kind: PRODUCT_KINDS.find((value) => value === kind) ?? '',
    page: readPage(params),
  };
}

export const hasProductFilters = (params: ProductParams): boolean =>
  params.q !== '' || params.departmentId !== '' || params.status !== '' || params.kind !== '';

/** "link.example.com/path" — hiện gọn dưới tên sản phẩm (bỏ giao thức, dấu / cuối). */
export const displayUrl = (url: string): string =>
  url.replace(/^https?:\/\//i, '').replace(/\/$/, '');

/** Giá trị form → body API ('' ở ô chọn / ô mô tả = null). */
export const productInputOf = (form: ProductForm): ProductInput => ({
  name: form.name,
  url: form.url,
  description: form.description || null,
  status: form.status,
  kind: form.kind,
  ownerEmployeeId: form.ownerEmployeeId,
  projectId: form.projectId || null,
  memberIds: form.memberIds,
});

/** Form mở sẵn của một sản phẩm (sửa) hoặc trống (thêm mới — phòng chọn sẵn nếu có). */
export const productFormOf = (product: Product | undefined, departmentId: string): ProductForm => ({
  departmentId: product?.department.id ?? departmentId,
  name: product?.name ?? '',
  url: product?.url ?? '',
  description: product?.description ?? '',
  status: product?.status ?? 'developing',
  kind: product?.kind ?? 'company',
  ownerEmployeeId: product?.owner.id ?? '',
  projectId: product?.project?.id ?? '',
  memberIds: product?.members.map((member) => member.id) ?? [],
});

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** PATCH chỉ gửi trường đã đổi — người phụ trách (chỉ sửa link / mô tả) không vô tình gửi trường khác. */
export function productChanges(product: Product, input: ProductInput): Partial<ProductInput> {
  const current = productInputOf(productFormOf(product, ''));
  const keys = Object.keys(input) as (keyof ProductInput)[];
  const changed = keys.filter((key) =>
    key === 'memberIds'
      ? !sameIds(input.memberIds, current.memberIds)
      : input[key] !== current[key],
  );
  return Object.fromEntries(changed.map((key) => [key, input[key]]));
}
