/**
 * RTL Utility Functions
 *
 * Helper functions for creating RTL-aware styles and classes.
 */

import type { CSSProperties } from 'react';

import { LOGICAL_PROPERTIES, RTL_TRANSFORM_MAP, TAILWIND_RTL_CLASSES } from './rtl-constants';

/**
 * Type alias for CSS property values
 */
type StyleValue = string | number | undefined;

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
    const transformedEntry = transformProperty(key, value as StyleValue);
    Object.assign(transformed, transformedEntry);
  }

  return transformed;
}

/**
 * Swap left/right in string values
 */
function swapLeftRight(value: string): string {
  return value
    .replaceAll(/\bleft\b/g, '__RIGHT__')
    .replaceAll(/\bright\b/g, 'left')
    .replaceAll('__RIGHT__', 'right');
}

/**
 * Transform translateX values
 */
function transformTranslateX(value: string): string {
  return value.replaceAll(/translateX\(([-.\d]+)(.*?)\)/g, (_match, numStr, unitStr) => {
    const num = String(numStr);
    const unit = String(unitStr);
    return `translateX(${-Number.parseFloat(num)}${unit})`;
  });
}

/**
 * Handle directional value transformation (left/right swap)
 */
function transformDirectionalValue(
  property: string,
  value: StyleValue
): Record<string, StyleValue> {
  if (value === 'left') return { [property]: 'right' };
  if (value === 'right') return { [property]: 'left' };
  return { [property]: value };
}

/**
 * Property swap mappings for RTL
 */
const PROPERTY_SWAPS: Record<string, string> = {
  left: 'right',
  right: 'left',
  marginLeft: 'marginRight',
  marginRight: 'marginLeft',
  paddingLeft: 'paddingRight',
  paddingRight: 'paddingLeft',
  borderLeft: 'borderRight',
  borderRight: 'borderLeft',
  borderLeftWidth: 'borderRightWidth',
  borderRightWidth: 'borderLeftWidth',
  borderLeftStyle: 'borderRightStyle',
  borderRightStyle: 'borderLeftStyle',
  borderLeftColor: 'borderRightColor',
  borderRightColor: 'borderLeftColor',
  borderTopLeftRadius: 'borderTopRightRadius',
  borderTopRightRadius: 'borderTopLeftRadius',
  borderBottomLeftRadius: 'borderBottomRightRadius',
  borderBottomRightRadius: 'borderBottomLeftRadius',
};

/**
 * Transform a single CSS property for RTL
 */
function transformProperty(property: string, value: StyleValue): Record<string, StyleValue> {
  if (value === undefined) return {};

  // Handle simple property swaps
  if (property in PROPERTY_SWAPS) {
    return { [PROPERTY_SWAPS[property]]: value };
  }

  // Handle properties with directional values
  if (property === 'textAlign' || property === 'float' || property === 'clear') {
    return transformDirectionalValue(property, value);
  }

  // Transform background position
  if (property === 'backgroundPosition' && typeof value === 'string') {
    return { backgroundPosition: swapLeftRight(value) };
  }

  // Transform transform origin
  if (property === 'transformOrigin' && typeof value === 'string') {
    return { transformOrigin: swapLeftRight(value) };
  }

  // Transform translateX
  if (property === 'transform' && typeof value === 'string' && value.includes('translateX')) {
    return { transform: transformTranslateX(value) };
  }

  // Default: return unchanged
  return { [property]: value };
}

/**
 * Get a value based on RTL direction
 */
export function rtlValue<T>(ltrValue: T, rtlValue: T, isRTL: boolean): T {
  return isRTL ? rtlValue : ltrValue;
}

/**
 * Get LTR value
 */
export function getLTRValue<T>(value: T): T {
  return value;
}

/**
 * Get RTL value
 */
export function getRTLValue<T>(_ltrValue: T, rtlValue: T): T {
  return rtlValue;
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
): { left?: number | string; right?: number | string } {
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
  const logical: Record<string, StyleValue> = {};

  for (const key of Object.keys(styles)) {
    const value = styles[key as keyof CSSProperties];
    const logicalKey = LOGICAL_PROPERTIES[key];
    if (logicalKey) {
      logical[logicalKey] = value as StyleValue;
    } else {
      logical[key] = value as StyleValue;
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
