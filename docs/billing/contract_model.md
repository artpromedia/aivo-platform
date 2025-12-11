# District Billing & Contract Model

> **Version:** 1.0  
> **Author:** Billing & Entitlements Team  
> **Last Updated:** 2025-01-XX

## Overview

This document describes the billing and contract data model for **B2B district customers**. Unlike consumer subscriptions (handled via Stripe), district contracts are multi-year agreements with:

- **Purchase Orders (POs)** and **Net-30+ payment terms**
- **Seat-based licensing** by grade band
- **School-level allocations** for seat distribution
- **Runtime entitlements** for feature access

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Tenant** | The product usage container (district/org in our system) |
| **Billing Account** | The payer entity (who gets invoiced) |
| **Contract** | The legal agreement defining what's purchased and the terms |
| **Price Book** | A catalog of SKU prices for a specific customer segment |
| **Entitlement** | Runtime permission derived from active contracts |

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DISTRICT BILLING MODEL                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌─────────────────────┐         ┌──────────────────┐
│    Tenant    │         │   BillingAccount    │         │     Product      │
│   (District) │         │                     │         │     (SKUs)       │
├──────────────┤         ├─────────────────────┤         ├──────────────────┤
│ id           │    1    │ id                  │         │ id               │
│ name         │◄───────►│ tenantId            │         │ sku              │
│ ...          │         │ accountType         │         │ name             │
└──────────────┘         │ displayName         │         │ category         │
       │                 │ provider            │         │ unitOfMeasure    │
       │                 └─────────────────────┘         └──────────────────┘
       │                          │ 1                            │
       │                          ▼                              │
       │                 ┌─────────────────────┐                 │
       │                 │DistrictBillingProfile│                │
       │                 ├─────────────────────┤                 │
       │            1    │ billingAccountId    │                 │
       │◄───────────────►│ tenantId            │                 │
       │                 │ billingContactName  │                 │
       │                 │ billingAddressJson  │                 │
       │                 │ paymentTermsDays    │                 │
       │                 │ isTaxExempt         │                 │
       │                 │ requiresPO          │                 │
       │                 └─────────────────────┘                 │
       │                          │ 1                            │
       │                          ▼                              │
       │                 ┌─────────────────────┐                 │
       │                 │      Contract       │                 │
       │                 ├─────────────────────┤                 │
       │            1    │ billingProfileId    │                 │
       │◄───────────────►│ tenantId            │                 │
       │                 │ contractNumber      │                 │
       │                 │ startDate/endDate   │                 │
       │                 │ status              │     ┌───────────┴───────────┐
       │                 │ priceBookId ────────┼────►│      PriceBook        │
       │                 │ paymentType         │     ├───────────────────────┤
       │                 │ totalValueCents     │     │ id                    │
       │                 │ autoRenewal         │     │ name                  │
       │                 └─────────────────────┘     │ currency              │
       │                    │           │           │ isDefault             │
       │                    │ 1..n      │ 0..n      │ effectiveFrom/Until   │
       │                    ▼           ▼           └───────────────────────┘
       │         ┌──────────────────┐ ┌─────────────────────┐      │
       │         │ContractLineItem  │ │ ContractEntitlement │      │ 1..n
       │         ├──────────────────┤ ├─────────────────────┤      ▼
       │         │ contractId       │ │ contractId          │ ┌───────────────────┐
       │         │ productId ───────┼─┼─────────────────────┼►│  PriceBookEntry   │
       │         │ sku              │ │ tenantId            │ ├───────────────────┤
       │         │ quantityCommitted│ │ featureKey          │ │ priceBookId       │
       │         │ listPricePerUnit │ │ isActive            │ │ productId         │
       │         │ unitPrice        │ │ quantity            │ │ sku               │
       │         │ discountPercent  │ │ startDate/endDate   │ │ unitPrice         │
       │         │ totalValueCents  │ └─────────────────────┘ │ billingPeriod     │
       │         └──────────────────┘                         │ minQuantity       │
       │                    │ 1..n                            └───────────────────┘
       │                    ▼
       │         ┌──────────────────┐         ┌─────────────────────────┐
       │         │ContractAllocation│         │ ContractInvoiceSchedule │
       │         ├──────────────────┤         ├─────────────────────────┤
       │         │ lineItemId       │         │ contractId              │
       │         │ schoolId ────────┼────┐    │ scheduledDate           │
       │         │ quantityAllocated│    │    │ amountCents             │
       │         │ quantityUsed     │    │    │ status                  │
       │         └──────────────────┘    │    │ invoiceId               │
       │                                 │    └─────────────────────────┘
       │                                 │
       │                                 ▼
       │                         ┌──────────────┐
       │                         │    School    │
       └────────────────────────►│              │
                   (belongs to)  └──────────────┘
