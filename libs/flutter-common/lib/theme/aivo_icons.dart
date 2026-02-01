/// Aivo Icon System
///
/// Consistent icon usage across mobile apps matching web Lucide icons.
/// Provides sizing standards, color variants, and semantic icon wrapper.
library;

import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import 'aivo_brand.dart';
import 'aivo_theme.dart';

// Re-export LucideIcons for convenience
export 'package:lucide_icons/lucide_icons.dart';

// ══════════════════════════════════════════════════════════════════════════════
// ICON SIZES
// ══════════════════════════════════════════════════════════════════════════════

/// Standard icon sizes matching web design system.
abstract final class AivoIconSize {
  /// Extra small icon (12px) - inline text indicators
  static const double xs = 12;

  /// Small icon (16px) - compact UI, badges
  static const double sm = 16;

  /// Medium icon (20px) - default size, buttons
  static const double md = 20;

  /// Large icon (24px) - prominent actions, navigation
  static const double lg = 24;

  /// Extra large icon (32px) - feature highlights
  static const double xl = 32;

  /// 2X large icon (40px) - empty states, illustrations
  static const double xxl = 40;

  /// 3X large icon (48px) - hero icons, onboarding
  static const double xxxl = 48;

  /// Get size for grade band (younger = slightly larger)
  static double forGradeBand(AivoGradeBand gradeBand, {double baseSize = md}) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => baseSize * 1.15, // 15% larger for younger
      AivoGradeBand.g6_8 => baseSize * 1.05, // 5% larger
      AivoGradeBand.g9_12 => baseSize, // Standard
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ICON COLORS
// ══════════════════════════════════════════════════════════════════════════════

/// Icon color variants matching web design system.
enum AivoIconVariant {
  /// Default - follows theme foreground
  primary,

  /// Secondary - slightly muted
  secondary,

  /// Muted - low emphasis
  muted,

  /// Inverse - for dark backgrounds
  inverse,

  /// Success state - green
  success,

  /// Warning state - amber/yellow
  warning,

  /// Error/destructive state - red
  error,

  /// Info state - blue
  info,

  /// Accent - brand primary color
  accent,

