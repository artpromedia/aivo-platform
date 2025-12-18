/// Sensory Module - ND-2.1
///
/// Sensory profile management and content adaptation for neurodiverse learners.
///
/// This module provides:
/// - [SensoryProfile] - Learner sensory preferences and sensitivities
/// - [SensoryService] - API client for sensory operations
/// - [SensoryMatchResult] - Content matching results
/// - [ContentSensorySettings] - Applied content adaptations
///
/// Widgets:
/// - [SensoryAdaptedScaffold] - Scaffold with sensory adaptations
/// - [SensoryWarningBanner] - Display sensory warnings
/// - [SensoryMatchIndicator] - Visual match score indicator
/// - [BreakReminder] - Break reminder overlay
/// - [SensoryIncidentReporter] - Incident reporting button
/// - [SensoryQuickSettings] - Quick settings panel
///
/// Example usage:
/// ```dart
/// // Get learner's sensory profile
/// final profile = ref.watch(sensoryProfileProvider(learnerId));
///
/// // Get content settings
/// final settings = ref.watch(sensorySettingsNotifierProvider);
///
/// // Apply settings with adapted scaffold
/// SensoryAdaptedScaffold(
///   child: YourContent(),
/// )
/// ```

library sensory;

export 'sensory_models.dart';
export 'sensory_service.dart';
export 'sensory_widgets.dart';
