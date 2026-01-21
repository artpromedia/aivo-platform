-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "BillingAccountType" AS ENUM ('PARENT_CONSUMER', 'DISTRICT', 'PLATFORM_INTERNAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('IN_TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('PARENT_BASE', 'PARENT_ADDON', 'DISTRICT_BASE', 'DISTRICT_ADDON');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MANUAL_INVOICE', 'TEST_FAKE');

-- CreateEnum
CREATE TYPE "ContractBillingPeriod" AS ENUM ('ANNUAL', 'MULTI_YEAR', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED', 'RENEWED');

-- CreateEnum
CREATE TYPE "ContractPaymentType" AS ENUM ('INVOICE', 'CARD', 'HYBRID', 'PO');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "VaultLicenseType" AS ENUM ('SEAT', 'ENTERPRISE', 'TRIAL', 'PROMOTIONAL', 'NFR');

-- CreateEnum
CREATE TYPE "VaultLicenseStatus" AS ENUM ('ISSUED', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VaultCodeType" AS ENUM ('REDEMPTION', 'ACTIVATION', 'ACCESS', 'PIN');

-- CreateEnum
CREATE TYPE "VaultCodeStatus" AS ENUM ('VALID', 'REDEEMED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "EnterpriseDealStatus" AS ENUM ('LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CONTRACT_SENT', 'WON_PENDING', 'WON_ACTIVE', 'LOST', 'CHURNED');

-- CreateEnum
CREATE TYPE "EnterpriseDealType" AS ENUM ('NEW_BUSINESS', 'EXPANSION', 'RENEWAL', 'UPSELL');

-- CreateEnum
CREATE TYPE "EnterpriseCustomerType" AS ENUM ('DISTRICT', 'CHARTER_NETWORK', 'PRIVATE_SCHOOL', 'NONPROFIT', 'GOVERNMENT', 'RESELLER', 'OTHER');

-- CreateEnum
CREATE TYPE "GradeBand" AS ENUM ('K_2', 'G3_5', 'G6_8', 'G9_12', 'TEACHER', 'ALL');

-- CreateEnum
CREATE TYPE "BundleType" AS ENUM ('FAMILY', 'CLASSROOM', 'DISTRICT_SEAT');

-- CreateEnum
CREATE TYPE "BundleOrigin" AS ENUM ('DISTRICT_ENROLLMENT', 'PARENT_SUBSCRIPTION', 'TEACHER_ASSIGNMENT');

-- CreateEnum
CREATE TYPE "SeatCapEnforcement" AS ENUM ('SOFT', 'HARD', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "LicenseAssignmentStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "LicenseBundleStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LicenseBundleEventType" AS ENUM ('BUNDLE_CREATED', 'PARENT_INVITED', 'PARENT_ACCEPTED', 'TEACHER_INVITED', 'TEACHER_ACCEPTED', 'BUNDLE_ACTIVATED', 'BUNDLE_SUSPENDED', 'BUNDLE_REACTIVATED', 'BUNDLE_EXPIRED', 'BUNDLE_CANCELLED', 'PARENT_CHANGED', 'TEACHER_CHANGED');

-- CreateEnum
CREATE TYPE "TeacherInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "BulkInviteBatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LicenseEventType" AS ENUM ('ENTITLEMENT_CREATED', 'ENTITLEMENT_UPDATED', 'ENTITLEMENT_EXPIRED', 'LICENSE_ASSIGNED', 'LICENSE_REVOKED', 'LICENSE_TRANSFERRED', 'OVERAGE_WARNING', 'OVERAGE_BLOCKED', 'CAP_ADJUSTED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DistrictInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID', 'DISPUTED');

-- CreateEnum
CREATE TYPE "RenewalTaskStatus" AS ENUM ('SCHEDULED', 'DUE', 'IN_PROGRESS', 'COMPLETED', 'NOT_RENEWING', 'CHURNED');

-- CreateEnum
CREATE TYPE "SeatUsageAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "VendorPayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'DISPUTED');

-- CreateTable
CREATE TABLE "billing_accounts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "accountType" "BillingAccountType" NOT NULL,
    "ownerUserId" UUID,
    "displayName" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "providerCustomerId" TEXT,
    "defaultCurrency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "billingEmail" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitPriceCents" INTEGER NOT NULL,
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "billingAccountId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'IN_TRIAL',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "trialStartAt" TIMESTAMPTZ,
    "trialEndAt" TIMESTAMPTZ,
    "currentPeriodStart" TIMESTAMPTZ NOT NULL,
    "currentPeriodEnd" TIMESTAMPTZ NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMPTZ,
    "endedAt" TIMESTAMPTZ,
    "providerSubscriptionId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_items" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "learnerId" UUID,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_instruments" (
    "id" UUID NOT NULL,
    "billingAccountId" UUID NOT NULL,
    "providerPaymentMethodId" TEXT NOT NULL,
    "brand" TEXT,
    "last4" VARCHAR(4),
    "expiryMonth" SMALLINT,
    "expiryYear" SMALLINT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "instrumentType" TEXT NOT NULL DEFAULT 'card',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_instruments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "billingAccountId" UUID NOT NULL,
    "providerInvoiceId" TEXT,
    "invoiceNumber" TEXT,
    "amountDueCents" INTEGER NOT NULL,
    "amountPaidCents" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMPTZ NOT NULL,
    "periodEnd" TIMESTAMPTZ NOT NULL,
    "issuedAt" TIMESTAMPTZ,
    "dueAt" TIMESTAMPTZ,
    "paidAt" TIMESTAMPTZ,
    "pdfUrl" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "subscriptionId" UUID,
    "description" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amountCents" INTEGER NOT NULL,
    "lineItemType" TEXT NOT NULL DEFAULT 'subscription',
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "metric" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "eventType" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "billingAccountId" UUID,
    "subscriptionId" UUID,
    "invoiceId" UUID,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMPTZ,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'seat',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_books" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" DATE,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_book_entries" (
    "id" UUID NOT NULL,
    "priceBookId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "billingPeriod" "ContractBillingPeriod" NOT NULL DEFAULT 'ANNUAL',
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_book_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_billing_profiles" (
    "id" UUID NOT NULL,
    "billingAccountId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "billingContactName" TEXT NOT NULL,
    "billingContactEmail" TEXT NOT NULL,
    "billingContactPhone" TEXT,
    "billingAddressJson" JSONB NOT NULL,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "isTaxExempt" BOOLEAN NOT NULL DEFAULT true,
    "taxExemptionNumber" TEXT,
    "requiresPO" BOOLEAN NOT NULL DEFAULT true,
    "creditLimitCents" INTEGER,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "district_billing_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "billingProfileId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "name" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "priceBookId" UUID NOT NULL,
    "poNumber" TEXT,
    "paymentType" "ContractPaymentType" NOT NULL DEFAULT 'INVOICE',
    "totalValueCents" BIGINT NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "signedAt" TIMESTAMPTZ,
    "createdBy" UUID,
    "autoRenewal" BOOLEAN NOT NULL DEFAULT false,
    "renewalNoticeDays" INTEGER NOT NULL DEFAULT 90,
    "parentContractId" UUID,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_line_items" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "billingPeriod" "ContractBillingPeriod" NOT NULL DEFAULT 'ANNUAL',
    "quantityCommitted" INTEGER NOT NULL,
    "quantityMinimum" INTEGER,
    "quantityMaximum" INTEGER,
    "listPricePerUnit" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discountPercent" DECIMAL(5,2),
    "discountReason" TEXT,
    "totalValueCents" BIGINT NOT NULL DEFAULT 0,
    "startDate" DATE,
    "endDate" DATE,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_allocations" (
    "id" UUID NOT NULL,
    "lineItemId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "quantityAllocated" INTEGER NOT NULL,
    "quantityUsed" INTEGER NOT NULL DEFAULT 0,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_entitlements" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "featureKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "quantity" INTEGER,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_entitlements" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "lineItemId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "gradeBand" "GradeBand" NOT NULL,
    "quantityCommitted" INTEGER NOT NULL,
    "quantityAllocated" INTEGER NOT NULL DEFAULT 0,
    "overageAllowed" BOOLEAN NOT NULL DEFAULT false,
    "overageLimit" INTEGER,
    "overageCount" INTEGER NOT NULL DEFAULT 0,
    "enforcement" "SeatCapEnforcement" NOT NULL DEFAULT 'SOFT',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seat_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_assignments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "entitlementId" UUID NOT NULL,
    "learnerId" UUID,
    "teacherId" UUID,
    "sku" TEXT NOT NULL,
    "gradeBand" "GradeBand" NOT NULL,
    "schoolId" UUID,
    "status" "LicenseAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "isOverage" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ,
    "revokedReason" TEXT,
    "assignedBy" UUID,
    "revokedBy" UUID,
    "previousAssignmentId" UUID,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_bundles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "bundleType" "BundleType" NOT NULL,
    "origin" "BundleOrigin" NOT NULL,
    "status" "LicenseBundleStatus" NOT NULL DEFAULT 'PENDING',
    "learnerId" UUID NOT NULL,
    "parentUserId" UUID,
    "teacherUserId" UUID,
    "schoolId" UUID,
    "contractId" UUID,
    "subscriptionId" UUID,
    "seatEntitlementId" UUID,
    "learnerAssignmentId" UUID,
    "teacherAssignmentId" UUID,
    "gradeBand" "GradeBand" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "modulesJson" JSONB,
    "parentInviteId" TEXT,
    "teacherInviteId" TEXT,
    "createdBy" UUID,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_bundle_events" (
    "id" UUID NOT NULL,
    "bundleId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "eventType" "LicenseBundleEventType" NOT NULL,
    "actorId" UUID,
    "actorType" TEXT NOT NULL DEFAULT 'SYSTEM',
    "description" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_bundle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_invites" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,
    "bundleId" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "teacherEmail" TEXT NOT NULL,
    "teacherName" TEXT,
    "schoolName" TEXT,
    "status" "TeacherInviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedByParentId" UUID NOT NULL,
    "teacherUserId" UUID,
    "language" TEXT NOT NULL DEFAULT 'en',
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "acceptedAt" TIMESTAMPTZ,
    "message" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_invite_batches" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "inviteType" TEXT NOT NULL,
    "status" "BulkInviteBatchStatus" NOT NULL DEFAULT 'PENDING',
    "totalCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" UUID NOT NULL,
    "schoolId" UUID,
    "classId" UUID,
    "sourceFileUrl" TEXT,
    "processingStartedAt" TIMESTAMPTZ,
    "processingCompletedAt" TIMESTAMPTZ,
    "errorsJson" JSONB,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_invite_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_invite_items" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "inviteId" TEXT,
    "bundleId" UUID,
    "processedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_invite_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "eventType" "LicenseEventType" NOT NULL,
    "entitlementId" UUID,
    "assignmentId" UUID,
    "learnerId" UUID,
    "actorId" UUID,
    "actorType" TEXT NOT NULL DEFAULT 'SYSTEM',
    "description" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "billingAccountId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "name" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" DATE NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "totalAmountCents" BIGINT NOT NULL DEFAULT 0,
    "priceBookId" UUID,
    "proposedStartDate" DATE,
    "proposedEndDate" DATE,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "sentAt" TIMESTAMPTZ,
    "acceptedAt" TIMESTAMPTZ,
    "createdBy" UUID,
    "convertedContractId" UUID,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_line_items" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "listPriceCents" BIGINT NOT NULL,
    "unitPriceCents" BIGINT NOT NULL,
    "discountPercent" DECIMAL(5,2),
    "totalAmountCents" BIGINT NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "billingAccountId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "poNumber" TEXT NOT NULL,
    "quoteId" UUID,
    "status" "POStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "validFrom" DATE NOT NULL,
    "validTo" DATE NOT NULL,
    "attachmentsJson" JSONB,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMPTZ,
    "reviewNotes" TEXT,
    "contractId" UUID,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_invoices" (
    "id" UUID NOT NULL,
    "billingAccountId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" "DistrictInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "amountDueCents" BIGINT NOT NULL,
    "amountPaidCents" BIGINT NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "poNumber" TEXT,
    "externalSystemId" TEXT,
    "externalSystemName" TEXT,
    "sentAt" TIMESTAMPTZ,
    "paidAt" TIMESTAMPTZ,
    "paymentReference" TEXT,
    "pdfUrl" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "district_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renewal_tasks" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "status" "RenewalTaskStatus" NOT NULL DEFAULT 'SCHEDULED',
    "dueDate" DATE NOT NULL,
    "contractEndDate" DATE NOT NULL,
    "renewalQuoteId" UUID,
    "renewalContractId" UUID,
    "assignedTo" UUID,
    "notesJson" JSONB,
    "lastReminderAt" TIMESTAMPTZ,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "churnReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "renewal_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_invoice_schedules" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "description" TEXT,
    "invoiceId" UUID,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_invoice_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_usage_alerts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "gradeBand" "GradeBand" NOT NULL,
    "threshold" DECIMAL(4,2) NOT NULL,
    "status" "SeatUsageAlertStatus" NOT NULL DEFAULT 'OPEN',
    "contextJson" JSONB,
    "acknowledgedAt" TIMESTAMPTZ,
    "acknowledgedBy" UUID,
    "resolvedAt" TIMESTAMPTZ,
    "resolvedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seat_usage_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_usage_notifications" (
    "id" UUID NOT NULL,
    "alertId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seat_usage_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_entitlements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID,
    "line_item_id" UUID,
    "marketplace_item_id" UUID NOT NULL,
    "marketplace_installation_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "quantity" INTEGER,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_revenue_share_cache" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "share_percent" DECIMAL(5,2) NOT NULL,
    "effective_start_date" DATE NOT NULL,
    "effective_end_date" DATE,
    "synced_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_revenue_share_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_payouts" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "gross_revenue_cents" BIGINT NOT NULL,
    "vendor_share_percent" DECIMAL(5,2) NOT NULL,
    "vendor_amount_cents" BIGINT NOT NULL,
    "status" "VendorPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMPTZ,
    "approved_by" UUID,
    "paid_at" TIMESTAMPTZ,
    "payment_reference" TEXT,
    "line_items_json" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_licenses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "type" "VaultLicenseType" NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "seats_used" INTEGER NOT NULL DEFAULT 0,
    "status" "VaultLicenseStatus" NOT NULL DEFAULT 'ISSUED',
    "features_json" JSONB,
    "license_key_hash" TEXT NOT NULL,
    "encrypted_key_data" TEXT NOT NULL,
    "enterprise_deal_id" UUID,
    "contract_id" UUID,
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "activated_at" TIMESTAMPTZ,
    "suspended_at" TIMESTAMPTZ,
    "suspend_reason" TEXT,
    "revoked_at" TIMESTAMPTZ,
    "revoke_reason" TEXT,
    "issued_by" UUID NOT NULL,
    "notes" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vault_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_codes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "license_id" UUID NOT NULL,
    "code_type" "VaultCodeType" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "encrypted_code" TEXT NOT NULL,
    "status" "VaultCodeStatus" NOT NULL DEFAULT 'VALID',
    "max_redemptions" INTEGER,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ,
    "last_redeemed_at" TIMESTAMPTZ,
    "last_redeemed_by" UUID,
    "revoked_at" TIMESTAMPTZ,
    "revoked_by" UUID,
    "revoke_reason" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vault_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_code_redemptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code_id" UUID NOT NULL,
    "license_id" UUID NOT NULL,
    "redeemed_by" UUID NOT NULL,
    "target_tenant_id" UUID,
    "redeemed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata_json" JSONB,

    CONSTRAINT "vault_code_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "license_id" UUID,
    "code_id" UUID,
    "action" TEXT NOT NULL,
    "performed_by" UUID NOT NULL,
    "details_json" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vault_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_customers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "type" "EnterpriseCustomerType" NOT NULL,
    "primary_contact_name" TEXT NOT NULL,
    "primary_contact_email" TEXT NOT NULL,
    "primary_contact_phone" TEXT,
    "billing_contact_email" TEXT,
    "address_line_1" TEXT,
    "address_line_2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT DEFAULT 'US',
    "website" TEXT,
    "tax_id" TEXT,
    "notes" TEXT,
    "tenant_id" UUID,
    "sales_rep_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "enterprise_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_contacts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "customer_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "title" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "enterprise_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "customer_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EnterpriseDealType" NOT NULL,
    "status" "EnterpriseDealStatus" NOT NULL DEFAULT 'LEAD',
    "seats" INTEGER NOT NULL,
    "price_per_seat_cents" INTEGER NOT NULL,
    "total_value_cents" INTEGER NOT NULL,
    "arr_cents" INTEGER NOT NULL,
    "term_months" INTEGER NOT NULL DEFAULT 12,
    "start_date" DATE,
    "end_date" DATE,
    "expected_close_date" DATE,
    "actual_close_date" DATE,
    "probability" INTEGER,
    "discount_percent" DOUBLE PRECISION,
    "discount_reason" TEXT,
    "products_json" JSONB,
    "notes" TEXT,
    "owner_id" UUID NOT NULL,
    "qualified_at" TIMESTAMPTZ,
    "proposal_sent_at" TIMESTAMPTZ,
    "won_at" TIMESTAMPTZ,
    "lost_at" TIMESTAMPTZ,
    "lost_reason" TEXT,
    "contract_id" UUID,
    "external_crm_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "enterprise_deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_deal_activities" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "deal_id" UUID NOT NULL,
    "activity_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "previous_status" "EnterpriseDealStatus",
    "new_status" "EnterpriseDealStatus",
    "performed_by" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_deal_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_provisioning_batches" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "deal_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "license_count" INTEGER NOT NULL,
    "provisioned_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "license_type" "VaultLicenseType" NOT NULL DEFAULT 'ENTERPRISE',
    "seats_per_license" INTEGER NOT NULL DEFAULT 1,
    "duration_days" INTEGER,
    "features_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "initiated_by" UUID NOT NULL,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "enterprise_provisioning_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_accounts_tenantId_accountType_idx" ON "billing_accounts"("tenantId", "accountType");

-- CreateIndex
CREATE INDEX "billing_accounts_providerCustomerId_idx" ON "billing_accounts"("providerCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_sku_key" ON "plans"("sku");

-- CreateIndex
CREATE INDEX "plans_planType_isActive_idx" ON "plans"("planType", "isActive");

-- CreateIndex
CREATE INDEX "subscriptions_billingAccountId_status_idx" ON "subscriptions"("billingAccountId", "status");

-- CreateIndex
CREATE INDEX "subscriptions_providerSubscriptionId_idx" ON "subscriptions"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_status_currentPeriodEnd_idx" ON "subscriptions"("status", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "subscription_items_subscriptionId_idx" ON "subscription_items"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_items_learnerId_idx" ON "subscription_items"("learnerId");

-- CreateIndex
CREATE INDEX "billing_instruments_billingAccountId_idx" ON "billing_instruments"("billingAccountId");

-- CreateIndex
CREATE INDEX "billing_instruments_providerPaymentMethodId_idx" ON "billing_instruments"("providerPaymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_billingAccountId_issuedAt_idx" ON "invoices"("billingAccountId", "issuedAt" DESC);

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_providerInvoiceId_idx" ON "invoices"("providerInvoiceId");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoiceId_idx" ON "invoice_line_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_line_items_subscriptionId_idx" ON "invoice_line_items"("subscriptionId");

-- CreateIndex
CREATE INDEX "usage_records_subscriptionId_metric_timestamp_idx" ON "usage_records"("subscriptionId", "metric", "timestamp");

-- CreateIndex
CREATE INDEX "usage_records_invoiced_idx" ON "usage_records"("invoiced");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_providerEventId_key" ON "payment_events"("providerEventId");

-- CreateIndex
CREATE INDEX "payment_events_provider_eventType_idx" ON "payment_events"("provider", "eventType");

-- CreateIndex
CREATE INDEX "payment_events_billingAccountId_idx" ON "payment_events"("billingAccountId");

-- CreateIndex
CREATE INDEX "payment_events_providerEventId_idx" ON "payment_events"("providerEventId");

-- CreateIndex
CREATE INDEX "payment_events_createdAt_idx" ON "payment_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_category_isActive_idx" ON "products"("category", "isActive");

-- CreateIndex
CREATE INDEX "price_books_isDefault_isActive_idx" ON "price_books"("isDefault", "isActive");

-- CreateIndex
CREATE INDEX "price_book_entries_priceBookId_idx" ON "price_book_entries"("priceBookId");

-- CreateIndex
CREATE INDEX "price_book_entries_sku_idx" ON "price_book_entries"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "price_book_entries_priceBookId_sku_billingPeriod_minQuantit_key" ON "price_book_entries"("priceBookId", "sku", "billingPeriod", "minQuantity");

-- CreateIndex
CREATE UNIQUE INDEX "district_billing_profiles_billingAccountId_key" ON "district_billing_profiles"("billingAccountId");

-- CreateIndex
CREATE INDEX "district_billing_profiles_tenantId_idx" ON "district_billing_profiles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contractNumber_key" ON "contracts"("contractNumber");

-- CreateIndex
CREATE INDEX "contracts_billingProfileId_status_idx" ON "contracts"("billingProfileId", "status");

-- CreateIndex
CREATE INDEX "contracts_tenantId_status_idx" ON "contracts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "contracts_status_endDate_idx" ON "contracts"("status", "endDate");

-- CreateIndex
CREATE INDEX "contracts_contractNumber_idx" ON "contracts"("contractNumber");

-- CreateIndex
CREATE INDEX "contract_line_items_contractId_sku_idx" ON "contract_line_items"("contractId", "sku");

-- CreateIndex
CREATE INDEX "contract_line_items_sku_idx" ON "contract_line_items"("sku");

-- CreateIndex
CREATE INDEX "contract_allocations_schoolId_idx" ON "contract_allocations"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_allocations_lineItemId_schoolId_key" ON "contract_allocations"("lineItemId", "schoolId");

-- CreateIndex
CREATE INDEX "contract_entitlements_tenantId_featureKey_isActive_idx" ON "contract_entitlements"("tenantId", "featureKey", "isActive");

-- CreateIndex
CREATE INDEX "contract_entitlements_tenantId_endDate_idx" ON "contract_entitlements"("tenantId", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "contract_entitlements_contractId_featureKey_key" ON "contract_entitlements"("contractId", "featureKey");

-- CreateIndex
CREATE INDEX "seat_entitlements_tenantId_gradeBand_isActive_idx" ON "seat_entitlements"("tenantId", "gradeBand", "isActive");

-- CreateIndex
CREATE INDEX "seat_entitlements_contractId_idx" ON "seat_entitlements"("contractId");

-- CreateIndex
CREATE INDEX "seat_entitlements_tenantId_endDate_idx" ON "seat_entitlements"("tenantId", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "seat_entitlements_tenantId_contractId_sku_key" ON "seat_entitlements"("tenantId", "contractId", "sku");

-- CreateIndex
CREATE INDEX "license_assignments_tenantId_learnerId_status_idx" ON "license_assignments"("tenantId", "learnerId", "status");

-- CreateIndex
CREATE INDEX "license_assignments_tenantId_gradeBand_status_idx" ON "license_assignments"("tenantId", "gradeBand", "status");

-- CreateIndex
CREATE INDEX "license_assignments_entitlementId_status_idx" ON "license_assignments"("entitlementId", "status");

-- CreateIndex
CREATE INDEX "license_assignments_schoolId_status_idx" ON "license_assignments"("schoolId", "status");

-- CreateIndex
CREATE INDEX "license_assignments_learnerId_idx" ON "license_assignments"("learnerId");

-- CreateIndex
CREATE INDEX "license_assignments_teacherId_idx" ON "license_assignments"("teacherId");

-- CreateIndex
CREATE INDEX "license_bundles_tenantId_status_idx" ON "license_bundles"("tenantId", "status");

-- CreateIndex
CREATE INDEX "license_bundles_learnerId_idx" ON "license_bundles"("learnerId");

-- CreateIndex
CREATE INDEX "license_bundles_parentUserId_idx" ON "license_bundles"("parentUserId");

-- CreateIndex
CREATE INDEX "license_bundles_teacherUserId_idx" ON "license_bundles"("teacherUserId");

-- CreateIndex
CREATE INDEX "license_bundles_contractId_idx" ON "license_bundles"("contractId");

-- CreateIndex
CREATE INDEX "license_bundles_subscriptionId_idx" ON "license_bundles"("subscriptionId");

-- CreateIndex
CREATE INDEX "license_bundles_status_endDate_idx" ON "license_bundles"("status", "endDate");

-- CreateIndex
CREATE INDEX "license_bundle_events_bundleId_idx" ON "license_bundle_events"("bundleId");

-- CreateIndex
CREATE INDEX "license_bundle_events_tenantId_eventType_idx" ON "license_bundle_events"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "license_bundle_events_tenantId_createdAt_idx" ON "license_bundle_events"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_invites_code_key" ON "teacher_invites"("code");

-- CreateIndex
CREATE INDEX "teacher_invites_code_idx" ON "teacher_invites"("code");

-- CreateIndex
CREATE INDEX "teacher_invites_teacherEmail_idx" ON "teacher_invites"("teacherEmail");

-- CreateIndex
CREATE INDEX "teacher_invites_bundleId_idx" ON "teacher_invites"("bundleId");

-- CreateIndex
CREATE INDEX "teacher_invites_learnerId_idx" ON "teacher_invites"("learnerId");

-- CreateIndex
CREATE INDEX "teacher_invites_status_idx" ON "teacher_invites"("status");

-- CreateIndex
CREATE INDEX "bulk_invite_batches_tenantId_status_idx" ON "bulk_invite_batches"("tenantId", "status");

-- CreateIndex
CREATE INDEX "bulk_invite_batches_createdBy_idx" ON "bulk_invite_batches"("createdBy");

-- CreateIndex
CREATE INDEX "bulk_invite_batches_status_createdAt_idx" ON "bulk_invite_batches"("status", "createdAt");

-- CreateIndex
CREATE INDEX "bulk_invite_items_batchId_status_idx" ON "bulk_invite_items"("batchId", "status");

-- CreateIndex
CREATE INDEX "bulk_invite_items_learnerId_idx" ON "bulk_invite_items"("learnerId");

-- CreateIndex
CREATE INDEX "bulk_invite_items_email_idx" ON "bulk_invite_items"("email");

-- CreateIndex
CREATE INDEX "license_events_tenantId_eventType_idx" ON "license_events"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "license_events_tenantId_createdAt_idx" ON "license_events"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "license_events_entitlementId_idx" ON "license_events"("entitlementId");

-- CreateIndex
CREATE INDEX "license_events_assignmentId_idx" ON "license_events"("assignmentId");

-- CreateIndex
CREATE INDEX "license_events_learnerId_idx" ON "license_events"("learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");

-- CreateIndex
CREATE INDEX "quotes_billingAccountId_status_idx" ON "quotes"("billingAccountId", "status");

-- CreateIndex
CREATE INDEX "quotes_tenantId_status_idx" ON "quotes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "quotes_status_validUntil_idx" ON "quotes"("status", "validUntil");

-- CreateIndex
CREATE INDEX "quotes_quoteNumber_idx" ON "quotes"("quoteNumber");

-- CreateIndex
CREATE INDEX "quote_line_items_quoteId_idx" ON "quote_line_items"("quoteId");

-- CreateIndex
CREATE INDEX "purchase_orders_billingAccountId_status_idx" ON "purchase_orders"("billingAccountId", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_tenantId_status_idx" ON "purchase_orders"("tenantId", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_poNumber_idx" ON "purchase_orders"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_tenantId_poNumber_key" ON "purchase_orders"("tenantId", "poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "district_invoices_invoiceNumber_key" ON "district_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "district_invoices_billingAccountId_status_idx" ON "district_invoices"("billingAccountId", "status");

-- CreateIndex
CREATE INDEX "district_invoices_contractId_status_idx" ON "district_invoices"("contractId", "status");

-- CreateIndex
CREATE INDEX "district_invoices_status_dueDate_idx" ON "district_invoices"("status", "dueDate");

-- CreateIndex
CREATE INDEX "district_invoices_invoiceNumber_idx" ON "district_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "district_invoices_externalSystemId_idx" ON "district_invoices"("externalSystemId");

-- CreateIndex
CREATE INDEX "renewal_tasks_status_dueDate_idx" ON "renewal_tasks"("status", "dueDate");

-- CreateIndex
CREATE INDEX "renewal_tasks_tenantId_status_idx" ON "renewal_tasks"("tenantId", "status");

-- CreateIndex
CREATE INDEX "renewal_tasks_assignedTo_status_idx" ON "renewal_tasks"("assignedTo", "status");

-- CreateIndex
CREATE UNIQUE INDEX "renewal_tasks_contractId_key" ON "renewal_tasks"("contractId");

-- CreateIndex
CREATE INDEX "contract_invoice_schedules_contractId_status_idx" ON "contract_invoice_schedules"("contractId", "status");

-- CreateIndex
CREATE INDEX "contract_invoice_schedules_scheduledDate_status_idx" ON "contract_invoice_schedules"("scheduledDate", "status");

-- CreateIndex
CREATE INDEX "seat_usage_alerts_tenantId_status_idx" ON "seat_usage_alerts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "seat_usage_alerts_tenantId_sku_threshold_idx" ON "seat_usage_alerts"("tenantId", "sku", "threshold");

-- CreateIndex
CREATE INDEX "seat_usage_alerts_status_createdAt_idx" ON "seat_usage_alerts"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "seat_usage_notifications_tenantId_userId_isRead_idx" ON "seat_usage_notifications"("tenantId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "seat_usage_notifications_alertId_idx" ON "seat_usage_notifications"("alertId");

-- CreateIndex
CREATE INDEX "marketplace_entitlements_tenant_id_is_active_idx" ON "marketplace_entitlements"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "marketplace_entitlements_contract_id_idx" ON "marketplace_entitlements"("contract_id");

-- CreateIndex
CREATE INDEX "marketplace_entitlements_marketplace_item_id_tenant_id_idx" ON "marketplace_entitlements"("marketplace_item_id", "tenant_id");

-- CreateIndex
CREATE INDEX "marketplace_entitlements_sku_idx" ON "marketplace_entitlements"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_entitlements_tenant_id_marketplace_item_id_cont_key" ON "marketplace_entitlements"("tenant_id", "marketplace_item_id", "contract_id");

-- CreateIndex
CREATE INDEX "vendor_revenue_share_cache_sku_effective_start_date_effecti_idx" ON "vendor_revenue_share_cache"("sku", "effective_start_date", "effective_end_date");

-- CreateIndex
CREATE INDEX "vendor_revenue_share_cache_vendor_id_idx" ON "vendor_revenue_share_cache"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_payouts_vendor_id_status_idx" ON "vendor_payouts"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "vendor_payouts_period_start_period_end_idx" ON "vendor_payouts"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "vendor_payouts_status_created_at_idx" ON "vendor_payouts"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "vault_licenses_license_key_hash_key" ON "vault_licenses"("license_key_hash");

-- CreateIndex
CREATE INDEX "vault_licenses_tenant_id_status_idx" ON "vault_licenses"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "vault_licenses_type_status_idx" ON "vault_licenses"("type", "status");

-- CreateIndex
CREATE INDEX "vault_licenses_enterprise_deal_id_idx" ON "vault_licenses"("enterprise_deal_id");

-- CreateIndex
CREATE INDEX "vault_licenses_contract_id_idx" ON "vault_licenses"("contract_id");

-- CreateIndex
CREATE INDEX "vault_licenses_expires_at_idx" ON "vault_licenses"("expires_at");

-- CreateIndex
CREATE INDEX "vault_licenses_issued_at_idx" ON "vault_licenses"("issued_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "vault_codes_code_hash_key" ON "vault_codes"("code_hash");

-- CreateIndex
CREATE INDEX "vault_codes_license_id_code_type_idx" ON "vault_codes"("license_id", "code_type");

-- CreateIndex
CREATE INDEX "vault_codes_status_expires_at_idx" ON "vault_codes"("status", "expires_at");

-- CreateIndex
CREATE INDEX "vault_codes_code_type_status_idx" ON "vault_codes"("code_type", "status");

-- CreateIndex
CREATE INDEX "vault_code_redemptions_code_id_redeemed_at_idx" ON "vault_code_redemptions"("code_id", "redeemed_at" DESC);

-- CreateIndex
CREATE INDEX "vault_code_redemptions_redeemed_by_idx" ON "vault_code_redemptions"("redeemed_by");

-- CreateIndex
CREATE INDEX "vault_code_redemptions_target_tenant_id_idx" ON "vault_code_redemptions"("target_tenant_id");

-- CreateIndex
CREATE INDEX "vault_audit_logs_license_id_timestamp_idx" ON "vault_audit_logs"("license_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "vault_audit_logs_code_id_timestamp_idx" ON "vault_audit_logs"("code_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "vault_audit_logs_action_timestamp_idx" ON "vault_audit_logs"("action", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "vault_audit_logs_performed_by_timestamp_idx" ON "vault_audit_logs"("performed_by", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "enterprise_customers_type_is_active_idx" ON "enterprise_customers"("type", "is_active");

-- CreateIndex
CREATE INDEX "enterprise_customers_sales_rep_id_idx" ON "enterprise_customers"("sales_rep_id");

-- CreateIndex
CREATE INDEX "enterprise_customers_tenant_id_idx" ON "enterprise_customers"("tenant_id");

-- CreateIndex
CREATE INDEX "enterprise_customers_name_idx" ON "enterprise_customers"("name");

-- CreateIndex
CREATE INDEX "enterprise_contacts_customer_id_is_primary_idx" ON "enterprise_contacts"("customer_id", "is_primary");

-- CreateIndex
CREATE INDEX "enterprise_contacts_email_idx" ON "enterprise_contacts"("email");

-- CreateIndex
CREATE INDEX "enterprise_deals_customer_id_status_idx" ON "enterprise_deals"("customer_id", "status");

-- CreateIndex
CREATE INDEX "enterprise_deals_owner_id_status_idx" ON "enterprise_deals"("owner_id", "status");

-- CreateIndex
CREATE INDEX "enterprise_deals_status_expected_close_date_idx" ON "enterprise_deals"("status", "expected_close_date");

-- CreateIndex
CREATE INDEX "enterprise_deals_external_crm_id_idx" ON "enterprise_deals"("external_crm_id");

-- CreateIndex
CREATE INDEX "enterprise_deal_activities_deal_id_occurred_at_idx" ON "enterprise_deal_activities"("deal_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "enterprise_deal_activities_performed_by_idx" ON "enterprise_deal_activities"("performed_by");

-- CreateIndex
CREATE INDEX "enterprise_provisioning_batches_deal_id_status_idx" ON "enterprise_provisioning_batches"("deal_id", "status");

-- CreateIndex
CREATE INDEX "enterprise_provisioning_batches_initiated_by_idx" ON "enterprise_provisioning_batches"("initiated_by");

-- CreateIndex
CREATE INDEX "enterprise_provisioning_batches_status_created_at_idx" ON "enterprise_provisioning_batches"("status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_instruments" ADD CONSTRAINT "billing_instruments_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_book_entries" ADD CONSTRAINT "price_book_entries_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "price_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_book_entries" ADD CONSTRAINT "price_book_entries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_billing_profiles" ADD CONSTRAINT "district_billing_profiles_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_billingProfileId_fkey" FOREIGN KEY ("billingProfileId") REFERENCES "district_billing_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "price_books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_parentContractId_fkey" FOREIGN KEY ("parentContractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_line_items" ADD CONSTRAINT "contract_line_items_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_line_items" ADD CONSTRAINT "contract_line_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_allocations" ADD CONSTRAINT "contract_allocations_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "contract_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_entitlements" ADD CONSTRAINT "contract_entitlements_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_entitlements" ADD CONSTRAINT "seat_entitlements_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_assignments" ADD CONSTRAINT "license_assignments_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "seat_entitlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_assignments" ADD CONSTRAINT "license_assignments_previousAssignmentId_fkey" FOREIGN KEY ("previousAssignmentId") REFERENCES "license_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_bundle_events" ADD CONSTRAINT "license_bundle_events_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "license_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_invite_items" ADD CONSTRAINT "bulk_invite_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "bulk_invite_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "price_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_invoices" ADD CONSTRAINT "district_invoices_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_tasks" ADD CONSTRAINT "renewal_tasks_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_invoice_schedules" ADD CONSTRAINT "contract_invoice_schedules_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_usage_notifications" ADD CONSTRAINT "seat_usage_notifications_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "seat_usage_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_entitlements" ADD CONSTRAINT "marketplace_entitlements_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_entitlements" ADD CONSTRAINT "marketplace_entitlements_line_item_id_fkey" FOREIGN KEY ("line_item_id") REFERENCES "contract_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_licenses" ADD CONSTRAINT "vault_licenses_enterprise_deal_id_fkey" FOREIGN KEY ("enterprise_deal_id") REFERENCES "enterprise_deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_codes" ADD CONSTRAINT "vault_codes_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "vault_licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_code_redemptions" ADD CONSTRAINT "vault_code_redemptions_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "vault_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_audit_logs" ADD CONSTRAINT "vault_audit_logs_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "vault_licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_audit_logs" ADD CONSTRAINT "vault_audit_logs_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "vault_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_contacts" ADD CONSTRAINT "enterprise_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "enterprise_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deals" ADD CONSTRAINT "enterprise_deals_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "enterprise_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_deal_activities" ADD CONSTRAINT "enterprise_deal_activities_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_provisioning_batches" ADD CONSTRAINT "enterprise_provisioning_batches_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "enterprise_deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
