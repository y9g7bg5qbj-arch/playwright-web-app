import React, { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

// ── Context ─────────────────────────────────────────────────────

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  variant: 'pill' | 'underline' | 'chip';
  size: 'sm' | 'md';
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs compound components must be used within <Tabs>');
  }
  return ctx;
}

// ── Class Maps ──────────────────────────────────────────────────

const listVariantClasses = {
  pill: 'flex items-center gap-1 flex-wrap',
  underline: 'flex items-center gap-0 border-b border-border-default',
  chip: 'flex items-center gap-1 flex-wrap',
} as const;

const triggerBaseClass =
  'inline-flex items-center gap-1.5 font-medium transition-colors duration-fast cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed';

const triggerVariantClasses = {
  pill: {
    base: 'rounded-md border',
    active: 'border-border-active bg-brand-primary/15 text-text-primary',
    inactive:
      'border-transparent text-text-secondary hover:border-border-default hover:bg-dark-elevated/45 hover:text-text-primary',
  },
  underline: {
    base: 'border-b-2 -mb-px',
    active: 'border-brand-primary text-text-primary',
    inactive: 'border-transparent text-text-muted hover:text-text-primary',
  },
  chip: {
    base: 'rounded border',
    active: 'border-border-emphasis bg-dark-elevated text-text-primary',
    inactive:
      'border-transparent bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.04]',
  },
} as const;

const triggerSizeClasses = {
  sm: 'px-2 py-1 text-3xs',
  md: 'px-3 py-1.5 text-xs',
} as const;

// ── Tabs (root) ─────────────────────────────────────────────────

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Currently active tab value */
  value: string;
  /** Callback when active tab changes */
  onValueChange: (value: string) => void;
  /** Visual style variant */
  variant?: 'pill' | 'underline' | 'chip';
  /** Size preset */
  size?: 'sm' | 'md';
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      value,
      onValueChange,
      variant = 'pill',
      size = 'md',
      className,
      children,
      ...props
    },
    ref
  ) => (
    <TabsContext.Provider value={{ value, onValueChange, variant, size }}>
      <div ref={ref} className={cn('flex flex-col', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
);
Tabs.displayName = 'Tabs';

// ── TabsList ────────────────────────────────────────────────────

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, ...props }, ref) => {
    const { variant } = useTabsContext();
    const listRef = useRef<HTMLDivElement | null>(null);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        const container = listRef.current;
        if (!container) return;

        const triggers = Array.from(
          container.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')
        );
        const current = document.activeElement as HTMLButtonElement;
        const index = triggers.indexOf(current);
        if (index === -1) return;

        let next: HTMLButtonElement | undefined;

        switch (e.key) {
          case 'ArrowRight':
            next = triggers[(index + 1) % triggers.length];
            break;
          case 'ArrowLeft':
            next = triggers[(index - 1 + triggers.length) % triggers.length];
            break;
          case 'Home':
            next = triggers[0];
            break;
          case 'End':
            next = triggers[triggers.length - 1];
            break;
          default:
            return;
        }

        if (next) {
          e.preventDefault();
          next.focus();
        }
      },
      []
    );

    return (
      <div
        ref={(node) => {
          listRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        role="tablist"
        className={cn(listVariantClasses[variant], className)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsList.displayName = 'TabsList';

// ── TabsTrigger ─────────────────────────────────────────────────

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Unique value identifying this tab */
  value: string;
  /** Optional icon before label */
  icon?: React.ReactNode;
  /** Optional count badge after label */
  count?: number;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value: triggerValue, icon, count, className, children, ...props }, ref) => {
    const { value, onValueChange, variant, size } = useTabsContext();
    const isActive = value === triggerValue;
    const variantStyle = triggerVariantClasses[variant];

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        onClick={() => onValueChange(triggerValue)}
        className={cn(
          triggerBaseClass,
          triggerSizeClasses[size],
          variantStyle.base,
          isActive ? variantStyle.active : variantStyle.inactive,
          className
        )}
        {...props}
      >
        {icon}
        {children}
        {count !== undefined && (
          <span className="min-w-[16px] h-4 inline-flex items-center justify-center rounded-full text-3xs font-semibold bg-black/25 text-text-secondary">
            {count}
          </span>
        )}
      </button>
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

// ── TabsContent ─────────────────────────────────────────────────

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Value that must match active tab for content to render */
  value: string;
  /** Keep content mounted when inactive (default: false) */
  forceMount?: boolean;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value: contentValue, forceMount = false, className, children, ...props }, ref) => {
    const { value } = useTabsContext();
    const isActive = value === contentValue;

    if (!isActive && !forceMount) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        tabIndex={0}
        hidden={!isActive}
        className={cn(isActive ? '' : 'hidden', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = 'TabsContent';
