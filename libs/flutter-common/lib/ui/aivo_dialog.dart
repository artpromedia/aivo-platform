/// Aivo Dialog Widget
///
/// Consistent modal dialog styling across apps with grade-band awareness.
/// Aligned with web dialog component styling.
library;

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_shadows.dart';
import '../theme/aivo_theme.dart';

/// Dialog size presets.
enum AivoDialogSize {
  /// Small dialog (300px max width)
  small,

  /// Medium dialog (480px max width) - default
  medium,

  /// Large dialog (640px max width)
  large,

  /// Full screen dialog
  fullscreen,
}

/// Aivo-styled Dialog matching web modal component.
///
/// Web reference: libs/ui-web/src/components/ui/dialog.tsx
/// - Border radius: per grade band (Explorer 24px, Navigator 16px, Scholar 12px)
/// - Backdrop: bg-black/50
/// - Animation: fade + scale from 95%
/// - Sections: header, content, footer
class AivoDialog extends StatelessWidget {
  const AivoDialog({
    super.key,
    this.title,
    this.titleWidget,
    this.description,
    this.content,
    this.actions,
    this.leading,
    this.onClose,
    this.showCloseButton = true,
    this.size = AivoDialogSize.medium,
    this.gradeBand,
    this.barrierDismissible = true,
    this.scrollable = true,
    this.contentPadding,
  });

  /// Dialog title text.
  final String? title;

  /// Custom title widget (overrides [title]).
  final Widget? titleWidget;

  /// Description text below title.
  final String? description;

  /// Main content of the dialog.
  final Widget? content;

  /// Action buttons at the bottom.
  final List<Widget>? actions;

  /// Leading widget in header (e.g., icon).
  final Widget? leading;

  /// Called when dialog is closed.
  final VoidCallback? onClose;

  /// Whether to show close button.
  final bool showCloseButton;

  /// Dialog size preset.
  final AivoDialogSize size;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Whether tapping outside dismisses the dialog.
  final bool barrierDismissible;

  /// Whether content is scrollable.
  final bool scrollable;

  /// Custom content padding.
  final EdgeInsetsGeometry? contentPadding;

  /// Show dialog with Aivo styling.
  static Future<T?> show<T>({
    required BuildContext context,
    required Widget dialog,
    bool barrierDismissible = true,
    AivoGradeBand? gradeBand,
  }) {
    return showGeneralDialog<T>(
      context: context,
      barrierDismissible: barrierDismissible,
      barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
      barrierColor: Colors.black.withValues(alpha: 0.5),
      transitionDuration: _getTransitionDuration(gradeBand),
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        final curvedAnimation = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
          reverseCurve: Curves.easeInCubic,
        );

        return FadeTransition(
          opacity: curvedAnimation,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.95, end: 1.0).animate(curvedAnimation),
            child: child,
          ),
        );
      },
      pageBuilder: (context, animation, secondaryAnimation) {
        return dialog;
      },
    );
  }

  static Duration _getTransitionDuration(AivoGradeBand? gradeBand) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => const Duration(milliseconds: 300),
      AivoGradeBand.g6_8 => const Duration(milliseconds: 250),
      AivoGradeBand.g9_12 => const Duration(milliseconds: 200),
      null => const Duration(milliseconds: 250),
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);

    // Get radius based on grade band
    final radius = _getRadius(effectiveGradeBand);

    // Get max width based on size
    final maxWidth = _getMaxWidth();

    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: size == AivoDialogSize.fullscreen
              ? double.infinity
              : maxWidth,
          maxHeight: size == AivoDialogSize.fullscreen
              ? double.infinity
              : MediaQuery.of(context).size.height * 0.9,
        ),
        child: Material(
          color: colorScheme.surface,
          borderRadius: size == AivoDialogSize.fullscreen
              ? BorderRadius.zero
              : BorderRadius.circular(radius),
          elevation: 0,
          clipBehavior: Clip.antiAlias,
          child: Container(
            margin: size == AivoDialogSize.fullscreen
                ? EdgeInsets.zero
                : const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: size == AivoDialogSize.fullscreen
                  ? BorderRadius.zero
                  : BorderRadius.circular(radius),
              boxShadow: AivoShadows.elevated,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                if (title != null ||
                    titleWidget != null ||
                    showCloseButton) ...[
                  _buildHeader(context, theme, effectiveGradeBand),
                ],
                // Content
                if (content != null)
                  scrollable
                      ? Flexible(
                          child: SingleChildScrollView(
                            padding: contentPadding ??
                                const EdgeInsets.symmetric(
                                    horizontal: 24, vertical: 16),
                            child: content,
                          ),
                        )
                      : Padding(
                          padding: contentPadding ??
                              const EdgeInsets.symmetric(
                                  horizontal: 24, vertical: 16),
                          child: content,
                        ),
                // Footer
                if (actions != null && actions!.isNotEmpty) ...[
                  _buildFooter(context, theme),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(
      BuildContext context, ThemeData theme, AivoGradeBand gradeBand) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 16, 0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (leading != null) ...[
            leading!,
            const SizedBox(width: 16),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (titleWidget != null)
                  titleWidget!
                else if (title != null)
                  Text(
                    title!,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                if (description != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    description!,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (showCloseButton)
            _AivoCloseButton(
              onPressed: onClose ?? () => Navigator.of(context).pop(),
              gradeBand: gradeBand,
            ),
        ],
      ),
    );
  }

  Widget _buildFooter(BuildContext context, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          for (int i = 0; i < actions!.length; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            actions![i],
          ],
        ],
      ),
    );
  }

  double _getRadius(AivoGradeBand gradeBand) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusExplorerModal,
      AivoGradeBand.g6_8 => AivoBrand.radiusNavigatorModal,
      AivoGradeBand.g9_12 => AivoBrand.radiusScholarModal,
    };
  }

  double _getMaxWidth() {
    return switch (size) {
      AivoDialogSize.small => 300,
      AivoDialogSize.medium => 480,
      AivoDialogSize.large => 640,
      AivoDialogSize.fullscreen => double.infinity,
    };
  }
}

