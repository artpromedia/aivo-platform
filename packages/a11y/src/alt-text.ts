/**
 * Alt Text Utilities for Accessibility
 *
 * Provides utilities for generating, validating, and managing
 * alt text for images to meet WCAG 2.1 AA compliance.
 *
 * WCAG 1.1.1 Non-text Content Level A:
 * "All non-text content that is presented to the user has a text
 * alternative that serves the equivalent purpose."
 *
 * Created: January 2026 - Enterprise QA Audit requirement
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AltTextValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ImageContext {
  /** The image source or filename */
  src: string;
  /** Context where the image is used (e.g., 'avatar', 'illustration', 'chart') */
  context: ImageContextType;
  /** Whether the image is purely decorative */
  isDecorative?: boolean;
  /** Surrounding text content that provides context */
  surroundingText?: string;
}

export type ImageContextType =
  | 'avatar'
  | 'icon'
  | 'illustration'
  | 'photo'
  | 'chart'
  | 'diagram'
  | 'logo'
  | 'button'
  | 'decorative'
  | 'educational'
  | 'achievement'
  | 'other';

// ============================================================================
// VALIDATION
// ============================================================================

const STOP_WORDS = [
  'image of',
  'picture of',
  'photo of',
  'graphic of',
  'icon of',
  'screenshot of',
];

const FILENAME_PATTERNS = [
  /\.(png|jpg|jpeg|gif|svg|webp)$/i,
  /img_?\d+/i,
  /image_?\d+/i,
  /[a-f0-9]{8,}/i, // Hash-like filenames
  /^DSC\d+$/i, // Camera default names
  /^IMG_\d+$/i,
];

const MAX_ALT_LENGTH = 125;
const MIN_ALT_LENGTH = 5;

/**
 * Validate alt text against WCAG guidelines
 */
export function validateAltText(altText: string | null | undefined, context?: ImageContext): AltTextValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Handle decorative images
  if (context?.isDecorative) {
    if (altText && altText.trim() !== '') {
      warnings.push('Decorative images should have an empty alt attribute (alt="")');
    }
    return { isValid: true, errors, warnings, suggestions };
  }

  // Missing alt text
  if (altText === null || altText === undefined) {
    errors.push('Alt text is required for non-decorative images (WCAG 1.1.1)');
    return { isValid: false, errors, warnings, suggestions };
  }

  const trimmedAlt = altText.trim();

  // Empty alt text for non-decorative images
  if (trimmedAlt === '' && !context?.isDecorative) {
    errors.push('Non-decorative images require descriptive alt text');
    if (context) {
      suggestions.push(...generateAltTextSuggestion(context));
    }
    return { isValid: false, errors, warnings, suggestions };
  }

  // Too short
  if (trimmedAlt.length > 0 && trimmedAlt.length < MIN_ALT_LENGTH) {
    warnings.push(`Alt text is very short (${trimmedAlt.length} chars). Consider adding more detail.`);
  }

  // Too long
  if (trimmedAlt.length > MAX_ALT_LENGTH) {
    warnings.push(
      `Alt text exceeds recommended length (${trimmedAlt.length}/${MAX_ALT_LENGTH} chars). Consider using aria-describedby for detailed descriptions.`
    );
  }

  // Starts with redundant phrases
  const lowerAlt = trimmedAlt.toLowerCase();
  for (const stopWord of STOP_WORDS) {
    if (lowerAlt.startsWith(stopWord)) {
      warnings.push(`Avoid starting alt text with "${stopWord}" - screen readers already announce images`);
      break;
    }
  }

  // Contains filename patterns
  for (const pattern of FILENAME_PATTERNS) {
    if (pattern.test(trimmedAlt)) {
      errors.push('Alt text appears to contain a filename. Use descriptive text instead.');
      break;
    }
  }

  // Entirely uppercase (can be harder to read)
  if (trimmedAlt === trimmedAlt.toUpperCase() && trimmedAlt.length > 10) {
    warnings.push('Avoid using all uppercase letters in alt text');
  }

  // Contains "click" or interaction instructions
  if (/click|tap|press/i.test(trimmedAlt)) {
    warnings.push('Avoid interaction instructions in alt text. Use aria-label on clickable elements instead.');
  }

  const isValid = errors.length === 0;
  return { isValid, errors, warnings, suggestions };
}

/**
 * Generate alt text suggestions based on image context
 */
