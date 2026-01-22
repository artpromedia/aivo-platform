# Billing Credit Processing Implementation

## Overview

This document describes the implementation of automatic credit processing for billing reconciliation overlaps. The feature enables the system to automatically detect when parents are paying for features already covered by their district and issue pro-rata refunds.

## Implementation Date

January 2026

## Changes Made

### 1. Added Credit Processing Method

**File**: `services/billing-svc/src/services/billing-reconciliation.job.ts`

Added new `processCreditIssuance()` method that:

- Retrieves the most recent paid invoice for a subscription
- Creates a Stripe refund for the calculated pro-rata credit amount
- Records the credit in the database with full audit trail
- Links the credit to the specific overlap, learner, and district contract
- Handles errors gracefully with detailed logging

### 2. Enhanced Configuration Options

Added new configuration option:

- `autoProcessCredits`: Boolean flag to enable/disable automatic credit processing (defaults to `false` for safety)

Existing configuration:

- `autoMarkForMigration`: Marks subscriptions for review
- `minCreditThresholdCents`: Minimum credit amount ($1.00) to process
- `maxSubscriptionsPerRun`: Prevents runaway processing (10,000)

### 3. Updated Data Models

**File**: `services/billing-svc/src/types/coverage-profile.types.ts`

Added `creditsProcessed` field to `ReconciliationResult` interface to track:

- Number of credits successfully issued during reconciliation run
- Included in summary reports for operations visibility

### 4. Integrated Stripe Service

Added dependency on `StripeService` for refund processing:

- Uses existing `createRefund()` method with reason 'requested_by_customer'
- Refunds are issued against the original payment intent
- Full Stripe integration with proper error handling

### 5. Enhanced Reporting

Updated `ReconciliationReport` interface to include:

- `creditsProcessed` in summary statistics
- Visibility into how many credits were actually issued vs. potential credits

## Credit Processing Flow

```
1. Detect Overlap
   └─> Calculate pro-rata credit amount
       └─> Check if amount >= threshold ($1.00)
           └─> If autoProcessCredits enabled:
               ├─> Find most recent paid invoice
               ├─> Create Stripe refund
               ├─> Record credit in database
               └─> Increment creditsProcessed counter
```

## Database Schema

Credits are stored with the following information:

- `billingAccountId`: Parent's billing account
- `learnerId`: Affected learner
- `amountCents`: Credit amount
- `reason`: 'DISTRICT_OVERLAP'
- `sourceInvoiceId`: Original invoice reference
- `stripeRefundId`: Stripe refund identifier
- `status`: 'ISSUED'
- `metadataJson`: Full audit trail including:
  - District contract ID
  - Feature key causing overlap
  - Subscription ID
  - Reconciliation job run timestamp

## Safety Features

### 1. Manual Approval Default

- `autoProcessCredits` defaults to `false`
- Requires explicit opt-in to enable automatic credit processing
- Prevents accidental mass refunds

### 2. Minimum Credit Threshold

- Only processes credits >= $1.00
- Prevents micro-transactions and excessive API calls
- Reduces Stripe transaction fees

### 3. Error Handling

- Try-catch blocks around all credit processing
- Failed credits logged but don't stop reconciliation
- Detailed error messages for debugging

### 4. Audit Trail

- Every credit linked to source invoice
- Stripe refund ID stored for reconciliation
- Full metadata including district contract and feature
- Timestamp of reconciliation job run

## Usage

### Running Reconciliation with Credit Processing

```typescript
// Default mode - calculates credits but doesn't issue them
const result = await billingReconciliationJob.run();

// Enable automatic credit processing
const job = new BillingReconciliationJob({
  autoProcessCredits: true,
  minCreditThresholdCents: 100, // $1.00 minimum
});
const result = await job.run();

// Generate report
const report = job.generateReport(result);
console.log(`Credits processed: ${report.summary.creditsProcessed}`);
```

### Monitoring Credit Processing

```typescript
// Check results
console.log(`Overlaps detected: ${result.overlapsDetected.length}`);
console.log(`Total potential credit: $${result.totalPotentialCreditCents / 100}`);
console.log(`Credits actually processed: ${result.creditsProcessed}`);

// Review errors
if (result.errors.length > 0) {
  console.error('Credit processing errors:', result.errors);
}
```

## Testing Recommendations

### Unit Tests

1. Test `processCreditIssuance()` with:
   - Valid subscription and invoice
   - Missing payment intent
   - Stripe API failures
   - Database write failures

### Integration Tests

1. End-to-end reconciliation with credit processing
2. Verify Stripe refunds are created correctly
3. Confirm database credits match Stripe refunds
4. Test threshold enforcement
5. Verify audit trail completeness

### Manual Testing

1. Run reconciliation in test mode first (`autoProcessCredits: false`)
2. Review potential credits in report
3. Enable `autoProcessCredits` for small batch
4. Verify credits in Stripe dashboard
5. Check database for correct records
6. Confirm parent receives refund notification

## Production Deployment

### Phase 1: Observation (Recommended)

```typescript
// Run with autoProcessCredits: false
// Review reports for 1-2 weeks
// Validate credit calculations
```

### Phase 2: Limited Rollout

```typescript
// Enable for small subset (e.g., maxSubscriptionsPerRun: 100)
// Monitor Stripe refund activity
// Check error rates
```

### Phase 3: Full Production

```typescript
// Enable full automatic processing
const job = new BillingReconciliationJob({
  autoProcessCredits: true,
  maxSubscriptionsPerRun: 10000,
  minCreditThresholdCents: 100,
});
```

## Monitoring & Alerts

### Key Metrics

- Credit processing success rate
- Average credit amount
- Error rate by type
- Processing time per subscription

### Recommended Alerts

- Error rate > 5%
- Total daily credits > $10,000 (adjust based on expected volume)
- Processing time > 30 minutes
- Stripe API failures

## Related Files

- `services/billing-svc/src/services/billing-reconciliation.job.ts` - Main implementation
- `services/billing-svc/src/services/stripe.service.ts` - Stripe integration
- `services/billing-svc/src/types/coverage-profile.types.ts` - Type definitions
- `services/billing-svc/src/repositories/coverage-profile.repository.ts` - Data access

## Future Enhancements

1. Add parent notification integration
2. Implement credit batching for performance
3. Add detailed analytics dashboard
4. Support partial refunds with remaining subscription adjustments
5. Add manual credit approval workflow for high-value credits

## Compliance & Legal

- Ensure refund policy aligns with parent terms of service
- Consider tax implications of refunds
- Maintain audit trail for financial compliance
- Document refund reason clearly for parent communication

## Status

✅ **Implementation Complete**

- Credit processing method implemented
- Configuration options added
- Database schema updated
- Reporting enhanced
- Error handling in place
- Safety features active

Ready for testing and deployment.
