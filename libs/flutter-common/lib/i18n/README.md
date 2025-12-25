# AIVO Flutter i18n

Internationalization library for AIVO Flutter applications.

## Features

- 🌍 27+ supported locales
- 🔄 Full RTL support (Arabic, Hebrew)
- 📝 ICU MessageFormat pluralization
- 📅 Locale-aware date/number formatting
- 💾 Locale preference persistence
- ⚡ Lazy loading of translations

## Installation

This library is part of `flutter_common`. Add to your `pubspec.yaml`:

```yaml
dependencies:
  flutter_common:
    path: ../../libs/flutter-common
```

## Quick Start

### Initialize

```dart
import 'package:flutter_common/i18n/aivo_i18n.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize locale manager
  await localeManager.init();

  // Initialize i18n with detected locale
  await i18n.init(
    locale: localeManager.detectLocale(),
    namespaces: [TranslationNamespace.common],
  );

  runApp(const MyApp());
}
```

### Wrap Your App

```dart
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return I18nProvider(
      initialLocale: localeManager.detectLocale(),
      namespaces: [TranslationNamespace.common, TranslationNamespace.auth],
      onLocaleChange: (locale) {
        print('Locale changed to: ${locale.code}');
      },
      child: MaterialApp(
        // App will automatically use correct text direction
        home: const HomePage(),
      ),
    );
  }
}
```

### Using Translations

#### Context Extension

```dart
class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.t('app.name')),
      ),
      body: Column(
        children: [
          // Simple translation
          Text(context.t('common.welcome')),

          // With interpolation
          Text(context.t('greeting', args: {'name': 'John'})),

          // With pluralization
          Text(context.t('items', count: 5)),
        ],
      ),
    );
  }
}
```

#### Tr Widget

```dart
// Simple
Tr('app.name')

// With style
Tr('app.name', style: Theme.of(context).textTheme.headlineMedium)

// With arguments
Tr('greeting', args: {'name': 'John'})

// With pluralization
Tr('items', count: 5)
```

#### Global Function

```dart
// Anywhere in your code
final text = t('common.save');
final greeting = t('greeting', args: {'name': 'World'});
```

## Supported Locales

```dart
enum SupportedLocale {
  en('en', 'English', 'English', TextDirection.ltr),
  enUS('en-US', 'English (US)', 'English (US)', TextDirection.ltr),
  es('es', 'Español', 'Spanish', TextDirection.ltr),
  fr('fr', 'Français', 'French', TextDirection.ltr),
  de('de', 'Deutsch', 'German', TextDirection.ltr),
  ar('ar', 'العربية', 'Arabic', TextDirection.rtl),
  he('he', 'עברית', 'Hebrew', TextDirection.rtl),
  zhCN('zh-CN', '简体中文', 'Chinese (Simplified)', TextDirection.ltr),
  ja('ja', '日本語', 'Japanese', TextDirection.ltr),
  ko('ko', '한국어', 'Korean', TextDirection.ltr),
  // ... and more
}
```

## Locale Management

### Change Locale

```dart
// With persistence
await localeManager.changeLocale(SupportedLocale.es);

// Without persistence
await i18n.changeLocale(SupportedLocale.es);
```

### Locale Switcher Widget

```dart
LocaleSwitcher(
  showFlags: true,
  showNativeNames: true,
  onLocaleChanged: (locale) {
    print('Selected: ${locale.nativeName}');
  },
)
```

### Listen to Changes

```dart
i18n.addListener((locale) {
  print('Locale changed: ${locale.code}');
});
```

## Formatters

### Date Formatter

```dart
final date = DateTime.now();

// Format with style
dateFormatter.format(date, style: DateFormatStyle.long);
// "March 15, 2024"

// Format time
dateFormatter.formatTime(date, style: TimeFormatStyle.short);
// "10:30 AM"

// Format date and time
dateFormatter.formatDateTime(date);
// "Mar 15, 2024 10:30 AM"

// Format range
dateFormatter.formatRange(startDate, endDate);
// "March 15 – 20, 2024"

// Get month names
dateFormatter.getMonthNames();
// ["January", "February", ...]
```

