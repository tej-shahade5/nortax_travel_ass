import clsx from 'clsx';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

export function getStatusVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (s === 'approved' || s === 'completed' || s === 'paid') return 'success';
  if (s === 'submitted' || s === 'pending' || s === 'returned') return 'warning';
  if (s === 'rejected') return 'danger';
  if (s === 'finance_verified' || s === 'advance_disbursed') return 'info';
  return 'default';
}

export function getCategoryVariant(category: string): BadgeVariant {
  const c = category.toLowerCase();
  if (c === 'lodging') return 'info';
  if (c === 'meals') return 'success';
  if (c === 'local_conveyance') return 'warning';
  if (c === 'business_entertainment') return 'purple';
  return 'default';
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'px-2.5 py-0.5 inline-flex items-center text-xs font-semibold rounded-full',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
