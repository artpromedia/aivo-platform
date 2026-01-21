/**
 * Sensory Accessibility Service
 *
 * Provides content transformations and accessibility adaptations for
 * learners with sensory impairments (blind, deaf, deafblind).
 *
 * Features:
 * - Screen reader optimization
 * - Audio description generation
 * - Sign language video integration
 * - Caption/subtitle generation
 * - Braille display support
 * - Haptic/tactile feedback
 * - Visual alert systems
 *
 * @author AIVO Platform Team
 */

import type { SensoryImpairmentType, InputMethod } from './assessmentModeRouter.js';

// Re-export types for use by routes
export type { SensoryImpairmentType } from './assessmentModeRouter.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type SignLanguageType = 'ASL' | 'BSL' | 'Auslan' | 'LSF' | 'DGS' | 'JSL' | 'other';
export type ScreenReaderType =
  | 'NVDA'
  | 'JAWS'
  | 'VoiceOver'
  | 'TalkBack'
  | 'Narrator'
  | 'Orca'
  | 'other';
export type BrailleGrade = 1 | 2;
export type CaptionStyle = 'standard' | 'simplified' | 'detailed' | 'verbatim';
export type AudioDescriptionLevel = 'basic' | 'standard' | 'extended' | 'comprehensive';

/**
 * Configuration for blind/low-vision learners
 */
export interface BlindAccessibilityConfig {
  // Screen reader
  useScreenReader: boolean;
  screenReaderType: ScreenReaderType;
  announceImages: boolean;
  announceDecorative: boolean;

  // Braille
  useBrailleDisplay: boolean;
  brailleGrade: BrailleGrade;

  // Magnification
  useMagnification: boolean;
  magnificationLevel: number;

  // Audio
  audioDescriptionsEnabled: boolean;
  audioDescriptionLevel: AudioDescriptionLevel;
  readAloudSpeed: number;
  voicePreference: string;

  // Navigation
  keyboardOnly: boolean;
  useHeadingsNavigation: boolean;
  useLandmarks: boolean;

  // Colors
  highContrastMode: boolean;
  colorInversionEnabled: boolean;
}

/**
 * Configuration for deaf/hard-of-hearing learners
 */
export interface DeafAccessibilityConfig {
  // Sign language
  useSignLanguage: boolean;
  signLanguageType: SignLanguageType;
  signLanguageAvatarEnabled: boolean;

  // Captions
  captionsEnabled: boolean;
  captionStyle: CaptionStyle;
  captionFontSize: 'small' | 'medium' | 'large' | 'extra_large';
  captionBackground: 'transparent' | 'semi_transparent' | 'opaque';
  showSpeakerIdentification: boolean;

  // Visual alerts
  visualAlertsEnabled: boolean;
  flashWarningsEnabled: boolean;
  colorCodedAlerts: boolean;

  // Haptic
  hapticFeedbackEnabled: boolean;
  vibrationAlertsEnabled: boolean;
}

/**
 * Configuration for deafblind learners
 */
export interface DeafblindAccessibilityConfig {
  // Braille
  useBrailleDisplay: boolean;
  brailleGrade: BrailleGrade;
  refreshableBrailleRows: number;

  // Haptic
  hapticFeedbackEnabled: boolean;
  vibrationPatterns: boolean;

  // Partner
  partnerMediatedMode: boolean;

  // Simplified content
  linearNavigationOnly: boolean;
  reducedContentComplexity: boolean;

  // Timing
  extendedResponseTime: boolean;
  noTimeouts: boolean;
}

/**
 * Content with accessibility transformations
 */
export interface AccessibleContent {
  originalContent: ContentItem;

  // Transformations applied
  transformations: ContentTransformation[];

  // Screen reader version
  screenReaderContent?: ScreenReaderContent;

  // Audio version
  audioContent?: AudioContent;

  // Sign language version
  signLanguageContent?: SignLanguageContent;

  // Captions
  captionedContent?: CaptionedContent;

  // Haptic/tactile version
  tactileContent?: TactileContent;

  // Simplified version
  simplifiedContent?: SimplifiedContent;
}

