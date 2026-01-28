# AIVO Internationalization Implementation Plan

## 🎯 Goal
Complete internationalization support enabling AIVO to operate seamlessly across:
- **10+ countries** with localized curricula
- **30+ languages** with full RTL support
- **20+ currencies** with regional payment processing
- **Automatic locale detection** based on user location
- **User preference selection** at registration

---

## 📅 Timeline Overview

| Sprint | Duration | Focus Area |
|--------|----------|------------|
| Sprint 1 | 2 weeks | Foundation: Geolocation Service & User Preferences |
| Sprint 2 | 2 weeks | International Curriculum Framework |
| Sprint 3 | 2 weeks | Payment Gateway Abstraction |
| Sprint 4 | 2 weeks | Regional Payment Integrations (Part 1) |
| Sprint 5 | 2 weeks | Regional Payment Integrations (Part 2) |
| Sprint 6 | 2 weeks | Translation Infrastructure |
| Sprint 7 | 2 weeks | Frontend Localization |
| Sprint 8 | 2 weeks | Mobile Localization & Testing |
| Sprint 9 | 2 weeks | Compliance & Data Residency |
| Sprint 10 | 2 weeks | QA, Performance & Launch |

**Total Duration:** 20 weeks (5 months)

---

## 🏃 Sprint 1: Foundation - Geolocation & User Preferences

### Objective
Build core infrastructure for automatic locale detection and user preference management.

### Deliverables

#### 1.1 Create Geolocation Service (`services/geolocation-svc/`)

**File: `services/geolocation-svc/src/index.ts`**
```typescript
// Main service entry point
// Port: 4090
// Dependencies: MaxMind GeoIP2, Redis cache
```

**Key Features:**
- IP-to-location resolution using MaxMind GeoIP2
- Country, region, city, timezone detection
- Currency inference from country
- Language inference from country/region
- Curriculum standard inference from country
- Redis caching for performance (TTL: 24 hours)

**API Endpoints:**
```
GET /api/v1/locate
  - Auto-detect from request IP
  - Returns: { country, region, city, timezone, currency, language, curriculumStandard }

POST /api/v1/locate
  - Body: { ip: string }
  - Returns: same as above

GET /api/v1/countries
  - Returns list of supported countries with metadata

GET /api/v1/country/:code
  - Returns detailed country info (languages, currencies, curricula)
```

**Prisma Schema Addition:**
```prisma
// services/geolocation-svc/prisma/schema.prisma

model Country {
  id                    String   @id @default(uuid()) @db.Uuid
  code                  String   @unique @db.VarChar(2)  // ISO 3166-1 alpha-2
  code3                 String   @unique @db.VarChar(3)  // ISO 3166-1 alpha-3
  name                  String
  nativeName            String   @map("native_name")
  region                String   // Africa, Americas, Asia, Europe, Oceania
  subregion             String?
  
  // Defaults
  defaultLanguage       String   @map("default_language") @db.VarChar(10)
  defaultCurrency       String   @map("default_currency") @db.VarChar(3)
  defaultCurriculum     String   @map("default_curriculum")
  
  // Supported options
  supportedLanguages    String[] @map("supported_languages")
  supportedCurrencies   String[] @map("supported_currencies")
  supportedCurricula    String[] @map("supported_curricula")
  
  // Timezone
  timezones             String[]
  
  // Flags
  isActive              Boolean  @default(true) @map("is_active")
  hasLocalPayment       Boolean  @default(false) @map("has_local_payment")
  
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")
  
  @@map("countries")
}

model Currency {
  id                    String   @id @default(uuid()) @db.Uuid
  code                  String   @unique @db.VarChar(3)  // ISO 4217
  name                  String
  symbol                String
  symbolNative          String   @map("symbol_native")
  decimalDigits         Int      @default(2) @map("decimal_digits")
  
  // Formatting
  thousandsSeparator    String   @default(",") @map("thousands_separator")
  decimalSeparator      String   @default(".") @map("decimal_separator")
  symbolPosition        String   @default("before") @map("symbol_position") // before, after
  
  // Exchange rate (updated daily)
  exchangeRateToUSD     Decimal  @default(1.0) @map("exchange_rate_to_usd") @db.Decimal(18, 8)
  exchangeRateUpdatedAt DateTime? @map("exchange_rate_updated_at")
  
  isActive              Boolean  @default(true) @map("is_active")
  
  @@map("currencies")
}
```

#### 1.2 Extend User Preferences in auth-svc

**Update: `services/auth-svc/prisma/schema.prisma`**
```prisma
model UserPreferences {
  id                    String   @id @default(uuid()) @db.Uuid
  userId                String   @unique @map("user_id") @db.Uuid
  tenantId              String   @map("tenant_id") @db.Uuid
  
  // Locale preferences
  language              String   @default("en") @db.VarChar(10)
  country               String?  @db.VarChar(2)
  timezone              String?  @db.VarChar(50)
  
  // Regional preferences
  currency              String   @default("USD") @db.VarChar(3)
  curriculumStandard    String?  @map("curriculum_standard")
  dateFormat            String   @default("MM/DD/YYYY") @map("date_format")
  timeFormat            String   @default("12h") @map("time_format") // 12h, 24h
  firstDayOfWeek        Int      @default(0) @map("first_day_of_week") // 0=Sunday, 1=Monday
  
  // Detection metadata
  detectedCountry       String?  @map("detected_country") @db.VarChar(2)
  detectedLanguage      String?  @map("detected_language") @db.VarChar(10)
  detectionMethod       String?  @map("detection_method") // ip, browser, manual
  detectedAt            DateTime? @map("detected_at")
  
  // User overrides (user explicitly changed from detected)
  languageOverridden    Boolean  @default(false) @map("language_overridden")
  currencyOverridden    Boolean  @default(false) @map("currency_overridden")
  curriculumOverridden  Boolean  @default(false) @map("curriculum_overridden")
  
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")
  
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@map("user_preferences")
}
```

#### 1.3 Registration Flow Updates

**Update: `services/auth-svc/src/routes/auth.routes.ts`**

