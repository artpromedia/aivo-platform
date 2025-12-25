# @aivo/i18n-cli

Command-line tools for managing AIVO internationalization.

## Installation

```bash
pnpm add -D @aivo/i18n-cli
```

## Commands

### extract

Extract translation keys from source code.

```bash
aivo-i18n extract [options]
```

**Options:**

| Option                         | Description                    | Default                            |
| ------------------------------ | ------------------------------ | ---------------------------------- |
| `-p, --patterns <patterns...>` | File patterns to search        | `**/*.{ts,tsx,js,jsx,dart}`        |
| `-e, --exclude <patterns...>`  | Patterns to exclude            | `**/node_modules/**`, `**/dist/**` |
| `-o, --output <dir>`           | Output directory               | `./locales`                        |
| `-f, --format <format>`        | Output format (json, pot, arb) | `json`                             |
| `-l, --locales <locales...>`   | Target locales                 | `en`                               |
| `--flat`                       | Use flat JSON structure        | `false`                            |
| `--default-namespace <ns>`     | Default namespace              | `common`                           |

**Examples:**

```bash
# Extract from TypeScript/React files
aivo-i18n extract -p "src/**/*.tsx" -o locales -l en es ar

# Extract to POT format for translators
aivo-i18n extract -f pot -o translations

# Extract from Flutter/Dart files to ARB format
aivo-i18n extract -p "lib/**/*.dart" -f arb -o lib/l10n
```

### analyze

Analyze translation coverage across locales.

```bash
aivo-i18n analyze [options]
```

**Options:**

| Option                       | Description               | Default                     |
| ---------------------------- | ------------------------- | --------------------------- |
| `-s, --source <patterns...>` | Source file patterns      | `**/*.{ts,tsx,js,jsx,dart}` |
| `-l, --locales-dir <dir>`    | Locales directory         | `./locales`                 |
| `-t, --target <locales...>`  | Target locales to analyze | `en`, `es`, `ar`            |
| `--json`                     | Output as JSON            | `false`                     |

**Example Output:**

```
📊 Analyzing translations...

Summary
────────────────────────────────────────
Total keys:     156
Translated:     142
Coverage:       91%
Missing:        14
Unused:         8

By Locale
────────────────────────────────────────
en         100% (0 missing)
es          95% (8 missing)
ar          78% (34 missing)

Missing Keys (top 10)
────────────────────────────────────────
  • common:settings.privacy.title
    src/pages/Settings.tsx:45
  • auth:mfa.setup.instructions
    src/components/MFASetup.tsx:23
  ...

Unused Keys (top 10)
────────────────────────────────────────
  • common:deprecated.feature
  • auth:legacy.login
  ...
```

### compare

Compare translations between locales.

```bash
aivo-i18n compare <source> <target> [options]
```

**Options:**

| Option            | Description       | Default     |
| ----------------- | ----------------- | ----------- |
| `-d, --dir <dir>` | Locales directory | `./locales` |

**Example:**

```bash
aivo-i18n compare en es -d locales
```

### sync

Synchronize translation files across locales.

```bash
aivo-i18n sync [options]
```

**Options:**

| Option                      | Description                | Default     |
| --------------------------- | -------------------------- | ----------- |
| `-s, --source <locale>`     | Source locale              | `en`        |
| `-t, --target <locales...>` | Target locales             | (required)  |
| `-d, --dir <dir>`           | Locales directory          | `./locales` |
| `--dry-run`                 | Show what would be changed | `false`     |

**Examples:**

```bash
# Preview changes
aivo-i18n sync -s en -t es ar fr --dry-run

# Apply sync
aivo-i18n sync -s en -t es ar fr
```

## Supported Patterns

### JavaScript/TypeScript

The extractor recognizes these patterns:

```typescript
// Function calls
t('key')
t('key', { name: 'value' })
i18n.t('key')
useTranslation().t('key')

// With options
t('key', { count: 5 }, { namespace: 'errors' })

// JSX components
<Trans i18nKey="key" />
<FormattedMessage id="key" />
```

### Dart/Flutter

```dart
// Function calls
t('key')
i18n.t('key')
context.t('key')

// Widget
Tr('key')
```

## Programmatic API

```typescript
import { extractKeys, analyzeTranslations, generateOutput } from '@aivo/i18n-cli';

// Extract keys
const keys = await extractKeys({
  patterns: ['src/**/*.tsx'],
  defaultNamespace: 'common',
});

// Analyze coverage
const result = await analyzeTranslations(keys, {
  localesDir: './locales',
  locales: ['en', 'es', 'ar'],
});

console.log(`Coverage: ${result.coveragePercent}%`);
console.log(`Missing: ${result.missingKeys.length}`);

// Generate output
await generateOutput(keys, {
  outputDir: './locales',
  format: 'json',
  locales: ['en'],
});
```

## Integration

### Pre-commit Hook

Add to your `package.json`:

```json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": ["aivo-i18n extract -o locales --dry-run"]
  }
}
```

### CI/CD

```yaml
# .github/workflows/i18n.yml
name: i18n Check

on: [pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm aivo-i18n analyze --json > i18n-report.json
      - uses: actions/upload-artifact@v4
        with:
          name: i18n-report
          path: i18n-report.json
```

## License

MIT © AIVO
