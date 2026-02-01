import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_theme.dart';
import '../ui/aivo_card.dart';

/// A widget that displays a preview of all card variants and styles.
///
/// Useful for design system galleries and visual verification of card
/// styling across platforms.
class CardPreview extends StatelessWidget {
  const CardPreview({
    super.key,
    this.band = AivoGradeBand.k5,
  });

  /// The grade band to display cards for.
  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _CardHeader(band: band),
        const SizedBox(height: 24),

        // Variants section
        _SectionHeader(title: 'Variants'),
        const SizedBox(height: 12),
        _VariantsSection(band: band),
        const SizedBox(height: 32),

        // Interactive cards section
        _SectionHeader(title: 'Interactive Cards'),
        const SizedBox(height: 12),
        _InteractiveSection(band: band),
        const SizedBox(height: 32),

        // Card with sub-components section
        _SectionHeader(title: 'Card Structure'),
        const SizedBox(height: 12),
        _StructuredCardSection(band: band),
        const SizedBox(height: 32),

        // Preset cards section
        _SectionHeader(title: 'Preset Cards'),
        const SizedBox(height: 12),
        _PresetCardsSection(band: band),
        const SizedBox(height: 32),

        // Animation info
        _AnimationInfoSection(band: band),
      ],
    );
  }
}

class _CardHeader extends StatelessWidget {
  const _CardHeader({required this.band});

  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bandLabel = _getBandLabel(band);
    final borderRadius = _getBorderRadius(band);

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
            'Card Component',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$bandLabel • Border radius: ${borderRadius.toInt()}px',
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

  double _getBorderRadius(AivoGradeBand band) {
    return switch (band) {
      AivoGradeBand.k5 => AivoBrand.radiusExplorerCard,
      AivoGradeBand.g6_8 => AivoBrand.radiusNavigatorCard,
      AivoGradeBand.g9_12 => AivoBrand.radiusScholarCard,
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
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _VariantCard(
                label: 'Standard',
                description: 'Soft shadow',
                variant: AivoCardVariant.standard,
                band: band,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _VariantCard(
                label: 'Elevated',
                description: 'Raised shadow',
                variant: AivoCardVariant.elevated,
                band: band,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _VariantCard(
                label: 'Outlined',
                description: '1px border',
                variant: AivoCardVariant.outlined,
                band: band,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _VariantCard(
                label: 'Filled',
                description: 'Tinted background',
                variant: AivoCardVariant.filled,
                band: band,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _VariantCard extends StatelessWidget {
  const _VariantCard({
    required this.label,
    required this.description,
    required this.variant,
    required this.band,
  });

  final String label;
  final String description;
  final AivoCardVariant variant;
  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AivoCard(
      variant: variant,
      gradeBand: band,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            description,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _InteractiveSection extends StatelessWidget {
  const _InteractiveSection({required this.band});

  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AivoCard(
          variant: AivoCardVariant.standard,
          gradeBand: band,
          onTap: () {},
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Interactive Card',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Hover to see shadow increase, press to see scale effect',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Tap the card above to see the ripple effect',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            fontStyle: FontStyle.italic,
          ),
        ),
      ],
    );
  }
}

class _StructuredCardSection extends StatelessWidget {
  const _StructuredCardSection({required this.band});

  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AivoCard(
      variant: AivoCardVariant.standard,
      gradeBand: band,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CardHeader(
            leading: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AivoBrand.radiusMd),
              ),
              child: Icon(
                Icons.star,
                color: theme.colorScheme.primary,
                size: 24,
              ),
            ),
            title: const CardTitle('Card Title'),
            subtitle: const CardDescription('Card description goes here'),
            trailing: IconButton(
              icon: const Icon(Icons.more_vert),
              onPressed: () {},
            ),
          ),
          const Divider(height: 1),
          const CardContent(
            child: Text(
              'This demonstrates the card structure with CardHeader, CardContent, and CardFooter sub-components matching the web implementation.',
            ),
          ),
          CardFooter(
            alignment: MainAxisAlignment.end,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextButton(
                  onPressed: () {},
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: () {},
                  child: const Text('Confirm'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PresetCardsSection extends StatelessWidget {
  const _PresetCardsSection({required this.band});

  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Info card
        AivoInfoCard(
          title: 'Info Card',
          subtitle: 'With icon, title, and subtitle',
          icon: Icons.info_outline,
          onTap: () {},
          gradeBand: band,
        ),
        const SizedBox(height: 12),

        // Stat cards row
        Row(
          children: [
            Expanded(
              child: AivoStatCard(
                label: 'Total',
                value: '1,234',
                icon: Icons.analytics,
                trend: '+12%',
                trendPositive: true,
                gradeBand: band,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AivoStatCard(
                label: 'Active',
                value: '567',
                icon: Icons.person,
                trend: '-3%',
                trendPositive: false,
                gradeBand: band,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Action card
        AivoActionCard(
          title: 'Action Card',
          subtitle: 'Card with action button',
          icon: Icons.rocket_launch,
          actionLabel: 'Get Started',
          onAction: () {},
          gradeBand: band,
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
          const SizedBox(height: 12),
          Text(
            'Shadow Levels',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          _AnimationRow(
              label: 'Soft', value: '0 4px 16px rgba(26,26,46,0.08)'),
          _AnimationRow(
              label: 'Raised', value: '0 8px 24px rgba(26,26,46,0.12)'),
          _AnimationRow(
              label: 'Elevated', value: '0 12px 32px rgba(26,26,46,0.16)'),
        ],
      ),
    );
  }

  (double, double, int) _getAnimationConfig(AivoGradeBand band) {
    return switch (band) {
      AivoGradeBand.k5 => (1.02, 0.98, 250),
      AivoGradeBand.g6_8 => (1.01, 0.99, 200),
      AivoGradeBand.g9_12 => (1.005, 0.995, 150),
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
          Flexible(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    fontFamily: 'monospace',
                  ),
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
    );
  }
}

/// Interactive card comparison widget for design system gallery.
class CardComparisonScreen extends StatefulWidget {
  const CardComparisonScreen({super.key});

  @override
  State<CardComparisonScreen> createState() => _CardComparisonScreenState();
}

class _CardComparisonScreenState extends State<CardComparisonScreen> {
  AivoGradeBand _selectedBand = AivoGradeBand.k5;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Card Preview'),
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
          // Card preview
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: CardPreview(band: _selectedBand),
            ),
          ),
        ],
      ),
    );
  }
}
