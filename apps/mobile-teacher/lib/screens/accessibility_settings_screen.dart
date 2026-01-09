/// Teacher Accessibility Settings Screen
///
/// WCAG 2.1 Level AA compliant accessibility settings.
/// Addresses RE-AUDIT-004: Mobile Accessibility Compliance
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../theme/teacher_theme.dart';

class TeacherAccessibilitySettingsScreen extends ConsumerWidget {
  const TeacherAccessibilitySettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final a11yState = ref.watch(teacherAccessibilityProvider);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Accessibility'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header
          Semantics(
            header: true,
            child: Text(
              'Display Settings',
              style: theme.textTheme.titleLarge,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Customize how the app looks and feels to make it easier for you to use.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),

          // Dyslexia-friendly font
          _SettingCard(
            icon: Icons.text_fields,
            title: 'Dyslexia-Friendly Font',
            description:
                'Use OpenDyslexic-style font designed to be easier to read for people with dyslexia.',
            trailing: Switch(
              value: a11yState.useDyslexiaFont,
              onChanged: (value) {
                ref
                    .read(teacherAccessibilityProvider.notifier)
                    .setDyslexiaFont(value);
              },
            ),
          ),
          const SizedBox(height: 12),

          // High contrast
          _SettingCard(
            icon: Icons.contrast,
            title: 'High Contrast',
            description:
                'Increase contrast and border visibility for better readability.',
            trailing: Switch(
              value: a11yState.useHighContrast,
              onChanged: (value) {
                ref
                    .read(teacherAccessibilityProvider.notifier)
                    .setHighContrast(value);
              },
            ),
          ),
          const SizedBox(height: 12),

          // Reduce motion
          _SettingCard(
            icon: Icons.animation,
            title: 'Reduce Motion',
            description:
                'Minimize animations and transitions throughout the app.',
            trailing: Switch(
              value: a11yState.reduceMotion,
              onChanged: (value) {
                ref
                    .read(teacherAccessibilityProvider.notifier)
                    .setReduceMotion(value);
              },
            ),
          ),
          const SizedBox(height: 24),

          // Text size section
          Semantics(
            header: true,
            child: Text(
              'Text Size',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Adjust the text size throughout the app. This works in addition to your device\'s text size settings.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),

          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: colorScheme.outline.withOpacity(0.3)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Semantics(
                        label: 'Smaller text size',
                        child: const Text('A', style: TextStyle(fontSize: 14)),
                      ),
                      Semantics(
                        liveRegion: true,
                        child: Text(
                          '${(a11yState.textScaleFactor * 100).round()}%',
                          style: theme.textTheme.titleMedium,
                        ),
                      ),
                      Semantics(
                        label: 'Larger text size',
                        child: const Text('A', style: TextStyle(fontSize: 24)),
                      ),
                    ],
                  ),
                  Semantics(
                    label: 'Text size slider, ${(a11yState.textScaleFactor * 100).round()} percent',
                    slider: true,
                    value: '${(a11yState.textScaleFactor * 100).round()}%',
                    child: Slider(
                      value: a11yState.textScaleFactor,
                      min: 0.8,
                      max: 1.5,
                      divisions: 7,
                      label: '${(a11yState.textScaleFactor * 100).round()}%',
                      onChanged: (value) {
                        ref
                            .read(teacherAccessibilityProvider.notifier)
                            .setTextScaleFactor(value);
                      },
                    ),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Smaller',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                      Text(
                        'Larger',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Preview section
          Semantics(
            header: true,
            child: Text(
              'Preview',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: 12),

          Card(
            elevation: 0,
            color: colorScheme.primaryContainer.withOpacity(0.2),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: colorScheme.outline.withOpacity(0.3)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Sample Class Card',
                    style: theme.textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'This shows how text will appear throughout the app. '
                    'Adjust the settings above to find what works best for you.',
                    style: theme.textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {},
                          child: const Text('View Roster'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: () {},
                          child: const Text('Start Session'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Screen reader info
          Card(
            elevation: 0,
            color: colorScheme.surfaceContainerHighest,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.info_outline,
                    color: colorScheme.primary,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Screen Reader Support',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'This app fully supports VoiceOver (iOS) and TalkBack (Android). '
                          'Enable these in your device settings for a fully accessible experience.',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Reset button
          Center(
            child: TextButton.icon(
              onPressed: () {
                ref
                    .read(teacherAccessibilityProvider.notifier)
                    .resetToDefaults();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Settings reset to defaults')),
                );
              },
              icon: const Icon(Icons.restore),
              label: const Text('Reset to Defaults'),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _SettingCard extends StatelessWidget {
  const _SettingCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.trailing,
  });

  final IconData icon;
  final String title;
  final String description;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.outline.withOpacity(0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: colorScheme.primary),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            trailing,
          ],
        ),
      ),
    );
  }
}
