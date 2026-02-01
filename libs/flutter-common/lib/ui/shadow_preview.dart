/// Shadow System Preview Gallery
///
/// Interactive demonstration of all shadow variants and elevation levels.
library;

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_shadows.dart';
import '../theme/aivo_theme.dart';

/// Preview gallery for shadow system.
class ShadowPreview extends StatelessWidget {
  const ShadowPreview({super.key, this.gradeBand});

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Shadow System'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _SectionHeader(title: 'Elevation Levels'),
          _ElevationDemo(gradeBand: gradeBand),
          const SizedBox(height: 32),
          _SectionHeader(title: 'Hover States'),
          _HoverDemo(gradeBand: gradeBand),
          const SizedBox(height: 32),
          _SectionHeader(title: 'Grade-Band Card Shadows'),
          _GradeBandDemo(),
          const SizedBox(height: 32),
          _SectionHeader(title: 'Colored Shadows'),
          _ColoredShadowDemo(),
          const SizedBox(height: 32),
          _SectionHeader(title: 'Dark Mode Shadows'),
          _DarkModeDemo(),
          const SizedBox(height: 32),
          _SectionHeader(title: 'Special Effects'),
          _SpecialEffectsDemo(),
          const SizedBox(height: 48),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            height: 2,
            width: 48,
            color: theme.colorScheme.primary,
          ),
        ],
      ),
    );
  }
}

class _ElevationDemo extends StatelessWidget {
  const _ElevationDemo({this.gradeBand});

  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _ShadowCard(
            label: 'Level 0',
            sublabel: 'None',
            shadow: AivoShadows.none,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _ShadowCard(
            label: 'Level 1',
            sublabel: 'Soft',
            shadow: AivoShadows.soft,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _ShadowCard(
            label: 'Level 2',
            sublabel: 'Raised',
            shadow: AivoShadows.raised,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _ShadowCard(
            label: 'Level 3',
            sublabel: 'Elevated',
            shadow: AivoShadows.elevated,
          ),
        ),
      ],
    );
  }
}

