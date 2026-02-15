import * as React from 'react';

interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);

  const contextValue: SelectContextValue = {
    ...(value !== undefined ? { value } : {}),
    ...(onValueChange ? { onValueChange } : {}),
    open,
    setOpen,
  };

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export type SelectTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => context?.setOpen(!context.open)}
        className={`flex h-10 w-full items-center justify-between rounded-[var(--radius-input)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-2 text-sm text-[rgb(var(--color-text))] placeholder:text-[rgb(var(--color-text-muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus))] focus:ring-offset-2 focus:ring-offset-[rgb(var(--color-background))] disabled:cursor-not-allowed disabled:opacity-50 transition-all ${className ?? ''}`}
        {...props}
      >
        {children}
        <span className="ml-2">▼</span>
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

export interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const context = React.useContext(SelectContext);
  return <span>{context?.value || placeholder}</span>;
}

export type SelectContentProps = React.HTMLAttributes<HTMLDivElement>;

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);

    if (!context?.open) return null;

    return (
      <div
        ref={ref}
        className={`absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-[var(--radius-card)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-1 text-[rgb(var(--color-text))] shadow-[var(--shadow-elevated)] backdrop-blur-[var(--glass-blur)] ${className ?? ''}`}
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
  ({ className, children, value, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    const isSelected = context?.value === value;

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        onClick={() => {
          context?.onValueChange?.(value);
          context?.setOpen(false);
        }}
        className={`relative flex w-full cursor-pointer select-none items-center rounded-[var(--radius-button)] py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-[rgb(var(--color-surface-elevated))] hover:text-[rgb(var(--color-text))] focus:bg-[rgb(var(--color-surface-elevated))] transition-colors ${
          isSelected ? 'bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary))]' : ''
        } ${className ?? ''}`}
        {...props}
      >
        {isSelected && <span className="absolute left-2">✓</span>}
        {children}
      </div>
    );
  }
);
SelectItem.displayName = 'SelectItem';
