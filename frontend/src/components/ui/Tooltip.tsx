import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type TooltipPlacement = 'top' | 'bottom';

interface TooltipPosition {
  left: number;
  top: number;
  placement: TooltipPlacement;
}

export interface TooltipProps {
  content?: React.ReactNode;
  children: React.ReactElement;
  showDelayMs?: number;
  hideDelayMs?: number;
  offsetPx?: number;
  disabled?: boolean;
  className?: string;
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null): void {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  (ref as React.MutableRefObject<T | null>).current = value;
}

export function Tooltip({
  content,
  children,
  showDelayMs = 0,
  hideDelayMs = 0,
  offsetPx = 8,
  disabled = false,
  className,
}: TooltipProps): JSX.Element {
  const child = React.Children.only(children) as React.ReactElement<Record<string, any>>;
  const childRef = (child as any).ref as React.Ref<HTMLElement> | undefined;
  const anchorRef = React.useRef<HTMLElement | null>(null);
  const tooltipRef = React.useRef<HTMLDivElement | null>(null);
  const showTimeoutRef = React.useRef<number | undefined>(undefined);
  const hideTimeoutRef = React.useRef<number | undefined>(undefined);
  const [isVisible, setIsVisible] = React.useState(false);
  const [position, setPosition] = React.useState<TooltipPosition | null>(null);
  const tooltipId = React.useId();

  const clearTimers = React.useCallback(() => {
    if (showTimeoutRef.current !== undefined) {
      window.clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = undefined;
    }
    if (hideTimeoutRef.current !== undefined) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = undefined;
    }
  }, []);

  const updatePosition = React.useCallback(() => {
    if (!anchorRef.current) {
      return;
    }

    const anchorRect = anchorRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    const tooltipWidth = tooltipRect?.width ?? 140;
    const tooltipHeight = tooltipRect?.height ?? 24;
    const canPlaceTop = anchorRect.top - offsetPx - tooltipHeight >= 8;
    const placement: TooltipPlacement = canPlaceTop ? 'top' : 'bottom';

    let left = anchorRect.left + anchorRect.width / 2;
    const minLeft = 8 + tooltipWidth / 2;
    const maxLeft = window.innerWidth - 8 - tooltipWidth / 2;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    const top = canPlaceTop
      ? anchorRect.top - offsetPx
      : anchorRect.bottom + offsetPx;

    setPosition({ left, top, placement });
  }, [offsetPx]);

  const showTooltipNow = React.useCallback(() => {
    if (!content || disabled) {
      return;
    }
    clearTimers();
    updatePosition();
    setIsVisible(true);
  }, [clearTimers, content, disabled, updatePosition]);

  const hideTooltipNow = React.useCallback(() => {
    clearTimers();
    setIsVisible(false);
  }, [clearTimers]);

  const scheduleShow = React.useCallback(() => {
    if (!content || disabled) {
      return;
    }
    clearTimers();
    if (showDelayMs <= 0) {
      showTooltipNow();
      return;
    }
    showTimeoutRef.current = window.setTimeout(showTooltipNow, showDelayMs);
  }, [clearTimers, content, disabled, showDelayMs, showTooltipNow]);

  const scheduleHide = React.useCallback(() => {
    clearTimers();
    if (hideDelayMs <= 0) {
      hideTooltipNow();
      return;
    }
    hideTimeoutRef.current = window.setTimeout(hideTooltipNow, hideDelayMs);
  }, [clearTimers, hideDelayMs, hideTooltipNow]);

  React.useLayoutEffect(() => {
    if (!isVisible) {
      return;
    }
    updatePosition();
  }, [isVisible, updatePosition, content]);

  React.useEffect(() => {
    if (!isVisible) {
      return;
    }

    const closeTooltip = () => setIsVisible(false);
    window.addEventListener('scroll', closeTooltip, true);
    window.addEventListener('resize', closeTooltip);

    return () => {
      window.removeEventListener('scroll', closeTooltip, true);
      window.removeEventListener('resize', closeTooltip);
    };
  }, [isVisible]);

  React.useEffect(() => () => clearTimers(), [clearTimers]);

  if (!content || disabled) {
    return child;
  }

  const originalProps = child.props;
  const wrappedChild = React.cloneElement(child, {
    ...originalProps,
    title: undefined,
    ref: (node: HTMLElement | null) => {
      anchorRef.current = node;
      assignRef(childRef, node);
    },
    'aria-describedby': isVisible ? tooltipId : originalProps['aria-describedby'],
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      scheduleShow();
      originalProps.onMouseEnter?.(event);
    },
    onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
      scheduleHide();
      originalProps.onMouseLeave?.(event);
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      scheduleShow();
      originalProps.onFocus?.(event);
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      scheduleHide();
      originalProps.onBlur?.(event);
    },
  });

  return (
    <>
      {wrappedChild}
      {isVisible && position && typeof document !== 'undefined'
        ? createPortal(
            <div
              id={tooltipId}
              ref={tooltipRef}
              role="tooltip"
              className={cn(
                'pointer-events-none fixed z-[2147483647] max-w-[280px] rounded-md border border-border-default bg-dark-card px-2 py-1 text-3xs font-medium leading-none text-text-primary shadow-lg',
                position.placement === 'top'
                  ? '-translate-x-1/2 -translate-y-full'
                  : '-translate-x-1/2',
                className
              )}
              style={{ left: position.left, top: position.top }}
            >
              {content}
              <span
                className={cn(
                  'absolute left-1/2 -translate-x-1/2 border-x-[4px] border-x-transparent',
                  position.placement === 'top'
                    ? 'top-full border-t-[5px] border-t-border-default'
                    : 'bottom-full border-b-[5px] border-b-border-default'
                )}
              />
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export default Tooltip;
