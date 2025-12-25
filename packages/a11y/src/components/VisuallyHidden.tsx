import React, { forwardRef } from 'react';

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'label';
  focusable?: boolean;
}

const visuallyHiddenStyles: React.CSSProperties = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: '1px',
};

const focusableStyles: React.CSSProperties = {
  ...visuallyHiddenStyles,
  // When focused, remove visually hidden styles
};

/**
 * Visually hides content while keeping it accessible to screen readers
 *
 * @example
 * <VisuallyHidden>Skip to main content</VisuallyHidden>
 *
 * <button>
 *   <Icon name="menu" />
 *   <VisuallyHidden>Open menu</VisuallyHidden>
 * </button>
 */
export const VisuallyHidden = forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ as: Component = 'span', focusable = false, style, children, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    const combinedStyles: React.CSSProperties =
      focusable && isFocused
        ? {
            position: 'static',
            width: 'auto',
            height: 'auto',
            overflow: 'visible',
            clip: 'auto',
            clipPath: 'none',
            whiteSpace: 'normal',
            margin: 0,
            ...style,
          }
        : { ...visuallyHiddenStyles, ...style };

    return React.createElement(
      Component,
      {
        ref,
        style: combinedStyles,
        onFocus: focusable ? handleFocus : undefined,
        onBlur: focusable ? handleBlur : undefined,
        tabIndex: focusable ? 0 : undefined,
        ...props,
      },
      children
    );
  }
);

VisuallyHidden.displayName = 'VisuallyHidden';
