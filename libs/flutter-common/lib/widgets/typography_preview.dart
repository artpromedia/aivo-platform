import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_theme.dart';

/// A widget that displays a preview of all typography styles for the current theme.
///
/// Useful for design system galleries and visual verification of typography
/// alignment across platforms.
class TypographyPreview extends StatelessWidget {
  const TypographyPreview({
    super.key,
    this.band = AivoGradeBand.k5,
    this.mode = AivoTypographyMode.standard,
  });

  /// The grade band to display typography for.
  final AivoGradeBand band;

  /// The typography mode (standard, dyslexia-friendly, large text).
  final AivoTypographyMode mode;

  @override
  Widget build(BuildContext context) {
    final spec = typographyForBand(band);
    final effectiveSpec = (mode == AivoTypographyMode.largeText ||
            mode == AivoTypographyMode.dyslexiaFriendlyLarge)
        ? spec.scaled(largeTextScaleFactor)
        : spec;

    final useDyslexiaFont = mode == AivoTypographyMode.dyslexiaFriendly ||
        mode == AivoTypographyMode.dyslexiaFriendlyLarge;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _TypographyHeader(band: band, mode: mode),
        const SizedBox(height: 16),
        _TypographySample(
          name: 'Display',
          fontSize: effectiveSpec.displaySize,
          lineHeight: effectiveSpec.displayLineHeight,
          fontWeight: FontWeight.w800,
          useDyslexiaFont: useDyslexiaFont,
          sampleText: 'Display Text',
        ),
        _TypographySample(
          name: 'Headline',
          fontSize: effectiveSpec.headlineSize,
          lineHeight: effectiveSpec.headlineLineHeight,
          fontWeight: FontWeight.w800,
          useDyslexiaFont: useDyslexiaFont,
          sampleText: 'Headline Text',
        ),
        _TypographySample(
          name: 'Title',
          fontSize: effectiveSpec.titleSize,
          lineHeight: effectiveSpec.titleLineHeight,
          fontWeight: FontWeight.w700,
          useDyslexiaFont: useDyslexiaFont,
          sampleText: 'Title Text',
        ),
        _TypographySample(
          name: 'Body',
          fontSize: effectiveSpec.bodySize,
          lineHeight: effectiveSpec.bodyLineHeight,
          fontWeight: FontWeight.w400,
          useDyslexiaFont: useDyslexiaFont,
          sampleText:
              'Body text for paragraphs and longer content. This is a sample showing how body copy will appear in the application.',
        ),
        _TypographySample(
          name: 'Label',
          fontSize: effectiveSpec.labelSize,
          lineHeight: effectiveSpec.labelLineHeight,
          fontWeight: FontWeight.w600,
          useDyslexiaFont: useDyslexiaFont,
          sampleText: 'Label Text',
        ),
        _TypographySample(
          name: 'Caption',
          fontSize: effectiveSpec.captionSize,
          lineHeight: effectiveSpec.captionLineHeight,
          fontWeight: FontWeight.w500,
          useDyslexiaFont: useDyslexiaFont,
          sampleText: 'Caption text for supplementary information',
        ),
      ],
    );
  }
}

class _TypographyHeader extends StatelessWidget {
  const _TypographyHeader({
    required this.band,
    required this.mode,
  });

  final AivoGradeBand band;
  final AivoTypographyMode mode;

  String get _bandLabel {
    switch (band) {
      case AivoGradeBand.k5:
        return 'Explorer (Pre-K–5)';
      case AivoGradeBand.g6_8:
        return 'Navigator (6-8)';
      case AivoGradeBand.g9_12:
        return 'Scholar (9-12)';
    }
  }

  String get _modeLabel {
    switch (mode) {
      case AivoTypographyMode.standard:
        return 'Standard';
      case AivoTypographyMode.dyslexiaFriendly:
        return 'Dyslexia-Friendly';
      case AivoTypographyMode.largeText:
        return 'Large Text (1.2x)';
      case AivoTypographyMode.dyslexiaFriendlyLarge:
        return 'Dyslexia + Large';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AivoBrand.primary[50],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _bandLabel,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AivoBrand.primary[700],
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Mode: $_modeLabel',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AivoBrand.primary[600],
                      ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AivoBrand.primary[100],
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              mode == AivoTypographyMode.dyslexiaFriendly ||
                      mode == AivoTypographyMode.dyslexiaFriendlyLarge
                  ? 'Atkinson'
                  : 'Nunito',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AivoBrand.primary[700],
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TypographySample extends StatelessWidget {
  const _TypographySample({
    required this.name,
    required this.fontSize,
    required this.lineHeight,
    required this.fontWeight,
    required this.useDyslexiaFont,
    required this.sampleText,
  });

  final String name;
  final double fontSize;
  final double lineHeight;
  final FontWeight fontWeight;
  final bool useDyslexiaFont;
  final String sampleText;

  @override
  Widget build(BuildContext context) {
    final letterSpacing =
        useDyslexiaFont ? fontSize * AivoBrand.dyslexiaLetterSpacingEm : null;
    final wordSpacing =
        useDyslexiaFont ? fontSize * AivoBrand.dyslexiaWordSpacingEm : null;

    final baseStyle = useDyslexiaFont
        ? GoogleFonts.atkinsonHyperlegible(
            fontSize: fontSize,
            fontWeight: fontWeight,
            height: lineHeight / fontSize,
            letterSpacing: letterSpacing,
            wordSpacing: wordSpacing,
          )
        : GoogleFonts.nunito(
            fontSize: fontSize,
            fontWeight: fontWeight,
            height: lineHeight / fontSize,
          );

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AivoBrand.gray[100],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  name,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AivoBrand.gray[700],
                      ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${fontSize.toInt()}px / ${lineHeight.toInt()}px',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AivoBrand.gray[500],
                    ),
              ),
              const SizedBox(width: 8),
              Text(
                'w${fontWeight.value}',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AivoBrand.gray[400],
                    ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(sampleText, style: baseStyle),
          const Divider(height: 24),
        ],
      ),
    );
  }
}

/// Interactive typography comparison widget for design system gallery.
class TypographyComparisonScreen extends StatefulWidget {
  const TypographyComparisonScreen({super.key});

  @override
  State<TypographyComparisonScreen> createState() =>
      _TypographyComparisonScreenState();
}

class _TypographyComparisonScreenState
    extends State<TypographyComparisonScreen> {
  AivoGradeBand _selectedBand = AivoGradeBand.k5;
  AivoTypographyMode _selectedMode = AivoTypographyMode.standard;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Typography Preview'),
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
                const SizedBox(height: 16),
                Text(
                  'Typography Mode',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: AivoTypographyMode.values.map((mode) {
                    return FilterChip(
                      label: Text(_modeLabel(mode)),
                      selected: _selectedMode == mode,
                      onSelected: (selected) {
                        if (selected) {
                          setState(() => _selectedMode = mode);
                        }
                      },
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          const Divider(),
          // Typography preview
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: TypographyPreview(
                band: _selectedBand,
                mode: _selectedMode,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _modeLabel(AivoTypographyMode mode) {
    switch (mode) {
      case AivoTypographyMode.standard:
        return 'Standard';
      case AivoTypographyMode.dyslexiaFriendly:
        return 'Dyslexia';
      case AivoTypographyMode.largeText:
        return 'Large (1.2x)';
      case AivoTypographyMode.dyslexiaFriendlyLarge:
        return 'Dyslexia + Large';
    }
  }
}
