/**
 * OCR Types and Interfaces
 * Defines the core types for the multi-provider OCR pipeline
 */

// ══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type OCRProvider = 'tesseract' | 'google-vision' | 'aws-textract' | 'azure-cognitive';

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes: BoundingBox[];
  language: string;
  processingTimeMs: number;
  provider: OCRProvider;
  containsMath?: boolean;
  mathExpressions?: MathExpression[];
  isHandwritten?: boolean;
  warnings?: string[];
}

export interface BoundingBox {
  text: string;
  confidence: number;
  coordinates: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  };
  lineNumber?: number;
  wordIndex?: number;
  isHandwritten?: boolean;
}

export interface MathExpression {
  raw: string;
  latex?: string;
  confidence: number;
  position: BoundingBox;
  type: MathExpressionType;
}

export type MathExpressionType =
  | 'equation'
  | 'fraction'
  | 'exponent'
  | 'radical'
  | 'integral'
  | 'summation'
  | 'matrix'
  | 'inequality'
  | 'function'
  | 'unknown';

// ══════════════════════════════════════════════════════════════════════════════
// OPTIONS & CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export interface OCROptions {
  language?: string;
  languages?: string[];
  detectHandwriting?: boolean;
  detectMath?: boolean;
  optimizeForMath?: boolean;
  pageSegmentationMode?: PageSegmentationMode;
  preprocessingOptions?: PreprocessingOptions;
  timeout?: number;
}

export type PageSegmentationMode =
  | 'auto'
  | 'single-column'
  | 'single-block'
  | 'single-line'
  | 'single-word'
  | 'sparse-text';

export interface PreprocessingOptions {
  autoRotate?: boolean;
  enhanceContrast?: boolean;
  noiseReduction?: boolean;
  binarization?: boolean;
  deskew?: boolean;
  scale?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export interface ProviderConfig {
  tesseract?: TesseractConfig;
  googleVision?: GoogleVisionConfig;
  awsTextract?: AWSTextractConfig;
  azureCognitive?: AzureCognitiveConfig;
}

export interface TesseractConfig {
  enabled: boolean;
  dataPath?: string;
  workerPath?: string;
  corePath?: string;
  langPath?: string;
}

export interface GoogleVisionConfig {
  enabled: boolean;
  apiKey?: string;
  projectId?: string;
  location?: string;
}

export interface AWSTextractConfig {
  enabled: boolean;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  roleArn?: string;
}

export interface AzureCognitiveConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  region?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type Subject = 'MATH' | 'SCIENCE' | 'ELA' | 'HISTORY' | 'SOCIAL_STUDIES' | 'OTHER';

export interface ProcessingHints {
  subject?: Subject;
  isHandwritten?: boolean;
  preferredProvider?: OCRProvider;
  requireHighAccuracy?: boolean;
  costSensitive?: boolean;
}

export interface ProviderCost {
  provider: OCRProvider;
  costPerImage: number;
  costPerPage: number;
  freeQuota?: number;
}

export interface ProviderStatus {
  provider: OCRProvider;
  available: boolean;
  lastHealthCheck?: Date;
  successRate?: number;
  averageLatencyMs?: number;
  currentLoad?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// PREPROCESSING TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ImageMetadata {
  width: number;
  height: number;
  format: ImageFormat;
  colorSpace: 'rgb' | 'grayscale' | 'binary';
  dpi?: number;
  orientation?: number;
  hasAlpha?: boolean;
}

export type ImageFormat = 'jpeg' | 'png' | 'gif' | 'webp' | 'heic' | 'pdf' | 'tiff' | 'bmp';

export interface PreprocessingResult {
  originalImage: Buffer;
  processedImage: Buffer;
  metadata: ImageMetadata;
  transformations: string[];
  processingTimeMs: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENHANCEMENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface EnhancementOptions {
  spellCorrection?: boolean;
  mathSymbolNormalization?: boolean;
  curriculumTermMapping?: boolean;
  subject?: Subject;
  gradeLevel?: number;
}

export interface SpellCorrectionResult {
  original: string;
  corrected: string;
  corrections: Array<{
    original: string;
    corrected: string;
    confidence: number;
    position: { start: number; end: number };
  }>;
}

export interface MathNormalizationResult {
  original: string;
  normalized: string;
  latex: string;
  substitutions: Array<{
    original: string;
    normalized: string;
    type: string;
  }>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ══════════════════════════════════════════════════════════════════════════════

export class OCRError extends Error {
  constructor(
    message: string,
    public provider: OCRProvider,
    public code: OCRErrorCode,
    public isRetryable: boolean = false,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'OCRError';
  }
}

export type OCRErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_IMAGE'
  | 'IMAGE_TOO_LARGE'
  | 'UNSUPPORTED_FORMAT'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'AUTHENTICATION_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'PROCESSING_FAILED'
  | 'NO_TEXT_DETECTED'
  | 'LOW_CONFIDENCE';

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface OCRMetrics {
  requestId: string;
  provider: OCRProvider;
  processingTimeMs: number;
  imageSizeBytes: number;
  textLength: number;
  confidence: number;
  containsMath: boolean;
  isHandwritten: boolean;
  success: boolean;
  errorCode?: OCRErrorCode;
}

export interface OCRCache {
  key: string;
  result: OCRResult;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
}
