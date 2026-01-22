import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ className, children, value, onValueChange, defaultValue, disabled, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '');
    const [isOpen, setIsOpen] = React.useState(false);
    const currentValue = value !== undefined ? value : internalValue;

    const handleValueChange = (newValue: string) => {
      if (disabled) return;
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
      setIsOpen(false);
    };

    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, isOpen, setIsOpen, disabled: disabled ?? false }}>
          {children}
        </SelectContext.Provider>
      </div>
    );
  }
);

Select.displayName = 'Select';

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  disabled: boolean;
}>({ value: '', onValueChange: () => {}, isOpen: false, setIsOpen: () => {}, disabled: false });

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);

    return (
      <button
        ref={ref}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onClick={() => !context.disabled && context.setIsOpen(!context.isOpen)}
        disabled={context.disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

SelectTrigger.displayName = 'SelectTrigger';

export interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

export const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder = 'Select...', ...props }, ref) => {
    const context = React.useContext(SelectContext);
    return (
      <span ref={ref} className={cn('', className)} {...props}>
        {context.value || placeholder}
      </span>
    );
  }
);

SelectValue.displayName = 'SelectValue';

export const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);

    if (!context.isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SelectContent.displayName = 'SelectContent';

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
          context.value === value && 'bg-accent',
          className
        )}
        onClick={() => context.onValueChange(value)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SelectItem.displayName = 'SelectItem';
