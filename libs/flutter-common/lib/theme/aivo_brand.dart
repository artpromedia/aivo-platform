import 'package:flutter/material.dart';

// ══════════════════════════════════════════════════════════════════════════════
// AIVO BRAND DESIGN TOKENS
//
// Single source of truth for AIVO brand identity.
// Aligned with: apps/web-marketing/tailwind.config.cjs
//
// USAGE:
//   - Primary brand color: AivoBrand.primary
//   - CTA actions: AivoBrand.coral
//   - Success states: AivoBrand.mint
//   - Theme extension: Theme.of(context).extension<AivoColors>()
// ══════════════════════════════════════════════════════════════════════════════

/// AIVO brand design tokens - the single source of truth.
///
/// These values are synced with the marketing website's Tailwind configuration.
abstract class AivoBrand {
  AivoBrand._();

  // ════════════════════════════════════════════════════════════════════════════
  // PRIMARY BRAND COLOR (Violet/Purple)
  // Tailwind: theme-primary
  // Usage: Primary buttons, links, selected states, brand identity
  // ════════════════════════════════════════════════════════════════════════════

  static const MaterialColor primary = MaterialColor(0xFF8B5CF6, <int, Color>{
    50: Color(0xFFF5F3FF),
    100: Color(0xFFEDE9FE),
    200: Color(0xFFDDD6FE),
    300: Color(0xFFC4B5FD),
    400: Color(0xFFA78BFA),
    500: Color(0xFF8B5CF6), // DEFAULT
    600: Color(0xFF7C3AED),
    700: Color(0xFF6D28D9),
    800: Color(0xFF5B21B6),
    900: Color(0xFF4C1D95),
    950: Color(0xFF2E1065),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CTA COLOR (Coral)
  // Tailwind: coral
  // Usage: Call-to-action buttons, highlights, urgent actions
  // ════════════════════════════════════════════════════════════════════════════

  static const MaterialColor coral = MaterialColor(0xFFFF6B6B, <int, Color>{
    50: Color(0xFFFFF5F5),
    100: Color(0xFFFFE3E3),
    200: Color(0xFFFFC9C9),
    300: Color(0xFFFFA8A8),
    400: Color(0xFFFF8787),
    500: Color(0xFFFF6B6B), // DEFAULT
    600: Color(0xFFFA5252),
    700: Color(0xFFF03E3E),
    800: Color(0xFFE03131),
    900: Color(0xFFC92A2A),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ACCENT COLOR (Salmon)
  // Tailwind: salmon
  // Usage: Secondary highlights, decorative elements
  // ════════════════════════════════════════════════════════════════════════════

  static const MaterialColor salmon = MaterialColor(0xFFFA8072, <int, Color>{
    50: Color(0xFFFFF5F3),
    100: Color(0xFFFFE8E4),
    200: Color(0xFFFFD4CC),
    300: Color(0xFFFFB8AA),
    400: Color(0xFFFF9A88),
    500: Color(0xFFFA8072), // DEFAULT
    600: Color(0xFFF56565),
    700: Color(0xFFE53E3E),
    800: Color(0xFFC53030),
    900: Color(0xFF9B2C2C),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SUCCESS COLOR (Mint)
  // Tailwind: mint
  // Usage: Success states, confirmations, positive feedback
  // ════════════════════════════════════════════════════════════════════════════

  static const MaterialColor mint = MaterialColor(0xFF10B981, <int, Color>{
    50: Color(0xFFECFDF5),
    100: Color(0xFFD1FAE5),
    200: Color(0xFFA7F3D0),
    300: Color(0xFF6EE7B7),
    400: Color(0xFF34D399),
    500: Color(0xFF10B981), // DEFAULT
    600: Color(0xFF059669),
    700: Color(0xFF047857),
    800: Color(0xFF065F46),
    900: Color(0xFF064E3B),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // WARNING COLOR (Sunshine)
  // Tailwind: sunshine
  // Usage: Warnings, attention, caution states
  // ════════════════════════════════════════════════════════════════════════════

  static const MaterialColor sunshine = MaterialColor(0xFFFBBF24, <int, Color>{
    50: Color(0xFFFFFBEB),
    100: Color(0xFFFEF3C7),
    200: Color(0xFFFDE68A),
    300: Color(0xFFFCD34D),
    400: Color(0xFFFBBF24), // DEFAULT
    500: Color(0xFFF59E0B),
    600: Color(0xFFD97706),
    700: Color(0xFFB45309),
    800: Color(0xFF92400E),
    900: Color(0xFF78350F),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // INFO COLOR (Sky)
  // Tailwind: sky
  // Usage: Informational, help, neutral highlights
  // ════════════════════════════════════════════════════════════════════════════

  static const MaterialColor sky = MaterialColor(0xFF0EA5E9, <int, Color>{
    50: Color(0xFFF0F9FF),
    100: Color(0xFFE0F2FE),
    200: Color(0xFFBAE6FD),
    300: Color(0xFF7DD3FC),
    400: Color(0xFF38BDF8),
    500: Color(0xFF0EA5E9), // DEFAULT
    600: Color(0xFF0284C7),
    700: Color(0xFF0369A1),
    800: Color(0xFF075985),
    900: Color(0xFF0C4A6E),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ERROR COLOR (Red)
  // Tailwind: red
  // Usage: Errors, destructive actions, critical alerts
  // ════════════════════════════════════════════════════════════════════════════

  static const MaterialColor error = MaterialColor(0xFFEF4444, <int, Color>{
    50: Color(0xFFFEF2F2),
    100: Color(0xFFFEE2E2),
    200: Color(0xFFFECACA),
    300: Color(0xFFFCA5A5),
    400: Color(0xFFF87171),
    500: Color(0xFFEF4444), // DEFAULT
    600: Color(0xFFDC2626),
    700: Color(0xFFB91C1C),
    800: Color(0xFF991B1B),
    900: Color(0xFF7F1D1D),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // NEUTRAL GRAYS
  // Tailwind: zinc / aivo-gray
  // Usage: Text, backgrounds, borders
  // ════════════════════════════════════════════════════════════════════════════

  static const MaterialColor gray = MaterialColor(0xFF71717A, <int, Color>{
    50: Color(0xFFFAFAFA),
    100: Color(0xFFF4F4F5),
    200: Color(0xFFE4E4E7),
    300: Color(0xFFD4D4D8),
    400: Color(0xFFA1A1AA),
    500: Color(0xFF71717A), // DEFAULT
    600: Color(0xFF52525B),
    700: Color(0xFF3F3F46),
    800: Color(0xFF27272A),
    900: Color(0xFF18181B),
    950: Color(0xFF09090B),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SEMANTIC ALIASES
  // ════════════════════════════════════════════════════════════════════════════

  static const Color success = Color(0xFF10B981); // mint.500
  static const Color warning = Color(0xFFFBBF24); // sunshine.400
  static const Color info = Color(0xFF0EA5E9); // sky.500
  static const Color danger = Color(0xFFEF4444); // error.500

  // ════════════════════════════════════════════════════════════════════════════
  // SURFACE & BACKGROUND COLORS
  // ════════════════════════════════════════════════════════════════════════════

  static const Color background = Color(0xFFFFFFFF);
  static const Color backgroundAlt = Color(0xFFFAFAFA); // gray.50
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceMuted = Color(0xFFF4F4F5); // gray.100
  static const Color surfaceElevated = Color(0xFFFFFFFF);
  static const Color surfacePrimaryTint = Color(0xFFF5F3FF); // primary.50

  // ════════════════════════════════════════════════════════════════════════════
  // TEXT COLORS
  // ════════════════════════════════════════════════════════════════════════════

  static const Color textPrimary = Color(0xFF18181B); // gray.900
  static const Color textSecondary = Color(0xFF52525B); // gray.600
  static const Color textMuted = Color(0xFF71717A); // gray.500
  static const Color textDisabled = Color(0xFFA1A1AA); // gray.400
  static const Color textInverse = Color(0xFFFFFFFF);
  static const Color textLink = Color(0xFF8B5CF6); // primary.500

  // ════════════════════════════════════════════════════════════════════════════
  // BORDER & DIVIDER COLORS
  // ════════════════════════════════════════════════════════════════════════════

  static const Color border = Color(0xFFE4E4E7); // gray.200
  static const Color borderLight = Color(0xFFF4F4F5); // gray.100
  static const Color borderFocused = Color(0xFF8B5CF6); // primary.500
  static const Color divider = Color(0xFFE4E4E7); // gray.200

  // ════════════════════════════════════════════════════════════════════════════
  // GRADIENT DEFINITIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Primary brand gradient
  static const LinearGradient gradientPrimary = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
  );

  /// CTA gradient (coral to primary)
  static const LinearGradient gradientCta = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF6B6B), Color(0xFFFA8072), Color(0xFF8B5CF6)],
  );

  /// Coral gradient
  static const LinearGradient gradientCoral = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF6B6B), Color(0xFFFA5252)],
  );

  /// Success gradient
  static const LinearGradient gradientSuccess = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF10B981), Color(0xFF059669)],
  );

  /// Hero background gradient
  static const LinearGradient gradientHero = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFF5F3FF), Color(0xFFFFFFFF)],
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SPACING SCALE
  // ════════════════════════════════════════════════════════════════════════════

  static const double space0 = 0;
  static const double space1 = 4;
  static const double space2 = 8;
  static const double space3 = 12;
  static const double space4 = 16;
  static const double space5 = 20;
  static const double space6 = 24;
  static const double space8 = 32;
  static const double space10 = 40;
  static const double space12 = 48;
  static const double space16 = 64;
  static const double space20 = 80;
  static const double space24 = 96;

  // ════════════════════════════════════════════════════════════════════════════
  // BORDER RADIUS SCALE
  // ════════════════════════════════════════════════════════════════════════════

  static const double radiusNone = 0;
  static const double radiusSm = 8;
  static const double radius = 12; // Default - matches marketing
  static const double radiusMd = 16;
  static const double radiusLg = 20;
  static const double radiusXl = 24;
  static const double radius2Xl = 32;
  static const double radiusFull = 9999;

  static const BorderRadius borderRadiusSm =
      BorderRadius.all(Radius.circular(8));
  static const BorderRadius borderRadius =
      BorderRadius.all(Radius.circular(12));
  static const BorderRadius borderRadiusMd =
      BorderRadius.all(Radius.circular(16));
  static const BorderRadius borderRadiusLg =
      BorderRadius.all(Radius.circular(20));
  static const BorderRadius borderRadiusXl =
      BorderRadius.all(Radius.circular(24));
  static const BorderRadius borderRadius2Xl =
      BorderRadius.all(Radius.circular(32));

  // ════════════════════════════════════════════════════════════════════════════
  // SHADOWS / ELEVATION
  // ════════════════════════════════════════════════════════════════════════════

  static const List<BoxShadow> shadowSm = [
    BoxShadow(
      color: Color(0x0D000000),
      blurRadius: 3,
      offset: Offset(0, 1),
    ),
  ];

  static const List<BoxShadow> shadow = [
    BoxShadow(
      color: Color(0x14000000),
      blurRadius: 8,
      offset: Offset(0, 2),
    ),
  ];

  static const List<BoxShadow> shadowMd = [
    BoxShadow(
      color: Color(0x1A000000),
      blurRadius: 12,
      offset: Offset(0, 4),
    ),
  ];

  static const List<BoxShadow> shadowLg = [
    BoxShadow(
      color: Color(0x1F000000),
      blurRadius: 24,
      offset: Offset(0, 8),
    ),
  ];

  static const List<BoxShadow> shadowXl = [
    BoxShadow(
      color: Color(0x29000000),
      blurRadius: 48,
      offset: Offset(0, 16),
    ),
  ];

  /// Primary colored shadow for elevated primary buttons
  static const List<BoxShadow> shadowPrimary = [
    BoxShadow(
      color: Color(0x408B5CF6),
      blurRadius: 24,
      offset: Offset(0, 8),
    ),
  ];

  /// Coral colored shadow for CTA buttons
  static const List<BoxShadow> shadowCoral = [
    BoxShadow(
      color: Color(0x40FF6B6B),
      blurRadius: 24,
      offset: Offset(0, 8),
    ),
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // TYPOGRAPHY SCALE
  // ════════════════════════════════════════════════════════════════════════════

  static const double fontSizeXs = 12;
  static const double fontSizeSm = 14;
  static const double fontSizeBase = 16;
  static const double fontSizeLg = 18;
  static const double fontSizeXl = 20;
  static const double fontSize2Xl = 24;
  static const double fontSize3Xl = 30;
  static const double fontSize4Xl = 36;
  static const double fontSize5Xl = 48;

  static const FontWeight fontWeightNormal = FontWeight.w400;
  static const FontWeight fontWeightMedium = FontWeight.w500;
  static const FontWeight fontWeightSemibold = FontWeight.w600;
  static const FontWeight fontWeightBold = FontWeight.w700;

  static const double lineHeightTight = 1.25;
  static const double lineHeightNormal = 1.5;
  static const double lineHeightRelaxed = 1.625;
  static const double lineHeightLoose = 2.0;

  // ════════════════════════════════════════════════════════════════════════════
  // ANIMATION DURATIONS
  // ════════════════════════════════════════════════════════════════════════════

  static const Duration durationFast = Duration(milliseconds: 150);
  static const Duration durationNormal = Duration(milliseconds: 300);
  static const Duration durationSlow = Duration(milliseconds: 500);

  static const Curve curveDefault = Curves.easeInOut;
  static const Curve curveEmphasized = Curves.easeOutCubic;
  static const Curve curveSpring = Curves.elasticOut;

  // ════════════════════════════════════════════════════════════════════════════
  // BREAKPOINTS (for responsive layouts)
  // ════════════════════════════════════════════════════════════════════════════

  static const double breakpointSm = 640;
  static const double breakpointMd = 768;
  static const double breakpointLg = 1024;
  static const double breakpointXl = 1280;
  static const double breakpoint2Xl = 1536;

  // ════════════════════════════════════════════════════════════════════════════
  // ICON SIZES
  // ════════════════════════════════════════════════════════════════════════════

  static const double iconSizeXs = 12;
  static const double iconSizeSm = 16;
  static const double iconSize = 20;
  static const double iconSizeMd = 24;
  static const double iconSizeLg = 32;
  static const double iconSizeXl = 48;

  // ════════════════════════════════════════════════════════════════════════════
  // AVATAR COLOR PALETTE
  // Used for user avatars, learner profiles, and roster displays
  // ════════════════════════════════════════════════════════════════════════════

  /// Avatar colors for consistent user identification.
  /// Use with index % avatarColors.length for consistent assignment.
  static const List<Color> avatarColors = [
    Color(0xFF10B981), // Mint (success)
    Color(0xFF0EA5E9), // Sky (info)
    Color(0xFFFBBF24), // Sunshine (warning)
    Color(0xFF8B5CF6), // Primary (violet)
    Color(0xFFFF6B6B), // Coral (CTA)
    Color(0xFF38BDF8), // Sky-400 (light blue)
    Color(0xFFFA5252), // Coral-600 (deep coral)
    Color(0xFF71717A), // Gray-500 (neutral)
  ];

  /// Get avatar color by index (wraps around).
  static Color avatarColor(int index) =>
      avatarColors[index % avatarColors.length];

  // ════════════════════════════════════════════════════════════════════════════
  // SUBJECT/CATEGORY COLORS
  // Used for academic subjects, categories, and data visualization
  // ════════════════════════════════════════════════════════════════════════════

  /// Subject colors for academic categories.
  static const Map<String, Color> subjectColors = {
    'MATH': Color(0xFF8B5CF6), // Primary violet
    'ELA': Color(0xFF6D28D9), // Primary-700
    'SCIENCE': Color(0xFF10B981), // Mint
    'SOCIAL': Color(0xFF0EA5E9), // Sky
    'ART': Color(0xFFFF6B6B), // Coral
    'MUSIC': Color(0xFFFBBF24), // Sunshine
    'PE': Color(0xFF34D399), // Mint-400
    'DEFAULT': Color(0xFF71717A), // Gray-500
  };

  /// Get subject color by code (case-insensitive, falls back to DEFAULT).
  static Color subjectColor(String code) =>
      subjectColors[code.toUpperCase()] ?? subjectColors['DEFAULT']!;

  // ════════════════════════════════════════════════════════════════════════════
  // SESSION PHASE COLORS
  // Used for predictability/session structure indicators
  // ════════════════════════════════════════════════════════════════════════════

  /// Session phase colors for predictability features.
  static const Map<String, Color> sessionPhaseColors = {
    'welcome': Color(0xFF10B981), // Mint - welcoming
    'checkin': Color(0xFF0EA5E9), // Sky - calm check-in
    'main': Color(0xFF8B5CF6), // Primary - focused work
    'break': Color(0xFF34D399), // Mint-400 - refreshing break
    'goodbye': Color(0xFFFBBF24), // Sunshine - positive ending
  };

  /// Get session phase color by phase name.
  static Color sessionPhaseColor(String phase) =>
      sessionPhaseColors[phase.toLowerCase()] ?? primary[500]!;

  // ════════════════════════════════════════════════════════════════════════════
  // ANXIETY/EMOTIONAL STATE COLORS
  // Used for emotional support and anxiety indicators
  // ════════════════════════════════════════════════════════════════════════════

  /// Anxiety level colors (1=high stress, 5=calm).
  static const List<Color> anxietyColors = [
    Color(0xFFEF4444), // Level 1: High - Error red
    Color(0xFFF97316), // Level 2: Elevated - Orange
    Color(0xFFFBBF24), // Level 3: Moderate - Sunshine
    Color(0xFF34D399), // Level 4: Low - Mint-400
    Color(0xFF10B981), // Level 5: Calm - Mint
  ];

  /// Get anxiety color by level (1-5, clamped).
  static Color anxietyColor(int level) =>
      anxietyColors[(level.clamp(1, 5) - 1)];

  /// Calming intervention colors.
  static const calmingBlue = Color(0xFF0EA5E9); // Sky
  static const calmingGreen = Color(0xFF10B981); // Mint
  static const calmingPurple = Color(0xFF8B5CF6); // Primary
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXTENSIONS
// ══════════════════════════════════════════════════════════════════════════════

extension AivoBrandColorExtensions on Color {
  /// Get a lighter shade of this color
  Color get light => Color.lerp(this, Colors.white, 0.3)!;

  /// Get a darker shade of this color
  Color get dark => Color.lerp(this, Colors.black, 0.2)!;

  /// Get this color with reduced opacity for containers
  Color get container => withOpacity(0.1);

  /// Get this color with medium opacity for hover states
  Color get hover => withOpacity(0.08);
}

extension AivoBrandSpacingExtensions on num {
  /// Convert to SizedBox with this height
  SizedBox get verticalSpace => SizedBox(height: toDouble());

  /// Convert to SizedBox with this width
  SizedBox get horizontalSpace => SizedBox(width: toDouble());

  /// Convert to EdgeInsets.all
  EdgeInsets get allPadding => EdgeInsets.all(toDouble());

  /// Convert to EdgeInsets.symmetric horizontal
  EdgeInsets get horizontalPadding =>
      EdgeInsets.symmetric(horizontal: toDouble());

  /// Convert to EdgeInsets.symmetric vertical
  EdgeInsets get verticalPadding => EdgeInsets.symmetric(vertical: toDouble());
}
