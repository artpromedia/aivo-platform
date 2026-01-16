/**
 * AIVO Model Registry Service - Type Definitions
 */

// ══════════════════════════════════════════════════════════════════════════════
// AUTH TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface JwtPayload {
  sub: string;        // User ID
  tenantId: string;
  email?: string;
  roles: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS (matching Prisma)
// ══════════════════════════════════════════════════════════════════════════════

export type ModelStage =
  | 'DRAFT'
  | 'VALIDATION'
  | 'STAGING'
  | 'PRODUCTION'
  | 'ARCHIVED'
  | 'DEPRECATED';

export type ModelFramework =
  | 'PYTORCH'
  | 'TENSORFLOW'
  | 'ONNX'
  | 'SKLEARN'
  | 'XGBOOST'
  | 'LIGHTGBM'
  | 'HUGGINGFACE'
  | 'OPENAI'
  | 'ANTHROPIC'
  | 'CUSTOM';

export type ModelTask =
  | 'TEXT_CLASSIFICATION'
  | 'TEXT_GENERATION'
  | 'TEXT_EMBEDDING'
  | 'QUESTION_ANSWERING'
  | 'SUMMARIZATION'
  | 'TRANSLATION'
  | 'SENTIMENT_ANALYSIS'
  | 'NER'
  | 'IMAGE_CLASSIFICATION'
  | 'OBJECT_DETECTION'
  | 'SPEECH_TO_TEXT'
  | 'TEXT_TO_SPEECH'
  | 'RECOMMENDATION'
  | 'REGRESSION'
  | 'CLUSTERING'
  | 'CUSTOM';

export type ArtifactType =
  | 'MODEL_WEIGHTS'
  | 'CONFIG'
  | 'TOKENIZER'
  | 'VOCABULARY'
  | 'METADATA'
  | 'ONNX_EXPORT'
  | 'TENSORRT'
  | 'CHECKPOINT'
  | 'EVALUATION'
  | 'SAMPLE_DATA';

export type DeploymentStatus =
  | 'PENDING'
  | 'DEPLOYING'
  | 'RUNNING'
  | 'FAILED'
  | 'STOPPED'
  | 'SCALING';

export type DeploymentEnv =
  | 'DEVELOPMENT'
  | 'STAGING'
  | 'PRODUCTION';

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - MODELS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateModelInput {
  name: string;
  displayName: string;
  description?: string;
  framework: ModelFramework;
  task: ModelTask;
  tags?: string[];
  teamId?: string;
  isPublic?: boolean;
  allowFineTune?: boolean;
}

export interface UpdateModelInput {
  displayName?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  allowFineTune?: boolean;
}

export interface ListModelsQuery {
  framework?: ModelFramework;
  task?: ModelTask;
  tags?: string[];
  ownerId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - VERSIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateVersionInput {
  version?: string;       // If not provided, auto-increment
  description?: string;
  changelog?: string;
  parentVersionId?: string;
  sourceType?: string;
  trainingJobId?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  hyperparameters?: Record<string, unknown>;
  modelConfig?: Record<string, unknown>;
}

export interface UpdateVersionInput {
  description?: string;
  changelog?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface TransitionStageInput {
  targetStage: ModelStage;
  notes?: string;
}

export interface ListVersionsQuery {
  stage?: ModelStage;
  page?: number;
  pageSize?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - ARTIFACTS
// ══════════════════════════════════════════════════════════════════════════════

export interface InitiateUploadInput {
  type: ArtifactType;
  name: string;
  description?: string;
  sizeBytes: number;
  checksum: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface CompleteUploadInput {
  artifactId: string;
}

export interface UploadUrlResponse {
  artifactId: string;
  uploadUrl: string;
  expiresAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - DEPLOYMENTS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateDeploymentInput {
  name: string;
  versionId: string;
  environment: DeploymentEnv;
  instanceType?: string;
  replicas?: number;
  minReplicas?: number;
  maxReplicas?: number;
  config?: Record<string, unknown>;
}

export interface UpdateDeploymentInput {
  replicas?: number;
  minReplicas?: number;
  maxReplicas?: number;
  config?: Record<string, unknown>;
}

export interface ListDeploymentsQuery {
  modelId?: string;
  versionId?: string;
  environment?: DeploymentEnv;
  status?: DeploymentStatus;
  page?: number;
  pageSize?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - METRICS
// ══════════════════════════════════════════════════════════════════════════════

export interface RecordMetricInput {
  name: string;
  category: string;
  value: number;
  unit?: string;
  datasetId?: string;
  datasetName?: string;
  splitName?: string;
  evaluationConfig?: Record<string, unknown>;
}

export interface ListMetricsQuery {
  name?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════════════════════════

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
