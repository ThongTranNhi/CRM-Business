import { useState, type FormEvent } from 'react';
import { Button, Input } from '@/components/ui';
import type { AdminEmployeeUpdate, DirectoryEmployee } from '../types';

interface Props {
  employee: DirectoryEmployee;
  departments: { id: string; name: string }[];
  save: (input: AdminEmployeeUpdate) => Promise<unknown>;
}
export function EmployeeAdminForm({ employee, departments, save }: Props) {
  const [fullName, setFullName] = useState(employee.fullName);
  const [jobTitle, setJobTitle] = useState(employee.jobTitle ?? '');
  const [departmentId, setDepartmentId] = useState(employee.departmentId ?? '');
  const [status, setStatus] = useState<'active' | 'disabled'>(employee.status === 'disabled' ? 'disabled' : 'active');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!fullName.trim() || fullName.trim().length > 120 || jobTitle.trim().length > 120) {
      setMessage('Tên bắt buộc; tên và chức vụ tối đa 120 ký tự.'); return;
    }
    setBusy(true);
    setMessage(null);
    try { await save({ fullName: fullName.trim(), jobTitle: jobTitle.trim() || null,
      departmentId: departmentId || null, status }); setMessage('Đã cập nhật hồ sơ.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không lưu được hồ sơ'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <Input label="Tên nhân viên" value={fullName} maxLength={120} required onChange={(event) => setFullName(event.target.value)} />
    <Input label="Chức vụ" value={jobTitle} maxLength={120} onChange={(event) => setJobTitle(event.target.value)} />
    <label className="block text-sm">Phòng ban
      <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="mt-2 block h-10 w-full rounded-lg border border-gray-200 px-3">
        <option value="">Chưa gán</option>
        {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
      </select>
    </label>
    <label className="block text-sm">Trạng thái tài khoản
      <select value={status} onChange={(event) => setStatus(event.target.value === 'active' ? 'active' : 'disabled')} className="mt-2 block h-10 w-full rounded-lg border border-gray-200 px-3">
        <option value="active">Hoạt động</option><option value="disabled">Khóa tài khoản</option>
      </select>
    </label>
    {message && <p role="status" className="text-sm text-gray-700">{message}</p>}
    <Button type="submit" loading={busy}>Lưu hồ sơ nhân viên</Button>
  </form>;
}
