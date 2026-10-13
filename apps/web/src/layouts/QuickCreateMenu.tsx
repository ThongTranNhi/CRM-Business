import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui';
import { useCan } from '@/features/auth';
import { useDismiss } from '@/lib/use-dismiss';

// Modal tải lười khi bấm (không kéo form task / dự án vào bundle chính).
const QuickCreateTaskModal = lazy(() =>
  import('@/features/department-dashboards/quick-create').then((m) => ({
    default: m.QuickCreateTaskModal,
  })),
);
const ProjectFormModal = lazy(() =>
  import('@/features/projects/quick-create').then((m) => ({ default: m.ProjectFormModal })),
);

const ITEM_CLASS =
  'flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50';

type Dialog = 'task' | 'project' | null;

/**
 * "+ Tạo nhanh" (frontend-spec 3.2): Công việc mới · Dự án mới (Super Admin, Trưởng phòng). Đơn nghỉ phép,
 * Yêu cầu phê duyệt thêm khi làm module Nghỉ phép / Phê duyệt (Đợt 5).
 */
export function QuickCreateMenu() {
  const navigate = useNavigate();
  const canDo = useCan();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(containerRef, open, close);

  function start(next: Dialog) {
    setOpen(false);
    setDialog(next);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Tạo nhanh"
        className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-2.5 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        <Icon name="plus" size={18} />
        <span className="hidden md:inline">Tạo nhanh</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-card border border-gray-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => start('task')}
            className={ITEM_CLASS}
          >
            <Icon name="checkSquare" size={16} />
            Công việc mới
          </button>
          {canDo('projects.create') && (
            <button
              type="button"
              role="menuitem"
              onClick={() => start('project')}
              className={ITEM_CLASS}
            >
              <Icon name="folder" size={16} />
              Dự án mới
            </button>
          )}
        </div>
      )}
      <Suspense fallback={null}>
        {dialog === 'task' && <QuickCreateTaskModal onClose={() => setDialog(null)} />}
        {dialog === 'project' && (
          <ProjectFormModal
            open
            onClose={() => setDialog(null)}
            onCreated={(project) => navigate(`/app/projects/${project.id}`)}
          />
        )}
      </Suspense>
    </div>
  );
}
