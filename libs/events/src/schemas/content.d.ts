import { z } from 'zod';
export declare const CONTENT_EVENT_TYPES: {
    /** Learning object published and available */
    readonly CONTENT_PUBLISHED: "content.published";
    /** Learning object retired/unpublished */
    readonly CONTENT_RETIRED: "content.retired";
    /** New version created */
    readonly VERSION_CREATED: "content.version.created";
    /** Version submitted for review */
    readonly VERSION_SUBMITTED: "content.version.submitted";
    /** Version approved by reviewer */
    readonly VERSION_APPROVED: "content.version.approved";
    /** Version changes requested */
    readonly VERSION_CHANGES_REQUESTED: "content.version.changes_requested";
    /** Version rejected */
    readonly VERSION_REJECTED: "content.version.rejected";
    /** Ingestion job started */
    readonly INGESTION_STARTED: "content.ingestion.started";
    /** Ingestion job completed */
    readonly INGESTION_COMPLETED: "content.ingestion.completed";
    /** Ingestion job failed */
    readonly INGESTION_FAILED: "content.ingestion.failed";
};
export type ContentEventType = (typeof CONTENT_EVENT_TYPES)[keyof typeof CONTENT_EVENT_TYPES];
export declare const ContentPublishedSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"content.published">;
    payload: z.ZodObject<{
        /** Learning object ID */
        loId: z.ZodString;
        /** Version ID that was published */
        versionId: z.ZodString;
        /** Version number */
        versionNumber: z.ZodNumber;
        /** Content slug */
        slug: z.ZodString;
        /** Subject area */
        subject: z.ZodEnum<["ELA", "MATH", "SCIENCE", "SEL", "SPEECH", "OTHER"]>;
        /** Grade band */
        gradeBand: z.ZodEnum<["K_2", "G3_5", "G6_8", "G9_12"]>;
        /** User who published */
        publishedByUserId: z.ZodString;
        /** Tenant ID (null for global catalog) */
        tenantId: z.ZodNullable<z.ZodString>;
        /** Primary skill alignment */
        primarySkillId: z.ZodNullable<z.ZodString>;
        /** Tags for discovery */
        tags: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        tenantId?: string;
        subject?: "ELA" | "MATH" | "SCIENCE" | "SEL" | "SPEECH" | "OTHER";
        gradeBand?: "K_2" | "G3_5" | "G6_8" | "G9_12";
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        slug?: string;
        publishedByUserId?: string;
        primarySkillId?: string;
        tags?: string[];
    }, {
        tenantId?: string;
        subject?: "ELA" | "MATH" | "SCIENCE" | "SEL" | "SPEECH" | "OTHER";
        gradeBand?: "K_2" | "G3_5" | "G6_8" | "G9_12";
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        slug?: string;
        publishedByUserId?: string;
        primarySkillId?: string;
        tags?: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        tenantId?: string;
        subject?: "ELA" | "MATH" | "SCIENCE" | "SEL" | "SPEECH" | "OTHER";
        gradeBand?: "K_2" | "G3_5" | "G6_8" | "G9_12";
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        slug?: string;
        publishedByUserId?: string;
        primarySkillId?: string;
        tags?: string[];
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.published";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        tenantId?: string;
        subject?: "ELA" | "MATH" | "SCIENCE" | "SEL" | "SPEECH" | "OTHER";
        gradeBand?: "K_2" | "G3_5" | "G6_8" | "G9_12";
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        slug?: string;
        publishedByUserId?: string;
        primarySkillId?: string;
        tags?: string[];
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.published";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export declare const ContentRetiredSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"content.retired">;
    payload: z.ZodObject<{
        /** Learning object ID */
        loId: z.ZodString;
        /** Content slug */
        slug: z.ZodString;
        /** User who retired the content */
        retiredByUserId: z.ZodString;
        /** Reason for retirement */
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        reason?: string;
        loId?: string;
        slug?: string;
        retiredByUserId?: string;
    }, {
        reason?: string;
        loId?: string;
        slug?: string;
        retiredByUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        reason?: string;
        loId?: string;
        slug?: string;
        retiredByUserId?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.retired";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        reason?: string;
        loId?: string;
        slug?: string;
        retiredByUserId?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.retired";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export declare const VersionCreatedSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"content.version.created">;
    payload: z.ZodObject<{
        /** Learning object ID */
        loId: z.ZodString;
        /** New version ID */
        versionId: z.ZodString;
        /** Version number */
        versionNumber: z.ZodNumber;
        /** Previous version ID if any */
        previousVersionId: z.ZodNullable<z.ZodString>;
        /** User who created */
        createdByUserId: z.ZodString;
        /** Change summary */
        changeSummary: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        previousVersionId?: string;
        createdByUserId?: string;
        changeSummary?: string;
    }, {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        previousVersionId?: string;
        createdByUserId?: string;
        changeSummary?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        previousVersionId?: string;
        createdByUserId?: string;
        changeSummary?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.version.created";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        previousVersionId?: string;
        createdByUserId?: string;
        changeSummary?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.version.created";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export declare const VersionSubmittedSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"content.version.submitted">;
    payload: z.ZodObject<{
        /** Learning object ID */
        loId: z.ZodString;
        /** Version ID */
        versionId: z.ZodString;
        /** Version number */
        versionNumber: z.ZodNumber;
        /** User who submitted */
        submittedByUserId: z.ZodString;
        /** Content title for notification context */
        title: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        submittedByUserId?: string;
        title?: string;
    }, {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        submittedByUserId?: string;
        title?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        submittedByUserId?: string;
        title?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.version.submitted";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        submittedByUserId?: string;
        title?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.version.submitted";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export declare const VersionApprovedSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"content.version.approved">;
    payload: z.ZodObject<{
        /** Learning object ID */
        loId: z.ZodString;
        /** Version ID */
        versionId: z.ZodString;
        /** Version number */
        versionNumber: z.ZodNumber;
        /** Reviewer user ID */
        reviewerUserId: z.ZodString;
        /** Review comments */
        comments: z.ZodOptional<z.ZodString>;
        /** Whether auto-published */
        autoPublished: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        reviewerUserId?: string;
        comments?: string;
        autoPublished?: boolean;
    }, {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        reviewerUserId?: string;
        comments?: string;
        autoPublished?: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        reviewerUserId?: string;
        comments?: string;
        autoPublished?: boolean;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.version.approved";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        reviewerUserId?: string;
        comments?: string;
        autoPublished?: boolean;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.version.approved";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export declare const VersionChangesRequestedSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"content.version.changes_requested">;
    payload: z.ZodObject<{
        /** Learning object ID */
        loId: z.ZodString;
        /** Version ID */
        versionId: z.ZodString;
        /** Version number */
        versionNumber: z.ZodNumber;
        /** Reviewer user ID */
        reviewerUserId: z.ZodString;
        /** Review comments explaining changes */
        comments: z.ZodString;
        /** Validation errors found */
        validationErrors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        reviewerUserId?: string;
        comments?: string;
        validationErrors?: string[];
    }, {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        reviewerUserId?: string;
        comments?: string;
        validationErrors?: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        reviewerUserId?: string;
        comments?: string;
        validationErrors?: string[];
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.version.changes_requested";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        reviewerUserId?: string;
        comments?: string;
        validationErrors?: string[];
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.version.changes_requested";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export declare const VersionRejectedSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"content.version.rejected">;
    payload: z.ZodObject<{
        /** Learning object ID */
        loId: z.ZodString;
        /** Version ID */
        versionId: z.ZodString;
        /** Version number */
        versionNumber: z.ZodNumber;
        /** Reviewer user ID */
        reviewerUserId: z.ZodString;
        /** Rejection reason */
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        reason?: string;
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        reviewerUserId?: string;
    }, {
        reason?: string;
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        reviewerUserId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        reason?: string;
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        reviewerUserId?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.version.rejected";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        reason?: string;
        loId?: string;
        versionId?: string;
        versionNumber?: number;
        reviewerUserId?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.version.rejected";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export declare const IngestionStartedSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"content.ingestion.started">;
    payload: z.ZodObject<{
        /** Job ID */
        jobId: z.ZodString;
        /** Ingestion source */
        source: z.ZodEnum<["MANUAL", "FILE_CSV", "FILE_JSON", "AI_DRAFT"]>;
        /** User who started ingestion */
        userId: z.ZodString;
        /** Total rows/items to process */
        totalRows: z.ZodOptional<z.ZodNumber>;
        /** File URL if file-based */
        fileUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source?: "MANUAL" | "FILE_CSV" | "FILE_JSON" | "AI_DRAFT";
        jobId?: string;
        userId?: string;
        totalRows?: number;
        fileUrl?: string;
    }, {
        source?: "MANUAL" | "FILE_CSV" | "FILE_JSON" | "AI_DRAFT";
        jobId?: string;
        userId?: string;
        totalRows?: number;
        fileUrl?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        source?: "MANUAL" | "FILE_CSV" | "FILE_JSON" | "AI_DRAFT";
        jobId?: string;
        userId?: string;
        totalRows?: number;
        fileUrl?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.ingestion.started";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        source?: "MANUAL" | "FILE_CSV" | "FILE_JSON" | "AI_DRAFT";
        jobId?: string;
        userId?: string;
        totalRows?: number;
        fileUrl?: string;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.ingestion.started";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export declare const IngestionCompletedSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"content.ingestion.completed">;
    payload: z.ZodObject<{
        /** Job ID */
        jobId: z.ZodString;
        /** Ingestion source */
        source: z.ZodEnum<["MANUAL", "FILE_CSV", "FILE_JSON", "AI_DRAFT"]>;
        /** User who started ingestion */
        userId: z.ZodString;
        /** Total rows processed */
        totalRows: z.ZodNumber;
        /** Success count */
        successCount: z.ZodNumber;
        /** Error count */
        errorCount: z.ZodNumber;
        /** Created LO IDs */
        createdLoIds: z.ZodArray<z.ZodString, "many">;
        /** Duration in milliseconds */
        durationMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        source?: "MANUAL" | "FILE_CSV" | "FILE_JSON" | "AI_DRAFT";
        durationMs?: number;
        jobId?: string;
        userId?: string;
        totalRows?: number;
        successCount?: number;
        errorCount?: number;
        createdLoIds?: string[];
    }, {
        source?: "MANUAL" | "FILE_CSV" | "FILE_JSON" | "AI_DRAFT";
        durationMs?: number;
        jobId?: string;
        userId?: string;
        totalRows?: number;
        successCount?: number;
        errorCount?: number;
        createdLoIds?: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        source?: "MANUAL" | "FILE_CSV" | "FILE_JSON" | "AI_DRAFT";
        durationMs?: number;
        jobId?: string;
        userId?: string;
        totalRows?: number;
        successCount?: number;
        errorCount?: number;
        createdLoIds?: string[];
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.ingestion.completed";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        source?: "MANUAL" | "FILE_CSV" | "FILE_JSON" | "AI_DRAFT";
        durationMs?: number;
        jobId?: string;
        userId?: string;
        totalRows?: number;
        successCount?: number;
        errorCount?: number;
        createdLoIds?: string[];
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.ingestion.completed";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export declare const IngestionFailedSchema: z.ZodObject<{
    eventId: z.ZodString;
    tenantId: z.ZodString;
    eventVersion: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodObject<{
        service: z.ZodString;
        version: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version?: string;
        service?: string;
        instanceId?: string;
    }, {
        version?: string;
        service?: string;
        instanceId?: string;
    }>;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    eventType: z.ZodLiteral<"content.ingestion.failed">;
    payload: z.ZodObject<{
        /** Job ID */
        jobId: z.ZodString;
        /** Ingestion source */
        source: z.ZodEnum<["MANUAL", "FILE_CSV", "FILE_JSON", "AI_DRAFT"]>;
        /** User who started ingestion */
        userId: z.ZodString;
        /** Error message */
        error: z.ZodString;
        /** Processed rows before failure */
        processedRows: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        error?: string;
        source?: "MANUAL" | "FILE_CSV" | "FILE_JSON" | "AI_DRAFT";
        jobId?: string;
        userId?: string;
        processedRows?: number;
    }, {
        error?: string;
        source?: "MANUAL" | "FILE_CSV" | "FILE_JSON" | "AI_DRAFT";
        jobId?: string;
        userId?: string;
        processedRows?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    payload?: {
        error?: string;
        source?: "MANUAL" | "FILE_CSV" | "FILE_JSON" | "AI_DRAFT";
        jobId?: string;
        userId?: string;
        processedRows?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.ingestion.failed";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}, {
    payload?: {
        error?: string;
        source?: "MANUAL" | "FILE_CSV" | "FILE_JSON" | "AI_DRAFT";
        jobId?: string;
        userId?: string;
        processedRows?: number;
    };
    tenantId?: string;
    eventId?: string;
    eventType?: "content.ingestion.failed";
    eventVersion?: string;
    timestamp?: string;
    source?: {
        version?: string;
        service?: string;
        instanceId?: string;
    };
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
}>;
export type ContentPublished = z.infer<typeof ContentPublishedSchema>;
export type ContentRetired = z.infer<typeof ContentRetiredSchema>;
export type VersionCreated = z.infer<typeof VersionCreatedSchema>;
export type VersionSubmitted = z.infer<typeof VersionSubmittedSchema>;
export type VersionApproved = z.infer<typeof VersionApprovedSchema>;
export type VersionChangesRequested = z.infer<typeof VersionChangesRequestedSchema>;
export type VersionRejected = z.infer<typeof VersionRejectedSchema>;
export type IngestionStarted = z.infer<typeof IngestionStartedSchema>;
export type IngestionCompleted = z.infer<typeof IngestionCompletedSchema>;
export type IngestionFailed = z.infer<typeof IngestionFailedSchema>;
export type ContentEvent = ContentPublished | ContentRetired | VersionCreated | VersionSubmitted | VersionApproved | VersionChangesRequested | VersionRejected | IngestionStarted | IngestionCompleted | IngestionFailed;
//# sourceMappingURL=content.d.ts.map