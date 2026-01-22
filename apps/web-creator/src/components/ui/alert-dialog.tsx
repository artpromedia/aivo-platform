import * as React from 'react';

const AlertDialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({ open: false, onOpenChange: () => {} });

export interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({ children, open = false, onOpenChange = () => {} }) => (
  <AlertDialogContext.Provider value={{ open, onOpenChange }}>{children}</AlertDialogContext.Provider>
);

export const AlertDialogTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ children, onClick, ...props }, ref) => {
    const { onOpenChange } = React.useContext(AlertDialogContext);
    return (
      <button ref={ref} onClick={(e) => { onClick?.(e); onOpenChange(true); }} {...props}>
        {children}
      </button>
    );
  }
);
AlertDialogTrigger.displayName = 'AlertDialogTrigger';

export const AlertDialogPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const AlertDialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`fixed inset-0 z-50 bg-black/80 ${className ?? ''}`} {...props} />
  )
);
AlertDialogOverlay.displayName = 'AlertDialogOverlay';

export const AlertDialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { open } = React.useContext(AlertDialogContext);
    if (!open) return null;

    return (
      <>
        <AlertDialogOverlay />
        <div
          ref={ref}
          className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg ${className ?? ''}`}
          {...props}
        >
          {children}
        </div>
      </>
    );
  }
);
AlertDialogContent.displayName = 'AlertDialogContent';

export const AlertDialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={`flex flex-col space-y-2 text-center sm:text-left ${className ?? ''}`} {...props} />
);

export const AlertDialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className ?? ''}`} {...props} />
);

export const AlertDialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={`text-lg font-semibold ${className ?? ''}`} {...props} />
  )
);
AlertDialogTitle.displayName = 'AlertDialogTitle';

export const AlertDialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={`text-sm text-muted-foreground ${className ?? ''}`} {...props} />
  )
);
AlertDialogDescription.displayName = 'AlertDialogDescription';

export const AlertDialogAction = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, onClick, ...props }, ref) => {
    const { onOpenChange } = React.useContext(AlertDialogContext);
    return (
      <button
        ref={ref}
        className={`inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 ${className ?? ''}`}
        onClick={(e) => { onClick?.(e); onOpenChange(false); }}
        {...props}
      />
    );
  }
);
AlertDialogAction.displayName = 'AlertDialogAction';

export const AlertDialogCancel = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, onClick, ...props }, ref) => {
    const { onOpenChange } = React.useContext(AlertDialogContext);
    return (
      <button
        ref={ref}
        className={`inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold hover:bg-accent hover:text-accent-foreground ${className ?? ''}`}
        onClick={(e) => { onClick?.(e); onOpenChange(false); }}
        {...props}
      />
    );
  }
);
AlertDialogCancel.displayName = 'AlertDialogCancel';
