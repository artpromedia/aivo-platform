/**
 * OCR Provider Interface
 * Defines the contract that all OCR providers must implement
 */

import type {
  OCRResult,
  OCRProvider,
  OCROptions,
  ProviderStatus,
  ImageMetadata,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER INTERFACE
// ══════════════════════════════════════════════════════════════════════════════

export interface IOCRProvider {
  /**
   * Unique identifier for the provider
   */
  readonly name: OCRProvider;

  /**
   * Human-readable display name
   */
  readonly displayName: string;

  /**
   * Process an image and extract text
   * @param image - Image data as Buffer
   * @param options - OCR processing options
   * @returns OCR result with extracted text and metadata
   */
  process(image: Buffer, options?: OCROptions): Promise<OCRResult>;

  /**
   * Check if the provider is currently available and configured
   * @returns true if the provider can process requests
   */
  isAvailable(): Promise<boolean>;

  /**
   * Estimate the cost to process an image
   * @param imageSizeBytes - Size of the image in bytes
   * @returns Estimated cost in USD
   */
  estimateCost(imageSizeBytes: number): number;

  /**
   * Get current provider status including health metrics
   * @returns Provider status information
   */
  getStatus(): Promise<ProviderStatus>;

  /**
   * Get supported features for this provider
   * @returns List of supported feature flags
   */
  getSupportedFeatures(): ProviderFeatures;

  /**
   * Validate that an image can be processed by this provider
   * @param image - Image data as Buffer
   * @param metadata - Optional pre-computed image metadata
   * @returns Validation result with any issues found
   */
  validateImage(image: Buffer, metadata?: ImageMetadata): Promise<ImageValidationResult>;
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS
// ══════════════════════════════════════════════════════════════════════════════

export interface ProviderFeatures {
  textDetection: boolean;
  handwritingRecognition: boolean;
  mathEquationDetection: boolean;
  tableExtraction: boolean;
  formExtraction: boolean;
  documentLayoutAnalysis: boolean;
  multiLanguage: boolean;
  pdfSupport: boolean;
  batchProcessing: boolean;
  asyncProcessing: boolean;
  boundingBoxes: boolean;
  confidenceScores: boolean;
  languageDetection: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ImageValidationResult {
  valid: boolean;
  issues: ImageValidationIssue[];
  metadata?: ImageMetadata;
}

export interface ImageValidationIssue {
  code: ImageValidationCode;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export type ImageValidationCode =
  | 'INVALID_FORMAT'
  | 'IMAGE_TOO_LARGE'
  | 'IMAGE_TOO_SMALL'
  | 'RESOLUTION_TOO_LOW'
  | 'RESOLUTION_TOO_HIGH'
  | 'CORRUPTED_IMAGE'
  | 'UNSUPPORTED_COLOR_SPACE'
  | 'UNSUPPORTED_ORIENTATION';

// ══════════════════════════════════════════════════════════════════════════════
// BASE PROVIDER CLASS
// ══════════════════════════════════════════════════════════════════════════════

export abstract class BaseOCRProvider implements IOCRProvider {
  abstract readonly name: OCRProvider;
  abstract readonly displayName: string;

  protected lastHealthCheck?: Date;
  protected isHealthy: boolean = true;
  protected successCount: number = 0;
  protected failureCount: number = 0;
  protected totalLatencyMs: number = 0;

  abstract process(image: Buffer, options?: OCROptions): Promise<OCRResult>;
  abstract isAvailable(): Promise<boolean>;
  abstract estimateCost(imageSizeBytes: number): number;
  abstract getSupportedFeatures(): ProviderFeatures;

  async getStatus(): Promise<ProviderStatus> {
    const available = await this.isAvailable();
    const totalRequests = this.successCount + this.failureCount;

    return {
      provider: this.name,
      available,
      lastHealthCheck: this.lastHealthCheck,
      successRate: totalRequests > 0 ? this.successCount / totalRequests : undefined,
      averageLatencyMs: totalRequests > 0 ? this.totalLatencyMs / totalRequests : undefined,
    };
  }

  async validateImage(image: Buffer, metadata?: ImageMetadata): Promise<ImageValidationResult> {
    const issues: ImageValidationIssue[] = [];

    // Check minimum size
    if (image.length < 100) {
      issues.push({
        code: 'IMAGE_TOO_SMALL',
        message: 'Image file is too small to contain valid image data',
        severity: 'error',
      });
    }

    // Check maximum size (10MB default)
    const maxSize = 10 * 1024 * 1024;
    if (image.length > maxSize) {
      issues.push({
        code: 'IMAGE_TOO_LARGE',
        message: `Image file exceeds maximum size of ${maxSize / 1024 / 1024}MB`,
        severity: 'error',
        suggestion: 'Compress the image or reduce its resolution',
      });
    }

    // Validate magic bytes
    const format = this.detectFormat(image);
    if (!format) {
      issues.push({
        code: 'INVALID_FORMAT',
        message: 'Unable to detect valid image format from file header',
        severity: 'error',
        suggestion: 'Ensure the file is a valid JPEG, PNG, GIF, WebP, or PDF',
      });
    }

    return {
      valid: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
      metadata: metadata ?? this.extractBasicMetadata(image, format),
    };
  }

  protected detectFormat(buffer: Buffer): string | null {
    if (buffer.length < 4) return null;

    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpeg';
    }

    // PNG
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'png';
    }

    // GIF
    if (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    ) {
      return 'gif';
    }

    // WebP
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer.length >= 12 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'webp';
    }

    // PDF
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return 'pdf';
    }

    // HEIC/HEIF (ftyp box)
    if (buffer.length >= 12 && buffer.slice(4, 8).toString() === 'ftyp') {
      const brand = buffer.slice(8, 12).toString();
      if (brand.startsWith('heic') || brand.startsWith('mif1')) {
        return 'heic';
      }
    }

    // TIFF (little or big endian)
    if (
      (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
      (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)
    ) {
      return 'tiff';
    }

    // BMP
    if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
      return 'bmp';
    }

    return null;
  }

  protected extractBasicMetadata(buffer: Buffer, format: string | null): ImageMetadata {
    let width = 0;
    let height = 0;

    if (format === 'png' && buffer.length >= 24) {
      width = buffer.readUInt32BE(16);
      height = buffer.readUInt32BE(20);
    } else if (format === 'jpeg') {
      // Parse JPEG to find dimensions (SOF marker)
      let offset = 2;
      while (offset < buffer.length - 9) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
          height = buffer.readUInt16BE(offset + 5);
          width = buffer.readUInt16BE(offset + 7);
          break;
        }
        offset += 2 + buffer.readUInt16BE(offset + 2);
      }
    } else if (format === 'gif' && buffer.length >= 10) {
      width = buffer.readUInt16LE(6);
      height = buffer.readUInt16LE(8);
    }

    return {
      width,
      height,
      format: (format as ImageMetadata['format']) ?? 'jpeg',
      colorSpace: 'rgb',
    };
  }

  protected recordSuccess(latencyMs: number): void {
    this.successCount++;
    this.totalLatencyMs += latencyMs;
    this.lastHealthCheck = new Date();
    this.isHealthy = true;
  }

  protected recordFailure(): void {
    this.failureCount++;
    this.lastHealthCheck = new Date();
    // Mark unhealthy if failure rate is too high
    const total = this.successCount + this.failureCount;
    if (total >= 10 && this.failureCount / total > 0.5) {
      this.isHealthy = false;
    }
  }

  protected createEmptyBoundingBox(): import('./types.js').BoundingBox['coordinates'] {
    return {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 0, y: 0 },
      bottomLeft: { x: 0, y: 0 },
      bottomRight: { x: 0, y: 0 },
    };
  }
}
