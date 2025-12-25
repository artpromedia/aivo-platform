# @aivo/i18n

Comprehensive internationalization (i18n) library for the AIVO platform, supporting 20+ languages with RTL support, pluralization, and locale-aware formatting.

## Features

- 🌍 **Multi-language Support**: 27 supported locales out of the box
- 🔄 **RTL Support**: Full right-to-left support for Arabic, Hebrew, and other RTL languages
- 📝 **ICU MessageFormat**: Industry-standard pluralization and interpolation
- 🎨 **React Integration**: Hooks, components, and context provider
- 📅 **Formatters**: Date, number, currency, relative time, and list formatting
- 🔧 **TypeScript**: Full type safety with autocomplete
- ⚡ **Performance**: Lazy loading, caching, and bundle splitting

## Installation

```bash
pnpm add @aivo/i18n
```

## Quick Start

### Basic Setup

```typescript
import { createI18n, I18nProvider } from '@aivo/i18n';

// Create i18n instance
const i18n = createI18n({
  defaultLocale: 'en',
  fallbackLocale: 'en',
  namespaces: ['common', 'auth'],
});

// Load translations
await i18n.loadTranslations('en', 'common', {
  greeting: 'Hello, {name}!',
  items: '{count, plural, =0 {No items} one {# item} other {# items}}',
});

// Wrap your app
function App() {
  return (
    <I18nProvider i18n={i18n}>
      <MyApp />
    </I18nProvider>
  );
}
```

### Using Translations

```tsx
import { useTranslation } from '@aivo/i18n/react';

function Greeting() {
  const { t, locale, isRTL } = useTranslation();

  return (
    <div>
      <h1>{t('greeting', { name: 'World' })}</h1>
      <p>{t('items', { count: 5 })}</p>
    </div>
  );
}
```

## Supported Locales

| Code  | Language              | Direction |
| ----- | --------------------- | --------- |
| en    | English               | LTR       |
| en-US | English (US)          | LTR       |
| en-GB | English (UK)          | LTR       |
| es    | Spanish               | LTR       |
| es-MX | Spanish (Mexico)      | LTR       |
| fr    | French                | LTR       |
| fr-CA | French (Canada)       | LTR       |
| de    | German                | LTR       |
| pt    | Portuguese            | LTR       |
| pt-BR | Portuguese (Brazil)   | LTR       |
| zh-CN | Chinese (Simplified)  | LTR       |
| zh-TW | Chinese (Traditional) | LTR       |
| ja    | Japanese              | LTR       |
| ko    | Korean                | LTR       |
| ar    | Arabic                | **RTL**   |
| ar-SA | Arabic (Saudi Arabia) | **RTL**   |
| he    | Hebrew                | **RTL**   |
| hi    | Hindi                 | LTR       |
| id    | Indonesian            | LTR       |
| vi    | Vietnamese            | LTR       |
| ru    | Russian               | LTR       |
| tr    | Turkish               | LTR       |
| pl    | Polish                | LTR       |
| nl    | Dutch                 | LTR       |
| it    | Italian               | LTR       |
| th    | Thai                  | LTR       |

## React Hooks

### useTranslation

Main hook for translations.

```tsx
const { t, locale, isRTL, changeLocale, ready } = useTranslation('namespace');

// Translate
t('key');
t('key', { name: 'value' });
t('key', { count: 5 }); // Pluralization
```

### useLocale

Access and change locale.

```tsx
const { locale, direction, changeLocale, supportedLocales } = useLocale();

await changeLocale('es');
```

### useDateFormatter

Locale-aware date formatting.

```tsx
const { format, formatRange, formatRelative } = useDateFormatter({
  dateStyle: 'long',
});

format(new Date()); // "March 15, 2024"
formatRange(startDate, endDate); // "March 15 – 20, 2024"
```

### useNumberFormatter

Locale-aware number formatting.

```tsx
const { format } = useNumberFormatter({
  style: 'currency',
  currency: 'USD',
});

format(1234.56); // "$1,234.56"
```

### useRelativeTimeFormatter

Format relative time ("2 hours ago").

```tsx
const { format, formatAuto } = useRelativeTimeFormatter();

format(-1, 'day'); // "yesterday"
formatAuto(pastDate); // "2 hours ago"
```

### useListFormatter

Format lists with proper grammar.