```

## SKU Catalog

Our product catalog consists of the following SKUs:

| SKU | Name | Category | Unit | Description |
|-----|------|----------|------|-------------|
| `ORG_BASE` | Organization Base | BASE | org | Platform access fee per organization |
| `SEAT_K5` | K-5 Learner Seat | SEAT | seat | Learner license for grades K-5 |
| `SEAT_6_8` | 6-8 Learner Seat | SEAT | seat | Learner license for grades 6-8 |
| `SEAT_9_12` | 9-12 Learner Seat | SEAT | seat | Learner license for grades 9-12 |
| `ADDON_SEL` | SEL Module | ADDON | seat | Social-Emotional Learning add-on |
| `ADDON_SPEECH` | Speech Module | ADDON | seat | Speech & Language add-on |
| `ADDON_SCIENCE` | Science Module | ADDON | seat | Science curriculum add-on |

### Feature Keys Granted by SKU

```typescript
const SKU_TO_FEATURES = {
  ORG_BASE: ['PLATFORM_ACCESS', 'TEACHER_DASHBOARD', 'TEACHER_REPORTS'],
  SEAT_K5: ['GRADE_K5', 'MODULE_ELA', 'MODULE_MATH'],
  SEAT_6_8: ['GRADE_6_8', 'MODULE_ELA', 'MODULE_MATH'],
  SEAT_9_12: ['GRADE_9_12', 'MODULE_ELA', 'MODULE_MATH'],
  ADDON_SEL: ['MODULE_SEL'],
  ADDON_SPEECH: ['MODULE_SPEECH'],
  ADDON_SCIENCE: ['MODULE_SCIENCE'],
};
```

## Contract Lifecycle

```
┌─────────┐     sign      ┌─────────┐    payment    ┌─────────┐
│  DRAFT  │──────────────►│ PENDING │───────────────►│ ACTIVE  │
└─────────┘               └─────────┘               └─────────┘
     │                                                   │
     │ cancel                                           │
     ▼                                    ┌─────────────┼─────────────┐
┌───────────┐                             │             │             │
│ CANCELLED │◄────────────────────────────┤        non-payment       │
└───────────┘                             │             │             │
                                          ▼             │             ▼
                                    ┌───────────┐       │       ┌─────────┐
                                    │ SUSPENDED │◄──────┘       │ EXPIRED │
                                    └───────────┘               └─────────┘
                                          │                          │
                                          │ payment received         │ renew
                                          ▼                          ▼
                                    ┌─────────┐               ┌─────────┐
                                    │ ACTIVE  │               │ RENEWED │
                                    └─────────┘               └─────────┘
