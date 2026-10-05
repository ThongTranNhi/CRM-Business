import { useState } from 'react';
import { Avatar, Badge, Button, Card, EmptyState, Icon } from '@/components/ui';
import { useCan } from '@/features/auth';
import { EmployeeName } from '@/features/employees';
import type { DepartmentDetail, DepartmentMember } from '../types';
import { AddMemberModal } from './AddMemberModal';
import { MoveMemberDialog } from './MoveMemberDialog';

interface DepartmentMembersProps {
  department: DepartmentDetail;
}

export function DepartmentMembers({ department }: DepartmentMembersProps) {
  const canDo = useCan();
  const canManage = canDo('departments.manage');
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<DepartmentMember | null>(null);
  const addButton = canManage && (
    <Button size="sm" onClick={() => setAdding(true)}>
      <Icon name="plus" size={16} />
      Thêm thành viên
    </Button>
  );

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="font-semibold text-gray-900">Thành viên ({department.members.length})</h2>
        {department.members.length > 0 && addButton}
      </div>
      {department.members.length === 0 ? (
        <EmptyState
          icon="users"
          title="Phòng ban chưa có thành viên"
          description={canManage ? 'Thêm nhân viên vào phòng ban này.' : undefined}
          action={addButton || undefined}
        />
      ) : (
        <ul className="divide-y divide-gray-100">
          {department.members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              onMove={canManage ? () => setMoving(member) : undefined}
            />
          ))}
        </ul>
      )}
      <AddMemberModal department={department} open={adding} onClose={() => setAdding(false)} />
      {moving && (
        <MoveMemberDialog department={department} member={moving} onClose={() => setMoving(null)} />
      )}
    </Card>
  );
}

interface MemberRowProps {
  member: DepartmentMember;
  /** Không truyền: người xem không có quyền chuyển phòng. */
  onMove?: () => void;
}

function MemberRow({ member, onMove }: MemberRowProps) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <Avatar name={member.fullName} src={member.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-gray-900">
          <EmployeeName id={member.id} name={member.fullName} />
        </p>
        <p className="truncate text-xs text-gray-500">{member.jobTitle ?? 'Chưa có chức vụ'}</p>
      </div>
      {member.isManager && <Badge tone="primary">Trưởng phòng</Badge>}
      {onMove && (
        <Button variant="ghost" size="sm" onClick={onMove}>
          <Icon name="transfer" size={16} />
          <span className="hidden sm:inline">Chuyển phòng</span>
          <span className="sr-only sm:hidden">Chuyển phòng {member.fullName}</span>
        </Button>
      )}
    </li>
  );
}