Add to registration endpoint:
```typescript
// POST /api/v1/auth/register
interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'LEARNER' | 'PARENT' | 'TEACHER';
  
  // New locale fields
  preferences?: {
    language?: string;      // User-selected or auto-detected
    country?: string;       // User-selected or auto-detected  
    currency?: string;      // User-selected or auto-detected
    timezone?: string;      // Auto-detected from browser
    curriculumStandard?: string; // For educators
  };
  
  // Auto-detection hint
  detectedLocale?: {
    ip?: string;
    browserLanguage?: string;
    browserTimezone?: string;
  };
}
```

**Registration Flow:**
1. Frontend calls geolocation-svc to get detected locale
2. Frontend presents locale selection with detected values as defaults
3. User can accept defaults or override
4. On submit, preferences saved with user account
5. Preferences returned in JWT token claims for frontend use

### Tasks

- [ ] **1.1.1** Create geolocation-svc service scaffold
- [ ] **1.1.2** Integrate MaxMind GeoIP2 database
- [ ] **1.1.3** Implement IP detection endpoints
- [ ] **1.1.4** Build country/currency/curriculum mapping data
- [ ] **1.1.5** Add Redis caching layer
- [ ] **1.2.1** Add UserPreferences model to auth-svc
- [ ] **1.2.2** Create migration for user_preferences table
- [ ] **1.2.3** Update registration endpoint
- [ ] **1.2.4** Add preferences to JWT token
- [ ] **1.2.5** Create GET/PUT /api/v1/users/me/preferences endpoint
- [ ] **1.3.1** Update frontend registration form
- [ ] **1.3.2** Add locale picker component
- [ ] **1.3.3** Integrate geolocation detection on registration page
- [ ] **1.3.4** Add unit tests
- [ ] **1.3.5** Add integration tests

### Acceptance Criteria
- [ ] Geolocation service accurately detects country from IP (95%+ accuracy)
- [ ] Registration form shows detected locale as default
- [ ] User can override any detected preference
- [ ] Preferences persisted and returned in auth token
- [ ] API returns user preferences on /me endpoint

---

## 🏃 Sprint 2: International Curriculum Framework

### Objective
Build comprehensive curriculum standards database supporting 10+ countries.

### Deliverables

#### 2.1 Extend Curriculum Schema

**Update: `services/curriculum-svc/prisma/schema.prisma`**

```prisma
/// Curriculum standard frameworks by country/region
enum CurriculumFramework {
  // United States
  COMMON_CORE_STATE_STANDARDS    // ELA & Math (45 states)
  NGSS                           // Next Generation Science Standards
  C3_FRAMEWORK                   // College, Career, Civic Life (Social Studies)
  TEKS                           // Texas Essential Knowledge and Skills
  
  // Canada
  ONTARIO_CURRICULUM             // Ontario
  ALBERTA_PROGRAM_OF_STUDIES     // Alberta
  BC_CURRICULUM                  // British Columbia
  QUEBEC_QEP                     // Quebec Education Program
  
  // United Kingdom
  UK_NATIONAL_CURRICULUM         // England
  CURRICULUM_FOR_EXCELLENCE      // Scotland
  CURRICULUM_WALES               // Wales
  NI_CURRICULUM                  // Northern Ireland
  
  // India
  CBSE                           // Central Board of Secondary Education
  ICSE                           // Indian Certificate of Secondary Education
  STATE_BOARD_INDIA              // Various state boards
  
  // UAE & Middle East
  UAE_MOE                        // UAE Ministry of Education
  ADEK                           // Abu Dhabi Department of Education
  SAUDI_MOE                      // Saudi Ministry of Education
  
  // China
  CHINA_NATIONAL_CURRICULUM      // 义务教育课程标准
  
  // Europe
  IB_PYP                         // International Baccalaureate Primary Years
  IB_MYP                         // International Baccalaureate Middle Years
  IB_DP                          // International Baccalaureate Diploma
  CAMBRIDGE_PRIMARY              // Cambridge Assessment International
  CAMBRIDGE_SECONDARY            // Cambridge IGCSE
  EUROPEAN_BACCALAUREATE         // European Schools
  
  // Australia & New Zealand
  AUSTRALIAN_CURRICULUM          // ACARA
  NEW_ZEALAND_CURRICULUM         // NZC
  
  // South Africa
  CAPS                           // Curriculum and Assessment Policy Statement
  
  // Other
  CUSTOM                         // Custom/district-specific
  
  @@map("curriculum_framework")
}

/// Grade level mapping across different systems
model GradeLevel {
  id                    String   @id @default(uuid()) @db.Uuid
  
  // Universal reference
  universalGrade        Int      @map("universal_grade") // 0=Pre-K, 1=K, 2=Grade1, etc.
  
  // Framework-specific names
  framework             CurriculumFramework
  localName             String   @map("local_name")     // e.g., "Year 7", "Class 6", "Grade 5"
  localNameNative       String?  @map("local_name_native") // In local language
  
  // Age range
  typicalAgeStart       Int      @map("typical_age_start")
  typicalAgeEnd         Int      @map("typical_age_end")
  
  // Academic grouping
  levelCategory         String   @map("level_category") // PRIMARY, MIDDLE, SECONDARY, etc.
  
  @@unique([framework, universalGrade])
  @@index([framework])
  @@map("grade_levels")
}

/// Standard codes repository
model StandardCode {
  id                    String   @id @default(uuid()) @db.Uuid
  
  // Framework reference
  framework             CurriculumFramework
  
  // Standard identification
  code                  String                // e.g., "CCSS.ELA-LITERACY.RL.5.1"
  shortCode             String?  @map("short_code") // e.g., "RL.5.1"
  
  // Classification
  subject               SubjectArea
  gradeLevel            Int      @map("grade_level") // Universal grade
  domain                String?               // e.g., "Reading: Literature"
  cluster               String?               // e.g., "Key Ideas and Details"
  strand                String?               // More specific grouping
  
  // Content
  description           String   @db.Text
  descriptionNative     String?  @map("description_native") @db.Text
  
  // Skills and concepts
  skills                String[]
  concepts              String[]
  
  // Cross-curriculum mapping
  equivalentStandards   Json?    @map("equivalent_standards") // Map to other frameworks
  
  // Metadata
  isActive              Boolean  @default(true) @map("is_active")
  version               String?               // Standard version/year
  effectiveDate         DateTime? @map("effective_date")
  
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")
  
  @@unique([framework, code])
  @@index([framework, subject, gradeLevel])
  @@index([code])
  @@map("standard_codes")
}

/// Cross-curriculum standard alignment (for content portability)
model StandardEquivalence {
  id                    String   @id @default(uuid()) @db.Uuid
  
  // Source standard
  sourceFramework       CurriculumFramework @map("source_framework")
  sourceCode            String   @map("source_code")
  
  // Target standard
  targetFramework       CurriculumFramework @map("target_framework")
  targetCode            String   @map("target_code")
  
  // Alignment quality
  alignmentStrength     String   @map("alignment_strength") // EXACT, STRONG, PARTIAL, WEAK
  alignmentNotes        String?  @map("alignment_notes") @db.Text
  
  // Verification
  verifiedBy            String?  @map("verified_by")
  verifiedAt            DateTime? @map("verified_at")
  
  createdAt             DateTime @default(now()) @map("created_at")
  
  @@unique([sourceFramework, sourceCode, targetFramework, targetCode])
  @@index([sourceFramework, sourceCode])
  @@index([targetFramework, targetCode])
  @@map("standard_equivalences")
}
```

