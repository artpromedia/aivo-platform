/// Flutter Accessibility Utilities
///
/// WCAG 2.1 Level AA compliant accessibility utilities for Flutter.
/// Supports VoiceOver, TalkBack, and other screen readers.
/// 
/// Features matching web implementation:
/// - High contrast mode (2x border widths, enhanced contrast)
/// - Dyslexia-friendly mode (Atkinson Hyperlegible font, increased spacing)
/// - Reduced motion mode (disables all animations)
/// - Large text mode (1.2x scale multiplier)
library accessibility;

export 'accessibility_semantics.dart';
export 'accessibility_announcer.dart';
export 'accessibility_focus.dart';
export 'accessibility_preferences.dart';
export 'accessible_widgets.dart';
export 'accessibility_controller.dart';
export 'accessibility_widgets.dart';
