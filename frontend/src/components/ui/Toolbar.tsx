import React from 'react';
import { cn } from '@/lib/utils';

// ── Toolbar ──────────────────────────────────────────────────────

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: 'top' | 'bottom';
  size?: 'sm' | 'md';
}

const positionClasses = {
  top: 'border-b',
  bottom: 'border-t',
} as const;

const sizeClasses = {
  sm: 'h-8 px-2 gap-0.5',
  md: 'h-9 px-3 gap-1',
} as const;

export const Toolbar = React.forwardRef<HTMLDivElement, ToolbarProps>(
  ({ position = 'top', size = 'sm', className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="toolbar"
      className={cn(
        'flex items-center border-border-default bg-dark-bg shrink-0',
        positionClasses[position],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Toolbar.displayName = 'Toolbar';

// ── ToolbarGroup ─────────────────────────────────────────────────

export interface ToolbarGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ToolbarGroup = React.forwardRef<HTMLDivElement, ToolbarGroupProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-0.5', className)}
      {...props}
    >
      {children}
    </div>
  )
);
ToolbarGroup.displayName = 'ToolbarGroup';

// ── ToolbarDivider ───────────────────────────────────────────────

export interface ToolbarDividerProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const ToolbarDivider = React.forwardRef<
  HTMLDivElement,
  ToolbarDividerProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('h-5 w-px bg-border-default mx-1', className)}
    {...props}
  />
));
ToolbarDivider.displayName = 'ToolbarDivider';
