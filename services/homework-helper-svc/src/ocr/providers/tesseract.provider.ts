/**
 * Tesseract OCR Provider
 * Self-hosted Tesseract OCR with support for multiple languages,
 * handwriting optimization, and math equation detection
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
  OCRError,
} from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TESSERACT TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface TesseractWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  line: number;
  word: number;
}

interface TesseractLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  words: TesseractWord[];
}

interface TesseractResult {
  text: string;
  confidence: number;
  lines?: TesseractLine[];
  words?: TesseractWord[];
  hocr?: string;
}

interface TesseractWorker {
  loadLanguage(lang: string): Promise<void>;
  initialize(lang: string): Promise<void>;
  setParameters(params: Record<string, string | number>): Promise<void>;
  recognize(image: Buffer): Promise<{ data: TesseractResult }>;
  terminate(): Promise<void>;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

export class TesseractProvider extends BaseOCRProvider implements IOCRProvider {
  readonly name: OCRProvider = 'tesseract';
  readonly displayName = 'Tesseract OCR';

  private worker: TesseractWorker | null = null;
  private isInitialized = false;
  private currentLanguage = 'eng';

  private readonly config: {
    dataPath?: string;
    workerPath?: string;
    handwritingMode: boolean;
  };

  constructor(config?: { dataPath?: string; workerPath?: string; handwritingMode?: boolean }) {
    super();
    this.config = {
      dataPath: config?.dataPath,
      workerPath: config?.workerPath,
      handwritingMode: config?.handwritingMode ?? false,
    };
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

      // Initialize worker if needed
      await this.ensureInitialized(options?.language ?? 'eng');

      // Configure OCR parameters based on options
      await this.configureWorker(options);

      // Perform OCR
      const result = await this.worker!.recognize(image);
      const data = result.data;

      // Extract bounding boxes
      const boundingBoxes = this.extractBoundingBoxes(data);

      // Detect math expressions if requested
      let mathExpressions: MathExpression[] | undefined;
      let containsMath = false;

      if (options?.detectMath || options?.optimizeForMath) {
        const mathResult = this.detectMathExpressions(data.text, boundingBoxes);
        mathExpressions = mathResult.expressions;
        containsMath = mathResult.containsMath;
      }

      const processingTimeMs = Date.now() - startTime;
      this.recordSuccess(processingTimeMs);

      return {
        text: data.text,
        confidence: data.confidence / 100, // Normalize to 0-1
        boundingBoxes,
        language: this.currentLanguage,
        processingTimeMs,
        provider: this.name,
        containsMath,
        mathExpressions,
        isHandwritten: options?.detectHandwriting ? this.detectHandwriting(data) : undefined,
      };
    } catch (error) {
      this.recordFailure();
      if ((error as Error).name === 'OCRError') {
        throw error;
      }
      throw this.createError(
        `Tesseract processing failed: ${(error as Error).message}`,
        'PROCESSING_FAILED',
        true,
        error as Error
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    // Tesseract.js is always available as it's a JavaScript implementation
    // Check if the optional dependency is installed
    try {
      await import('tesseract.js');
      return true;
    } catch {
      return process.env.TESSERACT_ENABLED === 'true';
    }
  }

  estimateCost(imageSizeBytes: number): number {
    // Tesseract is self-hosted, no per-image cost
    return 0;
  }

  getSupportedFeatures(): ProviderFeatures {
    return {
      textDetection: true,
      handwritingRecognition: true, // Limited but supported
      mathEquationDetection: true, // Pattern-based detection
      tableExtraction: false,
      formExtraction: false,
      documentLayoutAnalysis: true,
      multiLanguage: true,
      pdfSupport: false, // Would need pdf-to-img conversion
      batchProcessing: false,
      asyncProcessing: false,
      boundingBoxes: true,
      confidenceScores: true,
      languageDetection: false,
    };
  }

  async shutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private async ensureInitialized(language: string): Promise<void> {
    if (this.isInitialized && this.currentLanguage === language) {
      return;
    }

    try {
      const Tesseract = await import('tesseract.js');

      if (this.worker) {
        await this.worker.terminate();
      }

      const createWorkerOptions: Record<string, string | undefined> = {};
      if (this.config.workerPath) {
        createWorkerOptions.workerPath = this.config.workerPath;
      }
      if (this.config.dataPath) {
        createWorkerOptions.langPath = this.config.dataPath;
      }

      this.worker = await Tesseract.createWorker(
        language,
        Tesseract.OEM.LSTM_ONLY,
        createWorkerOptions
      ) as unknown as TesseractWorker;

      this.currentLanguage = language;
      this.isInitialized = true;
    } catch (error) {
      throw this.createError(
        `Failed to initialize Tesseract: ${(error as Error).message}. ` +
          'Ensure tesseract.js is installed: npm install tesseract.js',
        'PROVIDER_UNAVAILABLE',
        false,
        error as Error
      );
    }
  }

  private async configureWorker(options?: OCROptions): Promise<void> {
    if (!this.worker) return;

    const params: Record<string, string | number> = {};

    // Page segmentation mode
    if (options?.pageSegmentationMode) {
      const psmMap: Record<string, number> = {
        'auto': 3,
        'single-column': 4,
        'single-block': 6,
        'single-line': 7,
        'single-word': 8,
        'sparse-text': 11,
      };
      params.tessedit_pageseg_mode = psmMap[options.pageSegmentationMode] ?? 3;
    }

    // Optimize for handwriting
    if (options?.detectHandwriting || this.config.handwritingMode) {
      params.tessedit_char_whitelist =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?\'"()-+=×÷<>≤≥≠√∑∫πθαβγ ';
    }

    // Optimize for math
    if (options?.optimizeForMath) {
      params.tessedit_char_whitelist =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,+-=×÷*/()[]{}^√∑∫πθαβγδεηλμσφωΣΠΔ<>≤≥≠≈∞ ';
    }

    if (Object.keys(params).length > 0) {
      await this.worker.setParameters(params);
    }
  }

  private extractBoundingBoxes(data: TesseractResult): BoundingBox[] {
    const boxes: BoundingBox[] = [];

    if (data.lines) {
      let lineNumber = 0;
      for (const line of data.lines) {
        lineNumber++;
        let wordIndex = 0;

        for (const word of line.words || []) {
          wordIndex++;
          boxes.push({
            text: word.text,
            confidence: word.confidence / 100,
            coordinates: {
              topLeft: { x: word.bbox.x0, y: word.bbox.y0 },
              topRight: { x: word.bbox.x1, y: word.bbox.y0 },
              bottomLeft: { x: word.bbox.x0, y: word.bbox.y1 },
              bottomRight: { x: word.bbox.x1, y: word.bbox.y1 },
            },
            lineNumber,
            wordIndex,
          });
        }
      }
    } else if (data.words) {
      let currentLine = 0;
      let wordIndex = 0;

      for (const word of data.words) {
        if (word.line !== currentLine) {
          currentLine = word.line;
          wordIndex = 0;
        }
        wordIndex++;

        boxes.push({
          text: word.text,
          confidence: word.confidence / 100,
          coordinates: {
            topLeft: { x: word.bbox.x0, y: word.bbox.y0 },
            topRight: { x: word.bbox.x1, y: word.bbox.y0 },
            bottomLeft: { x: word.bbox.x0, y: word.bbox.y1 },
            bottomRight: { x: word.bbox.x1, y: word.bbox.y1 },
          },
          lineNumber: word.line + 1,
          wordIndex,
        });
      }
    }

    return boxes;
  }

  private detectMathExpressions(
    text: string,
    boundingBoxes: BoundingBox[]
  ): { expressions: MathExpression[]; containsMath: boolean } {
    const expressions: MathExpression[] = [];

    // Math pattern matchers
    const patterns: Array<{ regex: RegExp; type: MathExpressionType }> = [
      // Equations: x = 5, 2 + 2 = 4
      { regex: /[\w\d\s]+\s*=\s*[\w\d\s+\-*/()]+/g, type: 'equation' },
      // Fractions: a/b
      { regex: /\d+\s*\/\s*\d+/g, type: 'fraction' },
      // Exponents: x^2, 2^3
      { regex: /[\w\d]+\s*\^\s*[\w\d]+/g, type: 'exponent' },
      // Radicals: √x, √(x+1)
      { regex: /√\s*[\w\d()]+/g, type: 'radical' },
      // Summation: Σ
      { regex: /[Σ∑]\s*[\w\d()=]+/g, type: 'summation' },
      // Integral: ∫
      { regex: /[∫]\s*[\w\d()]+/g, type: 'integral' },
      // Inequalities: x < 5, x >= y
      { regex: /[\w\d]+\s*[<>≤≥]\s*[\w\d]+/g, type: 'inequality' },
      // Functions: sin(x), log(x)
      { regex: /(?:sin|cos|tan|log|ln|exp)\s*\([^)]+\)/gi, type: 'function' },
      // Basic arithmetic: 2 + 3, 4 * 5
      { regex: /\d+\s*[+\-*/×÷]\s*\d+/g, type: 'equation' },
    ];

    let containsMath = false;

    for (const { regex, type } of patterns) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        containsMath = true;

        // Find bounding box for this expression
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
    // Try to find matching words in bounding boxes
    const words = expression.split(/\s+/);
    const matchingBoxes: BoundingBox[] = [];

    for (const word of words) {
      const box = boundingBoxes.find(
        (b) => b.text.toLowerCase() === word.toLowerCase() ||
               b.text.includes(word) ||
               word.includes(b.text)
      );
      if (box) {
        matchingBoxes.push(box);
      }
    }

    if (matchingBoxes.length === 0) {
      // Return empty bounding box
      return {
        text: expression,
        confidence: 0.5,
        coordinates: this.createEmptyBoundingBox(),
      };
    }

    // Combine bounding boxes
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

    // Basic conversions
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

    // Handle exponents: x^2 -> x^{2}
    latex = latex.replace(/\^(\d+)/g, '^{$1}');

    // Handle fractions: a/b -> \frac{a}{b}
    if (type === 'fraction') {
      const fractionMatch = latex.match(/(\d+)\s*\\div\s*(\d+)/);
      if (fractionMatch) {
        latex = `\\frac{${fractionMatch[1]}}{${fractionMatch[2]}}`;
      }
    }

    return latex;
  }

  private detectHandwriting(data: TesseractResult): boolean {
    // Heuristics for handwriting detection
    // - Low overall confidence
    // - High variance in character sizes
    // - Irregular spacing

    if (data.confidence < 60) {
      return true; // Low confidence often indicates handwriting
    }

    if (data.lines && data.lines.length > 0) {
      // Check confidence variance across lines
      const confidences = data.lines.map((l) => l.confidence);
      const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      const variance =
        confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) /
        confidences.length;

      // High variance suggests handwriting
      if (variance > 200) {
        return true;
      }
    }

    return false;
  }

  private createError(
    message: string,
    code: import('../types.js').OCRErrorCode,
    isRetryable = false,
    originalError?: Error
  ): OCRError {
    const { OCRError: OCRErrorClass } = require('../types.js');
    return new OCRErrorClass(message, this.name, code, isRetryable, originalError);
  }
}

// Export singleton instance
export const tesseractProvider = new TesseractProvider();
