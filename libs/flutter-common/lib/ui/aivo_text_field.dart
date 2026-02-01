/// Aivo TextField Widget
///
/// Consistent text input styling across apps with grade-band awareness.
/// Aligned with web Input component (libs/ui-web/src/components/ui/input.tsx).
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_theme.dart';

/// TextField variants matching web input.tsx:
/// - outlined: Border with transparent background
/// - filled: Muted background with transparent border
/// - underlined: Bottom border only
enum AivoTextFieldVariant {
  /// Outlined: Border with surface background
  outlined,

  /// Filled: Muted background
  filled,

  /// Underlined: Bottom border only
  underlined,
}

/// TextField sizes matching web specifications.
enum AivoTextFieldSize {
  /// Small: min-height 36px
  sm,

  /// Medium (default): min-height = touchTarget
  md,

  /// Large: min-height 52px
  lg,
}

/// Aivo styled text field with grade-band awareness.
///
/// Features:
/// - 3 variants: outlined, filled, underlined
/// - 3 sizes: sm, md, lg
/// - Grade-band specific border radius
/// - Error state with message
/// - Helper text support
/// - Leading/trailing icon support
/// - Focus ring matching theme
///
/// Example:
/// ```dart
/// AivoTextField(
///   label: 'Email',
///   hint: 'Enter your email',
///   variant: AivoTextFieldVariant.outlined,
///   size: AivoTextFieldSize.md,
///   gradeBand: AivoGradeBand.k5,
/// )
/// ```
class AivoTextField extends StatefulWidget {
  const AivoTextField({
    super.key,
    this.controller,
    this.focusNode,
    this.label,
    this.hint,
    this.helperText,
    this.errorText,
    this.variant = AivoTextFieldVariant.outlined,
    this.size = AivoTextFieldSize.md,
    this.gradeBand,
    this.enabled = true,
    this.readOnly = false,
    this.obscureText = false,
    this.maxLines = 1,
    this.minLines,
    this.maxLength,
    this.keyboardType,
    this.textInputAction,
    this.inputFormatters,
    this.onChanged,
    this.onSubmitted,
    this.onTap,
    this.leadingIcon,
    this.trailingIcon,
    this.onTrailingIconTap,
    this.autofocus = false,
    this.autocorrect = true,
    this.enableSuggestions = true,
    this.textCapitalization = TextCapitalization.none,
    this.textAlign = TextAlign.start,
  });

  /// Text editing controller
  final TextEditingController? controller;

  /// Focus node for managing focus
  final FocusNode? focusNode;

  /// Label text above the field
  final String? label;

  /// Hint text inside the field
  final String? hint;

  /// Helper text below the field
  final String? helperText;

  /// Error text (overrides helper when present)
  final String? errorText;

  /// Visual variant
  final AivoTextFieldVariant variant;

  /// Size of the field
  final AivoTextFieldSize size;

  /// Grade band for styling (defaults to Navigator if not provided)
  final AivoGradeBand? gradeBand;

  /// Whether the field is enabled
  final bool enabled;

  /// Whether the field is read-only
  final bool readOnly;

  /// Whether to obscure text (for passwords)
  final bool obscureText;

  /// Maximum number of lines
  final int? maxLines;

  /// Minimum number of lines
  final int? minLines;

  /// Maximum character length
  final int? maxLength;

  /// Keyboard type
  final TextInputType? keyboardType;

  /// Text input action
  final TextInputAction? textInputAction;

  /// Input formatters
  final List<TextInputFormatter>? inputFormatters;

  /// Callback when text changes
  final ValueChanged<String>? onChanged;

  /// Callback when submitted
  final ValueChanged<String>? onSubmitted;

  /// Callback when tapped
  final VoidCallback? onTap;

  /// Leading icon
  final IconData? leadingIcon;

  /// Trailing icon
  final IconData? trailingIcon;

  /// Callback when trailing icon is tapped
  final VoidCallback? onTrailingIconTap;

  /// Whether to autofocus
  final bool autofocus;

  /// Whether to enable autocorrect
  final bool autocorrect;

  /// Whether to enable suggestions
  final bool enableSuggestions;

  /// Text capitalization
  final TextCapitalization textCapitalization;

  /// Text alignment
  final TextAlign textAlign;

  @override
  State<AivoTextField> createState() => _AivoTextFieldState();
}