#### 2.2 Create Curriculum Data Seeder

**File: `services/curriculum-svc/prisma/seeds/international-curricula.ts`**

Seed data for:
- US: Common Core standards (full K-12)
- UK: National Curriculum (KS1-KS4)
- India: CBSE standards (Class 1-12)
- UAE: MOE standards
- Canada: Ontario curriculum
- Australia: ACARA standards
- South Africa: CAPS standards
- IB: PYP, MYP, DP frameworks

#### 2.3 Curriculum Resolution Service

**File: `services/curriculum-svc/src/services/curriculum-resolver.service.ts`**

```typescript
interface CurriculumResolverService {
  // Get appropriate curriculum for user
  resolveCurriculum(params: {
    country: string;
    region?: string;
    schoolType?: 'PUBLIC' | 'PRIVATE' | 'INTERNATIONAL';
    preferredFramework?: CurriculumFramework;
  }): Promise<CurriculumFramework>;
  
  // Map content from one curriculum to another
  mapStandard(params: {
    sourceFramework: CurriculumFramework;
    sourceCode: string;
    targetFramework: CurriculumFramework;
  }): Promise<StandardEquivalence[]>;
  
  // Get grade equivalent
  getGradeEquivalent(params: {
    sourceFramework: CurriculumFramework;
    sourceGrade: string; // "Year 7", "Grade 5", etc.
    targetFramework: CurriculumFramework;
  }): Promise<GradeLevel>;
}
```

### Tasks

- [ ] **2.1.1** Extend CurriculumFramework enum with all frameworks
- [ ] **2.1.2** Create GradeLevel model and migrations
- [ ] **2.1.3** Create StandardCode model and migrations
- [ ] **2.1.4** Create StandardEquivalence model and migrations
- [ ] **2.2.1** Seed US Common Core standards (ELA, Math)
- [ ] **2.2.2** Seed UK National Curriculum standards
- [ ] **2.2.3** Seed India CBSE standards
- [ ] **2.2.4** Seed UAE MOE standards
- [ ] **2.2.5** Seed Canada Ontario curriculum
- [ ] **2.2.6** Seed Australia ACARA standards
- [ ] **2.2.7** Seed IB framework standards
- [ ] **2.2.8** Create grade level equivalence mappings
- [ ] **2.3.1** Implement CurriculumResolverService
- [ ] **2.3.2** Implement standard mapping algorithms
- [ ] **2.3.3** Create API endpoints for curriculum resolution
- [ ] **2.3.4** Add curriculum preference to tenant settings
- [ ] **2.3.5** Integration tests for cross-curriculum mapping

### Acceptance Criteria
- [ ] All 10 major curriculum frameworks have standards loaded
- [ ] Grade levels mapped across all frameworks
- [ ] Cross-curriculum alignment for core subjects (Math, ELA/English, Science)
- [ ] Curriculum resolver returns correct framework based on location
- [ ] Content can be "translated" between curriculum standards

---

## 🏃 Sprint 3: Payment Gateway Abstraction

### Objective
Create payment provider abstraction layer supporting multiple gateways.

### Deliverables

#### 3.1 Payment Provider Interface

**File: `services/payments-svc/src/providers/payment-provider.interface.ts`**

