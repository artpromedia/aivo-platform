/// Accessibility Preview
///
/// Interactive preview demonstrating all accessibility features.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../accessibility/accessibility_controller.dart';
import '../accessibility/accessibility_widgets.dart';
import '../theme/high_contrast_theme.dart';
import '../theme/grade_theme_controller.dart';
import '../ui/aivo_button.dart';
import '../ui/aivo_card.dart';

/// Preview page for accessibility features.
class AccessibilityPreview extends ConsumerWidget {
  const AccessibilityPreview({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final a11yState = ref.watch(accessibilityControllerProvider);
    final themeState = ref.watch(gradeThemeControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Accessibility Preview'),
        actions: [
          AivoAccessibilityBadge(
            onTap: () => _showAccessibilityPanel(context),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: AivoAccessibilityWrapper(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _StatusCard(a11yState: a11yState, themeState: themeState),
            const SizedBox(height: 24),
            const AivoAccessibilitySettingsPanel(showHeader: false),
            const SizedBox(height: 24),
            _FeaturePreviewSection(a11yState: a11yState),
            const SizedBox(height: 24),
            _ComponentTestSection(themeState: themeState),
            const SizedBox(height: 24),
            _ContrastTestSection(),
            const SizedBox(height: 24),
            _MotionTestSection(reducedMotion: a11yState.reducedMotion),
          ],
        ),
      ),
    );
  }

  void _showAccessibilityPanel(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(16),
          child: const AivoAccessibilitySettingsPanel(),
        ),
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.a11yState,
    required this.themeState,
  });

  final AivoAccessibilityState a11yState;
  final AivoThemeState themeState;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final enabledFeatures = <String>[];
    if (a11yState.highContrast) enabledFeatures.add('High Contrast');
    if (a11yState.dyslexia) enabledFeatures.add('Dyslexia Font');
    if (a11yState.reducedMotion) enabledFeatures.add('Reduced Motion');
    if (a11yState.largeText) enabledFeatures.add('Large Text');

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.accessibility_new,
                  color: colorScheme.primary,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Accessibility Status',
                        style: theme.textTheme.titleLarge,
                      ),
                      Text(
                        'Theme: ${themeState.themeLabel}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: enabledFeatures.isEmpty
                    ? colorScheme.surfaceContainerLow
                    : colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: enabledFeatures.isEmpty
                  ? Row(
                      children: [
                        Icon(
                          Icons.check_circle_outline,
                          color: colorScheme.onSurfaceVariant,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Using default settings',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    )
                  : Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: enabledFeatures
                          .map((f) => Chip(
                                label: Text(f),
                                backgroundColor: colorScheme.primary,
                                labelStyle: TextStyle(
                                  color: colorScheme.onPrimary,
                                  fontSize: 12,
                                ),
                                materialTapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                                visualDensity: VisualDensity.compact,
                              ))
                          .toList(),
                    ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Text Scale: ${(a11yState.effectiveTextScale * 100).round()}%',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                Text(
                  'Border Width: ${a11yState.highContrast ? "2x" : "1x"}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FeaturePreviewSection extends StatelessWidget {
  const _FeaturePreviewSection({required this.a11yState});

  final AivoAccessibilityState a11yState;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Feature Previews',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),

        // Dyslexia-friendly text preview
        _PreviewCard(
          title: 'Dyslexia-Friendly Text',
          enabled: a11yState.dyslexia,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Standard Text',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'The quick brown fox jumps over the lazy dog.',
                style: theme.textTheme.bodyLarge,
              ),
              const SizedBox(height: 12),
              Text(
                'Dyslexia-Friendly (Atkinson Hyperlegible)',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 4),
              AivoDyslexiaText(
                'The quick brown fox jumps over the lazy dog.',
                style: theme.textTheme.bodyLarge,
              ),
              if (a11yState.dyslexia) ...[
                const SizedBox(height: 8),
                Text(
                  'Letter spacing: ${(kDyslexiaLetterSpacing * 100).round()}%  •  '
                  'Word spacing: ${(kDyslexiaWordSpacing * 100).round()}%  •  '
                  'Line height: ${kDyslexiaLineHeightMultiplier}x',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 12),

        // High contrast preview
        _PreviewCard(
          title: 'High Contrast Borders',
          enabled: a11yState.highContrast,
          child: Row(
            children: [
              Expanded(
                child: Container(
                  height: 80,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: theme.colorScheme.outline,
                      width: 1,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      '1px border',
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: AivoHighContrastBorder(
                  normalWidth: 1,
                  color: theme.colorScheme.outline,
                  child: Container(
                    height: 80,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surface,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Text(
                        a11yState.highContrast ? '2px border' : '1px border',
                        style: theme.textTheme.bodySmall,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Large text preview
        _PreviewCard(
          title: 'Large Text Mode',
          enabled: a11yState.largeText,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Standard: 16px body text',
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Scaled: ${(16 * a11yState.effectiveTextScale).round()}px body text',
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontSize: 16 * a11yState.effectiveTextScale,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PreviewCard extends StatelessWidget {
  const _PreviewCard({
    required this.title,
    required this.enabled,
    required this.child,
  });

  final String title;
  final bool enabled;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      elevation: 0,
      color: colorScheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: enabled
              ? colorScheme.primary.withOpacity(0.5)
              : colorScheme.outline.withOpacity(0.2),
          width: enabled ? 2 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: enabled
                        ? colorScheme.primaryContainer
                        : colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    enabled ? 'Enabled' : 'Disabled',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: enabled
                          ? colorScheme.primary
                          : colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _ComponentTestSection extends ConsumerWidget {
  const _ComponentTestSection({required this.themeState});

  final AivoThemeState themeState;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Component Testing',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Verify components work with accessibility settings',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),

        // Buttons
        Text(
          'Buttons',
          style: theme.textTheme.labelLarge,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            AivoButton(
              label: 'Primary',
              onPressed: () {},
              gradeBand: themeState.gradeBand,
            ),
            AivoButton(
              label: 'Secondary',
              onPressed: () {},
              variant: AivoButtonVariant.secondary,
              gradeBand: themeState.gradeBand,
            ),
            AivoButton(
              label: 'Outline',
              onPressed: () {},
              variant: AivoButtonVariant.outline,
              gradeBand: themeState.gradeBand,
            ),
            AivoButton(
              label: 'Disabled',
              onPressed: null,
              gradeBand: themeState.gradeBand,
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Cards
        Text(
          'Cards',
          style: theme.textTheme.labelLarge,
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: AivoCard(
                gradeBand: themeState.gradeBand,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Standard Card',
                        style: theme.textTheme.titleSmall,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Check border visibility',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Input fields
        Text(
          'Input Fields',
          style: theme.textTheme.labelLarge,
        ),
        const SizedBox(height: 8),
        const TextField(
          decoration: InputDecoration(
            labelText: 'Test Input',
            hintText: 'Check border and focus states',
            prefixIcon: Icon(Icons.search),
          ),
        ),
      ],
    );
  }
}

class _ContrastTestSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Contrast Testing',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'WCAG 2.1 AA requires 4.5:1 contrast for normal text',
          style: theme.textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),

        _ContrastPair(
          label: 'Primary on Surface',
          foreground: colorScheme.primary,
          background: colorScheme.surface,
        ),
        const SizedBox(height: 8),
        _ContrastPair(
          label: 'Text Primary on Surface',
          foreground: colorScheme.onSurface,
          background: colorScheme.surface,
        ),
        const SizedBox(height: 8),
        _ContrastPair(
          label: 'Text Secondary on Surface',
          foreground: colorScheme.onSurfaceVariant,
          background: colorScheme.surface,
        ),
        const SizedBox(height: 8),
        _ContrastPair(
          label: 'On Primary',
          foreground: colorScheme.onPrimary,
          background: colorScheme.primary,
        ),
      ],
    );
  }
}

class _ContrastPair extends StatelessWidget {
  const _ContrastPair({
    required this.label,
    required this.foreground,
    required this.background,
  });

  final String label;
  final Color foreground;
  final Color background;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ratio = HighContrastUtils.contrastRatio(foreground, background);
    final passesAA = ratio >= 4.5;
    final passesAAA = ratio >= 7.0;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: theme.colorScheme.outline.withOpacity(0.2),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: foreground,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: passesAA
                  ? Colors.green.withOpacity(0.2)
                  : Colors.red.withOpacity(0.2),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  passesAA ? Icons.check : Icons.close,
                  size: 14,
                  color: passesAA ? Colors.green : Colors.red,
                ),
                const SizedBox(width: 4),
                Text(
                  '${ratio.toStringAsFixed(1)}:1',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: passesAA ? Colors.green : Colors.red,
                  ),
                ),
                if (passesAAA) ...[
                  const SizedBox(width: 4),
                  const Text(
                    'AAA',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                ] else if (passesAA) ...[
                  const SizedBox(width: 4),
                  const Text(
                    'AA',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MotionTestSection extends StatefulWidget {
  const _MotionTestSection({required this.reducedMotion});

  final bool reducedMotion;

  @override
  State<_MotionTestSection> createState() => _MotionTestSectionState();
}

class _MotionTestSectionState extends State<_MotionTestSection>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  bool _isAnimating = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggleAnimation() {
    setState(() {
      _isAnimating = !_isAnimating;
      if (_isAnimating) {
        _controller.repeat(reverse: true);
      } else {
        _controller.stop();
        _controller.reset();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final effectiveDuration = widget.reducedMotion
        ? Duration.zero
        : const Duration(milliseconds: 1000);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Motion Testing',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          widget.reducedMotion
              ? 'Reduced motion is ON - animations disabled'
              : 'Animations are enabled',
          style: theme.textTheme.bodySmall?.copyWith(
            color: widget.reducedMotion
                ? colorScheme.error
                : colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),

        Card(
          elevation: 0,
          color: colorScheme.surfaceContainerLow,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: AnimatedBuilder(
                        animation: _controller,
                        builder: (context, child) {
                          return Transform.translate(
                            offset: widget.reducedMotion
                                ? Offset.zero
                                : Offset(
                                    50 * _controller.value,
                                    0,
                                  ),
                            child: Container(
                              width: 60,
                              height: 60,
                              decoration: BoxDecoration(
                                color: colorScheme.primary,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                Icons.animation,
                                color: colorScheme.onPrimary,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    ElevatedButton(
                      onPressed: _toggleAnimation,
                      child: Text(_isAnimating ? 'Stop' : 'Start Animation'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  widget.reducedMotion
                      ? 'Animation disabled - element stays still'
                      : 'Animation running normally',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Effective duration: ${effectiveDuration.inMilliseconds}ms',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
