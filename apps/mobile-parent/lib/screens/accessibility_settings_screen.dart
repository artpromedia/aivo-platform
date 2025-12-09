import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../theme/parent_theme.dart';

/// Screen for managing accessibility settings.
class AccessibilitySettingsScreen extends ConsumerWidget {
  const AccessibilitySettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final a11yState = ref.watch(accessibilityControllerProvider);
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
          Text(
            'Display Settings',
            style: theme.textTheme.titleLarge,
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
                'Use a font designed to be easier to read for people with dyslexia.',
            trailing: Switch(
              value: a11yState.useDyslexiaFont,
              onChanged: (value) {
                ref
                    .read(accessibilityControllerProvider.notifier)
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
                    .read(accessibilityControllerProvider.notifier)
                    .setHighContrast(value);
              },
            ),
          ),
          const SizedBox(height: 24),

          // Text size
          Text(
            'Text Size',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Adjust the text size throughout the app.',
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
                      const Text('A', style: TextStyle(fontSize: 14)),
                      Text(
                        '${(a11yState.textScaleFactor * 100).round()}%',
                        style: theme.textTheme.titleMedium,
                      ),
                      const Text('A', style: TextStyle(fontSize: 24)),
                    ],
                  ),
                  Slider(
                    value: a11yState.textScaleFactor,
                    min: 0.8,
                    max: 1.5,
                    divisions: 7,
                    onChanged: (value) {
                      ref
                          .read(accessibilityControllerProvider.notifier)
                          .setTextScaleFactor(value);
                    },
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
          const SizedBox(height: 16),

          // Preview
          Text(
            'Preview',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
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
                    'Sample Heading',
                    style: theme.textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'This is sample body text to help you see how your accessibility settings affect the app. '
                    'Adjust the settings above and see the changes here.',
                    style: theme.textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () {},
                    child: const Text('Sample Button'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Reset
          Center(
            child: TextButton.icon(
              onPressed: () {
                ref
                    .read(accessibilityControllerProvider.notifier)
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
