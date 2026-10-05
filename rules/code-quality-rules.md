# Quy tắc chất lượng code — từng file chỉn chu, tinh gọn

> Áp dụng cho MỌI file trong `apps/web`, `apps/api`, `supabase/migrations`.
> Mục tiêu: người khác mở một file bất kỳ là hiểu ngay file đó làm gì, không phải đọc file khác.
> Trước mỗi commit phải đi hết **checklist ở mục 9**.

## 1. Kích thước

| Loại                      | Giới hạn mềm | Quá thì                                  |
| ------------------------- | ------------ | ---------------------------------------- |
| File bất kỳ               | ~200 dòng    | Tách theo trách nhiệm                    |
| React component           | ~150 dòng    | Tách component con hoặc hook             |
| Hàm                       | ~40 dòng     | Tách hàm nhỏ có tên nói rõ việc nó làm   |
| Tham số hàm               | 3            | Gom thành một object có type             |
| Độ lồng (if/for/callback) | 3 cấp        | Dùng return sớm (guard clause), tách hàm |
| JSX lồng nhau             | ~4 cấp       | Tách component                           |

## 2. Một file, một việc

- Component chỉ hiển thị và bắt sự kiện. Gọi API → `api/`. Quản lý server state → `hooks/`. Tính toán nghiệp vụ → hàm thuần trong module (`features/<m>/<m>.utils.ts` hoặc ngay trong `types.ts` nếu rất ngắn).
- API: controller không có `if` nghiệp vụ; service không biết `Context` của Hono; repository không có quy tắc nghiệp vụ.
- Không có file "tạp hoá" (`helpers.ts`, `common.ts`, `misc.ts`).

## 3. Tinh gọn — viết ít mà rõ

- **Không lặp code.** Thấy đoạn giống nhau lần thứ 2 → tìm thứ đã có trong `components/ui`, `lib/`, module khác. Lần thứ 3 → bắt buộc tách dùng chung.
- **Không viết cái chưa cần.** Không thêm tham số, option, abstraction "phòng khi sau này". Không tạo generic khi chỉ có 1 trường hợp dùng.
- **Không code chết**: không biến/hàm/import không dùng, không code bị comment lại, không `console.log`, không `TODO` thiếu người và lý do.
- **Return sớm** thay vì `if/else` lồng.
- Dùng sẵn của nền tảng trước khi tự viết: `Intl` cho ngày/tiền, `Array` methods, zod cho validate, React Query cho cache.
- Tên rõ thì không cần comment; comment chỉ để giải thích **tại sao**.

```ts
// ❌ Lồng nhiều cấp, đặt tên mơ hồ
function handle(d: Task) {
  if (d) {
    if (d.status !== 'done') {
      if (d.dueDate) {
        return new Date(d.dueDate) < new Date();
      }
    }
  }
  return false;
}

// ✅ Return sớm, tên nói rõ, dùng lại hàm ngày của lib
export function isOverdue(task: Task, today = startOfTodayVN()): boolean {
  if (task.status === 'done' || !task.dueDate) return false;
  return parseDateVN(task.dueDate) < today;
}
```

## 4. TypeScript

- Cấm `any`, cấm `as` để "chữa cháy" kiểu (chỉ dùng `as const` hoặc khi đã kiểm tra bằng zod).
- Mọi hàm export có kiểu trả về rõ ràng; props component khai báo bằng `interface <Tên>Props`.
- Kiểu dữ liệu nghiệp vụ đặt ở `types.ts` của module; không khai báo lại cùng một kiểu ở nhiều nơi.
- Dùng union literal thay vì `string` tự do: `type TaskStatus = 'todo' | 'in_progress' | 'done'`.
- Input từ ngoài (request, form, URL query) luôn đi qua zod rồi mới dùng.

## 5. React

```tsx
// ✅ Mẫu component chuẩn: props có kiểu, 4 trạng thái, không gọi API trực tiếp
interface DepartmentListProps {
  onCreate: () => void;
}

export function DepartmentList({ onCreate }: DepartmentListProps) {
  const { data, isLoading, isError, refetch } = useDepartments();

  if (isLoading) return <DepartmentListSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (data.length === 0) {
    return (
      <EmptyState
        title="Chưa có phòng ban"
        action={<Button onClick={onCreate}>Tạo phòng ban</Button>}
      />
    );
  }
  return (
    <ul className="divide-y divide-gray-100">
      {data.map((department) => (
        <DepartmentRow key={department.id} department={department} />
      ))}
    </ul>
  );
}
```

