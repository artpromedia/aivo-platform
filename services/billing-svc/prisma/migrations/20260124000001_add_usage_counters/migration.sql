-- CreateTable
CREATE TABLE "usage_counters" (
    "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"       UUID         NOT NULL,
    "counter_type"    VARCHAR(50)  NOT NULL,
    "current_value"   INTEGER      NOT NULL DEFAULT 0,
    "period_start"    TIMESTAMPTZ,
    "period_end"      TIMESTAMPTZ,
    "reconciled_at"   TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usage_counters_tenant_id_counter_type_key"
    ON "usage_counters"("tenant_id", "counter_type");

-- CreateIndex
CREATE INDEX "usage_counters_tenant_id_idx"
    ON "usage_counters"("tenant_id");

-- CreateIndex
CREATE INDEX "usage_counters_counter_type_idx"
    ON "usage_counters"("counter_type");
