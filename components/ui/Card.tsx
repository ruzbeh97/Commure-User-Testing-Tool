import { cn } from '@/lib/utils';

export function Card({ children, className, onClick }: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm',
        onClick && 'cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4 border-b border-gray-100', className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}
