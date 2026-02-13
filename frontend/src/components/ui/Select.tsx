import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className = '',
      label,
      error,
      hint,
      options,
      placeholder,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-text-secondary mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`
              w-full bg-dark-canvas border border-border-default rounded
              px-3 py-1.5 text-sm text-text-primary
              appearance-none cursor-pointer
              focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15
              transition-colors duration-fast ease-out
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/15' : ''}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
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

Select.displayName = 'Select';

export default Select;
