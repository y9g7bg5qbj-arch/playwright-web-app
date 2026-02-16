import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';
  size?: 'sm' | 'md';
  dot?: boolean;
}

// Terminal-style status colors with subtle backgrounds
const variantClasses = {
  default: 'bg-dark-elevated text-text-muted border border-border-default',
  blue: 'bg-status-info/12 text-status-info border border-status-info/20',
  green: 'bg-status-success/12 text-status-success border border-status-success/20',
  red: 'bg-status-danger/12 text-status-danger border border-status-danger/20',
  yellow: 'bg-status-warning/12 text-status-warning border border-status-warning/20',
  purple: 'bg-accent-purple/12 text-accent-purple border border-accent-purple/20',
  orange: 'bg-status-warning/12 text-status-warning border border-status-warning/20',
};

const dotColors = {
  default: 'bg-text-muted',
  blue: 'bg-status-info',
  green: 'bg-status-success',
  red: 'bg-status-danger',
  yellow: 'bg-status-warning',
  purple: 'bg-accent-purple',
  orange: 'bg-status-warning',
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-3xs',
  md: 'px-2 py-0.5 text-xxs',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className = '',
      variant = 'default',
      size = 'md',
      dot = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center gap-1 rounded font-medium
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {dot && (
          <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Status-specific badges for convenience
export const StatusBadge: React.FC<{
  status: 'passed' | 'failed' | 'running' | 'pending' | 'cancelled' | 'skipped';
  className?: string;
}> = ({ status, className = '' }) => {
  const statusConfig = {
    passed: { variant: 'green' as const, label: 'Passed' },
    failed: { variant: 'red' as const, label: 'Failed' },
    running: { variant: 'blue' as const, label: 'Running' },
    pending: { variant: 'yellow' as const, label: 'Pending' },
    cancelled: { variant: 'default' as const, label: 'Cancelled' },
    skipped: { variant: 'default' as const, label: 'Skipped' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant={config.variant} dot className={className}>
      {config.label}
    </Badge>
  );
};

export default Badge;
