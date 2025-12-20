import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-gray-900 text-white hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-lg',
        primary:
          'bg-gradient-to-r from-theme-primary-500 to-theme-primary-600 text-white hover:from-theme-primary-600 hover:to-theme-primary-700 hover:-translate-y-0.5 hover:shadow-purple-lg',
        coral:
          'bg-gradient-to-r from-coral-500 via-salmon-500 to-theme-primary-500 text-white hover:shadow-coral-lg hover:-translate-y-0.5',
        outline:
          'border-2 border-gray-200 bg-white text-gray-700 hover:border-theme-primary-500 hover:text-theme-primary-600 hover:bg-theme-primary-50',
        ghost: 'text-gray-600 hover:text-theme-primary-600 hover:bg-theme-primary-50',
        link: 'text-theme-primary-600 underline-offset-4 hover:underline',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        success:
          'bg-mint-500 text-white hover:bg-mint-600 hover:-translate-y-0.5 hover:shadow-mint',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        default: 'h-11 px-6 py-2',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-14 px-8 text-base',
        xl: 'h-16 px-10 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    // When using asChild, we need to ensure only a single child is passed to Slot
    // The child component will receive the className and other props
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