export interface ContentItem {
  id: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'interactive' | 'question';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ContentTransformation {
  type: string;
  applied: boolean;
  details: string;
}

export interface ScreenReaderContent {
  ariaLabel: string;
  ariaDescription?: string;
  ariaLive?: 'polite' | 'assertive' | 'off';
  role?: string;
  headingLevel?: number;
  announcements: string[];
  keyboardShortcuts: { key: string; action: string }[];
}

export interface AudioContent {
  audioUrl?: string;
  audioDescription: string;
  transcript: string;
  duration?: number;
  speechRate: number;
  voiceId: string;
}

export interface SignLanguageContent {
  videoUrl?: string;
  signLanguageType: SignLanguageType;
  avatarGenerated: boolean;
  transcript: string;
  duration?: number;
}

export interface CaptionedContent {
  captionTrack: CaptionCue[];
  style: CaptionStyle;
  language: string;
}

export interface CaptionCue {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  position?: 'top' | 'bottom';
}

export interface TactileContent {
  description: string;
  brailleText?: string;
  hapticPattern: HapticPattern;
  tactileGraphicUrl?: string;
}

export interface HapticPattern {
  pattern: number[]; // Vibration durations in ms
  intensity: 'light' | 'medium' | 'strong';
  meaning: string;
}

export interface SimplifiedContent {
  text: string;
  readingLevel: number;
  keyPoints: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// SENSORY ACCESSIBILITY SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class SensoryAccessibilityService {
  /**
   * Create accessibility configuration based on sensory profile
   */
  createAccessibilityConfig(
    sensoryType: SensoryImpairmentType,
    options?: {
      signLanguageType?: SignLanguageType;
      screenReaderType?: ScreenReaderType;
      brailleGrade?: BrailleGrade;
      captionStyle?: CaptionStyle;
    }
  ): BlindAccessibilityConfig | DeafAccessibilityConfig | DeafblindAccessibilityConfig | null {
    switch (sensoryType) {
      case 'BLIND':
        return this.createBlindConfig(options);
      case 'LOW_VISION':
        return this.createLowVisionConfig(options);
      case 'DEAF':
        return this.createDeafConfig(options);
      case 'HARD_OF_HEARING':
        return this.createHardOfHearingConfig(options);
      case 'DEAFBLIND':
        return this.createDeafblindConfig(options);
      default:
        return null;
    }
  }

  private createBlindConfig(options?: {
    screenReaderType?: ScreenReaderType;
    brailleGrade?: BrailleGrade;
  }): BlindAccessibilityConfig {
    return {
      useScreenReader: true,
      screenReaderType: options?.screenReaderType ?? 'VoiceOver',
      announceImages: true,
      announceDecorative: false,
      useBrailleDisplay: false,
      brailleGrade: options?.brailleGrade ?? 2,
      useMagnification: false,
      magnificationLevel: 1,
      audioDescriptionsEnabled: true,
      audioDescriptionLevel: 'comprehensive',
      readAloudSpeed: 1,
      voicePreference: 'natural',
      keyboardOnly: true,
      useHeadingsNavigation: true,
      useLandmarks: true,
      highContrastMode: false,
      colorInversionEnabled: false,
    };
  }

  private createLowVisionConfig(options?: {
    screenReaderType?: ScreenReaderType;
  }): BlindAccessibilityConfig {
    return {
      useScreenReader: false,
      screenReaderType: options?.screenReaderType ?? 'VoiceOver',
      announceImages: false,
      announceDecorative: false,
      useBrailleDisplay: false,
      brailleGrade: 2,
      useMagnification: true,
      magnificationLevel: 2.5,
      audioDescriptionsEnabled: true,
      audioDescriptionLevel: 'standard',
      readAloudSpeed: 1,
      voicePreference: 'natural',
      keyboardOnly: false,
      useHeadingsNavigation: true,
      useLandmarks: true,
      highContrastMode: true,
      colorInversionEnabled: false,
    };
  }

