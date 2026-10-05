import { Badge, Card, Icon, type IconName } from '@/components/ui';
import { useSession } from '@/features/auth';
import { formatLongDate } from '@/lib/format-date';

interface Shortcut {
  title: string;
  description: string;
  icon: IconName;
  iconClass: string;
}

// Lối tắt tới các module chính. Gắn link khi module tương ứng hoàn thành.
const SHORTCUTS: Shortcut[] = [
  {
    title: 'Workspace',
    description: 'Vào Dashboard của các phòng ban',
    icon: 'grid',
    iconClass: 'bg-primary-50 text-primary-500',
  },
  {
    title: 'Việc của tôi',
    description: 'Việc cần làm, đang làm và sắp đến hạn',
    icon: 'checkSquare',
    iconClass: 'bg-info-50 text-info-800',
  },
  {
    title: 'Nghỉ phép',
    description: 'Tạo đơn và theo dõi trạng thái duyệt',
    icon: 'calendar',
    iconClass: 'bg-warning-50 text-warning-800',
  },
  {
    title: 'Nhân viên',
    description: 'Hồ sơ và thông tin liên hệ',
    icon: 'users',
    iconClass: 'bg-accent-50 text-accent-600',
  },
];

export function DashboardPage() {
  const { session } = useSession();
  const name =
    (session?.user.user_metadata.full_name as string | undefined) ?? session?.user.email ?? '';

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm text-gray-500">{formatLongDate(new Date())}</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Xin chào, {name}</h1>
      </section>

      <section aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title" className="mb-3 text-sm font-semibold text-gray-700">
          Lối tắt
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SHORTCUTS.map((item) => (
            <Card key={item.title} className="p-5">
              <div className="flex items-start justify-between">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.iconClass}`}
                >
                  <Icon name={item.icon} />
                </span>
                <Badge>Sắp có</Badge>
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