class _AivoTextFieldState extends State<AivoTextField> {
  late FocusNode _focusNode;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode = widget.focusNode ?? FocusNode();
    _focusNode.addListener(_handleFocusChange);
  }

  @override
  void didUpdateWidget(AivoTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.focusNode != oldWidget.focusNode) {
      _focusNode.removeListener(_handleFocusChange);
      _focusNode = widget.focusNode ?? FocusNode();
      _focusNode.addListener(_handleFocusChange);
    }
  }

  void _handleFocusChange() {
    if (_focusNode.hasFocus != _isFocused) {
      setState(() {
        _isFocused = _focusNode.hasFocus;
      });
    }
  }

  @override
  void dispose() {
    if (widget.focusNode == null) {
      _focusNode.dispose();
    } else {
      _focusNode.removeListener(_handleFocusChange);
    }
    super.dispose();
  }

  /// Get border radius for grade band
  double _getBorderRadius() {
    if (widget.variant == AivoTextFieldVariant.underlined) return 0;

    return switch (widget.gradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusExplorerInput,
      AivoGradeBand.g6_8 => AivoBrand.radiusNavigatorInput,
      AivoGradeBand.g9_12 => AivoBrand.radiusScholarInput,
      null => AivoBrand.radiusSm,
    };
  }

  /// Get minimum height for size
  double _getMinHeight() {
    final touchTarget = switch (widget.gradeBand) {
      AivoGradeBand.k5 => AivoBrand.touchTargetExplorer,
      AivoGradeBand.g6_8 => AivoBrand.touchTargetNavigator,
      AivoGradeBand.g9_12 => AivoBrand.touchTargetScholar,
      null => AivoBrand.touchTargetNavigator,
    };

    return switch (widget.size) {
      AivoTextFieldSize.sm => 36,
      AivoTextFieldSize.md => touchTarget,
      AivoTextFieldSize.lg => 52,
    };
  }

  /// Get content padding for size
  EdgeInsets _getContentPadding() {
    final horizontal = switch (widget.size) {
      AivoTextFieldSize.sm => AivoBrand.space3,
      AivoTextFieldSize.md => AivoBrand.space4,
      AivoTextFieldSize.lg => AivoBrand.space5,
    };

    final vertical = switch (widget.size) {
      AivoTextFieldSize.sm => AivoBrand.space1 + 2,
      AivoTextFieldSize.md => AivoBrand.space2,
      AivoTextFieldSize.lg => AivoBrand.space3,
    };

    return EdgeInsets.symmetric(horizontal: horizontal, vertical: vertical);
  }

  /// Get text style for size
  TextStyle? _getTextStyle(BuildContext context) {
    final theme = Theme.of(context);
    return switch (widget.size) {
      AivoTextFieldSize.sm => theme.textTheme.labelMedium,
      AivoTextFieldSize.md => theme.textTheme.bodyLarge,
      AivoTextFieldSize.lg => theme.textTheme.titleMedium,
    };
  }

  /// Get icon size for size
  double _getIconSize() {
    return switch (widget.size) {
      AivoTextFieldSize.sm => 16,
      AivoTextFieldSize.md => 20,
      AivoTextFieldSize.lg => 24,
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;

    // Colors based on state and variant
    final fillColor = switch (widget.variant) {
      AivoTextFieldVariant.filled => hasError
          ? colorScheme.error.withValues(alpha: 0.1)
          : colorScheme.surfaceContainerHighest,
      AivoTextFieldVariant.outlined => colorScheme.surface,
      AivoTextFieldVariant.underlined => Colors.transparent,
    };

    final borderColor = hasError
        ? colorScheme.error
        : _isFocused
            ? colorScheme.primary
            : colorScheme.outline;

    final focusRingColor = hasError
        ? colorScheme.error.withValues(alpha: 0.3)
        : colorScheme.primary.withValues(alpha: 0.3);

    // Build input decoration
    final decoration = InputDecoration(
      filled: widget.variant == AivoTextFieldVariant.filled,
      fillColor: fillColor,
      hintText: widget.hint,
      hintStyle: _getTextStyle(context)?.copyWith(
        color: colorScheme.onSurfaceVariant,
      ),
      errorText: widget.errorText,
      errorStyle: theme.textTheme.bodySmall?.copyWith(
        color: colorScheme.error,
      ),
      helperText: widget.errorText == null ? widget.helperText : null,
      helperStyle: theme.textTheme.bodySmall?.copyWith(
        color: colorScheme.onSurfaceVariant,
      ),
      helperMaxLines: 2,
      errorMaxLines: 2,
      contentPadding: _getContentPadding(),
      isDense: widget.size == AivoTextFieldSize.sm,
      prefixIcon: widget.leadingIcon != null
          ? Icon(widget.leadingIcon, size: _getIconSize())
          : null,
      prefixIconColor: WidgetStateColor.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) {
          return colorScheme.onSurfaceVariant.withValues(alpha: 0.5);
        }
        if (states.contains(WidgetState.focused)) {
          return colorScheme.primary;
        }
        return colorScheme.onSurfaceVariant;
      }),
      suffixIcon: widget.trailingIcon != null
          ? IconButton(
              icon: Icon(widget.trailingIcon, size: _getIconSize()),
              onPressed: widget.enabled ? widget.onTrailingIconTap : null,
            )
          : null,
      suffixIconColor: WidgetStateColor.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) {
          return colorScheme.onSurfaceVariant.withValues(alpha: 0.5);
        }
        if (states.contains(WidgetState.focused)) {
          return colorScheme.primary;
        }
        return colorScheme.onSurfaceVariant;
      }),
      // Border configuration
      border: _buildBorder(colorScheme.outline),
      enabledBorder: _buildBorder(borderColor),
      focusedBorder: _buildFocusedBorder(colorScheme.primary, focusRingColor),
      errorBorder: _buildBorder(colorScheme.error),
      focusedErrorBorder: _buildFocusedBorder(
        colorScheme.error,
        colorScheme.error.withValues(alpha: 0.3),
      ),
      disabledBorder: _buildBorder(colorScheme.outline.withValues(alpha: 0.5)),
    );

    final textField = TextField(
      controller: widget.controller,
      focusNode: _focusNode,
      enabled: widget.enabled,
      readOnly: widget.readOnly,
      obscureText: widget.obscureText,
      maxLines: widget.maxLines,
      minLines: widget.minLines,
      maxLength: widget.maxLength,
      keyboardType: widget.keyboardType,
      textInputAction: widget.textInputAction,
      inputFormatters: widget.inputFormatters,
      onChanged: widget.onChanged,
      onSubmitted: widget.onSubmitted,
      onTap: widget.onTap,
      autofocus: widget.autofocus,
      autocorrect: widget.autocorrect,
      enableSuggestions: widget.enableSuggestions,
      textCapitalization: widget.textCapitalization,
      textAlign: widget.textAlign,
      style: _getTextStyle(context),
      decoration: decoration,
      cursorColor: colorScheme.primary,
    );

    // Wrap with label if provided
    if (widget.label != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Text(
              widget.label!,
              style: theme.textTheme.labelLarge?.copyWith(
                color: hasError
                    ? colorScheme.error
                    : widget.enabled
                        ? colorScheme.onSurface
                        : colorScheme.onSurface.withValues(alpha: 0.5),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          ConstrainedBox(
            constraints: BoxConstraints(minHeight: _getMinHeight()),
            child: textField,
          ),
        ],
      );
    }

    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: _getMinHeight()),
      child: textField,
    );
  }

  InputBorder _buildBorder(Color color) {
    final radius = _getBorderRadius();

    if (widget.variant == AivoTextFieldVariant.underlined) {
      return UnderlineInputBorder(
        borderSide: BorderSide(color: color, width: 2),
      );
    }

    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(radius),
      borderSide: BorderSide(
        color: widget.variant == AivoTextFieldVariant.filled
            ? Colors.transparent
            : color,
        width: 1,
      ),
    );
  }

  InputBorder _buildFocusedBorder(Color borderColor, Color focusRingColor) {
    final radius = _getBorderRadius();

    if (widget.variant == AivoTextFieldVariant.underlined) {
      return UnderlineInputBorder(
        borderSide: BorderSide(color: borderColor, width: 2),
      );
    }

    // For focus ring effect, we use a thicker border
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(radius),
      borderSide: BorderSide(
        color: borderColor,
        width: 2,
      ),
    );
  }
}