/// Close button for dialogs.
class _AivoCloseButton extends StatelessWidget {
  const _AivoCloseButton({
    required this.onPressed,
    required this.gradeBand,
  });

  final VoidCallback onPressed;
  final AivoGradeBand gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final size = switch (gradeBand) {
      AivoGradeBand.k5 => 40.0,
      AivoGradeBand.g6_8 => 36.0,
      AivoGradeBand.g9_12 => 32.0,
    };

    final iconSize = switch (gradeBand) {
      AivoGradeBand.k5 => 24.0,
      AivoGradeBand.g6_8 => 20.0,
      AivoGradeBand.g9_12 => 18.0,
    };

    return SizedBox(
      width: size,
      height: size,
      child: IconButton(
        onPressed: onPressed,
        padding: EdgeInsets.zero,
        style: IconButton.styleFrom(
          backgroundColor: Colors.transparent,
          foregroundColor: theme.colorScheme.onSurfaceVariant,
        ),
        icon: Icon(Icons.close, size: iconSize),
        tooltip: 'Close',
      ),
    );
  }
}

/// Confirmation dialog with standard layout.
class AivoConfirmDialog extends StatelessWidget {
  const AivoConfirmDialog({
    super.key,
    required this.title,
    this.description,
    this.confirmLabel = 'Confirm',
    this.cancelLabel = 'Cancel',
    this.onConfirm,
    this.onCancel,
    this.isDestructive = false,
    this.gradeBand,
    this.icon,
  });

  final String title;
  final String? description;
  final String confirmLabel;
  final String cancelLabel;
  final VoidCallback? onConfirm;
  final VoidCallback? onCancel;
  final bool isDestructive;
  final AivoGradeBand? gradeBand;
  final IconData? icon;

  /// Show confirmation dialog and return result.
  static Future<bool?> show({
    required BuildContext context,
    required String title,
    String? description,
    String confirmLabel = 'Confirm',
    String cancelLabel = 'Cancel',
    bool isDestructive = false,
    AivoGradeBand? gradeBand,
    IconData? icon,
  }) {
    return AivoDialog.show<bool>(
      context: context,
      gradeBand: gradeBand,
      dialog: AivoConfirmDialog(
        title: title,
        description: description,
        confirmLabel: confirmLabel,
        cancelLabel: cancelLabel,
        isDestructive: isDestructive,
        gradeBand: gradeBand,
        icon: icon,
        onConfirm: () => Navigator.of(context).pop(true),
        onCancel: () => Navigator.of(context).pop(false),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AivoDialog(
      size: AivoDialogSize.small,
      gradeBand: gradeBand,
      showCloseButton: false,
      leading: icon != null
          ? Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isDestructive
                    ? theme.colorScheme.errorContainer
                    : theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(AivoBrand.radiusMd),
              ),
              child: Icon(
                icon,
                color: isDestructive
                    ? theme.colorScheme.error
                    : theme.colorScheme.primary,
                size: 24,
              ),
            )
          : null,
      title: title,
      description: description,
      actions: [
        TextButton(
          onPressed: onCancel ?? () => Navigator.of(context).pop(false),
          child: Text(cancelLabel),
        ),
        FilledButton(
          onPressed: onConfirm ?? () => Navigator.of(context).pop(true),
          style: isDestructive
              ? FilledButton.styleFrom(
                  backgroundColor: theme.colorScheme.error,
                  foregroundColor: theme.colorScheme.onError,
                )
              : null,
          child: Text(confirmLabel),
        ),
      ],
    );
  }
}

