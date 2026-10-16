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
