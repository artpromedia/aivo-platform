import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../onboarding/onboarding_controller.dart';

/// Preferences step - collects accessibility and learning preferences.
class PreferencesStep extends ConsumerStatefulWidget {
  const PreferencesStep({super.key});

  @override
  ConsumerState<PreferencesStep> createState() => _PreferencesStepState();
}

class _PreferencesStepState extends ConsumerState<PreferencesStep> {
  bool _useDyslexiaFont = false;
  bool _useHighContrast = false;
  bool _useReducedMotion = false;
  final Set<String> _selectedSubjects = {};

  final List<_SubjectOption> _subjects = [
    _SubjectOption('math', 'Math', Icons.calculate_outlined, Colors.blue),
    _SubjectOption('reading', 'Reading', Icons.menu_book_outlined, AivoBrand.success),
    _SubjectOption('writing', 'Writing', Icons.edit_note_outlined, Colors.purple),
    _SubjectOption('science', 'Science', Icons.science_outlined, AivoBrand.warning),
    _SubjectOption('social', 'Social Studies', Icons.public_outlined, Colors.teal),
    _SubjectOption('art', 'Art', Icons.palette_outlined, Colors.pink),
  ];

  @override
  void initState() {
    super.initState();
    final state = ref.read(onboardingControllerProvider);
    if (state.preferencesData != null) {
      _useDyslexiaFont = state.preferencesData!.useDyslexiaFont;
      _useHighContrast = state.preferencesData!.useHighContrast;
      _useReducedMotion = state.preferencesData!.useReducedMotion;
      _selectedSubjects.addAll(state.preferencesData!.preferredSubjects);
    }
  }

  void _handleNext() {
    ref.read(onboardingControllerProvider.notifier).updatePreferences(
      useDyslexiaFont: _useDyslexiaFont,
      useHighContrast: _useHighContrast,
      useReducedMotion: _useReducedMotion,
      preferredSubjects: _selectedSubjects.toList(),
    );
    ref.read(onboardingControllerProvider.notifier).nextStep();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Center(
            child: Column(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.tune,
                    size: 40,
                    color: theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Make It Yours',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Set up your learning preferences',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Accessibility settings
          Text(
            'Accessibility',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          _PreferenceSwitch(
            title: 'Dyslexia-friendly font',
            subtitle: 'Uses a font that\'s easier to read',
            icon: Icons.text_fields,
            value: _useDyslexiaFont,
            onChanged: (value) => setState(() => _useDyslexiaFont = value),
            theme: theme,
          ),
          const SizedBox(height: 8),
          _PreferenceSwitch(
            title: 'High contrast',
            subtitle: 'Makes text and buttons stand out more',
            icon: Icons.contrast,
            value: _useHighContrast,
            onChanged: (value) => setState(() => _useHighContrast = value),
            theme: theme,
          ),
          const SizedBox(height: 8),
          _PreferenceSwitch(
            title: 'Reduce motion',
            subtitle: 'Minimizes animations',
            icon: Icons.animation,
            value: _useReducedMotion,
            onChanged: (value) => setState(() => _useReducedMotion = value),
            theme: theme,
          ),
          const SizedBox(height: 24),

          // Favorite subjects
          Text(
            'What subjects do you enjoy? (Optional)',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _subjects.map((subject) {
              final isSelected = _selectedSubjects.contains(subject.id);
              return FilterChip(
                label: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      subject.icon,
                      size: 18,
                      color: isSelected
                          ? theme.colorScheme.onSecondaryContainer
                          : theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 6),
                    Text(subject.name),
                  ],
                ),
                selected: isSelected,
                onSelected: (selected) {
                  setState(() {
                    if (selected) {
                      _selectedSubjects.add(subject.id);
                    } else {
                      _selectedSubjects.remove(subject.id);
                    }
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 40),

          // Navigation buttons
          Row(
            children: [
              OutlinedButton(
                onPressed: () {
                  ref.read(onboardingControllerProvider.notifier).previousStep();
                },
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(100, 56),
                ),
                child: const Text('Back'),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: FilledButton(
                  onPressed: _handleNext,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(double.infinity, 56),
                  ),
                  child: const Text('Continue'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PreferenceSwitch extends StatelessWidget {
  const _PreferenceSwitch({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.value,
    required this.onChanged,
    required this.theme,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool value;
  final ValueChanged<bool> onChanged;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        leading: Icon(icon, color: theme.colorScheme.primary),
        title: Text(title),
        subtitle: Text(
          subtitle,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        trailing: Switch.adaptive(
          value: value,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

class _SubjectOption {
  const _SubjectOption(this.id, this.name, this.icon, this.color);
  final String id;
  final String name;
  final IconData icon;
  final Color color;
}
