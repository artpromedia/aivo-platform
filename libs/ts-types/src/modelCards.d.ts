/**
 * Model Card Types for AI Transparency
 *
 * Types for model cards that document AI capabilities, limitations,
 * and safety considerations for platform and district administrators.
 */
export type ModelProvider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'INTERNAL' | 'META' | 'MISTRAL' | 'COHERE';
export declare const MODEL_PROVIDERS: ModelProvider[];
/**
 * Model card metadata stored in JSONB
 */
export interface ModelCardMetadata {
    /** Semantic version of the model */
    version?: string;
    /** Base model used (if applicable) */
    baseModel?: string;
    /** Context window size in tokens */
    context_window?: number;
    /** Features this model supports */
    features?: string[];
    /** Algorithm types used */
    algorithms?: string[];
    /** Model type (e.g., 'hybrid', 'transformer') */
    type?: string;
    /** Framework alignment (e.g., 'CASEL' for SEL) */
    framework?: string;
    /** Additional custom fields */
    [key: string]: unknown;
}
/**
 * Full model card entity
 */
export interface ModelCard {
    id: string;
    modelKey: string;
    provider: ModelProvider;
    displayName: string;
    description: string;
    intendedUseCases: string;
    limitations: string;
    safetyConsiderations: string;
    inputTypes: string;
    outputTypes: string;
    dataSourcesSummary: string;
    lastReviewedAt: string;
    lastReviewedBy?: string | null;
    metadataJson: ModelCardMetadata;
    createdAt: string;
    updatedAt: string;
}
/**
 * Model card summary for list views
 */
export interface ModelCardSummary {
    id: string;
    modelKey: string;
    provider: ModelProvider;
    displayName: string;
    description: string;
    intendedUseCases: string;
    lastReviewedAt: string;
}
/**
 * Assignment of a model to a tenant for a specific feature
 */
export interface TenantModelAssignment {
    id: string;
    tenantId: string;
    modelCardId: string;
    featureKey: string;
    isActive: boolean;
    assignedAt: string;
    assignedBy?: string | null;
}
/**
 * Model card with tenant context
 */
export interface TenantModelCard extends ModelCard {
    featureKey: string;
    isActive: boolean;
}
/**
 * Response for listing all model cards
 */
export interface ListModelCardsResponse {
    modelCards: ModelCardSummary[];
    total: number;
}
/**
 * Response for getting a single model card
 */
export interface GetModelCardResponse {
    modelCard: ModelCard;
}
/**
 * Response for tenant-specific model cards
 */
export interface TenantModelCardsResponse {
    tenantId: string;
    modelCards: TenantModelCard[];
    total: number;
}
/**
 * Parsed "Best for" and "Not appropriate for" sections
 */
export interface ParsedUseCases {
    bestFor: string[];
    notAppropriateFor: string[];
}
/**
 * Parsed safety section with disclaimer
 */
export interface ParsedSafety {
    measures: string[];
    disclaimer?: string | undefined;
}
/**
 * Provider display information
 */
export declare const PROVIDER_DISPLAY: Record<ModelProvider, {
    name: string;
    color: string;
}>;
/**
 * Parse intended use cases into structured format
 */
export declare function parseUseCases(intendedUseCases: string, limitations: string): ParsedUseCases;
/**
 * Parse safety considerations into structured format
 */
export declare function parseSafety(safetyConsiderations: string): ParsedSafety;
//# sourceMappingURL=modelCards.d.ts.map