class _HoverDemo extends StatelessWidget {
  const _HoverDemo({this.gradeBand});

  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Interactive cards that transition on hover/tap:'),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _InteractiveShadowCard(
                label: 'Soft → Soft Hover',
                restShadow: AivoShadows.soft,
                hoverShadow: AivoShadows.softHover,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _InteractiveShadowCard(
                label: 'Soft → Raised',
                restShadow: AivoShadows.soft,
                hoverShadow: AivoShadows.raised,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _InteractiveShadowCard(
                label: 'Raised → Elevated',
                restShadow: AivoShadows.raised,
                hoverShadow: AivoShadows.elevated,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _GradeBandDemo extends StatelessWidget {
  const _GradeBandDemo();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Each grade band has unique shadow styling:'),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _InteractiveShadowCard(
                label: 'Explorer (K-5)',
                sublabel: 'Coral tint',
                restShadow: AivoShadows.cardExplorer,
                hoverShadow: AivoShadows.cardExplorerHover,
                accentColor: AivoBrand.coral,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _InteractiveShadowCard(
                label: 'Navigator (6-8)',
                sublabel: 'Teal tint',
                restShadow: AivoShadows.cardNavigator,
                hoverShadow: AivoShadows.cardNavigatorHover,
                accentColor: AivoBrand.teal,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _InteractiveShadowCard(
                label: 'Scholar (9-12)',
                sublabel: 'Navy tint',
                restShadow: AivoShadows.cardScholar,
                hoverShadow: AivoShadows.cardScholarHover,
                accentColor: AivoBrand.navy,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _ColoredShadowDemo extends StatelessWidget {
  const _ColoredShadowDemo();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Colored shadows for buttons and emphasis:'),
        const SizedBox(height: 16),
        Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            _ColoredButton(
              label: 'Primary',
              color: AivoBrand.primary,
              shadow: AivoShadows.primary,
              hoverShadow: AivoShadows.primaryHover,
            ),
            _ColoredButton(
              label: 'Coral/CTA',
              color: AivoBrand.coral,
              shadow: AivoShadows.coral,
              hoverShadow: AivoShadows.coralHover,
            ),
            _ColoredButton(
              label: 'Teal',
              color: AivoBrand.teal,
              shadow: AivoShadows.teal,
              hoverShadow: AivoShadows.tealHover,
            ),
            _ColoredButton(
              label: 'Success',
              color: AivoBrand.success,
              shadow: AivoShadows.success,
              hoverShadow: AivoShadows.success,
            ),
            _ColoredButton(
              label: 'Warning',
              color: AivoBrand.warning,
              shadow: AivoShadows.warning,
              hoverShadow: AivoShadows.warning,
            ),
            _ColoredButton(
              label: 'Error',
              color: AivoBrand.error,
              shadow: AivoShadows.error,
              hoverShadow: AivoShadows.error,
            ),
            _ColoredButton(
              label: 'Info',
              color: AivoBrand.info,
              shadow: AivoShadows.info,
              hoverShadow: AivoShadows.info,
            ),
          ],
        ),
      ],
    );
  }
}

class _DarkModeDemo extends StatelessWidget {
  const _DarkModeDemo();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Dark mode shadows use deeper opacity for visibility:'),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF18181B), // Dark surface
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              Expanded(
                child: _ShadowCard(
                  label: 'Soft Dark',
                  shadow: AivoShadows.softDark,
                  isDarkMode: true,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _ShadowCard(
                  label: 'Raised Dark',
                  shadow: AivoShadows.raisedDark,
                  isDarkMode: true,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _ShadowCard(
                  label: 'Elevated Dark',
                  shadow: AivoShadows.elevatedDark,
                  isDarkMode: true,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SpecialEffectsDemo extends StatelessWidget {
  const _SpecialEffectsDemo();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Special shadow effects:'),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: Container(
                height: 100,
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: AivoShadows.focusRing(theme.colorScheme.primary),
                ),
                child: const Center(
                  child: Text('Focus Ring'),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Container(
                height: 100,
                decoration: BoxDecoration(
                  color: AivoBrand.primary,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: AivoShadows.glow(AivoBrand.primary),
                ),
                child: const Center(
                  child: Text(
                    'Glow Effect',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Container(
                height: 100,
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: AivoShadows.inset,
                ),
                child: const Center(
                  child: Text('Inset Shadow'),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _ShadowCard extends StatelessWidget {
  const _ShadowCard({
    required this.label,
    this.sublabel,
    required this.shadow,
    this.isDarkMode = false,
  });

  final String label;
  final String? sublabel;
  final List<BoxShadow> shadow;
  final bool isDarkMode;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bgColor = isDarkMode ? const Color(0xFF27272A) : theme.colorScheme.surface;
    final textColor = isDarkMode ? Colors.white : theme.colorScheme.onSurface;

    return Container(
      height: 100,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        boxShadow: shadow,
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
            ),
            if (sublabel != null) ...[
              const SizedBox(height: 4),
              Text(
                sublabel!,
                style: TextStyle(
                  fontSize: 12,
                  color: textColor.withValues(alpha: 0.6),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InteractiveShadowCard extends StatefulWidget {
  const _InteractiveShadowCard({
    required this.label,
    this.sublabel,
    required this.restShadow,
    required this.hoverShadow,
    this.accentColor,
  });

  final String label;
  final String? sublabel;
  final List<BoxShadow> restShadow;
  final List<BoxShadow> hoverShadow;
  final Color? accentColor;

  @override
  State<_InteractiveShadowCard> createState() => _InteractiveShadowCardState();
}

class _InteractiveShadowCardState extends State<_InteractiveShadowCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onHover(bool isHovered) {
    if (isHovered) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return MouseRegion(
      onEnter: (_) => _onHover(true),
      onExit: (_) => _onHover(false),
      child: GestureDetector(
        onTapDown: (_) => _onHover(true),
        onTapUp: (_) => _onHover(false),
        onTapCancel: () => _onHover(false),
        child: AnimatedBuilder(
          animation: _animation,
          builder: (context, child) {
            final shadow = AivoShadows.lerp(
              widget.restShadow,
              widget.hoverShadow,
              _animation.value,
            );

            return Container(
              height: 100,
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                boxShadow: shadow,
                border: widget.accentColor != null
                    ? Border.all(
                        color: widget.accentColor!.withValues(
                          alpha: 0.2 + (_animation.value * 0.2),
                        ),
                        width: 1,
                      )
                    : null,
              ),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      widget.label,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: widget.accentColor ?? theme.colorScheme.onSurface,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (widget.sublabel != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        widget.sublabel!,
                        style: TextStyle(
                          fontSize: 12,
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ColoredButton extends StatefulWidget {
  const _ColoredButton({
    required this.label,
    required this.color,
    required this.shadow,
    required this.hoverShadow,
  });

  final String label;
  final Color color;
  final List<BoxShadow> shadow;
  final List<BoxShadow> hoverShadow;

  @override
  State<_ColoredButton> createState() => _ColoredButtonState();
}

class _ColoredButtonState extends State<_ColoredButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onHover(bool isHovered) {
    if (isHovered) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => _onHover(true),
      onExit: (_) => _onHover(false),
      child: GestureDetector(
        onTapDown: (_) => _onHover(true),
        onTapUp: (_) => _onHover(false),
        onTapCancel: () => _onHover(false),
        child: AnimatedBuilder(
          animation: _animation,
          builder: (context, child) {
            final shadow = AivoShadows.lerp(
              widget.shadow,
              widget.hoverShadow,
              _animation.value,
            );

            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: widget.color,
                borderRadius: BorderRadius.circular(12),
                boxShadow: shadow,
              ),
              child: Text(
                widget.label,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
