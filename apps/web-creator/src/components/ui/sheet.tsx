import * as React from 'react';

const SheetContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({ open: false, onOpenChange: () => {} });

export interface SheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Sheet: React.FC<SheetProps> = ({ children, open = false, onOpenChange = () => {} }) => (
  <SheetContext.Provider value={{ open, onOpenChange }}>{children}</SheetContext.Provider>
);

export const SheetTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ children, asChild, onClick, ...props }, ref) => {
    const { onOpenChange } = React.useContext(SheetContext);
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onOpenChange(true);
    };
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ onClick?: typeof handleClick; ref?: React.Ref<unknown> }>, { onClick: handleClick, ref });
    }
    return <button ref={ref} onClick={handleClick} {...props}>{children}</button>;
  }
);
SheetTrigger.displayName = 'SheetTrigger';

export const SheetPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const SheetOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`fixed inset-0 z-50 bg-black/80 ${className ?? ''}`} {...props} />
  )
);
SheetOverlay.displayName = 'SheetOverlay';

export interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, side = 'right', children, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(SheetContext);
    if (!open) return null;

    const sideClasses = {
      top: 'inset-x-0 top-0 border-b',
      bottom: 'inset-x-0 bottom-0 border-t',
      left: 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
      right: 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
    };

    return (
      <>
        <SheetOverlay onClick={() => onOpenChange(false)} />
        <div
          ref={ref}
          className={`fixed z-50 gap-4 bg-background p-6 shadow-lg ${sideClasses[side]} ${className ?? ''}`}
          {...props}
        >
          {children}
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
            onClick={() => onOpenChange(false)}
          >
            <span className="sr-only">Close</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </>
    );
  }
);
SheetContent.displayName = 'SheetContent';

export const SheetHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={`flex flex-col space-y-2 text-center sm:text-left ${className ?? ''}`} {...props} />
);

export const SheetFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className ?? ''}`} {...props} />
);

export const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={`text-lg font-semibold text-foreground ${className ?? ''}`} {...props} />
  )
);
SheetTitle.displayName = 'SheetTitle';

export const SheetDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={`text-sm text-muted-foreground ${className ?? ''}`} {...props} />
  )
);
SheetDescription.displayName = 'SheetDescription';

export const SheetClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ onClick, ...props }, ref) => {
    const { onOpenChange } = React.useContext(SheetContext);
    return (
      <button ref={ref} onClick={(e) => { onClick?.(e); onOpenChange(false); }} {...props} />
    );
  }
);
SheetClose.displayName = 'SheetClose';
