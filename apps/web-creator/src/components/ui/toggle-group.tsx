import * as React from 'react';

export interface ToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'single' | 'multiple';
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  disabled?: boolean;
}

const ToggleGroupContext = React.createContext<{
  type: 'single' | 'multiple';
  value: string | string[];
  onValueChange: (itemValue: string) => void;
  disabled: boolean;
}>({ type: 'single', value: '', onValueChange: () => {}, disabled: false });

export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ className, type = 'single', value = type === 'multiple' ? [] : '', onValueChange, disabled = false, children, ...props }, ref) => {
    const handleValueChange = (itemValue: string) => {
      if (type === 'single') {
        onValueChange?.(itemValue);
      } else {
        const currentValue = Array.isArray(value) ? value : [];
        if (currentValue.includes(itemValue)) {
          onValueChange?.(currentValue.filter(v => v !== itemValue));
        } else {
          onValueChange?.([...currentValue, itemValue]);
        }
      }
    };

    return (
      <ToggleGroupContext.Provider value={{ type, value, onValueChange: handleValueChange, disabled }}>
        <div
          ref={ref}
          role="group"
          className={`inline-flex items-center justify-center rounded-md ${className ?? ''}`}
          {...props}
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    );
  }
);
ToggleGroup.displayName = 'ToggleGroup';

export interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const { type, value: groupValue, onValueChange, disabled } = React.useContext(ToggleGroupContext);
    const isSelected = type === 'single' ? groupValue === value : Array.isArray(groupValue) && groupValue.includes(value);

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isSelected}
        disabled={disabled}
        className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground ${
          isSelected ? 'bg-accent text-accent-foreground' : ''
        } ${className ?? ''}`}
        onClick={() => onValueChange(value)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
ToggleGroupItem.displayName = 'ToggleGroupItem';
