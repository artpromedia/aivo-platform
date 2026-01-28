# @aivo/i18n - Internationalization Library

Complete internationalization infrastructure for the AIVO platform, supporting 27+ languages with proper pluralization, RTL support, and regional formatting.

## Features

- ✅ **16 Languages** - English, Spanish, French, German, Portuguese (Brazil), Chinese, Japanese, Korean, Hindi, Indonesian, Italian, Russian, Dutch, Turkish, Arabic, Swahili
- ✅ **ICU MessageFormat** - Full support for pluralization, gender, and select patterns
- ✅ **RTL Support** - Arabic, Hebrew, Persian, Urdu with proper text direction
- ✅ **Regional Formatting** - Numbers, dates, currencies per locale
- ✅ **React Integration** - Provider, hooks, and context for React apps
- ✅ **Dynamic Loading** - Lazy load translations for better performance
- ✅ **Translation Management** - Integration with Crowdin, Lokalise, Phrase

## Installation

```bash
pnpm add @aivo/i18n
```

## Quick Start

### 1. Wrap Your App with Provider

```tsx
import { AivoIntlProvider } from '@aivo/i18n';

function App() {
  return (
    <AivoIntlProvider defaultLocale="en" locale="en">
      <YourApp />
    </AivoIntlProvider>
  );
}
```

### 2. Use Translation Hooks

```tsx
import { useTranslation, useFormatNumber, useFormatDate } from '@aivo/i18n';

function MyComponent() {
  const { t } = useTranslation();
  const { formatCurrency } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{formatCurrency(99.99, 'USD')}</p>
      <p>{formatDate(new Date())}</p>
    </div>
  );
}
```

## Hooks Reference

### `useTranslation()`
Main hook for translations with `t()` shorthand.

```tsx
const { t, formatMessage } = useTranslation();

// Simple translation
t('common.save');

// With values
t('learner.lessonProgress', { completed: 5, total: 10 });

// With pluralization
t('learner.streakCount', { count: 7 });
```

### `useLocale()`
Access current locale and change it.

```tsx
const { locale, setLocale, metadata, isRTL, direction } = useLocale();

// Change locale
setLocale('es');

// Get locale info
console.log(metadata.nativeName); // "Español"
console.log(metadata.flag); // "🇪🇸"
```

### `useFormatNumber()`
Format numbers according to locale.

```tsx
const { formatNumber, formatPercent, formatCompact } = useFormatNumber();

formatNumber(1234.56);        // "1,234.56" or "1.234,56"
formatPercent(0.856);         // "85.6%"
formatCompact(1500000);       // "1.5M"
```

### `useFormatCurrency()`
Format currency values.

```tsx
const { formatCurrency, formatCurrencyCompact } = useFormatCurrency();

formatCurrency(99.99, 'USD');  // "$99.99"
formatCurrency(99.99, 'EUR');  // "99,99 €"
formatCurrency(99.99, 'JPY');  // "¥100"
```

### `useFormatDate()`
Format dates and times.

```tsx
const { formatDate, formatTime, formatDateTime, formatDateShort } = useFormatDate();

formatDate(new Date());        // "January 15, 2025"
formatTime(new Date());        // "2:30 PM"
formatDateTime(new Date());    // "January 15, 2025 at 2:30 PM"
formatDateShort(new Date());   // "1/15/25"
```

### `useFormatRelativeTime()`
Format relative time ("2 hours ago").

```tsx
const { formatRelativeTime, formatTimeAgo } = useFormatRelativeTime();

formatTimeAgo(new Date(Date.now() - 3600000));  // "1 hour ago"
formatRelativeTime(-5, 'days');                  // "5 days ago"
```

### `useRTL()`
RTL support utilities.

```tsx
const { isRTL, direction, flipForRTL, getLogicalProperty } = useRTL();

console.log(isRTL);                              // true for Arabic
console.log(direction);                          // "rtl" or "ltr"
console.log(getLogicalProperty('margin-left')); // "margin-inline-start"
```

## Translation Keys Structure

All translations follow a consistent key structure:

```
domain.category.specific
```

### Domains

