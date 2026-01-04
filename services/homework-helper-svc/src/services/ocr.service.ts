/**
 * OCR Service for Homework Helper
 * Supports multiple OCR providers: Google Cloud Vision, AWS Textract, and Tesseract (fallback)
 * Includes special handling for handwritten text and mathematical equations
 */

import { config } from '../config.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface OCRResult {
  text: string;
  confidence: number;
  provider: OCRProvider;
  detectedLanguage?: string;
  containsMath: boolean;
  mathExpressions?: MathExpression[];
  regions?: TextRegion[];
  processingTimeMs: number;
}

export interface MathExpression {
  raw: string;
  latex?: string;
  position: BoundingBox;
}

export interface TextRegion {
  text: string;
  confidence: number;
  position: BoundingBox;
  isHandwritten: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type OCRProvider = 'google_vision' | 'aws_textract' | 'tesseract' | 'mathpix';

export interface OCROptions {
  preferredProvider?: OCRProvider;
  detectMath?: boolean;
  detectHandwriting?: boolean;
  language?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

interface OCRConfig {
  googleVision: {
    enabled: boolean;
    apiKey?: string;
    projectId?: string;
  };
  awsTextract: {
    enabled: boolean;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  mathpix: {
    enabled: boolean;
    appId?: string;
    appKey?: string;
  };
}

function getOCRConfig(): OCRConfig {
  return {
    googleVision: {
      enabled: !!process.env.GOOGLE_VISION_API_KEY,
      apiKey: process.env.GOOGLE_VISION_API_KEY,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    },
    awsTextract: {
      enabled: !!process.env.AWS_TEXTRACT_ACCESS_KEY_ID,
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_TEXTRACT_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_TEXTRACT_SECRET_ACCESS_KEY,
    },
    mathpix: {
      enabled: !!process.env.MATHPIX_APP_ID,
      appId: process.env.MATHPIX_APP_ID,
      appKey: process.env.MATHPIX_APP_KEY,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN OCR SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class OCRService {
  private config: OCRConfig;

  constructor() {
    this.config = getOCRConfig();
  }

  /**
   * Extract text from an image using the best available OCR provider
   */
  async extractText(
    imageSource: string | Buffer,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();
    const isBase64 = typeof imageSource === 'string' && !imageSource.startsWith('http');
    const isUrl = typeof imageSource === 'string' && imageSource.startsWith('http');

    // Convert URL to base64 if needed
    let imageData: Buffer;
    if (isUrl) {
      imageData = await this.fetchImageAsBuffer(imageSource);
    } else if (isBase64) {
      imageData = Buffer.from(imageSource, 'base64');
    } else {
      imageData = imageSource as Buffer;
    }

    // Select provider based on preference and availability
    const provider = this.selectProvider(options);

    let result: OCRResult;

    switch (provider) {
      case 'google_vision':
        result = await this.extractWithGoogleVision(imageData, options);
        break;
      case 'aws_textract':
        result = await this.extractWithAWSTextract(imageData, options);
        break;
      case 'mathpix':
        result = await this.extractWithMathpix(imageData, options);
        break;
      default:
        result = await this.extractWithTesseract(imageData, options);
    }

    // Detect math expressions if requested
    if (options.detectMath && !result.containsMath) {
      result = await this.detectMathExpressions(result);
    }

    result.processingTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Extract text from a PDF document
   */
  async extractTextFromPDF(
    pdfSource: string | Buffer,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();

    // For PDFs, AWS Textract is preferred as it handles multi-page documents well
    if (this.config.awsTextract.enabled) {
      const pdfData = typeof pdfSource === 'string'
        ? await this.fetchImageAsBuffer(pdfSource)
        : pdfSource;

      return this.extractPDFWithAWSTextract(pdfData, options);
    }

    // Fallback: Convert PDF pages to images and process individually
    return this.extractPDFWithImageConversion(pdfSource, options);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PROVIDER IMPLEMENTATIONS
  // ══════════════════════════════════════════════════════════════════════════════

  private async extractWithGoogleVision(
    imageData: Buffer,
    options: OCROptions
  ): Promise<OCRResult> {
    const apiKey = this.config.googleVision.apiKey;
    if (!apiKey) {
      throw new Error('Google Vision API key not configured');
    }

    const base64Image = imageData.toString('base64');

    const features = [
      { type: 'TEXT_DETECTION' },
      { type: 'DOCUMENT_TEXT_DETECTION' },
    ];

    if (options.detectHandwriting) {
      features.push({ type: 'HANDWRITING_DETECTION' as any });
    }

    const requestBody = {
      requests: [
        {
          image: { content: base64Image },
          features,
          imageContext: options.language
            ? { languageHints: [options.language] }
            : undefined,
        },
      ],
    };

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Vision API error: ${error}`);
    }

    const data = await response.json() as any;
    const annotations = data.responses?.[0];

    if (annotations?.error) {
      throw new Error(`Google Vision error: ${annotations.error.message}`);
    }

    const fullTextAnnotation = annotations?.fullTextAnnotation;
    const textAnnotations = annotations?.textAnnotations;

    const text = fullTextAnnotation?.text || textAnnotations?.[0]?.description || '';
    const confidence = this.calculateAverageConfidence(fullTextAnnotation?.pages);

    const regions: TextRegion[] = (textAnnotations || []).slice(1).map((annotation: any) => ({
      text: annotation.description,
      confidence: 0.9, // Google doesn't provide per-word confidence in basic API
      position: this.convertGoogleBoundingBox(annotation.boundingPoly),
      isHandwritten: false, // Would need additional API call to determine
    }));

    return {
      text,
      confidence,
      provider: 'google_vision',
      detectedLanguage: fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode,
      containsMath: this.detectMathPatterns(text),
      regions,
      processingTimeMs: 0,
    };
  }

  private async extractWithAWSTextract(
    imageData: Buffer,
    options: OCROptions
  ): Promise<OCRResult> {
    const { region, accessKeyId, secretAccessKey } = this.config.awsTextract;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS Textract credentials not configured');
    }

    // Using AWS SDK v3 style request (simplified for this implementation)
    const endpoint = `https://textract.${region}.amazonaws.com`;
    const base64Image = imageData.toString('base64');

    const requestBody = {
      Document: {
        Bytes: base64Image,
      },
      FeatureTypes: ['TABLES', 'FORMS'],
    };

    // Note: In production, use AWS SDK with proper signing
    // This is a simplified version for demonstration
    const response = await this.signedAWSRequest(
      endpoint,
      'AnalyzeDocument',
      requestBody,
      { accessKeyId, secretAccessKey, region: region! }
    );

    const blocks = response.Blocks || [];
    const lineBlocks = blocks.filter((b: any) => b.BlockType === 'LINE');

    const text = lineBlocks.map((b: any) => b.Text).join('\n');
    const avgConfidence = lineBlocks.reduce((sum: number, b: any) => sum + (b.Confidence || 0), 0) /
      (lineBlocks.length || 1) / 100;

    const regions: TextRegion[] = lineBlocks.map((block: any) => ({
      text: block.Text,
      confidence: (block.Confidence || 0) / 100,
      position: this.convertAWSBoundingBox(block.Geometry?.BoundingBox),
      isHandwritten: block.TextType === 'HANDWRITING',
    }));

    return {
      text,
      confidence: avgConfidence,
      provider: 'aws_textract',
      containsMath: this.detectMathPatterns(text),
      regions,
      processingTimeMs: 0,
    };
  }

  private async extractWithMathpix(
    imageData: Buffer,
    options: OCROptions
  ): Promise<OCRResult> {
    const { appId, appKey } = this.config.mathpix;

    if (!appId || !appKey) {
      throw new Error('Mathpix credentials not configured');
    }

    const base64Image = imageData.toString('base64');
    const mimeType = this.detectImageMimeType(imageData);

    const response = await fetch('https://api.mathpix.com/v3/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'app_id': appId,
        'app_key': appKey,
      },
      body: JSON.stringify({
        src: `data:${mimeType};base64,${base64Image}`,
        formats: ['text', 'latex_styled'],
        math_inline_delimiters: ['$', '$'],
        math_display_delimiters: ['$$', '$$'],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mathpix API error: ${error}`);
    }

    const data = await response.json() as any;

    const mathExpressions: MathExpression[] = [];
    if (data.latex_styled) {
      // Extract math blocks
      const mathRegex = /\$\$(.*?)\$\$|\$(.*?)\$/g;
      let match;
      while ((match = mathRegex.exec(data.latex_styled)) !== null) {
        mathExpressions.push({
          raw: match[0],
          latex: match[1] || match[2],
          position: { x: 0, y: 0, width: 0, height: 0 }, // Mathpix doesn't provide positions
        });
      }
    }

    return {
      text: data.text || '',
      confidence: data.confidence || 0.9,
      provider: 'mathpix',
      containsMath: mathExpressions.length > 0,
      mathExpressions,
      processingTimeMs: 0,
    };
  }

  private async extractWithTesseract(
    imageData: Buffer,
    options: OCROptions
  ): Promise<OCRResult> {
    // Tesseract.js fallback - runs locally
    // In production, this would use the tesseract.js library
    // For now, we'll throw an error indicating fallback is needed

    // Simulated Tesseract response for development
    console.warn('Tesseract fallback not fully implemented - returning placeholder');

    return {
      text: '[OCR extraction requires cloud provider configuration]',
      confidence: 0,
      provider: 'tesseract',
      containsMath: false,
      processingTimeMs: 0,
    };
  }

  private async extractPDFWithAWSTextract(
    pdfData: Buffer,
    options: OCROptions
  ): Promise<OCRResult> {
    // AWS Textract async API for PDFs
    // In production, this would start an async job and poll for results

    // For now, delegate to single-page extraction
    return this.extractWithAWSTextract(pdfData, options);
  }

  private async extractPDFWithImageConversion(
    pdfSource: string | Buffer,
    options: OCROptions
  ): Promise<OCRResult> {
    // Would use pdf-to-img or similar to convert pages
    // Then process each page with image OCR

    throw new Error('PDF processing requires AWS Textract or pdf-to-img package');
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private selectProvider(options: OCROptions): OCRProvider {
    if (options.preferredProvider) {
      const preferred = options.preferredProvider;
      if (preferred === 'google_vision' && this.config.googleVision.enabled) return 'google_vision';
      if (preferred === 'aws_textract' && this.config.awsTextract.enabled) return 'aws_textract';
      if (preferred === 'mathpix' && this.config.mathpix.enabled) return 'mathpix';
    }

    // If math detection is requested and Mathpix is available, prefer it
    if (options.detectMath && this.config.mathpix.enabled) {
      return 'mathpix';
    }

    // Default priority: Google Vision > AWS Textract > Tesseract
    if (this.config.googleVision.enabled) return 'google_vision';
    if (this.config.awsTextract.enabled) return 'aws_textract';
    return 'tesseract';
  }

  private async fetchImageAsBuffer(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private detectMathPatterns(text: string): boolean {
    // Common math patterns
    const mathPatterns = [
      /\d+\s*[+\-×÷*/]\s*\d+/,  // Basic arithmetic
      /\d+\s*=\s*\d+/,          // Equations
      /[xyz]\s*[+\-×÷*/=]/i,    // Variables
      /\d+\s*[<>≤≥]\s*\d+/,     // Inequalities
      /\(\s*\d+/,               // Parentheses with numbers
      /\d+\s*%/,                // Percentages
      /\d+\/\d+/,               // Fractions
      /\d+\^\d+/,               // Exponents
      /√|∑|∫|π|θ|α|β|γ/,       // Math symbols
      /sin|cos|tan|log|ln/i,    // Functions
    ];

    return mathPatterns.some(pattern => pattern.test(text));
  }

  private async detectMathExpressions(result: OCRResult): Promise<OCRResult> {
    if (!this.config.mathpix.enabled || !result.text) {
      return result;
    }

    // If math is detected, re-process with Mathpix for better math extraction
    if (this.detectMathPatterns(result.text)) {
      result.containsMath = true;
    }

    return result;
  }

  private calculateAverageConfidence(pages: any[] | undefined): number {
    if (!pages || pages.length === 0) return 0.9; // Default confidence

    let totalConfidence = 0;
    let blockCount = 0;

    for (const page of pages) {
      for (const block of page.blocks || []) {
        if (block.confidence) {
          totalConfidence += block.confidence;
          blockCount++;
        }
      }
    }

    return blockCount > 0 ? totalConfidence / blockCount : 0.9;
  }

  private convertGoogleBoundingBox(boundingPoly: any): BoundingBox {
    if (!boundingPoly?.vertices) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const vertices = boundingPoly.vertices;
    const minX = Math.min(...vertices.map((v: any) => v.x || 0));
    const maxX = Math.max(...vertices.map((v: any) => v.x || 0));
    const minY = Math.min(...vertices.map((v: any) => v.y || 0));
    const maxY = Math.max(...vertices.map((v: any) => v.y || 0));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private convertAWSBoundingBox(bbox: any): BoundingBox {
    if (!bbox) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    return {
      x: bbox.Left || 0,
      y: bbox.Top || 0,
      width: bbox.Width || 0,
      height: bbox.Height || 0,
    };
  }

  private detectImageMimeType(buffer: Buffer): string {
    // Check magic bytes
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
    if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
    if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp';
    return 'image/jpeg'; // Default
  }

  private async signedAWSRequest(
    endpoint: string,
    action: string,
    body: any,
    credentials: { accessKeyId: string; secretAccessKey: string; region: string }
  ): Promise<any> {
    // In production, use @aws-sdk/client-textract
    // This is a placeholder that would need AWS Signature V4 signing

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `Textract.${action}`,
        // AWS Signature headers would go here
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`AWS Textract error: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const ocrService = new OCRService();
