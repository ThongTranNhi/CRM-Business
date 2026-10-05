import { cn } from '@/lib/cn';

const SIZE_CLASSES = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

/** Lấy 2 chữ cái đầu: "Nguyễn Văn An" -> "NA". */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const classes = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold',
    SIZE_CLASSES[size],
    className,
  );

  if (src) return <img src={src} alt={name} className={cn(classes, 'object-cover')} />;
  return (
    <span className={cn(classes, 'bg-primary-100 text-primary-800')} title={name}>
      {getInitials(name)}
    </span>
  );
}
