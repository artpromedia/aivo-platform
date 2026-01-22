import { Slot } from '@radix-ui/react-slot';
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
  // eslint-disable-next-line @typescript-eslint/no-empty-function
}>({ open: false, onOpenChange: () => {} });

export interface CollapsibleTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export const CollapsibleTrigger = React.forwardRef<HTMLDivElement, CollapsibleTriggerProps>(
  ({ className, children, asChild = false, ...props }, ref) => {
    const context = React.useContext(CollapsibleContext);
    const Comp = asChild ? Slot : 'div';

    return (
      <Comp
        ref={ref}
        className={cn('cursor-pointer', className)}
        onClick={() => {
          context.onOpenChange(!context.open);
        }}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

CollapsibleTrigger.displayName = 'CollapsibleTrigger';

export const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(CollapsibleContext);

  if (!context.open) return null;

  return (
    <div ref={ref} className={cn('', className)} {...props}>
      {children}
    </div>
  );
});

CollapsibleContent.displayName = 'CollapsibleContent';
