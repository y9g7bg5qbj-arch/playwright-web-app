import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';
  size?: 'sm' | 'md';
  dot?: boolean;
}

// Terminal-style status colors with subtle backgrounds
const variantClasses = {
  default: 'bg-dark-elevated text-text-muted border border-border-default',
  blue: 'bg-[rgba(88,166,255,0.12)] text-[#58a6ff] border border-[rgba(88,166,255,0.2)]',
  green: 'bg-[rgba(63,185,80,0.12)] text-[#3fb950] border border-[rgba(63,185,80,0.2)]',
  red: 'bg-[rgba(248,81,73,0.12)] text-[#f85149] border border-[rgba(248,81,73,0.2)]',
  yellow: 'bg-[rgba(210,153,34,0.12)] text-[#d29922] border border-[rgba(210,153,34,0.2)]',
  purple: 'bg-[rgba(163,113,247,0.12)] text-[#a371f7] border border-[rgba(163,113,247,0.2)]',
  orange: 'bg-[rgba(229,127,73,0.12)] text-[#e57f49] border border-[rgba(229,127,73,0.2)]',
};

const dotColors = {
  default: 'bg-text-muted',
  blue: 'bg-[#58a6ff]',
  green: 'bg-[#3fb950]',
  red: 'bg-[#f85149]',
  yellow: 'bg-[#d29922]',
  purple: 'bg-[#a371f7]',
  orange: 'bg-[#e57f49]',
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-[11px]',
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
