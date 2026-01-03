/**
 * RTL Constants
 *
 * Property mappings and constants for RTL transformations.
 */

/**
 * CSS properties that need to be flipped for RTL
 */
export const DIRECTION_PROPERTIES = [
  'left',
  'right',
  'marginLeft',
  'marginRight',
  'paddingLeft',
  'paddingRight',
  'borderLeft',
  'borderRight',
  'borderLeftWidth',
  'borderRightWidth',
  'borderLeftStyle',
  'borderRightStyle',
  'borderLeftColor',
  'borderRightColor',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'textAlign',
  'float',
  'clear',
  'backgroundPosition',
  'backgroundPositionX',
  'transformOrigin',
] as const;

/**
 * CSS logical properties (CSS Logical Properties specification)
 */
export const LOGICAL_PROPERTIES: Record<string, string> = {
  // Margins
  marginLeft: 'marginInlineStart',
  marginRight: 'marginInlineEnd',
  // Padding
  paddingLeft: 'paddingInlineStart',
  paddingRight: 'paddingInlineEnd',
  // Borders
  borderLeft: 'borderInlineStart',
  borderRight: 'borderInlineEnd',
  borderLeftWidth: 'borderInlineStartWidth',
  borderRightWidth: 'borderInlineEndWidth',
  borderLeftStyle: 'borderInlineStartStyle',
  borderRightStyle: 'borderInlineEndStyle',
  borderLeftColor: 'borderInlineStartColor',
  borderRightColor: 'borderInlineEndColor',
  // Border radius
  borderTopLeftRadius: 'borderStartStartRadius',
  borderTopRightRadius: 'borderStartEndRadius',
  borderBottomLeftRadius: 'borderEndStartRadius',
  borderBottomRightRadius: 'borderEndEndRadius',
  // Position
  left: 'insetInlineStart',
  right: 'insetInlineEnd',
  // Size
  width: 'inlineSize',
  height: 'blockSize',
  minWidth: 'minInlineSize',
  minHeight: 'minBlockSize',
  maxWidth: 'maxInlineSize',
  maxHeight: 'maxBlockSize',
};

/**
 * Value transformations for RTL
 */
export const RTL_TRANSFORM_MAP: Record<string, string> = {
  // Text alignment
  left: 'right',
  right: 'left',
  'text-left': 'text-right',
  'text-right': 'text-left',
  // Flexbox
  'flex-start': 'flex-end',
  'flex-end': 'flex-start',
  start: 'end',
  end: 'start',
  // Float
  'float-left': 'float-right',
  'float-right': 'float-left',
  // Clear
  'clear-left': 'clear-right',
  'clear-right': 'clear-left',
  // Position values
  ltr: 'rtl',
  rtl: 'ltr',
};

/**
 * Properties that are bidirectional and don't need transformation
 */
export const BIDIRECTIONAL_PROPERTIES = [
  'top',
  'bottom',
  'marginTop',
  'marginBottom',
  'paddingTop',
  'paddingBottom',
  'borderTop',
  'borderBottom',
  'height',
  'minHeight',
  'maxHeight',
  'width',
  'minWidth',
  'maxWidth',
] as const;

/**
 * Tailwind CSS RTL class mappings
 */
export const TAILWIND_RTL_CLASSES: Record<string, string> = {
  // Margin
  'ml-': 'mr-',
  'mr-': 'ml-',
  // Padding
  'pl-': 'pr-',
  'pr-': 'pl-',
  // Border radius
  'rounded-l': 'rounded-r',
  'rounded-r': 'rounded-l',
  'rounded-tl': 'rounded-tr',
  'rounded-tr': 'rounded-tl',
  'rounded-bl': 'rounded-br',
  'rounded-br': 'rounded-bl',
  // Text alignment
  'text-left': 'text-right',
  'text-right': 'text-left',
  // Float
  'float-left': 'float-right',
  'float-right': 'float-left',
  // Clear
  'clear-left': 'clear-right',
  'clear-right': 'clear-left',
  // Inset
  'left-': 'right-',
  'right-': 'left-',
  // Border
  'border-l': 'border-r',
  'border-r': 'border-l',
  // Divide
  'divide-x-': 'divide-x-reverse ',
  // Space
  'space-x-': 'space-x-reverse ',
  // Transform origin
  'origin-left': 'origin-right',
  'origin-right': 'origin-left',
  'origin-top-left': 'origin-top-right',
  'origin-top-right': 'origin-top-left',
  'origin-bottom-left': 'origin-bottom-right',
  'origin-bottom-right': 'origin-bottom-left',
  // Translate
  'translate-x-': '-translate-x-',
  '-translate-x-': 'translate-x-',
  // Scroll margin/padding
  'scroll-ml-': 'scroll-mr-',
  'scroll-mr-': 'scroll-ml-',
  'scroll-pl-': 'scroll-pr-',
  'scroll-pr-': 'scroll-pl-',
};

/**
 * Icon names that should be mirrored for RTL
 */
export const MIRRORED_ICONS = [
  'arrow-left',
  'arrow-right',
  'chevron-left',
  'chevron-right',
  'caret-left',
  'caret-right',
  'angle-left',
  'angle-right',
  'forward',
  'backward',
  'reply',
  'share',
  'undo',
  'redo',
  'indent',
  'outdent',
  'align-left',
  'align-right',
  'text-left',
  'text-right',
  'list-bullet',
  'list-number',
  'quote-left',
  'quote-right',
  'login',
  'logout',
  'external-link',
] as const;
