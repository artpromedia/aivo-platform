/**
 * RTL Utility Functions
 *
 * Helper functions for creating RTL-aware styles and classes.
 */

import type { CSSProperties } from 'react';

import { LOGICAL_PROPERTIES, RTL_TRANSFORM_MAP, TAILWIND_RTL_CLASSES } from './rtl-constants';

/**
 * Style object that maps LTR to RTL values
 */
export interface RTLStyleMap {
  ltr: CSSProperties;
  rtl: CSSProperties;
}

/**
 * Create a style object that switches between LTR and RTL values
 */
export function rtlStyle(
  ltrStyles: CSSProperties,
  rtlStyles?: CSSProperties,
  isRTL?: boolean
): CSSProperties {
  if (!isRTL) {
    return ltrStyles;
  }

  // Auto-transform if RTL styles not provided
  if (!rtlStyles) {
    return transformStylesForRTL(ltrStyles);
  }

  return { ...ltrStyles, ...rtlStyles };
}

/**
 * Automatically transform CSS properties for RTL
 */
export function rtlTransform(styles: CSSProperties, isRTL: boolean): CSSProperties {
  if (!isRTL) return styles;
  return transformStylesForRTL(styles);
}

/**
 * Transform CSS styles for RTL layout
 */
function transformStylesForRTL(styles: CSSProperties): CSSProperties {
  const transformed: CSSProperties = {};

  for (const key of Object.keys(styles)) {
    const value = styles[key as keyof CSSProperties];
    const transformedEntry = transformProperty(key, value as string | number | undefined);
    Object.assign(transformed, transformedEntry);
  }

  return transformed;
}

/**
 * Transform a single CSS property for RTL
 */
function transformProperty(
  property: string,
  value: string | number | undefined
): Record<string, string | number | undefined> {
  if (value === undefined) return {};

  // Handle directional properties
  switch (property) {
    // Swap left/right
    case 'left':
      return { right: value };
    case 'right':
      return { left: value };
    case 'marginLeft':
      return { marginRight: value };
    case 'marginRight':
      return { marginLeft: value };
    case 'paddingLeft':
      return { paddingRight: value };
    case 'paddingRight':
      return { paddingLeft: value };
    case 'borderLeft':
      return { borderRight: value };
    case 'borderRight':
      return { borderLeft: value };
    case 'borderLeftWidth':
      return { borderRightWidth: value };
    case 'borderRightWidth':
      return { borderLeftWidth: value };
    case 'borderLeftStyle':
      return { borderRightStyle: value };
    case 'borderRightStyle':
      return { borderLeftStyle: value };
    case 'borderLeftColor':
      return { borderRightColor: value };
    case 'borderRightColor':
      return { borderLeftColor: value };
    case 'borderTopLeftRadius':
      return { borderTopRightRadius: value };
    case 'borderTopRightRadius':
      return { borderTopLeftRadius: value };
    case 'borderBottomLeftRadius':
      return { borderBottomRightRadius: value };
    case 'borderBottomRightRadius':
      return { borderBottomLeftRadius: value };

    // Transform text alignment
    case 'textAlign':
      if (value === 'left') return { textAlign: 'right' };
      if (value === 'right') return { textAlign: 'left' };
      return { textAlign: value };

    // Transform float
    case 'float':
      if (value === 'left') return { float: 'right' };
      if (value === 'right') return { float: 'left' };
      return { float: value };

    // Transform clear
    case 'clear':
      if (value === 'left') return { clear: 'right' };
      if (value === 'right') return { clear: 'left' };
      return { clear: value };

    // Transform background position
    case 'backgroundPosition':
      if (typeof value === 'string') {
        const flipped = value
          .replace(/\bleft\b/g, '__RIGHT__')
          .replace(/\bright\b/g, 'left')
          .replace(/__RIGHT__/g, 'right');
        return { backgroundPosition: flipped };
      }
      return { backgroundPosition: value };

    // Transform transform origin
    case 'transformOrigin':
      if (typeof value === 'string') {
        const flipped = value
          .replace(/\bleft\b/g, '__RIGHT__')
          .replace(/\bright\b/g, 'left')
          .replace(/__RIGHT__/g, 'right');
        return { transformOrigin: flipped };
      }
      return { transformOrigin: value };

    // Transform translate
    case 'transform':
      if (typeof value === 'string' && value.includes('translateX')) {
        const flipped = value.replace(
          /translateX\(([-\d.]+)(.*?)\)/g,
          (match, numStr, unitStr) => {
            const num = String(numStr);
            const unit = String(unitStr);
            return `translateX(${-parseFloat(num)}${unit})`;
          }
        );
        return { transform: flipped };
      }
      return { transform: value };

    default:
      return { [property]: value };
  }
}

