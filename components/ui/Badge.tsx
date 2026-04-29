import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

const styles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

export function Badge({ children, variant = 'default', className }: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', styles[variant], className)}>
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    draft: 'default',
    active: 'success',
    closed: 'warning',
    in_progress: 'info',
    completed: 'success',
    abandoned: 'danger',
  };
  return map[status] ?? 'default';
}

export function typeBadge(type: string) {
  const map: Record<string, BadgeVariant> = {
    ab: 'purple',
    usability: 'info',
    prototype: 'warning',
  };
  return map[type] ?? 'default';
}
