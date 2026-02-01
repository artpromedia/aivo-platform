import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_theme.dart';
import '../ui/aivo_button.dart';

/// A widget that displays a preview of all button variants and sizes.
///
/// Useful for design system galleries and visual verification of button
/// styling across platforms.
class ButtonPreview extends StatelessWidget {
  const ButtonPreview({
    super.key,
    this.band = AivoGradeBand.k5,
  });

  /// The grade band to display buttons for.
  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _ButtonHeader(band: band),
        const SizedBox(height: 24),

        // Variants section
        _SectionHeader(title: 'Variants'),
        const SizedBox(height: 12),
        _VariantsSection(band: band),
        const SizedBox(height: 32),

        // Sizes section
        _SectionHeader(title: 'Sizes'),
        const SizedBox(height: 12),
        _SizesSection(band: band),
        const SizedBox(height: 32),

        // States section
        _SectionHeader(title: 'States'),
        const SizedBox(height: 12),
        _StatesSection(band: band),
        const SizedBox(height: 32),

        // Icon buttons section
        _SectionHeader(title: 'Icon Buttons'),
        const SizedBox(height: 12),
        _IconButtonsSection(band: band),
        const SizedBox(height: 32),

        // Animation info
        _AnimationInfoSection(band: band),
      ],
    );
  }
}

class _ButtonHeader extends StatelessWidget {
  const _ButtonHeader({required this.band});

  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bandLabel = _getBandLabel(band);
    final touchTarget = _getTouchTarget(band);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(AivoBrand.radiusMd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Button Component',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$bandLabel • Touch target: ${touchTarget.toInt()}px',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  String _getBandLabel(AivoGradeBand band) {
    return switch (band) {
      AivoGradeBand.k5 => 'Explorer (Pre-K–5)',
      AivoGradeBand.g6_8 => 'Navigator (6-8)',
      AivoGradeBand.g9_12 => 'Scholar (9-12)',
    };
  }

  double _getTouchTarget(AivoGradeBand band) {
    return switch (band) {
      AivoGradeBand.k5 => AivoBrand.touchTargetExplorer,
      AivoGradeBand.g6_8 => AivoBrand.touchTargetNavigator,
      AivoGradeBand.g9_12 => AivoBrand.touchTargetScholar,
    };
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
    );
  }
}

class _VariantsSection extends StatelessWidget {
  const _VariantsSection({required this.band});

  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _ButtonSample(
          label: 'Primary',
          variant: AivoButtonVariant.primary,
          band: band,
        ),
        _ButtonSample(
          label: 'Secondary',
          variant: AivoButtonVariant.secondary,
          band: band,
        ),
        _ButtonSample(
          label: 'Ghost',
          variant: AivoButtonVariant.ghost,
          band: band,
        ),
        _ButtonSample(
          label: 'Outline',
          variant: AivoButtonVariant.outline,
          band: band,
        ),
        _ButtonSample(
          label: 'Destructive',
          variant: AivoButtonVariant.destructive,
          band: band,
        ),
        _ButtonSample(
          label: 'Success',
          variant: AivoButtonVariant.success,
          band: band,
        ),
      ],
    );
  }
}

class _SizesSection extends StatelessWidget {
  const _SizesSection({required this.band});

  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        AivoButton(
          label: 'Small',
          size: AivoButtonSize.sm,
          onPressed: () {},
          gradeBand: band,
        ),
        const SizedBox(width: 12),
        AivoButton(
          label: 'Medium',
          size: AivoButtonSize.md,
          onPressed: () {},
          gradeBand: band,
        ),
        const SizedBox(width: 12),
        AivoButton(
          label: 'Large',
          size: AivoButtonSize.lg,
          onPressed: () {},
          gradeBand: band,
        ),
      ],
    );
  }
}