/**
 * Get a value based on RTL direction
 */
export function rtlValue<T>(ltrValue: T, rtlValue: T, isRTL: boolean): T {
  return isRTL ? rtlValue : ltrValue;
}

/**
 * Transform Tailwind/CSS class names for RTL
 */
export function rtlClass(className: string, isRTL: boolean): string {
  if (!isRTL) return className;

  const classes = className.split(/\s+/);
  const transformed = classes.map((cls) => transformClass(cls));
  return transformed.join(' ');
}

/**
 * Transform a single class name for RTL
 */
function transformClass(className: string): string {
  // Check for exact matches
  if (className in RTL_TRANSFORM_MAP) {
    return RTL_TRANSFORM_MAP[className] ?? className;
  }

  // Check for prefix matches (Tailwind utilities)
  for (const [prefix, replacement] of Object.entries(TAILWIND_RTL_CLASSES)) {
    if (className.startsWith(prefix)) {
      const suffix = className.slice(prefix.length);
      return replacement + suffix;
    }
  }

  return className;
}

/**
 * Create RTL-aware spacing values
 */
export function rtlSpacing(
  top: number | string,
  right: number | string,
  bottom: number | string,
  left: number | string,
  isRTL: boolean
): {
  top: number | string;
  right: number | string;
  bottom: number | string;
  left: number | string;
} {
  if (isRTL) {
    return { top, right: left, bottom, left: right };
  }
  return { top, right, bottom, left };
}

/**
 * Create RTL-aware border properties
 */
export function rtlBorder(
  leftWidth: number | string,
  rightWidth: number | string,
  isRTL: boolean
): { borderLeftWidth: number | string; borderRightWidth: number | string } {
  if (isRTL) {
    return { borderLeftWidth: rightWidth, borderRightWidth: leftWidth };
  }
  return { borderLeftWidth: leftWidth, borderRightWidth: rightWidth };
}

/**
 * Create RTL-aware position values
 */
export function rtlPosition(
  left: number | string | undefined,
  right: number | string | undefined,
  isRTL: boolean
): { left?: number | string | undefined; right?: number | string | undefined } {
  if (isRTL) {
    return { left: right, right: left };
  }
  return { left, right };
}

/**
 * Convert physical CSS properties to logical properties
 * This approach is recommended for new CSS as it automatically handles RTL
 */
export function toLogicalProperties(styles: CSSProperties): CSSProperties {
  const logical: Record<string, string | number | undefined> = {};

  for (const key of Object.keys(styles)) {
    const value = styles[key as keyof CSSProperties];
    const logicalKey = LOGICAL_PROPERTIES[key];
    if (logicalKey) {
      logical[logicalKey] = value as string | number | undefined;
    } else {
      logical[key] = value as string | number | undefined;
    }
  }

  return logical as CSSProperties;
}

/**
 * Create a complete RTL style map with both LTR and RTL styles
 */
export function createRTLStyles<T extends Record<string, CSSProperties>>(
  styles: T
): Record<keyof T, RTLStyleMap> {
  const result: Record<string, RTLStyleMap> = {};

  for (const [key, ltrStyles] of Object.entries(styles)) {
    result[key] = {
      ltr: ltrStyles,
      rtl: transformStylesForRTL(ltrStyles),
    };
  }

  return result as Record<keyof T, RTLStyleMap>;
}

/**
 * Get icon name adjusted for RTL (mirror directional icons)
 */
export function rtlIcon(iconName: string, isRTL: boolean): string {
  if (!isRTL) return iconName;

  const mirrorPairs: Record<string, string> = {
    'arrow-left': 'arrow-right',
    'arrow-right': 'arrow-left',
    'chevron-left': 'chevron-right',
    'chevron-right': 'chevron-left',
    'caret-left': 'caret-right',
    'caret-right': 'caret-left',
    'angle-left': 'angle-right',
    'angle-right': 'angle-left',
    forward: 'backward',
    backward: 'forward',
    undo: 'redo',
    redo: 'undo',
    indent: 'outdent',
    outdent: 'indent',
    'align-left': 'align-right',
    'align-right': 'align-left',
    'text-left': 'text-right',
    'text-right': 'text-left',
    login: 'logout',
    logout: 'login',
  };

  return mirrorPairs[iconName] ?? iconName;
}

/**
 * Create inline styles with direction attribute
 */
export function withDirection(
  styles: CSSProperties,
  direction: 'ltr' | 'rtl'
): CSSProperties & { direction: 'ltr' | 'rtl' } {
  return {
    ...styles,
    direction,
  };
}
