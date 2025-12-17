/// Transition Support System for Neurodiverse Learners
///
/// This module provides visual, audio, and haptic warnings before activity changes,
/// helping learners who need predictable flows and advance notice of transitions.
///
/// Main components:
/// - [TransitionService] - API client for transition planning and tracking
/// - [TransitionWarningWidget] - Countdown warning with multiple visualization styles
/// - [FirstThenBoardWidget] - Visual First/Then board for activity preview
/// - [TransitionRoutineWidget] - Guided routine with breathing, movement, sensory steps

library transitions;

export 'transition_service.dart';
export 'transition_widgets.dart';