```

### Status Definitions

| Status | Description |
|--------|-------------|
| **DRAFT** | Contract being configured, line items can be modified |
| **PENDING** | Signed but awaiting payment or PO confirmation |
| **ACTIVE** | Contract is live, entitlements are active |
| **SUSPENDED** | Temporarily disabled (e.g., non-payment) |
| **EXPIRED** | Contract end date has passed |
| **CANCELLED** | Contract terminated before end date |
| **RENEWED** | Contract has been replaced by a renewal |

## Example: District X Contract

**Scenario:** Washington Unified School District signs a 3-year contract for:
- 5,000 K-5 seats
- 2,000 6-8 seats
- SEL add-on for all seats (7,000 total)

### Price Book: FY2025 Standard

| SKU | Unit Price (Annual) | Notes |
|-----|---------------------|-------|
| ORG_BASE | $5,000 | One per district |
| SEAT_K5 | $45 | Per learner |
| SEAT_6_8 | $55 | Per learner |
| SEAT_9_12 | $65 | Per learner |
| ADDON_SEL | $12 | Per seat |
| ADDON_SPEECH | $18 | Per seat |
| ADDON_SCIENCE | $15 | Per seat |

### Contract Line Items

```json
{
  "contractNumber": "CONT-2025-00042",
  "tenantId": "washington-unified-uuid",
  "startDate": "2025-07-01",
  "endDate": "2028-06-30",
  "status": "ACTIVE",
  "lineItems": [
    {
      "sku": "ORG_BASE",
      "description": "Platform Base Fee",
      "quantityCommitted": 1,
      "listPricePerUnit": 5000.00,
      "unitPrice": 5000.00,
      "discountPercent": null,
      "totalValueCents": 1500000
    },
    {
      "sku": "SEAT_K5",
      "description": "K-5 Learner Seats",
      "quantityCommitted": 5000,
      "listPricePerUnit": 45.00,
      "unitPrice": 40.50,
      "discountPercent": 10,
      "discountReason": "Volume discount (5000+ seats)",
      "totalValueCents": 60750000
    },
    {
      "sku": "SEAT_6_8",
      "description": "6-8 Learner Seats",
      "quantityCommitted": 2000,
      "listPricePerUnit": 55.00,
      "unitPrice": 49.50,
      "discountPercent": 10,
      "discountReason": "Volume discount (5000+ seats)",
      "totalValueCents": 29700000
    },
    {
      "sku": "ADDON_SEL",
      "description": "SEL Module Add-on",
      "quantityCommitted": 7000,
      "listPricePerUnit": 12.00,
      "unitPrice": 10.80,
      "discountPercent": 10,
      "discountReason": "Bundle with seats",
      "totalValueCents": 22680000
    }
  ],
  "totalValueCents": 114630000
}
```

### Annual Cost Breakdown

| Line Item | Qty | Unit Price | Annual | 3-Year |
|-----------|-----|------------|--------|--------|
| ORG_BASE | 1 | $5,000 | $5,000 | $15,000 |
| SEAT_K5 | 5,000 | $40.50 | $202,500 | $607,500 |
| SEAT_6_8 | 2,000 | $49.50 | $99,000 | $297,000 |
| ADDON_SEL | 7,000 | $10.80 | $75,600 | $226,800 |
| **Total** | | | **$382,100** | **$1,146,300** |

### School Allocations

```json
{
  "allocations": [
    {
      "schoolId": "washington-elementary-uuid",
      "sku": "SEAT_K5",
      "quantityAllocated": 1200,
      "quantityUsed": 1150
    },
    {
      "schoolId": "lincoln-elementary-uuid",
      "sku": "SEAT_K5",
      "quantityAllocated": 800,
      "quantityUsed": 782
    },
    {
      "schoolId": "jefferson-middle-uuid",
      "sku": "SEAT_6_8",
      "quantityAllocated": 600,
      "quantityUsed": 589
    }
  ]
}
```

### Generated Entitlements

When the contract is activated, these entitlements are created:

| Feature Key | Quantity | Start | End |
|-------------|----------|-------|-----|
| PLATFORM_ACCESS | - | 2025-07-01 | 2028-06-30 |
| TEACHER_DASHBOARD | - | 2025-07-01 | 2028-06-30 |
| TEACHER_REPORTS | - | 2025-07-01 | 2028-06-30 |
| GRADE_K5 | - | 2025-07-01 | 2028-06-30 |
| GRADE_6_8 | - | 2025-07-01 | 2028-06-30 |
| MODULE_ELA | - | 2025-07-01 | 2028-06-30 |
| MODULE_MATH | - | 2025-07-01 | 2028-06-30 |
| MODULE_SEL | - | 2025-07-01 | 2028-06-30 |
| LEARNER_SEATS_K5 | 5,000 | 2025-07-01 | 2028-06-30 |
| LEARNER_SEATS_6_8 | 2,000 | 2025-07-01 | 2028-06-30 |

### Invoice Schedule

| Date | Amount | Description | Status |
|------|--------|-------------|--------|
| 2025-07-01 | $382,100 | Year 1 of 3 - Annual Invoice | PENDING |
| 2026-07-01 | $382,100 | Year 2 of 3 - Annual Invoice | PENDING |
| 2027-07-01 | $382,100 | Year 3 of 3 - Annual Invoice | PENDING |

## API Operations

### Create Contract Flow

```typescript
// 1. Create billing profile (if not exists)
const profile = await districtBillingProfileRepository.create({
  billingAccountId: billingAccount.id,
  tenantId: tenant.id,
  billingContactName: "Jane Smith",
  billingContactEmail: "billing@washington.k12.us",
  billingAddressJson: {
    line1: "123 District Way",
    city: "Seattle",
    state: "WA",
    zip: "98101",
    country: "US"
  },
  paymentTermsDays: 30,
  isTaxExempt: true,
  requiresPO: true
});

