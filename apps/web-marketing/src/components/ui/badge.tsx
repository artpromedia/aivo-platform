import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800',
        primary: 'bg-theme-primary-100 text-theme-primary-700',
        secondary: 'bg-gray-100 text-gray-600',
        success: 'bg-mint-100 text-mint-700',
        warning: 'bg-sunshine-100 text-sunshine-700',
        error: 'bg-red-100 text-red-700',
        coral: 'bg-coral-100 text-coral-700',
        outline: 'border border-gray-200 text-gray-600 bg-white',
        gradient: 'bg-gradient-to-r from-theme-primary-500 to-coral-500 text-white',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
}

function Badge({ className, variant, size, icon, dot, pulse, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          )}
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