/// Alert dialog with icon and single action.
class AivoAlertDialog extends StatelessWidget {
  const AivoAlertDialog({
    super.key,
    required this.title,
    this.description,
    this.actionLabel = 'OK',
    this.onAction,
    this.variant = AivoAlertVariant.info,
    this.gradeBand,
  });

  final String title;
  final String? description;
  final String actionLabel;
  final VoidCallback? onAction;
  final AivoAlertVariant variant;
  final AivoGradeBand? gradeBand;

  /// Show alert dialog.
  static Future<void> show({
    required BuildContext context,
    required String title,
    String? description,
    String actionLabel = 'OK',
    AivoAlertVariant variant = AivoAlertVariant.info,
    AivoGradeBand? gradeBand,
  }) {
    return AivoDialog.show<void>(
      context: context,
      gradeBand: gradeBand,
      dialog: AivoAlertDialog(
        title: title,
        description: description,
        actionLabel: actionLabel,
        variant: variant,
        gradeBand: gradeBand,
        onAction: () => Navigator.of(context).pop(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (iconData, color) = _getIconAndColor(theme);

    return AivoDialog(
      size: AivoDialogSize.small,
      gradeBand: gradeBand,
      showCloseButton: false,
      leading: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(AivoBrand.radiusMd),
        ),
        child: Icon(iconData, color: color, size: 24),
      ),
      title: title,
      description: description,
      actions: [
        FilledButton(
          onPressed: onAction ?? () => Navigator.of(context).pop(),
          child: Text(actionLabel),
        ),
      ],
    );
  }

  (IconData, Color) _getIconAndColor(ThemeData theme) {
    return switch (variant) {
      AivoAlertVariant.info => (Icons.info_outline, theme.colorScheme.primary),
      AivoAlertVariant.success => (Icons.check_circle_outline, AivoBrand.success),
      AivoAlertVariant.warning => (Icons.warning_amber_outlined, AivoBrand.warning),
      AivoAlertVariant.error => (Icons.error_outline, theme.colorScheme.error),
    };
  }
}

/// Alert variant for styling.
enum AivoAlertVariant {
  info,
  success,
  warning,
  error,
}

/// Bottom sheet dialog variant.
class AivoBottomSheet extends StatelessWidget {
  const AivoBottomSheet({
    super.key,
    this.title,
    this.content,
    this.actions,
    this.showDragHandle = true,
    this.showCloseButton = false,
    this.onClose,
    this.gradeBand,
    this.maxHeight,
    this.isScrollable = true,
  });

  final String? title;
  final Widget? content;
  final List<Widget>? actions;
  final bool showDragHandle;
  final bool showCloseButton;
  final VoidCallback? onClose;
  final AivoGradeBand? gradeBand;
  final double? maxHeight;
  final bool isScrollable;

  /// Show bottom sheet with Aivo styling.
  static Future<T?> show<T>({
    required BuildContext context,
    required Widget Function(BuildContext) builder,
    bool isDismissible = true,
    bool enableDrag = true,
    AivoGradeBand? gradeBand,
  }) {
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);
    final radius = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusExplorerModal,
      AivoGradeBand.g6_8 => AivoBrand.radiusNavigatorModal,
      AivoGradeBand.g9_12 => AivoBrand.radiusScholarModal,
    };

    return showModalBottomSheet<T>(
      context: context,
      isDismissible: isDismissible,
      enableDrag: enableDrag,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(radius),
          ),
        ),
        child: builder(context),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);

    final effectiveMaxHeight =
        maxHeight ?? MediaQuery.of(context).size.height * 0.9;

    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: effectiveMaxHeight),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          if (showDragHandle)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          // Header
          if (title != null || showCloseButton)
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 16, 16),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title ?? '',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (showCloseButton)
                    _AivoCloseButton(
                      onPressed: onClose ?? () => Navigator.of(context).pop(),
                      gradeBand: effectiveGradeBand,
                    ),
                ],
              ),
            ),
          // Content
          if (content != null)
            isScrollable
                ? Flexible(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: content,
                    ),
                  )
                : Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: content,
                  ),
          // Actions
          if (actions != null && actions!.isNotEmpty)
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  children: [
                    for (int i = 0; i < actions!.length; i++) ...[
                      if (i > 0) const SizedBox(width: 8),
                      Expanded(child: actions![i]),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
