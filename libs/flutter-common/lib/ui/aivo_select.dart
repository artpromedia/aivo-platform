/// Aivo Select/Dropdown Widget
///
/// Consistent dropdown styling across apps with grade-band awareness.
/// Aligned with web Select component (libs/ui-web/src/components/ui/select.tsx).
library;

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_theme.dart';

/// A select item with value and display content.
class AivoSelectItem<T> {
  const AivoSelectItem({
    required this.value,
    required this.label,
    this.icon,
    this.enabled = true,
  });

  /// The value of this item
  final T value;

  /// The display label
  final String label;

  /// Optional leading icon
  final IconData? icon;

  /// Whether this item can be selected
  final bool enabled;
}

/// Aivo styled dropdown/select with grade-band awareness.
///
/// Features:
/// - Grade-band specific border radius
/// - Consistent item styling
/// - Search/filter functionality (optional)
/// - Error state support
/// - Custom item builder support
///
/// Example:
/// ```dart
/// AivoSelect<String>(
///   label: 'Country',
///   hint: 'Select a country',
///   value: selectedCountry,
///   items: [
///     AivoSelectItem(value: 'us', label: 'United States'),
///     AivoSelectItem(value: 'uk', label: 'United Kingdom'),
///   ],
///   onChanged: (value) => setState(() => selectedCountry = value),
///   gradeBand: AivoGradeBand.k5,
/// )
/// ```
class AivoSelect<T> extends StatefulWidget {
  const AivoSelect({
    super.key,
    required this.items,
    this.value,
    this.onChanged,
    this.label,
    this.hint,
    this.helperText,
    this.errorText,
    this.gradeBand,
    this.enabled = true,
    this.searchable = false,
    this.searchHint,
    this.itemBuilder,
    this.selectedItemBuilder,
    this.leadingIcon,
  });

  /// List of selectable items
  final List<AivoSelectItem<T>> items;

  /// Currently selected value
  final T? value;

  /// Callback when selection changes
  final ValueChanged<T?>? onChanged;

  /// Label text above the select
  final String? label;

  /// Hint text when no selection
  final String? hint;

  /// Helper text below the select
  final String? helperText;

  /// Error text (overrides helper when present)
  final String? errorText;

  /// Grade band for styling
  final AivoGradeBand? gradeBand;

  /// Whether the select is enabled
  final bool enabled;

  /// Enable search/filter functionality
  final bool searchable;

  /// Search field hint text
  final String? searchHint;

  /// Custom item builder
  final Widget Function(BuildContext, AivoSelectItem<T>, bool isSelected)?
      itemBuilder;

  /// Custom selected item display builder
  final Widget Function(BuildContext, AivoSelectItem<T>)? selectedItemBuilder;

  /// Leading icon
  final IconData? leadingIcon;

  @override
  State<AivoSelect<T>> createState() => _AivoSelectState<T>();
}

class _AivoSelectState<T> extends State<AivoSelect<T>> {
  bool _isOpen = false;
  final LayerLink _layerLink = LayerLink();
  OverlayEntry? _overlayEntry;
  String _searchQuery = '';
  final FocusNode _focusNode = FocusNode();

  @override
  void dispose() {
    _removeOverlay();
    _focusNode.dispose();
    super.dispose();
  }

  /// Get border radius for grade band
  double _getBorderRadius() {
    return switch (widget.gradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusExplorerInput,
      AivoGradeBand.g6_8 => AivoBrand.radiusNavigatorInput,
      AivoGradeBand.g9_12 => AivoBrand.radiusScholarInput,
      null => AivoBrand.radiusSm,
    };
  }

  /// Get touch target for grade band
  double _getTouchTarget() {
    return switch (widget.gradeBand) {
      AivoGradeBand.k5 => AivoBrand.touchTargetExplorer,
      AivoGradeBand.g6_8 => AivoBrand.touchTargetNavigator,
      AivoGradeBand.g9_12 => AivoBrand.touchTargetScholar,
      null => AivoBrand.touchTargetNavigator,
    };
  }