```typescript
export interface PaymentProviderConfig {
  provider: PaymentProviderType;
  apiKey: string;
  secretKey: string;
  webhookSecret?: string;
  environment: 'sandbox' | 'production';
  region?: string;
}

export enum PaymentProviderType {
  // Global
  STRIPE = 'STRIPE',
  ADYEN = 'ADYEN',
  
  // Africa
  PAYSTACK = 'PAYSTACK',      // Nigeria, South Africa, Ghana, Kenya
  FLUTTERWAVE = 'FLUTTERWAVE', // Pan-Africa
  PAYFAST = 'PAYFAST',        // South Africa
  
  // India
  RAZORPAY = 'RAZORPAY',
  PAYU_INDIA = 'PAYU_INDIA',
  CASHFREE = 'CASHFREE',
  
  // Brazil/LATAM
  PAGSEGURO = 'PAGSEGURO',
  MERCADOPAGO = 'MERCADOPAGO',
  
  // Middle East
  PAYTABS = 'PAYTABS',
  TAP = 'TAP',
  
  // Southeast Asia
  MIDTRANS = 'MIDTRANS',      // Indonesia
  OMISE = 'OMISE',            // Thailand, Japan, Singapore
  
  // China
  ALIPAY = 'ALIPAY',
  WECHAT_PAY = 'WECHAT_PAY',
  
  // Manual
  MANUAL_INVOICE = 'MANUAL_INVOICE',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export interface IPaymentProvider {
  readonly name: PaymentProviderType;
  readonly supportedCurrencies: string[];
  readonly supportedCountries: string[];
  readonly supportedPaymentMethods: PaymentMethod[];
  
  // Customer management
  createCustomer(params: CreateCustomerParams): Promise<ProviderCustomer>;
  updateCustomer(customerId: string, params: UpdateCustomerParams): Promise<ProviderCustomer>;
  deleteCustomer(customerId: string): Promise<void>;
  
  // Payment methods
  attachPaymentMethod(customerId: string, params: AttachPaymentMethodParams): Promise<ProviderPaymentMethod>;
  detachPaymentMethod(paymentMethodId: string): Promise<void>;
  listPaymentMethods(customerId: string): Promise<ProviderPaymentMethod[]>;
  
  // Charges
  createCharge(params: CreateChargeParams): Promise<ProviderCharge>;
  captureCharge(chargeId: string, amount?: number): Promise<ProviderCharge>;
  refundCharge(chargeId: string, params: RefundParams): Promise<ProviderRefund>;
  
  // Subscriptions
  createSubscription(params: CreateSubscriptionParams): Promise<ProviderSubscription>;
  updateSubscription(subscriptionId: string, params: UpdateSubscriptionParams): Promise<ProviderSubscription>;
  cancelSubscription(subscriptionId: string, params?: CancelSubscriptionParams): Promise<ProviderSubscription>;
  
  // Webhooks
  constructWebhookEvent(payload: string | Buffer, signature: string): Promise<WebhookEvent>;
  
  // Utilities
  convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<number>;
  getSupportedPaymentMethods(country: string, currency: string): PaymentMethod[];
}

export interface CreateChargeParams {
  amount: number;           // In smallest currency unit (cents, paise, etc.)
  currency: string;         // ISO 4217
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  
  // Provider-specific
  capture?: boolean;        // Auto-capture or authorize only
  savePaymentMethod?: boolean;
  
  // 3D Secure / SCA
  returnUrl?: string;
  
  // Local payment methods
  paymentMethodType?: PaymentMethod;
  bankCode?: string;        // For bank transfers
  upiId?: string;           // For UPI (India)
  pixKey?: string;          // For Pix (Brazil)
}

export type PaymentMethod =
  // Cards
  | 'card'
  | 'card_present'
  
  // Bank transfers
  | 'bank_transfer'
  | 'sepa_debit'        // Europe
  | 'ach_debit'         // US
  | 'bacs_debit'        // UK
  | 'eft'               // South Africa
  | 'interac'           // Canada
  
  // Real-time payments
  | 'upi'               // India
  | 'pix'               // Brazil
  | 'promptpay'         // Thailand
  | 'paynow'            // Singapore
  | 'fps'               // Hong Kong
  
  // Wallets
  | 'apple_pay'
  | 'google_pay'
  | 'alipay'
  | 'wechat_pay'
  | 'grabpay'           // Southeast Asia
  | 'ovo'               // Indonesia
  | 'dana'              // Indonesia
  | 'gcash'             // Philippines
  
  // Buy now pay later
  | 'klarna'
  | 'afterpay'
  | 'affirm'
  
  // Vouchers
  | 'boleto'            // Brazil
  | 'oxxo'              // Mexico
  | 'konbini'           // Japan
  
  // Other
  | 'ideal'             // Netherlands
  | 'sofort'            // Europe
  | 'giropay'           // Germany
  | 'bancontact'        // Belgium
  | 'eps'               // Austria
  | 'multibanco';       // Portugal
```

#### 3.2 Payment Provider Factory

**File: `services/payments-svc/src/providers/payment-provider.factory.ts`**

```typescript
export class PaymentProviderFactory {
  private providers: Map<PaymentProviderType, IPaymentProvider> = new Map();
  
  constructor(
    private readonly configService: ConfigService,
    private readonly stripeProvider: StripeProvider,
    private readonly paystackProvider: PaystackProvider,
    private readonly razorpayProvider: RazorpayProvider,
    // ... other providers
  ) {
    this.registerProviders();
  }
  
  // Get best provider for a country/currency combination
  getProviderForRegion(country: string, currency: string): IPaymentProvider {
    const providers = this.getAvailableProviders(country, currency);
    
    // Priority order based on:
    // 1. Local provider (lowest fees, best payment methods)
    // 2. Regional provider
    // 3. Global fallback (Stripe/Adyen)
    
    return providers[0];
  }
  
  // Get all available providers for a region
  getAvailableProviders(country: string, currency: string): IPaymentProvider[] {
    return Array.from(this.providers.values())
      .filter(p => 
        p.supportedCountries.includes(country) && 
        p.supportedCurrencies.includes(currency)
      )
      .sort((a, b) => this.getProviderPriority(a, country) - this.getProviderPriority(b, country));
  }
  
  // Get available payment methods for a region
  getPaymentMethodsForRegion(country: string, currency: string): PaymentMethod[] {
    const provider = this.getProviderForRegion(country, currency);
    return provider.getSupportedPaymentMethods(country, currency);
  }
}
```

#### 3.3 Provider Region Mapping

**File: `services/payments-svc/src/config/provider-regions.ts`**

```typescript
export const PROVIDER_REGION_MAP: Record<string, PaymentProviderConfig[]> = {
  // South Africa
  ZA: [
    { provider: PaymentProviderType.PAYSTACK, priority: 1 },
    { provider: PaymentProviderType.PAYFAST, priority: 2 },
    { provider: PaymentProviderType.STRIPE, priority: 3 },
  ],
  
  // Nigeria
  NG: [
    { provider: PaymentProviderType.PAYSTACK, priority: 1 },
    { provider: PaymentProviderType.FLUTTERWAVE, priority: 2 },
  ],
  
  // India
  IN: [
    { provider: PaymentProviderType.RAZORPAY, priority: 1 },
    { provider: PaymentProviderType.PAYU_INDIA, priority: 2 },
    { provider: PaymentProviderType.CASHFREE, priority: 3 },
    { provider: PaymentProviderType.STRIPE, priority: 4 },
  ],
  
  // Brazil
  BR: [
    { provider: PaymentProviderType.PAGSEGURO, priority: 1 },
    { provider: PaymentProviderType.MERCADOPAGO, priority: 2 },
    { provider: PaymentProviderType.STRIPE, priority: 3 },
  ],
  
  // UAE
  AE: [
    { provider: PaymentProviderType.TAP, priority: 1 },
    { provider: PaymentProviderType.PAYTABS, priority: 2 },
    { provider: PaymentProviderType.STRIPE, priority: 3 },
  ],
  
  // Indonesia
  ID: [
    { provider: PaymentProviderType.MIDTRANS, priority: 1 },
    { provider: PaymentProviderType.STRIPE, priority: 2 },
  ],
  
  // China
  CN: [
    { provider: PaymentProviderType.ALIPAY, priority: 1 },
    { provider: PaymentProviderType.WECHAT_PAY, priority: 2 },
  ],
  
  // Default (Stripe-supported countries)
  DEFAULT: [
    { provider: PaymentProviderType.STRIPE, priority: 1 },
    { provider: PaymentProviderType.ADYEN, priority: 2 },
  ],
};
```

