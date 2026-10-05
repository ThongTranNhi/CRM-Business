import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './Button';

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Liên kết điều hướng có hình dạng nút (vd. [Tạo Dashboard] → Workspace). */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={cn(buttonClasses(variant, size), className)} {...props} />;
}
