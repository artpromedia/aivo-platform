/**
 * Prompt Builder
 *
 * Builds dynamic prompts with variable substitution and adaptation support.
 * Uses Handlebars-like syntax for template variables.
 */

export interface PromptContext {
  gradeLevel?: number;
  age?: number;
  neurodiversityProfile?: {
    adhd?: boolean;
    dyslexia?: boolean;
    autism?: boolean;
  };
  accommodations?: string[];
  adaptations?: string[];
  learningStyle?: string;
  [key: string]: unknown;
}

/**
 * Prompt Builder for constructing dynamic system prompts
 */
export class PromptBuilder {
  /**
   * Build a prompt from a template and context
   */
  build(template: string, context: PromptContext): string {
    let result = template;

    // Process iteration blocks FIRST (they contain {{this}} which shouldn't be substituted as a variable)
    result = this.processIterations(result, context);

    // Handle conditional blocks: {{#if variable}}...{{/if}}
    result = this.processConditionals(result, context);

    // Handle simple variable substitution: {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      const value = context[key];
      if (value === undefined || value === null) {
        return '';
      }
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return String(value);
    });

    // Clean up extra whitespace
    result = result.replace(/\n{3,}/g, '\n\n').trim();

    return result;
  }

  /**
   * Process {{#if variable}}...{{/if}} blocks
   */
  private processConditionals(template: string, context: PromptContext): string {
    const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(ifRegex, (match, variable, content) => {
      const value = context[variable];
      // Check if value is truthy (including non-empty arrays)
      const isTruthy = Array.isArray(value) ? value.length > 0 : Boolean(value);
      return isTruthy ? content : '';
    });
  }

  /**
   * Process {{#each array}}...{{/each}} blocks
   */
  private processIterations(template: string, context: PromptContext): string {
    const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(eachRegex, (match, variable, content) => {
      const value = context[variable];
      if (!Array.isArray(value)) {
        return '';
      }

      return value
        .map((item) => {
          // Replace {{this}} with the current item
          return content.replace(/\{\{this\}\}/g, String(item));
        })
        .join('');
    });
  }

  /**
   * Create adaptation instructions based on learner profile
   */
  static getAdaptationInstructions(adaptations: string[]): string {
    const instructions: Record<string, string> = {
      use_simple_words: 'Use simple, common words appropriate for young children',
      short_sentences: 'Keep sentences short (under 10 words when possible)',
      use_clear_language: 'Use clear, straightforward language without jargon',
      chunked_information: 'Break information into small, manageable chunks',
      bullet_points: 'Use bullet points and numbered lists for clarity',
      engagement_hooks: 'Include engaging elements to maintain attention',
      avoid_complex_words: 'Avoid complex vocabulary and long words',
      short_paragraphs: 'Keep paragraphs to 2-3 sentences maximum',
      literal_language: 'Use literal, direct language - avoid metaphors and idioms',
      avoid_idioms: 'Do not use idioms, sarcasm, or figurative language',
      explicit_instructions: 'Give very explicit, step-by-step instructions',
      patient_pacing: 'Allow for slower pacing and give extra processing time',
      clear_pronunciation_friendly: 'Use words that are easy to pronounce and TTS-friendly',
    };

    return adaptations
      .map((adaptation) => instructions[adaptation])
      .filter(Boolean)
      .join('\n');
  }
}