### Tasks

- [ ] **3.1.1** Define IPaymentProvider interface
- [ ] **3.1.2** Define all payment method types
- [ ] **3.1.3** Define webhook event types
- [ ] **3.2.1** Create PaymentProviderFactory
- [ ] **3.2.2** Refactor existing Stripe implementation to interface
- [ ] **3.2.3** Create provider region mapping configuration
- [ ] **3.3.1** Update billing-svc to use provider factory
- [ ] **3.3.2** Add provider selection to checkout flow
- [ ] **3.3.3** Create provider selection API endpoint
- [ ] **3.3.4** Add multi-provider support to webhooks
- [ ] **3.3.5** Unit tests for provider factory
- [ ] **3.3.6** Integration tests with mock providers

### Acceptance Criteria
- [ ] Payment provider interface fully defined
- [ ] Existing Stripe integration works through interface
- [ ] Provider factory selects correct provider for region
- [ ] Webhook handling supports multiple providers
- [ ] Checkout can show region-appropriate payment methods

---

## 🏃 Sprint 4: Regional Payment Integrations (Part 1)

### Objective
Implement Paystack (Africa) and Razorpay (India) integrations.

### Deliverables

#### 4.1 Paystack Provider Implementation

**File: `services/payments-svc/src/providers/paystack/paystack.provider.ts`**

```typescript
// Paystack supports: Nigeria, South Africa, Ghana, Kenya
// Payment methods: Cards, Bank Transfer, USSD, Mobile Money, EFT

export class PaystackProvider implements IPaymentProvider {
  readonly name = PaymentProviderType.PAYSTACK;
  readonly supportedCurrencies = ['NGN', 'ZAR', 'GHS', 'KES', 'USD'];
  readonly supportedCountries = ['NG', 'ZA', 'GH', 'KE'];
  readonly supportedPaymentMethods: PaymentMethod[] = [
    'card',
    'bank_transfer',
    'eft',           // South Africa EFT
    // 'ussd',       // Coming: USSD banking
    // 'mobile_money' // Coming: Mobile money
  ];
  
  // Full implementation of IPaymentProvider...
}
```

**Features to implement:**
- Customer creation/management
- Card payments
- Bank transfers (Dedicated Virtual Accounts)
- EFT for South Africa
- Webhook handling
- Subscription management

#### 4.2 Razorpay Provider Implementation

**File: `services/payments-svc/src/providers/razorpay/razorpay.provider.ts`**

```typescript
// Razorpay supports: India
// Payment methods: Cards, UPI, Netbanking, Wallets, EMI

export class RazorpayProvider implements IPaymentProvider {
  readonly name = PaymentProviderType.RAZORPAY;
  readonly supportedCurrencies = ['INR', 'USD'];
  readonly supportedCountries = ['IN'];
  readonly supportedPaymentMethods: PaymentMethod[] = [
    'card',
    'upi',
    'bank_transfer', // Netbanking
    // Wallets: PayTM, PhonePe, etc.
  ];
  
  // Full implementation of IPaymentProvider...
}
```

**Features to implement:**
- Customer creation
- Card payments with 3D Secure
- UPI payments (QR code + VPA)
- Netbanking
- Subscription management (Razorpay subscriptions)
- Webhook handling

### Tasks

- [ ] **4.1.1** Create Paystack provider skeleton
- [ ] **4.1.2** Implement customer management
- [ ] **4.1.3** Implement card payment flow
- [ ] **4.1.4** Implement bank transfer (DVA)
- [ ] **4.1.5** Implement South Africa EFT
- [ ] **4.1.6** Implement webhook handler
- [ ] **4.1.7** Implement subscription management
- [ ] **4.1.8** Add Paystack to provider factory
- [ ] **4.2.1** Create Razorpay provider skeleton
- [ ] **4.2.2** Implement customer management
- [ ] **4.2.3** Implement card payment with 3DS
- [ ] **4.2.4** Implement UPI payment flow
- [ ] **4.2.5** Implement netbanking
- [ ] **4.2.6** Implement webhook handler
- [ ] **4.2.7** Implement subscription management
- [ ] **4.2.8** Add Razorpay to provider factory
- [ ] **4.3.1** Create checkout UI for Paystack
- [ ] **4.3.2** Create checkout UI for Razorpay/UPI
- [ ] **4.3.3** End-to-end testing with sandbox accounts

### Acceptance Criteria
- [ ] Paystack: Complete card payment flow in sandbox
- [ ] Paystack: Bank transfer creates virtual account
- [ ] Paystack: Webhooks update payment status
- [ ] Razorpay: Complete card payment with 3DS
- [ ] Razorpay: UPI payment generates QR/VPA
- [ ] Razorpay: Webhooks update payment status
- [ ] Both providers: Subscription creation works

---

## 🏃 Sprint 5: Regional Payment Integrations (Part 2)

### Objective
Implement additional regional payment providers.

### Deliverables

#### 5.1 Adyen Provider (Global Backup)

```typescript
// Adyen supports 250+ payment methods globally
// Use as fallback and for European local methods

export class AdyenProvider implements IPaymentProvider {
  // Implement iDEAL (NL), Bancontact (BE), SOFORT (DE/AT/CH), etc.
}
```

#### 5.2 PagSeguro/Pix Provider (Brazil)

```typescript
// PagSeguro with Pix instant payments
export class PagSeguroProvider implements IPaymentProvider {
  // Pix QR code generation
  // Boleto generation
  // Credit card
}
```

#### 5.3 Tap/PayTabs Provider (Middle East)

