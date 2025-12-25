/**
 * Tailwind CSS RTL Plugin
 *
 * Provides RTL-aware utility classes for Tailwind CSS.
 * Adds logical property variants and direction-aware modifiers.
 */

import plugin from 'tailwindcss/plugin';

/**
 * RTL Plugin for Tailwind CSS
 *
 * Usage in tailwind.config.js:
 * ```
 * const rtlPlugin = require('@aivo/i18n/tailwind');
 *
 * module.exports = {
 *   plugins: [rtlPlugin],
 * }
 * ```
 */
export const rtlPlugin = plugin(
  function ({ addVariant, addUtilities, matchUtilities, theme, e }) {
    // Add RTL and LTR variants
    addVariant('rtl', '[dir="rtl"] &');
    addVariant('ltr', '[dir="ltr"] &');

    // Add variants for RTL/LTR on parent
    addVariant('group-rtl', ':merge(.group)[dir="rtl"] &');
    addVariant('group-ltr', ':merge(.group)[dir="ltr"] &');

    // Add peer variants
    addVariant('peer-rtl', ':merge(.peer)[dir="rtl"] ~ &');
    addVariant('peer-ltr', ':merge(.peer)[dir="ltr"] ~ &');

    // Logical property utilities
    const logicalSpacing = {
      // Margin inline
      '.ms-auto': { 'margin-inline-start': 'auto' },
      '.me-auto': { 'margin-inline-end': 'auto' },

      // Padding inline
      '.ps-0': { 'padding-inline-start': '0' },
      '.pe-0': { 'padding-inline-end': '0' },

      // Inset inline
      '.start-0': { 'inset-inline-start': '0' },
      '.end-0': { 'inset-inline-end': '0' },
      '.start-auto': { 'inset-inline-start': 'auto' },
      '.end-auto': { 'inset-inline-end': 'auto' },
    };

    addUtilities(logicalSpacing);

    // Text alignment utilities
    addUtilities({
      '.text-start': { 'text-align': 'start' },
      '.text-end': { 'text-align': 'end' },
    });

    // Float utilities
    addUtilities({
      '.float-start': { float: 'inline-start' },
      '.float-end': { float: 'inline-end' },
      '.clear-start': { clear: 'inline-start' },
      '.clear-end': { clear: 'inline-end' },
    });

    // Border utilities
    addUtilities({
      '.border-s': { 'border-inline-start-width': '1px' },
      '.border-e': { 'border-inline-end-width': '1px' },
      '.border-s-0': { 'border-inline-start-width': '0' },
      '.border-e-0': { 'border-inline-end-width': '0' },
      '.border-s-2': { 'border-inline-start-width': '2px' },
      '.border-e-2': { 'border-inline-end-width': '2px' },
      '.border-s-4': { 'border-inline-start-width': '4px' },
      '.border-e-4': { 'border-inline-end-width': '4px' },
    });

    // Border radius utilities
    addUtilities({
      '.rounded-ss': { 'border-start-start-radius': theme('borderRadius.DEFAULT') },
      '.rounded-se': { 'border-start-end-radius': theme('borderRadius.DEFAULT') },
      '.rounded-es': { 'border-end-start-radius': theme('borderRadius.DEFAULT') },
      '.rounded-ee': { 'border-end-end-radius': theme('borderRadius.DEFAULT') },
      '.rounded-s': {
        'border-start-start-radius': theme('borderRadius.DEFAULT'),
        'border-end-start-radius': theme('borderRadius.DEFAULT'),
      },
      '.rounded-e': {
        'border-start-end-radius': theme('borderRadius.DEFAULT'),
        'border-end-end-radius': theme('borderRadius.DEFAULT'),
      },
    });

    // Flip utilities for icons/transforms
    addUtilities({
      '.flip-rtl': {
        '[dir="rtl"] &': {
          transform: 'scaleX(-1)',
        },
      },
      '.rotate-rtl': {
        '[dir="rtl"] &': {
          transform: 'rotate(180deg)',
        },
      },
    });

    // Spacing scale from theme
    const spacing = theme('spacing') || {};

    // Generate margin-inline-start utilities
    matchUtilities(
      {
        ms: (value) => ({
          'margin-inline-start': value,
        }),
      },
      { values: spacing, supportsNegativeValues: true }
    );

    // Generate margin-inline-end utilities
    matchUtilities(
      {
        me: (value) => ({
          'margin-inline-end': value,
        }),
      },
      { values: spacing, supportsNegativeValues: true }
    );

    // Generate padding-inline-start utilities
    matchUtilities(
      {
        ps: (value) => ({
          'padding-inline-start': value,
        }),
      },
      { values: spacing }
    );

    // Generate padding-inline-end utilities
    matchUtilities(
      {
        pe: (value) => ({
          'padding-inline-end': value,
        }),
      },
      { values: spacing }
    );

    // Generate inset-inline-start utilities
    matchUtilities(
      {
        start: (value) => ({
          'inset-inline-start': value,
        }),
      },
      { values: { ...spacing, auto: 'auto' }, supportsNegativeValues: true }
    );

    // Generate inset-inline-end utilities
    matchUtilities(
      {
        end: (value) => ({
          'inset-inline-end': value,
        }),
      },
      { values: { ...spacing, auto: 'auto' }, supportsNegativeValues: true }
    );

    // Scroll margin utilities
    matchUtilities(
      {
        'scroll-ms': (value) => ({
          'scroll-margin-inline-start': value,
        }),
      },
      { values: spacing }
    );

    matchUtilities(
      {
        'scroll-me': (value) => ({
          'scroll-margin-inline-end': value,
        }),
      },
      { values: spacing }
    );

    // Scroll padding utilities
    matchUtilities(
      {
        'scroll-ps': (value) => ({
          'scroll-padding-inline-start': value,
        }),
      },
      { values: spacing }
    );

    matchUtilities(
      {
        'scroll-pe': (value) => ({
          'scroll-padding-inline-end': value,
        }),
      },
      { values: spacing }
    );
  },
  {
    // Theme extensions
    theme: {
      extend: {},
    },
  }
);

export default rtlPlugin;
