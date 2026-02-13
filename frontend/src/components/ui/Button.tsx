import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses = {
  primary: 'btn-primary-gradient text-white hover:brightness-110 active:brightness-95',
  secondary: 'bg-dark-elevated text-text-secondary border border-border-default hover:border-border-emphasis hover:text-text-primary',
  danger: 'bg-status-danger text-white hover:brightness-110',
  success: 'bg-status-success text-white hover:brightness-110',
  ghost: 'bg-transparent text-text-muted hover:text-text-primary hover:bg-white/[0.04]',
};

const sizeClasses = {
  sm: 'px-2.5 py-1 text-xs gap-1',
  md: 'px-3 py-1.5 text-xs gap-1.5',
  lg: 'px-4 py-2 text-sm gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center rounded font-medium
          transition-all duration-fast ease-out cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:ring-offset-1 focus:ring-offset-dark-canvas
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : leftIcon ? (
          leftIcon
        ) : null}
        {children}
        {rightIcon && !isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