```typescript
// Tap Payments for UAE, Saudi, Kuwait, etc.
export class TapProvider implements IPaymentProvider {
  // MADA cards (Saudi)
  // Apple Pay / Google Pay
  // Standard cards
}
```

#### 5.4 Midtrans Provider (Indonesia)

```typescript
// Midtrans for Indonesia
export class MidtransProvider implements IPaymentProvider {
  // GoPay, OVO, DANA wallets
  // Bank transfer
  // Credit/debit cards
  // Convenience store payments
}
```

### Tasks

- [ ] **5.1.1** Implement Adyen provider
- [ ] **5.1.2** Configure European local payment methods
- [ ] **5.2.1** Implement PagSeguro provider
- [ ] **5.2.2** Implement Pix payment flow
- [ ] **5.2.3** Implement Boleto generation
- [ ] **5.3.1** Implement Tap provider
- [ ] **5.3.2** Configure MADA card support
- [ ] **5.4.1** Implement Midtrans provider
- [ ] **5.4.2** Implement e-wallet support (GoPay, OVO, DANA)
- [ ] **5.5.1** Update checkout UI for all new providers
- [ ] **5.5.2** Create unified payment method selector
- [ ] **5.5.3** Integration tests for all providers

### Acceptance Criteria
- [ ] Adyen processes European local methods
- [ ] PagSeguro/Pix works for Brazil
- [ ] Tap processes UAE/Saudi payments
- [ ] Midtrans processes Indonesian e-wallet payments
- [ ] Unified checkout adapts to user's region

---

## 🏃 Sprint 6: Translation Infrastructure

### Objective
Build complete translation management system.

### Deliverables

#### 6.1 Translation Service Enhancements

**Update: `services/translation-svc/prisma/schema.prisma`**

```prisma
// Translation key with version control
model TranslationKey {
  id                String   @id @default(uuid()) @db.Uuid
  tenantId          String?  @map("tenant_id") @db.Uuid // null = platform-wide
  
  key               String                // e.g., "common.buttons.submit"
  namespace         String   @default("common")
  context           String?  @db.Text     // Context for translators
  
  // Source text (English)
  sourceText        String   @map("source_text") @db.Text
  sourceLocale      String   @default("en") @map("source_locale")
  
  // Metadata
  maxLength         Int?     @map("max_length") // Character limit
  placeholders      String[] // {name}, {count}, etc.
  pluralizable      Boolean  @default(false)
  
  // Status
  isActive          Boolean  @default(true) @map("is_active")
  
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  translations      Translation[]
  
  @@unique([tenantId, namespace, key])
  @@index([namespace])
  @@map("translation_keys")
}

model Translation {
  id                String   @id @default(uuid()) @db.Uuid
  keyId             String   @map("key_id") @db.Uuid
  locale            String   @db.VarChar(10) // en-US, ar-SA, etc.
  
  // Translated content
  text              String   @db.Text
  pluralForms       Json?    @map("plural_forms") // { one: "...", other: "..." }
  
  // Quality
  status            TranslationStatus @default(DRAFT)
  qualityScore      Float?   @map("quality_score") // 0-1, from MT quality estimation
  
  // Source
  translationType   TranslationType @default(MACHINE) @map("translation_type")
  translatedBy      String?  @map("translated_by") // User ID or "GOOGLE_MT", "DEEPL", etc.
  reviewedBy        String?  @map("reviewed_by") @db.Uuid
  reviewedAt        DateTime? @map("reviewed_at")
  
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  key               TranslationKey @relation(fields: [keyId], references: [id], onDelete: Cascade)
  
  @@unique([keyId, locale])
  @@index([locale, status])
  @@map("translations")
}

enum TranslationStatus {
  DRAFT
  MACHINE_TRANSLATED
  HUMAN_REVIEWED
  APPROVED
  PUBLISHED
  
  @@map("translation_status")
}

enum TranslationType {
  MACHINE         // Google Translate, DeepL, etc.
  HUMAN           // Professional translator
  COMMUNITY       // Community contribution
  IMPORTED        // Imported from file
  
  @@map("translation_type")
}
```

#### 6.2 Machine Translation Integration

**File: `services/translation-svc/src/services/machine-translation.service.ts`**

```typescript
export class MachineTranslationService {
  // Primary: Google Cloud Translation
  // Fallback: DeepL API
  // Fallback: Azure Translator
  
  async translate(params: {
    text: string;
    sourceLocale: string;
    targetLocale: string;
    context?: string;
  }): Promise<TranslationResult>;
  
  async translateBatch(params: {
    texts: string[];
    sourceLocale: string;
    targetLocale: string;
  }): Promise<TranslationResult[]>;
  
  // Quality estimation
  async estimateQuality(params: {
    source: string;
    translation: string;
    sourceLocale: string;
    targetLocale: string;
  }): Promise<number>; // 0-1 score
}
```

#### 6.3 Translation Export/Import

**File: `services/translation-svc/src/services/translation-io.service.ts`**

```typescript
export class TranslationIOService {
  // Export
  async exportToJson(namespace: string, locale: string): Promise<Record<string, unknown>>;
  async exportToXliff(namespace: string, locale: string): Promise<string>;
  async exportToCsv(namespace: string, locales: string[]): Promise<string>;
  
  // Import
  async importFromJson(data: Record<string, unknown>, locale: string): Promise<ImportResult>;
  async importFromXliff(xliff: string): Promise<ImportResult>;
  async importFromCsv(csv: string): Promise<ImportResult>;
}
```

#### 6.4 Create All Locale Translation Files

For each of 30 locales, create complete translation files:

```
packages/i18n/locales/
├── en/
│   ├── common.json
│   ├── auth.json
│   ├── learner.json
│   ├── parent.json
│   ├── teacher.json
│   ├── billing.json
│   └── errors.json
├── es/
├── es-MX/
├── fr/
├── fr-CA/
├── de/
├── pt-BR/
├── zh-CN/
├── zh-TW/
├── ja/
├── ko/
├── ar/
├── ar-SA/
├── hi/
├── ...
```

### Tasks