  /// Disabled state
  disabled,
}

/// Get icon color for variant from theme.
Color getIconColor(BuildContext context, AivoIconVariant variant) {
  final theme = Theme.of(context);
  final colorScheme = theme.colorScheme;

  return switch (variant) {
    AivoIconVariant.primary => colorScheme.onSurface,
    AivoIconVariant.secondary => colorScheme.onSurfaceVariant,
    AivoIconVariant.muted => colorScheme.onSurface.withValues(alpha: 0.5),
    AivoIconVariant.inverse => colorScheme.onPrimary,
    AivoIconVariant.success => AivoBrand.success,
    AivoIconVariant.warning => AivoBrand.warning,
    AivoIconVariant.error => colorScheme.error,
    AivoIconVariant.info => AivoBrand.info,
    AivoIconVariant.accent => colorScheme.primary,
    AivoIconVariant.disabled => colorScheme.onSurface.withValues(alpha: 0.38),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// AIVO ICON WIDGET
// ══════════════════════════════════════════════════════════════════════════════

/// Consistent icon widget with standard sizing and colors.
///
/// Wraps any IconData with proper sizing, coloring, and semantics.
/// Matches web Lucide icon usage patterns.
///
/// ```dart
/// AivoIcon(LucideIcons.bell, size: AivoIconSize.lg)
/// AivoIcon(LucideIcons.check, variant: AivoIconVariant.success)
/// AivoIcon.small(LucideIcons.x)
/// AivoIcon.large(LucideIcons.settings)
/// ```
class AivoIcon extends StatelessWidget {
  const AivoIcon(
    this.icon, {
    super.key,
    this.size,
    this.color,
    this.variant = AivoIconVariant.primary,
    this.gradeBand,
    this.semanticLabel,
  });

  /// The icon to display.
  final IconData icon;

  /// Icon size. Defaults to [AivoIconSize.md] (20px).
  final double? size;

  /// Explicit color (overrides variant).
  final Color? color;

  /// Color variant (used if color is null).
  final AivoIconVariant variant;

  /// Grade band for size adjustment.
  final AivoGradeBand? gradeBand;

  /// Semantic label for accessibility.
  final String? semanticLabel;

  /// Create extra small icon (12px).
  const AivoIcon.xs(
    this.icon, {
    super.key,
    this.color,
    this.variant = AivoIconVariant.primary,
    this.gradeBand,
    this.semanticLabel,
  }) : size = AivoIconSize.xs;

  /// Create small icon (16px).
  const AivoIcon.sm(
    this.icon, {
    super.key,
    this.color,
    this.variant = AivoIconVariant.primary,
    this.gradeBand,
    this.semanticLabel,
  }) : size = AivoIconSize.sm;

  /// Create medium icon (20px) - default.
  const AivoIcon.md(
    this.icon, {
    super.key,
    this.color,
    this.variant = AivoIconVariant.primary,
    this.gradeBand,
    this.semanticLabel,
  }) : size = AivoIconSize.md;

  /// Create large icon (24px).
  const AivoIcon.lg(
    this.icon, {
    super.key,
    this.color,
    this.variant = AivoIconVariant.primary,
    this.gradeBand,
    this.semanticLabel,
  }) : size = AivoIconSize.lg;

  /// Create extra large icon (32px).
  const AivoIcon.xl(
    this.icon, {
    super.key,
    this.color,
    this.variant = AivoIconVariant.primary,
    this.gradeBand,
    this.semanticLabel,
  }) : size = AivoIconSize.xl;

  /// Create 2X large icon (40px).
  const AivoIcon.xxl(
    this.icon, {
    super.key,
    this.color,
    this.variant = AivoIconVariant.primary,
    this.gradeBand,
    this.semanticLabel,
  }) : size = AivoIconSize.xxl;

  @override
  Widget build(BuildContext context) {
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);
    final baseSize = size ?? AivoIconSize.md;
    final effectiveSize = AivoIconSize.forGradeBand(
      effectiveGradeBand,
      baseSize: baseSize,
    );
    final effectiveColor = color ?? getIconColor(context, variant);

    return Icon(
      icon,
      size: effectiveSize,
      color: effectiveColor,
      semanticLabel: semanticLabel,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ICON BUTTON
// ══════════════════════════════════════════════════════════════════════════════

/// Standard icon button with proper touch targets and focus states.
///
/// Ensures minimum 48x48 touch target for accessibility.
/// Matches web icon button patterns.
class AivoIconButton extends StatelessWidget {
  const AivoIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.size,
    this.color,
    this.variant = AivoIconVariant.primary,
    this.gradeBand,
    this.tooltip,
    this.semanticLabel,
    this.enabled = true,
    this.padding,
    this.splashRadius,
    this.focusNode,
    this.autofocus = false,
  });

  /// The icon to display.
  final IconData icon;

  /// Called when button is pressed.
  final VoidCallback? onPressed;

  /// Icon size.
  final double? size;

  /// Explicit icon color.
  final Color? color;

  /// Icon color variant.
  final AivoIconVariant variant;

  /// Grade band for sizing.
  final AivoGradeBand? gradeBand;

  /// Tooltip text.
  final String? tooltip;

  /// Semantic label for screen readers.
  final String? semanticLabel;

  /// Whether button is enabled.
  final bool enabled;

  /// Custom padding.
  final EdgeInsetsGeometry? padding;

  /// Custom splash radius.
  final double? splashRadius;

  /// Focus node.
  final FocusNode? focusNode;

  /// Whether to autofocus.
  final bool autofocus;

  /// Small icon button (16px icon, 36px touch target).
  const AivoIconButton.sm({
    super.key,
    required this.icon,
    required this.onPressed,
    this.color,
    this.variant = AivoIconVariant.primary,
    this.gradeBand,
    this.tooltip,
    this.semanticLabel,
    this.enabled = true,
    this.focusNode,
    this.autofocus = false,
  })  : size = AivoIconSize.sm,
        padding = const EdgeInsets.all(10),
        splashRadius = 18;

  /// Medium icon button (20px icon, 40px touch target).
  const AivoIconButton.md({
    super.key,
    required this.icon,
    required this.onPressed,
    this.color,
    this.variant = AivoIconVariant.primary,
    this.gradeBand,
    this.tooltip,
    this.semanticLabel,
    this.enabled = true,
    this.focusNode,
    this.autofocus = false,
  })  : size = AivoIconSize.md,
        padding = const EdgeInsets.all(10),
        splashRadius = 20;

  /// Large icon button (24px icon, 48px touch target).
  const AivoIconButton.lg({
    super.key,
    required this.icon,
    required this.onPressed,
    this.color,
    this.variant = AivoIconVariant.primary,
    this.gradeBand,
    this.tooltip,
    this.semanticLabel,
    this.enabled = true,
    this.focusNode,
    this.autofocus = false,
  })  : size = AivoIconSize.lg,
        padding = const EdgeInsets.all(12),
        splashRadius = 24;

  @override
  Widget build(BuildContext context) {
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);
    final baseSize = size ?? AivoIconSize.md;
    final effectiveSize = AivoIconSize.forGradeBand(
      effectiveGradeBand,
      baseSize: baseSize,
    );

    final effectiveVariant = enabled ? variant : AivoIconVariant.disabled;
    final effectiveColor = color != null
        ? (enabled ? color : color!.withValues(alpha: 0.38))
        : getIconColor(context, effectiveVariant);

    Widget button = IconButton(
      icon: Icon(
        icon,
        size: effectiveSize,
        color: effectiveColor,
      ),
      onPressed: enabled ? onPressed : null,
      padding: padding ?? const EdgeInsets.all(8),
      splashRadius: splashRadius,
      focusNode: focusNode,
      autofocus: autofocus,
    );

    // Add tooltip if provided
    if (tooltip != null) {
      button = Tooltip(
        message: tooltip!,
        child: button,
      );
    }

    // Add semantics
    if (semanticLabel != null) {
      button = Semantics(
        label: semanticLabel,
        button: true,
        enabled: enabled,
        child: button,
      );
    }

    return button;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FILLED ICON BUTTON
// ══════════════════════════════════════════════════════════════════════════════

/// Icon button with filled background.
class AivoFilledIconButton extends StatelessWidget {
  const AivoFilledIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.size = AivoIconSize.md,
    this.backgroundColor,
    this.iconColor,
    this.gradeBand,
    this.tooltip,
    this.semanticLabel,
    this.enabled = true,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final double size;
  final Color? backgroundColor;
  final Color? iconColor;
  final AivoGradeBand? gradeBand;
  final String? tooltip;
  final String? semanticLabel;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);
    final effectiveSize = AivoIconSize.forGradeBand(
      effectiveGradeBand,
      baseSize: size,
    );

    final bgColor = backgroundColor ?? theme.colorScheme.primary;
    final fgColor = iconColor ?? theme.colorScheme.onPrimary;

    final radius = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusLg,
      AivoGradeBand.g6_8 => AivoBrand.radiusMd,
      AivoGradeBand.g9_12 => AivoBrand.radiusSm,
    };

    Widget button = IconButton.filled(
      icon: Icon(icon, size: effectiveSize),
      onPressed: enabled ? onPressed : null,
      style: IconButton.styleFrom(
        backgroundColor: enabled ? bgColor : bgColor.withValues(alpha: 0.38),
        foregroundColor: enabled ? fgColor : fgColor.withValues(alpha: 0.38),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );

    if (tooltip != null) {
      button = Tooltip(message: tooltip!, child: button);
    }

    if (semanticLabel != null) {
      button = Semantics(
        label: semanticLabel,
        button: true,
        enabled: enabled,
        child: button,
      );
    }

    return button;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// OUTLINED ICON BUTTON
// ══════════════════════════════════════════════════════════════════════════════

/// Icon button with outlined border.
class AivoOutlinedIconButton extends StatelessWidget {
  const AivoOutlinedIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.size = AivoIconSize.md,
    this.borderColor,
    this.iconColor,
    this.gradeBand,
    this.tooltip,
    this.semanticLabel,
    this.enabled = true,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final double size;
  final Color? borderColor;
  final Color? iconColor;
  final AivoGradeBand? gradeBand;
  final String? tooltip;
  final String? semanticLabel;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);
    final effectiveSize = AivoIconSize.forGradeBand(
      effectiveGradeBand,
      baseSize: size,
    );

    final border = borderColor ?? theme.colorScheme.outline;
    final fg = iconColor ?? theme.colorScheme.primary;

    final radius = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusLg,
      AivoGradeBand.g6_8 => AivoBrand.radiusMd,
      AivoGradeBand.g9_12 => AivoBrand.radiusSm,
    };

    Widget button = IconButton.outlined(
      icon: Icon(icon, size: effectiveSize),
      onPressed: enabled ? onPressed : null,
      style: IconButton.styleFrom(
        foregroundColor: enabled ? fg : fg.withValues(alpha: 0.38),
        side: BorderSide(
          color: enabled ? border : border.withValues(alpha: 0.38),
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );

    if (tooltip != null) {
      button = Tooltip(message: tooltip!, child: button);
    }

    if (semanticLabel != null) {
      button = Semantics(
        label: semanticLabel,
        button: true,
        enabled: enabled,
        child: button,
      );
    }

    return button;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ICON WITH BADGE
// ══════════════════════════════════════════════════════════════════════════════

/// Icon with notification badge.
class AivoIconBadge extends StatelessWidget {
  const AivoIconBadge({
    super.key,
    required this.icon,
    this.count,
    this.showBadge = true,
    this.size = AivoIconSize.lg,
    this.color,
    this.variant = AivoIconVariant.primary,
    this.badgeColor,
    this.gradeBand,
    this.semanticLabel,
  });

  final IconData icon;
  final int? count;
  final bool showBadge;
  final double size;
  final Color? color;
  final AivoIconVariant variant;
  final Color? badgeColor;
  final AivoGradeBand? gradeBand;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);
    final effectiveSize = AivoIconSize.forGradeBand(
      effectiveGradeBand,
      baseSize: size,
    );
    final effectiveColor = color ?? getIconColor(context, variant);
    final effectiveBadgeColor = badgeColor ?? theme.colorScheme.error;

    String? badgeLabel;
    if (count != null && count! > 0) {
      badgeLabel = count! > 99 ? '99+' : count.toString();
    }

    Widget iconWidget = Icon(
      icon,
      size: effectiveSize,
      color: effectiveColor,
    );

    if (!showBadge && count == null) {
      return iconWidget;
    }

    return Badge(
      label: badgeLabel != null ? Text(badgeLabel) : null,
      isLabelVisible: showBadge && (count == null || count! > 0),
      backgroundColor: effectiveBadgeColor,
      smallSize: count == null ? 8 : null,
      child: Semantics(
        label: semanticLabel ??
            (count != null ? '$count notifications' : 'Has notification'),
        child: iconWidget,
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMMONLY USED ICONS MAPPING
// ══════════════════════════════════════════════════════════════════════════════

/// Common Aivo icons mapped from Lucide for consistency.
///
/// Use these semantic names instead of raw LucideIcons to maintain
/// consistency and make icon changes easier across the app.
abstract final class AivoIcons {
  // Navigation
  static const home = LucideIcons.home;
  static const menu = LucideIcons.menu;
  static const back = LucideIcons.arrowLeft;
  static const forward = LucideIcons.arrowRight;
  static const up = LucideIcons.arrowUp;
  static const down = LucideIcons.arrowDown;
  static const chevronLeft = LucideIcons.chevronLeft;
  static const chevronRight = LucideIcons.chevronRight;
  static const chevronUp = LucideIcons.chevronUp;
  static const chevronDown = LucideIcons.chevronDown;
  static const close = LucideIcons.x;
  static const moreHorizontal = LucideIcons.moreHorizontal;
  static const moreVertical = LucideIcons.moreVertical;
  static const externalLink = LucideIcons.externalLink;

  // Actions
  static const search = LucideIcons.search;
  static const filter = LucideIcons.filter;
  static const sort = LucideIcons.arrowUpDown;
  static const add = LucideIcons.plus;
  static const remove = LucideIcons.minus;
  static const edit = LucideIcons.pencil;
  static const delete = LucideIcons.trash2;
  static const save = LucideIcons.save;
  static const copy = LucideIcons.copy;
  static const share = LucideIcons.share2;
  static const download = LucideIcons.download;
  static const upload = LucideIcons.upload;
  static const refresh = LucideIcons.refreshCw;
  static const settings = LucideIcons.settings;
  static const send = LucideIcons.send;
  static const print = LucideIcons.printer;

  // Status & Feedback
  static const check = LucideIcons.check;
  static const checkCircle = LucideIcons.checkCircle2;
  static const error = LucideIcons.xCircle;
  static const warning = LucideIcons.alertTriangle;
  static const info = LucideIcons.info;
  static const help = LucideIcons.helpCircle;
  static const success = LucideIcons.checkCircle2;
  static const loading = LucideIcons.loader2;

  // User & Profile
  static const user = LucideIcons.user;
  static const users = LucideIcons.users;
  static const userPlus = LucideIcons.userPlus;
  static const userMinus = LucideIcons.userMinus;
  static const profile = LucideIcons.userCircle;
  static const graduationCap = LucideIcons.graduationCap;

  // Communication
  static const bell = LucideIcons.bell;
  static const bellOff = LucideIcons.bellOff;
  static const mail = LucideIcons.mail;
  static const message = LucideIcons.messageCircle;
  static const messageSquare = LucideIcons.messageSquare;
  static const phone = LucideIcons.phone;
  static const video = LucideIcons.video;

  // Content & Media
  static const file = LucideIcons.file;
  static const fileText = LucideIcons.fileText;
  static const folder = LucideIcons.folder;
  static const image = LucideIcons.image;
  static const music = LucideIcons.music;
  static const play = LucideIcons.play;
  static const pause = LucideIcons.pause;
  static const stop = LucideIcons.square;
  static const camera = LucideIcons.camera;
  static const microphone = LucideIcons.mic;
  static const microphoneOff = LucideIcons.micOff;

  // Education
  static const book = LucideIcons.book;
  static const bookOpen = LucideIcons.bookOpen;
  static const library = LucideIcons.library;
  static const school = LucideIcons.school;
  static const award = LucideIcons.award;
  static const trophy = LucideIcons.trophy;
  static const star = LucideIcons.star;
  static const starFilled = LucideIcons.star;
  static const target = LucideIcons.target;
  static const calendar = LucideIcons.calendar;
  static const clock = LucideIcons.clock;
  static const timer = LucideIcons.timer;

  // Learning & Progress
  static const brain = LucideIcons.brain;
  static const lightbulb = LucideIcons.lightbulb;
  static const puzzle = LucideIcons.puzzle;
  static const trendingUp = LucideIcons.trendingUp;
  static const trendingDown = LucideIcons.trendingDown;
  static const barChart = LucideIcons.barChart3;
  static const pieChart = LucideIcons.pieChart;
  static const activity = LucideIcons.activity;

  // Gamification
  static const coins = LucideIcons.coins;
  static const gem = LucideIcons.gem;
  static const flame = LucideIcons.flame;
  static const zap = LucideIcons.zap;
  static const rocket = LucideIcons.rocket;
  static const sparkles = LucideIcons.sparkles;
  static const crown = LucideIcons.crown;
  static const medal = LucideIcons.medal;
  static const gift = LucideIcons.gift;

  // Interface
  static const eye = LucideIcons.eye;
  static const eyeOff = LucideIcons.eyeOff;
  static const lock = LucideIcons.lock;
  static const unlock = LucideIcons.unlock;
  static const key = LucideIcons.key;
  static const shield = LucideIcons.shield;
  static const shieldCheck = LucideIcons.shieldCheck;
  static const link = LucideIcons.link;
  static const unlink = LucideIcons.unlink;
  static const bookmark = LucideIcons.bookmark;
  static const bookmarkFilled = LucideIcons.bookmark;
  static const heart = LucideIcons.heart;
  static const heartFilled = LucideIcons.heart;
  static const thumbsUp = LucideIcons.thumbsUp;
  static const thumbsDown = LucideIcons.thumbsDown;

  // Device & Connectivity
  static const smartphone = LucideIcons.smartphone;
  static const tablet = LucideIcons.tablet;
  static const monitor = LucideIcons.monitor;
  static const laptop = LucideIcons.laptop;
  static const wifi = LucideIcons.wifi;
  static const wifiOff = LucideIcons.wifiOff;
  static const bluetooth = LucideIcons.bluetooth;
  static const globe = LucideIcons.globe;

  // Tools
  static const drag = LucideIcons.gripVertical;
  static const maximize = LucideIcons.maximize2;
  static const minimize = LucideIcons.minimize2;
  static const fullscreen = LucideIcons.maximize;
  static const exitFullscreen = LucideIcons.minimize;
  static const sun = LucideIcons.sun;
  static const moon = LucideIcons.moon;
  static const palette = LucideIcons.palette;
  static const languages = LucideIcons.languages;

  // AI & Assistant
  static const bot = LucideIcons.bot;
  static const cpu = LucideIcons.cpu;
  static const wand = LucideIcons.wand2;
  static const magic = LucideIcons.sparkles;
}
