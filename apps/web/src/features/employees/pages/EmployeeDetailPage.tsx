import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Skeleton } from '@/components/ui';
import { useAccountState } from '@/features/auth';
import { useEmployeeDetail } from '../hooks/useDirectory';
import { saveEmployee } from '../api/directory.api';
import type { AdminEmployeeUpdate } from '../types';
import { EmployeeAdminForm } from '../components/EmployeeAdminForm';
import { ResetPasswordForm } from '../components/ResetPasswordForm';

export function EmployeeDetailPage() {
  const { id = '' } = useParams();
  const account = useAccountState();
  const admin = account.data?.role === 'super_admin';
  const { employee, departments } = useEmployeeDetail(id, admin);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: AdminEmployeeUpdate) => saveEmployee(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employee-detail'] });
      await queryClient.invalidateQueries({ queryKey: ['employee-directory'] });
    },
  });
  if (account.isPending) return <Skeleton className="h-40 w-full" />;
  if (!admin) return <p role="alert">Chỉ CEO và Master được quản lý nhân viên.</p>;
  if (employee.isPending || departments.isPending) return <Skeleton className="h-60 w-full" />;
  if (employee.isError || departments.isError)
    return (
      <div>
        <p role="alert">{employee.error?.message ?? departments.error?.message}</p>
        <Button
          onClick={() => {
            void employee.refetch();
            void departments.refetch();
          }}
        >
          Thử lại
        </Button>
      </div>
    );
  const profile = employee.data;
  if (!profile) return <p>Không tìm thấy hồ sơ.</p>;
  return (
    <section className="mx-auto max-w-2xl space-y-6 rounded-card border border-gray-200 bg-white p-6">
      <Link to="/app/employees" className="text-sm text-primary-600">
        ← Tất cả nhân viên
      </Link>
      <h1 className="text-2xl font-semibold">{profile.fullName}</h1>
      {profile.avatarUrl && (
        <img
          src={profile.avatarUrl}
          alt={`Ảnh của ${profile.fullName}`}
          className="h-24 w-24 rounded-full object-cover"
        />
      )}
      <dl className="space-y-2 text-sm">
        <div>
          <dt>ID nhân viên</dt>
          <dd className="break-all">{profile.id}</dd>
        </div>
        <div>
          <dt>Username</dt>
          <dd>{profile.username ?? 'Google / Email'}</dd>
        </div>
        <div>
          <dt>Mã nhân viên</dt>
          <dd>{profile.employeeCode ?? 'Chưa cập nhật'}</dd>
        </div>
        <div>
          <dt>Người quản lý</dt>
          <dd>{profile.managerName ?? 'Chưa được gán'}</dd>
        </div>
      </dl>
      {profile.role === 'super_admin' ? (
        <p>Tài khoản quản trị. Không sửa hoặc đặt lại mật khẩu bằng luồng nhân viên.</p>
      ) : (
        <>
          <EmployeeAdminForm
            key={`${profile.id}:${profile.status}:${profile.departmentId}:${profile.jobTitle}:${profile.fullName}`}
            employee={profile}
            departments={departments.data ?? []}
            save={mutation.mutateAsync}
          />
          {profile.username && profile.status === 'active' && (
            <ResetPasswordForm employeeId={profile.id} username={profile.username} />
          )}
        </>
      )}
    </section>
  );
}