- Không `useEffect` để tính dữ liệu suy ra từ props/state — tính thẳng khi render (hoặc `useMemo` nếu nặng).
- Không `useEffect` để gọi API — dùng React Query.
- `key` là id ổn định, không dùng index.
- Không định nghĩa component bên trong component khác.
- Class Tailwind dài/điều kiện → dùng `cn()`; trạng thái → map object (như `Badge`), không chuỗi `?:` lồng nhau.
- Chữ hiển thị tiếng Việt, đúng chính tả, đúng giọng trong `docs/ui-ux/*`.

## 6. API (Hono)

```ts
// ✅ Controller mỏng: lấy input đã validate → gọi service → trả response
export async function createDepartment(c: Context<AppEnv>) {
  const input = c.req.valid('json');
  const department = await departmentsService.create(c.get('user'), input);
  return c.json({ data: department }, 201);
}

// ✅ Service: quy tắc nghiệp vụ + quyền theo dữ liệu + audit, ném AppError có mã
export async function create(actor: AuthUser, input: CreateDepartmentInput) {
  if (!canManageDepartments(actor)) throw forbidden();
  if (await departmentsRepository.existsByName(input.name)) {
    throw new AppError('DEPARTMENT_NAME_EXISTS', 'Phòng ban này đã tồn tại', 409);
  }
  return departmentsRepository.insertWithAudit(actor.id, input);
}
```

- Không `try/catch` chỉ để log rồi ném lại; để `error.middleware` xử lý. Chỉ bắt lỗi khi đổi được nó thành `AppError` có nghĩa.
- Repository chọn cột cụ thể, không `select('*')`; map snake_case → camelCase tại đây.
- Thao tác nhiều bước cần nhất quán → một RPC Postgres, không gọi nhiều lệnh rời rạc.

## 7. Migration SQL

- Mỗi file một mục đích, tên nói rõ: `20261006090000_create_department_dashboards.sql`.
- Đầu file có comment 1–3 dòng: tạo gì, vì sao, liên quan BR nào.
- Đủ: khoá ngoại, `not null`, `unique`, `check`, index cho cột lọc, `enable row level security` + policy, trigger `updated_at`.
- Không xoá/sửa migration đã áp lên Supabase.

## 8. Đặt tên và định dạng

- Theo `rules/naming-rules.md`. Tên biến là danh từ có nghĩa (`overdueTasks`, không `arr2`); hàm bắt đầu bằng động từ (`moveTask`, `canApprove`).
- Boolean: `is/has/can/should` (`isOverdue`, `canEdit`).
- Prettier quyết định định dạng; không tranh luận khoảng trắng. Import sắp xếp: thư viện → `@/…` → tương đối.

## 9. Checklist trước khi commit (tự rà từng file đã sửa)

- [ ] File làm đúng **một** việc; dưới giới hạn mục 1, hoặc có lý do rõ.
- [ ] Không còn code chết, `console.log`, import thừa, TODO vô chủ.
- [ ] Không lặp code đã có ở chỗ khác; đã dùng lại `components/ui`, `lib/`.
- [ ] Không `any`, không `as` chữa cháy; input ngoài đi qua zod.
- [ ] Component có đủ loading / empty / error / dữ liệu; mọi nút có hành động thật.
- [ ] Quyền kiểm tra ở API (và ẩn nút ở UI); thao tác nhạy cảm có audit/activity.
- [ ] Không mã hex màu; chữ hiển thị tiếng Việt đúng chính tả.
- [ ] Migration mới (nếu có) đã áp thành công, có RLS + index.
- [ ] `pnpm lint`, `pnpm typecheck`, test đều pass; `npx prettier --check .` pass.
- [ ] Đọc lại `git diff` một lượt như người review: chỗ nào khó hiểu thì sửa cho dễ hiểu, không thêm comment để bù.

Báo cáo cuối mỗi nhiệm vụ phải có dòng: **"Đã rà checklist code-quality-rules mục 9: đạt"**, hoặc liệt kê mục chưa đạt kèm lý do.