  private createDeafConfig(options?: {
    signLanguageType?: SignLanguageType;
    captionStyle?: CaptionStyle;
  }): DeafAccessibilityConfig {
    return {
      useSignLanguage: true,
      signLanguageType: options?.signLanguageType ?? 'ASL',
      signLanguageAvatarEnabled: true,
      captionsEnabled: true,
      captionStyle: options?.captionStyle ?? 'detailed',
      captionFontSize: 'large',
      captionBackground: 'semi_transparent',
      showSpeakerIdentification: true,
      visualAlertsEnabled: true,
      flashWarningsEnabled: false,
      colorCodedAlerts: true,
      hapticFeedbackEnabled: true,
      vibrationAlertsEnabled: true,
    };
  }

  private createHardOfHearingConfig(options?: {
    captionStyle?: CaptionStyle;
  }): DeafAccessibilityConfig {
    return {
      useSignLanguage: false,
      signLanguageType: 'ASL',
      signLanguageAvatarEnabled: false,
      captionsEnabled: true,
      captionStyle: options?.captionStyle ?? 'standard',
      captionFontSize: 'medium',
      captionBackground: 'semi_transparent',
      showSpeakerIdentification: true,
      visualAlertsEnabled: true,
      flashWarningsEnabled: false,
      colorCodedAlerts: true,
      hapticFeedbackEnabled: true,
      vibrationAlertsEnabled: false,
    };
  }

  private createDeafblindConfig(options?: {
    brailleGrade?: BrailleGrade;
  }): DeafblindAccessibilityConfig {
    return {
      useBrailleDisplay: true,
      brailleGrade: options?.brailleGrade ?? 2,
      refreshableBrailleRows: 1,
      hapticFeedbackEnabled: true,
      vibrationPatterns: true,
      partnerMediatedMode: true,
      linearNavigationOnly: true,
      reducedContentComplexity: true,
      extendedResponseTime: true,
      noTimeouts: true,
    };
  }

  /**
   * Transform content for accessibility
   */
  async transformContent(
    content: ContentItem,
    sensoryType: SensoryImpairmentType,
    config: BlindAccessibilityConfig | DeafAccessibilityConfig | DeafblindAccessibilityConfig
  ): Promise<AccessibleContent> {
    const transformations: ContentTransformation[] = [];
    const result: AccessibleContent = {
      originalContent: content,
      transformations,
    };

    switch (sensoryType) {
      case 'BLIND':
      case 'LOW_VISION':
        await this.applyBlindTransformations(result, content, config as BlindAccessibilityConfig);
        break;
      case 'DEAF':
      case 'HARD_OF_HEARING':
        await this.applyDeafTransformations(result, content, config as DeafAccessibilityConfig);
        break;
      case 'DEAFBLIND':
        await this.applyDeafblindTransformations(
          result,
          content,
          config as DeafblindAccessibilityConfig
        );
        break;
    }

    console.log('[sensory-accessibility] content_transformed', {
      contentId: content.id,
      contentType: content.type,
      sensoryType,
      transformationsApplied: transformations.filter((t) => t.applied).length,
    });

    return result;
  }

  /**
   * Apply transformations for blind/low-vision users
   */
  private async applyBlindTransformations(
    result: AccessibleContent,
    content: ContentItem,
    config: BlindAccessibilityConfig
  ): Promise<void> {
    // Screen reader content
    if (config.useScreenReader) {
      result.screenReaderContent = this.generateScreenReaderContent(content);
      result.transformations.push({
        type: 'SCREEN_READER',
        applied: true,
        details: 'Generated ARIA labels and screen reader optimizations',
      });
    }

    // Audio descriptions
    if (config.audioDescriptionsEnabled && (content.type === 'image' || content.type === 'video')) {
      result.audioContent = await this.generateAudioDescription(
        content,
        config.audioDescriptionLevel
      );
      result.transformations.push({
        type: 'AUDIO_DESCRIPTION',
        applied: true,
        details: `Generated ${config.audioDescriptionLevel} audio description`,
      });
    }

    // Text-to-speech for text content
    if (content.type === 'text' || content.type === 'question') {
      result.audioContent = {
        audioDescription: content.content,
        transcript: content.content,
        speechRate: config.readAloudSpeed,
        voiceId: config.voicePreference,
      };
      result.transformations.push({
        type: 'TEXT_TO_SPEECH',
        applied: true,
        details: 'Prepared text for speech synthesis',
      });
    }
  }

