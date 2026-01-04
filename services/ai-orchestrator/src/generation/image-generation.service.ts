/**
 * Image Generation Service
 *
 * AI-powered educational image generation:
 * - Diagrams and illustrations
 * - Charts and infographics
 * - Concept maps
 * - Age-appropriate visuals
 */

import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

import type {
  ImageGenerationRequest,
  GeneratedImage,
  ImageType,
  ImageStyle,
  ImageSize,
  GradeLevel,
} from './types.js';

const IMAGE_TYPE_PROMPTS: Record<ImageType, string> = {
  diagram:
    'Create a clear, educational diagram that visually explains the concept. Use labeled parts and arrows to show relationships.',
  illustration:
    'Create an engaging educational illustration suitable for learning. Make it colorful and clear.',
  chart: 'Create a clear data visualization chart that effectively communicates the information.',
  infographic:
    'Create an educational infographic that presents information in a visually appealing, easy-to-understand format.',
  map: 'Create an accurate, clearly labeled map suitable for educational purposes.',
  concept_map:
    'Create a concept map showing relationships between ideas with clear connections and labels.',
  timeline:
    'Create a visual timeline showing chronological progression of events or concepts.',
  character:
    'Create a friendly, age-appropriate character illustration for educational content.',
  scene:
    'Create an educational scene illustration that depicts the described scenario clearly.',
};

const STYLE_MODIFIERS: Record<ImageStyle, string> = {
  realistic: 'photorealistic style with accurate details',
  cartoon: 'colorful cartoon style, friendly and engaging',
  educational: 'clean educational style with clear labels and explanations',
  minimalist: 'simple minimalist style with clean lines and limited colors',
  'hand-drawn': 'hand-drawn sketch style, approachable and informal',
  technical: 'technical illustration style with precise details and measurements',
};

const GRADE_LEVEL_GUIDANCE: Record<string, string> = {
  k: 'Simple, colorful, with minimal text. Very friendly characters if applicable.',
  '1': 'Simple and colorful with basic labels. Friendly and engaging.',
  '2': 'Clear and colorful with simple labels. Age-appropriate and friendly.',
  '3': 'Clear with some detail. Include helpful labels.',
  '4': 'Moderate detail with clear labels and explanations.',
  '5': 'Good level of detail. Include informative labels.',
  '6': 'Detailed with comprehensive labels. Educational focus.',
  '7': 'Detailed and informative. Include relevant terminology.',
  '8': 'Detailed with proper terminology. More sophisticated design.',
  '9': 'Professional quality with accurate details and terminology.',
  '10': 'High-quality educational visual with accurate information.',
  '11': 'Professional educational illustration with advanced details.',
  '12': 'Professional quality suitable for advanced learners.',
  college: 'Professional, academic-quality illustration.',
};

export class ImageGenerationService {
  private readonly openai: OpenAI | null = null;

