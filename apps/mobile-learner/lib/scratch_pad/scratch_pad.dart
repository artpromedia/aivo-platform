/// Math Scratch Pad Module
///
/// Provides freeform drawing canvas with AI-powered
/// math handwriting recognition for solving problems.
///
/// Usage:
/// ```dart
/// import 'package:mobile_learner/scratch_pad/scratch_pad.dart';
///
/// // Show as popup
/// final answer = await showScratchPadSheet(
///   context: context,
///   service: scratchPadService,
///   questionText: 'What is 5 + 3?',
/// );
///
/// // Or embed inline
/// InlineScratchPad(
///   service: scratchPadService,
///   onAnswerSubmit: (answer) => print('Answer: $answer'),
/// )
/// ```

library scratch_pad;

// Models
export 'models/stroke_data.dart';

// Services
export 'services/scratch_pad_service.dart';

// Widgets
export 'widgets/scratch_pad_canvas.dart';
export 'widgets/scratch_pad_popup.dart';
export 'widgets/math_activity_integration.dart';