  /**
   * Apply transformations for deaf/hard-of-hearing users
   */
  private async applyDeafTransformations(
    result: AccessibleContent,
    content: ContentItem,
    config: DeafAccessibilityConfig
  ): Promise<void> {
    // Captions for audio/video
    if (config.captionsEnabled && (content.type === 'audio' || content.type === 'video')) {
      result.captionedContent = await this.generateCaptions(content, config.captionStyle);
      result.transformations.push({
        type: 'CAPTIONS',
        applied: true,
        details: `Generated ${config.captionStyle} captions`,
      });
    }

    // Sign language for any content with text
    if (config.useSignLanguage && (content.type === 'text' || content.type === 'question')) {
      result.signLanguageContent = await this.generateSignLanguageContent(
        content,
        config.signLanguageType,
        config.signLanguageAvatarEnabled
      );
      result.transformations.push({
        type: 'SIGN_LANGUAGE',
        applied: true,
        details: `Generated ${config.signLanguageType} sign language ${config.signLanguageAvatarEnabled ? 'avatar' : 'video'}`,
      });
    }

    // Visual alerts
    if (config.visualAlertsEnabled) {
      result.transformations.push({
        type: 'VISUAL_ALERTS',
        applied: true,
        details: 'Converted audio cues to visual alerts',
      });
    }

    // Haptic feedback
    if (config.hapticFeedbackEnabled) {
      result.tactileContent = {
        description: content.content,
        hapticPattern: this.generateHapticPattern('notification'),
      };
      result.transformations.push({
        type: 'HAPTIC_FEEDBACK',
        applied: true,
        details: 'Added haptic feedback patterns',
      });
    }
  }

  /**
   * Apply transformations for deafblind users
   */
  private async applyDeafblindTransformations(
    result: AccessibleContent,
    content: ContentItem,
    config: DeafblindAccessibilityConfig
  ): Promise<void> {
    // Braille content
    if (config.useBrailleDisplay) {
      result.tactileContent = {
        description: content.content,
        brailleText: this.convertToBraille(content.content, config.brailleGrade),
        hapticPattern: this.generateHapticPattern('content_ready'),
      };
      result.transformations.push({
        type: 'BRAILLE',
        applied: true,
        details: `Converted to Grade ${config.brailleGrade} Braille`,
      });
    }

    // Simplified content
    if (config.reducedContentComplexity) {
      result.simplifiedContent = this.simplifyContent(content);
      result.transformations.push({
        type: 'SIMPLIFIED',
        applied: true,
        details: 'Simplified content for tactile presentation',
      });
    }

    // Haptic patterns
    if (config.vibrationPatterns) {
      result.tactileContent = result.tactileContent ?? {
        description: content.content,
        hapticPattern: this.generateHapticPattern('content_ready'),
      };
      result.transformations.push({
        type: 'HAPTIC_PATTERNS',
        applied: true,
        details: 'Added structured haptic patterns',
      });
    }
  }

  /**
   * Generate screen reader content
   */
  private generateScreenReaderContent(content: ContentItem): ScreenReaderContent {
    const announcements: string[] = [];
    let ariaLabel = '';
    let role: string | undefined;
    let headingLevel: number | undefined;

    switch (content.type) {
      case 'image':
        ariaLabel = `Image: ${this.generateImageDescription(content)}`;
        role = 'img';
        announcements.push(ariaLabel);
        break;
      case 'question':
        ariaLabel = content.content;
        role = 'region';
        announcements.push('Question:', content.content);
        break;
      case 'text':
        ariaLabel = content.content;
        announcements.push(content.content);
        break;
      default:
        ariaLabel = content.content;
    }

    return {
      ariaLabel,
      ariaDescription: content.metadata?.description as string,
      ariaLive: 'polite',
      role,
      headingLevel,
      announcements,
      keyboardShortcuts: [
        { key: 'Enter', action: 'Select' },
        { key: 'Tab', action: 'Next option' },
        { key: 'Shift+Tab', action: 'Previous option' },
        { key: 'Space', action: 'Toggle selection' },
      ],
    };
  }

