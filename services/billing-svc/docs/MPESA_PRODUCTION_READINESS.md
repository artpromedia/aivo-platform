# M-Pesa Gateway Production Readiness Plan

**Status:** 🟡 DISABLED - Requires Production Hardening  
**Date:** January 28, 2026  
**Sprint:** Sprint 4 - Task 3 (Complete M-Pesa gateway or disable)  
**Decision:** Disable with feature flag until production requirements met

---

## Executive Summary

The M-Pesa payment gateway has a **comprehensive 710-line implementation** (~90% complete) integrated into the billing service. However, it requires production hardening before enabling for Kenya and East Africa markets. The gateway is **currently disabled** via the `ENABLE_MPESA` feature flag to prevent production issues.

**Key Implementation Files:**
- `services/billing-svc/src/gateways/mpesa.gateway.ts` (710 lines)
- `services/billing-svc/src/config/gateway.config.ts` (ENABLE_MPESA flag)
- `services/billing-svc/src/gateways/gateway.factory.ts` (KE→FLUTTERWAVE fallback)
- `services/billing-svc/src/routes/gateway-webhooks.routes.ts` (webhook endpoint)

**Current Fallback:** Kenya (KE) routes to Flutterwave instead of M-Pesa

---

## Current Implementation Status

### ✅ Completed Features (90%)

1. **STK Push (Lipa na M-Pesa Online)**
   - Customer-initiated payments via mobile prompt
   - Password generation and timestamp handling
   - Phone number formatting (254XXXXXXXXX)
   - Payment creation with proper payload structure
   - Response handling and status mapping

2. **Payment Verification**
   - Transaction status queries
   - Result code mapping (0=success, 1032=cancelled, 1037=timeout, etc.)
   - Cached status checking

3. **Refund Operations**
   - Transaction reversal support
   - Refund status tracking

4. **Webhook Handling**
   - STK Push callback endpoint (`/webhooks/mpesa`)
   - Signature verification
   - C2B validation support
   - M-Pesa result format handling

5. **Authentication**
   - OAuth token management
   - Auto-refresh with 1-minute expiry buffer
   - Credential encoding (Base64)

6. **Customer Management**
   - Phone-based customer identification
   - Kenya phone format validation

7. **Gateway Integration**
   - Implements `PaymentGateway` interface
   - Factory pattern integration
   - Country routing (KE → MPESA)
   - Currency routing (KES → MPESA)

8. **Configuration**
   - Environment variable structure defined
   - Sandbox/production URL handling
   - Callback URL configuration

### ❌ Missing Production Requirements (10%)

#### 1. **CRITICAL: Transaction Storage (Line 93)**

**Current Implementation:**
```typescript
// services/billing-svc/src/gateways/mpesa.gateway.ts:93
const transactionStore = new Map<string, {
  amount: number;
  phone: string;
  status: PaymentStatus;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  mpesaReceiptNumber?: string;
}>();
```

**Problems:**
- ❌ In-memory storage lost on service restart
- ❌ Not shared across multiple billing-svc instances
- ❌ No persistence for audit trail
- ❌ Cannot recover from crashes
- ❌ Race conditions in distributed deployments

**Required Solution:**
- **Option A (Recommended):** Add transactions table to billing database
  - Persistent across restarts
  - Proper indexing for fast lookups
  - Full audit trail
  - Supports distributed deployments
  
- **Option B:** Use Redis for transaction cache
  - Fast lookups
  - TTL-based expiry
  - Requires separate Redis instance
  - Still needs database backup for audit

**Implementation Estimate:** 2-3 hours

#### 2. **Credentials Configuration**

**Environment Variables Defined:**
```bash
ENABLE_MPESA=true  # Must be set to enable
MPESA_CONSUMER_KEY=<safaricom-consumer-key>
MPESA_CONSUMER_SECRET=<safaricom-consumer-secret>
MPESA_SHORT_CODE=<paybill-or-till-number>
MPESA_PASS_KEY=<lipa-na-mpesa-passkey>
MPESA_CALLBACK_URL=https://api.aivo.education/webhooks/mpesa
MPESA_INITIATOR_NAME=<optional-for-b2c>
MPESA_INITIATOR_PASSWORD=<optional-for-b2c>
MPESA_SECURITY_CREDENTIAL=<optional-for-b2c>
```