- [ ] **6.1.1** Update translation-svc schema
- [ ] **6.1.2** Create migrations
- [ ] **6.1.3** Build translation key management API
- [ ] **6.2.1** Integrate Google Cloud Translation
- [ ] **6.2.2** Integrate DeepL as fallback
- [ ] **6.2.3** Implement quality estimation
- [ ] **6.3.1** Implement JSON export/import
- [ ] **6.3.2** Implement XLIFF support
- [ ] **6.4.1** Extract all translatable strings from codebase
- [ ] **6.4.2** Create master en/ translation files
- [ ] **6.4.3** Machine translate to all 30 locales
- [ ] **6.4.4** Quality review for top 10 locales
- [ ] **6.5.1** Build translation admin UI
- [ ] **6.5.2** Build translation review workflow

### Acceptance Criteria
- [ ] All UI strings extractable to translation keys
- [ ] Machine translation available for all locales
- [ ] Translation files generated for 30 locales
- [ ] Import/export in JSON, XLIFF, CSV formats
- [ ] Translation admin UI functional

---

## 🏃 Sprint 7: Frontend Localization

### Objective
Implement full i18n support in all web applications.

### Deliverables

#### 7.1 i18n React Integration

**Update: `packages/i18n/src/react/index.ts`**

```typescript
// Provider
export const I18nProvider: React.FC<{
  locale: SupportedLocale;
  children: React.ReactNode;
}>;

// Hooks
export function useTranslation(namespace?: string): {
  t: (key: string, params?: Record<string, unknown>) => string;
  locale: SupportedLocale;
  changeLocale: (locale: SupportedLocale) => void;
};

export function useLocale(): {
  locale: SupportedLocale;
  direction: 'ltr' | 'rtl';
  currency: string;
  formatDate: (date: Date, format?: 'short' | 'medium' | 'long') => string;
  formatTime: (date: Date, format?: 'short' | 'medium') => string;
  formatNumber: (num: number, options?: NumberFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
};

// Components
export const Trans: React.FC<{
  i18nKey: string;
  components?: Record<string, React.ReactElement>;
  values?: Record<string, unknown>;
}>;

export const LocaleSwitcher: React.FC<{
  variant?: 'dropdown' | 'flags' | 'list';
  showFlags?: boolean;
  showNativeNames?: boolean;
}>;
```

#### 7.2 RTL Support

**Update: `packages/i18n/src/styles/rtl.ts`**

```typescript
// Automatic RTL class application
export function getDirectionClass(locale: SupportedLocale): string;

// RTL-aware spacing utilities
export const rtlSpacing = {
  marginStart: (locale: SupportedLocale, value: string) => 
    isRTL(locale) ? { marginRight: value } : { marginLeft: value },
  marginEnd: (locale: SupportedLocale, value: string) =>
    isRTL(locale) ? { marginLeft: value } : { marginRight: value },
  // ... paddingStart, paddingEnd, etc.
};

// CSS logical properties mixin
export const logicalProperties = css`
  /* Use logical properties for automatic RTL */
  margin-inline-start: var(--spacing-4);
  margin-inline-end: var(--spacing-2);
  padding-inline: var(--spacing-4);
  border-inline-start: 2px solid var(--border-color);
`;
```

#### 7.3 Update All Web Apps

For each web app (web-learner, web-parent, web-teacher, web-marketing, etc.):

1. Wrap app in I18nProvider
2. Replace all hardcoded strings with t() calls
3. Add LocaleSwitcher to header/footer
4. Ensure RTL styles work correctly
5. Test with Arabic/Hebrew locales

### Tasks

- [ ] **7.1.1** Complete React i18n integration
- [ ] **7.1.2** Build LocaleSwitcher component
- [ ] **7.1.3** Build date/time/number formatters
- [ ] **7.1.4** Build currency formatter
- [ ] **7.2.1** Implement RTL CSS utilities
- [ ] **7.2.2** Update Tailwind config for logical properties
- [ ] **7.2.3** Test RTL layout with Arabic
- [ ] **7.3.1** Localize web-learner
- [ ] **7.3.2** Localize web-parent
- [ ] **7.3.3** Localize web-teacher
- [ ] **7.3.4** Localize web-marketing
- [ ] **7.3.5** Localize web-district
- [ ] **7.3.6** Localize web-platform-admin
- [ ] **7.4.1** Add locale to URL routing (optional)
- [ ] **7.4.2** SSR locale detection (Next.js)
- [ ] **7.4.3** Visual regression testing for RTL

### Acceptance Criteria
- [ ] All web apps use i18n for all strings
- [ ] Language switcher in header of all apps
- [ ] RTL layouts work correctly for Arabic/Hebrew
- [ ] Dates/numbers/currencies formatted per locale
- [ ] SSR renders correct locale

---

## 🏃 Sprint 8: Mobile Localization & Testing

### Objective
Implement full i18n in Flutter mobile apps.

### Deliverables

#### 8.1 Flutter i18n Setup

**Update: `libs/flutter-common/lib/i18n/`**

```dart
// Locale provider
class LocaleProvider extends ChangeNotifier {
  Locale _locale = const Locale('en');
  
  Locale get locale => _locale;
  
  void setLocale(Locale locale) {
    _locale = locale;
    notifyListeners();
  }
}

// Translation delegate
class AivoLocalizations {
  final Locale locale;
  
  static const LocalizationsDelegate<AivoLocalizations> delegate = 
    _AivoLocalizationsDelegate();
    
  String translate(String key, [Map<String, dynamic>? params]);
  
  // Formatters
  String formatDate(DateTime date, {DateFormat? format});
  String formatTime(DateTime time, {TimeFormat? format});
  String formatNumber(num number, {int? decimals});
  String formatCurrency(num amount, {String? currency});
}
```

#### 8.2 Update Mobile Apps

For each Flutter app (mobile-learner, mobile-parent, mobile-teacher):

1. Add localization delegates
2. Replace all hardcoded strings
3. Add language picker to settings
4. Test RTL with Arabic locale
5. Test locale persistence

### Tasks

- [ ] **8.1.1** Create Flutter i18n package
- [ ] **8.1.2** Set up ARB files for all locales
- [ ] **8.1.3** Implement locale persistence
- [ ] **8.1.4** Create language picker widget
- [ ] **8.2.1** Localize mobile-learner
- [ ] **8.2.2** Localize mobile-parent
- [ ] **8.2.3** Localize mobile-teacher
- [ ] **8.3.1** RTL testing for all screens
- [ ] **8.3.2** Integration tests with different locales
- [ ] **8.3.3** Screenshot tests for all locales

