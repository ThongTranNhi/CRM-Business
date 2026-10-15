import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Badge, Button, Card, EmptyState, Icon } from '@/components/ui';
import { useCan } from '@/features/auth';
import type { ProjectDetail } from '../types';
import { EditMembersModal } from './EditMembersModal';

/** Tab Thành viên: danh sách (bấm → hồ sơ nếu có quyền); [Sửa thành viên] cho chủ dự án / quản lý. */
export function ProjectMembersTab({ project }: { project: ProjectDetail }) {
  const canDo = useCan();
  const [editing, setEditing] = useState(false);
  const canManage = project.permissions.canManageMembers && project.archivedAt === null;
  const profileLink = canDo('employees.view');

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">
          Thành viên ({project.members.length})
        </h2>
        {canManage && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Icon name="users" size={16} />
            Sửa thành viên
          </Button>
        )}
      </div>
      {project.members.length === 0 ? (
        <EmptyState icon="users" title="Dự án chưa có thành viên" />
      ) : (
        <ul className="divide-y divide-gray-100">
          {project.members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={member.fullName} src={member.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {profileLink ? (
                    <Link to={`/app/employees/${member.id}`} className="hover:underline">
                      {member.fullName}
                    </Link>
                  ) : (
                    member.fullName
                  )}
                </p>
                {member.jobTitle && <p className="text-xs text-gray-500">{member.jobTitle}</p>}
              </div>
              {member.id === project.owner?.id && <Badge tone="primary">Chủ dự án</Badge>}
              {member.isArchived && <Badge tone="warning">Đã nghỉ</Badge>}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <EditMembersModal project={project} open={editing} onClose={() => setEditing(false)} />
      )}
    </Card>
  );
}
