/// Dark Mode Preview
///
/// Interactive preview demonstrating the dark mode system alignment.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../theme/aivo_theme.dart';
import '../theme/aivo_theme_widgets.dart';
import '../theme/grade_theme_controller.dart';
import '../ui/aivo_button.dart';
import '../ui/aivo_card.dart';

/// Preview page for the dark mode system.
class DarkModePreview extends ConsumerWidget {
  const DarkModePreview({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeState = ref.watch(gradeThemeControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dark Mode Preview'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 16),
            child: AivoDarkModeIconButton(showWhenDisabled: true),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _InfoCard(themeState: themeState),
          const SizedBox(height: 24),
          _ThemeSelectorSection(),
          const SizedBox(height: 24),
          _DarkModeSection(themeState: themeState),
          const SizedBox(height: 24),
          const _ColorPaletteSection(),
          const SizedBox(height: 24),
          _ComponentsSection(themeState: themeState),
          const SizedBox(height: 24),
          _ThemePreviewGrid(currentState: themeState),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.themeState});

  final AivoThemeState themeState;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  themeState.effectiveIsDark ? Icons.dark_mode : Icons.light_mode,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        themeState.themeLabel,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(
                        'Brightness: ${themeState.brightness.name}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: Theme.of(context).colorScheme.primary,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      themeState.canToggleDarkMode
                          ? 'Dark mode is available for Scholar theme'
                          : 'Dark mode is only available for Scholar (9-12) theme',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.onPrimaryContainer,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ThemeSelectorSection extends ConsumerWidget {
  const _ThemeSelectorSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Grade Band Theme',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Text(
          'Select the grade band to see theme changes. Dark mode is only available for Scholar.',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 16),
        const SizedBox(
          width: double.infinity,
          child: AivoThemeSegmentedButton(),
        ),
      ],
    );
  }
}

class _DarkModeSection extends ConsumerWidget {
  const _DarkModeSection({required this.themeState});

  final AivoThemeState themeState;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Dark Mode Toggle',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Matches web behavior: dark mode only available for Scholar (G9-12)',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 16),
            const AivoDarkModeToggle(showWhenDisabled: true),
            if (!themeState.canToggleDarkMode) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.errorContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.warning_amber,
                      color: Theme.of(context).colorScheme.error,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Switch to Scholar theme to enable dark mode',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onErrorContainer,
                            ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ColorPaletteSection extends StatelessWidget {
  const _ColorPaletteSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Color Palette',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Text(
          'Current theme colors matching web tokens',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _ColorSwatch(
              label: 'Primary',
              color: Theme.of(context).colorScheme.primary,
            ),
            _ColorSwatch(
              label: 'Secondary',
              color: Theme.of(context).colorScheme.secondary,
            ),
            _ColorSwatch(
              label: 'Tertiary',
              color: Theme.of(context).colorScheme.tertiary,
            ),
            _ColorSwatch(
              label: 'Surface',
              color: Theme.of(context).colorScheme.surface,
            ),
            _ColorSwatch(
              label: 'Background',
              color: Theme.of(context).scaffoldBackgroundColor,
            ),
            _ColorSwatch(
              label: 'Error',
              color: Theme.of(context).colorScheme.error,
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          'Text Colors',
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Primary Text',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                'Secondary Text',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                'Muted Text',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.7),
                    ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ComponentsSection extends StatelessWidget {
  const _ComponentsSection({required this.themeState});

  final AivoThemeState themeState;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Component Styling',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Text(
          'Components with proper dark mode contrast',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 16),

        // Buttons
        Text(
          'Buttons',
          style: Theme.of(context).textTheme.labelLarge,
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
              label: 'Ghost',
              onPressed: () {},
              variant: AivoButtonVariant.ghost,
              gradeBand: themeState.gradeBand,
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Cards
        Text(
          'Cards (with borders in dark mode)',
          style: Theme.of(context).textTheme.labelLarge,
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
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Subtle border in dark mode',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: AivoCard(
                variant: AivoCardVariant.elevated,
                gradeBand: themeState.gradeBand,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Elevated Card',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Prominent border',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Inputs
        Text(
          'Input Fields (visible borders)',
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 8),
        const TextField(
          decoration: InputDecoration(
            labelText: 'Email',
            hintText: 'Enter your email',
            prefixIcon: Icon(Icons.email_outlined),
          ),
        ),
        const SizedBox(height: 12),
        const TextField(
          obscureText: true,
          decoration: InputDecoration(
            labelText: 'Password',
            hintText: 'Enter your password',
            prefixIcon: Icon(Icons.lock_outline),
            suffixIcon: Icon(Icons.visibility_off_outlined),
          ),
        ),
      ],
    );
  }
}

class _ThemePreviewGrid extends ConsumerWidget {
  const _ThemePreviewGrid({required this.currentState});

  final AivoThemeState currentState;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Theme Variants',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Text(
          'All available themes - tap to switch',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 16),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.3,
          children: [
            AivoThemePreviewCard(
              gradeBand: AivoGradeBand.k5,
              isDark: false,
              isSelected: currentState.gradeBand == AivoGradeBand.k5,
              onTap: () => ref
                  .read(gradeThemeControllerProvider.notifier)
                  .setGradeBand(AivoGradeBand.k5),
            ),
            AivoThemePreviewCard(
              gradeBand: AivoGradeBand.g6_8,
              isDark: false,
              isSelected: currentState.gradeBand == AivoGradeBand.g6_8,
              onTap: () => ref
                  .read(gradeThemeControllerProvider.notifier)
                  .setGradeBand(AivoGradeBand.g6_8),
            ),
            AivoThemePreviewCard(
              gradeBand: AivoGradeBand.g9_12,
              isDark: false,
              isSelected: currentState.gradeBand == AivoGradeBand.g9_12 &&
                  !currentState.effectiveIsDark,
              onTap: () {
                final controller = ref.read(gradeThemeControllerProvider.notifier);
                controller.setGradeBand(AivoGradeBand.g9_12);
                controller.setDarkMode(false);
              },
            ),
            AivoThemePreviewCard(
              gradeBand: AivoGradeBand.g9_12,
              isDark: true,
              isSelected: currentState.gradeBand == AivoGradeBand.g9_12 &&
                  currentState.effectiveIsDark,
              onTap: () {
                final controller = ref.read(gradeThemeControllerProvider.notifier);
                controller.setGradeBand(AivoGradeBand.g9_12);
                controller.setDarkMode(true);
              },
            ),
          ],
        ),
      ],
    );
  }
}

class _ColorSwatch extends StatelessWidget {
  const _ColorSwatch({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final textColor = color.computeLuminance() > 0.5 ? Colors.black : Colors.white;

    return Container(
      width: 100,
      height: 60,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
        ),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                color: textColor,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
            Text(
              '#${color.value.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}',
              style: TextStyle(
                color: textColor.withOpacity(0.7),
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
