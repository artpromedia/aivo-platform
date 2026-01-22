import * as React from 'react';

const DropdownContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => {} });

export interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children, open: controlledOpen, onOpenChange }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
};

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ children, asChild, onClick, ...props }, ref) => {
    const { setOpen, open } = React.useContext(DropdownContext);
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      setOpen(!open);
    };
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ onClick?: typeof handleClick; ref?: React.Ref<unknown> }>, { onClick: handleClick, ref });
    }
    return <button ref={ref} onClick={handleClick} {...props}>{children}</button>;
  }
);
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end'; sideOffset?: number }>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(DropdownContext);
    if (!open) return null;

    return (
      <>
        <div className="fixed inset-0" onClick={() => setOpen(false)} />
        <div
          ref={ref}
          className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md ${className ?? ''}`}
          {...props}
        >
          {children}
        </div>
      </>
    );
  }
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => {
    const { setOpen } = React.useContext(DropdownContext);
    return (
      <div
        ref={ref}
        className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${
          inset ? 'pl-8' : ''
        } ${className ?? ''}`}
        onClick={() => setOpen(false)}
        {...props}
      />
    );
  }
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => (
    <div ref={ref} className={`px-2 py-1.5 text-sm font-semibold ${inset ? 'pl-8' : ''} ${className ?? ''}`} {...props} />
  )
);
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`-mx-1 my-1 h-px bg-muted ${className ?? ''}`} {...props} />
  )
);
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export const DropdownMenuGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => <div {...props} />;
export const DropdownMenuPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const DropdownMenuSub: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const DropdownMenuSubTrigger: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => <div {...props} />;
export const DropdownMenuSubContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => <div {...props} />;
export const DropdownMenuRadioGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => <div {...props} />;
export const DropdownMenuRadioItem: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => <div {...props} />;
export const DropdownMenuCheckboxItem: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => <div {...props} />;
