import { Button, Skeleton } from '@/components/ui';
import { ProfileForm } from '../components/ProfileForm';
import { useOwnProfile } from '../hooks/useOwnProfile';

export function ProfilePage() {
  const { query, mutation } = useOwnProfile();
  if (query.isPending) return <Skeleton className="h-60 w-full" />;
  if (query.isError)
    return (
      <div className="space-y-3">
        <p role="alert" className="text-danger-700">
          {query.error.message}
        </p>
        <Button onClick={() => void query.refetch()}>Thử lại</Button>
      </div>
    );
  const profile = query.data;
  if (!profile) return <p>Chưa có hồ sơ. Vui lòng liên hệ quản trị viên.</p>;
  return (
    <section className="mx-auto max-w-2xl space-y-6 rounded-card border border-gray-200 bg-white p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Hồ sơ của tôi</h1>
      <dl className="space-y-2 text-sm text-gray-700">
        <div>
          <dt className="font-medium">ID nhân viên</dt>
          <dd className="break-all">{profile.id}</dd>
        </div>
        <div>
          <dt className="font-medium">Tên nhân viên</dt>
          <dd>{profile.fullName}</dd>
        </div>
        <div>
          <dt className="font-medium">Chức vụ</dt>
          <dd>{profile.jobTitle ?? 'Chưa được gán'}</dd>
        </div>
        <div>
          <dt className="font-medium">Phòng ban</dt>
          <dd>{profile.departmentName ?? 'Chưa được gán'}</dd>
        </div>
        <div>
          <dt className="font-medium">Người quản lý</dt>
          <dd>{profile.managerName ?? 'Chưa được gán'}</dd>
        </div>
      </dl>
      <p className="text-sm text-gray-500">Phòng ban, chức vụ và quyền do quản trị viên quản lý.</p>
      <ProfileForm key={profile.id} profile={profile} save={mutation.mutateAsync} />
    </section>
  );
}
