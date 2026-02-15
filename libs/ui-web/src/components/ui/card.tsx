import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'gradient';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses: Record<string, string> = {
      default:
        'bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] ' +
        'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-200',
      glass:
        'bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)] ' +
        'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200',
      elevated:
        'bg-[rgb(var(--color-surface-elevated))] border border-[rgb(var(--color-border-muted))] ' +
        'shadow-[var(--shadow-elevated)] hover:shadow-[var(--shadow-glow)] transition-shadow duration-200',
      gradient:
        'bg-gradient-to-br from-[rgb(var(--color-surface))] to-[rgb(var(--color-surface-elevated))] ' +
        'border border-[rgb(var(--color-border))] shadow-[var(--shadow-card)] transition-all duration-200',
    };

    return (
      <div
        ref={ref}
        className={`rounded-[var(--radius-card)] text-[rgb(var(--color-text))] ${variantClasses[variant]} ${className ?? ''}`}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col space-y-1.5 p-6 ${className ?? ''}`}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-2xl font-semibold leading-none tracking-tight text-[rgb(var(--color-text))] ${className ?? ''}`}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-[rgb(var(--color-text-muted))] ${className ?? ''}`}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`p-6 pt-0 ${className ?? ''}`} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center p-6 pt-0 ${className ?? ''}`}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
