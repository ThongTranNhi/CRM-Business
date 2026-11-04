import { AppError, forbidden } from '../../lib/app-error';
import { departmentNotFound } from '../../lib/directory-errors';
import { TASK_PROJECT_ERRORS } from '../../lib/project-errors';
import type { DatabaseErrorMap } from '../../lib/supabase';

// Mã lỗi RPC sản phẩm (supabase/migrations/20261018090000_products.sql) → lỗi nghiệp vụ có nghĩa.

export const productNotFound = () =>
  new AppError('PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm hoặc sản phẩm đã bị xoá', 404);

const productProjectNotInDepartment = () =>
  new AppError('PROJECT_NOT_IN_DEPARTMENT', 'Chỉ gắn được dự án cùng phòng ban với sản phẩm', 422);

export const PRODUCT_ERRORS: DatabaseErrorMap = {
  ...TASK_PROJECT_ERRORS,
  PROJECT_NOT_IN_DEPARTMENT: productProjectNotInDepartment,
  products_project_department_fk: productProjectNotInDepartment,
  FORBIDDEN: forbidden,
  DEPARTMENT_NOT_FOUND: departmentNotFound,
  PRODUCT_NOT_FOUND: productNotFound,
  PRODUCT_PERSON_NOT_FOUND: () =>
    new AppError(
      'PRODUCT_PERSON_NOT_FOUND',
      'Người phụ trách không tồn tại hoặc đã nghỉ việc',
      422,
    ),
  products_department_name_key: () =>
    new AppError('PRODUCT_NAME_EXISTS', 'Phòng ban đã có sản phẩm cùng tên', 409),
  products_url_check: () =>
    new AppError('VALIDATION_ERROR', 'Link phải bắt đầu bằng http:// hoặc https://', 400),
  products_name_check: () =>
    new AppError('VALIDATION_ERROR', 'Tên sản phẩm cần từ 1 đến 120 ký tự', 400),
  products_description_check: () =>
    new AppError('VALIDATION_ERROR', 'Mô tả sản phẩm tối đa 2000 ký tự', 400),
};

// Mã lỗi RPC tài sản được cấp (supabase/migrations/20261103090000_issued_assets.sql).

export const assetNotFound = () =>
  new AppError('ASSET_NOT_FOUND', 'Không tìm thấy tài sản hoặc tài sản đã bị xoá', 404);

const assetNotAvailable = () =>
  new AppError('ASSET_NOT_AVAILABLE', 'Chỉ cấp được tài sản đang ở trạng thái Trong kho', 409);

export const ISSUED_ASSET_ERRORS: DatabaseErrorMap = {
  FORBIDDEN: forbidden,
  DEPARTMENT_NOT_FOUND: departmentNotFound,
  ASSET_NOT_FOUND: assetNotFound,
  ASSET_NOT_AVAILABLE: assetNotAvailable,
  // Hai người cấp cùng lúc: lượt sau vướng index một lượt cấp đang mở.
  asset_assignments_open_key: assetNotAvailable,
  ASSET_PERSON_NOT_FOUND: () =>
    new AppError('ASSET_PERSON_NOT_FOUND', 'Nhân viên không tồn tại hoặc đã nghỉ việc', 422),
  ASSET_NOT_ISSUED: () =>
    new AppError('ASSET_NOT_ISSUED', 'Tài sản này hiện không được cấp cho ai', 409),
  ASSET_IN_USE: () =>
    new AppError('ASSET_IN_USE', 'Tài sản đang được cấp — thu hồi trước khi xoá', 409),
  ASSET_STATUS_LOCKED: () =>
    new AppError(
      'ASSET_STATUS_LOCKED',
      'Trạng thái Đang cấp chỉ đổi bằng thao tác Cấp / Thu hồi',
      409,
    ),
  issued_assets_code_key: () => new AppError('ASSET_CODE_EXISTS', 'Đã có tài sản dùng mã này', 409),
  asset_assignments_dates_check: () =>
    new AppError('VALIDATION_ERROR', 'Ngày thu hồi không được trước ngày cấp', 400),
  asset_assignments_holder_check: () =>
    new AppError('VALIDATION_ERROR', 'Đối tượng sử dụng không hợp lệ', 400),
};
