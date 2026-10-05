import { LoginForm } from '../components/LoginForm';
import { Link } from 'react-router-dom';

export function LoginPage() {
  return (
    <>
      <div className="mb-8">
        <span className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-lg font-bold text-white lg:hidden">
          C
        </span>
        <h1 className="text-2xl font-semibold text-gray-900">Đăng nhập</h1>
        <p className="mt-1.5 text-sm text-gray-500">Dùng tài khoản công ty để tiếp tục.</p>
      </div>
      <LoginForm />
      <Link
        to="/auth/register"
        className="mt-5 block text-center text-sm text-primary-600 hover:underline"
      >
        Chưa có tài khoản? Đăng ký
      </Link>
    </>
  );
}