### Acceptance Criteria
- [ ] All mobile apps fully localized
- [ ] Language persists across app restarts
- [ ] RTL works correctly in Flutter
- [ ] All 30 locales available in mobile apps

---

## 🏃 Sprint 9: Compliance & Data Residency

### Objective
Ensure legal compliance for international operation.

### Deliverables

#### 9.1 GDPR Compliance (EU)

- Data export API (right to portability)
- Data deletion API (right to be forgotten)
- Consent management system
- Privacy dashboard for users
- DPO contact information

#### 9.2 Regional Compliance

| Region | Regulation | Requirements |
|--------|------------|--------------|
| EU | GDPR | Consent, data portability, deletion, DPO |
| UK | UK GDPR | Same as EU GDPR |
| India | DPDP Act | Data localization, consent, deletion |
| South Africa | POPIA | Consent, data subject rights |
| Brazil | LGPD | Similar to GDPR |
| UAE | PDPL | Data localization, consent |
| China | PIPL | Data localization, consent, export restrictions |

#### 9.3 Data Residency Options

- EU data center (Frankfurt/Dublin)
- India data center (Mumbai)
- Middle East data center (UAE/Bahrain)
- Asia Pacific data center (Singapore)
- Database-per-region for sensitive data

### Tasks

- [ ] **9.1.1** Implement data export API
- [ ] **9.1.2** Implement data deletion with cascading
- [ ] **9.1.3** Build consent management
- [ ] **9.1.4** Create privacy dashboard
- [ ] **9.2.1** Document compliance per region
- [ ] **9.2.2** Implement region-specific consent flows
- [ ] **9.2.3** Configure data retention policies
- [ ] **9.3.1** Design multi-region database architecture
- [ ] **9.3.2** Implement region selection in tenant onboarding
- [ ] **9.3.3** Configure cross-region data sync (non-PII only)

### Acceptance Criteria
- [ ] GDPR compliance verified
- [ ] Data export works for all user data
- [ ] Data deletion properly cascades
- [ ] Consent audit trail maintained
- [ ] Data residency option available at signup

---

## 🏃 Sprint 10: QA, Performance & Launch

### Objective
Comprehensive testing and production readiness.

### Deliverables

#### 10.1 Internationalization QA

- [ ] All 30 locales tested end-to-end
- [ ] All payment providers tested in sandbox
- [ ] All curriculum frameworks validated
- [ ] RTL layouts pixel-perfect
- [ ] Translation completeness audit

#### 10.2 Performance Testing

- [ ] Locale switching < 100ms
- [ ] Translation loading optimized (lazy load)
- [ ] Payment checkout < 3s globally
- [ ] CDN edge caching for translations

#### 10.3 Launch Checklist

- [ ] Legal review for all regions
- [ ] Payment provider production credentials
- [ ] Translation quality sign-off
- [ ] Curriculum accuracy sign-off
- [ ] Marketing localization
- [ ] Support documentation translated

### Tasks

- [ ] **10.1.1** Create QA test suite for all locales
- [ ] **10.1.2** Payment testing in all regions
- [ ] **10.1.3** Curriculum validation with educators
- [ ] **10.1.4** Translation review with native speakers
- [ ] **10.2.1** Performance benchmarking
- [ ] **10.2.2** CDN configuration for translations
- [ ] **10.2.3** Load testing with global traffic
- [ ] **10.3.1** Legal sign-off per region
- [ ] **10.3.2** Production credentials setup
- [ ] **10.3.3** Staged regional rollout plan

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Locale detection accuracy | > 95% |
| Translation coverage | 100% (all strings) |
| Translation quality (BLEU) | > 0.8 for top 10 locales |
| Payment success rate | > 98% per region |
| Page load with locale | < 2s (P95) |
| RTL visual bugs | 0 |
| Curriculum coverage | 10+ countries |
| Compliance audit pass | 100% |

---

## 🛠️ Technical Dependencies

### External Services

| Service | Purpose | Cost Estimate |
|---------|---------|---------------|
| MaxMind GeoIP2 | IP geolocation | $100/month |
| Google Cloud Translation | Machine translation | $20 per 1M chars |
| DeepL API | Translation fallback | $25/month + usage |
| Paystack | Africa payments | 1.5% + $0.10/txn |
| Razorpay | India payments | 2% per txn |
| Adyen | Global backup | 0.10€ + scheme fees |

### Infrastructure

| Component | Requirement |
|-----------|-------------|
| Redis | Geolocation cache |
| PostgreSQL | Multi-region option |
| CDN | Translation file caching |
| Object Storage | Translation file storage |

---

## 👥 Team Allocation

| Sprint | Backend | Frontend | Mobile | QA |
|--------|---------|----------|--------|-----|
| 1 | 2 | 1 | 0 | 1 |
| 2 | 2 | 0 | 0 | 1 |
| 3-5 | 3 | 1 | 0 | 1 |
| 6 | 2 | 0 | 0 | 1 |
| 7 | 1 | 3 | 0 | 1 |
| 8 | 0 | 1 | 2 | 1 |
| 9 | 2 | 1 | 0 | 1 |
| 10 | 1 | 1 | 1 | 2 |

---

## 🚦 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Translation quality | Use professional review for top 10 locales |
| Payment provider delays | Have Stripe as global fallback |
| Curriculum data accuracy | Partner with local educators |
| Compliance complexity | Engage legal counsel early |
| RTL complexity | Use CSS logical properties throughout |

---

## 📅 Milestone Schedule

| Milestone | Sprint | Date |
|-----------|--------|------|
| Geolocation + Preferences | 1 | Week 2 |
| Curriculum Framework | 2 | Week 4 |
| Payment Abstraction | 3 | Week 6 |
| Africa + India Payments | 4 | Week 8 |
| All Payment Providers | 5 | Week 10 |
| Translation System | 6 | Week 12 |
| Web Localization | 7 | Week 14 |
| Mobile Localization | 8 | Week 16 |
| Compliance Ready | 9 | Week 18 |
| Production Launch | 10 | Week 20 |
