import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const variantClasses = {
  default: 'bg-dark-card border border-border-default',
  elevated: 'bg-dark-elevated border border-border-default shadow-md',
  outlined: 'bg-transparent border border-border-default',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className = '',
      variant = 'default',
      padding = 'md',
      hover = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-lg
          ${variantClasses[variant]}
          ${paddingClasses[padding]}
          ${hover ? 'transition-all duration-200 hover:bg-dark-elevated hover:border-text-muted cursor-pointer' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader: React.FC<CardHeaderProps> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`px-4 py-3 border-b border-border-default ${className}`}
    {...props}
  >
    {children}
  </div>
);

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle: React.FC<CardTitleProps> = ({
  className = '',
  children,
  ...props
}) => (
  <h3
    className={`text-lg font-semibold text-text-primary ${className}`}
    {...props}
  >
    {children}
  </h3>
);

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  className = '',
  children,
  ...props
}) => (
  <p
    className={`text-sm text-text-secondary ${className}`}
    {...props}
  >
    {children}
  </p>
);

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent: React.FC<CardContentProps> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-4 ${className}`} {...props}>
    {children}
  </div>
);

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter: React.FC<CardFooterProps> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`px-4 py-3 border-t border-border-default ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card;
