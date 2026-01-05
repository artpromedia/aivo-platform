import * as React from 'react';

export type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement>;

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative overflow-auto ${className ?? ''}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ScrollArea.displayName = 'ScrollArea';

export interface ScrollBarProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal';
}

export const ScrollBar = React.forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ className, orientation = 'vertical', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex touch-none select-none transition-colors ${
          orientation === 'vertical'
            ? 'h-full w-2.5 border-l border-l-transparent p-[1px]'
            : 'h-2.5 flex-col border-t border-t-transparent p-[1px]'
        } ${className ?? ''}`}
        {...props}
      />
    );
  }
);
ScrollBar.displayName = 'ScrollBar';
