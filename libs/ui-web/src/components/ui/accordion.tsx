import * as React from 'react';

interface AccordionContextValue {
  expandedItems: string[];
  toggleItem: (value: string) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined);

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'single' | 'multiple';
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
}

export function Accordion({
  type = 'single',
  value,
  onValueChange,
  children,
  className,
  ...props
}: AccordionProps) {
  const [expandedItems, setExpandedItems] = React.useState<string[]>(
    Array.isArray(value) ? value : value ? [value] : []
  );

  const toggleItem = (itemValue: string) => {
    setExpandedItems(prev => {
      let newValue: string[];
      if (type === 'single') {
        newValue = prev.includes(itemValue) ? [] : [itemValue];
      } else {
        newValue = prev.includes(itemValue)
          ? prev.filter(v => v !== itemValue)
          : [...prev, itemValue];
      }
      onValueChange?.(type === 'single' ? newValue[0] ?? '' : newValue);
      return newValue;
    });
  };

  return (
    <AccordionContext.Provider value={{ expandedItems, toggleItem, type }}>
      <div className={className} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemContextValue {
  value: string;
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | undefined>(undefined);

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, value, children, ...props }, ref) => {
    return (
      <AccordionItemContext.Provider value={{ value }}>
        <div ref={ref} className={`border-b ${className ?? ''}`} {...props}>
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  }
);
AccordionItem.displayName = 'AccordionItem';

export type AccordionTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const accordionContext = React.useContext(AccordionContext);
    const itemContext = React.useContext(AccordionItemContext);
    const isExpanded = itemContext && accordionContext?.expandedItems.includes(itemContext.value);

    return (
      <h3 className="flex">
        <button
          ref={ref}
          type="button"
          onClick={() => itemContext && accordionContext?.toggleItem(itemContext.value)}
          className={`flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline ${className ?? ''}`}
          {...props}
        >
          {children}
          <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
      </h3>
    );
  }
);
AccordionTrigger.displayName = 'AccordionTrigger';

export type AccordionContentProps = React.HTMLAttributes<HTMLDivElement>;

export const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    const accordionContext = React.useContext(AccordionContext);
    const itemContext = React.useContext(AccordionItemContext);
    const isExpanded = itemContext && accordionContext?.expandedItems.includes(itemContext.value);

    if (!isExpanded) return null;

    return (
      <div
        ref={ref}
        className={`overflow-hidden text-sm transition-all ${className ?? ''}`}
        {...props}
      >
        <div className="pb-4 pt-0">{children}</div>
      </div>
    );
  }
);
AccordionContent.displayName = 'AccordionContent';