export function generateAltTextSuggestion(context: ImageContext): string[] {
  const suggestions: string[] = [];

  switch (context.context) {
    case 'avatar':
      suggestions.push(
        'For avatars, use the person\'s name: "Profile photo of [Name]" or "[Name]\'s avatar"'
      );
      break;

    case 'icon':
      suggestions.push(
        'For icons with purpose, describe the action: "Search", "Menu", "Close"',
        'For decorative icons, use empty alt (alt="")'
      );
      break;

    case 'illustration':
      suggestions.push(
        'Describe what the illustration shows and its purpose in context',
        'Example: "Illustration of a student reading a book while a friendly robot tutor explains a math concept"'
      );
      break;

    case 'chart':
    case 'diagram':
      suggestions.push(
        'Summarize the key data or conclusion: "Bar chart showing 80% improvement in reading scores"',
        'For complex charts, use aria-describedby to link to a detailed text description'
      );
      break;

    case 'logo':
      suggestions.push(
        'Include the company/brand name: "Aivo logo" or "Aivo Education"'
      );
      break;

    case 'button':
      suggestions.push(
        'Describe the button action: "Submit assignment", "Play video"',
        'The alt should match the button\'s purpose, not describe the image'
      );
      break;

    case 'educational':
      suggestions.push(
        'Describe educational content clearly: "Diagram of the water cycle with labeled stages"',
        'Include key information the student needs to understand'
      );
      break;

    case 'achievement':
      suggestions.push(
        'Name the achievement: "Gold star badge for completing 10 lessons"',
        'Include the achievement name and criteria if relevant'
      );
      break;

    case 'photo':
      suggestions.push(
        'Describe the subject and action: "Student smiling while working on a tablet"',
        'Include relevant context visible in the photo'
      );
      break;

    case 'decorative':
      suggestions.push(
        'Use empty alt attribute: alt=""',
        'Decorative images should be invisible to screen readers'
      );
      break;

    default:
      suggestions.push(
        'Describe the image content and its purpose in context',
        'Ask: "What would someone miss if they couldn\'t see this image?"'
      );
  }

  // Add file-based suggestion if available
  if (context.src) {
    const filename = context.src.split('/').pop() || '';
    const nameWithoutExt = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    if (nameWithoutExt && !FILENAME_PATTERNS.some(p => p.test(nameWithoutExt))) {
      suggestions.push(`Based on filename, consider: "${nameWithoutExt}"`);
    }
  }

  return suggestions;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Create a properly formatted alt attribute
 * Returns empty string for decorative images, or the provided alt text
 */
export function formatAltAttribute(altText: string | undefined, isDecorative: boolean = false): string {
  if (isDecorative) {
    return '';
  }
  return altText?.trim() || '';
}

/**
 * Check if an image should be treated as decorative
 * Images that don't add information content should be decorative
 */
export function isLikelyDecorative(context: ImageContext): boolean {
  // Icons without text labels
  if (context.context === 'icon' && !context.surroundingText) {
    return false; // Icons usually have purpose
  }

  // Background patterns, dividers, spacers
  const decorativePatterns = [
    /background/i,
    /pattern/i,
    /divider/i,
    /spacer/i,
    /decoration/i,
  ];

  if (context.src && decorativePatterns.some(p => p.test(context.src))) {
    return true;
  }

  return context.isDecorative === true || context.context === 'decorative';
}

/**
 * Generate alt text for common Aivo platform images
 */
export function generateAivoAltText(
  imageType: 'mascot' | 'subject-icon' | 'badge' | 'progress' | 'brain-break',
  params: Record<string, string | number>
): string {
  switch (imageType) {
    case 'mascot':
      const mascotEmotion = params.emotion || 'friendly';
      return `Aivo mascot looking ${mascotEmotion}`;

    case 'subject-icon':
      return `${params.subject || 'Subject'} icon`;

    case 'badge':
      return `${params.name || 'Achievement'} badge${params.level ? ` - Level ${params.level}` : ''}`;

    case 'progress':
      return `Progress indicator showing ${params.percent || 0}% complete`;

    case 'brain-break':
      const activity = params.activity || 'break activity';
      return `Brain break: ${activity}`;

    default:
      return '';
  }
}

// ============================================================================
// REACT COMPONENT HELPERS
// ============================================================================

/**
 * Props interface for accessible images
 */
export interface AccessibleImageProps {
  src: string;
  alt: string;
  /** Set to true for decorative images that should be hidden from screen readers */
  decorative?: boolean;
  /** Longer description for complex images - will create aria-describedby */
  longDescription?: string;
}

/**
 * Get ARIA attributes for an image
 */
export function getImageAriaProps(props: AccessibleImageProps): Record<string, string> {
  const ariaProps: Record<string, string> = {};

  if (props.decorative) {
    ariaProps.alt = '';
    ariaProps.role = 'presentation';
    ariaProps['aria-hidden'] = 'true';
  } else {
    ariaProps.alt = props.alt;
  }

  return ariaProps;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ALT_TEXT_GUIDELINES = {
  maxLength: MAX_ALT_LENGTH,
  minLength: MIN_ALT_LENGTH,
  stopWords: STOP_WORDS,
};
