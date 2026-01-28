# M-Pesa Gateway - Quick Reference

**Status:** 🟡 DISABLED  
**Last Updated:** January 28, 2026

---

## TL;DR

- **Implementation:** 90% complete (710 lines)
- **Status:** DISABLED via `ENABLE_MPESA` flag
- **Blocker:** In-memory transaction storage (needs PostgreSQL/Redis)
- **Fallback:** Kenya → Flutterwave
- **Time to Enable:** 4-5 days (+ credential wait)

---

## Enable M-Pesa (Quick Steps)

### 1. Prerequisites
```bash
# Set flag
ENABLE_MPESA=true

# Configure credentials
MPESA_CONSUMER_KEY=<your-key>
MPESA_CONSUMER_SECRET=<your-secret>
MPESA_SHORT_CODE=<your-shortcode>
MPESA_PASS_KEY=<your-passkey>
```

### 2. Fix Transaction Storage
Replace this (line 93 in mpesa.gateway.ts):
```typescript
const transactionStore = new Map<...>();
```

With PostgreSQL table or Redis cache.

### 3. Add Tests
Create `tests/integration/mpesa.test.ts`

### 4. Add Monitoring
- OpenTelemetry metrics
- Grafana dashboard
- Alerts for failures

### 5. Update Routing
Change in `gateway.factory.ts`:
```typescript
KE: PaymentGatewayType.MPESA  // Instead of FLUTTERWAVE
```

---

## Why Disabled?

| Issue | Impact | Fix Time |
|-------|--------|----------|
| In-memory storage | Data lost on restart | 2-3 hours |
| No credentials | Can't connect to Safaricom | 1-2 weeks |
| No tests | Can't verify it works | 1 day |
| No monitoring | Can't track issues | 4-6 hours |

---

## Current Behavior

- Kenya (KE) → Flutterwave
- Flutterwave supports M-Pesa (indirect)
- Users can still pay via M-Pesa
- Slightly higher fees

---

## When to Enable?

✅ Enable if:
- 100+ Kenya users
- Users request M-Pesa
- East Africa market priority

❌ Keep disabled if:
- Kenya not priority
- Limited bandwidth
- Flutterwave working well

---

## Files Modified

| File | Change |
|------|--------|
| `gateway.config.ts` | Added `ENABLE_MPESA` flag |
| `mpesa.gateway.ts` | Added production warning |
| `gateway.factory.ts` | KE → FLUTTERWAVE fallback |

---

## Documentation

📖 Full docs: `services/billing-svc/docs/MPESA_PRODUCTION_READINESS.md`  
📊 Sprint update: `PRODUCTION_READINESS_AUDIT_2026-01-28_SPRINT4_UPDATE.md`  
✅ Task report: `SPRINT_4_TASK_3_MPESA_COMPLETION_REPORT.md`

---

## Support

- **Safaricom Portal:** https://developer.safaricom.co.ke/
- **Support Email:** apisupport@safaricom.co.ke
- **Internal Docs:** See files above

---

**Sprint 4 Task 3:** ✅ COMPLETED  
**Decision:** Disable until production-ready  
**Impact:** None (Kenya covered by Flutterwave)
