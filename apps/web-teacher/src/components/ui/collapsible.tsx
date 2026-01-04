import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ className, children, open, onOpenChange, defaultOpen = false, ...props }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const isOpen = open !== undefined ? open : internalOpen;

    const handleOpenChange = (newOpen: boolean) => {
      if (open === undefined) {
        setInternalOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    };

    return (
      <div ref={ref} className={cn('', className)} {...props}>
        <CollapsibleContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
          {children}
        </CollapsibleContext.Provider>
      </div>
    );
  }
);

Collapsible.displayName = 'Collapsible';

const CollapsibleContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({ open: false, onOpenChange: () => {} });

export const CollapsibleTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(CollapsibleContext);

    return (
      <div
        ref={ref}
        className={cn('cursor-pointer', className)}
        onClick={() => context.onOpenChange(!context.open)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CollapsibleTrigger.displayName = 'CollapsibleTrigger';

export const CollapsibleContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(CollapsibleContext);

    if (!context.open) return null;

    return (
      <div ref={ref} className={cn('', className)} {...props}>
        {children}
      </div>
    );
  }
);

CollapsibleContent.displayName = 'CollapsibleContent';
