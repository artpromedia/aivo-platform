/// Aivo Shadow & Elevation System
///
/// Centralized shadow definitions matching web design system exactly.
/// Uses navy-based shadow color: rgba(26, 26, 46, opacity)
///
/// Elevation Levels:
/// - Level 1 (Soft): Cards at rest, subtle depth
/// - Level 2 (Raised): Hover states, moderate emphasis
/// - Level 3 (Elevated): Modals, dialogs, popovers
///
/// Usage:
/// ```dart
/// Container(
///   decoration: BoxDecoration(
///     boxShadow: AivoShadows.soft,
///   ),
/// )
/// ```
library;

import 'package:flutter/material.dart';

import 'aivo_theme.dart';

/// Shadow system matching web tokens exactly.
///
/// Web tokens reference:
/// - soft: { color: rgba(26, 26, 46, 0.08), x: 0, y: 4, blur: 16, spread: 0 }
/// - raised: { color: rgba(26, 26, 46, 0.12), x: 0, y: 8, blur: 24, spread: 0 }
/// - elevated: { color: rgba(26, 26, 46, 0.16), x: 0, y: 12, blur: 32, spread: 0 }
abstract class AivoShadows {
  AivoShadows._();

  // ════════════════════════════════════════════════════════════════════════════
  // BASE SHADOW COLOR (Navy)
  // ════════════════════════════════════════════════════════════════════════════

  /// Base shadow color (navy) - #1A1A2E
  static const Color shadowColorBase = Color(0xFF1A1A2E);

  /// Dark mode shadow color (pure black for better contrast)
  static const Color shadowColorDark = Color(0xFF000000);

  // ════════════════════════════════════════════════════════════════════════════
  // ELEVATION LEVEL 1 - SOFT
  // Cards at rest, subtle depth indication
  // Web: y: 4, blur: 16, opacity: 0.08
  // ════════════════════════════════════════════════════════════════════════════

  /// Soft shadow - Level 1 elevation
  static const List<BoxShadow> soft = [
    BoxShadow(
      color: Color(0x141A1A2E), // rgba(26, 26, 46, 0.08)
      offset: Offset(0, 4),
      blurRadius: 16,
      spreadRadius: 0,
    ),
  ];

