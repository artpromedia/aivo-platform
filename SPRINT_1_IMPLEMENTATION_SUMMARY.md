# Sprint 1 Implementation Summary

## Internationalization Infrastructure - Sprint 1 Complete

This document summarizes the Sprint 1 implementation of the AIVO internationalization system, which provides:
- **Automatic locale detection** from user's IP address
- **Language selection** at registration time
- **Country/currency/curriculum** auto-detection and user override

---

## 1. New Service: geolocation-svc (Port 4090)

### Location
`services/geolocation-svc/`

### Purpose
Provides IP-based geolocation, country/currency/language metadata, and curriculum framework resolution.

### Technology Stack
- **Runtime:** Node.js 20 + TypeScript
- **Framework:** Fastify
- **Database:** PostgreSQL with Prisma ORM
- **Caching:** Redis with ioredis
- **GeoIP:** MaxMind GeoLite2-City database
- **Validation:** Zod

### Database Models
| Model | Description |
|-------|-------------|
| `Country` | 25+ countries with ISO codes, phone codes, default languages/currencies |
| `CountryRegion` | States/provinces within countries |
| `Currency` | 40+ currencies with symbols, decimal places, exchange rates |
| `Language` | 50+ languages with native names, RTL support |
| `CurriculumFramework` | 20+ educational frameworks (Common Core, UK National, CBSE, CAPS, IB, Cambridge) |
| `CurriculumMapping` | Grade-level equivalencies between frameworks |
| `PaymentProviderRegion` | Regional payment provider configurations |
| `ComplianceRequirement` | Data residency and privacy requirements (GDPR, COPPA, POPIA, etc.) |
| `IpLocationCache` | Cached IP geolocation results |

### API Endpoints

#### Location Detection
```
GET  /api/v1/locate                 - Auto-detect from request IP
POST /api/v1/locate                 - Detect from provided IP
GET  /api/v1/locate/curriculum      - Get curriculum for location
GET  /api/v1/locate/payment-provider - Get payment provider for location
```

#### Country Data
```
GET  /api/v1/countries              - List all countries
GET  /api/v1/countries/:code        - Get country by ISO code
GET  /api/v1/countries/:code/regions - Get regions in country
GET  /api/v1/countries/:code/curricula - Get available curricula
```

#### Currency Data
```
GET  /api/v1/currencies             - List all currencies
GET  /api/v1/currencies/:code       - Get currency by code
GET  /api/v1/currencies/convert     - Convert between currencies
```

#### Curriculum Data
```
GET  /api/v1/curricula              - List all frameworks
GET  /api/v1/curricula/:code        - Get framework details
```

---

## 2. Auth Service Extensions

### Location
`services/auth-svc/prisma/schema.prisma`
`services/auth-svc/src/routes/auth.international.ts`

### New Model: UserPreferences

Added to User model with comprehensive locale preferences:

```prisma
model UserPreferences {
  // Core locale settings
  language              String    @default("en")
  country               String?
  timezone              String?
  currency              String    @default("USD")
  curriculumFramework   String?
  
  // Formatting preferences
  dateFormat            String    @default("MM/DD/YYYY")
  timeFormat            String    @default("12h")
  firstDayOfWeek        Int       @default(0)
  numberFormat          String    @default("en-US")
  
  // Detection metadata
  detectedCountry       String?
  detectedLanguage      String?
  detectedTimezone      String?
  detectionMethod       String?
  detectedAt            DateTime?
  
  // Override tracking
  languageOverridden    Boolean   @default(false)
  countryOverridden     Boolean   @default(false)
  currencyOverridden    Boolean   @default(false)
  timezoneOverridden    Boolean   @default(false)
  curriculumOverridden  Boolean   @default(false)
}
```

### New API Endpoints

```
POST /v2/register              - Registration with locale preferences
GET  /v2/me/preferences        - Get user preferences
PUT  /v2/me/preferences        - Update user preferences
GET  /v2/supported-locales     - List available locales (public)
```

---

## 3. Frontend Components

### LocalePicker Component
**Location:** `libs/ui-components/src/components/locale-picker/LocalePicker.tsx`

Interactive component for selecting:
- Language (27 options with native names, RTL badges)
- Country (grouped by region: Americas, Europe, Asia, Africa, Oceania)
- Currency (23 options with symbols)
- Curriculum Framework (for educators)
- Date/time format preferences

Features:
- Shows detected locale with confidence indicator
- Groups countries by region for better UX
- RTL language support indicators
- Curriculum options filtered by country

### useLocaleDetection Hook
**Location:** `libs/ui-components/src/hooks/useLocaleDetection.ts`

React hook for automatic locale detection:
- Calls geolocation-svc on mount
- Falls back to browser detection (navigator.language, timezone)
- Manages loading state
- Tracks user overrides
- Provides `resetToDetected()` function

### RegistrationWithLocale Component
**Location:** `libs/ui-components/src/components/registration/RegistrationWithLocale.tsx`

Two-step registration flow:
1. **Account Details:** Name, email, password, role selection
2. **Regional Preferences:** Language, country, currency, curriculum

Features:
- Automatic locale detection on load
- Progress indicator
- Role-based curriculum display (educators only)
- Terms/marketing consent
- Validation with react-hook-form + Zod

---

## 4. Docker Configuration

### docker-compose.services.yml

