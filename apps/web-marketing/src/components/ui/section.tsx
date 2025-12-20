import * as React from 'react';

import { cn } from '@/lib/utils';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div';
  container?: boolean;
  padding?: 'none' | 'sm' | 'default' | 'lg' | 'xl';
  background?: 'white' | 'gray' | 'gradient' | 'primary' | 'none';
}

const paddingMap = {
  none: '',
  sm: 'py-8 md:py-12',
  default: 'py-16 md:py-24',
  lg: 'py-24 md:py-32',
  xl: 'py-32 md:py-40',
};

const backgroundMap = {
  white: 'bg-white',
  gray: 'bg-gray-50',
  gradient: 'bg-gradient-to-b from-white via-theme-primary-50/30 to-white',
  primary: 'bg-theme-primary-500 text-white',
  none: '',
};

export function Section({
  as: Component = 'section',
  container = true,
  padding = 'default',
  background = 'white',
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <Component className={cn(paddingMap[padding], backgroundMap[background], className)} {...props}>
      {container ? (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      ) : (
        children
      )}
    </Component>
  );
}

export function SectionHeader({
  badge,
  title,
  description,
  align = 'center',
  className,
}: {
  badge?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-3xl mb-12 md:mb-16',
        align === 'center' && 'mx-auto text-center',
        className
      )}
    >
      {badge && (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-theme-primary-100 text-theme-primary-700 text-sm font-medium mb-4">
          {badge}
        </span>
      )}
      <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-lg md:text-xl text-gray-600 leading-relaxed">{description}</p>
      )}
    </div>
  );
}
