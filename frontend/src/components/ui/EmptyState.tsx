import React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon element displayed in a subtle container */
  icon?: React.ReactNode;
  /** Primary text */
  title: string;
  /** Secondary descriptive text */
  message?: string;
  /** Action button or link */
  action?: React.ReactNode;
  /** Compact mode reduces padding */
  compact?: boolean;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    { icon, title, message, action, compact = false, className, ...props },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-6' : 'py-12',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-dark-elevated flex items-center justify-center mb-3 text-text-muted">
          {icon}
        </div>
      )}
      <p className="text-sm text-text-secondary mb-1">{title}</p>
      {message && <p className="text-xs text-text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
);

EmptyState.displayName = 'EmptyState';
