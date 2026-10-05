import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Skeleton } from '@/components/ui';
import { useAccountState } from '@/features/auth';
import { useDirectory } from '../hooks/useDirectory';

export function EmployeeDirectoryPage() {
  const [page, setPage] = useState(1);
  const account = useAccountState();
  const admin = account.data?.role === 'super_admin';
  const query = useDirectory(page, admin);
  if (account.isPending) return <Skeleton className="h-40 w-full" />;
  if (!admin) return <p role="alert">Chỉ CEO và Master được xem tất cả nhân viên.</p>;
  if (query.isPending) return <Skeleton className="h-40 w-full" />;
  if (query.isError)
    return (
      <div>
        <p role="alert">{query.error.message}</p>
        <Button onClick={() => void query.refetch()}>Thử lại</Button>
      </div>
    );
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold text-gray-900">Tất cả nhân viên</h1>
      {query.data.data.length === 0 ? (
        <p>Chưa có nhân viên trong trang này.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Danh sách tài khoản và hồ sơ nhân viên</caption>
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {[
                  'Nhân viên',
                  'Username',
                  'Mã nhân viên',
                  'Chức vụ',
                  'Phòng ban',
                  'Trạng thái',
                  'Hồ sơ',
                ].map((label) => (
                  <th key={label} scope="col" className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((employee) => (
                <tr key={employee.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{employee.fullName}</td>
                  <td className="px-4 py-3">{employee.username ?? 'Google / Email'}</td>
                  <td className="px-4 py-3">{employee.employeeCode ?? 'Chưa cập nhật'}</td>
                  <td className="px-4 py-3">{employee.jobTitle ?? 'Chưa gán'}</td>
                  <td className="px-4 py-3">{employee.departmentName ?? 'Chưa gán'}</td>
                  <td className="px-4 py-3">{employee.status ?? 'Chưa có tài khoản'}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/app/employees/${employee.id}`}
                      className="text-primary-600 hover:underline"
                    >
                      Mở hồ sơ
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
          Trang trước
        </Button>
        <span>Trang {page}</span>
        <Button
          variant="secondary"
          disabled={!query.data.meta.hasMore}
          onClick={() => setPage(page + 1)}
        >
          Trang sau
        </Button>
      </div>
    </section>
  );
}
