/**
 * I18n React Components
 *
 * Declarative components for translation and formatting in React.
 */

import type { ReactNode } from 'react';
import React, { Fragment, useMemo } from 'react';

import { LOCALE_METADATA, LOCALE_FLAGS } from '../constants';
import type { SupportedLocale, TranslationNamespace } from '../types';

import {
  useTranslation,
  useLocale,
  useNumberFormatter,
  useDateFormatter,
  useRelativeTimeFormatter,
} from './hooks';

/**
 * Trans component props
 */
export interface TransProps {
  /** Translation key */
  i18nKey: string;
  /** Default value if key not found */
  defaultValue?: string;
  /** Namespace */
  ns?: TranslationNamespace;
  /** Interpolation values */
  values?: Record<string, any>;
  /** Component mappings for rich text */
  components?: Record<string, ReactNode>;
  /** Count for pluralization */
  count?: number;
  /** Tag to wrap content */
  as?: keyof React.JSX.IntrinsicElements;
  /** Additional props for wrapper element */
  className?: string;
}

/**
 * Trans component for declarative translations
 */
export function Trans({
  i18nKey,
  defaultValue,
  ns,
  values = {},
  components = {},
  count,
  as: Tag,
  className,
}: TransProps): React.ReactElement {
  const { t } = useTranslation(ns);

  const translatedText = t(i18nKey, { ...values, count, defaultValue });

  // Parse and replace component placeholders
  const content = useMemo(() => {
    if (Object.keys(components).length === 0) {
      return translatedText;
    }

    // Parse <0>...</0> style component placeholders
    const parts: ReactNode[] = [];
    const remaining = translatedText;
    let key = 0;

    const regex = /<(\w+)>(.*?)<\/\1>/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(remaining)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(remaining.slice(lastIndex, match.index));
      }

      // Add component with content
      const componentKey = match[1];
      const componentContent = match[2];
      const component = components[componentKey];

      if (React.isValidElement(component)) {
        parts.push(React.cloneElement(component, { key: key++ }, componentContent));
      } else {
        parts.push(componentContent);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < remaining.length) {
      parts.push(remaining.slice(lastIndex));
    }

    return parts.length > 0 ? parts : translatedText;
  }, [translatedText, components]);

  if (Tag) {
    return <Tag className={className}>{content}</Tag>;
  }

  return <Fragment>{content}</Fragment>;
}

/**
 * Formatted number component
 */
export interface FormattedNumberProps {
  value: number;
  style?: 'decimal' | 'currency' | 'percent' | 'unit';
  currency?: string;
  unit?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  notation?: 'standard' | 'compact' | 'scientific' | 'engineering';
}

export function FormattedNumber({
  value,
  style = 'decimal',
  currency,
  unit,
  minimumFractionDigits,
  maximumFractionDigits,
  notation,
}: FormattedNumberProps): React.ReactElement {
  const { formatNumber, formatCurrency, formatPercent, formatUnit, formatCompact } =
    useNumberFormatter();

  const formatted = useMemo(() => {
    if (notation === 'compact') {
      return formatCompact(value);
    }

    switch (style) {
      case 'currency':
        return formatCurrency(value, currency);
      case 'percent':
        return formatPercent(value, { minimumFractionDigits, maximumFractionDigits });
      case 'unit':
        return formatUnit(value, unit ?? 'meter');
      default:
        return formatNumber(value, { minimumFractionDigits, maximumFractionDigits, notation });
    }
  }, [
    value,
    style,
    currency,
    unit,
    minimumFractionDigits,
    maximumFractionDigits,
    notation,
    formatNumber,
    formatCurrency,
    formatPercent,
    formatUnit,
    formatCompact,
  ]);

  return <Fragment>{formatted}</Fragment>;
}

/**
 * Formatted date component
 */
export interface FormattedDateProps {
  value: Date | number | string;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  preset?: string;
  timeZone?: string;
}

export function FormattedDate({
  value,
  dateStyle,
  timeStyle,
  preset,
  timeZone,
}: FormattedDateProps): React.ReactElement {
  const { formatDate } = useDateFormatter();

  const formatted = useMemo(() => {
    return formatDate(value, { dateStyle, timeStyle, preset, timeZone });
  }, [value, dateStyle, timeStyle, preset, timeZone, formatDate]);

  return <Fragment>{formatted}</Fragment>;
}