| Domain | Description |
|--------|-------------|
| `common.*` | General UI (loading, save, cancel, etc.) |
| `auth.*` | Authentication (login, signup, etc.) |
| `nav.*` | Navigation items |
| `learner.*` | Student experience |
| `teacher.*` | Teacher dashboard |
| `parent.*` | Parent portal |
| `content.*` | Content types and metadata |
| `subjects.*` | Subject names |
| `assessment.*` | Quiz and test UI |
| `notifications.*` | Notification messages |
| `settings.*` | Settings page |
| `error.*` | Error messages |
| `time.*` | Relative time expressions |
| `onboarding.*` | Onboarding flow |
| `billing.*` | Subscription and payments |

## ICU MessageFormat Examples

### Pluralization

```json
{
  "learner.streakCount": "{count, plural, one {# day streak} other {# days streak}}"
}
```

Russian (with more plural forms):
```json
{
  "learner.streakCount": "{count, plural, one {# день серии} few {# дня серии} many {# дней серии} other {# дней серии}}"
}
```

Arabic (with 6 plural forms):
```json
{
  "learner.streakCount": "{count, plural, zero {لا توجد سلسلة} one {يوم واحد متتالي} two {يومان متتاليان} few {# أيام متتالية} many {# يومًا متتاليًا} other {# يوم متتالي}}"
}
```

### Interpolation

```json
{
  "auth.welcomeBack": "Welcome back, {name}!"
}
```

```tsx
t('auth.welcomeBack', { name: 'John' }); // "Welcome back, John!"
```

## Adding New Languages

1. Create a new JSON file in `src/messages/`:

```bash
# src/messages/vi.json (Vietnamese)
{
  "common.loading": "Đang tải...",
  ...
}
```

2. Add to the message catalog in `src/messages/index.ts`:

```ts
export const messageCatalog = {
  // ... existing
  vi: () => import('./vi.json'),
};
```

3. Add locale metadata in `src/constants/index.ts`:

```ts
LOCALE_METADATA['vi'] = {
  name: 'Vietnamese',
  nativeName: 'Tiếng Việt',
  flag: '🇻🇳',
  currency: 'VND',
  dateFormat: 'dd/MM/yyyy',
  numberSystem: 'latn',
};
```

## Translation Management

### Extracting Strings

```bash
pnpm run extract
```

### Validating Translations

```ts
import { validateTranslations } from '@aivo/i18n';

const { missing, extra, invalid } = validateTranslations(
  englishMessages,
  spanishMessages
);
```

### Integration with Translation Platforms

```ts
import { createTranslationManager } from '@aivo/i18n';

const manager = createTranslationManager({
  platform: 'crowdin',
  apiKey: process.env.CROWDIN_API_KEY,
  projectId: 'aivo',
});

// Upload source strings
await manager.uploadSourceStrings(englishMessages);

// Download translations
const translations = await manager.downloadTranslations({
  locales: ['es', 'fr', 'de'],
});
```

## Supported Locales

| Code | Language | Native Name | Script |
|------|----------|-------------|--------|
| `en` | English | English | Latin |
| `es` | Spanish | Español | Latin |
| `fr` | French | Français | Latin |
| `de` | German | Deutsch | Latin |
| `pt-BR` | Portuguese (Brazil) | Português | Latin |
| `zh` | Chinese | 中文 | Han |
| `ja` | Japanese | 日本語 | Mixed |
| `ko` | Korean | 한국어 | Hangul |
| `hi` | Hindi | हिन्दी | Devanagari |
| `id` | Indonesian | Bahasa Indonesia | Latin |
| `it` | Italian | Italiano | Latin |
| `ru` | Russian | Русский | Cyrillic |
| `nl` | Dutch | Nederlands | Latin |
| `tr` | Turkish | Türkçe | Latin |
| `ar` | Arabic | العربية | Arabic (RTL) |
| `sw` | Swahili | Kiswahili | Latin |

## Best Practices

1. **Never hardcode strings** - Always use translation keys
2. **Use context** - Keys should be self-descriptive (`auth.login` not `btn1`)
3. **Provide default messages** - Always include English default
4. **Handle plurals properly** - Use ICU plural syntax
5. **Test RTL** - Verify layout works for Arabic, Hebrew
6. **Lazy load** - Only load needed locale on demand

## API Reference

See full TypeScript definitions in the source code for complete API documentation.

## License

Proprietary - AIVO Education Inc.
