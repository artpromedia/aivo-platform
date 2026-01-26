/**
 * Google Cloud Vision OCR Provider
 * Integrates with Google Cloud Vision API for document text detection,
 * handwriting recognition, and math formula detection
 */

import {
  BaseOCRProvider,
  type IOCRProvider,
  type ProviderFeatures,
} from '../provider-interface.js';
import type {
  OCRResult,
  OCRProvider,
  OCROptions,
  BoundingBox,
  MathExpression,
  MathExpressionType,
  GoogleVisionConfig,
} from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// GOOGLE VISION API TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface GoogleVisionRequest {
  requests: Array<{
    image: { content: string };
    features: Array<{ type: string; maxResults?: number }>;
    imageContext?: {
      languageHints?: string[];
      textDetectionParams?: {
        enableTextDetectionConfidenceScore?: boolean;
      };
    };
  }>;
}

interface GoogleVisionResponse {
  responses: Array<{
    fullTextAnnotation?: {
      text: string;
      pages: GoogleVisionPage[];
    };
    textAnnotations?: GoogleVisionAnnotation[];
    error?: { message: string; code: number };
  }>;
}

interface GoogleVisionPage {
  property?: {
    detectedLanguages?: Array<{ languageCode: string; confidence: number }>;
  };
  blocks: GoogleVisionBlock[];
  width: number;
  height: number;
  confidence?: number;
}

interface GoogleVisionBlock {
  property?: {
    detectedLanguages?: Array<{ languageCode: string }>;
  };
  boundingBox?: GoogleVisionBoundingPoly;
  paragraphs: GoogleVisionParagraph[];
  blockType: 'TEXT' | 'TABLE' | 'PICTURE' | 'RULER' | 'BARCODE';
  confidence?: number;
}

interface GoogleVisionParagraph {
  property?: {
    detectedLanguages?: Array<{ languageCode: string }>;
  };
  boundingBox?: GoogleVisionBoundingPoly;
  words: GoogleVisionWord[];
  confidence?: number;
}

interface GoogleVisionWord {
  property?: {
    detectedLanguages?: Array<{ languageCode: string }>;
    detectedBreak?: { type: string };
  };
  boundingBox?: GoogleVisionBoundingPoly;
  symbols: GoogleVisionSymbol[];
  confidence?: number;
}

interface GoogleVisionSymbol {
  property?: {
    detectedBreak?: { type: string };
  };
  boundingBox?: GoogleVisionBoundingPoly;
  text: string;
  confidence?: number;
}

interface GoogleVisionAnnotation {
  description: string;
  boundingPoly?: GoogleVisionBoundingPoly;
  locale?: string;
}

interface GoogleVisionBoundingPoly {
  vertices: Array<{ x?: number; y?: number }>;
  normalizedVertices?: Array<{ x?: number; y?: number }>;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

export class GoogleVisionProvider extends BaseOCRProvider implements IOCRProvider {
  readonly name: OCRProvider = 'google-vision';
  readonly displayName = 'Google Cloud Vision';

  private readonly apiKey: string | undefined;
  private readonly projectId: string | undefined;
  private readonly apiEndpoint = 'https://vision.googleapis.com/v1/images:annotate';

  // Pricing: $1.50 per 1000 images for first 1M, then $0.60
  private readonly costPerImage = 0.0015;
  private readonly freeQuotaPerMonth = 1000;

  constructor(config?: GoogleVisionConfig) {
    super();
    this.apiKey = config?.apiKey ?? process.env.GOOGLE_VISION_API_KEY;
    this.projectId = config?.projectId ?? process.env.GOOGLE_CLOUD_PROJECT_ID;
  }

  async process(image: Buffer, options?: OCROptions): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Validate image
      const validation = await this.validateImage(image);
      if (!validation.valid) {
        throw this.createError(
          `Image validation failed: ${validation.issues.map((i) => i.message).join(', ')}`,
          'INVALID_IMAGE'
        );
      }

      if (!this.apiKey) {
        throw this.createError(
          'Google Vision API key not configured',
          'AUTHENTICATION_FAILED'
        );
      }

      // Build request
      const base64Image = image.toString('base64');
      const features = this.buildFeatures(options);
      const imageContext = this.buildImageContext(options);

      const request: GoogleVisionRequest = {
        requests: [
          {
            image: { content: base64Image },
            features,
            imageContext,
          },
        ],
      };

