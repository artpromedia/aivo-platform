-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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