class _StatesSection extends StatelessWidget {
  const _StatesSection({required this.band});

  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            AivoButton(
              label: 'Normal',
              onPressed: () {},
              gradeBand: band,
            ),
            AivoButton(
              label: 'Loading',
              isLoading: true,
              onPressed: () {},
              gradeBand: band,
            ),
            AivoButton(
              label: 'Disabled',
              enabled: false,
              onPressed: () {},
              gradeBand: band,
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          'Hover and press the buttons above to see grade-band specific animations',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontStyle: FontStyle.italic,
              ),
        ),
      ],
    );
  }
}

class _IconButtonsSection extends StatelessWidget {
  const _IconButtonsSection({required this.band});

  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        AivoButton.iconButton(
          icon: Icons.add,
          onPressed: () {},
          gradeBand: band,
          tooltip: 'Add',
        ),
        AivoButton.iconButton(
          icon: Icons.edit,
          onPressed: () {},
          variant: AivoButtonVariant.outline,
          gradeBand: band,
          tooltip: 'Edit',
        ),
        AivoButton.iconButton(
          icon: Icons.delete,
          onPressed: () {},
          variant: AivoButtonVariant.destructive,
          gradeBand: band,
          tooltip: 'Delete',
        ),
        AivoButton.iconButton(
          icon: Icons.check,
          onPressed: () {},
          variant: AivoButtonVariant.success,
          gradeBand: band,
          tooltip: 'Confirm',
        ),
        AivoButton.iconButton(
          icon: Icons.settings,
          enabled: false,
          onPressed: () {},
          gradeBand: band,
          tooltip: 'Settings (disabled)',
        ),
      ],
    );
  }
}

class _AnimationInfoSection extends StatelessWidget {
  const _AnimationInfoSection({required this.band});

  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (hoverScale, pressScale, duration) = _getAnimationConfig(band);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AivoBrand.radiusMd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Animation Configuration',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          _AnimationRow(label: 'Hover scale', value: '${hoverScale}x'),
          _AnimationRow(label: 'Press scale', value: '${pressScale}x'),
          _AnimationRow(label: 'Duration', value: '${duration}ms'),
        ],
      ),
    );
  }

  (double, double, int) _getAnimationConfig(AivoGradeBand band) {
    return switch (band) {
      AivoGradeBand.k5 => (1.05, 0.95, 250),
      AivoGradeBand.g6_8 => (1.02, 0.98, 200),
      AivoGradeBand.g9_12 => (1.01, 0.99, 150),
    };
  }
}

class _AnimationRow extends StatelessWidget {
  const _AnimationRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  fontFamily: 'monospace',
                ),
          ),
        ],
      ),
    );
  }
}

class _ButtonSample extends StatelessWidget {
  const _ButtonSample({
    required this.label,
    required this.variant,
    required this.band,
  });

  final String label;
  final AivoButtonVariant variant;
  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    return AivoButton(
      label: label,
      variant: variant,
      onPressed: () {},
      gradeBand: band,
    );
  }
}

/// Interactive button comparison widget for design system gallery.
class ButtonComparisonScreen extends StatefulWidget {
  const ButtonComparisonScreen({super.key});

  @override
  State<ButtonComparisonScreen> createState() => _ButtonComparisonScreenState();
}

class _ButtonComparisonScreenState extends State<ButtonComparisonScreen> {
  AivoGradeBand _selectedBand = AivoGradeBand.k5;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Button Preview'),
      ),
      body: Column(
        children: [
          // Grade band selector
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Grade Band',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 8),
                SegmentedButton<AivoGradeBand>(
                  segments: const [
                    ButtonSegment(
                      value: AivoGradeBand.k5,
                      label: Text('Explorer'),
                    ),
                    ButtonSegment(
                      value: AivoGradeBand.g6_8,
                      label: Text('Navigator'),
                    ),
                    ButtonSegment(
                      value: AivoGradeBand.g9_12,
                      label: Text('Scholar'),
                    ),
                  ],
                  selected: {_selectedBand},
                  onSelectionChanged: (value) {
                    setState(() => _selectedBand = value.first);
                  },
                ),
              ],
            ),
          ),
          const Divider(),
          // Button preview
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: ButtonPreview(band: _selectedBand),
            ),
          ),
        ],
      ),
    );
  }
}
