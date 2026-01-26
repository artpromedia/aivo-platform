/**
 * AWS Textract OCR Provider
 * Integrates with AWS Textract for document text extraction,
 * form and table extraction, and handwriting support
 */

import {
  TextractClient,
  DetectDocumentTextCommand,
  AnalyzeDocumentCommand,
  type Block,
  type BoundingBox as TextractBoundingBox,
  type Geometry,
} from '@aws-sdk/client-textract';

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
  AWSTextractConfig,
} from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

export class AWSTextractProvider extends BaseOCRProvider implements IOCRProvider {
  readonly name: OCRProvider = 'aws-textract';
  readonly displayName = 'AWS Textract';

  private readonly client: TextractClient | null;
  private readonly region: string;

  // Pricing: $1.50 per 1000 pages for DetectDocumentText
  // $15 per 1000 pages for AnalyzeDocument with forms/tables
  private readonly costPerPage = 0.0015;
  private readonly costPerPageWithAnalysis = 0.015;

  constructor(config?: AWSTextractConfig) {
    super();
    this.region = config?.region ?? process.env.AWS_REGION ?? 'us-east-1';

    const accessKeyId = config?.accessKeyId ?? process.env.AWS_TEXTRACT_ACCESS_KEY_ID;
    const secretAccessKey = config?.secretAccessKey ?? process.env.AWS_TEXTRACT_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      this.client = new TextractClient({
        region: this.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    } else {
      this.client = null;
    }
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

      if (!this.client) {
        throw this.createError(
          'AWS Textract credentials not configured',
          'AUTHENTICATION_FAILED'
        );
      }

      // Determine whether to use simple detection or full analysis
      const useAnalysis = options?.detectHandwriting;

      let response: { Blocks?: Block[] };

      if (useAnalysis) {
        // Use AnalyzeDocument for more features
        const command = new AnalyzeDocumentCommand({
          Document: { Bytes: image },
          FeatureTypes: ['TABLES', 'FORMS'],
        });
        response = await this.client.send(command);
      } else {
        // Use DetectDocumentText for basic OCR
        const command = new DetectDocumentTextCommand({
          Document: { Bytes: image },
        });
        response = await this.client.send(command);
      }

      const blocks = response.Blocks ?? [];

      // Parse response
      const ocrResult = this.parseBlocks(blocks, options);

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

      const errorMessage = (error as Error).message;

      if (errorMessage.includes('ThrottlingException')) {
        throw this.createError('Rate limit exceeded', 'RATE_LIMITED', true);
      }
      if (errorMessage.includes('AccessDenied') || errorMessage.includes('InvalidSignature')) {
        throw this.createError('Authentication failed', 'AUTHENTICATION_FAILED');
      }
      if (errorMessage.includes('ValidationException')) {
        throw this.createError('Invalid image format', 'INVALID_IMAGE');
      }
      if (errorMessage.includes('ProvisionedThroughputExceeded')) {
        throw this.createError('Quota exceeded', 'QUOTA_EXCEEDED', true);
      }

      throw this.createError(
        `AWS Textract processing failed: ${errorMessage}`,
        'PROCESSING_FAILED',
        true,
        error as Error
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.client !== null;
  }

  estimateCost(imageSizeBytes: number): number {
    // Textract charges per page, assuming 1 page per image
    return this.costPerPage;
  }

  getSupportedFeatures(): ProviderFeatures {
    return {
      textDetection: true,
      handwritingRecognition: true,
      mathEquationDetection: true, // Pattern-based
      tableExtraction: true,
      formExtraction: true,
      documentLayoutAnalysis: true,
      multiLanguage: false, // Textract primarily supports English
      pdfSupport: true,
      batchProcessing: true,
      asyncProcessing: true, // For large documents
      boundingBoxes: true,
      confidenceScores: true,
      languageDetection: false,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private parseBlocks(
    blocks: Block[],
    options?: OCROptions
  ): Omit<OCRResult, 'processingTimeMs' | 'provider'> {
    // Extract text from LINE blocks
    const lineBlocks = blocks.filter((b) => b.BlockType === 'LINE');
    const wordBlocks = blocks.filter((b) => b.BlockType === 'WORD');

    // Build full text from lines
    const text = lineBlocks.map((b) => b.Text ?? '').join('\n');

    // Calculate average confidence
    const confidence = this.calculateConfidence(lineBlocks);

    // Extract bounding boxes from word blocks
    const boundingBoxes = this.extractBoundingBoxes(wordBlocks, lineBlocks);

    // Detect handwriting
    const isHandwritten = options?.detectHandwriting
      ? this.detectHandwriting(wordBlocks)
      : undefined;

    // Detect math expressions
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
      language: 'en', // Textract primarily supports English
      containsMath,
      mathExpressions,
      isHandwritten,
    };
  }

  private calculateConfidence(lineBlocks: Block[]): number {
    if (lineBlocks.length === 0) {
      return 0;
    }

    const totalConfidence = lineBlocks.reduce((sum, block) => {
      return sum + (block.Confidence ?? 0);
    }, 0);

    return totalConfidence / lineBlocks.length / 100; // Normalize to 0-1
  }

  private extractBoundingBoxes(wordBlocks: Block[], lineBlocks: Block[]): BoundingBox[] {
    const boxes: BoundingBox[] = [];

    // Build line index for each word
    const lineIndex = new Map<string, number>();
    lineBlocks.forEach((line, index) => {
      if (line.Id) {
        lineIndex.set(line.Id, index + 1);
      }
    });

    // Track word position within each line
    const lineWordCounts = new Map<number, number>();

    for (const word of wordBlocks) {
      if (!word.Text || !word.Geometry?.BoundingBox) {
        continue;
      }

      // Find the line this word belongs to
      const lineId = this.findParentLine(word, lineBlocks);
      const lineNum = lineId ? (lineIndex.get(lineId) ?? 1) : 1;

      // Track word index within line
      const currentCount = lineWordCounts.get(lineNum) ?? 0;
      lineWordCounts.set(lineNum, currentCount + 1);

      boxes.push({
        text: word.Text,
        confidence: (word.Confidence ?? 0) / 100,
        coordinates: this.convertTextractBoundingBox(word.Geometry.BoundingBox),
        lineNumber: lineNum,
        wordIndex: currentCount + 1,
        isHandwritten: word.TextType === 'HANDWRITING',
      });
    }

    return boxes;
  }

  private findParentLine(word: Block, lineBlocks: Block[]): string | undefined {
    // Find the line that contains this word based on vertical position
    const wordBbox = word.Geometry?.BoundingBox;
    if (!wordBbox) return undefined;

    const wordCenterY = (wordBbox.Top ?? 0) + (wordBbox.Height ?? 0) / 2;

    for (const line of lineBlocks) {
      const lineBbox = line.Geometry?.BoundingBox;
      if (!lineBbox) continue;

      const lineTop = lineBbox.Top ?? 0;
      const lineBottom = lineTop + (lineBbox.Height ?? 0);

      if (wordCenterY >= lineTop && wordCenterY <= lineBottom) {
        return line.Id;
      }
    }

    return undefined;
  }

  private convertTextractBoundingBox(bbox: TextractBoundingBox): BoundingBox['coordinates'] {
    // Textract uses normalized coordinates (0-1)
    // Convert to pixel-like coordinates (multiply by 1000 for consistency)
    const scale = 1000;

    const left = (bbox.Left ?? 0) * scale;
    const top = (bbox.Top ?? 0) * scale;
    const width = (bbox.Width ?? 0) * scale;
    const height = (bbox.Height ?? 0) * scale;

    return {
      topLeft: { x: left, y: top },
      topRight: { x: left + width, y: top },
      bottomLeft: { x: left, y: top + height },
      bottomRight: { x: left + width, y: top + height },
    };
  }

  private detectHandwriting(wordBlocks: Block[]): boolean {
    if (wordBlocks.length === 0) {
      return false;
    }

    // Count words detected as handwriting
    const handwrittenCount = wordBlocks.filter((w) => w.TextType === 'HANDWRITING').length;
    const ratio = handwrittenCount / wordBlocks.length;

    // If more than 30% of words are handwritten, classify as handwritten
    return ratio > 0.3;
  }

  private detectMathExpressions(
    text: string,
    boundingBoxes: BoundingBox[]
  ): { expressions: MathExpression[]; containsMath: boolean } {
    const expressions: MathExpression[] = [];

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
export const awsTextractProvider = new AWSTextractProvider();