### Number Formatter

```dart
// Basic formatting
numberFormatter.format(1234567);
// "1,234,567"

// Currency
numberFormatter.formatCurrency(1234.56, currencyCode: 'USD');
// "$1,234.56"

// Compact
numberFormatter.formatCompact(1234567);
// "1.2M"

// Percent
numberFormatter.formatPercent(0.85);
// "85%"

// File size
numberFormatter.formatFileSize(1536000);
// "1.5 MB"

// Ordinal
numberFormatter.formatOrdinal(3);
// "3rd"
```

### Relative Time Formatter

```dart
final pastDate = DateTime.now().subtract(Duration(hours: 2));

// Basic
relativeTimeFormatter.format(pastDate);
// "2 hours ago"

// Duration
relativeTimeFormatter.formatDuration(Duration(minutes: 45));
// "45 minutes"

// Smart (today, yesterday, tomorrow)
relativeTimeFormatter.formatSmart(pastDate);
// "Today" or "2 hours ago"
```

## RTL Support

### Automatic Direction

The `I18nProvider` automatically sets the correct `Directionality` based on the current locale.

### RTL Utilities

```dart
// Check direction
RtlUtils.isCurrentRTL // true for ar, he
RtlUtils.getDirection(SupportedLocale.ar) // TextDirection.rtl

// Flip value for RTL
RtlUtils.flipForRtl(10.0); // -10.0 for RTL, 10.0 for LTR

// Directional padding
Padding(
  padding: RtlUtils.directionalInsets(start: 16, end: 8),
  child: Text('Hello'),
);
```

### RTL Widgets

```dart
// Flip child for RTL (e.g., icons)
FlipForRtl(
  child: Icon(Icons.arrow_forward),
)

// Conditional widget based on direction
DirectionalBuilder(
  ltr: Icon(Icons.arrow_forward),
  rtl: Icon(Icons.arrow_back),
)
```

### Widget Extensions

```dart
Icon(Icons.arrow_forward)
  .flipForRtl()
  .withDirectionalPadding(start: 8, end: 16)
```

### Context Extensions

```dart
// Check direction
context.isRtl

// Get directional margin
context.startMargin(16)
context.endMargin(8)
context.horizontalMargin(start: 16, end: 8)
```

## Translation Files

Place your translation files in `assets/locales/{locale}/{namespace}.json`:

```
assets/
└── locales/
    ├── en/
    │   ├── common.json
    │   └── auth.json
    ├── es/
    │   ├── common.json
    │   └── auth.json
    └── ar/
        ├── common.json
        └── auth.json
```

Add to `pubspec.yaml`:

```yaml
flutter:
  assets:
    - assets/locales/en/
    - assets/locales/es/
    - assets/locales/ar/
```

### Example Translation File

```json
{
  "app": {
    "name": "AIVO",
    "tagline": "Personalized Learning"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "greeting": "Hello, {name}!",
  "items": "{count, plural, =0 {No items} one {# item} other {# items}}"
}
```

## Mixin Usage

### Stateless Widget

```dart
class MyWidget extends StatelessWidget with I18nMixin {
  @override
  Widget build(BuildContext context) {
    return Text(tr(context, 'hello'));
  }
}
```

### Stateful Widget

```dart
class MyWidget extends StatefulWidget {
  @override
  State<MyWidget> createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> with I18nStateMixin {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(tr('hello')),
        Text('Direction: ${isRTL ? 'RTL' : 'LTR'}'),
      ],
    );
  }
}
```

## Best Practices

1. **Namespace your translations** - Use namespaces (common, auth, student) to organize translations and enable lazy loading

2. **Use ICU MessageFormat** - For pluralization and gender, use ICU format instead of conditional logic

3. **Test RTL** - Always test your UI with RTL locales (Arabic, Hebrew)

4. **Persist preferences** - Use `LocaleManager` to persist user's locale preference

5. **Fallback gracefully** - The library will fallback to English if a translation is missing

## License

MIT © AIVO