Added geolocation-svc service:
```yaml
geolocation-svc:
  build:
    context: ./services/geolocation-svc
    dockerfile: ../../docker/Dockerfile.service
  ports:
    - "4090:4090"
  environment:
    - DATABASE_URL=postgresql://aivo:aivo@postgres:5432/geolocation
    - REDIS_URL=redis://redis:6379/8
    - MAXMIND_LICENSE_KEY=${MAXMIND_LICENSE_KEY:-}
```

New volume: `geoip-data` for MaxMind database storage

---

## 5. Seed Data

**Location:** `services/geolocation-svc/prisma/seed.ts`

Comprehensive seed data (~900 lines):

### Currencies (40+)
USD, EUR, GBP, JPY, CNY, INR, ZAR, NGN, KES, GHS, AED, SAR, ILS, BRL, MXN, KRW, SGD, IDR, THB, etc.

### Languages (50+)
English (multiple variants), Spanish, French, German, Portuguese, Chinese, Japanese, Korean, Arabic (multiple variants), Hindi, Swahili, Afrikaans, Zulu, etc.

### Countries (25+)
| Region | Countries |
|--------|-----------|
| Americas | US, CA, MX, BR, AR |
| Europe | GB, DE, FR, NL, ES, IT, PL |
| Middle East | AE, SA, IL |
| Asia | IN, CN, JP, KR, SG, ID, TH, VN, PH, MY |
| Oceania | AU, NZ |
| Africa | ZA, NG, KE, GH, EG |

### Curriculum Frameworks (20+)
| Framework | Countries |
|-----------|-----------|
| Common Core | US |
| NGSS | US |
| TEKS | US (Texas) |
| UK National Curriculum | GB, NG, KE, GH |
| Curriculum for Excellence | GB (Scotland) |
| CBSE | IN, AE |
| ICSE | IN |
| CAPS | ZA |
| Australian Curriculum | AU |
| NZ Curriculum | NZ |
| IB PYP/MYP/DP | International |
| Cambridge Primary/IGCSE | International |
| UAE MOE | AE |
| Singapore MOE | SG |

### Payment Providers
| Region | Providers |
|--------|-----------|
| Global | Stripe |
| Africa | Paystack, Flutterwave |
| India | Razorpay, Paytm |
| Middle East | Tap, Checkout.com |
| Southeast Asia | Midtrans, GrabPay |
| Latin America | PagSeguro, MercadoPago |
| China | Alipay, WeChat Pay |

### Compliance Requirements
| Regulation | Regions |
|------------|---------|
| GDPR | EU countries |
| POPIA | South Africa |
| LGPD | Brazil |
| DPDP | India |
| PIPL | China |
| COPPA | US (children) |
| FERPA | US (education) |
| PIPEDA | Canada |

---

## 6. Getting Started

### Prerequisites
1. Node.js 20+
2. PostgreSQL 15+
3. Redis 7+
4. MaxMind GeoLite2 license key (free)

### Setup Commands

```bash
# Navigate to geolocation service
cd services/geolocation-svc

# Install dependencies
pnpm install

# Create database
createdb geolocation

# Run migrations
npx prisma migrate dev

# Seed data
npx prisma db seed

# Start service
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `MAXMIND_LICENSE_KEY` - Get free key from MaxMind

---

## 7. Next Steps (Sprint 2)

1. **Curriculum Content Tagging**
   - Add curriculum framework tags to lessons/assessments
   - Implement grade-level mapping between frameworks

2. **Curriculum Browser**
   - Frontend component for exploring curriculum-aligned content
   - Filter content by framework and grade level

3. **Teacher Dashboard Updates**
   - Curriculum framework selector in class settings
   - Standard alignment indicators on content

See [INTERNATIONALIZATION_SPRINT_PLAN.md](./INTERNATIONALIZATION_SPRINT_PLAN.md) for complete roadmap.

---

## File Inventory

| File | Purpose |
|------|---------|
| `services/geolocation-svc/package.json` | Service dependencies |
| `services/geolocation-svc/tsconfig.json` | TypeScript config |
| `services/geolocation-svc/Dockerfile` | Container build |
| `services/geolocation-svc/.env.example` | Environment template |
| `services/geolocation-svc/prisma/schema.prisma` | Database models |
| `services/geolocation-svc/prisma/seed.ts` | Seed data |
| `services/geolocation-svc/src/index.ts` | Entry point |
| `services/geolocation-svc/src/services/geolocation.service.ts` | Core service |
| `services/geolocation-svc/src/services/cache.service.ts` | Redis caching |
| `services/geolocation-svc/src/routes/location.routes.ts` | Location API |
| `services/geolocation-svc/src/routes/country.routes.ts` | Country API |
| `services/geolocation-svc/src/routes/currency.routes.ts` | Currency API |
| `services/geolocation-svc/src/routes/curriculum.routes.ts` | Curriculum API |
| `services/geolocation-svc/src/routes/health.routes.ts` | Health checks |
| `services/geolocation-svc/src/utils/logger.ts` | Pino logger |
| `services/auth-svc/prisma/schema.prisma` | UserPreferences model |
| `services/auth-svc/src/routes/auth.international.ts` | Enhanced auth routes |
| `libs/ui-components/src/components/locale-picker/LocalePicker.tsx` | Locale picker |
| `libs/ui-components/src/hooks/useLocaleDetection.ts` | Detection hook |
| `libs/ui-components/src/components/registration/RegistrationWithLocale.tsx` | Registration form |
| `docker-compose.services.yml` | Docker config (updated) |

---

**Sprint 1 Status: COMPLETE** ✅
