import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variantClasses = {
  default: 'bg-dark-elevated text-text-secondary',
  blue: 'bg-accent-blue/20 text-accent-blue',
  green: 'bg-accent-green/20 text-accent-green',
  red: 'bg-accent-red/20 text-accent-red',
  yellow: 'bg-accent-yellow/20 text-accent-yellow',
  purple: 'bg-accent-purple/20 text-accent-purple',
  orange: 'bg-accent-orange/20 text-accent-orange',
};

const dotColors = {
  default: 'bg-text-muted',
  blue: 'bg-accent-blue',
  green: 'bg-accent-green',
  red: 'bg-accent-red',
  yellow: 'bg-accent-yellow',
  purple: 'bg-accent-purple',
  orange: 'bg-accent-orange',
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
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
          inline-flex items-center gap-1.5 rounded-full font-medium
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
