/**
 * RLHF Fine-Tuning Job Manager
 *
 * Manages the end-to-end fine-tuning pipeline:
 * - Training data preparation and validation
 * - Job submission to OpenAI/Anthropic
 * - Progress monitoring and status tracking
 * - Model deployment and version management
 */

import type { Pool } from 'pg';
import type { Redis } from 'ioredis';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export type FineTuningProvider = 'openai' | 'anthropic';

export type FineTuningJobStatus =
  | 'pending'
  | 'validating'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export interface FineTuningJobConfig {
  provider: FineTuningProvider;
  baseModel: string;
  trainingDataQuery: TrainingDataQuery;
  hyperparameters?: HyperParameters;
  validationSplit?: number;
  suffix?: string;
  metadata?: Record<string, string>;
}

export interface TrainingDataQuery {
  minQualityScore?: number;
  agentTypes?: string[];
  taskCategories?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  excludeExported?: boolean;
}

export interface HyperParameters {
  // OpenAI parameters
  nEpochs?: number;
  batchSize?: number;
  learningRateMultiplier?: number;

  // General parameters
  warmupRatio?: number;
  weightDecay?: number;
}

export interface FineTuningJob {
  id: string;
  provider: FineTuningProvider;
  providerJobId: string | null;
  baseModel: string;
  fineTunedModel: string | null;
  status: FineTuningJobStatus;
  trainingFileId: string | null;
  validationFileId: string | null;
  trainingExampleCount: number;
  validationExampleCount: number;
  hyperparameters: HyperParameters;
  metrics: TrainingMetrics | null;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  metadata: Record<string, string>;
}

export interface TrainingMetrics {
  trainingLoss: number;
  validationLoss?: number;
  trainingAccuracy?: number;
  validationAccuracy?: number;
  epochsCompleted: number;
  stepsCompleted: number;
  estimatedTimeRemaining?: number;
}

export interface FineTunedModel {
  id: string;
  provider: FineTuningProvider;
  providerModelId: string;
  baseModel: string;
  displayName: string;
  description: string | null;
  status: 'active' | 'deprecated' | 'deleted';
  jobId: string;
  trainingExamples: number;
  metrics: TrainingMetrics;
  deployedAt: Date | null;
  createdAt: Date;
  metadata: Record<string, string>;
}

export interface FineTuningManagerConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  defaultProvider: FineTuningProvider;
  pollIntervalMs: number;
  maxConcurrentJobs: number;
  autoDeployOnSuccess: boolean;
}

export const DEFAULT_FINE_TUNING_CONFIG: FineTuningManagerConfig = {
  defaultProvider: 'openai',
  pollIntervalMs: 60000, // 1 minute
  maxConcurrentJobs: 3,
  autoDeployOnSuccess: false,
};

// ════════════════════════════════════════════════════════════════════════════════
// PROVIDER INTERFACES
// ════════════════════════════════════════════════════════════════════════════════

interface ProviderJobInfo {
  id: string;
  status: string;
  fineTunedModel?: string;
  trainedTokens?: number;
  error?: string;
  metrics?: {
    trainingLoss?: number;
    validationLoss?: number;
  };
}

interface FineTuningProviderAdapter {
  uploadTrainingFile(data: string, purpose: string): Promise<string>;
  createFineTuningJob(
    trainingFileId: string,
    baseModel: string,
    hyperparameters: HyperParameters,
    validationFileId?: string,
    suffix?: string
  ): Promise<string>;
  getJobStatus(jobId: string): Promise<ProviderJobInfo>;
  cancelJob(jobId: string): Promise<void>;
  deleteModel(modelId: string): Promise<void>;
  listJobs(limit?: number): Promise<ProviderJobInfo[]>;
}

// ════════════════════════════════════════════════════════════════════════════════
// OPENAI PROVIDER ADAPTER
// ════════════════════════════════════════════════════════════════════════════════

