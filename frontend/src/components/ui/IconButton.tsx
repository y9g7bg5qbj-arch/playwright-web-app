import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from './Tooltip';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon element (typically a Lucide React icon) */
  icon: React.ReactNode;
  /** Visual size */
  size?: 'sm' | 'md' | 'lg';
  /** Visual variant */
  variant?: 'ghost' | 'subtle' | 'outlined';
  /** Icon color tone */
  tone?: 'default' | 'danger' | 'success' | 'warning' | 'info' | 'brand';
  /** Tooltip text — also used as aria-label */
  tooltip?: string;
  /** Show active/pressed state */
  active?: boolean;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-7 w-7',
  lg: 'h-8 w-8',
} as const;

const variantClasses = {
  ghost: 'bg-transparent hover:bg-white/[0.05]',
  subtle: 'bg-dark-elevated/40 hover:bg-dark-elevated',
  outlined: 'border border-border-default hover:border-border-emphasis',
} as const;

const toneClasses = {
  default: 'text-text-secondary hover:text-text-primary',
  danger: 'text-status-danger hover:text-status-danger/80',
  success: 'text-status-success hover:text-status-success/80',
  warning: 'text-status-warning hover:text-status-warning/80',
  info: 'text-status-info hover:text-status-info/80',
  brand: 'text-brand-primary hover:text-brand-primary/80',
} as const;

function humanizeIconName(rawName: string): string {
  return rawName
    .replace(/Icon$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferIconLabel(icon: React.ReactNode): string | undefined {
  if (!React.isValidElement(icon)) {
    return undefined;
  }

  const iconType = icon.type as { displayName?: string; name?: string } | string;
  const rawName =
    typeof iconType === 'string'
      ? iconType
      : iconType.displayName || iconType.name;

  if (!rawName || rawName === 'svg' || rawName === 'path') {
    return undefined;
  }

  const label = humanizeIconName(rawName);
  return label || undefined;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      size = 'md',
      variant = 'ghost',
      tone = 'default',
      tooltip,
      active = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const resolvedTooltip = tooltip?.trim() || inferIconLabel(icon);

    return (
      <Tooltip content={resolvedTooltip} showDelayMs={0} hideDelayMs={0} disabled={disabled}>
        <button
          ref={ref}
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded transition-colors duration-fast',
            sizeClasses[size],
            variantClasses[variant],
            toneClasses[tone],
            active && 'bg-white/[0.08] text-text-primary',
            disabled && 'opacity-40 pointer-events-none',
            className
          )}
          aria-label={resolvedTooltip}
          disabled={disabled}
          {...props}
        >
          {icon}
        </button>
      </Tooltip>
    );
  }
);

IconButton.displayName = 'IconButton';
