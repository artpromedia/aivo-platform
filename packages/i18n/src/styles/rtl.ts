/**
 * RTL Support Utilities
 *
 * Comprehensive utilities for Right-to-Left (RTL) layout support.
 * Includes CSS-in-JS helpers, logical property mappings, and RTL-aware transformations.
 */

import type { CSSProperties } from 'react';

import type { SupportedLocale } from '../types';
import { isRTLLocale } from '../types';

// Re-export CSSProperties type for use in interface
type StyleProperties = CSSProperties;

/**
 * Logical to physical property mapping for LTR
 */
const LOGICAL_TO_PHYSICAL_LTR: Record<string, string> = {
  // Margin
  'margin-inline-start': 'margin-left',
  'margin-inline-end': 'margin-right',
  'margin-block-start': 'margin-top',
  'margin-block-end': 'margin-bottom',

  // Padding
  'padding-inline-start': 'padding-left',
  'padding-inline-end': 'padding-right',
  'padding-block-start': 'padding-top',
  'padding-block-end': 'padding-bottom',

  // Border
  'border-inline-start': 'border-left',
  'border-inline-end': 'border-right',
  'border-inline-start-width': 'border-left-width',
  'border-inline-end-width': 'border-right-width',
  'border-inline-start-color': 'border-left-color',
  'border-inline-end-color': 'border-right-color',
  'border-inline-start-style': 'border-left-style',
  'border-inline-end-style': 'border-right-style',

  // Position
  'inset-inline-start': 'left',
  'inset-inline-end': 'right',
  'inset-block-start': 'top',
  'inset-block-end': 'bottom',

  // Border radius
  'border-start-start-radius': 'border-top-left-radius',
  'border-start-end-radius': 'border-top-right-radius',
  'border-end-start-radius': 'border-bottom-left-radius',
  'border-end-end-radius': 'border-bottom-right-radius',

  // Text
  'text-align: start': 'text-align: left',
  'text-align: end': 'text-align: right',
};

/**
 * Logical to physical property mapping for RTL
 */
const LOGICAL_TO_PHYSICAL_RTL: Record<string, string> = {
  // Margin
  'margin-inline-start': 'margin-right',
  'margin-inline-end': 'margin-left',
  'margin-block-start': 'margin-top',
  'margin-block-end': 'margin-bottom',

  // Padding
  'padding-inline-start': 'padding-right',
  'padding-inline-end': 'padding-left',
  'padding-block-start': 'padding-top',
  'padding-block-end': 'padding-bottom',

  // Border
  'border-inline-start': 'border-right',
  'border-inline-end': 'border-left',
  'border-inline-start-width': 'border-right-width',
  'border-inline-end-width': 'border-left-width',
  'border-inline-start-color': 'border-right-color',
  'border-inline-end-color': 'border-left-color',
  'border-inline-start-style': 'border-right-style',
  'border-inline-end-style': 'border-left-style',

  // Position
  'inset-inline-start': 'right',
  'inset-inline-end': 'left',
  'inset-block-start': 'top',
  'inset-block-end': 'bottom',

  // Border radius
  'border-start-start-radius': 'border-top-right-radius',
  'border-start-end-radius': 'border-top-left-radius',
  'border-end-start-radius': 'border-bottom-right-radius',
  'border-end-end-radius': 'border-bottom-left-radius',

  // Text
  'text-align: start': 'text-align: right',
  'text-align: end': 'text-align: left',
};

/**
 * Direction-aware style object
 */
export interface DirectionalStyles {
  ltr?: StyleProperties;
  rtl?: StyleProperties;
  base?: StyleProperties;
}

/**
 * Get direction for a locale
 */
export function getDirection(locale: SupportedLocale): 'ltr' | 'rtl' {
  return isRTLLocale(locale) ? 'rtl' : 'ltr';
}

/**
 * Check if current direction is RTL
 */
export function isRTL(locale: SupportedLocale): boolean {
  return isRTLLocale(locale);
}

/**
 * Get directional styles based on locale
 */
export function getDirectionalStyles(
  styles: DirectionalStyles,
  locale: SupportedLocale
): StyleProperties {
  const direction = getDirection(locale);
  return {
    ...styles.base,
    ...(direction === 'rtl' ? styles.rtl : styles.ltr),
  };
}

/**
 * Flip a value for RTL
 */
export function flipValue<T>(ltrValue: T, rtlValue: T, locale: SupportedLocale): T {
  return isRTL(locale) ? rtlValue : ltrValue;
}

/**
 * Flip horizontal direction keywords
 */
export function flipHorizontal(
  value: 'left' | 'right' | 'start' | 'end',
  locale: SupportedLocale
): 'left' | 'right' {
  if (isRTL(locale)) {
    switch (value) {
      case 'left':
      case 'start':
        return 'right';
      case 'right':
      case 'end':
        return 'left';
    }
  }
  switch (value) {
    case 'start':
      return 'left';
    case 'end':
      return 'right';
    default:
      return value;
  }
}

/**
 * Flip transform translate X value
 */
export function flipTranslateX(value: number | string, locale: SupportedLocale): string {
  if (!isRTL(locale)) {
    return typeof value === 'number' ? `${value}px` : value;
  }

  if (typeof value === 'number') {
    return `${-value}px`;
  }

  // Parse and negate
  const match = /^(-?\d+(?:\.\d+)?)(.*)?$/.exec(value);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2] || 'px';
    return `${-num}${unit}`;
  }

  return value;
}