class OpenAIFineTuningAdapter implements FineTuningProviderAdapter {
  constructor(private apiKey: string) {}

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`https://api.openai.com/v1${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(Array.isArray(options.headers)
          ? Object.fromEntries(options.headers)
          : options.headers),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } })) as { error?: { message?: string } };
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async uploadTrainingFile(data: string, purpose: string): Promise<string> {
    const formData = new FormData();
    formData.append('purpose', purpose);
    formData.append('file', new Blob([data], { type: 'application/jsonl' }), 'training.jsonl');

    const response = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } })) as { error?: { message?: string } };
      throw new Error(`OpenAI file upload error: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json() as { id: string };
    return result.id;
  }

  async createFineTuningJob(
    trainingFileId: string,
    baseModel: string,
    hyperparameters: HyperParameters,
    validationFileId?: string,
    suffix?: string
  ): Promise<string> {
    const body: Record<string, unknown> = {
      training_file: trainingFileId,
      model: baseModel,
    };

    if (validationFileId) {
      body.validation_file = validationFileId;
    }

    if (suffix) {
      body.suffix = suffix;
    }

    // Map hyperparameters to OpenAI format
    const openaiHyperparams: Record<string, unknown> = {};
    if (hyperparameters.nEpochs) openaiHyperparams.n_epochs = hyperparameters.nEpochs;
    if (hyperparameters.batchSize) openaiHyperparams.batch_size = hyperparameters.batchSize;
    if (hyperparameters.learningRateMultiplier) {
      openaiHyperparams.learning_rate_multiplier = hyperparameters.learningRateMultiplier;
    }

    if (Object.keys(openaiHyperparams).length > 0) {
      body.hyperparameters = openaiHyperparams;
    }

    const result = await this.request<{ id: string }>('/fine_tuning/jobs', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return result.id;
  }

  async getJobStatus(jobId: string): Promise<ProviderJobInfo> {
    const result = await this.request<{
      id: string;
      status: string;
      fine_tuned_model: string | null;
      trained_tokens: number | null;
      error: { message: string } | null;
      result_files: string[];
    }>(`/fine_tuning/jobs/${jobId}`);

    return {
      id: result.id,
      status: this.mapStatus(result.status),
      fineTunedModel: result.fine_tuned_model ?? undefined,
      trainedTokens: result.trained_tokens ?? undefined,
      error: result.error?.message,
    };
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.request(`/fine_tuning/jobs/${jobId}/cancel`, {
      method: 'POST',
    });
  }

  async deleteModel(modelId: string): Promise<void> {
    await this.request(`/models/${modelId}`, {
      method: 'DELETE',
    });
  }

  async listJobs(limit = 20): Promise<ProviderJobInfo[]> {
    const result = await this.request<{
      data: Array<{
        id: string;
        status: string;
        fine_tuned_model: string | null;
        trained_tokens: number | null;
        error: { message: string } | null;
      }>;
    }>(`/fine_tuning/jobs?limit=${limit}`);

    return result.data.map((job) => ({
      id: job.id,
      status: this.mapStatus(job.status),
      fineTunedModel: job.fine_tuned_model ?? undefined,
      trainedTokens: job.trained_tokens ?? undefined,
      error: job.error?.message,
    }));
  }

  private mapStatus(openaiStatus: string): string {
    const statusMap: Record<string, string> = {
      validating_files: 'validating',
      queued: 'queued',
      running: 'running',
      succeeded: 'succeeded',
      failed: 'failed',
      cancelled: 'cancelled',
    };
    return statusMap[openaiStatus] || openaiStatus;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// ANTHROPIC PROVIDER ADAPTER
// ════════════════════════════════════════════════════════════════════════════════

class AnthropicFineTuningAdapter implements FineTuningProviderAdapter {
  constructor(private apiKey: string) {}

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Note: Anthropic fine-tuning API is not yet publicly available
    // This is a placeholder implementation based on expected API structure
    const response = await fetch(`https://api.anthropic.com/v1${endpoint}`, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2024-01-01',
        'Content-Type': 'application/json',
        ...(Array.isArray(options.headers)
          ? Object.fromEntries(options.headers)
          : options.headers),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } })) as { error?: { message?: string } };
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async uploadTrainingFile(data: string, _purpose: string): Promise<string> {
    // Anthropic fine-tuning file upload (placeholder)
    const result = await this.request<{ id: string }>('/files', {
      method: 'POST',
      body: JSON.stringify({
        content: data,
        purpose: 'fine-tune',
      }),
    });
    return result.id;
  }

  async createFineTuningJob(
    trainingFileId: string,
    baseModel: string,
    hyperparameters: HyperParameters,
    validationFileId?: string,
    suffix?: string
  ): Promise<string> {
    const result = await this.request<{ id: string }>('/fine_tuning/jobs', {
      method: 'POST',
      body: JSON.stringify({
        training_file: trainingFileId,
        model: baseModel,
        validation_file: validationFileId,
        suffix,
        hyperparameters: {
          epochs: hyperparameters.nEpochs,
          batch_size: hyperparameters.batchSize,
          learning_rate: hyperparameters.learningRateMultiplier,
        },
      }),
    });
    return result.id;
  }

  async getJobStatus(jobId: string): Promise<ProviderJobInfo> {
    const result = await this.request<{
      id: string;
      status: string;
      fine_tuned_model?: string;
      error?: string;
      metrics?: { training_loss?: number; validation_loss?: number };
    }>(`/fine_tuning/jobs/${jobId}`);

    return {
      id: result.id,
      status: result.status,
      fineTunedModel: result.fine_tuned_model,
      error: result.error,
      metrics: result.metrics,
    };
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.request(`/fine_tuning/jobs/${jobId}/cancel`, {
      method: 'POST',
    });
  }

  async deleteModel(modelId: string): Promise<void> {
    await this.request(`/models/${modelId}`, {
      method: 'DELETE',
    });
  }

  async listJobs(limit = 20): Promise<ProviderJobInfo[]> {
    const result = await this.request<{
      data: Array<{
        id: string;
        status: string;
        fine_tuned_model?: string;
        error?: string;
      }>;
    }>(`/fine_tuning/jobs?limit=${limit}`);

    return result.data.map((job) => ({
      id: job.id,
      status: job.status,
      fineTunedModel: job.fine_tuned_model,
      error: job.error,
    }));
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// FINE-TUNING MANAGER
// ════════════════════════════════════════════════════════════════════════════════

export class FineTuningManager {
  private providers: Map<FineTuningProvider, FineTuningProviderAdapter> = new Map();
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private db: Pool,
    private redis: Redis,
    private config: FineTuningManagerConfig = DEFAULT_FINE_TUNING_CONFIG
  ) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    if (this.config.openaiApiKey) {
      this.providers.set('openai', new OpenAIFineTuningAdapter(this.config.openaiApiKey));
    }
    if (this.config.anthropicApiKey) {
      this.providers.set('anthropic', new AnthropicFineTuningAdapter(this.config.anthropicApiKey));
    }
  }

  private getProvider(provider: FineTuningProvider): FineTuningProviderAdapter {
    const adapter = this.providers.get(provider);
    if (!adapter) {
      throw new Error(`Provider ${provider} not configured. Please provide API key.`);
    }
    return adapter;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Job Management
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new fine-tuning job
   */
  async createJob(config: FineTuningJobConfig): Promise<FineTuningJob> {
    const provider = this.getProvider(config.provider);

    // Check concurrent job limit
    const activeJobs = await this.getActiveJobCount();
    if (activeJobs >= this.config.maxConcurrentJobs) {
      throw new Error(
        `Maximum concurrent jobs (${this.config.maxConcurrentJobs}) reached. ` +
          `Wait for existing jobs to complete or cancel them.`
      );
    }

    // Prepare training data
    const { trainingData, validationData } = await this.prepareTrainingData(
      config.trainingDataQuery,
      config.validationSplit || 0.1
    );

    if (trainingData.length < 10) {
      throw new Error(`Insufficient training examples: ${trainingData.length}. Minimum 10 required.`);
    }

    // Create job record
    const jobResult = await this.db.query(
      `
      INSERT INTO fine_tuning_jobs (
        provider, base_model, status, training_example_count,
        validation_example_count, hyperparameters, metadata
      )
      VALUES ($1, $2, 'pending', $3, $4, $5, $6)
      RETURNING *
    `,
      [
        config.provider,
        config.baseModel,
        trainingData.length,
        validationData.length,
        JSON.stringify(config.hyperparameters || {}),
        JSON.stringify(config.metadata || {}),
      ]
    );

    const job = this.mapJobRow(jobResult.rows[0]);

    try {
      // Upload training file
      const trainingFileId = await provider.uploadTrainingFile(
        this.formatTrainingData(trainingData, config.provider),
        'fine-tune'
      );

      // Upload validation file if we have validation data
      let validationFileId: string | undefined;
      if (validationData.length > 0) {
        validationFileId = await provider.uploadTrainingFile(
          this.formatTrainingData(validationData, config.provider),
          'fine-tune'
        );
      }

      // Create fine-tuning job with provider
      const providerJobId = await provider.createFineTuningJob(
        trainingFileId,
        config.baseModel,
        config.hyperparameters || {},
        validationFileId,
        config.suffix
      );

      // Update job with provider info
      await this.db.query(
        `
        UPDATE fine_tuning_jobs
        SET
          provider_job_id = $1,
          training_file_id = $2,
          validation_file_id = $3,
          status = 'queued',
          started_at = NOW()
        WHERE id = $4
      `,
        [providerJobId, trainingFileId, validationFileId, job.id]
      );

      // Mark training examples as exported
      await this.markExamplesExported(config.trainingDataQuery, job.id);

      // Start polling if not already running
      this.startPolling();

      return {
        ...job,
        providerJobId,
        trainingFileId,
        validationFileId: validationFileId || null,
        status: 'queued',
        startedAt: new Date(),
      };
    } catch (error) {
      // Update job status to failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.db.query(
        `
        UPDATE fine_tuning_jobs
        SET status = 'failed', error = $1
        WHERE id = $2
      `,
        [errorMessage, job.id]
      );

      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<FineTuningJob | null> {
    const result = await this.db.query(
      `SELECT * FROM fine_tuning_jobs WHERE id = $1`,
      [jobId]
    );

    if (result.rows.length === 0) return null;
    return this.mapJobRow(result.rows[0]);
  }

  /**
   * List all jobs with optional filters
   */
  async listJobs(filters: {
    status?: FineTuningJobStatus;
    provider?: FineTuningProvider;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ jobs: FineTuningJob[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }
    if (filters.provider) {
      conditions.push(`provider = $${paramIndex++}`);
      params.push(filters.provider);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [jobsResult, countResult] = await Promise.all([
      this.db.query(
        `
        SELECT * FROM fine_tuning_jobs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
        [...params, filters.limit || 20, filters.offset || 0]
      ),
      this.db.query(`SELECT COUNT(*) FROM fine_tuning_jobs ${whereClause}`, params),
    ]);

    return {
      jobs: jobsResult.rows.map((row) => this.mapJobRow(row)),
      total: Number.parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error('Job not found');
    if (!job.providerJobId) throw new Error('Job has not been submitted to provider');

    const provider = this.getProvider(job.provider);
    await provider.cancelJob(job.providerJobId);

    await this.db.query(
      `
      UPDATE fine_tuning_jobs
      SET status = 'cancelled', completed_at = NOW()
      WHERE id = $1
    `,
      [jobId]
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Model Management
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Deploy a fine-tuned model for use
   */
  async deployModel(
    jobId: string,
    displayName: string,
    description?: string
  ): Promise<FineTunedModel> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error('Job not found');
    if (job.status !== 'succeeded') throw new Error('Job has not completed successfully');
    if (!job.fineTunedModel) throw new Error('No fine-tuned model available');

    const result = await this.db.query(
      `
      INSERT INTO fine_tuned_models (
        provider, provider_model_id, base_model, display_name,
        description, job_id, training_examples, metrics, deployed_at, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
      RETURNING *
    `,
      [
        job.provider,
        job.fineTunedModel,
        job.baseModel,
        displayName,
        description,
        jobId,
        job.trainingExampleCount,
        JSON.stringify(job.metrics),
        JSON.stringify(job.metadata),
      ]
    );

    return this.mapModelRow(result.rows[0]);
  }

  /**
   * List deployed models
   */
  async listModels(filters: {
    provider?: FineTuningProvider;
    status?: 'active' | 'deprecated' | 'deleted';
    limit?: number;
    offset?: number;
  } = {}): Promise<{ models: FineTunedModel[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.provider) {
      conditions.push(`provider = $${paramIndex++}`);
      params.push(filters.provider);
    }
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [modelsResult, countResult] = await Promise.all([
      this.db.query(
        `
        SELECT * FROM fine_tuned_models
        ${whereClause}
        ORDER BY deployed_at DESC NULLS LAST
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
        [...params, filters.limit || 20, filters.offset || 0]
      ),
      this.db.query(`SELECT COUNT(*) FROM fine_tuned_models ${whereClause}`, params),
    ]);

    return {
      models: modelsResult.rows.map((row) => this.mapModelRow(row)),
      total: Number.parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Deprecate a model (no longer use for new requests)
   */
  async deprecateModel(modelId: string): Promise<void> {
    await this.db.query(
      `UPDATE fine_tuned_models SET status = 'deprecated' WHERE id = $1`,
      [modelId]
    );
  }

  /**
   * Delete a model from provider and database
   */
  async deleteModel(modelId: string): Promise<void> {
    const result = await this.db.query(
      `SELECT * FROM fine_tuned_models WHERE id = $1`,
      [modelId]
    );

    if (result.rows.length === 0) throw new Error('Model not found');

    const model = this.mapModelRow(result.rows[0]);
    const provider = this.getProvider(model.provider);

    try {
      await provider.deleteModel(model.providerModelId);
    } catch (error) {
      // Log but don't fail if provider delete fails
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to delete model from provider: ${errorMessage}`);
    }

    await this.db.query(
      `UPDATE fine_tuned_models SET status = 'deleted' WHERE id = $1`,
      [modelId]
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Training Data Preparation
  // ──────────────────────────────────────────────────────────────────────────────

  private async prepareTrainingData(
    query: TrainingDataQuery,
    validationSplit: number
  ): Promise<{
    trainingData: TrainingExample[];
    validationData: TrainingExample[];
  }> {
    const conditions: string[] = ['status IN (\'approved\', \'pending\')'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.minQualityScore !== undefined) {
      conditions.push(`quality_score >= $${paramIndex++}`);
      params.push(query.minQualityScore);
    }
    if (query.agentTypes && query.agentTypes.length > 0) {
      conditions.push(`agent_type = ANY($${paramIndex++})`);
      params.push(query.agentTypes);
    }
    if (query.taskCategories && query.taskCategories.length > 0) {
      conditions.push(`task_category = ANY($${paramIndex++})`);
      params.push(query.taskCategories);
    }
    if (query.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(query.startDate);
    }
    if (query.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(query.endDate);
    }
    if (query.excludeExported) {
      conditions.push(`status != 'exported'`);
    }

    params.push(query.limit || 10000);

    const result = await this.db.query(
      `
      SELECT id, input_text, output_text, system_prompt, quality_score
      FROM training_examples
      WHERE ${conditions.join(' AND ')}
      ORDER BY quality_score DESC
      LIMIT $${paramIndex}
    `,
      params
    );

    const allExamples: TrainingExample[] = result.rows.map((row) => ({
      id: row.id,
      input: row.input_text,
      output: row.output_text,
      systemPrompt: row.system_prompt,
      qualityScore: parseFloat(row.quality_score),
    }));

    // Shuffle and split
    const shuffled = this.shuffle(allExamples);
    const splitIndex = Math.floor(shuffled.length * (1 - validationSplit));

    return {
      trainingData: shuffled.slice(0, splitIndex),
      validationData: shuffled.slice(splitIndex),
    };
  }

  private formatTrainingData(examples: TrainingExample[], provider: FineTuningProvider): string {
    if (provider === 'openai') {
      return examples
        .map((ex) => {
          const messages: Array<{ role: string; content: string }> = [];

          if (ex.systemPrompt) {
            messages.push({ role: 'system', content: ex.systemPrompt });
          }
          messages.push({ role: 'user', content: ex.input });
          messages.push({ role: 'assistant', content: ex.output });

          return JSON.stringify({ messages });
        })
        .join('\n');
    }

    // Anthropic format
    return examples
      .map((ex) => {
        return JSON.stringify({
          prompt: ex.systemPrompt
            ? `${ex.systemPrompt}\n\nHuman: ${ex.input}\n\nAssistant:`
            : `Human: ${ex.input}\n\nAssistant:`,
          completion: ` ${ex.output}`,
        });
      })
      .join('\n');
  }

  private async markExamplesExported(query: TrainingDataQuery, jobId: string): Promise<void> {
    const conditions: string[] = ['status IN (\'approved\', \'pending\')'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.minQualityScore !== undefined) {
      conditions.push(`quality_score >= $${paramIndex++}`);
      params.push(query.minQualityScore);
    }
    if (query.agentTypes && query.agentTypes.length > 0) {
      conditions.push(`agent_type = ANY($${paramIndex++})`);
      params.push(query.agentTypes);
    }

    params.push(jobId, query.limit || 10000);

    await this.db.query(
      `
      UPDATE training_examples
      SET
        status = 'exported',
        export_batch_id = $${paramIndex++},
        exported_at = NOW()
      WHERE ${conditions.join(' AND ')}
      LIMIT $${paramIndex}
    `,
      params
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Polling & Status Updates
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Start polling for job status updates
   */
  startPolling(): void {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(async () => {
      try {
        await this.pollJobStatuses();
      } catch (error) {
        console.error('Error polling job statuses:', error);
      }
    }, this.config.pollIntervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async pollJobStatuses(): Promise<void> {
    const activeJobs = await this.db.query(`
      SELECT * FROM fine_tuning_jobs
      WHERE status IN ('queued', 'running', 'validating')
        AND provider_job_id IS NOT NULL
    `);

    for (const row of activeJobs.rows) {
      const job = this.mapJobRow(row);
      if (!job.providerJobId) continue;

      try {
        const provider = this.getProvider(job.provider);
        const status = await provider.getJobStatus(job.providerJobId);

        // Update job status
        await this.db.query(
          `
          UPDATE fine_tuning_jobs
          SET
            status = $1,
            fine_tuned_model = $2,
            metrics = COALESCE($3, metrics),
            error = $4,
            completed_at = CASE
              WHEN $1 IN ('succeeded', 'failed', 'cancelled') THEN NOW()
              ELSE completed_at
            END
          WHERE id = $5
        `,
          [
            status.status,
            status.fineTunedModel,
            status.metrics ? JSON.stringify(status.metrics) : null,
            status.error,
            job.id,
          ]
        );

        // Auto-deploy if configured
        if (status.status === 'succeeded' && this.config.autoDeployOnSuccess) {
          await this.deployModel(
            job.id,
            `${job.baseModel}-ft-${new Date().toISOString().split('T')[0]}`,
            `Auto-deployed from job ${job.id}`
          );
        }
      } catch (error) {
        console.error(`Error polling job ${job.id}:`, error);
      }
    }
  }

  private async getActiveJobCount(): Promise<number> {
    const result = await this.db.query(`
      SELECT COUNT(*) FROM fine_tuning_jobs
      WHERE status IN ('pending', 'validating', 'queued', 'running')
    `);
    return Number.parseInt(result.rows[0].count);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────────

  private mapJobRow(row: Record<string, unknown>): FineTuningJob {
    return {
      id: row.id as string,
      provider: row.provider as FineTuningProvider,
      providerJobId: row.provider_job_id as string | null,
      baseModel: row.base_model as string,
      fineTunedModel: row.fine_tuned_model as string | null,
      status: row.status as FineTuningJobStatus,
      trainingFileId: row.training_file_id as string | null,
      validationFileId: row.validation_file_id as string | null,
      trainingExampleCount: row.training_example_count as number,
      validationExampleCount: row.validation_example_count as number,
      hyperparameters: (row.hyperparameters as HyperParameters | null) ?? {},
      metrics: row.metrics as TrainingMetrics | null,
      error: row.error as string | null,
      createdAt: new Date(row.created_at as string),
      startedAt: row.started_at ? new Date(row.started_at as string) : null,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
      metadata: (row.metadata as Record<string, string> | null) ?? {},
    };
  }

  private mapModelRow(row: Record<string, unknown>): FineTunedModel {
    return {
      id: row.id as string,
      provider: row.provider as FineTuningProvider,
      providerModelId: row.provider_model_id as string,
      baseModel: row.base_model as string,
      displayName: row.display_name as string,
      description: row.description as string | null,
      status: row.status as 'active' | 'deprecated' | 'deleted',
      jobId: row.job_id as string,
      trainingExamples: row.training_examples as number,
      metrics: row.metrics as TrainingMetrics,
      deployedAt: row.deployed_at ? new Date(row.deployed_at as string) : null,
      createdAt: new Date(row.created_at as string),
      metadata: (row.metadata as Record<string, string> | null) ?? {},
    };
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// INTERNAL TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface TrainingExample {
  id: string;
  input: string;
  output: string;
  systemPrompt?: string;
  qualityScore: number;
}