/// A text area variant of AivoTextField for multi-line input.
class AivoTextArea extends StatelessWidget {
  const AivoTextArea({
    super.key,
    this.controller,
    this.focusNode,
    this.label,
    this.hint,
    this.helperText,
    this.errorText,
    this.variant = AivoTextFieldVariant.outlined,
    this.gradeBand,
    this.enabled = true,
    this.readOnly = false,
    this.minLines = 3,
    this.maxLines = 5,
    this.maxLength,
    this.onChanged,
  });

  final TextEditingController? controller;
  final FocusNode? focusNode;
  final String? label;
  final String? hint;
  final String? helperText;
  final String? errorText;
  final AivoTextFieldVariant variant;
  final AivoGradeBand? gradeBand;
  final bool enabled;
  final bool readOnly;
  final int minLines;
  final int? maxLines;
  final int? maxLength;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return AivoTextField(
      controller: controller,
      focusNode: focusNode,
      label: label,
      hint: hint,
      helperText: helperText,
      errorText: errorText,
      variant: variant,
      size: AivoTextFieldSize.md,
      gradeBand: gradeBand,
      enabled: enabled,
      readOnly: readOnly,
      minLines: minLines,
      maxLines: maxLines,
      maxLength: maxLength,
      onChanged: onChanged,
      keyboardType: TextInputType.multiline,
    );
  }
}
