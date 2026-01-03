/**
 * Marketplace Domain Events
 *
 * Event schemas for the content marketplace domain.
 * Used for:
 * - Analytics and warehouse ingestion
 * - Cross-service notifications (billing, content, AI orchestrator)
 * - Audit trail
 */
import { z } from 'zod';
export declare const MarketplaceEventBase: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
}, "strip", z.ZodTypeAny, {
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
}, {
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
}>;
export declare const VendorApprovedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.vendor.approved">;
    data: z.ZodObject<{
        vendorId: z.ZodString;
        vendorSlug: z.ZodString;
        vendorName: z.ZodString;
        vendorType: z.ZodEnum<["AIVO", "THIRD_PARTY"]>;
        approvedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        vendorId?: string;
        vendorSlug?: string;
        vendorName?: string;
        vendorType?: "AIVO" | "THIRD_PARTY";
        approvedByUserId?: string;
    }, {
        vendorId?: string;
        vendorSlug?: string;
        vendorName?: string;
        vendorType?: "AIVO" | "THIRD_PARTY";
        approvedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.vendor.approved";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        vendorId?: string;
        vendorSlug?: string;
        vendorName?: string;
        vendorType?: "AIVO" | "THIRD_PARTY";
        approvedByUserId?: string;
    };
}, {
    eventType?: "marketplace.vendor.approved";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        vendorId?: string;
        vendorSlug?: string;
        vendorName?: string;
        vendorType?: "AIVO" | "THIRD_PARTY";
        approvedByUserId?: string;
    };
}>;
export declare const VendorSuspendedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.vendor.suspended">;
    data: z.ZodObject<{
        vendorId: z.ZodString;
        vendorSlug: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        suspendedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        reason?: string;
        vendorId?: string;
        vendorSlug?: string;
        suspendedByUserId?: string;
    }, {
        reason?: string;
        vendorId?: string;
        vendorSlug?: string;
        suspendedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.vendor.suspended";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        reason?: string;
        vendorId?: string;
        vendorSlug?: string;
        suspendedByUserId?: string;
    };
}, {
    eventType?: "marketplace.vendor.suspended";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        reason?: string;
        vendorId?: string;
        vendorSlug?: string;
        suspendedByUserId?: string;
    };
}>;
export declare const PackPublishedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.pack.published">;
    data: z.ZodObject<{
        marketplaceItemId: z.ZodString;
        marketplaceItemSlug: z.ZodString;
        versionId: z.ZodString;
        version: z.ZodString;
        vendorId: z.ZodString;
        vendorSlug: z.ZodString;
        itemType: z.ZodEnum<["CONTENT_PACK", "EMBEDDED_TOOL"]>;
        subjects: z.ZodArray<z.ZodString, "many">;
        gradeBands: z.ZodArray<z.ZodString, "many">;
        safetyRating: z.ZodString;
        publishedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        versionId?: string;
        publishedByUserId?: string;
        vendorId?: string;
        vendorSlug?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        itemType?: "CONTENT_PACK" | "EMBEDDED_TOOL";
        subjects?: string[];
        gradeBands?: string[];
        safetyRating?: string;
    }, {
        version?: string;
        versionId?: string;
        publishedByUserId?: string;
        vendorId?: string;
        vendorSlug?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        itemType?: "CONTENT_PACK" | "EMBEDDED_TOOL";
        subjects?: string[];
        gradeBands?: string[];
        safetyRating?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.pack.published";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        version?: string;
        versionId?: string;
        publishedByUserId?: string;
        vendorId?: string;
        vendorSlug?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        itemType?: "CONTENT_PACK" | "EMBEDDED_TOOL";
        subjects?: string[];
        gradeBands?: string[];
        safetyRating?: string;
    };
}, {
    eventType?: "marketplace.pack.published";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        version?: string;
        versionId?: string;
        publishedByUserId?: string;
        vendorId?: string;
        vendorSlug?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        itemType?: "CONTENT_PACK" | "EMBEDDED_TOOL";
        subjects?: string[];
        gradeBands?: string[];
        safetyRating?: string;
    };
}>;
export declare const PackDeprecatedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.pack.deprecated">;
    data: z.ZodObject<{
        marketplaceItemId: z.ZodString;
        marketplaceItemSlug: z.ZodString;
        versionId: z.ZodString;
        version: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        deprecatedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        reason?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        deprecatedByUserId?: string;
    }, {
        version?: string;
        reason?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        deprecatedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.pack.deprecated";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        version?: string;
        reason?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        deprecatedByUserId?: string;
    };
}, {
    eventType?: "marketplace.pack.deprecated";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        version?: string;
        reason?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        deprecatedByUserId?: string;
    };
}>;
export declare const LicenseCreatedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.created">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        marketplaceItemSlug: z.ZodString;
        status: z.ZodEnum<["PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELED"]>;
        scopeType: z.ZodEnum<["TENANT", "SCHOOL", "GRADE_BAND", "CLASSROOM"]>;
        seatLimit: z.ZodNullable<z.ZodNumber>;
        validFrom: z.ZodString;
        validUntil: z.ZodNullable<z.ZodString>;
        licenseType: z.ZodEnum<["B2B_CONTRACT", "B2B_SUBSCRIPTION", "D2C_PARENT"]>;
        purchaserParentUserId: z.ZodNullable<z.ZodString>;
        billingSubscriptionId: z.ZodNullable<z.ZodString>;
        billingContractLineId: z.ZodNullable<z.ZodString>;
        createdByUserId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: "ACTIVE" | "CANCELED" | "PENDING" | "SUSPENDED" | "EXPIRED";
        tenantId?: string;
        validFrom?: string;
        createdByUserId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        licenseId?: string;
        scopeType?: "TENANT" | "SCHOOL" | "GRADE_BAND" | "CLASSROOM";
        seatLimit?: number;
        validUntil?: string;
        licenseType?: "B2B_CONTRACT" | "B2B_SUBSCRIPTION" | "D2C_PARENT";
        purchaserParentUserId?: string;
        billingSubscriptionId?: string;
        billingContractLineId?: string;
    }, {
        status?: "ACTIVE" | "CANCELED" | "PENDING" | "SUSPENDED" | "EXPIRED";
        tenantId?: string;
        validFrom?: string;
        createdByUserId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        licenseId?: string;
        scopeType?: "TENANT" | "SCHOOL" | "GRADE_BAND" | "CLASSROOM";
        seatLimit?: number;
        validUntil?: string;
        licenseType?: "B2B_CONTRACT" | "B2B_SUBSCRIPTION" | "D2C_PARENT";
        purchaserParentUserId?: string;
        billingSubscriptionId?: string;
        billingContractLineId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.created";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        status?: "ACTIVE" | "CANCELED" | "PENDING" | "SUSPENDED" | "EXPIRED";
        tenantId?: string;
        validFrom?: string;
        createdByUserId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        licenseId?: string;
        scopeType?: "TENANT" | "SCHOOL" | "GRADE_BAND" | "CLASSROOM";
        seatLimit?: number;
        validUntil?: string;
        licenseType?: "B2B_CONTRACT" | "B2B_SUBSCRIPTION" | "D2C_PARENT";
        purchaserParentUserId?: string;
        billingSubscriptionId?: string;
        billingContractLineId?: string;
    };
}, {
    eventType?: "marketplace.license.created";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        status?: "ACTIVE" | "CANCELED" | "PENDING" | "SUSPENDED" | "EXPIRED";
        tenantId?: string;
        validFrom?: string;
        createdByUserId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        licenseId?: string;
        scopeType?: "TENANT" | "SCHOOL" | "GRADE_BAND" | "CLASSROOM";
        seatLimit?: number;
        validUntil?: string;
        licenseType?: "B2B_CONTRACT" | "B2B_SUBSCRIPTION" | "D2C_PARENT";
        purchaserParentUserId?: string;
        billingSubscriptionId?: string;
        billingContractLineId?: string;
    };
}>;
export declare const LicenseActivatedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.activated">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        previousStatus: z.ZodEnum<["PENDING", "SUSPENDED"]>;
        activatedByUserId: z.ZodNullable<z.ZodString>;
        activationSource: z.ZodEnum<["billing_webhook", "admin_action", "auto_activation"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousStatus?: "PENDING" | "SUSPENDED";
        activatedByUserId?: string;
        activationSource?: "billing_webhook" | "admin_action" | "auto_activation";
    }, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousStatus?: "PENDING" | "SUSPENDED";
        activatedByUserId?: string;
        activationSource?: "billing_webhook" | "admin_action" | "auto_activation";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.activated";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousStatus?: "PENDING" | "SUSPENDED";
        activatedByUserId?: string;
        activationSource?: "billing_webhook" | "admin_action" | "auto_activation";
    };
}, {
    eventType?: "marketplace.license.activated";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousStatus?: "PENDING" | "SUSPENDED";
        activatedByUserId?: string;
        activationSource?: "billing_webhook" | "admin_action" | "auto_activation";
    };
}>;
export declare const LicenseSuspendedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.suspended">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        reason: z.ZodString;
        suspendedByUserId: z.ZodNullable<z.ZodString>;
        suspensionSource: z.ZodEnum<["billing_webhook", "admin_action", "policy_violation"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        reason?: string;
        suspendedByUserId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        suspensionSource?: "billing_webhook" | "admin_action" | "policy_violation";
    }, {
        tenantId?: string;
        reason?: string;
        suspendedByUserId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        suspensionSource?: "billing_webhook" | "admin_action" | "policy_violation";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.suspended";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        suspendedByUserId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        suspensionSource?: "billing_webhook" | "admin_action" | "policy_violation";
    };
}, {
    eventType?: "marketplace.license.suspended";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        suspendedByUserId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        suspensionSource?: "billing_webhook" | "admin_action" | "policy_violation";
    };
}>;
export declare const LicenseExpiredEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.expired">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        expiredAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        expiredAt?: string;
    }, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        expiredAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.expired";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        expiredAt?: string;
    };
}, {
    eventType?: "marketplace.license.expired";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        expiredAt?: string;
    };
}>;
export declare const LicenseCanceledEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.canceled">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        canceledByUserId: z.ZodNullable<z.ZodString>;
        cancellationSource: z.ZodEnum<["billing_webhook", "admin_action", "tenant_request"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        canceledByUserId?: string;
        cancellationSource?: "billing_webhook" | "admin_action" | "tenant_request";
    }, {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        canceledByUserId?: string;
        cancellationSource?: "billing_webhook" | "admin_action" | "tenant_request";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.canceled";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        canceledByUserId?: string;
        cancellationSource?: "billing_webhook" | "admin_action" | "tenant_request";
    };
}, {
    eventType?: "marketplace.license.canceled";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        canceledByUserId?: string;
        cancellationSource?: "billing_webhook" | "admin_action" | "tenant_request";
    };
}>;
export declare const LicenseRenewedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.renewed">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        previousValidUntil: z.ZodNullable<z.ZodString>;
        newValidUntil: z.ZodNullable<z.ZodString>;
        renewedByUserId: z.ZodNullable<z.ZodString>;
        renewalSource: z.ZodEnum<["billing_webhook", "admin_action", "auto_renewal"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousValidUntil?: string;
        newValidUntil?: string;
        renewedByUserId?: string;
        renewalSource?: "billing_webhook" | "admin_action" | "auto_renewal";
    }, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousValidUntil?: string;
        newValidUntil?: string;
        renewedByUserId?: string;
        renewalSource?: "billing_webhook" | "admin_action" | "auto_renewal";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.renewed";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousValidUntil?: string;
        newValidUntil?: string;
        renewedByUserId?: string;
        renewalSource?: "billing_webhook" | "admin_action" | "auto_renewal";
    };
}, {
    eventType?: "marketplace.license.renewed";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousValidUntil?: string;
        newValidUntil?: string;
        renewedByUserId?: string;
        renewalSource?: "billing_webhook" | "admin_action" | "auto_renewal";
    };
}>;
export declare const EntitlementAssignedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.entitlement.assigned">;
    data: z.ZodObject<{
        entitlementId: z.ZodString;
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        loId: z.ZodString;
        marketplaceItemId: z.ZodString;
        allowedGradeBands: z.ZodArray<z.ZodString, "many">;
        allowedSchoolIds: z.ZodArray<z.ZodString, "many">;
        assignedByUserId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        entitlementId?: string;
        allowedGradeBands?: string[];
        allowedSchoolIds?: string[];
        assignedByUserId?: string;
    }, {
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        entitlementId?: string;
        allowedGradeBands?: string[];
        allowedSchoolIds?: string[];
        assignedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.entitlement.assigned";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        entitlementId?: string;
        allowedGradeBands?: string[];
        allowedSchoolIds?: string[];
        assignedByUserId?: string;
    };
}, {
    eventType?: "marketplace.entitlement.assigned";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        entitlementId?: string;
        allowedGradeBands?: string[];
        allowedSchoolIds?: string[];
        assignedByUserId?: string;
    };
}>;
export declare const EntitlementRevokedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.entitlement.revoked">;
    data: z.ZodObject<{
        entitlementId: z.ZodString;
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        loId: z.ZodString;
        reason: z.ZodString;
        revokedByUserId: z.ZodNullable<z.ZodString>;
        revocationSource: z.ZodEnum<["license_expired", "license_canceled", "admin_action", "scope_changed"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        reason?: string;
        loId?: string;
        licenseId?: string;
        entitlementId?: string;
        revokedByUserId?: string;
        revocationSource?: "admin_action" | "license_expired" | "license_canceled" | "scope_changed";
    }, {
        tenantId?: string;
        reason?: string;
        loId?: string;
        licenseId?: string;
        entitlementId?: string;
        revokedByUserId?: string;
        revocationSource?: "admin_action" | "license_expired" | "license_canceled" | "scope_changed";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.entitlement.revoked";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        loId?: string;
        licenseId?: string;
        entitlementId?: string;
        revokedByUserId?: string;
        revocationSource?: "admin_action" | "license_expired" | "license_canceled" | "scope_changed";
    };
}, {
    eventType?: "marketplace.entitlement.revoked";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        loId?: string;
        licenseId?: string;
        entitlementId?: string;
        revokedByUserId?: string;
        revocationSource?: "admin_action" | "license_expired" | "license_canceled" | "scope_changed";
    };
}>;
export declare const SeatAssignedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.seat.assigned">;
    data: z.ZodObject<{
        seatAssignmentId: z.ZodString;
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        learnerId: z.ZodString;
        marketplaceItemId: z.ZodString;
        schoolId: z.ZodNullable<z.ZodString>;
        classroomId: z.ZodNullable<z.ZodString>;
        seatsUsedAfter: z.ZodNumber;
        seatLimit: z.ZodNullable<z.ZodNumber>;
        assignedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatLimit?: number;
        assignedByUserId?: string;
        seatAssignmentId?: string;
        schoolId?: string;
        classroomId?: string;
        seatsUsedAfter?: number;
    }, {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatLimit?: number;
        assignedByUserId?: string;
        seatAssignmentId?: string;
        schoolId?: string;
        classroomId?: string;
        seatsUsedAfter?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.seat.assigned";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatLimit?: number;
        assignedByUserId?: string;
        seatAssignmentId?: string;
        schoolId?: string;
        classroomId?: string;
        seatsUsedAfter?: number;
    };
}, {
    eventType?: "marketplace.seat.assigned";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatLimit?: number;
        assignedByUserId?: string;
        seatAssignmentId?: string;
        schoolId?: string;
        classroomId?: string;
        seatsUsedAfter?: number;
    };
}>;
export declare const SeatReleasedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.seat.released">;
    data: z.ZodObject<{
        seatAssignmentId: z.ZodString;
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        learnerId: z.ZodString;
        marketplaceItemId: z.ZodString;
        seatsUsedAfter: z.ZodNumber;
        releaseReason: z.ZodString;
        releasedByUserId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatAssignmentId?: string;
        seatsUsedAfter?: number;
        releaseReason?: string;
        releasedByUserId?: string;
    }, {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatAssignmentId?: string;
        seatsUsedAfter?: number;
        releaseReason?: string;
        releasedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.seat.released";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatAssignmentId?: string;
        seatsUsedAfter?: number;
        releaseReason?: string;
        releasedByUserId?: string;
    };
}, {
    eventType?: "marketplace.seat.released";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatAssignmentId?: string;
        seatsUsedAfter?: number;
        releaseReason?: string;
        releasedByUserId?: string;
    };
}>;
export declare const PartnerContentUsageEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.pack.usage">;
    data: z.ZodObject<{
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        vendorId: z.ZodString;
        loId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodString;
        schoolId: z.ZodNullable<z.ZodString>;
        classroomId: z.ZodNullable<z.ZodString>;
        subject: z.ZodString;
        gradeBand: z.ZodString;
        durationSeconds: z.ZodNumber;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        tenantId?: string;
        subject?: string;
        sessionId?: string;
        gradeBand?: string;
        completedAt?: string;
        loId?: string;
        vendorId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        durationSeconds?: number;
    }, {
        learnerId?: string;
        tenantId?: string;
        subject?: string;
        sessionId?: string;
        gradeBand?: string;
        completedAt?: string;
        loId?: string;
        vendorId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        durationSeconds?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.pack.usage";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        subject?: string;
        sessionId?: string;
        gradeBand?: string;
        completedAt?: string;
        loId?: string;
        vendorId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        durationSeconds?: number;
    };
}, {
    eventType?: "marketplace.pack.usage";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        subject?: string;
        sessionId?: string;
        gradeBand?: string;
        completedAt?: string;
        loId?: string;
        vendorId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        durationSeconds?: number;
    };
}>;
export declare const EntitlementCheckFailedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.entitlement.check_failed">;
    data: z.ZodObject<{
        tenantId: z.ZodString;
        loId: z.ZodNullable<z.ZodString>;
        marketplaceItemId: z.ZodNullable<z.ZodString>;
        learnerId: z.ZodNullable<z.ZodString>;
        schoolId: z.ZodNullable<z.ZodString>;
        classroomId: z.ZodNullable<z.ZodString>;
        failureReason: z.ZodEnum<["NO_LICENSE", "LICENSE_EXPIRED", "LICENSE_SUSPENDED", "SCOPE_MISMATCH", "SEAT_LIMIT_EXCEEDED", "LEARNER_NOT_COVERED"]>;
        requestedByService: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        failureReason?: "NO_LICENSE" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED" | "SCOPE_MISMATCH" | "SEAT_LIMIT_EXCEEDED" | "LEARNER_NOT_COVERED";
        requestedByService?: string;
    }, {
        learnerId?: string;
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        failureReason?: "NO_LICENSE" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED" | "SCOPE_MISMATCH" | "SEAT_LIMIT_EXCEEDED" | "LEARNER_NOT_COVERED";
        requestedByService?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.entitlement.check_failed";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        failureReason?: "NO_LICENSE" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED" | "SCOPE_MISMATCH" | "SEAT_LIMIT_EXCEEDED" | "LEARNER_NOT_COVERED";
        requestedByService?: string;
    };
}, {
    eventType?: "marketplace.entitlement.check_failed";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        failureReason?: "NO_LICENSE" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED" | "SCOPE_MISMATCH" | "SEAT_LIMIT_EXCEEDED" | "LEARNER_NOT_COVERED";
        requestedByService?: string;
    };
}>;
export declare const InstallationCreatedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.installation.created">;
    data: z.ZodObject<{
        installationId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        marketplaceItemSlug: z.ZodString;
        versionId: z.ZodString;
        schoolId: z.ZodNullable<z.ZodString>;
        classroomId: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["PENDING_APPROVAL", "ACTIVE", "DISABLED", "REVOKED"]>;
        installedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status?: "ACTIVE" | "PENDING_APPROVAL" | "DISABLED" | "REVOKED";
        tenantId?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        schoolId?: string;
        classroomId?: string;
        installationId?: string;
        installedByUserId?: string;
    }, {
        status?: "ACTIVE" | "PENDING_APPROVAL" | "DISABLED" | "REVOKED";
        tenantId?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        schoolId?: string;
        classroomId?: string;
        installationId?: string;
        installedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.installation.created";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        status?: "ACTIVE" | "PENDING_APPROVAL" | "DISABLED" | "REVOKED";
        tenantId?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        schoolId?: string;
        classroomId?: string;
        installationId?: string;
        installedByUserId?: string;
    };
}, {
    eventType?: "marketplace.installation.created";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        status?: "ACTIVE" | "PENDING_APPROVAL" | "DISABLED" | "REVOKED";
        tenantId?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        schoolId?: string;
        classroomId?: string;
        installationId?: string;
        installedByUserId?: string;
    };
}>;
export declare const InstallationApprovedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.installation.approved">;
    data: z.ZodObject<{
        installationId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        approvedByUserId: z.ZodString;
        approvalNotes: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        approvedByUserId?: string;
        marketplaceItemId?: string;
        installationId?: string;
        approvalNotes?: string;
    }, {
        tenantId?: string;
        approvedByUserId?: string;
        marketplaceItemId?: string;
        installationId?: string;
        approvalNotes?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.installation.approved";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        approvedByUserId?: string;
        marketplaceItemId?: string;
        installationId?: string;
        approvalNotes?: string;
    };
}, {
    eventType?: "marketplace.installation.approved";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        approvedByUserId?: string;
        marketplaceItemId?: string;
        installationId?: string;
        approvalNotes?: string;
    };
}>;
export declare const InstallationRevokedEvent: z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.installation.revoked">;
    data: z.ZodObject<{
        installationId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        reason: z.ZodString;
        revokedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        revokedByUserId?: string;
        installationId?: string;
    }, {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        revokedByUserId?: string;
        installationId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.installation.revoked";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        revokedByUserId?: string;
        installationId?: string;
    };
}, {
    eventType?: "marketplace.installation.revoked";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        revokedByUserId?: string;
        installationId?: string;
    };
}>;
export declare const MarketplaceEvent: z.ZodDiscriminatedUnion<"eventType", [z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.vendor.approved">;
    data: z.ZodObject<{
        vendorId: z.ZodString;
        vendorSlug: z.ZodString;
        vendorName: z.ZodString;
        vendorType: z.ZodEnum<["AIVO", "THIRD_PARTY"]>;
        approvedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        vendorId?: string;
        vendorSlug?: string;
        vendorName?: string;
        vendorType?: "AIVO" | "THIRD_PARTY";
        approvedByUserId?: string;
    }, {
        vendorId?: string;
        vendorSlug?: string;
        vendorName?: string;
        vendorType?: "AIVO" | "THIRD_PARTY";
        approvedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.vendor.approved";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        vendorId?: string;
        vendorSlug?: string;
        vendorName?: string;
        vendorType?: "AIVO" | "THIRD_PARTY";
        approvedByUserId?: string;
    };
}, {
    eventType?: "marketplace.vendor.approved";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        vendorId?: string;
        vendorSlug?: string;
        vendorName?: string;
        vendorType?: "AIVO" | "THIRD_PARTY";
        approvedByUserId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.vendor.suspended">;
    data: z.ZodObject<{
        vendorId: z.ZodString;
        vendorSlug: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        suspendedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        reason?: string;
        vendorId?: string;
        vendorSlug?: string;
        suspendedByUserId?: string;
    }, {
        reason?: string;
        vendorId?: string;
        vendorSlug?: string;
        suspendedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.vendor.suspended";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        reason?: string;
        vendorId?: string;
        vendorSlug?: string;
        suspendedByUserId?: string;
    };
}, {
    eventType?: "marketplace.vendor.suspended";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        reason?: string;
        vendorId?: string;
        vendorSlug?: string;
        suspendedByUserId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.pack.published">;
    data: z.ZodObject<{
        marketplaceItemId: z.ZodString;
        marketplaceItemSlug: z.ZodString;
        versionId: z.ZodString;
        version: z.ZodString;
        vendorId: z.ZodString;
        vendorSlug: z.ZodString;
        itemType: z.ZodEnum<["CONTENT_PACK", "EMBEDDED_TOOL"]>;
        subjects: z.ZodArray<z.ZodString, "many">;
        gradeBands: z.ZodArray<z.ZodString, "many">;
        safetyRating: z.ZodString;
        publishedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        versionId?: string;
        publishedByUserId?: string;
        vendorId?: string;
        vendorSlug?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        itemType?: "CONTENT_PACK" | "EMBEDDED_TOOL";
        subjects?: string[];
        gradeBands?: string[];
        safetyRating?: string;
    }, {
        version?: string;
        versionId?: string;
        publishedByUserId?: string;
        vendorId?: string;
        vendorSlug?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        itemType?: "CONTENT_PACK" | "EMBEDDED_TOOL";
        subjects?: string[];
        gradeBands?: string[];
        safetyRating?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.pack.published";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        version?: string;
        versionId?: string;
        publishedByUserId?: string;
        vendorId?: string;
        vendorSlug?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        itemType?: "CONTENT_PACK" | "EMBEDDED_TOOL";
        subjects?: string[];
        gradeBands?: string[];
        safetyRating?: string;
    };
}, {
    eventType?: "marketplace.pack.published";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        version?: string;
        versionId?: string;
        publishedByUserId?: string;
        vendorId?: string;
        vendorSlug?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        itemType?: "CONTENT_PACK" | "EMBEDDED_TOOL";
        subjects?: string[];
        gradeBands?: string[];
        safetyRating?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.pack.deprecated">;
    data: z.ZodObject<{
        marketplaceItemId: z.ZodString;
        marketplaceItemSlug: z.ZodString;
        versionId: z.ZodString;
        version: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        deprecatedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        reason?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        deprecatedByUserId?: string;
    }, {
        version?: string;
        reason?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        deprecatedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.pack.deprecated";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        version?: string;
        reason?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        deprecatedByUserId?: string;
    };
}, {
    eventType?: "marketplace.pack.deprecated";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        version?: string;
        reason?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        deprecatedByUserId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.created">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        marketplaceItemSlug: z.ZodString;
        status: z.ZodEnum<["PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELED"]>;
        scopeType: z.ZodEnum<["TENANT", "SCHOOL", "GRADE_BAND", "CLASSROOM"]>;
        seatLimit: z.ZodNullable<z.ZodNumber>;
        validFrom: z.ZodString;
        validUntil: z.ZodNullable<z.ZodString>;
        licenseType: z.ZodEnum<["B2B_CONTRACT", "B2B_SUBSCRIPTION", "D2C_PARENT"]>;
        purchaserParentUserId: z.ZodNullable<z.ZodString>;
        billingSubscriptionId: z.ZodNullable<z.ZodString>;
        billingContractLineId: z.ZodNullable<z.ZodString>;
        createdByUserId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: "ACTIVE" | "CANCELED" | "PENDING" | "SUSPENDED" | "EXPIRED";
        tenantId?: string;
        validFrom?: string;
        createdByUserId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        licenseId?: string;
        scopeType?: "TENANT" | "SCHOOL" | "GRADE_BAND" | "CLASSROOM";
        seatLimit?: number;
        validUntil?: string;
        licenseType?: "B2B_CONTRACT" | "B2B_SUBSCRIPTION" | "D2C_PARENT";
        purchaserParentUserId?: string;
        billingSubscriptionId?: string;
        billingContractLineId?: string;
    }, {
        status?: "ACTIVE" | "CANCELED" | "PENDING" | "SUSPENDED" | "EXPIRED";
        tenantId?: string;
        validFrom?: string;
        createdByUserId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        licenseId?: string;
        scopeType?: "TENANT" | "SCHOOL" | "GRADE_BAND" | "CLASSROOM";
        seatLimit?: number;
        validUntil?: string;
        licenseType?: "B2B_CONTRACT" | "B2B_SUBSCRIPTION" | "D2C_PARENT";
        purchaserParentUserId?: string;
        billingSubscriptionId?: string;
        billingContractLineId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.created";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        status?: "ACTIVE" | "CANCELED" | "PENDING" | "SUSPENDED" | "EXPIRED";
        tenantId?: string;
        validFrom?: string;
        createdByUserId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        licenseId?: string;
        scopeType?: "TENANT" | "SCHOOL" | "GRADE_BAND" | "CLASSROOM";
        seatLimit?: number;
        validUntil?: string;
        licenseType?: "B2B_CONTRACT" | "B2B_SUBSCRIPTION" | "D2C_PARENT";
        purchaserParentUserId?: string;
        billingSubscriptionId?: string;
        billingContractLineId?: string;
    };
}, {
    eventType?: "marketplace.license.created";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        status?: "ACTIVE" | "CANCELED" | "PENDING" | "SUSPENDED" | "EXPIRED";
        tenantId?: string;
        validFrom?: string;
        createdByUserId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        licenseId?: string;
        scopeType?: "TENANT" | "SCHOOL" | "GRADE_BAND" | "CLASSROOM";
        seatLimit?: number;
        validUntil?: string;
        licenseType?: "B2B_CONTRACT" | "B2B_SUBSCRIPTION" | "D2C_PARENT";
        purchaserParentUserId?: string;
        billingSubscriptionId?: string;
        billingContractLineId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.activated">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        previousStatus: z.ZodEnum<["PENDING", "SUSPENDED"]>;
        activatedByUserId: z.ZodNullable<z.ZodString>;
        activationSource: z.ZodEnum<["billing_webhook", "admin_action", "auto_activation"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousStatus?: "PENDING" | "SUSPENDED";
        activatedByUserId?: string;
        activationSource?: "billing_webhook" | "admin_action" | "auto_activation";
    }, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousStatus?: "PENDING" | "SUSPENDED";
        activatedByUserId?: string;
        activationSource?: "billing_webhook" | "admin_action" | "auto_activation";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.activated";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousStatus?: "PENDING" | "SUSPENDED";
        activatedByUserId?: string;
        activationSource?: "billing_webhook" | "admin_action" | "auto_activation";
    };
}, {
    eventType?: "marketplace.license.activated";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousStatus?: "PENDING" | "SUSPENDED";
        activatedByUserId?: string;
        activationSource?: "billing_webhook" | "admin_action" | "auto_activation";
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.suspended">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        reason: z.ZodString;
        suspendedByUserId: z.ZodNullable<z.ZodString>;
        suspensionSource: z.ZodEnum<["billing_webhook", "admin_action", "policy_violation"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        reason?: string;
        suspendedByUserId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        suspensionSource?: "billing_webhook" | "admin_action" | "policy_violation";
    }, {
        tenantId?: string;
        reason?: string;
        suspendedByUserId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        suspensionSource?: "billing_webhook" | "admin_action" | "policy_violation";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.suspended";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        suspendedByUserId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        suspensionSource?: "billing_webhook" | "admin_action" | "policy_violation";
    };
}, {
    eventType?: "marketplace.license.suspended";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        suspendedByUserId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        suspensionSource?: "billing_webhook" | "admin_action" | "policy_violation";
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.expired">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        expiredAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        expiredAt?: string;
    }, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        expiredAt?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.expired";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        expiredAt?: string;
    };
}, {
    eventType?: "marketplace.license.expired";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        expiredAt?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.canceled">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        canceledByUserId: z.ZodNullable<z.ZodString>;
        cancellationSource: z.ZodEnum<["billing_webhook", "admin_action", "tenant_request"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        canceledByUserId?: string;
        cancellationSource?: "billing_webhook" | "admin_action" | "tenant_request";
    }, {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        canceledByUserId?: string;
        cancellationSource?: "billing_webhook" | "admin_action" | "tenant_request";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.canceled";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        canceledByUserId?: string;
        cancellationSource?: "billing_webhook" | "admin_action" | "tenant_request";
    };
}, {
    eventType?: "marketplace.license.canceled";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        canceledByUserId?: string;
        cancellationSource?: "billing_webhook" | "admin_action" | "tenant_request";
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.license.renewed">;
    data: z.ZodObject<{
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        previousValidUntil: z.ZodNullable<z.ZodString>;
        newValidUntil: z.ZodNullable<z.ZodString>;
        renewedByUserId: z.ZodNullable<z.ZodString>;
        renewalSource: z.ZodEnum<["billing_webhook", "admin_action", "auto_renewal"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousValidUntil?: string;
        newValidUntil?: string;
        renewedByUserId?: string;
        renewalSource?: "billing_webhook" | "admin_action" | "auto_renewal";
    }, {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousValidUntil?: string;
        newValidUntil?: string;
        renewedByUserId?: string;
        renewalSource?: "billing_webhook" | "admin_action" | "auto_renewal";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.license.renewed";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousValidUntil?: string;
        newValidUntil?: string;
        renewedByUserId?: string;
        renewalSource?: "billing_webhook" | "admin_action" | "auto_renewal";
    };
}, {
    eventType?: "marketplace.license.renewed";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        previousValidUntil?: string;
        newValidUntil?: string;
        renewedByUserId?: string;
        renewalSource?: "billing_webhook" | "admin_action" | "auto_renewal";
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.entitlement.assigned">;
    data: z.ZodObject<{
        entitlementId: z.ZodString;
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        loId: z.ZodString;
        marketplaceItemId: z.ZodString;
        allowedGradeBands: z.ZodArray<z.ZodString, "many">;
        allowedSchoolIds: z.ZodArray<z.ZodString, "many">;
        assignedByUserId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        entitlementId?: string;
        allowedGradeBands?: string[];
        allowedSchoolIds?: string[];
        assignedByUserId?: string;
    }, {
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        entitlementId?: string;
        allowedGradeBands?: string[];
        allowedSchoolIds?: string[];
        assignedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.entitlement.assigned";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        entitlementId?: string;
        allowedGradeBands?: string[];
        allowedSchoolIds?: string[];
        assignedByUserId?: string;
    };
}, {
    eventType?: "marketplace.entitlement.assigned";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        entitlementId?: string;
        allowedGradeBands?: string[];
        allowedSchoolIds?: string[];
        assignedByUserId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.entitlement.revoked">;
    data: z.ZodObject<{
        entitlementId: z.ZodString;
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        loId: z.ZodString;
        reason: z.ZodString;
        revokedByUserId: z.ZodNullable<z.ZodString>;
        revocationSource: z.ZodEnum<["license_expired", "license_canceled", "admin_action", "scope_changed"]>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        reason?: string;
        loId?: string;
        licenseId?: string;
        entitlementId?: string;
        revokedByUserId?: string;
        revocationSource?: "admin_action" | "license_expired" | "license_canceled" | "scope_changed";
    }, {
        tenantId?: string;
        reason?: string;
        loId?: string;
        licenseId?: string;
        entitlementId?: string;
        revokedByUserId?: string;
        revocationSource?: "admin_action" | "license_expired" | "license_canceled" | "scope_changed";
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.entitlement.revoked";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        loId?: string;
        licenseId?: string;
        entitlementId?: string;
        revokedByUserId?: string;
        revocationSource?: "admin_action" | "license_expired" | "license_canceled" | "scope_changed";
    };
}, {
    eventType?: "marketplace.entitlement.revoked";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        loId?: string;
        licenseId?: string;
        entitlementId?: string;
        revokedByUserId?: string;
        revocationSource?: "admin_action" | "license_expired" | "license_canceled" | "scope_changed";
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.seat.assigned">;
    data: z.ZodObject<{
        seatAssignmentId: z.ZodString;
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        learnerId: z.ZodString;
        marketplaceItemId: z.ZodString;
        schoolId: z.ZodNullable<z.ZodString>;
        classroomId: z.ZodNullable<z.ZodString>;
        seatsUsedAfter: z.ZodNumber;
        seatLimit: z.ZodNullable<z.ZodNumber>;
        assignedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatLimit?: number;
        assignedByUserId?: string;
        seatAssignmentId?: string;
        schoolId?: string;
        classroomId?: string;
        seatsUsedAfter?: number;
    }, {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatLimit?: number;
        assignedByUserId?: string;
        seatAssignmentId?: string;
        schoolId?: string;
        classroomId?: string;
        seatsUsedAfter?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.seat.assigned";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatLimit?: number;
        assignedByUserId?: string;
        seatAssignmentId?: string;
        schoolId?: string;
        classroomId?: string;
        seatsUsedAfter?: number;
    };
}, {
    eventType?: "marketplace.seat.assigned";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatLimit?: number;
        assignedByUserId?: string;
        seatAssignmentId?: string;
        schoolId?: string;
        classroomId?: string;
        seatsUsedAfter?: number;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.seat.released">;
    data: z.ZodObject<{
        seatAssignmentId: z.ZodString;
        licenseId: z.ZodString;
        tenantId: z.ZodString;
        learnerId: z.ZodString;
        marketplaceItemId: z.ZodString;
        seatsUsedAfter: z.ZodNumber;
        releaseReason: z.ZodString;
        releasedByUserId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatAssignmentId?: string;
        seatsUsedAfter?: number;
        releaseReason?: string;
        releasedByUserId?: string;
    }, {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatAssignmentId?: string;
        seatsUsedAfter?: number;
        releaseReason?: string;
        releasedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.seat.released";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatAssignmentId?: string;
        seatsUsedAfter?: number;
        releaseReason?: string;
        releasedByUserId?: string;
    };
}, {
    eventType?: "marketplace.seat.released";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        marketplaceItemId?: string;
        licenseId?: string;
        seatAssignmentId?: string;
        seatsUsedAfter?: number;
        releaseReason?: string;
        releasedByUserId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.pack.usage">;
    data: z.ZodObject<{
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        vendorId: z.ZodString;
        loId: z.ZodString;
        learnerId: z.ZodString;
        sessionId: z.ZodString;
        schoolId: z.ZodNullable<z.ZodString>;
        classroomId: z.ZodNullable<z.ZodString>;
        subject: z.ZodString;
        gradeBand: z.ZodString;
        durationSeconds: z.ZodNumber;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        tenantId?: string;
        subject?: string;
        sessionId?: string;
        gradeBand?: string;
        completedAt?: string;
        loId?: string;
        vendorId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        durationSeconds?: number;
    }, {
        learnerId?: string;
        tenantId?: string;
        subject?: string;
        sessionId?: string;
        gradeBand?: string;
        completedAt?: string;
        loId?: string;
        vendorId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        durationSeconds?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.pack.usage";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        subject?: string;
        sessionId?: string;
        gradeBand?: string;
        completedAt?: string;
        loId?: string;
        vendorId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        durationSeconds?: number;
    };
}, {
    eventType?: "marketplace.pack.usage";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        subject?: string;
        sessionId?: string;
        gradeBand?: string;
        completedAt?: string;
        loId?: string;
        vendorId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        durationSeconds?: number;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.entitlement.check_failed">;
    data: z.ZodObject<{
        tenantId: z.ZodString;
        loId: z.ZodNullable<z.ZodString>;
        marketplaceItemId: z.ZodNullable<z.ZodString>;
        learnerId: z.ZodNullable<z.ZodString>;
        schoolId: z.ZodNullable<z.ZodString>;
        classroomId: z.ZodNullable<z.ZodString>;
        failureReason: z.ZodEnum<["NO_LICENSE", "LICENSE_EXPIRED", "LICENSE_SUSPENDED", "SCOPE_MISMATCH", "SEAT_LIMIT_EXCEEDED", "LEARNER_NOT_COVERED"]>;
        requestedByService: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        learnerId?: string;
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        failureReason?: "NO_LICENSE" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED" | "SCOPE_MISMATCH" | "SEAT_LIMIT_EXCEEDED" | "LEARNER_NOT_COVERED";
        requestedByService?: string;
    }, {
        learnerId?: string;
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        failureReason?: "NO_LICENSE" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED" | "SCOPE_MISMATCH" | "SEAT_LIMIT_EXCEEDED" | "LEARNER_NOT_COVERED";
        requestedByService?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.entitlement.check_failed";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        failureReason?: "NO_LICENSE" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED" | "SCOPE_MISMATCH" | "SEAT_LIMIT_EXCEEDED" | "LEARNER_NOT_COVERED";
        requestedByService?: string;
    };
}, {
    eventType?: "marketplace.entitlement.check_failed";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        learnerId?: string;
        tenantId?: string;
        loId?: string;
        marketplaceItemId?: string;
        schoolId?: string;
        classroomId?: string;
        failureReason?: "NO_LICENSE" | "LICENSE_EXPIRED" | "LICENSE_SUSPENDED" | "SCOPE_MISMATCH" | "SEAT_LIMIT_EXCEEDED" | "LEARNER_NOT_COVERED";
        requestedByService?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.installation.created">;
    data: z.ZodObject<{
        installationId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        marketplaceItemSlug: z.ZodString;
        versionId: z.ZodString;
        schoolId: z.ZodNullable<z.ZodString>;
        classroomId: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["PENDING_APPROVAL", "ACTIVE", "DISABLED", "REVOKED"]>;
        installedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status?: "ACTIVE" | "PENDING_APPROVAL" | "DISABLED" | "REVOKED";
        tenantId?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        schoolId?: string;
        classroomId?: string;
        installationId?: string;
        installedByUserId?: string;
    }, {
        status?: "ACTIVE" | "PENDING_APPROVAL" | "DISABLED" | "REVOKED";
        tenantId?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        schoolId?: string;
        classroomId?: string;
        installationId?: string;
        installedByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.installation.created";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        status?: "ACTIVE" | "PENDING_APPROVAL" | "DISABLED" | "REVOKED";
        tenantId?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        schoolId?: string;
        classroomId?: string;
        installationId?: string;
        installedByUserId?: string;
    };
}, {
    eventType?: "marketplace.installation.created";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        status?: "ACTIVE" | "PENDING_APPROVAL" | "DISABLED" | "REVOKED";
        tenantId?: string;
        versionId?: string;
        marketplaceItemId?: string;
        marketplaceItemSlug?: string;
        schoolId?: string;
        classroomId?: string;
        installationId?: string;
        installedByUserId?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.installation.approved">;
    data: z.ZodObject<{
        installationId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        approvedByUserId: z.ZodString;
        approvalNotes: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        approvedByUserId?: string;
        marketplaceItemId?: string;
        installationId?: string;
        approvalNotes?: string;
    }, {
        tenantId?: string;
        approvedByUserId?: string;
        marketplaceItemId?: string;
        installationId?: string;
        approvalNotes?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.installation.approved";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        approvedByUserId?: string;
        marketplaceItemId?: string;
        installationId?: string;
        approvalNotes?: string;
    };
}, {
    eventType?: "marketplace.installation.approved";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        approvedByUserId?: string;
        marketplaceItemId?: string;
        installationId?: string;
        approvalNotes?: string;
    };
}>, z.ZodObject<{
    id: z.ZodString;
    occurredAt: z.ZodString;
    source: z.ZodLiteral<"marketplace-svc">;
} & {
    eventType: z.ZodLiteral<"marketplace.installation.revoked">;
    data: z.ZodObject<{
        installationId: z.ZodString;
        tenantId: z.ZodString;
        marketplaceItemId: z.ZodString;
        reason: z.ZodString;
        revokedByUserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        revokedByUserId?: string;
        installationId?: string;
    }, {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        revokedByUserId?: string;
        installationId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    eventType?: "marketplace.installation.revoked";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        revokedByUserId?: string;
        installationId?: string;
    };
}, {
    eventType?: "marketplace.installation.revoked";
    source?: "marketplace-svc";
    id?: string;
    occurredAt?: string;
    data?: {
        tenantId?: string;
        reason?: string;
        marketplaceItemId?: string;
        revokedByUserId?: string;
        installationId?: string;
    };
}>]>;
export type VendorApprovedEventType = z.infer<typeof VendorApprovedEvent>;
export type VendorSuspendedEventType = z.infer<typeof VendorSuspendedEvent>;
export type PackPublishedEventType = z.infer<typeof PackPublishedEvent>;
export type PackDeprecatedEventType = z.infer<typeof PackDeprecatedEvent>;
export type LicenseCreatedEventType = z.infer<typeof LicenseCreatedEvent>;
export type LicenseActivatedEventType = z.infer<typeof LicenseActivatedEvent>;
export type LicenseSuspendedEventType = z.infer<typeof LicenseSuspendedEvent>;
export type LicenseExpiredEventType = z.infer<typeof LicenseExpiredEvent>;
export type LicenseCanceledEventType = z.infer<typeof LicenseCanceledEvent>;
export type LicenseRenewedEventType = z.infer<typeof LicenseRenewedEvent>;
export type EntitlementAssignedEventType = z.infer<typeof EntitlementAssignedEvent>;
export type EntitlementRevokedEventType = z.infer<typeof EntitlementRevokedEvent>;
export type SeatAssignedEventType = z.infer<typeof SeatAssignedEvent>;
export type SeatReleasedEventType = z.infer<typeof SeatReleasedEvent>;
export type PartnerContentUsageEventType = z.infer<typeof PartnerContentUsageEvent>;
export type EntitlementCheckFailedEventType = z.infer<typeof EntitlementCheckFailedEvent>;
export type InstallationCreatedEventType = z.infer<typeof InstallationCreatedEvent>;
export type InstallationApprovedEventType = z.infer<typeof InstallationApprovedEvent>;
export type InstallationRevokedEventType = z.infer<typeof InstallationRevokedEvent>;
export type MarketplaceEventType = z.infer<typeof MarketplaceEvent>;
export declare const MARKETPLACE_SUBJECTS: {
    readonly VENDOR_APPROVED: "marketplace.vendor.approved";
    readonly VENDOR_SUSPENDED: "marketplace.vendor.suspended";
    readonly PACK_PUBLISHED: "marketplace.pack.published";
    readonly PACK_DEPRECATED: "marketplace.pack.deprecated";
    readonly LICENSE_CREATED: "marketplace.license.created";
    readonly LICENSE_ACTIVATED: "marketplace.license.activated";
    readonly LICENSE_SUSPENDED: "marketplace.license.suspended";
    readonly LICENSE_EXPIRED: "marketplace.license.expired";
    readonly LICENSE_CANCELED: "marketplace.license.canceled";
    readonly LICENSE_RENEWED: "marketplace.license.renewed";
    readonly ENTITLEMENT_ASSIGNED: "marketplace.entitlement.assigned";
    readonly ENTITLEMENT_REVOKED: "marketplace.entitlement.revoked";
    readonly SEAT_ASSIGNED: "marketplace.seat.assigned";
    readonly SEAT_RELEASED: "marketplace.seat.released";
    readonly PACK_USAGE: "marketplace.pack.usage";
    readonly ENTITLEMENT_CHECK_FAILED: "marketplace.entitlement.check_failed";
    readonly INSTALLATION_CREATED: "marketplace.installation.created";
    readonly INSTALLATION_APPROVED: "marketplace.installation.approved";
    readonly INSTALLATION_REVOKED: "marketplace.installation.revoked";
};
//# sourceMappingURL=marketplace.d.ts.map