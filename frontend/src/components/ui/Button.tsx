import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'action';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-brand-primary text-white hover:bg-brand-hover active:bg-brand-primary-depth',
  action: 'bg-brand-primary text-white border border-brand-primary hover:bg-brand-hover active:bg-brand-primary-depth',
  secondary: 'bg-dark-elevated text-text-secondary border border-border-emphasis hover:brightness-110 hover:text-text-primary',
  danger: 'bg-status-danger text-white hover:brightness-110',
  success: 'bg-status-success text-white hover:brightness-110',
  ghost: 'bg-transparent text-text-muted hover:text-text-primary hover:bg-white/[0.05]',
};

const sizeClasses = {
  sm: 'h-6 px-2 text-xs gap-1',
  md: 'h-7 px-3 text-xs gap-1.5',
  lg: 'h-8 px-4 text-sm gap-2',
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
          transition-colors duration-fast cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-1 focus:ring-brand-primary/40
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
