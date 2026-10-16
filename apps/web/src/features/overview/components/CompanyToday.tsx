import { StatCard } from '@/components/ui';

interface CompanyTodayProps {
  company: { open: number; overdue: number };
}

/**
 * Super Admin: "Toàn công ty hôm nay" (frontend-spec 4.2) — phần công việc. Đi làm / nghỉ thêm khi có Chấm công,
 * Nghỉ phép (Đợt 5). Bấm → Khối lượng việc (Quá hạn: sắp xếp người nhiều việc quá hạn nhất trước).
 */
export function CompanyToday({ company }: CompanyTodayProps) {
  return (
    <section aria-labelledby="company-today-title">
      <h2 id="company-today-title" className="mb-3 text-sm font-semibold text-gray-700">
        Toàn công ty hôm nay
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Việc đang mở"
          value={company.open}
          icon="grid"
          tone="primary"
          to="/app/workload"
        />
        <StatCard
          label="Việc quá hạn"
          value={company.overdue}
          icon="alert"
          tone="danger"
          to="/app/workload?sort=overdue"
        />
      </div>
    </section>
  );
}