  /**
   * Generate image description for screen readers
   */
  private generateImageDescription(content: ContentItem): string {
    // In production, this would use AI to generate descriptions
    // For now, use metadata or placeholder
    if (content.metadata?.altText) {
      return content.metadata.altText as string;
    }
    if (content.metadata?.description) {
      return content.metadata.description as string;
    }
    return 'Image content';
  }

  /**
   * Generate audio description for visual content
   */
  private async generateAudioDescription(
    content: ContentItem,
    level: AudioDescriptionLevel
  ): Promise<AudioContent> {
    // In production, this would use AI vision models to generate descriptions
    let description = '';

    switch (level) {
      case 'basic':
        description = this.generateImageDescription(content);
        break;
      case 'standard':
        description = `This image shows ${this.generateImageDescription(content)}. `;
        break;
      case 'extended':
        description = `Visual description: ${this.generateImageDescription(content)}. The image appears in the context of the current activity.`;
        break;
      case 'comprehensive':
        description = `Detailed visual description: ${this.generateImageDescription(content)}. This visual element is important for understanding the current question or activity. All relevant visual details have been described.`;
        break;
    }

    return {
      audioDescription: description,
      transcript: description,
      speechRate: 1,
      voiceId: 'natural',
    };
  }

  /**
   * Generate captions for audio/video content
   */
  private async generateCaptions(
    content: ContentItem,
    style: CaptionStyle
  ): Promise<CaptionedContent> {
    // In production, this would use speech-to-text and caption generation
    // For now, return placeholder structure
    const text = (content.metadata?.transcript as string) || content.content;

    // Split into caption cues (simplified)
    const words = text.split(' ');
    const cues: CaptionCue[] = [];
    let wordsPerCue: number;
    if (style === 'simplified') {
      wordsPerCue = 3;
    } else if (style === 'detailed') {
      wordsPerCue = 6;
    } else {
      wordsPerCue = 5;
    }

    for (let i = 0; i < words.length; i += wordsPerCue) {
      const cueWords = words.slice(i, i + wordsPerCue);
      cues.push({
        startTime: (i / wordsPerCue) * 2,
        endTime: (i / wordsPerCue + 1) * 2,
        text: cueWords.join(' '),
        position: 'bottom',
      });
    }

    return {
      captionTrack: cues,
      style,
      language: 'en',
    };
  }

  /**
   * Generate sign language content
   */
  private async generateSignLanguageContent(
    content: ContentItem,
    signLanguageType: SignLanguageType,
    useAvatar: boolean
  ): Promise<SignLanguageContent> {
    // In production, this would:
    // 1. Send text to sign language translation service
    // 2. Either generate avatar video or find matching pre-recorded video
    // For now, return placeholder

    return {
      videoUrl: useAvatar
        ? `/api/sign-language/avatar/${signLanguageType}?text=${encodeURIComponent(content.content)}`
        : undefined,
      signLanguageType,
      avatarGenerated: useAvatar,
      transcript: content.content,
      duration: Math.ceil(content.content.split(' ').length * 0.5), // Rough estimate
    };
  }

  /**
   * Generate haptic pattern for different events
   */
  private generateHapticPattern(eventType: string): HapticPattern {
    const patterns: Record<string, HapticPattern> = {
      notification: {
        pattern: [100, 50, 100],
        intensity: 'medium',
        meaning: 'New content available',
      },
      success: {
        pattern: [50, 50, 50, 50, 200],
        intensity: 'light',
        meaning: 'Correct answer',
      },
      error: {
        pattern: [200, 100, 200],
        intensity: 'strong',
        meaning: 'Incorrect answer or error',
      },
      content_ready: {
        pattern: [100],
        intensity: 'light',
        meaning: 'Content ready to read',
      },
      break_time: {
        pattern: [200, 200, 200],
        intensity: 'medium',
        meaning: 'Break time',
      },
      question: {
        pattern: [100, 100],
        intensity: 'medium',
        meaning: 'New question',
      },
    };

    return patterns[eventType] ?? patterns.notification;
  }