```tsx
const { format } = useListFormatter({ type: 'conjunction' });

format(['apple', 'banana', 'orange']); // "apple, banana, and orange"
```

### useDirectionStyles

RTL-aware styling utilities.

```tsx
const { direction, start, end, paddingStart, marginEnd } = useDirectionStyles();

<div style={{ ...paddingStart(16), ...marginEnd(8) }}>
  {/* Works correctly in both LTR and RTL */}
</div>;
```

## React Components

### Trans

Component for complex translations with embedded elements.

```tsx
<Trans
  i18nKey="welcome"
  values={{ name: 'John' }}
  components={{
    bold: <strong />,
    link: <a href="/profile" />,
  }}
/>
```

### FormattedNumber

```tsx
<FormattedNumber value={1234.56} style="currency" currency="USD" />
```

### FormattedDate

```tsx
<FormattedDate value={new Date()} dateStyle="long" />
```

### FormattedRelativeTime

```tsx
<FormattedRelativeTime value={pastDate} updateInterval={60000} />
```

### LocaleSelector

Dropdown for locale selection.

```tsx
<LocaleSelector showFlags showNativeNames onChange={(locale) => console.log(locale)} />
```

## RTL Support

The library provides comprehensive RTL support:

### Automatic Direction

```tsx
import { I18nProvider } from '@aivo/i18n/react';

<I18nProvider i18n={i18n}>
  {/* Automatically applies dir="rtl" when needed */}
  <App />
</I18nProvider>;
```

### RTL Utilities

```typescript
import { isRTLLocale, getDirection, flipValue } from '@aivo/i18n';

isRTLLocale('ar'); // true
getDirection('ar'); // 'rtl'
flipValue('left', 'ar'); // 'right'
```

### Tailwind RTL Plugin

```javascript
// tailwind.config.js
import { tailwindRTLPlugin } from '@aivo/i18n/styles';

export default {
  plugins: [tailwindRTLPlugin],
};
```

```html
<!-- Use logical properties -->
<div class="ps-4 me-2 start-0">
  <!-- ps = padding-start, me = margin-end, start = left/right -->
</div>

<!-- Conditional styles -->
<div class="rtl:flex-row-reverse ltr:flex-row">
  <!-- Different flex direction based on text direction -->
</div>
```

## ICU MessageFormat

The library uses ICU MessageFormat for complex messages:

### Pluralization

```json
{
  "items": "{count, plural, =0 {No items} one {# item} other {# items}}"
}
```

### Select

```json
{
  "greeting": "{gender, select, male {Mr.} female {Ms.} other {Dear}} {name}"
}
```

### Number/Date Formatting

```json
{
  "price": "Total: {amount, number, currency}",
  "date": "Created on {date, date, long}"
}
```

## Translation Files

### Structure

```
locales/
├── en/
│   ├── common.json
│   ├── auth.json
│   └── student.json
├── es/
│   ├── common.json
│   └── ...
└── ar/
    ├── common.json
    └── ...
```

### Example Translation File

```json
{
  "app": {
    "name": "AIVO",
    "tagline": "Personalized Learning for Everyone"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading..."
  },
  "student": {
    "lessons": "{count, plural, =0 {No lessons} one {# lesson} other {# lessons}}",
    "progress": "{percent, number, percent} complete"
  }
}
```

## API Reference

### createI18n(config)

Creates a new i18n instance.

```typescript
interface I18nConfig {
  defaultLocale: SupportedLocale;
  fallbackLocale?: SupportedLocale;
  namespaces?: string[];
  loadPath?: string;
  debug?: boolean;
}
```

### i18n.t(key, values?, options?)

Translate a key.

```typescript
interface TranslateOptions {
  namespace?: string;
  defaultValue?: string;
  count?: number;
}
```

### i18n.changeLocale(locale)

Change the current locale.

### i18n.loadTranslations(locale, namespace, translations)

Load translations programmatically.

## CLI Tools

See [@aivo/i18n-cli](../i18n-cli/README.md) for extraction and analysis tools.

```bash
# Extract keys from source code
aivo-i18n extract -p "src/**/*.{ts,tsx}" -o locales

# Analyze translation coverage
aivo-i18n analyze -t en es ar

# Sync translations across locales
aivo-i18n sync -s en -t es ar fr
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT © AIVO
