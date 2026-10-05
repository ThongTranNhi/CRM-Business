import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
}

/** Đầu trang chuẩn (frontend-spec 1.3); đặt luôn tiêu đề tab "<Tên trang> · CRM Business". */
export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} · CRM Business`;
  }, [title]);

  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumbs && (
          <nav aria-label="Đường dẫn" className="mb-1 text-sm text-gray-500">
            {breadcrumbs.map((crumb) => (
              <span key={crumb.label}>
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-primary-700 hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  crumb.label
                )}
                <span aria-hidden="true"> › </span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="truncate text-2xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