/**
 * Formatted relative time component
 */
export interface FormattedRelativeTimeProps {
  value: Date | number | string;
  style?: 'long' | 'short' | 'narrow';
  numeric?: 'always' | 'auto';
  updateInterval?: number;
}

export function FormattedRelativeTime({
  value,
  style = 'long',
  numeric = 'auto',
}: FormattedRelativeTimeProps): React.ReactElement {
  const { formatRelative } = useRelativeTimeFormatter();

  const formatted = useMemo(() => {
    return formatRelative(value, { style, numeric });
  }, [value, style, numeric, formatRelative]);

  return <Fragment>{formatted}</Fragment>;
}

/**
 * Locale selector component
 */
export interface LocaleSelectorProps {
  /** Show native language names */
  showNative?: boolean;
  /** Show flags */
  showFlags?: boolean;
  /** Custom render function */
  renderOption?: (
    locale: SupportedLocale,
    metadata: (typeof LOCALE_METADATA)[SupportedLocale]
  ) => ReactNode;
  /** Filter locales */
  filter?: (locale: SupportedLocale) => boolean;
  /** Custom className */
  className?: string;
  /** Select element props */
  selectProps?: React.SelectHTMLAttributes<HTMLSelectElement>;
}

export function LocaleSelector({
  showNative = true,
  showFlags = true,
  renderOption,
  filter,
  className,
  selectProps,
}: LocaleSelectorProps): React.ReactElement {
  const { locale, changeLocale, supportedLocales } = useLocale();

  const filteredLocales = filter ? supportedLocales.filter(filter) : supportedLocales;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    changeLocale(event.target.value as SupportedLocale);
  };

  return (
    <select value={locale} onChange={handleChange} className={className} {...selectProps}>
      {filteredLocales.map((loc) => {
        const metadata = LOCALE_METADATA[loc];
        const flag = showFlags ? LOCALE_FLAGS[loc] : '';
        const name = showNative ? metadata.name : metadata.englishName;

        if (renderOption) {
          return (
            <option key={loc} value={loc}>
              {renderOption(loc, metadata)}
            </option>
          );
        }

        return (
          <option key={loc} value={loc}>
            {flag} {name}
          </option>
        );
      })}
    </select>
  );
}

/**
 * Direction wrapper component
 */
export interface DirectionProps {
  children: ReactNode;
  /** Force specific direction */
  dir?: 'ltr' | 'rtl' | 'auto';
  /** Tag to render */
  as?: keyof React.JSX.IntrinsicElements;
  /** Additional className */
  className?: string;
}

export function Direction({
  children,
  dir,
  as: Tag = 'div',
  className,
}: DirectionProps): React.ReactElement {
  const { direction } = useLocale();

  return (
    <Tag dir={dir ?? direction} className={className}>
      {children}
    </Tag>
  );
}

/**
 * RTL-aware component that flips content for RTL locales
 */
export interface FlipProps {
  children: ReactNode;
  /** LTR content (used when direction is LTR) */
  ltr?: ReactNode;
  /** RTL content (used when direction is RTL) */
  rtl?: ReactNode;
}

export function Flip({ children, ltr, rtl }: FlipProps): React.ReactElement {
  const { direction } = useLocale();

  if (ltr !== undefined && rtl !== undefined) {
    return <Fragment>{direction === 'rtl' ? rtl : ltr}</Fragment>;
  }

  return <Fragment>{children}</Fragment>;
}

/**
 * Namespace loader component
 */
export interface NamespaceLoaderProps {
  /** Namespace to load */
  ns: TranslationNamespace;
  /** Children to render after loading */
  children: ReactNode;
  /** Fallback while loading */
  fallback?: ReactNode;
}

export function NamespaceLoader({
  ns,
  children,
  fallback = null,
}: NamespaceLoaderProps): React.ReactElement {
  const { isLoading } = useTranslation(ns);

  if (isLoading) {
    return <Fragment>{fallback}</Fragment>;
  }

  return <Fragment>{children}</Fragment>;
}
