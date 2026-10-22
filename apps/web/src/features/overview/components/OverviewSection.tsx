import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui';

interface OverviewSectionProps {
  title: string;
  /** Liên kết "Xem tất cả" ở góc phải tiêu đề. */
  link?: { to: string; label: string };
  children: ReactNode;
}

/** Khung một khối của trang Tổng quan điều hành: tiêu đề + liên kết + nội dung. */
export function OverviewSection({ title, link, children }: OverviewSectionProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {link && (
          <Link to={link.to} className="text-sm font-medium text-primary-700 hover:underline">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </Card>
  );
}