  /**
   * Convert text to Braille representation
   */
  private convertToBraille(text: string, grade: BrailleGrade): string {
    // In production, this would use a proper Braille translation library
    // Grade 1 = letter-by-letter, Grade 2 = contractions
    // For now, return placeholder
    if (grade === 1) {
      return `[Braille G1: ${text}]`;
    }
    return `[Braille G2: ${text}]`;
  }

  /**
   * Simplify content for deafblind users
   */
  private simplifyContent(content: ContentItem): SimplifiedContent {
    // In production, this would use AI to simplify text
    const text = content.content;

    // Simple simplification: shorter sentences, key words
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
    const keyPoints = sentences.slice(0, 3).map((s) => s.trim());

    return {
      text: keyPoints.join('. ') + '.',
      readingLevel: 2, // Simplified to grade 2 reading level
      keyPoints,
    };
  }

  /**
   * Get navigation instructions for different sensory types
   */
  getNavigationInstructions(
    sensoryType: SensoryImpairmentType,
    inputMethod: InputMethod
  ): { instructions: string[]; keyboardShortcuts: { key: string; action: string }[] } {
    const baseInstructions: string[] = [];
    const shortcuts: { key: string; action: string }[] = [];

    switch (sensoryType) {
      case 'BLIND':
        baseInstructions.push(
          'Use screen reader to navigate',
          'Tab to move between options',
          'Enter or Space to select',
          'H to jump to headings',
          'Escape to go back'
        );
        shortcuts.push(
          { key: 'Tab', action: 'Next element' },
          { key: 'Shift+Tab', action: 'Previous element' },
          { key: 'Enter', action: 'Select/Activate' },
          { key: 'Space', action: 'Toggle' },
          { key: 'H', action: 'Next heading' },
          { key: 'Escape', action: 'Back/Cancel' }
        );
        break;

      case 'DEAF':
        baseInstructions.push(
          'All audio has captions',
          'Visual alerts replace sounds',
          'Sign language videos available',
          'Tap for haptic feedback'
        );
        shortcuts.push(
          { key: 'C', action: 'Toggle captions' },
          { key: 'S', action: 'Toggle sign language' }
        );
        break;

      case 'DEAFBLIND':
        baseInstructions.push(
          'Content available on Braille display',
          'Haptic patterns indicate events',
          'Partner can assist with navigation',
          'Linear navigation only'
        );
        break;
    }

    // Add input method specific instructions
    switch (inputMethod) {
      case 'SWITCH_SINGLE':
        baseInstructions.push('Single switch: Press to advance scan, hold to select');
        break;
      case 'SWITCH_DUAL':
        baseInstructions.push(
          'Switch 1: Advance to next option',
          'Switch 2: Select current option'
        );
        break;
      case 'EYE_GAZE':
        baseInstructions.push('Look at an option to highlight', 'Hold gaze to select');
        break;
    }

    return { instructions: baseInstructions, keyboardShortcuts: shortcuts };
  }

  /**
   * Generate visual alert for audio event
   */
  generateVisualAlert(
    eventType: 'success' | 'error' | 'notification' | 'warning' | 'question',
    message: string
  ): {
    type: 'flash' | 'color' | 'icon' | 'animation';
    color: string;
    icon: string;
    message: string;
    duration: number;
  } {
    const alerts = {
      success: {
        type: 'color' as const,
        color: '#22c55e',
        icon: '✓',
        duration: 2000,
      },
      error: {
        type: 'color' as const,
        color: '#ef4444',
        icon: '✗',
        duration: 3000,
      },
      notification: {
        type: 'icon' as const,
        color: '#3b82f6',
        icon: 'ℹ',
        duration: 4000,
      },
      warning: {
        type: 'color' as const,
        color: '#f59e0b',
        icon: '⚠',
        duration: 3000,
      },
      question: {
        type: 'animation' as const,
        color: '#8b5cf6',
        icon: '?',
        duration: 1500,
      },
    };

    return {
      ...alerts[eventType],
      message,
    };
  }
}

// Export singleton instance
export const sensoryAccessibilityService = new SensoryAccessibilityService();