      // Call API
      const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(options?.timeout ?? 30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          throw this.createError('Rate limit exceeded', 'RATE_LIMITED', true);
        }
        if (response.status === 401 || response.status === 403) {
          throw this.createError('Authentication failed', 'AUTHENTICATION_FAILED');
        }
        throw this.createError(`API error: ${errorText}`, 'PROCESSING_FAILED', true);
      }

      const data = (await response.json()) as GoogleVisionResponse;
      const result = data.responses[0];

      if (result.error) {
        throw this.createError(
          `Google Vision error: ${result.error.message}`,
          'PROCESSING_FAILED'
        );
      }

      // Parse response
      const ocrResult = this.parseResponse(result, options);

      const processingTimeMs = Date.now() - startTime;
      this.recordSuccess(processingTimeMs);

      return {
        ...ocrResult,
        processingTimeMs,
        provider: this.name,
      };
    } catch (error) {
      this.recordFailure();
      if ((error as Error).name === 'OCRError') {
        throw error;
      }
      if ((error as Error).name === 'AbortError') {
        throw this.createError('Request timeout', 'TIMEOUT', true);
      }
      throw this.createError(
        `Google Vision processing failed: ${(error as Error).message}`,
        'PROCESSING_FAILED',
        true,
        error as Error
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  estimateCost(imageSizeBytes: number): number {
    // Google Vision charges per image, not by size
    return this.costPerImage;
  }

  getSupportedFeatures(): ProviderFeatures {
    return {
      textDetection: true,
      handwritingRecognition: true,
      mathEquationDetection: true, // Pattern-based on extracted text
      tableExtraction: false, // Use Document AI for tables
      formExtraction: false, // Use Document AI for forms
      documentLayoutAnalysis: true,
      multiLanguage: true,
      pdfSupport: false, // Would need Document AI
      batchProcessing: true,
      asyncProcessing: false,
      boundingBoxes: true,
      confidenceScores: true,
      languageDetection: true,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private buildFeatures(options?: OCROptions): Array<{ type: string; maxResults?: number }> {
    const features: Array<{ type: string; maxResults?: number }> = [];

    // Always include document text detection for better results
    features.push({ type: 'DOCUMENT_TEXT_DETECTION' });

    // Add standard text detection as fallback
    features.push({ type: 'TEXT_DETECTION' });

    return features;
  }

  private buildImageContext(options?: OCROptions): GoogleVisionRequest['requests'][0]['imageContext'] {
    const context: GoogleVisionRequest['requests'][0]['imageContext'] = {
      textDetectionParams: {
        enableTextDetectionConfidenceScore: true,
      },
    };

    if (options?.language) {
      context.languageHints = [options.language];
    } else if (options?.languages && options.languages.length > 0) {
      context.languageHints = options.languages;
    }

    return context;
  }

  private parseResponse(
    result: GoogleVisionResponse['responses'][0],
    options?: OCROptions
  ): Omit<OCRResult, 'processingTimeMs' | 'provider'> {
    const fullText = result.fullTextAnnotation;
    const annotations = result.textAnnotations;

    if (!fullText && (!annotations || annotations.length === 0)) {
      return {
        text: '',
        confidence: 0,
        boundingBoxes: [],
        language: 'unknown',
        containsMath: false,
      };
    }

    const text = fullText?.text ?? annotations?.[0]?.description ?? '';
    const confidence = this.calculateConfidence(fullText?.pages);
    const language = this.detectLanguage(fullText?.pages);
    const boundingBoxes = this.extractBoundingBoxes(fullText?.pages, annotations);
    const isHandwritten = options?.detectHandwriting ? this.detectHandwriting(fullText?.pages) : undefined;

    // Detect math if requested
    let containsMath = false;
    let mathExpressions: MathExpression[] | undefined;

    if (options?.detectMath || options?.optimizeForMath) {
      const mathResult = this.detectMathExpressions(text, boundingBoxes);
      containsMath = mathResult.containsMath;
      mathExpressions = mathResult.expressions;
    }

    return {
      text,
      confidence,
      boundingBoxes,
      language,
      containsMath,
      mathExpressions,
      isHandwritten,
    };
  }

  private calculateConfidence(pages?: GoogleVisionPage[]): number {
    if (!pages || pages.length === 0) {
      return 0.9; // Default confidence when not available
    }

    let totalConfidence = 0;
    let count = 0;

    for (const page of pages) {
      for (const block of page.blocks || []) {
        for (const paragraph of block.paragraphs || []) {
          for (const word of paragraph.words || []) {
            if (word.confidence !== undefined) {
              totalConfidence += word.confidence;
              count++;
            }
          }
        }
      }
    }

    return count > 0 ? totalConfidence / count : 0.9;
  }

  private detectLanguage(pages?: GoogleVisionPage[]): string {
    if (!pages || pages.length === 0) {
      return 'unknown';
    }

    const languages = pages[0]?.property?.detectedLanguages;
    if (languages && languages.length > 0) {
      // Return the language with highest confidence
      const sorted = [...languages].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
      return sorted[0].languageCode;
    }

    return 'unknown';
  }

  private extractBoundingBoxes(
    pages?: GoogleVisionPage[],
    annotations?: GoogleVisionAnnotation[]
  ): BoundingBox[] {
    const boxes: BoundingBox[] = [];

    if (pages) {
      let lineNumber = 0;

      for (const page of pages) {
        for (const block of page.blocks || []) {
          for (const paragraph of block.paragraphs || []) {
            lineNumber++;
            let wordIndex = 0;

            for (const word of paragraph.words || []) {
              wordIndex++;
              const text = word.symbols.map((s) => s.text).join('');
              const boundingBox = word.boundingBox;

              if (boundingBox) {
                boxes.push({
                  text,
                  confidence: word.confidence ?? 0.9,
                  coordinates: this.convertBoundingPoly(boundingBox),
                  lineNumber,
                  wordIndex,
                });
              }
            }
          }
        }
      }
    } else if (annotations) {
      // Use annotations as fallback (skip first which is full text)
      let lineNumber = 1;
      let lastY = 0;
      let wordIndex = 0;

      for (let i = 1; i < annotations.length; i++) {
        const annotation = annotations[i];
        if (annotation.boundingPoly) {
          const coords = this.convertBoundingPoly(annotation.boundingPoly);
          const currentY = coords.topLeft.y;

          // Detect line change based on Y coordinate
          if (Math.abs(currentY - lastY) > 20) {
            lineNumber++;
            wordIndex = 0;
          }
          lastY = currentY;
          wordIndex++;

          boxes.push({
            text: annotation.description,
            confidence: 0.9, // Annotations don't include confidence
            coordinates: coords,
            lineNumber,
            wordIndex,
          });
        }
      }
    }

    return boxes;
  }

  private convertBoundingPoly(
    poly: GoogleVisionBoundingPoly
  ): BoundingBox['coordinates'] {
    const vertices = poly.vertices || poly.normalizedVertices || [];

    if (vertices.length < 4) {
      return this.createEmptyBoundingBox();
    }

    return {
      topLeft: { x: vertices[0]?.x ?? 0, y: vertices[0]?.y ?? 0 },
      topRight: { x: vertices[1]?.x ?? 0, y: vertices[1]?.y ?? 0 },
      bottomRight: { x: vertices[2]?.x ?? 0, y: vertices[2]?.y ?? 0 },
      bottomLeft: { x: vertices[3]?.x ?? 0, y: vertices[3]?.y ?? 0 },
    };
  }

  private detectHandwriting(pages?: GoogleVisionPage[]): boolean {
    if (!pages || pages.length === 0) {
      return false;
    }

    // Heuristics for handwriting detection:
    // 1. Low confidence scores across many words
    // 2. High variance in word confidence

    let confidences: number[] = [];

    for (const page of pages) {
      for (const block of page.blocks || []) {
        for (const paragraph of block.paragraphs || []) {
          for (const word of paragraph.words || []) {
            if (word.confidence !== undefined) {
              confidences.push(word.confidence);
            }
          }
        }
      }
    }

    if (confidences.length === 0) {
      return false;
    }

    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const variance =
      confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) /
      confidences.length;

    // Low confidence or high variance suggests handwriting
    return avgConfidence < 0.7 || variance > 0.04;
  }

  private detectMathExpressions(
    text: string,
    boundingBoxes: BoundingBox[]
  ): { expressions: MathExpression[]; containsMath: boolean } {
    const expressions: MathExpression[] = [];

    // Math pattern matchers
    const patterns: Array<{ regex: RegExp; type: MathExpressionType }> = [
      { regex: /[\w\d\s]+\s*=\s*[\w\d\s+\-*/()]+/g, type: 'equation' },
      { regex: /\d+\s*\/\s*\d+/g, type: 'fraction' },
      { regex: /[\w\d]+\s*\^\s*[\w\d]+/g, type: 'exponent' },
      { regex: /√\s*[\w\d()]+/g, type: 'radical' },
      { regex: /[Σ∑]\s*[\w\d()=]+/g, type: 'summation' },
      { regex: /[∫]\s*[\w\d()]+/g, type: 'integral' },
      { regex: /[\w\d]+\s*[<>≤≥]\s*[\w\d]+/g, type: 'inequality' },
      { regex: /(?:sin|cos|tan|log|ln|exp)\s*\([^)]+\)/gi, type: 'function' },
      { regex: /\d+\s*[+\-*/×÷]\s*\d+/g, type: 'equation' },
    ];

    let containsMath = false;

    for (const { regex, type } of patterns) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        containsMath = true;

        const expressionText = match[0].trim();
        const position = this.findExpressionBoundingBox(expressionText, boundingBoxes);

        expressions.push({
          raw: expressionText,
          latex: this.convertToLatex(expressionText, type),
          confidence: position.confidence,
          position,
          type,
        });
      }
    }

    return { expressions, containsMath };
  }

  private findExpressionBoundingBox(
    expression: string,
    boundingBoxes: BoundingBox[]
  ): BoundingBox {
    const words = expression.split(/\s+/);
    const matchingBoxes: BoundingBox[] = [];

    for (const word of words) {
      const box = boundingBoxes.find(
        (b) =>
          b.text.toLowerCase() === word.toLowerCase() ||
          b.text.includes(word) ||
          word.includes(b.text)
      );
      if (box) {
        matchingBoxes.push(box);
      }
    }

    if (matchingBoxes.length === 0) {
      return {
        text: expression,
        confidence: 0.5,
        coordinates: this.createEmptyBoundingBox(),
      };
    }

    const minX = Math.min(...matchingBoxes.map((b) => b.coordinates.topLeft.x));
    const minY = Math.min(...matchingBoxes.map((b) => b.coordinates.topLeft.y));
    const maxX = Math.max(...matchingBoxes.map((b) => b.coordinates.bottomRight.x));
    const maxY = Math.max(...matchingBoxes.map((b) => b.coordinates.bottomRight.y));
    const avgConfidence =
      matchingBoxes.reduce((sum, b) => sum + b.confidence, 0) / matchingBoxes.length;

    return {
      text: expression,
      confidence: avgConfidence,
      coordinates: {
        topLeft: { x: minX, y: minY },
        topRight: { x: maxX, y: minY },
        bottomLeft: { x: minX, y: maxY },
        bottomRight: { x: maxX, y: maxY },
      },
    };
  }

  private convertToLatex(expression: string, type: MathExpressionType): string {
    let latex = expression;

    latex = latex.replace(/\*/g, '\\times ');
    latex = latex.replace(/\//g, '\\div ');
    latex = latex.replace(/×/g, '\\times ');
    latex = latex.replace(/÷/g, '\\div ');
    latex = latex.replace(/√/g, '\\sqrt');
    latex = latex.replace(/π/g, '\\pi ');
    latex = latex.replace(/θ/g, '\\theta ');
    latex = latex.replace(/α/g, '\\alpha ');
    latex = latex.replace(/β/g, '\\beta ');
    latex = latex.replace(/γ/g, '\\gamma ');
    latex = latex.replace(/Σ|∑/g, '\\sum ');
    latex = latex.replace(/∫/g, '\\int ');
    latex = latex.replace(/≤/g, '\\leq ');
    latex = latex.replace(/≥/g, '\\geq ');
    latex = latex.replace(/≠/g, '\\neq ');
    latex = latex.replace(/∞/g, '\\infty ');
    latex = latex.replace(/\^(\d+)/g, '^{$1}');

    if (type === 'fraction') {
      const fractionMatch = latex.match(/(\d+)\s*\\div\s*(\d+)/);
      if (fractionMatch) {
        latex = `\\frac{${fractionMatch[1]}}{${fractionMatch[2]}}`;
      }
    }

    return latex;
  }

  private createError(
    message: string,
    code: import('../types.js').OCRErrorCode,
    isRetryable = false,
    originalError?: Error
  ): import('../types.js').OCRError {
    const { OCRError: OCRErrorClass } = require('../types.js');
    return new OCRErrorClass(message, this.name, code, isRetryable, originalError);
  }
}

// Export singleton instance
export const googleVisionProvider = new GoogleVisionProvider();