  AivoSelectItem<T>? get _selectedItem {
    if (widget.value == null) return null;
    try {
      return widget.items.firstWhere((item) => item.value == widget.value);
    } catch (_) {
      return null;
    }
  }

  List<AivoSelectItem<T>> get _filteredItems {
    if (_searchQuery.isEmpty) return widget.items;
    return widget.items
        .where((item) =>
            item.label.toLowerCase().contains(_searchQuery.toLowerCase()))
        .toList();
  }

  void _toggleDropdown() {
    if (!widget.enabled) return;

    if (_isOpen) {
      _removeOverlay();
    } else {
      _showOverlay();
    }
  }

  void _showOverlay() {
    final overlay = Overlay.of(context);
    final renderBox = context.findRenderObject() as RenderBox;
    final size = renderBox.size;

    _overlayEntry = OverlayEntry(
      builder: (context) => _DropdownOverlay<T>(
        layerLink: _layerLink,
        width: size.width,
        items: _filteredItems,
        selectedValue: widget.value,
        borderRadius: _getBorderRadius(),
        searchable: widget.searchable,
        searchHint: widget.searchHint,
        itemBuilder: widget.itemBuilder,
        onSearchChanged: (query) {
          setState(() => _searchQuery = query);
          _overlayEntry?.markNeedsBuild();
        },
        onItemSelected: (item) {
          widget.onChanged?.call(item.value);
          _removeOverlay();
        },
        onDismiss: _removeOverlay,
      ),
    );

    overlay.insert(_overlayEntry!);
    setState(() => _isOpen = true);
  }

