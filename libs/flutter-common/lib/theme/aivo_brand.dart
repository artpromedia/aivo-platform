import 'package:flutter/material.dart';

// ══════════════════════════════════════════════════════════════════════════════
// AIVO BRAND DESIGN TOKENS
//
// Single source of truth for AIVO brand identity.
// Brand: AIVO - "Unlocking Every Learner's Potential"
// Primary Font: Nunito (Google Fonts)
// Primary Color: Purple #7C3AED
//
// USAGE:
//   - Primary brand color: AivoBrand.primary
//   - Functional colors: AivoBrand.success, AivoBrand.error
//   - Theme extension: Theme.of(context).extension<AivoColors>()
// ══════════════════════════════════════════════════════════════════════════════

/// AIVO brand design tokens - the single source of truth.
///
/// These values define the AIVO design system across all platforms.
abstract class AivoBrand {
  AivoBrand._();

  // ════════════════════════════════════════════════════════════════════════════
  // BRAND IDENTITY
  // ════════════════════════════════════════════════════════════════════════════

  static const String brandName = 'AIVO';
  static const String brandTagline = "Unlocking Every Learner's Potential";
  static const String brandFont = 'Nunito';
  static const String brandFontDyslexia = 'Atkinson Hyperlegible';

  // ════════════════════════════════════════════════════════════════════════════
  // PRIMARY BRAND COLOR (Purple)
  // Core brand color - used for primary actions, links, brand identity
  // Explorer theme primary color
  // ════════════════════════════════════════════════════════════════════════════

