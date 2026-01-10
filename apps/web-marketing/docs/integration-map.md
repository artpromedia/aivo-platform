# Marketing Website Integration Map

This document maps the integration points between the marketing website (`apps/web-marketing`) and the existing AIVO platform services.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Marketing Website                                  │
│                        (apps/web-marketing:3001)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Main Web Application                                  │
│                        (apps/web-app:3000)                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  API Routes                                                           │  │
│  │  • /api/auth/me      - Get current user session                      │  │
│  │  • /api/auth/login   - Authenticate user                             │  │
│  │  • /api/auth/logout  - Clear session                                 │  │
│  │  • /api/auth/register - Create new account                           │  │
│  │  • /api/checkout     - Create Stripe checkout session                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────────────┐
│        auth-svc (:4001)         │ │         billing-svc (:4060)             │
│  • /auth/register               │ │  • /billing/checkout-session            │
│  • /auth/login                  │ │  • /billing/subscription                │
│  • /auth/refresh                │ │  • /billing/update-modules              │
│  • /auth/logout                 │ │  • /billing/cancel                      │
└─────────────────────────────────┘ └─────────────────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌─────────────────────────────────────────┐
                                    │       payments-svc (:4070)              │
                                    │  • Stripe API wrapper                   │
                                    │  • Webhook handling                     │
                                    │  • Customer/subscription management     │
                                    └─────────────────────────────────────────┘
```

---

## Authentication Service (auth-svc)

**Location:** `services/auth-svc/`  
**Port:** 4001  
**Database:** PostgreSQL (`aivo_auth`)

### Endpoints

| Endpoint         | Method | Description                | Request Body                  | Response                              |
| ---------------- | ------ | -------------------------- | ----------------------------- | ------------------------------------- |
| `/auth/register` | POST   | Register new user          | `{ email, password, phone? }` | `{ user, accessToken, refreshToken }` |
| `/auth/login`    | POST   | Authenticate user          | `{ email, password }`         | `{ user, accessToken, refreshToken }` |
| `/auth/refresh`  | POST   | Refresh access token       | `{ refreshToken }`            | `{ accessToken, refreshToken }`       |
| `/auth/logout`   | POST   | Logout (no-op server side) | -                             | 204 No Content                        |

### User Response Structure

```typescript
interface UserResponse {
  id: string;
  email: string;
  tenantId: string;
  roles: Role[]; // from @aivo/ts-rbac
}
```

### JWT Payload Structure

```typescript
interface JwtPayload {
  sub: string; // User ID
  tenant_id: string; // Tenant ID
  roles: Role[]; // User roles
}
```

### Authentication Cookies

| Cookie Name          | Purpose           | Options                                |
| -------------------- | ----------------- | -------------------------------------- |
| `aivo_access_token`  | JWT access token  | httpOnly, secure (prod), sameSite: lax |
| `aivo_refresh_token` | JWT refresh token | httpOnly, secure (prod), sameSite: lax |

### Roles (from @aivo/ts-rbac)

```typescript
enum Role {
  PARENT = 'PARENT',
  TEACHER = 'TEACHER',
  LEARNER = 'LEARNER',
  DISTRICT_ADMIN = 'DISTRICT_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  // ... others
}
```

---

## Billing Service (billing-svc)

**Location:** `services/billing-svc/`  
**Port:** 4060  
**Database:** PostgreSQL (`aivo_billing`)

### Endpoints

| Endpoint                    | Method | Description              | Headers Required                         |
| --------------------------- | ------ | ------------------------ | ---------------------------------------- |
| `/billing/checkout-session` | POST   | Create Stripe checkout   | x-tenant-id, x-user-id, x-correlation-id |
| `/billing/subscription`     | GET    | Get current subscription | x-tenant-id, x-user-id                   |
| `/billing/update-modules`   | POST   | Add/remove modules       | x-tenant-id, x-user-id                   |
| `/billing/cancel`           | POST   | Cancel subscription      | x-tenant-id, x-user-id                   |
| `/billing/invoices`         | GET    | List invoices            | x-tenant-id, x-user-id                   |

### Checkout Session Request

```typescript
interface CheckoutSessionRequest {
  learnerIds: string[]; // UUIDs of learners
  selectedSkus: ParentSku[]; // 'BASE', 'ADDON_SEL', etc.
  billingPeriod: 'monthly' | 'yearly';
  couponCode?: string;
  successUrl: string;
  cancelUrl: string;
}
```

### Checkout Session Response

```typescript
interface CheckoutSessionResponse {
  checkoutUrl: string; // Stripe checkout URL
  sessionId: string; // Stripe session ID
}
```

---

## Payments Service (payments-svc)

**Location:** `services/payments-svc/`  
**Port:** 4070  
**Database:** Shared with billing-svc

### Stripe Integration

| Feature         | Stripe Resource           | Description                 |
| --------------- | ------------------------- | --------------------------- |
| Customers       | `Stripe.Customer`         | Created per billing account |
| Subscriptions   | `Stripe.Subscription`     | Managed via billing-svc     |
| Payment Methods | `Stripe.PaymentMethod`    | Card storage                |
| Checkout        | `Stripe.Checkout.Session` | Payment flow                |
| Webhooks        | Various events            | Subscription lifecycle      |

### Webhook Events Handled

- `checkout.session.completed` - Activate subscription
- `invoice.paid` - Mark invoice as paid
- `invoice.payment_failed` - Handle failed payment
- `customer.subscription.updated` - Sync status
- `customer.subscription.deleted` - Mark as canceled

---

## Shared Types (billing-common)

**Location:** `libs/billing-common/src/`

### Subscription Status

```typescript
type SubscriptionStatus =
  | 'INCOMPLETE' // Payment pending/setup
  | 'ACTIVE' // Paid and in good standing
  | 'TRIALING' // In trial period
  | 'PAST_DUE' // Payment failed, grace period
  | 'CANCELED' // User canceled
  | 'UNPAID'; // Unpaid after grace period