// 2. Create contract
const contract = await contractService.createContract({
  billingProfileId: profile.id,
  tenantId: tenant.id,
  name: "Washington Unified 3-Year Agreement",
  startDate: new Date("2025-07-01"),
  endDate: new Date("2028-06-30"),
  priceBookId: standardPriceBook.id,
  paymentType: "PO",
  autoRenewal: false,
  renewalNoticeDays: 90
});

// 3. Add line items
await contractService.addLineItemFromPriceBook(
  contract.id, "ORG_BASE", 1
);
await contractService.addLineItemFromPriceBook(
  contract.id, "SEAT_K5", 5000, 10, "Volume discount"
);
await contractService.addLineItemFromPriceBook(
  contract.id, "SEAT_6_8", 2000, 10, "Volume discount"
);
await contractService.addLineItemFromPriceBook(
  contract.id, "ADDON_SEL", 7000, 10, "Bundle discount"
);

// 4. Activate contract (generates entitlements & invoice schedule)
await contractService.activateContract(contract.id, new Date());
```

### Check Entitlement

```typescript
const result = await contractService.checkEntitlement(
  tenantId,
  "MODULE_SEL"
);

// Result:
// {
//   hasAccess: true,
//   featureKey: "MODULE_SEL",
//   quantity: null,
//   expiresAt: "2028-06-30T00:00:00.000Z",
//   contractId: "uuid"
// }
```

### Check Seat Availability

```typescript
const result = await contractService.checkEntitlement(
  tenantId,
  "LEARNER_SEATS_K5"
);

// Result:
// {
//   hasAccess: true,
//   featureKey: "LEARNER_SEATS_K5",
//   quantity: 5000,
//   expiresAt: "2028-06-30T00:00:00.000Z",
//   contractId: "uuid"
// }
```

## Database Indexes

Critical indexes for query performance:

```prisma
// Contract lookups
@@index([tenantId, status])
@@index([billingProfileId])
@@index([endDate])

// Entitlement checks (hot path)
@@index([tenantId, featureKey, isActive])
@@index([contractId])

// Allocation lookups
@@index([schoolId])
@@index([lineItemId])

// Invoice scheduling
@@index([status, scheduledDate])
```

## Integration Points

### 1. Learner Provisioning

When a new learner is created:

```typescript
// Check seat entitlement
const seatKey = getGradeBandSeatKey(learner.gradeLevel); // e.g., LEARNER_SEATS_K5
const { hasAccess, quantity } = await checkEntitlement(tenantId, seatKey);

if (!hasAccess) {
  throw new Error("No seat entitlement for this grade band");
}

// Check allocation at school level
const allocation = await getSchoolAllocation(schoolId, seatKey);
if (allocation.quantityUsed >= allocation.quantityAllocated) {
  throw new Error("School seat allocation exhausted");
}

// Increment usage
await incrementAllocationUsage(allocation.id, 1);
```

### 2. Feature Gating

In application code:

```typescript
const canUseSEL = await checkEntitlement(tenantId, "MODULE_SEL");
if (!canUseSEL.hasAccess) {
  // Show upgrade prompt or hide feature
}
```

### 3. Invoice Generation

Cron job for invoice generation:

```typescript
// Run daily
const pendingSchedules = await contractInvoiceScheduleRepository
  .listPendingDue(new Date());

for (const schedule of pendingSchedules) {
  const invoice = await createInvoice({
    contractId: schedule.contractId,
    amountCents: schedule.amountCents,
    dueDate: addDays(schedule.scheduledDate, 
      schedule.contract.billingProfile.paymentTermsDays)
  });
  
  await contractInvoiceScheduleRepository.updateStatus(
    schedule.id, 
    "INVOICED", 
    invoice.id
  );
}
```

## Future Enhancements

1. **Usage-Based Billing** - Track actual usage vs committed seats
2. **Mid-Contract Amendments** - Add seats or modules mid-term
3. **True-Up Invoicing** - Invoice for overage at contract end
4. **Multi-Currency Support** - International district pricing
5. **Quote Generation** - CPQ flow for sales team
6. **Revenue Recognition** - ASC 606 compliance tracking