  static const MaterialColor primary = MaterialColor(0xFF7C3AED, <int, Color>{
    50: Color(0xFFF5F3FF),
    100: Color(0xFFEDE9FE),
    200: Color(0xFFDDD6FE),
    300: Color(0xFFC4B5FD),
    400: Color(0xFFA78BFA),
    500: Color(0xFF8B5CF6),
    600: Color(0xFF7C3AED), // DEFAULT - Brand Purple
    700: Color(0xFF6D28D9),
    800: Color(0xFF5B21B6),
    900: Color(0xFF4C1D95),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // TEAL COLOR (Navigator Theme Primary)
  // Middle school (6-8) theme primary
  // ════════════════════════════════════════════════════════════════════════════

  static const MaterialColor teal = MaterialColor(0xFF0891B2, <int, Color>{
    50: Color(0xFFECFEFF),
    100: Color(0xFFCFFAFE),
    200: Color(0xFFA5F3FC),
    300: Color(0xFF67E8F9),
    400: Color(0xFF22D3EE),
    500: Color(0xFF06B6D4),
    600: Color(0xFF0891B2), // DEFAULT - Navigator Teal
    700: Color(0xFF0E7490),
    800: Color(0xFF155E75),
    900: Color(0xFF164E63),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // NAVY COLOR (Scholar Theme Primary)
  // High school (9-12) theme primary
  // ════════════════════════════════════════════════════════════════════════════

  static const MaterialColor navy = MaterialColor(0xFF1A1A2E, <int, Color>{
    50: Color(0xFFE8E8ED),
    100: Color(0xFFD1D1DB),
    200: Color(0xFFA3A3B7),
    300: Color(0xFF757593),
    400: Color(0xFF47476F),
    500: Color(0xFF2D2D47),
    600: Color(0xFF1A1A2E), // DEFAULT - Scholar Navy
    700: Color(0xFF15152A),
    800: Color(0xFF101026),
    900: Color(0xFF0B0B22),
  });

  // ════════════════════════════════════════════════════════════════════════════
  // LEGACY: CTA COLOR (Coral) - kept for backwards compatibility
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

  static const Color success = Color(0xFF10B981); // mint.500 - matches web
  static const Color progress = Color(0xFFF59E0B); // progress - matches web
  static const Color focus = Color(0xFF3B82F6); // focus - matches web
  static const Color warning = Color(0xFFF59E0B); // amber.500 - matches web
  static const Color info = Color(0xFF3B82F6); // blue.500 - matches web
  static const Color danger = Color(0xFFEF4444); // error.500 - matches web

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
  // GRADE THEME COLORS (Matches web gradeThemes)
  // ════════════════════════════════════════════════════════════════════════════

  // Explorer (Pre-K–5)
  static const Color explorerPrimary = Color(0xFF7C3AED);
  static const Color explorerPrimaryHover = Color(0xFF6D28D9);
  static const Color explorerSecondary = Color(0xFFA78BFA);
  static const Color explorerAccent = Color(0xFFF59E0B);
  static const Color explorerBackground = Color(0xFFFAFBFF);
  static const Color explorerSurface = Color(0xFFFFFFFF);
  static const Color explorerSurfaceMuted = Color(0xFFF5F3FF);
  static const Color explorerSurfaceElevated = Color(0xFFFFFFFF);
  static const Color explorerInfo = Color(0xFF3B82F6);
  static const Color explorerSuccess = Color(0xFF10B981);
  static const Color explorerWarning = Color(0xFFF59E0B);
  static const Color explorerError = Color(0xFFEF4444);
  static const Color explorerBorder = Color(0xFFDDD6FE);
  static const Color explorerBorderMuted = Color(0xFFEDE9FE);
  static const Color explorerFocus = Color(0xFF3B82F6);
  static const Color explorerFocusRing = Color(0x803B82F6); // rgba(59,130,246,0.5)
  static const Color explorerBackdrop = Color(0x801A1A2E); // rgba(26,26,46,0.5)
  static const Color explorerTextPrimary = Color(0xFF1A1A2E);
  static const Color explorerTextSecondary = Color(0xFF52525B);
  static const Color explorerTextMuted = Color(0xFF71717A);
  static const Color explorerTextOnPrimary = Color(0xFFFFFFFF);
  static const Color explorerTextOnAccent = Color(0xFF1A1A2E);

  // Navigator (6-8)
  static const Color navigatorPrimary = Color(0xFF0891B2);
  static const Color navigatorPrimaryHover = Color(0xFF0E7490);
  static const Color navigatorSecondary = Color(0xFF22D3EE);
  static const Color navigatorAccent = Color(0xFF10B981);
  static const Color navigatorBackground = Color(0xFFF8FAFB);
  static const Color navigatorSurface = Color(0xFFFFFFFF);
  static const Color navigatorSurfaceMuted = Color(0xFFECFEFF);
  static const Color navigatorSurfaceElevated = Color(0xFFFFFFFF);
  static const Color navigatorInfo = Color(0xFF3B82F6);
  static const Color navigatorSuccess = Color(0xFF10B981);
  static const Color navigatorWarning = Color(0xFFF59E0B);
  static const Color navigatorError = Color(0xFFEF4444);
  static const Color navigatorBorder = Color(0xFFA5F3FC);
  static const Color navigatorBorderMuted = Color(0xFFCFFAFE);
  static const Color navigatorFocus = Color(0xFF3B82F6);
  static const Color navigatorFocusRing = Color(0x803B82F6); // rgba(59,130,246,0.5)
  static const Color navigatorBackdrop = Color(0x731A1A2E); // rgba(26,26,46,0.45)
  static const Color navigatorTextPrimary = Color(0xFF1A1A2E);
  static const Color navigatorTextSecondary = Color(0xFF52525B);
  static const Color navigatorTextMuted = Color(0xFF71717A);
  static const Color navigatorTextOnPrimary = Color(0xFFFFFFFF);
  static const Color navigatorTextOnAccent = Color(0xFFFFFFFF);

  // Scholar (9-12)
  static const Color scholarPrimary = Color(0xFF1A1A2E);
  static const Color scholarPrimaryHover = Color(0xFF2D2D47);
  static const Color scholarSecondary = Color(0xFF47476F);
  static const Color scholarAccent = Color(0xFF7C3AED);
  static const Color scholarBackground = Color(0xFFFAFAFA);
  static const Color scholarSurface = Color(0xFFFFFFFF);
  static const Color scholarSurfaceMuted = Color(0xFFF4F4F5);
  static const Color scholarSurfaceElevated = Color(0xFFFFFFFF);
  static const Color scholarInfo = Color(0xFF3B82F6);
  static const Color scholarSuccess = Color(0xFF10B981);
  static const Color scholarWarning = Color(0xFFF59E0B);
  static const Color scholarError = Color(0xFFEF4444);
  static const Color scholarBorder = Color(0xFFE4E4E7);
  static const Color scholarBorderMuted = Color(0xFFF4F4F5);
  static const Color scholarFocus = Color(0xFF3B82F6);
  static const Color scholarFocusRing = Color(0x803B82F6); // rgba(59,130,246,0.5)
  static const Color scholarBackdrop = Color(0x661A1A2E); // rgba(26,26,46,0.4)
  static const Color scholarTextPrimary = Color(0xFF1A1A2E);
  static const Color scholarTextSecondary = Color(0xFF52525B);
  static const Color scholarTextMuted = Color(0xFF71717A);
  static const Color scholarTextOnPrimary = Color(0xFFFFFFFF);
  static const Color scholarTextOnAccent = Color(0xFFFFFFFF);

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
  // SPACING SCALE (Matches web tokens.json exactly)
  // ════════════════════════════════════════════════════════════════════════════

  static const double space0 = 0;   // space-0
  static const double space1 = 4;   // space-1
  static const double space2 = 8;   // space-2
  static const double space3 = 12;  // space-3
  static const double space4 = 16;  // space-4
  static const double space5 = 20;  // space-5
  static const double space6 = 24;  // space-6
  static const double space7 = 32;  // space-7
  static const double space8 = 40;  // space-8
  static const double space9 = 48;  // space-9
  static const double space10 = 56; // space-10

  // ════════════════════════════════════════════════════════════════════════════
  // BORDER RADIUS SCALE (Matches web base.radius tokens)
  // ════════════════════════════════════════════════════════════════════════════

  static const double radiusNone = 0;
  static const double radiusXs = 4;   // radius-xs
  static const double radiusSm = 8;   // radius-sm
  static const double radiusMd = 12;  // radius-md
  static const double radiusLg = 16;  // radius-lg
  static const double radiusXl = 20;  // radius-xl
  static const double radiusPill = 999; // radius-pill
  static const double radius = 12; // Default
  static const double radiusFull = 9999; // Full circle (legacy)

  // Grade-specific border radius (matches web gradeThemes)
  // Explorer (Pre-K–5): Playful, rounded
  static const double radiusExplorerButton = 20;
  static const double radiusExplorerCard = 20;
  static const double radiusExplorerInput = 12;
  static const double radiusExplorerModal = 24;

  // Navigator (6-8): Balanced
  static const double radiusNavigatorButton = 12;
  static const double radiusNavigatorCard = 12;
  static const double radiusNavigatorInput = 8;
  static const double radiusNavigatorModal = 16;

  // Scholar (9-12): Professional, subtle
  static const double radiusScholarButton = 8;
  static const double radiusScholarCard = 8;
  static const double radiusScholarInput = 6;
  static const double radiusScholarModal = 12;

  static const BorderRadius borderRadiusXs =
      BorderRadius.all(Radius.circular(4));
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

  // ════════════════════════════════════════════════════════════════════════════
  // TOUCH TARGETS (Matches web gradeThemes.touchTarget.min)
  // ════════════════════════════════════════════════════════════════════════════

  /// Minimum touch target for accessibility (base - Scholar)
  static const double touchTargetMin = 44;

  /// Explorer (Pre-K–5): Larger for developing motor skills
  static const double touchTargetExplorer = 56;

  /// Navigator (6-8): Moderate size
  static const double touchTargetNavigator = 48;

  /// Scholar (9-12): Standard size
  static const double touchTargetScholar = 44;

  // ════════════════════════════════════════════════════════════════════════════
  // SHADOWS / ELEVATION (Matches web tokens.json exactly)
  // Uses navy-based shadow color: rgba(26, 26, 46, opacity)
  // Navy hex: #1A1A2E
  // ════════════════════════════════════════════════════════════════════════════

  /// Shadow soft - web: rgba(26, 26, 46, 0.08), y: 4, blur: 16
  static const List<BoxShadow> shadowSoft = [
    BoxShadow(
      color: Color(0x141A1A2E), // rgba(26, 26, 46, 0.08)
      blurRadius: 16,
      offset: Offset(0, 4),
    ),
  ];

  /// Shadow raised - web: rgba(26, 26, 46, 0.12), y: 8, blur: 24
  static const List<BoxShadow> shadowRaised = [
    BoxShadow(
      color: Color(0x1F1A1A2E), // rgba(26, 26, 46, 0.12)
      blurRadius: 24,
      offset: Offset(0, 8),
    ),
  ];

  /// Shadow elevated - web: rgba(26, 26, 46, 0.16), y: 12, blur: 32
  static const List<BoxShadow> shadowElevated = [
    BoxShadow(
      color: Color(0x291A1A2E), // rgba(26, 26, 46, 0.16)
      blurRadius: 32,
      offset: Offset(0, 12),
    ),
  ];

  // Legacy shadow aliases (kept for backwards compatibility)
  static const List<BoxShadow> shadowSm = [
    BoxShadow(
      color: Color(0x141A1A2E),
      blurRadius: 3,
      offset: Offset(0, 1),
    ),
  ];

  static const List<BoxShadow> shadow = shadowSoft;

  static const List<BoxShadow> shadowMd = shadowRaised;

  static const List<BoxShadow> shadowLg = [
    BoxShadow(
      color: Color(0x1F1A1A2E),
      blurRadius: 24,
      offset: Offset(0, 8),
    ),
  ];

  static const List<BoxShadow> shadowXl = shadowElevated;

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
  // TYPOGRAPHY SCALE (Matches web tokens.json exactly)
  // ════════════════════════════════════════════════════════════════════════════

  // Base font sizes (Tailwind-style scale)
  static const double fontSizeXs = 12;
  static const double fontSizeSm = 14;
  static const double fontSizeBase = 16;
  static const double fontSizeLg = 18;
  static const double fontSizeXl = 20;
  static const double fontSize2Xl = 24;
  static const double fontSize3Xl = 30;
  static const double fontSize4Xl = 36;
  static const double fontSize5Xl = 48;

  // Font weights matching web tokens brand.font.weight
  static const FontWeight fontWeightRegular = FontWeight.w400;
  static const FontWeight fontWeightMedium = FontWeight.w500;
  static const FontWeight fontWeightSemibold = FontWeight.w600;
  static const FontWeight fontWeightBold = FontWeight.w700;
  static const FontWeight fontWeightHeading = FontWeight.w800;

  // Legacy alias for backwards compatibility
  static const FontWeight fontWeightNormal = fontWeightRegular;

  // Line height multipliers
  static const double lineHeightTight = 1.25;
  static const double lineHeightNormal = 1.5;
  static const double lineHeightRelaxed = 1.625;
  static const double lineHeightLoose = 2.0;

  // ════════════════════════════════════════════════════════════════════════════
  // GRADE-BAND TYPOGRAPHY (Matches web gradeThemes exactly)
  // ════════════════════════════════════════════════════════════════════════════

  // Explorer (Pre-K–5) Typography - web: gradeThemes.explorer.fontSize/lineHeight
  static const double explorerDisplaySize = 42;
  static const double explorerDisplayLineHeight = 52;
  static const double explorerHeadlineSize = 34;
  static const double explorerHeadlineLineHeight = 42;
  static const double explorerTitleSize = 26;
  static const double explorerTitleLineHeight = 34;
  static const double explorerBodySize = 18;
  static const double explorerBodyLineHeight = 28;
  static const double explorerLabelSize = 16;
  static const double explorerLabelLineHeight = 24;
  static const double explorerCaptionSize = 14;
  static const double explorerCaptionLineHeight = 20;

  // Navigator (6-8) Typography - web: gradeThemes.navigator.fontSize/lineHeight
  static const double navigatorDisplaySize = 36;
  static const double navigatorDisplayLineHeight = 44;
  static const double navigatorHeadlineSize = 28;
  static const double navigatorHeadlineLineHeight = 36;
  static const double navigatorTitleSize = 22;
  static const double navigatorTitleLineHeight = 30;
  static const double navigatorBodySize = 16;
  static const double navigatorBodyLineHeight = 24;
  static const double navigatorLabelSize = 14;
  static const double navigatorLabelLineHeight = 20;
  static const double navigatorCaptionSize = 12;
  static const double navigatorCaptionLineHeight = 18;

  // Scholar (9-12) Typography - web: gradeThemes.scholar.fontSize/lineHeight
  static const double scholarDisplaySize = 32;
  static const double scholarDisplayLineHeight = 40;
  static const double scholarHeadlineSize = 24;
  static const double scholarHeadlineLineHeight = 32;
  static const double scholarTitleSize = 20;
  static const double scholarTitleLineHeight = 28;
  static const double scholarBodySize = 15;
  static const double scholarBodyLineHeight = 24;
  static const double scholarLabelSize = 13;
  static const double scholarLabelLineHeight = 18;
  static const double scholarCaptionSize = 11;
  static const double scholarCaptionLineHeight = 16;

  // ════════════════════════════════════════════════════════════════════════════
  // ACCESSIBILITY TYPOGRAPHY SETTINGS
  // ════════════════════════════════════════════════════════════════════════════

  /// Large text mode scale multiplier (1.2x)
  static const double largeTextScaleFactor = 1.2;

  /// Dyslexia-friendly letter spacing in em (0.05em)
  static const double dyslexiaLetterSpacingEm = 0.05;

  /// Dyslexia-friendly word spacing in em (0.1em)
  static const double dyslexiaWordSpacingEm = 0.1;

  /// Primary font family
  static const String fontFamilyDefault = 'Nunito';

  /// Dyslexia-friendly font family
  static const String fontFamilyDyslexia = 'Atkinson Hyperlegible';

  // ════════════════════════════════════════════════════════════════════════════
  // ANIMATION DURATIONS (Matches web tokens.json exactly)
  // ════════════════════════════════════════════════════════════════════════════

  /// Fast animation - web: 150ms
  static const Duration durationFast = Duration(milliseconds: 150);
  
  /// Base animation - web: 250ms (NOTE: was 300ms, synced to web)
  static const Duration durationBase = Duration(milliseconds: 250);
  
  /// Slow animation - web: 400ms (NOTE: was 500ms, synced to web)
  static const Duration durationSlow = Duration(milliseconds: 400);
  
  /// Reduced motion durations - web: fast=0, base=0, slow=150
  static const Duration durationReducedFast = Duration.zero;
  static const Duration durationReducedBase = Duration.zero;
  static const Duration durationReducedSlow = Duration(milliseconds: 150);
  
  /// Legacy alias for durationBase
  static const Duration durationNormal = durationBase;

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
