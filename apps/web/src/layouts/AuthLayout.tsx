import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Cột thương hiệu: chỉ hiện trên màn hình lớn */}
      <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-primary-500 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-bold text-primary-500">
            C
          </span>
          <span className="text-lg font-semibold">CRM Business</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            Quản lý công việc và nhân sự ở cùng một nơi.
          </h2>
          <p className="mt-4 text-primary-100">
            Dashboard phòng ban, giao việc rõ người phụ trách, theo dõi tiến độ và quy trình nhân sự
            của toàn công ty.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2 text-sm">
            <li className="rounded-full bg-white/15 px-3 py-1">Việc cần làm</li>
            <li className="rounded-full bg-info-500 px-3 py-1 text-gray-900">Việc đang làm</li>
            <li className="rounded-full bg-white/15 px-3 py-1">Đã hoàn thành</li>
          </ul>
        </div>

        <p className="relative z-10 text-sm text-primary-200">
          Hệ thống nội bộ, chỉ dành cho nhân viên.
        </p>

        {/* Hình trang trí nhẹ bằng màu thương hiệu */}
        <span className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-500/30" />
        <span className="absolute -bottom-32 right-10 h-80 w-80 rounded-full bg-primary-400/40" />
        <span className="absolute bottom-24 right-24 h-16 w-16 rounded-full bg-warning-500/70" />
      </aside>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
