import 'package:flutter/material.dart';
import 'accessibility_announcer.dart';

/// Accessible button with proper semantics
class AccessibleButton extends StatelessWidget {
  final Widget child;
  final String label;
  final String? hint;
  final VoidCallback? onPressed;
  final ButtonStyle? style;

  const AccessibleButton({
    super.key,
    required this.child,
    required this.label,
    this.hint,
    this.onPressed,
    this.style,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: onPressed != null,
      label: label,
      hint: hint ?? (onPressed != null ? 'Double tap to activate' : 'Disabled'),
      child: ElevatedButton(
        onPressed: onPressed,
        style: style,
        child: ExcludeSemantics(child: child),
      ),
    );
  }
}

/// Accessible icon button with required label
class AccessibleIconButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? hint;
  final VoidCallback? onPressed;
  final double? iconSize;
  final Color? color;

  const AccessibleIconButton({
    super.key,
    required this.icon,
    required this.label,
    this.hint,
    this.onPressed,
    this.iconSize,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: onPressed != null,
      label: label,
      hint: hint,
      child: IconButton(
        icon: Icon(icon, size: iconSize, color: color),
        onPressed: onPressed,
        tooltip: label,
      ),
    );
  }
}

/// Accessible text field with proper labeling
class AccessibleTextField extends StatelessWidget {
  final String label;
  final String? hint;
  final String? errorText;
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final bool obscureText;
  final TextInputType? keyboardType;
  final bool autofocus;
  final FocusNode? focusNode;
  final bool readOnly;
  final int? maxLines;
  final int? maxLength;

  const AccessibleTextField({
    super.key,
    required this.label,
    this.hint,
    this.errorText,
    this.controller,
    this.onChanged,
    this.obscureText = false,
    this.keyboardType,
    this.autofocus = false,
    this.focusNode,
    this.readOnly = false,
    this.maxLines = 1,
    this.maxLength,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      textField: true,
      label: label,
      hint: hint,
      obscured: obscureText,
      readOnly: readOnly,
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        obscureText: obscureText,
        keyboardType: keyboardType,
        autofocus: autofocus,
        focusNode: focusNode,
        readOnly: readOnly,
        maxLines: maxLines,
        maxLength: maxLength,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          errorText: errorText,
        ),
      ),
    );
  }
}

/// Accessible checkbox with label
class AccessibleCheckbox extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool?>? onChanged;
  final bool enabled;

  const AccessibleCheckbox({
    super.key,
    required this.label,
    required this.value,
    this.onChanged,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      checked: value,
      enabled: enabled,
      label: label,
      child: InkWell(
        onTap: enabled && onChanged != null ? () => onChanged!(!value) : null,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Checkbox(
              value: value,
              onChanged: enabled ? onChanged : null,
            ),
            Text(label),
          ],
        ),
      ),
    );
  }
}

/// Accessible switch/toggle with label
class AccessibleSwitch extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool>? onChanged;
  final bool enabled;

  const AccessibleSwitch({
    super.key,
    required this.label,
    required this.value,
    this.onChanged,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      toggled: value,
      enabled: enabled,
      label: label,
      hint: 'Double tap to ${value ? 'disable' : 'enable'}',
      child: SwitchListTile(
        title: Text(label),
        value: value,
        onChanged: enabled ? onChanged : null,
      ),
    );
  }
}

/// Accessible image with alt text
class AccessibleImage extends StatelessWidget {
  final ImageProvider image;
  final String altText;
  final bool isDecorative;
  final double? width;
  final double? height;
  final BoxFit? fit;

  const AccessibleImage({
    super.key,
    required this.image,
    required this.altText,
    this.isDecorative = false,
    this.width,
    this.height,
    this.fit,
  });

  @override
  Widget build(BuildContext context) {
    final imageWidget = Image(
      image: image,
      width: width,
      height: height,
      fit: fit,
      semanticLabel: isDecorative ? null : altText,
      excludeFromSemantics: isDecorative,
    );

    if (isDecorative) {
      return ExcludeSemantics(child: imageWidget);
    }

    return Semantics(
      image: true,
      label: altText,
      child: imageWidget,
    );
  }
}

/// Screen reader only text (visually hidden)
class ScreenReaderOnly extends StatelessWidget {
  final String text;

  const ScreenReaderOnly({
    super.key,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: text,
      child: const SizedBox.shrink(),
    );
  }
}

/// Live region that announces content changes
class LiveRegion extends StatefulWidget {
  final Widget child;
  final String? announcement;
  final bool assertive;

  const LiveRegion({
    super.key,
    required this.child,
    this.announcement,
    this.assertive = false,
  });

  @override
  State<LiveRegion> createState() => _LiveRegionState();
}

class _LiveRegionState extends State<LiveRegion> {
  String? _previousAnnouncement;

  @override
  void didUpdateWidget(LiveRegion oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.announcement != _previousAnnouncement && 
        widget.announcement != null) {
      _previousAnnouncement = widget.announcement;
      AccessibilityAnnouncer.announce(widget.announcement!);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: widget.child,
    );
  }
}
