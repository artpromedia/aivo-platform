/**
 * Alternative Input Service
 *
 * Provides support for alternative input methods for learners who
 * cannot use standard touch/mouse/keyboard input.
 *
 * Supported Methods:
 * - Switch scanning (single/dual switch)
 * - Eye gaze tracking
 * - Voice control
 * - Head tracking
 * - Large touch targets
 * - Partner-assisted input
 *
 * @author AIVO Platform Team
 */

import type { InputMethod } from './assessmentModeRouter.js';

// Re-export types for use by routes
export type { InputMethod } from './assessmentModeRouter.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ScanPattern = 'linear' | 'row_column' | 'group' | 'quadrant';
export type ScanDirection = 'left_to_right' | 'right_to_left' | 'top_to_bottom' | 'bottom_to_top';
export type ActivationType = 'press' | 'release' | 'hold' | 'double_press';
export type GazeActivationType = 'dwell' | 'blink' | 'external_switch';
export type VoiceCommandType = 'number' | 'name' | 'keyword' | 'natural';

/**
 * Configuration for switch scanning
 */
export interface SwitchScanConfig {
  enabled: boolean;
  numberOfSwitches: 1 | 2;

  // Scan settings
  scanPattern: ScanPattern;
  scanDirection: ScanDirection;
  scanSpeed: number; // milliseconds between scans
  autoScanEnabled: boolean;

  // Activation
  switch1Action: ActivationType;
  switch2Action?: ActivationType;
  holdDuration: number; // ms for hold activation

  // Visual
  highlightStyle: 'border' | 'background' | 'both';
  highlightColor: string;
  highlightWidth: number;

  // Audio
  audioFeedbackEnabled: boolean;
  scanSoundEnabled: boolean;

  // Timing
  firstItemDelay: number;
  acceptanceDelay: number;
  repeatDelay: number;
}

/**
 * Configuration for eye gaze tracking
 */
export interface EyeGazeConfig {
  enabled: boolean;

  // Calibration
  calibrationPoints: number;
  calibrationRequired: boolean;

  // Dwell settings
  dwellTime: number; // ms to select
  dwellAnimation: 'fill' | 'shrink' | 'glow' | 'none';

  // Activation
  activationType: GazeActivationType;
  blinkDuration?: number;

  // Visual
  gazeIndicatorEnabled: boolean;
  gazeIndicatorSize: number;
  gazeIndicatorColor: string;

  // Target sizing
  minimumTargetSize: number; // pixels
  targetPadding: number;

  // Filtering
  smoothingEnabled: boolean;
  smoothingFactor: number;
  jitterReduction: boolean;
}

/**
 * Configuration for voice control
 */
export interface VoiceControlConfig {
  enabled: boolean;

  // Recognition
  language: string;
  continuous: boolean;
  interimResults: boolean;

  // Commands
  commandType: VoiceCommandType;
  customCommands: VoiceCommand[];

  // Confirmation
  confirmationRequired: boolean;
  confirmationPhrase: string;

  // Feedback
  audioFeedbackEnabled: boolean;
  visualFeedbackEnabled: boolean;

  // Timing
  listeningTimeout: number;
  responseDelay: number;
}

export interface VoiceCommand {
  phrase: string;
  aliases: string[];
  action: string;
  target?: string;
}

/**
 * Configuration for head tracking
 */
export interface HeadTrackingConfig {
  enabled: boolean;

  // Movement
  sensitivity: 'low' | 'medium' | 'high';
  deadZone: number; // pixels

  // Gestures
  nodToSelect: boolean;
  shakeToCancel: boolean;

  // Dwell
  dwellEnabled: boolean;
  dwellTime: number;

  // Visual
  cursorEnabled: boolean;
  cursorSize: number;
}

/**
 * Configuration for large touch targets
 */
export interface LargeTouchConfig {
  enabled: boolean;

  // Sizing
  minimumTargetSize: number; // pixels
  targetSpacing: number;

  // Layout
  maxItemsPerRow: number;
  maxItemsPerScreen: number;

  // Touch behavior
  touchHoldDuration: number;
  doubleTapEnabled: boolean;
  dragEnabled: boolean;

  // Feedback
  hapticEnabled: boolean;
  audioEnabled: boolean;
  visualFeedbackDuration: number;
}

/**
 * Configuration for partner-assisted input
 */
export interface PartnerAssistedConfig {
  enabled: boolean;

  // Mode
  partnerEntersResponses: boolean;
  learnerIndicatesChoice: boolean;

