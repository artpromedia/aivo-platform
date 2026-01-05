import * as React from 'react';

export interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Popover: React.FC<PopoverProps> = ({ children }) => {
  return <div className="relative">{children}</div>;
};

export const PopoverTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => <button ref={ref} className={className} {...props} />
);
PopoverTrigger.displayName = 'PopoverTrigger';

export const PopoverContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none ${className ?? ''}`}
      {...props}
    />
  )
);
PopoverContent.displayName = 'PopoverContent';
