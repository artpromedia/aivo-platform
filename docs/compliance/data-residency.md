# Data Residency & Internationalization

> Sprint 15 — P2: Data Residency Controls & Full Internationalization with Language Switcher

## Table of Contents

- [Data Residency](#data-residency)
  - [Supported Regions](#supported-regions)
  - [Architecture](#architecture)
  - [Tenant Provisioning](#tenant-provisioning)
  - [Cross-Region Data Flow](#cross-region-data-flow)
  - [Enforcement](#enforcement)
- [Internationalization](#internationalization)
  - [Supported Locales](#supported-locales)
  - [Architecture](#i18n-architecture)
  - [Web App Integration](#web-app-integration)
  - [Flutter Integration](#flutter-integration)
  - [RTL Support](#rtl-support)
  - [Adding a New Language](#adding-a-new-language)
  - [CI Checks](#ci-checks)
- [User Language Preference API](#user-language-preference-api)

---

## Data Residency

### Supported Regions

| Region ID         | Location              | Compliance Badges        |
|-------------------|-----------------------|--------------------------|
| `us-east-1`       | US East (Virginia)    | FERPA, COPPA, SOC 2     |
| `us-west-2`       | US West (Oregon)      | FERPA, COPPA, SOC 2     |
| `eu-west-1`       | EU (Ireland)          | GDPR, SOC 2             |
| `ap-southeast-1`  | Asia Pacific (Singapore) | PDPA, SOC 2          |
| `ca-central-1`    | Canada (Montreal)     | PIPEDA, SOC 2           |

### Architecture

Data residency is enforced at multiple layers:

```
┌──────────────────────────────────────────────────────┐
│  Tenant Signup Wizard                                │
│  ┌──────────────────────────────────────────────────┐│
│  │ DataRegionStep → selects region for tenant       ││
│  │ Auto-detects from timezone, user confirms        ││
│  └──────────────────────────────────────────────────┘│
│                        ↓                             │
│  ┌──────────────────────────────────────────────────┐│
│  │ DataResidencyService (tenant-svc)                ││
│  │ - resolveRegion(tenantId) → endpoints            ││
│  │ - enforceResidency() → Fastify preHandler        ││
│  │ - suggestRegion(countryCode)                     ││
│  └──────────────────────────────────────────────────┘│
│                        ↓                             │
│  ┌──────────────────────────────────────────────────┐│
│  │ NATS Cross-Region Sync                           ││
│  │ - Allowed: platform.*, content.catalog, system.* ││
│  │ - Denied:  learner.*, auth.*, profile.*, iep.*   ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### Tenant Provisioning

During signup, the `DataRegionStep` component:

1. Auto-detects the user's timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`
2. Maps timezone → suggested region
3. User confirms or overrides region selection
4. Region is stored in `tenants.data_region` column (immutable after provisioning)

**File:** `apps/web-district/app/signup/steps/DataRegionStep.tsx`

### Cross-Region Data Flow

NATS subjects are partitioned by security sensitivity:

**Allowed Exports** (replicated across all regions):
- `platform.announcements.>` — System-wide announcements
- `content.catalog.>` — Curriculum content metadata
- `system.config.>` — Feature flags, configuration
- `analytics.aggregated.>` — Anonymized aggregate metrics
- `tenant.config.>` — Tenant feature flags
- `billing.entitlements.>` — License/entitlement status

**Denied Exports** (stay within the tenant's region):
- `learner.*` — All learner PII
- `auth.*` — Authentication tokens/sessions
- `profile.*` — User profiles
- `assessment.results.*` — Individual assessment data
- `messaging.*` — Chat/messages
- `parent.*` / `iep.*` / `behavior.*` — Sensitive educational data
- `audit.pii.*` — PII audit logs

**File:** `infra/k8s/base/nats/data-residency-subjects.yaml`

### Enforcement

The `enforceResidency()` Fastify preHandler middleware:

1. Reads `x-tenant-id` from request headers
2. Looks up the tenant's assigned region
3. Compares against the current service instance's region
4. Returns `307 Temporary Redirect` to the correct regional endpoint if mismatched

```typescript
import { DataResidencyService } from './services/data-residency.service';

const residencyService = new DataResidencyService();

// Register as a preHandler on protected routes
app.addHook('preHandler', residencyService.enforceResidency());
```

---

## Internationalization

### Supported Locales

| Code | Language              | Native Name  | Direction |
|------|-----------------------|-------------|-----------|
| `en` | English               | English     | LTR       |
| `es` | Spanish               | Español     | LTR       |
| `fr` | French                | Français    | LTR       |
| `de` | German                | Deutsch     | LTR       |
| `pt` | Portuguese            | Português   | LTR       |
| `ar` | Arabic                | العربية      | **RTL**   |
| `zh` | Chinese (Simplified)  | 简体中文     | LTR       |
| `ja` | Japanese              | 日本語       | LTR       |
| `ko` | Korean                | 한국어       | LTR       |
| `hi` | Hindi                 | हिन्दी       | LTR       |

### I18n Architecture

```
packages/i18n/
├── src/
│   ├── config.ts              # UI_LOCALES, LOCALE_DISPLAY, resolveUILocale()
│   ├── middleware.ts           # withLocaleDetection() for Next.js Edge
│   ├── server.ts              # getLocale(), getDirection() for SSR
│   ├── rtl.css                # Global RTL stylesheet
│   ├── components/
│   │   ├── LanguageSwitcher.tsx  # 3 variants: dropdown, compact, menu
│   │   └── LocaleProvider.tsx    # React context
│   ├── locales/
│   │   ├── en.json ... hi.json  # 10 locale dictionaries (~130 keys each)
│   │   └── index.ts             # Barrel export
│   ├── core/                    # intl-messageformat integration
│   ├── react/                   # useTranslation, TranslationProvider
│   ├── rtl/                     # RTL utils, provider, constants
│   ├── formatters/              # Date, number, relative time
│   └── styles/                  # Direction-aware style helpers
```

### Web App Integration

All 9 Next.js web apps are integrated:

**Layout (SSR):**
```tsx
import { getLocale, getDirection } from '@aivo/i18n/server';

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={getDirection(locale)}>
      ...
    </html>
  );
}
```

**Middleware (Edge):**
```typescript
import { withLocaleDetection } from '@aivo/i18n/middleware';

const authMiddleware = createAuthMiddleware({ ... });
export const middleware = withLocaleDetection(authMiddleware);
```

**Locale Detection Priority:**
1. `NEXT_LOCALE` cookie (set by LanguageSwitcher)
2. `?locale=xx` query parameter
3. `Accept-Language` header (quality-value parsing)
4. Default: `en`

**LanguageSwitcher Integration:**
- Added to navigation/header of all 9 web apps
- Apps with shared nav: integrated inline (compact variant)
- Apps without shared nav (web-parent, web-creator): floating bottom-right button

### Flutter Integration

The `aivo_i18n` library lives in `libs/flutter-common/lib/i18n/`:

```dart
import 'package:flutter_common/i18n/aivo_i18n.dart' as aivo_i18n;

MaterialApp.router(
  supportedLocales: aivo_i18n.SupportedLocale.values.map((l) => l.locale),
  localizationsDelegates: [...],
);
```

**LanguageSwitcher Widget:**
```dart
LanguageSwitcher(
  style: LanguageSwitcherStyle.compact,     // or .dropdown, .bottomSheet
  showFlags: true,
  showNativeNames: true,
  onLocaleChanged: (locale) => print('Changed to $locale'),
)
```

**ARB Generation:**
```bash
npx tsx scripts/generate-arb.ts                     # all apps
npx tsx scripts/generate-arb.ts --app mobile-learner # single app
```

### RTL Support

RTL is supported at multiple levels:

1. **HTML `dir` attribute** — Automatically set by `getDirection()` in layouts
2. **CSS logical properties** — Import `@aivo/i18n/rtl.css` for `.mis-*`, `.mie-*`, `.pis-*`, `.pie-*` helpers
3. **React RTL utilities** — `rtlStyle()`, `rtlClass()`, `RTLProvider` from `@aivo/i18n/rtl`
4. **Flutter RTL** — `I18nProvider.directionOf(context)`, `RTLAware` widget

### Adding a New Language

1. **Create JSON locale file:**
   ```bash
   cp packages/i18n/src/locales/en.json packages/i18n/src/locales/XX.json
   # Translate all values
   ```

2. **Register in config.ts:**
   Add to `UI_LOCALES` array and `LOCALE_DISPLAY` record.

3. **Update locales barrel:**
   Add import/export in `packages/i18n/src/locales/index.ts`.

4. **Generate ARB files:**
   ```bash
   npx tsx scripts/generate-arb.ts
   ```

5. **Run CI check:**
   ```bash
   npx tsx scripts/check-missing-translations.ts
   ```

6. **Update Flutter constants:**
   Add to `SupportedLocale` enum in `libs/flutter-common/lib/i18n/src/types.dart`.

### CI Checks

**Translation completeness check:**
```bash
npx tsx scripts/check-missing-translations.ts
```

Options:
- `--warn-only` — Report but don't fail
- `--threshold 90` — Allow up to 10% missing keys

The script checks:
- All locale files have the same key set as `en.json`
- No values are empty strings
- ICU placeholders (`{name}`, `{count}`) are consistent across locales
- Coverage percentage meets threshold

---

## User Language Preference API

**Service:** `profile-svc`

### GET `/api/v1/preferences/language`

Returns the user's stored language preference.

**Headers:** `x-user-id` (required)

**Response:**
```json
{
  "locale": "es",
  "timezone": "America/Mexico_City",
  "updatedAt": "2026-02-25T10:30:00.000Z"
}
```

### PATCH `/api/v1/preferences/language`

Updates the user's language preference (upsert).

**Headers:** `x-user-id` (required)

**Body:**
```json
{
  "locale": "fr",
  "timezone": "Europe/Paris"
}
```

**Validation:** `locale` must be one of: `en`, `es`, `fr`, `de`, `pt`, `ar`, `zh`, `ja`, `ko`, `hi`.

### Database Schema

```sql
CREATE TABLE user_preferences (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    VARCHAR(64) NOT NULL UNIQUE,
  locale     VARCHAR(10) NOT NULL DEFAULT 'en',
  timezone   VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `services/tenant-svc/src/services/data-residency.service.ts` | Data residency service |
| `services/tenant-svc/prisma/migrations/20260225_add_data_residency/migration.sql` | Tenant region columns |
| `apps/web-district/app/signup/steps/DataRegionStep.tsx` | Region selection UI |
| `infra/k8s/base/nats/data-residency-subjects.yaml` | NATS cross-region rules |
| `packages/i18n/src/config.ts` | UI locale configuration |
| `packages/i18n/src/middleware.ts` | Edge locale detection |
| `packages/i18n/src/server.ts` | SSR locale helpers |
| `packages/i18n/src/rtl.css` | RTL global styles |
| `packages/i18n/src/components/LanguageSwitcher.tsx` | Language picker (3 variants) |
| `packages/i18n/src/components/LocaleProvider.tsx` | Locale React context |
| `packages/i18n/src/locales/*.json` | 10 locale dictionaries |
| `libs/flutter-common/lib/i18n/src/language_switcher.dart` | Flutter language switcher |
| `scripts/generate-arb.ts` | JSON → ARB conversion |
| `scripts/check-missing-translations.ts` | CI translation check |
| `services/profile-svc/src/routes/languagePreferencesRoutes.ts` | Language pref API |
| `services/profile-svc/prisma/migrations/20260225_add_user_preferences/migration.sql` | Preferences table |
| `docs/compliance/data-residency.md` | This document |

### Modified Files
| File | Change |
|------|--------|
| All 9 `layout.tsx` | Dynamic `lang`/`dir` attributes |
| All 9 `middleware.ts` | `withLocaleDetection()` wrapper |
| All 9 nav/header components | LanguageSwitcher added |
| 3 Flutter `main.dart` | Full locale support |
| `packages/i18n/package.json` | New subpath exports |
| `packages/i18n/src/index.ts` | Re-exports |
| `services/profile-svc/src/app.ts` | Language pref route registered |