```

### Billing Period

```typescript
type BillingPeriod = 'monthly' | 'yearly';
```

### Parent SKUs

```typescript
type ParentSku =
  | 'BASE' // Core ELA + Math ($29.99/mo)
  | 'ADDON_SEL' // Social-Emotional Learning
  | 'ADDON_SPEECH' // Speech & Language
  | 'ADDON_SCIENCE'; // Science curriculum
```

### SKU Configuration

```typescript
interface SkuConfig {
  sku: ParentSku;
  stripeProductId: string;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  displayName: string;
  description: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  isBase: boolean;
  trialEligible: boolean;
  trialDays: number;
  features: string[];
}
```

---

## Environment Variables

### Required for Marketing Site

```bash
# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MARKETING_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:4000

# Authentication
NEXT_PUBLIC_AUTH_URL=http://localhost:3000/api/auth
NEXT_PUBLIC_AUTH_CALLBACK_URL=http://localhost:3001/auth/callback

# Stripe (public key only for frontend)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Analytics
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_VERCEL_ANALYTICS=true

# Feature Flags
NEXT_PUBLIC_ENABLE_DIRECT_CHECKOUT=true
NEXT_PUBLIC_ENABLE_WAITLIST=false
NEXT_PUBLIC_SHOW_PRICING=true
```

### Backend Services (for reference)

```bash
# auth-svc
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aivo_auth
JWT_PRIVATE_KEY=<pem-key>
JWT_PUBLIC_KEY=<pem-key>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
CONSUMER_TENANT_ID=00000000-0000-0000-0000-000000000000

# payments-svc
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
BILLING_SERVICE_URL=http://localhost:4060
DEFAULT_TRIAL_DAYS=30
```

---

## Integration Strategy for Marketing Site

### 1. Session Detection (Already Implemented)

The marketing site checks auth status via the main app's API:

```typescript
// lib/auth/auth-context.tsx
const response = await fetch(`${APP_URL}/api/auth/me`, {
  credentials: 'include', // Send cookies cross-origin
  headers: { 'Content-Type': 'application/json' },
});
```

### 2. Registration Flow

Marketing → Main App:

```typescript
// User clicks "Get Started" on marketing site
window.location.href = buildRegistrationUrl({
  plan: 'pro',
  billingInterval: 'annual',
  source: 'marketing_hero',
  referralCode: 'FRIEND20',
});

// Builds: https://app.aivolearning.com/register?plan=pro&interval=annual&source=marketing_hero&ref=FRIEND20
```

### 3. Checkout Flow

For authenticated users:

```typescript
// User selects plan on pricing page
goToCheckout('pro', 'annual');

// Redirects to: https://app.aivolearning.com/checkout?plan=pro&interval=annual&source=marketing
```

The main app handles:

1. Creating checkout session via billing-svc
2. Redirecting to Stripe Checkout
3. Processing webhook on completion
4. Redirecting back to dashboard

### 4. Login Flow

```typescript
// User clicks "Sign In"
window.location.href = buildLoginUrl(window.location.pathname);

// Redirects to: https://app.aivolearning.com/login?returnUrl=/pricing
```

### 5. Dashboard Access

```typescript
// Authenticated user clicks "Dashboard"
goToDashboard('/settings');

// Redirects to: https://app.aivolearning.com/dashboard/settings
```

---

## CORS Configuration

The main app (`web-app`) must allow cross-origin requests from marketing:

```typescript
// next.config.js
const headers = [
  {
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Credentials', value: 'true' },
      { key: 'Access-Control-Allow-Origin', value: process.env.MARKETING_URL },
      { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
    ],
  },
];
```

---

## Cookie Sharing

For session cookies to work across subdomains:

```typescript
// Both apps should set cookies with domain
res.cookies.set('aivo_access_token', token, {
  domain: '.aivolearning.com', // Shared across subdomains
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
});
```

**Production Setup:**

- Marketing: `www.aivolearning.com` or `aivolearning.com`
- App: `app.aivolearning.com`
- Cookies: `domain=.aivolearning.com`

---

## Next Steps

1. **Create web-app API routes** for marketing site to call:
   - `/api/auth/me` - Return current user (exists in web-platform-admin, needs in web-app)
   - Ensure CORS headers for marketing origin

2. **Update registration flow** to accept query params:
   - `plan` - Pre-select pricing plan
   - `interval` - Pre-select billing interval
   - `ref` - Referral code
   - `source` - Analytics tracking

3. **Create checkout redirect** in main app:
   - Parse plan/interval from query
   - Create checkout session
   - Redirect to Stripe

4. **Test cross-origin auth**:
   - Verify cookies work across origins
   - Test auth check from marketing site