/**
 * Flip rotation for RTL
 */
export function flipRotation(degrees: number, locale: SupportedLocale): number {
  return isRTL(locale) ? -degrees : degrees;
}

/**
 * Flip scale X for RTL (mirror horizontally)
 */
export function flipScaleX(locale: SupportedLocale): number {
  return isRTL(locale) ? -1 : 1;
}

/**
 * Convert logical CSS properties to physical based on direction
 */
export function logicalToPhysical(property: string, locale: SupportedLocale): string {
  const mapping = isRTL(locale) ? LOGICAL_TO_PHYSICAL_RTL : LOGICAL_TO_PHYSICAL_LTR;
  return mapping[property] ?? property;
}

/**
 * Create RTL-aware CSS object
 */
export function rtlCSS(
  ltrStyles: StyleProperties,
  rtlOverrides: StyleProperties = {},
  locale: SupportedLocale
): StyleProperties {
  if (!isRTL(locale)) {
    return ltrStyles;
  }

  // Automatically flip certain properties
  const flipped: StyleProperties = { ...ltrStyles };

  // Flip text-align
  if (flipped.textAlign === 'left') {
    flipped.textAlign = 'right';
  } else if (flipped.textAlign === 'right') {
    flipped.textAlign = 'left';
  }

  // Flip margins
  if ('marginLeft' in flipped || 'marginRight' in flipped) {
    const ml = flipped.marginLeft;
    const mr = flipped.marginRight;
    flipped.marginLeft = mr;
    flipped.marginRight = ml;
  }

  // Flip padding
  if ('paddingLeft' in flipped || 'paddingRight' in flipped) {
    const pl = flipped.paddingLeft;
    const pr = flipped.paddingRight;
    flipped.paddingLeft = pr;
    flipped.paddingRight = pl;
  }

  // Flip left/right positioning
  if ('left' in flipped || 'right' in flipped) {
    const l = flipped.left;
    const r = flipped.right;
    flipped.left = r;
    flipped.right = l;
  }

  // Apply RTL overrides
  return { ...flipped, ...rtlOverrides };
}

/**
 * Create CSS class names for RTL support
 */
export function rtlClassName(baseClass: string, locale: SupportedLocale): string {
  const direction = getDirection(locale);
  return `${baseClass} ${baseClass}--${direction}`;
}

/**
 * Create conditional class names based on direction
 */
export function directionClassName(
  ltrClass: string,
  rtlClass: string,
  locale: SupportedLocale
): string {
  return isRTL(locale) ? rtlClass : ltrClass;
}

/**
 * Generate CSS variables for RTL support
 */
export function rtlCSSVariables(locale: SupportedLocale): Record<string, string> {
  const dir = getDirection(locale);
  return {
    '--direction': dir,
    '--start': isRTL(locale) ? 'right' : 'left',
    '--end': isRTL(locale) ? 'left' : 'right',
    '--scale-x': isRTL(locale) ? '-1' : '1',
    '--rotate-icon': isRTL(locale) ? '180deg' : '0deg',
    '--text-align': isRTL(locale) ? 'right' : 'left',
  };
}

/**
 * Flip array for RTL (e.g., for flex order)
 */
export function flipArray<T>(array: T[], locale: SupportedLocale): T[] {
  return isRTL(locale) ? [...array].reverse() : array;
}

/**
 * Get start/end aware margin/padding values
 * Input: [top, inline-end, bottom, inline-start] or [top, inline] or [all]
 */
export function expandSpacing(
  values: number[],
  locale: SupportedLocale
): { top: number; right: number; bottom: number; left: number } {
  let [top, right, bottom, left] = [0, 0, 0, 0];

  if (values.length === 1) {
    [top, right, bottom, left] = [values[0], values[0], values[0], values[0]];
  } else if (values.length === 2) {
    [top, bottom] = [values[0], values[0]];
    [right, left] = [values[1], values[1]];
  } else if (values.length === 3) {
    [top, right, bottom, left] = [values[0], values[1], values[2], values[1]];
  } else if (values.length === 4) {
    [top, right, bottom, left] = values;
  }

  // Flip horizontal values for RTL
  if (isRTL(locale)) {
    [right, left] = [left, right];
  }

  return { top, right, bottom, left };
}

/**
 * Create inline-aware flex direction
 */
export function flexDirection(
  direction: 'row' | 'row-reverse' | 'column' | 'column-reverse',
  locale: SupportedLocale
): 'row' | 'row-reverse' | 'column' | 'column-reverse' {
  if (!isRTL(locale)) {
    return direction;
  }

  switch (direction) {
    case 'row':
      return 'row-reverse';
    case 'row-reverse':
      return 'row';
    default:
      return direction;
  }
}

/**
 * Get cursor for horizontal resize
 */
export function horizontalResizeCursor(locale: SupportedLocale): 'ew-resize' {
  // Cursor is the same, but you might want to handle this differently
  return 'ew-resize';
}

/**
 * Create inline-aware border radius
 */
export function borderRadius(
  topStart: number,
  topEnd: number,
  bottomEnd: number,
  bottomStart: number,
  locale: SupportedLocale
): { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number } {
  if (isRTL(locale)) {
    return {
      topLeft: topEnd,
      topRight: topStart,
      bottomRight: bottomStart,
      bottomLeft: bottomEnd,
    };
  }

  return {
    topLeft: topStart,
    topRight: topEnd,
    bottomRight: bottomEnd,
    bottomLeft: bottomStart,
  };
}

export { isRTLLocale };
