import React from 'react';
import { cn } from '@/lib/utils';

// ── Panel ────────────────────────────────────────────────────────

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'canvas';
}

const panelVariants = {
  default: 'bg-dark-card border border-border-default',
  muted: 'bg-dark-elevated border border-border-default',
  canvas: 'bg-dark-canvas',
} as const;

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ variant = 'default', className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col overflow-hidden', panelVariants[variant], className)}
      {...props}
    >
      {children}
    </div>
  )
);
Panel.displayName = 'Panel';

// ── PanelHeader ──────────────────────────────────────────────────

export interface PanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

export const PanelHeader = React.forwardRef<HTMLDivElement, PanelHeaderProps>(
  ({ title, icon, actions, meta, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'h-8 px-3 flex items-center justify-between border-b border-border-default bg-dark-bg shrink-0',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {icon && <span className="text-text-muted shrink-0">{icon}</span>}
        {title && (
          <span className="text-3xs font-semibold text-text-muted uppercase tracking-wider truncate">
            {title}
          </span>
        )}
        {meta}
      </div>
      {actions && <div className="flex items-center gap-0.5">{actions}</div>}
      {children}
    </div>
  )
);
PanelHeader.displayName = 'PanelHeader';

// ── PanelBody ────────────────────────────────────────────────────

export interface PanelBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md';
  scrollable?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
} as const;

export const PanelBody = React.forwardRef<HTMLDivElement, PanelBodyProps>(
  ({ padding = 'none', scrollable = false, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex-1 min-h-0',
        paddingClasses[padding],
        scrollable && 'overflow-y-auto',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
PanelBody.displayName = 'PanelBody';

// ── PanelFooter ──────────────────────────────────────────────────

export interface PanelFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const PanelFooter = React.forwardRef<HTMLDivElement, PanelFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-3 py-2 border-t border-border-default bg-dark-bg shrink-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
PanelFooter.displayName = 'PanelFooter';