**Missing:**
- ❌ Actual Safaricom credential values not configured
- ❌ Sandbox credentials for testing
- ❌ Production credentials not obtained
- ❌ Credential rotation process undefined

**Required Actions:**
1. Apply for Safaricom Daraja API access (https://developer.safaricom.co.ke/)
2. Obtain sandbox credentials for testing
3. Test STK Push flow in sandbox environment
4. Apply for production credentials (requires business verification)
5. Configure credentials in production secrets management
6. Document credential rotation process

**Timeline:** 1-2 weeks (depends on Safaricom approval process)

#### 3. **Integration Testing**

**Current State:**
- ❌ No integration tests exist for M-Pesa gateway
- ❌ STK Push flow not tested
- ❌ Webhook handling not tested
- ❌ Error scenarios not covered

**Required Test Coverage:**
```typescript
// tests/integration/mpesa.test.ts (needs to be created)
describe('MpesaGateway Integration Tests', () => {
  describe('STK Push', () => {
    it('should initiate payment with valid phone number');
    it('should reject invalid phone numbers');
    it('should handle customer cancellation (1032)');
    it('should handle timeout (1037)');
    it('should handle insufficient funds (1001)');
  });

  describe('Webhooks', () => {
    it('should process successful payment callback');
    it('should process failed payment callback');
    it('should verify webhook signature');
    it('should reject invalid signatures');
  });

  describe('Verification', () => {
    it('should verify pending payment status');
    it('should verify completed payment');
    it('should handle query timeout');
  });

  describe('Refunds', () => {
    it('should process refund request');
    it('should handle refund failure');
    it('should track refund status');
  });
});
```

**Implementation Estimate:** 1 day

#### 4. **Monitoring and Alerting**

**Missing:**
- ❌ Success/failure rate metrics
- ❌ Payment latency tracking
- ❌ Webhook processing metrics
- ❌ Alerts for high failure rates
- ❌ Dashboard for M-Pesa transactions

**Required Implementation:**
- Add OpenTelemetry metrics to `mpesa.gateway.ts`
- Track payment initiation, completion, failure rates
- Monitor webhook callback latency
- Alert on >5% failure rate
- Alert on webhook callback delays >30s
- Grafana dashboard for M-Pesa metrics

**Implementation Estimate:** 4-6 hours

---

## Feature Flag Implementation

### Disabling Strategy

The M-Pesa gateway is disabled using a multi-layered approach:

#### 1. Environment Variable Flag
```bash
# Default: DISABLED (ENABLE_MPESA not set or ≠ 'true')
ENABLE_MPESA=true  # Set to enable M-Pesa gateway
```

#### 2. Configuration Check
```typescript
// services/billing-svc/src/config/gateway.config.ts:128
if (env.ENABLE_MPESA === 'true' && 
    env.MPESA_CONSUMER_KEY && 
    env.MPESA_CONSUMER_SECRET && 
    env.MPESA_SHORT_CODE && 
    env.MPESA_PASS_KEY) {
  config.mpesa = { /* ... */ };
  console.log('[Billing] M-Pesa gateway configured (East Africa)');
} else if (env.ENABLE_MPESA === 'true') {
  console.warn('[Billing] M-Pesa ENABLE_MPESA=true but missing required credentials');
}
```

#### 3. Gateway Factory Conditional
```typescript
// services/billing-svc/src/gateways/gateway.factory.ts:281
if (config.mpesa) {
  this.gateways.set(
    PaymentGatewayType.MPESA,
    new MpesaGateway({ /* ... */ })
  );
}
```

#### 4. Country Routing Fallback
```typescript
// services/billing-svc/src/gateways/gateway.factory.ts:113
KE: PaymentGatewayType.FLUTTERWAVE, // Kenya uses Flutterwave when M-Pesa disabled
```

**Behavior When Disabled:**
- M-Pesa gateway not initialized in factory
- Kenya (KE) payments route to Flutterwave
- KES currency payments use Flutterwave
- `/webhooks/mpesa` endpoint returns error if called
- No M-Pesa credentials loaded
- No security risk from incomplete implementation

---

## Enablement Checklist

When ready to enable M-Pesa in production, complete these steps:

### Phase 1: Development (1-2 days)

- [ ] **Replace In-Memory Transaction Store**
  - [ ] Design transactions table schema or Redis structure
  - [ ] Implement persistent storage service
  - [ ] Update `mpesa.gateway.ts` to use new storage
  - [ ] Add transaction cleanup/archival process
  - [ ] Test with local storage

- [ ] **Add Integration Tests**
  - [ ] Create `tests/integration/mpesa.test.ts`
  - [ ] Test STK Push success flow
  - [ ] Test error scenarios (timeout, cancellation, insufficient funds)
  - [ ] Test webhook callback processing
  - [ ] Test refund operations
  - [ ] Achieve >80% code coverage

- [ ] **Add Monitoring**
  - [ ] Add OpenTelemetry metrics to gateway methods
  - [ ] Track payment initiation, success, failure counts
  - [ ] Track webhook processing latency
  - [ ] Create Grafana dashboard
  - [ ] Configure alerts for high failure rates

### Phase 2: Sandbox Testing (3-5 days)

- [ ] **Obtain Safaricom Sandbox Credentials**
  - [ ] Register at https://developer.safaricom.co.ke/
  - [ ] Create test application
  - [ ] Note consumer key and secret
  - [ ] Configure test short code and passkey
  - [ ] Set up test callback URL (ngrok or public endpoint)

- [ ] **Configure Sandbox Environment**
  - [ ] Set `ENABLE_MPESA=true` in development `.env`
  - [ ] Add sandbox credentials to environment
  - [ ] Deploy billing-svc to development
  - [ ] Verify gateway initialization logs

- [ ] **End-to-End Testing**
  - [ ] Test STK Push from development environment
  - [ ] Use Safaricom sandbox test credentials
  - [ ] Verify mobile prompt received (sandbox simulated)
  - [ ] Test successful payment flow
  - [ ] Test payment cancellation
  - [ ] Test payment timeout
  - [ ] Test webhook callbacks
  - [ ] Test refund operations
  - [ ] Verify transaction storage persistence

### Phase 3: Production Preparation (1-2 weeks)

- [ ] **Obtain Production Credentials**
  - [ ] Apply for Safaricom production API access
  - [ ] Complete business verification process
  - [ ] Provide business registration documents
  - [ ] Wait for Safaricom approval (typically 5-10 business days)
  - [ ] Receive production consumer key, secret, short code, passkey
  - [ ] Note production callback URL requirements

- [ ] **Security Review**
  - [ ] Review credential storage (use secrets manager)
  - [ ] Verify webhook signature validation
  - [ ] Check callback URL HTTPS enforcement
  - [ ] Review transaction data encryption
  - [ ] Audit logs for PII compliance
  - [ ] Test rate limiting

- [ ] **Documentation**
  - [ ] Update API documentation with M-Pesa payment flow
  - [ ] Document webhook callback format
  - [ ] Create troubleshooting guide
  - [ ] Document error codes and handling
  - [ ] Add developer examples

### Phase 4: Production Rollout (2-3 days)

- [ ] **Configure Production Environment**
  - [ ] Add `ENABLE_MPESA=true` to production secrets
  - [ ] Configure production credentials
  - [ ] Set production callback URL
  - [ ] Update country routing: `KE: PaymentGatewayType.MPESA`
  - [ ] Deploy billing-svc

- [ ] **Gradual Rollout**
  - [ ] Enable for internal testing accounts first
  - [ ] Monitor metrics for 24 hours
  - [ ] Enable for 10% of Kenya users
  - [ ] Monitor for 48 hours
  - [ ] Gradually increase to 100%

- [ ] **Monitoring Setup**
  - [ ] Configure production alerts
  - [ ] Set up on-call rotation for M-Pesa issues
  - [ ] Create runbook for common issues
  - [ ] Monitor Grafana dashboard daily

- [ ] **Post-Launch**
  - [ ] Document lessons learned
  - [ ] Optimize based on metrics
  - [ ] Add subscription support (external scheduler)
  - [ ] Consider expanding to Tanzania

---

## Technical Architecture

### Payment Flow Diagram

```
User Initiates Payment
         ↓
billing-svc: createPayment()
         ↓
mpesa.gateway.ts: STK Push Request
         ↓
Safaricom API: Send mobile prompt
         ↓
User's Phone: Enter M-Pesa PIN
         ↓
Safaricom API: Process payment
         ↓
Webhook: POST /webhooks/mpesa
         ↓
billing-svc: Update transaction status
         ↓
Transaction Complete
```

### Component Diagram

```
┌─────────────────────────────────────────────────────┐
│ billing-svc                                         │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ gateway.factory.ts                          │  │
│  │ - Routes KE → MPESA (when enabled)          │  │
│  │ - Routes KES → MPESA (when enabled)         │  │
│  │ - Fallback to Flutterwave (when disabled)   │  │
│  └─────────────────────────────────────────────┘  │
│                      ↓                             │
│  ┌─────────────────────────────────────────────┐  │
│  │ mpesa.gateway.ts                            │  │
│  │ - implements PaymentGateway                 │  │
│  │ - STK Push (createPayment)                  │  │
│  │ - Verification (verifyPayment)              │  │
│  │ - Refunds (createRefund)                    │  │
│  │ - Webhooks (handleWebhook)                  │  │
│  │ - OAuth (getAccessToken)                    │  │
│  └─────────────────────────────────────────────┘  │
│                      ↓                             │
│  ┌─────────────────────────────────────────────┐  │
│  │ Transaction Storage (needs implementation)  │  │
│  │ - Currently: Map (in-memory) ❌             │  │
│  │ - Required: PostgreSQL or Redis ✅          │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
                      ↕
        Safaricom M-Pesa API (Daraja)
                      ↕
                 User's Phone
```

---

## Known Limitations

### 1. Subscriptions Not Supported
**Issue:** M-Pesa STK Push does not natively support recurring payments  
**Workaround:** Implement external scheduler to trigger STK Push on subscription intervals  
**Affected Use Cases:** Monthly subscription billing  
**Priority:** Medium (can be addressed in future sprint)

### 2. No Hosted Checkout
**Issue:** M-Pesa does not provide hosted checkout pages  
**Impact:** Frontend must implement custom payment UI  
**Workaround:** Use existing payment form with phone number input  
**Priority:** Low (not a blocker)

### 3. Kenya-Only Phone Format
**Issue:** Phone formatting hardcoded for Kenya (254XXX)  
**Impact:** Tanzania/other countries need format updates  
**Workaround:** Add country-specific phone formatting  
**Priority:** Medium (needed for Tanzania expansion)

---

## Cost-Benefit Analysis

### Benefits of Enabling M-Pesa

**Market Access:**
- Kenya: 96% mobile money penetration (M-Pesa dominant)
- Tanzania: 65% mobile money usage
- East Africa: 50M+ active M-Pesa users

**User Experience:**
- Familiar payment method for East African users
- No card required (mobile-first)
- Instant payment confirmation
- Lower friction than international cards

**Business Impact:**
- Increased conversion rates in Kenya (estimated +30-40%)
- Reduced payment failures (M-Pesa more reliable than cards in Africa)
- Lower transaction fees than international cards
- Competitive advantage in East African edtech market

### Costs of Enabling M-Pesa

**Development Time:**
- Production hardening: 2-3 days
- Integration testing: 1 day
- Monitoring setup: 4-6 hours
- **Total:** ~4-5 days engineering time

**Operational Costs:**
- Safaricom transaction fees: ~3% per transaction
- Additional monitoring and alerting infrastructure
- Support for M-Pesa-specific issues

**Risks:**
- Transaction storage bugs (if not implemented correctly)
- Webhook callback failures (network issues)
- Credential exposure (if not secured properly)
- Customer support for M-Pesa-specific errors

---

## Alternative: Keep Disabled

### When to Keep M-Pesa Disabled

Consider keeping M-Pesa disabled if:
- Kenya/East Africa market not a priority for next 6 months
- Flutterwave is performing well for Kenya users
- Engineering bandwidth limited for 4-5 day effort
- Want to wait for more Kenya user signups before investing

### Fallback Strategy

**Current Setup:**
- Kenya (KE) routes to Flutterwave (supports M-Pesa + cards + bank transfers)
- Flutterwave has M-Pesa integration (indirect)
- Users can still pay via M-Pesa through Flutterwave

**Advantages:**
- No additional implementation needed
- One integration for multiple payment methods
- Flutterwave handles M-Pesa complexity
- Lower engineering overhead

**Disadvantages:**
- Higher transaction fees (Flutterwave markup)
- Less control over M-Pesa experience
- Slower payment processing (extra hop)
- Dependent on third-party M-Pesa integration

---

## Recommendation

### Recommended Approach: **Phased Enablement**

**Immediate (Sprint 4):** ✅ COMPLETE
- Disable M-Pesa with feature flag ✅
- Document production requirements ✅
- Continue using Flutterwave for Kenya ✅

**Sprint 6-7 (if Kenya market shows traction):**
- Implement persistent transaction storage (2 days)
- Add integration tests (1 day)
- Obtain Safaricom sandbox credentials (1 week)
- Test in sandbox environment (3 days)

**Sprint 8-9 (if ready for production):**
- Obtain production credentials (1-2 weeks)
- Security audit (2 days)
- Production deployment with gradual rollout (3 days)
- Monitor and optimize (ongoing)

**Trigger for Enablement:**
- 100+ Kenya user signups, OR
- Kenya user feedback requests M-Pesa, OR
- Strategic decision to prioritize East Africa market

---

## Support and Troubleshooting

### Common Issues (When Enabled)

#### Payment Fails with "Invalid Access Token"
- **Cause:** OAuth token expired
- **Solution:** Check token refresh logic in `getAccessToken()`
- **Prevention:** Ensure 1-minute buffer on token expiry

#### STK Push Not Received by Customer
- **Cause:** Invalid phone number format
- **Solution:** Verify phone number is 254XXXXXXXXX format
- **Debug:** Check M-Pesa API error response

#### Webhook Callbacks Not Received
- **Cause:** Callback URL not publicly accessible
- **Solution:** Verify MPESA_CALLBACK_URL is HTTPS and accessible
- **Debug:** Check firewall rules and load balancer config

#### Transaction Status Stuck in "Pending"
- **Cause:** User didn't complete payment or timeout
- **Solution:** Query transaction status after 30 seconds
- **Escalation:** Check Safaricom API status page

### Safaricom Support

- **Developer Portal:** https://developer.safaricom.co.ke/
- **API Documentation:** https://developer.safaricom.co.ke/APIs
- **Support Email:** apisupport@safaricom.co.ke
- **Status Page:** https://developer.safaricom.co.ke/status

---

## Appendix

### Environment Variable Reference

```bash
# Feature Flag
ENABLE_MPESA=true                          # Set to 'true' to enable M-Pesa gateway

# Authentication
MPESA_CONSUMER_KEY=<consumer-key>          # From Safaricom Daraja portal
MPESA_CONSUMER_SECRET=<consumer-secret>    # From Safaricom Daraja portal

# Configuration
MPESA_SHORT_CODE=<short-code>              # Paybill or Till number
MPESA_PASS_KEY=<pass-key>                  # Lipa na M-Pesa Online passkey
MPESA_CALLBACK_URL=https://api.aivo.education/webhooks/mpesa

# Optional (for B2C disbursements)
MPESA_INITIATOR_NAME=<initiator-name>
MPESA_INITIATOR_PASSWORD=<initiator-password>
MPESA_SECURITY_CREDENTIAL=<security-credential>
```

### Code Locations

| Component | File Path | Lines | Description |
|-----------|-----------|-------|-------------|
| Gateway Implementation | `services/billing-svc/src/gateways/mpesa.gateway.ts` | 710 | STK Push, webhooks, refunds |
| Configuration | `services/billing-svc/src/config/gateway.config.ts` | 128-144 | Feature flag, credentials |
| Factory | `services/billing-svc/src/gateways/gateway.factory.ts` | 16, 113, 281 | Country routing, initialization |
| Webhooks | `services/billing-svc/src/routes/gateway-webhooks.routes.ts` | 538+ | Webhook endpoint |
| Interface | `services/billing-svc/src/gateways/payment-gateway.interface.ts` | 32 | PaymentGatewayType.MPESA |

### Related Documentation

- [Safaricom Daraja API Docs](https://developer.safaricom.co.ke/docs)
- [M-Pesa Integration Guide](https://developer.safaricom.co.ke/get-started)
- [STK Push Specification](https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate)
- [Webhook Callback Format](https://developer.safaricom.co.ke/docs#lipa-na-m-pesa-online-query)

---

**Document Version:** 1.0  
**Last Updated:** January 28, 2026  
**Owner:** Backend Team / Billing Service  
**Next Review:** Before Sprint 6 planning