  void _removeOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
    _searchQuery = '';
    if (mounted) {
      setState(() => _isOpen = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;
    final borderRadius = _getBorderRadius();
    final touchTarget = _getTouchTarget();

    final borderColor = hasError
        ? colorScheme.error
        : _isOpen
            ? colorScheme.primary
            : colorScheme.outline;

    Widget trigger = CompositedTransformTarget(
      link: _layerLink,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: widget.enabled ? _toggleDropdown : null,
          borderRadius: BorderRadius.circular(borderRadius),
          focusNode: _focusNode,
          child: Container(
            constraints: BoxConstraints(minHeight: touchTarget),
            padding: EdgeInsets.symmetric(
              horizontal: AivoBrand.space4,
              vertical: AivoBrand.space2,
            ),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(borderRadius),
              border: Border.all(
                color: borderColor,
                width: _isOpen ? 2 : 1,
              ),
            ),
            child: Row(
              children: [
                if (widget.leadingIcon != null) ...[
                  Icon(
                    widget.leadingIcon,
                    size: 20,
                    color: widget.enabled
                        ? colorScheme.onSurfaceVariant
                        : colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: _selectedItem != null
                      ? widget.selectedItemBuilder != null
                          ? widget.selectedItemBuilder!(context, _selectedItem!)
                          : Text(
                              _selectedItem!.label,
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: widget.enabled
                                    ? colorScheme.onSurface
                                    : colorScheme.onSurface
                                        .withValues(alpha: 0.5),
                              ),
                            )
                      : Text(
                          widget.hint ?? '',
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                ),
                AnimatedRotation(
                  turns: _isOpen ? 0.5 : 0,
                  duration: AivoBrand.durationFast,
                  child: Icon(
                    Icons.keyboard_arrow_down,
                    size: 24,
                    color: widget.enabled
                        ? colorScheme.onSurfaceVariant
                        : colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    // Add opacity for disabled state
    if (!widget.enabled) {
      trigger = Opacity(opacity: 0.5, child: trigger);
    }

    // Wrap with label and helper/error text
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.label != null) ...[
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
        ],
        trigger,
        if (widget.errorText != null || widget.helperText != null) ...[
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              widget.errorText ?? widget.helperText!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: hasError
                    ? colorScheme.error
                    : colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// Dropdown overlay content
class _DropdownOverlay<T> extends StatefulWidget {
  const _DropdownOverlay({
    required this.layerLink,
    required this.width,
    required this.items,
    required this.selectedValue,
    required this.borderRadius,
    required this.searchable,
    required this.onSearchChanged,
    required this.onItemSelected,
    required this.onDismiss,
    this.searchHint,
    this.itemBuilder,
  });

  final LayerLink layerLink;
  final double width;
  final List<AivoSelectItem<T>> items;
  final T? selectedValue;
  final double borderRadius;
  final bool searchable;
  final String? searchHint;
  final Widget Function(BuildContext, AivoSelectItem<T>, bool)? itemBuilder;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<AivoSelectItem<T>> onItemSelected;
  final VoidCallback onDismiss;

  @override
  State<_DropdownOverlay<T>> createState() => _DropdownOverlayState<T>();
}

class _DropdownOverlayState<T> extends State<_DropdownOverlay<T>> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Stack(
      children: [
        // Dismiss layer
        Positioned.fill(
          child: GestureDetector(
            onTap: widget.onDismiss,
            behavior: HitTestBehavior.opaque,
            child: const SizedBox.expand(),
          ),
        ),
        // Dropdown content
        CompositedTransformFollower(
          link: widget.layerLink,
          showWhenUnlinked: false,
          offset: const Offset(0, 4),
          targetAnchor: Alignment.bottomLeft,
          followerAnchor: Alignment.topLeft,
          child: Material(
            elevation: 8,
            shadowColor: AivoBrand.navy[600]!.withValues(alpha: 0.16),
            borderRadius: BorderRadius.circular(widget.borderRadius),
            child: Container(
              width: widget.width,
              constraints: const BoxConstraints(maxHeight: 300),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(widget.borderRadius),
                border: Border.all(color: colorScheme.outline),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Search field
                  if (widget.searchable) ...[
                    Padding(
                      padding: const EdgeInsets.all(8),
                      child: TextField(
                        controller: _searchController,
                        onChanged: widget.onSearchChanged,
                        decoration: InputDecoration(
                          hintText: widget.searchHint ?? 'Search...',
                          prefixIcon:
                              const Icon(Icons.search, size: 20),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          border: OutlineInputBorder(
                            borderRadius:
                                BorderRadius.circular(widget.borderRadius),
                            borderSide: BorderSide(color: colorScheme.outline),
                          ),
                        ),
                        autofocus: true,
                      ),
                    ),
                    Divider(height: 1, color: colorScheme.outline),
                  ],
                  // Items list
                  Flexible(
                    child: widget.items.isEmpty
                        ? Padding(
                            padding: const EdgeInsets.all(16),
                            child: Text(
                              'No items found',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: colorScheme.onSurfaceVariant,
                              ),
                            ),
                          )
                        : ListView.builder(
                            shrinkWrap: true,
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            itemCount: widget.items.length,
                            itemBuilder: (context, index) {
                              final item = widget.items[index];
                              final isSelected =
                                  item.value == widget.selectedValue;

                              if (widget.itemBuilder != null) {
                                return InkWell(
                                  onTap: item.enabled
                                      ? () => widget.onItemSelected(item)
                                      : null,
                                  child: widget.itemBuilder!(
                                      context, item, isSelected),
                                );
                              }

                              return _DefaultSelectItem<T>(
                                item: item,
                                isSelected: isSelected,
                                onTap: () => widget.onItemSelected(item),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Default select item widget
class _DefaultSelectItem<T> extends StatelessWidget {
  const _DefaultSelectItem({
    required this.item,
    required this.isSelected,
    required this.onTap,
  });

  final AivoSelectItem<T> item;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return InkWell(
      onTap: item.enabled ? onTap : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? colorScheme.primary.withValues(alpha: 0.1)
              : Colors.transparent,
        ),
        child: Row(
          children: [
            if (item.icon != null) ...[
              Icon(
                item.icon,
                size: 20,
                color: item.enabled
                    ? colorScheme.onSurfaceVariant
                    : colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
              ),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Text(
                item.label,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: item.enabled
                      ? colorScheme.onSurface
                      : colorScheme.onSurface.withValues(alpha: 0.5),
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ),
            if (isSelected)
              Icon(
                Icons.check,
                size: 20,
                color: colorScheme.primary,
              ),
          ],
        ),
      ),
    );
  }
}
