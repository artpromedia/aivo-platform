import React, {
  forwardRef,
  useState,
  useCallback,
  useRef,
  useId,
  useEffect,
  cloneElement,
  isValidElement,
} from 'react';

export interface AccessibleTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  delay?: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  id?: string;
}

/**
 * Accessible tooltip component
 *
 * Features:
 * - Shows on hover/focus
 * - Hides on Escape
 * - Proper ARIA attributes
 * - Keyboard accessible
 * - Delay to prevent flicker
 *
 * @example
 * <AccessibleTooltip content="This is helpful information">
 *   <button>Hover me</button>
 * </AccessibleTooltip>
 */
export const AccessibleTooltip = forwardRef<HTMLDivElement, AccessibleTooltipProps>(
  ({ content, children, delay = 300, placement = 'top', className, id }, ref) => {
    const baseId = useId();
    const tooltipId = id || `${baseId}-tooltip`;
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const triggerRef = useRef<HTMLElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const show = useCallback(() => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    }, [delay]);

    const hide = useCallback(() => {
      clearTimeout(timeoutRef.current);
      setIsVisible(false);
    }, []);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          hide();
        }
      },
      [hide]
    );

    // Calculate position when visible
    useEffect(() => {
      if (isVisible && triggerRef.current && tooltipRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        let top = 0;
        let left = 0;

        switch (placement) {
          case 'top':
            top = triggerRect.top - tooltipRect.height - 8;
            left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
            break;
          case 'bottom':
            top = triggerRect.bottom + 8;
            left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
            break;
          case 'left':
            top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
            left = triggerRect.left - tooltipRect.width - 8;
            break;
          case 'right':
            top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
            left = triggerRect.right + 8;
            break;
        }

        setPosition({ top, left });
      }
    }, [isVisible, placement]);

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        clearTimeout(timeoutRef.current);
      };
    }, []);

    // Clone child to add event handlers and ref
    const trigger = isValidElement(children)
      ? cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
          ref: triggerRef,
          onMouseEnter: (e: React.MouseEvent) => {
            show();
            (children.props as React.HTMLAttributes<HTMLElement>).onMouseEnter?.(e);
          },
          onMouseLeave: (e: React.MouseEvent) => {
            hide();
            (children.props as React.HTMLAttributes<HTMLElement>).onMouseLeave?.(e);
          },
          onFocus: (e: React.FocusEvent) => {
            show();
            (children.props as React.HTMLAttributes<HTMLElement>).onFocus?.(e);
          },
          onBlur: (e: React.FocusEvent) => {
            hide();
            (children.props as React.HTMLAttributes<HTMLElement>).onBlur?.(e);
          },
          onKeyDown: (e: React.KeyboardEvent) => {
            handleKeyDown(e);
            (children.props as React.HTMLAttributes<HTMLElement>).onKeyDown?.(e);
          },
          'aria-describedby': isVisible ? tooltipId : undefined,
        })
      : children;

    return (
      <>
        {trigger}
        {isVisible && (
          <div
            ref={(node) => {
              (tooltipRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            id={tooltipId}
            role="tooltip"
            className={className}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              backgroundColor: '#333',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '14px',
              zIndex: 9999,
              pointerEvents: 'none',
              maxWidth: '300px',
            }}
          >
            {content}
          </div>
        )}
      </>
    );
  }
);

AccessibleTooltip.displayName = 'AccessibleTooltip';
