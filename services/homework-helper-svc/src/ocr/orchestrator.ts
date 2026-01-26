/**
 * OCR Orchestrator
 * Manages provider selection, preprocessing, and post-processing for OCR operations
 */

import type { IOCRProvider } from './provider-interface.js';
import type {
  OCRResult,
  OCRProvider,
  OCROptions,
  ProcessingHints,
  Subject,
  PreprocessingOptions,
  PreprocessingResult,
  EnhancementOptions,
  SpellCorrectionResult,
  MathNormalizationResult,
  ProviderStatus,
  OCRError,
  ImageMetadata,
} from './types.js';

import { tesseractProvider } from './providers/tesseract.provider.js';
import { googleVisionProvider } from './providers/google-vision.provider.js';
import { awsTextractProvider } from './providers/aws-textract.provider.js';

// ══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class OCROrchestrator {
  private readonly providers: Map<OCRProvider, IOCRProvider> = new Map();
  private readonly providerPriority: OCRProvider[] = [
    'google-vision',
    'aws-textract',
    'tesseract',
  ];

  constructor() {
    // Register all available providers
    this.providers.set('tesseract', tesseractProvider);
    this.providers.set('google-vision', googleVisionProvider);
    this.providers.set('aws-textract', awsTextractProvider);
  }

  /**
   * Process an image using the best available OCR provider
   * Provider selection is based on:
   * - Image characteristics (handwritten vs printed)
   * - Subject matter (math needs specialized processing)
   * - Cost optimization
   * - Availability/failover
   */
  async processImage(
    image: Buffer,
    hints?: ProcessingHints
  ): Promise<OCRResult> {
    // Preprocess the image
    const preprocessed = await this.preprocessImage(image, hints);

    // Select the best provider
    const provider = await this.selectProvider(hints, preprocessed.metadata);

    // Build OCR options from hints
    const options = this.buildOptions(hints);

    // Process with selected provider
    let result: OCRResult;
    try {
      result = await provider.process(preprocessed.processedImage, options);
    } catch (error) {
      // Attempt failover to next available provider
      result = await this.handleFailover(
        error as Error,
        preprocessed.processedImage,
        options,
        provider.name
      );
    }

    // Enhance results with post-processing
    result = await this.enhanceResults(result, hints?.subject);

    return result;
  }

  /**
   * Pre-processing pipeline for image optimization
   * - Auto-rotate
   * - Contrast enhancement
   * - Noise reduction
   * - Binarization for text
   */
  async preprocessImage(
    image: Buffer,
    hints?: ProcessingHints
  ): Promise<PreprocessingResult> {
    const startTime = Date.now();
    const transformations: string[] = [];

    // Detect image metadata
    const metadata = this.detectImageMetadata(image);

    let processedImage = image;

    // For production, you would use sharp or jimp for image processing
    // Here we'll implement basic preprocessing logic

    // Auto-rotation (based on EXIF data or orientation detection)
    if (this.needsRotation(image, metadata)) {
      processedImage = await this.rotateImage(processedImage, metadata);
      transformations.push('auto-rotate');
    }

    // Enhance contrast for low-contrast images
    if (this.needsContrastEnhancement(hints)) {
      processedImage = await this.enhanceContrast(processedImage);
      transformations.push('contrast-enhancement');
    }

    // Noise reduction for handwritten content
    if (hints?.isHandwritten) {
      processedImage = await this.reduceNoise(processedImage);
      transformations.push('noise-reduction');
    }

    // Binarization for better text extraction
    if (this.shouldBinarize(hints)) {
      processedImage = await this.binarizeImage(processedImage);
      transformations.push('binarization');
    }

    return {
      originalImage: image,
      processedImage,
      metadata,
      transformations,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Post-processing to enhance OCR results
   * - Spell correction
   * - Math symbol normalization
   * - Curriculum term mapping
   */
  async enhanceResults(result: OCRResult, subject?: Subject): Promise<OCRResult> {
    let enhancedText = result.text;
    const warnings: string[] = [...(result.warnings ?? [])];

    // Spell correction (except for math where precision is critical)
    if (subject !== 'MATH') {
      const spellResult = await this.correctSpelling(enhancedText, subject);
      if (spellResult.corrections.length > 0) {
        enhancedText = spellResult.corrected;
        warnings.push(`Corrected ${spellResult.corrections.length} potential spelling errors`);
      }
    }

    // Math symbol normalization
    if (subject === 'MATH' || result.containsMath) {
      const mathResult = this.normalizeMathSymbols(enhancedText);
      if (mathResult.substitutions.length > 0) {
        enhancedText = mathResult.normalized;
      }
    }

    // Curriculum term mapping
    if (subject) {
      enhancedText = this.mapCurriculumTerms(enhancedText, subject);
    }

    return {
      ...result,
      text: enhancedText,
      warnings,
    };
  }

  /**
   * Get status of all registered providers
   */
  async getProviderStatuses(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];

    for (const [name, provider] of this.providers) {
      const status = await provider.getStatus();
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Get a specific provider by name
   */
  getProvider(name: OCRProvider): IOCRProvider | undefined {
    return this.providers.get(name);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PROVIDER SELECTION
  // ══════════════════════════════════════════════════════════════════════════════

  private async selectProvider(
    hints?: ProcessingHints,
    metadata?: ImageMetadata
  ): Promise<IOCRProvider> {
    // If a specific provider is preferred and available, use it
    if (hints?.preferredProvider) {
      const preferred = this.providers.get(hints.preferredProvider);
      if (preferred && (await preferred.isAvailable())) {
        return preferred;
      }
    }

    // Build priority list based on hints
    const priorityOrder = this.buildProviderPriority(hints, metadata);

    // Find first available provider
    for (const providerName of priorityOrder) {
      const provider = this.providers.get(providerName);
      if (provider && (await provider.isAvailable())) {
        return provider;
      }
    }

    // Fallback to Tesseract (always available)
    const tesseract = this.providers.get('tesseract');
    if (tesseract) {
      return tesseract;
    }

    throw new Error('No OCR provider available');
  }

  private buildProviderPriority(
    hints?: ProcessingHints,
    metadata?: ImageMetadata
  ): OCRProvider[] {
    const priority: OCRProvider[] = [];

    // For handwritten content, prefer cloud providers
    if (hints?.isHandwritten) {
      priority.push('google-vision', 'aws-textract', 'tesseract');
      return priority;
    }

    // For math content, Google Vision generally performs better
    if (hints?.subject === 'MATH') {
      priority.push('google-vision', 'aws-textract', 'tesseract');
      return priority;
    }

    // For cost-sensitive operations, prefer Tesseract
    if (hints?.costSensitive) {
      priority.push('tesseract', 'google-vision', 'aws-textract');
      return priority;
    }

    // For high accuracy requirements, prefer cloud providers
    if (hints?.requireHighAccuracy) {
      priority.push('google-vision', 'aws-textract', 'tesseract');
      return priority;
    }

    // Default priority
    return this.providerPriority;
  }

  private async handleFailover(
    error: Error,
    image: Buffer,
    options: OCROptions,
    failedProvider: OCRProvider
  ): Promise<OCRResult> {
    // Only failover for retryable errors
    const ocrError = error as OCRError;
    if (ocrError.name === 'OCRError' && !ocrError.isRetryable) {
      throw error;
    }

    // Try remaining providers in priority order
    for (const providerName of this.providerPriority) {
      if (providerName === failedProvider) {
        continue;
      }

      const provider = this.providers.get(providerName);
      if (!provider || !(await provider.isAvailable())) {
        continue;
      }

      try {
        return await provider.process(image, options);
      } catch {
        // Continue to next provider
        continue;
      }
    }

    // No providers succeeded
    throw error;
  }

  private buildOptions(hints?: ProcessingHints): OCROptions {
    return {
      detectMath: hints?.subject === 'MATH',
      optimizeForMath: hints?.subject === 'MATH',
      detectHandwriting: hints?.isHandwritten,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // IMAGE PREPROCESSING
  // ══════════════════════════════════════════════════════════════════════════════

  private detectImageMetadata(image: Buffer): ImageMetadata {
    let width = 0;
    let height = 0;
    let format: ImageMetadata['format'] = 'jpeg';

    // Detect format from magic bytes
    if (image[0] === 0xff && image[1] === 0xd8) {
      format = 'jpeg';
      // Parse JPEG to find dimensions
      let offset = 2;
      while (offset < image.length - 9) {
        if (image[offset] !== 0xff) break;
        const marker = image[offset + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
          height = image.readUInt16BE(offset + 5);
          width = image.readUInt16BE(offset + 7);
          break;
        }
        offset += 2 + image.readUInt16BE(offset + 2);
      }
    } else if (image[0] === 0x89 && image[1] === 0x50) {
      format = 'png';
      if (image.length >= 24) {
        width = image.readUInt32BE(16);
        height = image.readUInt32BE(20);
      }
    } else if (image[0] === 0x47 && image[1] === 0x49) {
      format = 'gif';
      if (image.length >= 10) {
        width = image.readUInt16LE(6);
        height = image.readUInt16LE(8);
      }
    } else if (image[0] === 0x25 && image[1] === 0x50) {
      format = 'pdf';
    }

    return {
      width,
      height,
      format,
      colorSpace: 'rgb',
    };
  }

  private needsRotation(image: Buffer, metadata: ImageMetadata): boolean {
    // Check EXIF orientation for JPEG
    if (metadata.format !== 'jpeg') {
      return false;
    }

    // Look for EXIF marker
    let offset = 2;
    while (offset < image.length - 4) {
      if (image[offset] === 0xff && image[offset + 1] === 0xe1) {
        // Found EXIF marker, check orientation
        // This is simplified - full implementation would parse EXIF data
        return false;
      }
      offset += 2 + image.readUInt16BE(offset + 2);
    }

    return false;
  }

  private async rotateImage(image: Buffer, metadata: ImageMetadata): Promise<Buffer> {
    // In production, use sharp or jimp for rotation
    // For now, return image unchanged
    return image;
  }

  private needsContrastEnhancement(hints?: ProcessingHints): boolean {
    // Enhance contrast for handwritten content or when high accuracy is required
    return hints?.isHandwritten === true || hints?.requireHighAccuracy === true;
  }

  private async enhanceContrast(image: Buffer): Promise<Buffer> {
    // In production, use sharp or jimp for contrast enhancement
    // Example with sharp:
    // const sharp = await import('sharp');
    // return sharp(image).normalize().toBuffer();
    return image;
  }

  private async reduceNoise(image: Buffer): Promise<Buffer> {
    // In production, use sharp or jimp for noise reduction
    // Example with sharp:
    // const sharp = await import('sharp');
    // return sharp(image).median(3).toBuffer();
    return image;
  }

  private shouldBinarize(hints?: ProcessingHints): boolean {
    // Binarize for text-heavy documents or when cost is a concern (helps Tesseract)
    return hints?.costSensitive === true;
  }

  private async binarizeImage(image: Buffer): Promise<Buffer> {
    // In production, use sharp or jimp for binarization
    // Example with sharp:
    // const sharp = await import('sharp');
    // return sharp(image).threshold(128).toBuffer();
    return image;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // POST-PROCESSING
  // ══════════════════════════════════════════════════════════════════════════════

  private async correctSpelling(
    text: string,
    subject?: Subject
  ): Promise<SpellCorrectionResult> {
    const corrections: SpellCorrectionResult['corrections'] = [];

    // Common OCR misreadings
    const commonMistakes: Record<string, string> = {
      'teh': 'the',
      'adn': 'and',
      'hte': 'the',
      'waht': 'what',
      'jsut': 'just',
      'becuase': 'because',
      'tho': 'though',
      'hwo': 'who',
      'cna': 'can',
      'iwth': 'with',
      'fo': 'of',
      'ot': 'to',
      'si': 'is',
      'nad': 'and',
      'ti': 'it',
      'taht': 'that',
    };

    // Subject-specific terms to preserve
    const subjectTerms: Record<Subject, string[]> = {
      MATH: ['coefficient', 'polynomial', 'quadratic', 'integer', 'denominator', 'numerator'],
      SCIENCE: ['hypothesis', 'photosynthesis', 'mitochondria', 'chromosome', 'molecule'],
      ELA: ['metaphor', 'simile', 'protagonist', 'antagonist', 'alliteration'],
      HISTORY: ['renaissance', 'revolution', 'constitution', 'democracy', 'civilization'],
      SOCIAL_STUDIES: ['economics', 'government', 'geography', 'population', 'culture'],
      OTHER: [],
    };

    let corrected = text;
    const wordsToPreserve = subject ? subjectTerms[subject] : [];

    // Apply corrections
    for (const [mistake, correction] of Object.entries(commonMistakes)) {
      const regex = new RegExp(`\\b${mistake}\\b`, 'gi');
      const matches = text.match(regex);

      if (matches) {
        // Don't correct if it matches a subject term
        const isSubjectTerm = wordsToPreserve.some(
          (term) => term.toLowerCase() === mistake.toLowerCase()
        );

        if (!isSubjectTerm) {
          corrected = corrected.replace(regex, correction);
          corrections.push({
            original: mistake,
            corrected: correction,
            confidence: 0.9,
            position: { start: 0, end: 0 }, // Simplified
          });
        }
      }
    }

    return {
      original: text,
      corrected,
      corrections,
    };
  }

  private normalizeMathSymbols(text: string): MathNormalizationResult {
    const substitutions: MathNormalizationResult['substitutions'] = [];
    let normalized = text;

    // Common OCR misreadings for math symbols
    const mathNormalizations: Array<{ pattern: RegExp; replacement: string; type: string }> = [
      // Letter-number confusion
      { pattern: /\bl\b(?=\s*[+\-*/=])/g, replacement: '1', type: 'letter-to-digit' },
      { pattern: /\bO\b(?=\s*[+\-*/=])/g, replacement: '0', type: 'letter-to-digit' },
      { pattern: /\bI\b(?=\s*[+\-*/=])/g, replacement: '1', type: 'letter-to-digit' },

      // Operator normalization
      { pattern: /\bx\b(?=\s*\d)/g, replacement: '×', type: 'operator' },
      { pattern: /\*{2}/g, replacement: '^', type: 'operator' },

      // Greek letter OCR errors
      { pattern: /\bpi\b/gi, replacement: 'π', type: 'greek' },
      { pattern: /\btheta\b/gi, replacement: 'θ', type: 'greek' },
      { pattern: /\balpha\b/gi, replacement: 'α', type: 'greek' },
      { pattern: /\bbeta\b/gi, replacement: 'β', type: 'greek' },

      // Common math terms
      { pattern: /\bsqrt\b/gi, replacement: '√', type: 'function' },
      { pattern: /\binfinity\b/gi, replacement: '∞', type: 'symbol' },
    ];

    for (const { pattern, replacement, type } of mathNormalizations) {
      const matches = normalized.match(pattern);
      if (matches) {
        normalized = normalized.replace(pattern, replacement);
        for (const match of matches) {
          substitutions.push({
            original: match,
            normalized: replacement,
            type,
          });
        }
      }
    }

    // Generate LaTeX representation
    let latex = normalized;
    latex = latex.replace(/×/g, '\\times ');
    latex = latex.replace(/÷/g, '\\div ');
    latex = latex.replace(/√/g, '\\sqrt');
    latex = latex.replace(/π/g, '\\pi ');
    latex = latex.replace(/θ/g, '\\theta ');
    latex = latex.replace(/∞/g, '\\infty ');

    return {
      original: text,
      normalized,
      latex,
      substitutions,
    };
  }

  private mapCurriculumTerms(text: string, subject: Subject): string {
    // Map informal terms to curriculum-standard terms
    const termMappings: Record<Subject, Record<string, string>> = {
      MATH: {
        'times': 'multiply',
        'take away': 'subtract',
        'plus': 'add',
        'goes into': 'divides',
        'squared': 'to the power of 2',
        'cubed': 'to the power of 3',
      },
      SCIENCE: {
        'germs': 'microorganisms',
        'bug': 'insect',
        'breathe': 'respire',
      },
      ELA: {
        'story': 'narrative',
        'main character': 'protagonist',
        'bad guy': 'antagonist',
      },
      HISTORY: {
        'old times': 'ancient period',
        'king/queen': 'monarch',
      },
      SOCIAL_STUDIES: {
        'country': 'nation',
        'money': 'currency',
      },
      OTHER: {},
    };

    let mapped = text;
    const mappings = termMappings[subject];

    for (const [informal, formal] of Object.entries(mappings)) {
      const regex = new RegExp(`\\b${informal}\\b`, 'gi');
      mapped = mapped.replace(regex, formal);
    }

    return mapped;
  }
}

// Export singleton instance
export const ocrOrchestrator = new OCROrchestrator();