  // Learner indication methods
  indicationMethods: (
    | 'eye_contact'
    | 'gesture'
    | 'vocalization'
    | 'body_movement'
    | 'facial_expression'
  )[];

  // Partner interface
  showInstructions: boolean;
  confirmationRequired: boolean;

  // Logging
  recordPartnerNotes: boolean;
  recordObservations: boolean;
}

/**
 * Scannable element for switch scanning
 */
export interface ScannableElement {
  id: string;
  label: string;
  ariaLabel: string;
  group?: string;
  order: number;
  isDefault?: boolean;
  action: () => void;
}

/**
 * Scan state
 */
export interface ScanState {
  isScanning: boolean;
  currentIndex: number;
  currentGroup?: string;
  scanLevel: 'group' | 'item';
  lastScanTime: number;
}

/**
 * Voice recognition result
 */
export interface VoiceResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  matchedCommand?: VoiceCommand;
  alternatives?: { transcript: string; confidence: number }[];
}

// ══════════════════════════════════════════════════════════════════════════════
// ALTERNATIVE INPUT SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class AlternativeInputService {
  private scanState: ScanState = {
    isScanning: false,
    currentIndex: 0,
    scanLevel: 'group',
    lastScanTime: 0,
  };

  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private elements: ScannableElement[] = [];

  /**
   * Create configuration for an input method
   */
  createInputConfig(
    inputMethod: InputMethod,
    options?: Partial<
      | SwitchScanConfig
      | EyeGazeConfig
      | VoiceControlConfig
      | HeadTrackingConfig
      | LargeTouchConfig
      | PartnerAssistedConfig
    >
  ):
    | SwitchScanConfig
    | EyeGazeConfig
    | VoiceControlConfig
    | HeadTrackingConfig
    | LargeTouchConfig
    | PartnerAssistedConfig {
    switch (inputMethod) {
      case 'SWITCH_SINGLE':
        return this.createSingleSwitchConfig(options as Partial<SwitchScanConfig>);
      case 'SWITCH_DUAL':
        return this.createDualSwitchConfig(options as Partial<SwitchScanConfig>);
      case 'EYE_GAZE':
        return this.createEyeGazeConfig(options as Partial<EyeGazeConfig>);
      case 'VOICE_CONTROL':
        return this.createVoiceControlConfig(options as Partial<VoiceControlConfig>);
      case 'HEAD_TRACKING':
        return this.createHeadTrackingConfig(options as Partial<HeadTrackingConfig>);
      case 'LARGE_TOUCH':
        return this.createLargeTouchConfig(options as Partial<LargeTouchConfig>);
      case 'PARTNER_ASSISTED':
        return this.createPartnerAssistedConfig(options as Partial<PartnerAssistedConfig>);
      default:
        return this.createLargeTouchConfig({});
    }
  }

  private createSingleSwitchConfig(options?: Partial<SwitchScanConfig>): SwitchScanConfig {
    return {
      enabled: true,
      numberOfSwitches: 1,
      scanPattern: options?.scanPattern ?? 'linear',
      scanDirection: options?.scanDirection ?? 'left_to_right',
      scanSpeed: options?.scanSpeed ?? 1500,
      autoScanEnabled: true,
      switch1Action: options?.switch1Action ?? 'press',
      holdDuration: options?.holdDuration ?? 500,
      highlightStyle: 'both',
      highlightColor: '#3b82f6',
      highlightWidth: 4,
      audioFeedbackEnabled: true,
      scanSoundEnabled: true,
      firstItemDelay: 1000,
      acceptanceDelay: 300,
      repeatDelay: 2000,
    };
  }

  private createDualSwitchConfig(options?: Partial<SwitchScanConfig>): SwitchScanConfig {
    return {
      enabled: true,
      numberOfSwitches: 2,
      scanPattern: options?.scanPattern ?? 'row_column',
      scanDirection: options?.scanDirection ?? 'left_to_right',
      scanSpeed: options?.scanSpeed ?? 1200,
      autoScanEnabled: false,
      switch1Action: options?.switch1Action ?? 'press', // Advance
      switch2Action: options?.switch2Action ?? 'press', // Select
      holdDuration: options?.holdDuration ?? 500,
      highlightStyle: 'both',
      highlightColor: '#3b82f6',
      highlightWidth: 4,
      audioFeedbackEnabled: true,
      scanSoundEnabled: true,
      firstItemDelay: 500,
      acceptanceDelay: 200,
      repeatDelay: 1500,
    };
  }

  private createEyeGazeConfig(options?: Partial<EyeGazeConfig>): EyeGazeConfig {
    return {
      enabled: true,
      calibrationPoints: options?.calibrationPoints ?? 5,
      calibrationRequired: true,
      dwellTime: options?.dwellTime ?? 1000,
      dwellAnimation: options?.dwellAnimation ?? 'fill',
      activationType: options?.activationType ?? 'dwell',
      gazeIndicatorEnabled: true,
      gazeIndicatorSize: 30,
      gazeIndicatorColor: '#3b82f6',
      minimumTargetSize: 100,
      targetPadding: 20,
      smoothingEnabled: true,
      smoothingFactor: 0.3,
      jitterReduction: true,
    };
  }

  private createVoiceControlConfig(options?: Partial<VoiceControlConfig>): VoiceControlConfig {
    return {
      enabled: true,
      language: options?.language ?? 'en-US',
      continuous: true,
      interimResults: true,
      commandType: options?.commandType ?? 'number',
      customCommands: options?.customCommands ?? this.getDefaultVoiceCommands(),
      confirmationRequired: options?.confirmationRequired ?? true,
      confirmationPhrase: 'yes',
      audioFeedbackEnabled: true,
      visualFeedbackEnabled: true,
      listeningTimeout: 10000,
      responseDelay: 500,
    };
  }

  private createHeadTrackingConfig(options?: Partial<HeadTrackingConfig>): HeadTrackingConfig {
    return {
      enabled: true,
      sensitivity: options?.sensitivity ?? 'medium',
      deadZone: 10,
      nodToSelect: true,
      shakeToCancel: true,
      dwellEnabled: true,
      dwellTime: options?.dwellTime ?? 1500,
      cursorEnabled: true,
      cursorSize: 40,
    };
  }

  private createLargeTouchConfig(options?: Partial<LargeTouchConfig>): LargeTouchConfig {
    return {
      enabled: true,
      minimumTargetSize: options?.minimumTargetSize ?? 80,
      targetSpacing: options?.targetSpacing ?? 20,
      maxItemsPerRow: options?.maxItemsPerRow ?? 2,
      maxItemsPerScreen: options?.maxItemsPerScreen ?? 4,
      touchHoldDuration: 300,
      doubleTapEnabled: false,
      dragEnabled: false,
      hapticEnabled: true,
      audioEnabled: true,
      visualFeedbackDuration: 300,
    };
  }

  private createPartnerAssistedConfig(
    options?: Partial<PartnerAssistedConfig>
  ): PartnerAssistedConfig {
    return {
      enabled: true,
      partnerEntersResponses: true,
      learnerIndicatesChoice: true,
      indicationMethods: options?.indicationMethods ?? ['eye_contact', 'gesture', 'vocalization'],
      showInstructions: true,
      confirmationRequired: true,
      recordPartnerNotes: true,
      recordObservations: true,
    };
  }

  private getDefaultVoiceCommands(): VoiceCommand[] {
    return [
      { phrase: 'one', aliases: ['1', 'first', 'option one'], action: 'select', target: '1' },
      { phrase: 'two', aliases: ['2', 'second', 'option two'], action: 'select', target: '2' },
      { phrase: 'three', aliases: ['3', 'third', 'option three'], action: 'select', target: '3' },
      { phrase: 'four', aliases: ['4', 'fourth', 'option four'], action: 'select', target: '4' },
      { phrase: 'next', aliases: ['forward', 'continue', 'go'], action: 'next' },
      { phrase: 'back', aliases: ['previous', 'go back'], action: 'back' },
      { phrase: 'repeat', aliases: ['again', 'say again', 'what'], action: 'repeat' },
      { phrase: 'help', aliases: ['assistance', 'instructions'], action: 'help' },
      { phrase: 'stop', aliases: ['pause', 'wait'], action: 'pause' },
      { phrase: 'start', aliases: ['begin', 'resume', 'go'], action: 'resume' },
    ];
  }

  /**
   * Initialize switch scanning
   */
  initializeSwitchScanning(elements: ScannableElement[], config: SwitchScanConfig): void {
    this.elements = [...elements].sort((a, b) => a.order - b.order);
    this.scanState = {
      isScanning: false,
      currentIndex: 0,
      scanLevel:
        config.scanPattern === 'row_column' || config.scanPattern === 'group' ? 'group' : 'item',
      lastScanTime: Date.now(),
    };

    console.log('[alternative-input] switch_scanning_initialized', {
      elementCount: elements.length,
      scanPattern: config.scanPattern,
      scanSpeed: config.scanSpeed,
    });
  }

  /**
   * Start auto-scanning
   */
  startAutoScan(config: SwitchScanConfig, onHighlight: (element: ScannableElement) => void): void {
    if (!config.autoScanEnabled) return;

    this.scanState.isScanning = true;

    // Initial delay before first scan
    setTimeout(() => {
      this.scanTimer = setInterval(() => {
        this.advanceScan();
        const currentElement = this.elements[this.scanState.currentIndex] as
          | ScannableElement
          | undefined;
        if (currentElement) {
          onHighlight(currentElement);
        }
      }, config.scanSpeed);
    }, config.firstItemDelay);

    console.log('[alternative-input] auto_scan_started', { scanSpeed: config.scanSpeed });
  }

  /**
   * Stop auto-scanning
   */
  stopAutoScan(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    this.scanState.isScanning = false;
    console.log('[alternative-input] auto_scan_stopped');
  }

  /**
   * Advance to next scannable element
   */
  advanceScan(): ScannableElement | null {
    if (this.elements.length === 0) return null;

    this.scanState.currentIndex = (this.scanState.currentIndex + 1) % this.elements.length;
    this.scanState.lastScanTime = Date.now();

    return this.elements[this.scanState.currentIndex];
  }

  /**
   * Select current element
   */
  selectCurrent(): ScannableElement | null {
    const element = this.elements[this.scanState.currentIndex] as ScannableElement | undefined;
    if (element) {
      element.action();
      console.log('[alternative-input] element_selected', {
        elementId: element.id,
        label: element.label,
      });
      return element;
    }
    return null;
  }

  /**
   * Handle switch press
   */
  handleSwitchPress(
    switchNumber: 1 | 2,
    config: SwitchScanConfig,
    onHighlight: (element: ScannableElement) => void
  ): ScannableElement | null {
    if (config.numberOfSwitches === 1) {
      // Single switch: press advances, hold selects
      if (config.autoScanEnabled) {
        return this.selectCurrent();
      } else {
        const element = this.advanceScan();
        if (element) onHighlight(element);
        return element;
      }
    } else if (switchNumber === 1) {
      // Dual switch, Switch 1: Advance
      const element = this.advanceScan();
      if (element) onHighlight(element);
      return element;
    } else {
      // Dual switch, Switch 2: Select
      return this.selectCurrent();
    }
  }

  /**
   * Process voice command
   */
  processVoiceCommand(
    result: VoiceResult,
    config: VoiceControlConfig,
    elements: ScannableElement[]
  ): { matched: boolean; command?: VoiceCommand; element?: ScannableElement } {
    const transcript = result.transcript.toLowerCase().trim();

    // Check for number commands
    if (config.commandType === 'number') {
      const numberRegex = /\b(one|two|three|four|1|2|3|4)\b/;
      const numberMatch = numberRegex.exec(transcript);
      if (numberMatch) {
        const numberMap: Record<string, number | undefined> = {
          one: 0,
          '1': 0,
          two: 1,
          '2': 1,
          three: 2,
          '3': 2,
          four: 3,
          '4': 3,
        };
        const index = numberMap[numberMatch[1]];
        if (index !== undefined) {
          const matchedElement = elements[index] as ScannableElement | undefined;
          if (matchedElement) {
            console.log('[alternative-input] voice_command_matched', {
              transcript,
              matchedNumber: numberMatch[1],
              elementId: matchedElement.id,
            });
            return { matched: true, element: matchedElement };
          }
        }
      }
    }

    // Check custom commands
    for (const command of config.customCommands) {
      if (
        transcript.includes(command.phrase.toLowerCase()) ||
        command.aliases.some((alias) => transcript.includes(alias.toLowerCase()))
      ) {
        console.log('[alternative-input] voice_command_matched', {
          transcript,
          command: command.phrase,
          action: command.action,
        });
        return { matched: true, command };
      }
    }

    console.log('[alternative-input] voice_command_not_matched', { transcript });
    return { matched: false };
  }

  /**
   * Get layout for input method
   */
  getLayoutConfig(
    inputMethod: InputMethod,
    itemCount: number
  ): {
    columns: number;
    rows: number;
    itemSize: number;
    spacing: number;
    containerStyle: Record<string, string | number>;
    itemStyle: Record<string, string | number>;
  } {
    switch (inputMethod) {
      case 'SWITCH_SINGLE':
      case 'SWITCH_DUAL':
        // Linear layout for scanning
        return {
          columns: Math.min(itemCount, 4),
          rows: Math.ceil(itemCount / 4),
          itemSize: 100,
          spacing: 10,
          containerStyle: {
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '10px',
          },
          itemStyle: {
            width: '100px',
            height: '100px',
            border: '3px solid transparent',
            borderRadius: '8px',
          },
        };

      case 'EYE_GAZE':
        // Large targets with lots of spacing
        return {
          columns: Math.min(itemCount, 2),
          rows: Math.ceil(itemCount / 2),
          itemSize: 150,
          spacing: 40,
          containerStyle: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '40px',
            padding: '40px',
          },
          itemStyle: {
            width: '150px',
            height: '150px',
            border: '4px solid #ccc',
            borderRadius: '16px',
          },
        };

      case 'LARGE_TOUCH':
        // Very large targets
        return {
          columns: 2,
          rows: Math.ceil(itemCount / 2),
          itemSize: 120,
          spacing: 30,
          containerStyle: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '30px',
            padding: '20px',
          },
          itemStyle: {
            width: '120px',
            height: '120px',
            border: '4px solid #3b82f6',
            borderRadius: '12px',
          },
        };

      case 'PARTNER_ASSISTED':
        // Clear visual layout for partner
        return {
          columns: Math.min(itemCount, 2),
          rows: Math.ceil(itemCount / 2),
          itemSize: 140,
          spacing: 25,
          containerStyle: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '25px',
            padding: '30px',
          },
          itemStyle: {
            width: '140px',
            height: '140px',
            border: '5px solid #6b7280',
            borderRadius: '10px',
            fontSize: '24px',
          },
        };

      default:
        return {
          columns: 2,
          rows: 2,
          itemSize: 80,
          spacing: 16,
          containerStyle: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
          },
          itemStyle: {
            width: '80px',
            height: '80px',
          },
        };
    }
  }

  /**
   * Get instructions for partner-assisted mode
   */
  getPartnerInstructions(
    config: PartnerAssistedConfig,
    questionText: string,
    options: { id: string; label: string }[]
  ): {
    forPartner: string[];
    forLearner: string[];
    optionPresentation: string;
  } {
    const forPartner: string[] = [
      'Read the question aloud to the learner clearly and at an appropriate pace.',
      'Present the answer options one at a time, allowing time for the learner to process.',
      "Watch for the learner's response using their indicated communication method.",
    ];

    if (config.indicationMethods.includes('eye_contact')) {
      forPartner.push('Watch for eye gaze toward preferred option.');
    }
    if (config.indicationMethods.includes('gesture')) {
      forPartner.push('Watch for pointing or gestures toward preferred option.');
    }
    if (config.indicationMethods.includes('vocalization')) {
      forPartner.push('Listen for vocalizations when preferred option is presented.');
    }

    if (config.confirmationRequired) {
      forPartner.push("Confirm the learner's choice before entering it.");
    }

    if (config.recordObservations) {
      forPartner.push("Note any observations about the learner's engagement or responses.");
    }

    const forLearner: string[] = ['Listen to the question.', 'Show which answer you want.'];

    const optionPresentation = options
      .map((opt, i) => `Option ${i + 1}: "${opt.label}"`)
      .join(' ... ');

    return {
      forPartner,
      forLearner,
      optionPresentation,
    };
  }

  /**
   * Record partner observation
   */
  recordPartnerObservation(
    learnerId: string,
    questionId: string,
    observation: {
      selectedOptionId: string;
      indicationMethod: string;
      confidence: 'clear' | 'tentative' | 'no_response';
      notes?: string;
      responseTime?: number;
    }
  ): void {
    console.log('[alternative-input] partner_observation_recorded', {
      learnerId,
      questionId,
      ...observation,
    });
  }

  /**
   * Generate accessibility attributes for elements
   */
  generateAccessibilityAttributes(
    element: ScannableElement,
    inputMethod: InputMethod,
    index: number,
    isHighlighted: boolean
  ): Record<string, string | boolean | number> {
    const attrs: Record<string, string | boolean | number> = {
      role: 'button',
      'aria-label': element.ariaLabel,
      tabIndex: isHighlighted ? 0 : -1,
      'data-scannable': true,
      'data-scan-order': element.order,
    };

    switch (inputMethod) {
      case 'SWITCH_SINGLE':
      case 'SWITCH_DUAL':
        attrs['aria-live'] = 'polite';
        attrs['aria-selected'] = isHighlighted;
        break;
      case 'EYE_GAZE':
        attrs['data-gaze-target'] = true;
        attrs['data-dwell-selectable'] = true;
        break;
      case 'VOICE_CONTROL':
        attrs['data-voice-command'] = `option ${index + 1}`;
        attrs['aria-keyshortcuts'] = `${index + 1}`;
        break;
    }

    return attrs;
  }
}

// Export singleton instance
export const alternativeInputService = new AlternativeInputService();