  /// Soft shadow for dark mode
  static const List<BoxShadow> softDark = [
    BoxShadow(
      color: Color(0x33000000), // rgba(0, 0, 0, 0.20)
      offset: Offset(0, 4),
      blurRadius: 16,
      spreadRadius: 0,
    ),
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // ELEVATION LEVEL 2 - RAISED
  // Hover states, moderate emphasis, floating elements
  // Web: y: 8, blur: 24, opacity: 0.12
  // ════════════════════════════════════════════════════════════════════════════

  /// Raised shadow - Level 2 elevation
  static const List<BoxShadow> raised = [
    BoxShadow(
      color: Color(0x1F1A1A2E), // rgba(26, 26, 46, 0.12)
      offset: Offset(0, 8),
      blurRadius: 24,
      spreadRadius: 0,
    ),
  ];

  /// Raised shadow for dark mode
  static const List<BoxShadow> raisedDark = [
    BoxShadow(
      color: Color(0x4D000000), // rgba(0, 0, 0, 0.30)
      offset: Offset(0, 8),
      blurRadius: 24,
      spreadRadius: 0,
    ),
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // ELEVATION LEVEL 3 - ELEVATED
  // Modals, dialogs, popovers, tooltips
  // Web: y: 12, blur: 32, opacity: 0.16
  // ════════════════════════════════════════════════════════════════════════════

  /// Elevated shadow - Level 3 elevation
  static const List<BoxShadow> elevated = [
    BoxShadow(
      color: Color(0x291A1A2E), // rgba(26, 26, 46, 0.16)
      offset: Offset(0, 12),
      blurRadius: 32,
      spreadRadius: 0,
    ),
  ];

  /// Elevated shadow for dark mode
  static const List<BoxShadow> elevatedDark = [
    BoxShadow(
      color: Color(0x66000000), // rgba(0, 0, 0, 0.40)
      offset: Offset(0, 12),
      blurRadius: 32,
      spreadRadius: 0,
    ),
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // HOVER STATE SHADOWS
  // Increased blur and offset for interactive feedback
  // ════════════════════════════════════════════════════════════════════════════

  /// Soft hover - slightly more pronounced than soft
  static const List<BoxShadow> softHover = [
    BoxShadow(
      color: Color(0x1A1A1A2E), // rgba(26, 26, 46, 0.10)
      offset: Offset(0, 6),
      blurRadius: 20,
      spreadRadius: 0,
    ),
  ];

  /// Raised hover - transition from soft to raised
  static const List<BoxShadow> raisedHover = [
    BoxShadow(
      color: Color(0x241A1A2E), // rgba(26, 26, 46, 0.14)
      offset: Offset(0, 10),
      blurRadius: 28,
      spreadRadius: 0,
    ),
  ];

  /// Elevated hover - maximum emphasis
  static const List<BoxShadow> elevatedHover = [
    BoxShadow(
      color: Color(0x331A1A2E), // rgba(26, 26, 46, 0.20)
      offset: Offset(0, 16),
      blurRadius: 40,
      spreadRadius: 0,
    ),
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // GRADE-BAND CARD SHADOWS (Matches web gradeThemes.components.cardShadow)
  // ════════════════════════════════════════════════════════════════════════════

  /// Explorer (K-5) card shadow - coral tinted, playful
  /// Web: 0 8px 32px rgba(255, 107, 107, 0.2)
  static const List<BoxShadow> cardExplorer = [
    BoxShadow(
      color: Color(0x33FF6B6B), // rgba(255, 107, 107, 0.20)
      offset: Offset(0, 8),
      blurRadius: 32,
      spreadRadius: 0,
    ),
  ];

  /// Explorer card hover shadow
  /// Web: 0 12px 40px rgba(255, 107, 107, 0.3)
  static const List<BoxShadow> cardExplorerHover = [
    BoxShadow(
      color: Color(0x4DFF6B6B), // rgba(255, 107, 107, 0.30)
      offset: Offset(0, 12),
      blurRadius: 40,
      spreadRadius: 0,
    ),
  ];

  /// Navigator (6-8) card shadow - teal tinted, balanced
  /// Web: 0 4px 16px rgba(8, 145, 178, 0.12)
  static const List<BoxShadow> cardNavigator = [
    BoxShadow(
      color: Color(0x1F0891B2), // rgba(8, 145, 178, 0.12)
      offset: Offset(0, 4),
      blurRadius: 16,
      spreadRadius: 0,
    ),
  ];

  /// Navigator card hover shadow
  /// Web: 0 8px 24px rgba(8, 145, 178, 0.18)
  static const List<BoxShadow> cardNavigatorHover = [
    BoxShadow(
      color: Color(0x2E0891B2), // rgba(8, 145, 178, 0.18)
      offset: Offset(0, 8),
      blurRadius: 24,
      spreadRadius: 0,
    ),
  ];

  /// Scholar (9-12) card shadow - navy tinted, professional
  /// Web: 0 2px 8px rgba(26, 26, 46, 0.08)
  static const List<BoxShadow> cardScholar = [
    BoxShadow(
      color: Color(0x141A1A2E), // rgba(26, 26, 46, 0.08)
      offset: Offset(0, 2),
      blurRadius: 8,
      spreadRadius: 0,
    ),
  ];

  /// Scholar card hover shadow
  /// Web: 0 4px 12px rgba(26, 26, 46, 0.12)
  static const List<BoxShadow> cardScholarHover = [
    BoxShadow(
      color: Color(0x1F1A1A2E), // rgba(26, 26, 46, 0.12)
      offset: Offset(0, 4),
      blurRadius: 12,
      spreadRadius: 0,
    ),
  ];

  /// Scholar dark mode card shadow
  /// Web: 0 2px 8px rgba(0, 0, 0, 0.3)
  static const List<BoxShadow> cardScholarDark = [
    BoxShadow(
      color: Color(0x4D000000), // rgba(0, 0, 0, 0.30)
      offset: Offset(0, 2),
      blurRadius: 8,
      spreadRadius: 0,
    ),
  ];

  /// Scholar dark mode card hover shadow
  /// Web: 0 4px 12px rgba(0, 0, 0, 0.4)
  static const List<BoxShadow> cardScholarDarkHover = [
    BoxShadow(
      color: Color(0x66000000), // rgba(0, 0, 0, 0.40)
      offset: Offset(0, 4),
      blurRadius: 12,
      spreadRadius: 0,
    ),
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // COLORED SHADOWS (For buttons and emphasis)
  // ════════════════════════════════════════════════════════════════════════════

  /// Primary (purple) colored shadow for buttons
  static const List<BoxShadow> primary = [
    BoxShadow(
      color: Color(0x408B5CF6), // rgba(139, 92, 246, 0.25)
      offset: Offset(0, 8),
      blurRadius: 24,
      spreadRadius: 0,
    ),
  ];

  /// Primary hover shadow (more pronounced)
  static const List<BoxShadow> primaryHover = [
    BoxShadow(
      color: Color(0x4D8B5CF6), // rgba(139, 92, 246, 0.30)
      offset: Offset(0, 10),
      blurRadius: 28,
      spreadRadius: 0,
    ),
  ];

  /// Coral/CTA colored shadow for action buttons
  static const List<BoxShadow> coral = [
    BoxShadow(
      color: Color(0x40FF6B6B), // rgba(255, 107, 107, 0.25)
      offset: Offset(0, 8),
      blurRadius: 24,
      spreadRadius: 0,
    ),
  ];

  /// Coral hover shadow
  static const List<BoxShadow> coralHover = [
    BoxShadow(
      color: Color(0x4DFF6B6B), // rgba(255, 107, 107, 0.30)
      offset: Offset(0, 10),
      blurRadius: 28,
      spreadRadius: 0,
    ),
  ];

  /// Teal colored shadow for Navigator theme
  static const List<BoxShadow> teal = [
    BoxShadow(
      color: Color(0x400891B2), // rgba(8, 145, 178, 0.25)
      offset: Offset(0, 8),
      blurRadius: 24,
      spreadRadius: 0,
    ),
  ];

  /// Teal hover shadow
  static const List<BoxShadow> tealHover = [
    BoxShadow(
      color: Color(0x4D0891B2), // rgba(8, 145, 178, 0.30)
      offset: Offset(0, 10),
      blurRadius: 28,
      spreadRadius: 0,
    ),
  ];

  /// Success (green) colored shadow
  static const List<BoxShadow> success = [
    BoxShadow(
      color: Color(0x4010B981), // rgba(16, 185, 129, 0.25)
      offset: Offset(0, 8),
      blurRadius: 24,
      spreadRadius: 0,
    ),
  ];

  /// Error (red) colored shadow
  static const List<BoxShadow> error = [
    BoxShadow(
      color: Color(0x40EF4444), // rgba(239, 68, 68, 0.25)
      offset: Offset(0, 8),
      blurRadius: 24,
      spreadRadius: 0,
    ),
  ];

  /// Warning (amber) colored shadow
  static const List<BoxShadow> warning = [
    BoxShadow(
      color: Color(0x40F59E0B), // rgba(245, 158, 11, 0.25)
      offset: Offset(0, 8),
      blurRadius: 24,
      spreadRadius: 0,
    ),
  ];

  /// Info (blue) colored shadow
  static const List<BoxShadow> info = [
    BoxShadow(
      color: Color(0x403B82F6), // rgba(59, 130, 246, 0.25)
      offset: Offset(0, 8),
      blurRadius: 24,
      spreadRadius: 0,
    ),
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // INSET SHADOWS (For inputs and pressed states)
  // ════════════════════════════════════════════════════════════════════════════

  /// Inset shadow for pressed/active states
  static const List<BoxShadow> inset = [
    BoxShadow(
      color: Color(0x141A1A2E), // rgba(26, 26, 46, 0.08)
      offset: Offset(0, 2),
      blurRadius: 4,
      spreadRadius: -1,
    ),
  ];

  /// Inset shadow for inputs
  static const List<BoxShadow> insetInput = [
    BoxShadow(
      color: Color(0x0A1A1A2E), // rgba(26, 26, 46, 0.04)
      offset: Offset(0, 1),
      blurRadius: 2,
      spreadRadius: 0,
    ),
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // SPECIAL SHADOWS
  // ════════════════════════════════════════════════════════════════════════════

  /// No shadow
  static const List<BoxShadow> none = [];

  /// Focus ring shadow (for accessibility)
  static List<BoxShadow> focusRing(Color color) => [
        BoxShadow(
          color: color.withValues(alpha: 0.5),
          offset: Offset.zero,
          blurRadius: 0,
          spreadRadius: 3,
        ),
      ];

  /// Glow effect for highlighted elements
  static List<BoxShadow> glow(Color color, {double intensity = 0.4}) => [
        BoxShadow(
          color: color.withValues(alpha: intensity),
          offset: Offset.zero,
          blurRadius: 20,
          spreadRadius: 2,
        ),
      ];

  // ════════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get card shadow for a specific grade band.
  static List<BoxShadow> cardForGradeBand(AivoGradeBand gradeBand,
      {bool isDark = false}) {
    if (isDark) {
      return cardScholarDark;
    }
    return switch (gradeBand) {
      AivoGradeBand.k5 => cardExplorer,
      AivoGradeBand.g6_8 => cardNavigator,
      AivoGradeBand.g9_12 => cardScholar,
    };
  }

  /// Get card hover shadow for a specific grade band.
  static List<BoxShadow> cardHoverForGradeBand(AivoGradeBand gradeBand,
      {bool isDark = false}) {
    if (isDark) {
      return cardScholarDarkHover;
    }
    return switch (gradeBand) {
      AivoGradeBand.k5 => cardExplorerHover,
      AivoGradeBand.g6_8 => cardNavigatorHover,
      AivoGradeBand.g9_12 => cardScholarHover,
    };
  }

  /// Get appropriate shadow based on elevation level.
  static List<BoxShadow> forElevation(int level, {bool isDark = false}) {
    if (isDark) {
      return switch (level) {
        0 => none,
        1 => softDark,
        2 => raisedDark,
        _ => elevatedDark,
      };
    }
    return switch (level) {
      0 => none,
      1 => soft,
      2 => raised,
      _ => elevated,
    };
  }

  /// Get shadow with adjusted opacity for theme.
  static List<BoxShadow> withOpacity(
      List<BoxShadow> shadows, double opacityMultiplier) {
    return shadows.map((shadow) {
      final currentAlpha = shadow.color.a;
      return BoxShadow(
        color: shadow.color.withValues(alpha: currentAlpha * opacityMultiplier),
        offset: shadow.offset,
        blurRadius: shadow.blurRadius,
        spreadRadius: shadow.spreadRadius,
      );
    }).toList();
  }

  /// Lerp between two shadow lists (for animations).
  static List<BoxShadow>? lerp(
      List<BoxShadow>? a, List<BoxShadow>? b, double t) {
    if (a == null && b == null) return null;
    if (a == null) return b;
    if (b == null) return a;

    final length = a.length > b.length ? a.length : b.length;
    final result = <BoxShadow>[];

    for (int i = 0; i < length; i++) {
      final shadowA = i < a.length ? a[i] : const BoxShadow();
      final shadowB = i < b.length ? b[i] : const BoxShadow();
      result.add(BoxShadow.lerp(shadowA, shadowB, t)!);
    }

    return result;
  }

  /// Create animated shadow decoration.
  static BoxDecoration animatedShadowDecoration({
    required List<BoxShadow> shadow,
    Color? color,
    BorderRadius? borderRadius,
    Border? border,
  }) {
    return BoxDecoration(
      color: color,
      borderRadius: borderRadius,
      border: border,
      boxShadow: shadow,
    );
  }
}

/// Shadow theme extension for accessing shadows from context.
class AivoShadowTheme extends ThemeExtension<AivoShadowTheme> {
  const AivoShadowTheme({
    required this.soft,
    required this.raised,
    required this.elevated,
    required this.cardShadow,
    required this.cardShadowHover,
    required this.buttonShadow,
    required this.buttonShadowHover,
  });

  final List<BoxShadow> soft;
  final List<BoxShadow> raised;
  final List<BoxShadow> elevated;
  final List<BoxShadow> cardShadow;
  final List<BoxShadow> cardShadowHover;
  final List<BoxShadow> buttonShadow;
  final List<BoxShadow> buttonShadowHover;

  /// Light mode theme for Explorer grade band.
  static const explorer = AivoShadowTheme(
    soft: AivoShadows.soft,
    raised: AivoShadows.raised,
    elevated: AivoShadows.elevated,
    cardShadow: AivoShadows.cardExplorer,
    cardShadowHover: AivoShadows.cardExplorerHover,
    buttonShadow: AivoShadows.coral,
    buttonShadowHover: AivoShadows.coralHover,
  );

  /// Light mode theme for Navigator grade band.
  static const navigator = AivoShadowTheme(
    soft: AivoShadows.soft,
    raised: AivoShadows.raised,
    elevated: AivoShadows.elevated,
    cardShadow: AivoShadows.cardNavigator,
    cardShadowHover: AivoShadows.cardNavigatorHover,
    buttonShadow: AivoShadows.teal,
    buttonShadowHover: AivoShadows.tealHover,
  );

  /// Light mode theme for Scholar grade band.
  static const scholar = AivoShadowTheme(
    soft: AivoShadows.soft,
    raised: AivoShadows.raised,
    elevated: AivoShadows.elevated,
    cardShadow: AivoShadows.cardScholar,
    cardShadowHover: AivoShadows.cardScholarHover,
    buttonShadow: AivoShadows.soft,
    buttonShadowHover: AivoShadows.raised,
  );

  /// Dark mode theme.
  static const dark = AivoShadowTheme(
    soft: AivoShadows.softDark,
    raised: AivoShadows.raisedDark,
    elevated: AivoShadows.elevatedDark,
    cardShadow: AivoShadows.cardScholarDark,
    cardShadowHover: AivoShadows.cardScholarDarkHover,
    buttonShadow: AivoShadows.softDark,
    buttonShadowHover: AivoShadows.raisedDark,
  );

  /// Get shadow theme for grade band.
  static AivoShadowTheme forGradeBand(AivoGradeBand gradeBand,
      {bool isDark = false}) {
    if (isDark) return dark;
    return switch (gradeBand) {
      AivoGradeBand.k5 => explorer,
      AivoGradeBand.g6_8 => navigator,
      AivoGradeBand.g9_12 => scholar,
    };
  }

  @override
  ThemeExtension<AivoShadowTheme> copyWith({
    List<BoxShadow>? soft,
    List<BoxShadow>? raised,
    List<BoxShadow>? elevated,
    List<BoxShadow>? cardShadow,
    List<BoxShadow>? cardShadowHover,
    List<BoxShadow>? buttonShadow,
    List<BoxShadow>? buttonShadowHover,
  }) {
    return AivoShadowTheme(
      soft: soft ?? this.soft,
      raised: raised ?? this.raised,
      elevated: elevated ?? this.elevated,
      cardShadow: cardShadow ?? this.cardShadow,
      cardShadowHover: cardShadowHover ?? this.cardShadowHover,
      buttonShadow: buttonShadow ?? this.buttonShadow,
      buttonShadowHover: buttonShadowHover ?? this.buttonShadowHover,
    );
  }

  @override
  ThemeExtension<AivoShadowTheme> lerp(
      covariant ThemeExtension<AivoShadowTheme>? other, double t) {
    if (other is! AivoShadowTheme) return this;

    return AivoShadowTheme(
      soft: AivoShadows.lerp(soft, other.soft, t) ?? soft,
      raised: AivoShadows.lerp(raised, other.raised, t) ?? raised,
      elevated: AivoShadows.lerp(elevated, other.elevated, t) ?? elevated,
      cardShadow:
          AivoShadows.lerp(cardShadow, other.cardShadow, t) ?? cardShadow,
      cardShadowHover:
          AivoShadows.lerp(cardShadowHover, other.cardShadowHover, t) ??
              cardShadowHover,
      buttonShadow:
          AivoShadows.lerp(buttonShadow, other.buttonShadow, t) ?? buttonShadow,
      buttonShadowHover:
          AivoShadows.lerp(buttonShadowHover, other.buttonShadowHover, t) ??
              buttonShadowHover,
    );
  }
}

/// Extension to easily access shadow theme from BuildContext.
extension AivoShadowThemeExtension on BuildContext {
  /// Get the current shadow theme.
  AivoShadowTheme? get shadowTheme =>
      Theme.of(this).extension<AivoShadowTheme>();

  /// Get shadow theme or default to scholar.
  AivoShadowTheme get shadows =>
      shadowTheme ?? AivoShadowTheme.scholar;
}
