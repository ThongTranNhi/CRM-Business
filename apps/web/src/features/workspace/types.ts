/** Một dòng trong ô chọn phòng ban của modal Tạo Dashboard. */
export interface DepartmentOption {
  id: string;
  name: string;
  /** Vừa tạo ngay trong modal → hiện "(mới tạo)". */
  isNew: boolean;
}