  constructor(config?: { apiKey?: string }) {
    if (config?.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.apiKey,
      });
    }
  }

  /**
   * Generate educational images
   */
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage[]> {
    const generationId = uuidv4();
    const startTime = Date.now();

    console.info('Starting image generation', {
      generationId,
      type: request.type,
      style: request.style,
    });

    try {
      incrementCounter('image_generation.started', { type: request.type });

      if (!this.openai) {
        throw new Error('OpenAI client not configured for image generation');
      }

      const enhancedPrompt = this.buildImagePrompt(request);
      const count = request.count ?? 1;
      const size = request.size ?? '1024x1024';

      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: Math.min(count, 1), // DALL-E 3 only supports n=1
        size: size as '1024x1024' | '1024x1792' | '1792x1024',
        quality: 'standard',
        style: request.style === 'realistic' ? 'natural' : 'vivid',
      });

      const latencyMs = Date.now() - startTime;

      const images: GeneratedImage[] = response.data.map((img, index) => ({
        id: `${generationId}-${index}`,
        url: img.url ?? '',
        revisedPrompt: img.revised_prompt,
        altText: this.generateAltText(request),
        metadata: {
          generatedAt: new Date(),
          model: 'dall-e-3',
          provider: 'openai',
          tokensUsed: 0,
          latencyMs,
          cached: false,
        },
      }));

      recordHistogram('image_generation.duration', latencyMs);
      incrementCounter('image_generation.success', { type: request.type });

      console.info('Image generation completed', {
        generationId,
        count: images.length,
        latencyMs,
      });

      return images;
    } catch (error) {
      incrementCounter('image_generation.error', { type: request.type });
      console.error('Image generation failed', { generationId, error });
      throw error;
    }
  }

  /**
   * Generate diagram description (for when actual image generation is not available)
   */
  async generateDiagramDescription(
    concept: string,
    type: ImageType,
    options?: {
      gradeLevel?: GradeLevel;
      subject?: string;
    }
  ): Promise<{
    description: string;
    elements: Array<{ name: string; description: string; position?: string }>;
    connections?: Array<{ from: string; to: string; label?: string }>;
    suggestedColors?: Record<string, string>;
  }> {
    // This would use the LLM to generate a detailed description
    // that could be rendered as an SVG or used for accessibility
    return {
      description: `A ${type} illustrating ${concept} for ${options?.gradeLevel ?? 'general'} level ${options?.subject ?? 'education'}`,
      elements: [
        { name: 'Main Concept', description: concept, position: 'center' },
      ],
      connections: [],
      suggestedColors: {
        primary: '#4F46E5',
        secondary: '#10B981',
        accent: '#F59E0B',
      },
    };
  }

  /**
   * Validate image generation request
   */
  validateRequest(request: ImageGenerationRequest): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!request.prompt || request.prompt.length < 10) {
      errors.push('Prompt is too short. Provide a detailed description.');
    }

    if (request.prompt && request.prompt.length > 4000) {
      errors.push('Prompt is too long. Maximum 4000 characters.');
    }

    // Check for inappropriate content
    const inappropriateTerms = [
      'violence', 'violent', 'gore', 'blood',
      'nude', 'naked', 'sexual', 'explicit',
      'weapon', 'gun', 'knife', 'bomb',
      'drug', 'alcohol', 'smoking',
    ];

    const lowerPrompt = request.prompt.toLowerCase();
    for (const term of inappropriateTerms) {
      if (lowerPrompt.includes(term)) {
        errors.push(`Prompt contains inappropriate content: "${term}"`);
      }
    }

    // Check for real people
    if (/\b(photo of|picture of|image of)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/i.test(request.prompt)) {
      warnings.push('Avoid requesting images of specific real people.');
    }

    // Validate size
    const validSizes: ImageSize[] = ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'];
    if (request.size && !validSizes.includes(request.size)) {
      errors.push(`Invalid size. Use one of: ${validSizes.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Estimate cost for image generation
   */
  estimateCost(request: ImageGenerationRequest): {
    estimatedCost: number;
    model: string;
    quality: string;
  } {
    const count = request.count ?? 1;
    const size = request.size ?? '1024x1024';

    // DALL-E 3 pricing (as of late 2024)
    let costPerImage = 0.04; // Standard 1024x1024

    if (size === '1024x1792' || size === '1792x1024') {
      costPerImage = 0.08;
    }

    return {
      estimatedCost: costPerImage * count,
      model: 'dall-e-3',
      quality: 'standard',
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ────────────────────────────────────────────────────────────────────────────

  private buildImagePrompt(request: ImageGenerationRequest): string {
    const parts: string[] = [
      // Type-specific guidance
      IMAGE_TYPE_PROMPTS[request.type],
      // User's prompt
      `\nSubject: ${request.prompt}`,
    ];

    // Add optional modifiers
    if (request.style) {
      parts.push(`\nStyle: ${STYLE_MODIFIERS[request.style]}`);
    }
    if (request.gradeLevel) {
      parts.push(`\nAudience: ${GRADE_LEVEL_GUIDANCE[request.gradeLevel]}`);
    }
    if (request.subject) {
      parts.push(`\nSubject area: ${request.subject}`);
    }

    // Add safety guidelines
    parts.push('\n\nIMPORTANT: Create age-appropriate, educational content only. No violence, inappropriate content, or real people.');

    return parts.join('');
  }

  private generateAltText(request: ImageGenerationRequest): string {
    const typeDescriptions: Record<ImageType, string> = {
      diagram: 'Educational diagram showing',
      illustration: 'Illustration depicting',
      chart: 'Chart displaying',
      infographic: 'Infographic about',
      map: 'Map showing',
      concept_map: 'Concept map illustrating',
      timeline: 'Timeline of',
      character: 'Character illustration of',
      scene: 'Scene depicting',
    };

    const description = typeDescriptions[request.type] ?? 'Image of';
    const styleText = request.style ? `Style: ${request.style}.` : '';
    const subjectText = request.subject ? `Subject: ${request.subject}.` : '';

    return `${description} ${request.prompt}. ${styleText} ${subjectText}`.trim();
  }
}
