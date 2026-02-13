import React from 'react';
import { Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClear?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onClear,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-text-secondary mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full bg-dark-canvas border border-border-default rounded
              px-3 py-1.5 text-sm text-text-primary placeholder-text-muted
              focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15
              transition-colors duration-fast ease-out
              disabled:opacity-50 disabled:cursor-not-allowed
              ${leftIcon ? 'pl-9' : ''}
              ${rightIcon || onClear ? 'pr-9' : ''}
              ${error ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/15' : ''}
              ${className}
            `}
            {...props}
          />
          {(rightIcon || onClear) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {onClear && props.value ? (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                rightIcon && <span className="text-text-muted">{rightIcon}</span>
              )}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-status-danger">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1 text-xs text-text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Search input variant
export const SearchInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'leftIcon'>>(
  ({ placeholder = 'Search...', ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        placeholder={placeholder}
        leftIcon={<Search className="w-4 h-4" />}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default Input;
