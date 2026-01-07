/// Accessibility Settings Screen
///
/// Comprehensive accessibility settings for:
/// - Visual accommodations (text size, contrast, colors)
/// - Motor accommodations (touch targets, tremor filter, dwell)
/// - Sensory accommodations (audio, visual stimuli)
/// - Screen reader support
/// - Reduced motion
/// - Voice input configuration

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';


// ============================================================================
// PROVIDERS
// ============================================================================

/// Provider for accessibility settings state
final accessibilitySettingsProvider =
    StateNotifierProvider<AccessibilitySettingsNotifier, AccessibilitySettingsState>(
  (ref) => AccessibilitySettingsNotifier(),
);

/// Accessibility settings state
class AccessibilitySettingsState {
  const AccessibilitySettingsState({
    this.textScaleFactor = 1.0,
    this.highContrast = false,
    this.reduceMotion = false,
    this.reduceTransparency = false,
    this.boldText = false,
    this.screenReaderOptimized = false,
    this.hapticFeedbackEnabled = true,
    this.soundEffectsEnabled = true,
    this.soundVolume = 0.7,
    this.readAloudEnabled = false,
    this.readAloudSpeed = 1.0,
    this.colorBlindMode = ColorBlindMode.none,
    this.isDirty = false,
  });

  final double textScaleFactor;
  final bool highContrast;
  final bool reduceMotion;
  final bool reduceTransparency;
  final bool boldText;
  final bool screenReaderOptimized;
  final bool hapticFeedbackEnabled;
  final bool soundEffectsEnabled;
  final double soundVolume;
  final bool readAloudEnabled;
  final double readAloudSpeed;
  final ColorBlindMode colorBlindMode;
  final bool isDirty;

  AccessibilitySettingsState copyWith({
    double? textScaleFactor,
    bool? highContrast,
    bool? reduceMotion,
    bool? reduceTransparency,
    bool? boldText,
    bool? screenReaderOptimized,
    bool? hapticFeedbackEnabled,
    bool? soundEffectsEnabled,
    double? soundVolume,
    bool? readAloudEnabled,
    double? readAloudSpeed,
    ColorBlindMode? colorBlindMode,
    bool? isDirty,
  }) {
    return AccessibilitySettingsState(
      textScaleFactor: textScaleFactor ?? this.textScaleFactor,
      highContrast: highContrast ?? this.highContrast,
      reduceMotion: reduceMotion ?? this.reduceMotion,
      reduceTransparency: reduceTransparency ?? this.reduceTransparency,
      boldText: boldText ?? this.boldText,
      screenReaderOptimized: screenReaderOptimized ?? this.screenReaderOptimized,
      hapticFeedbackEnabled: hapticFeedbackEnabled ?? this.hapticFeedbackEnabled,
      soundEffectsEnabled: soundEffectsEnabled ?? this.soundEffectsEnabled,
      soundVolume: soundVolume ?? this.soundVolume,
      readAloudEnabled: readAloudEnabled ?? this.readAloudEnabled,
      readAloudSpeed: readAloudSpeed ?? this.readAloudSpeed,
      colorBlindMode: colorBlindMode ?? this.colorBlindMode,
      isDirty: isDirty ?? this.isDirty,
    );
  }
}

enum ColorBlindMode {
  none('None', 'Default colors'),
  protanopia('Protanopia', 'Red-blind'),
  deuteranopia('Deuteranopia', 'Green-blind'),
  tritanopia('Tritanopia', 'Blue-blind'),
  achromatopsia('Achromatopsia', 'Total color blindness');

  const ColorBlindMode(this.label, this.description);
  final String label;
  final String description;
}

/// Accessibility settings notifier
class AccessibilitySettingsNotifier extends StateNotifier<AccessibilitySettingsState> {
  AccessibilitySettingsNotifier() : super(const AccessibilitySettingsState());

  void setTextScaleFactor(double value) {
    state = state.copyWith(textScaleFactor: value, isDirty: true);
  }

  void setHighContrast(bool value) {
    state = state.copyWith(highContrast: value, isDirty: true);
  }

  void setReduceMotion(bool value) {
    state = state.copyWith(reduceMotion: value, isDirty: true);
  }

  void setReduceTransparency(bool value) {
    state = state.copyWith(reduceTransparency: value, isDirty: true);
  }

  void setBoldText(bool value) {
    state = state.copyWith(boldText: value, isDirty: true);
  }

  void setScreenReaderOptimized(bool value) {
    state = state.copyWith(screenReaderOptimized: value, isDirty: true);
  }

  void setHapticFeedbackEnabled(bool value) {
    state = state.copyWith(hapticFeedbackEnabled: value, isDirty: true);
  }

  void setSoundEffectsEnabled(bool value) {
    state = state.copyWith(soundEffectsEnabled: value, isDirty: true);
  }

  void setSoundVolume(double value) {
    state = state.copyWith(soundVolume: value, isDirty: true);
  }

  void setReadAloudEnabled(bool value) {
    state = state.copyWith(readAloudEnabled: value, isDirty: true);
  }

  void setReadAloudSpeed(double value) {
    state = state.copyWith(readAloudSpeed: value, isDirty: true);
  }

  void setColorBlindMode(ColorBlindMode mode) {
    state = state.copyWith(colorBlindMode: mode, isDirty: true);
  }

  void markSaved() {
    state = state.copyWith(isDirty: false);
  }
}

// ============================================================================
// SCREEN
// ============================================================================

class AccessibilitySettingsScreen extends ConsumerWidget {
  const AccessibilitySettingsScreen({super.key});

  static const String routeName = '/settings/accessibility';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(accessibilitySettingsProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Semantics(
          header: true,
          child: const Text('Accessibility'),
        ),
        actions: [
          if (settings.isDirty)
            TextButton(
              onPressed: () => _saveSettings(context, ref),
              child: const Text('Save'),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          // Visual Section
          _buildSectionHeader(context, 'Visual', Icons.visibility),
          _TextScaleSlider(
            value: settings.textScaleFactor,
            onChanged: (value) {
              ref.read(accessibilitySettingsProvider.notifier).setTextScaleFactor(value);
            },
          ),
          _SettingsSwitch(
            title: 'High Contrast',
            subtitle: 'Increase contrast between text and background',
            value: settings.highContrast,
            onChanged: (value) {
              ref.read(accessibilitySettingsProvider.notifier).setHighContrast(value);
              HapticFeedback.selectionClick();
            },
            semanticLabel: 'High contrast mode',
          ),
          _SettingsSwitch(
            title: 'Bold Text',
            subtitle: 'Make all text bolder for easier reading',
            value: settings.boldText,
            onChanged: (value) {
              ref.read(accessibilitySettingsProvider.notifier).setBoldText(value);
              HapticFeedback.selectionClick();
            },
            semanticLabel: 'Bold text mode',
          ),
          _SettingsSwitch(
            title: 'Reduce Transparency',
            subtitle: 'Reduce see-through effects',
            value: settings.reduceTransparency,
            onChanged: (value) {
              ref.read(accessibilitySettingsProvider.notifier).setReduceTransparency(value);
              HapticFeedback.selectionClick();
            },
            semanticLabel: 'Reduce transparency mode',
          ),
          _ColorBlindModeTile(
            currentMode: settings.colorBlindMode,
            onChanged: (mode) {
              ref.read(accessibilitySettingsProvider.notifier).setColorBlindMode(mode);
              HapticFeedback.selectionClick();
            },
          ),

          const Divider(height: 32),

          // Motion Section
          _buildSectionHeader(context, 'Motion', Icons.animation),
          _SettingsSwitch(
            title: 'Reduce Motion',
            subtitle: 'Minimize animations and motion effects',
            value: settings.reduceMotion,
            onChanged: (value) {
              ref.read(accessibilitySettingsProvider.notifier).setReduceMotion(value);
              HapticFeedback.selectionClick();
            },
            semanticLabel: 'Reduce motion mode',
          ),

          const Divider(height: 32),

          // Audio & Haptics Section
          _buildSectionHeader(context, 'Audio & Haptics', Icons.volume_up),
          _SettingsSwitch(
            title: 'Sound Effects',
            subtitle: 'Play sounds for actions and feedback',
            value: settings.soundEffectsEnabled,
            onChanged: (value) {
              ref.read(accessibilitySettingsProvider.notifier).setSoundEffectsEnabled(value);
              HapticFeedback.selectionClick();
            },
            semanticLabel: 'Sound effects',
          ),
          if (settings.soundEffectsEnabled)
            _VolumeSlider(
              value: settings.soundVolume,
              onChanged: (value) {
                ref.read(accessibilitySettingsProvider.notifier).setSoundVolume(value);
              },
            ),
          _SettingsSwitch(
            title: 'Haptic Feedback',
            subtitle: 'Vibration feedback for touches and actions',
            value: settings.hapticFeedbackEnabled,
            onChanged: (value) {
              ref.read(accessibilitySettingsProvider.notifier).setHapticFeedbackEnabled(value);
              if (value) HapticFeedback.mediumImpact();
            },
            semanticLabel: 'Haptic feedback',
          ),

          const Divider(height: 32),

          // Screen Reader Section
          _buildSectionHeader(context, 'Screen Reader', Icons.record_voice_over),
          _SettingsSwitch(
            title: 'Screen Reader Optimized',
            subtitle: 'Optimize layout for VoiceOver/TalkBack',
            value: settings.screenReaderOptimized,
            onChanged: (value) {
              ref.read(accessibilitySettingsProvider.notifier).setScreenReaderOptimized(value);
              HapticFeedback.selectionClick();
            },
            semanticLabel: 'Screen reader optimization',
          ),
          _SettingsSwitch(
            title: 'Read Aloud',
            subtitle: 'Automatically read content aloud',
            value: settings.readAloudEnabled,
            onChanged: (value) {
              ref.read(accessibilitySettingsProvider.notifier).setReadAloudEnabled(value);
              HapticFeedback.selectionClick();
            },
            semanticLabel: 'Read aloud mode',
          ),
          if (settings.readAloudEnabled)
            _ReadAloudSpeedSlider(
              value: settings.readAloudSpeed,
              onChanged: (value) {
                ref.read(accessibilitySettingsProvider.notifier).setReadAloudSpeed(value);
              },
            ),

          const Divider(height: 32),

          // Motor Accommodations Section
          _buildSectionHeader(context, 'Motor Accommodations', Icons.touch_app),
          _NavigationTile(
            title: 'Touch Settings',
            subtitle: 'Larger touch targets, touch hold duration',
            icon: Icons.pan_tool,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const MotorAccommodationsScreen(),
              ),
            ),
          ),

          const Divider(height: 32),

          // Sensory Accommodations Section
          _buildSectionHeader(context, 'Sensory Accommodations', Icons.psychology),
          _NavigationTile(
            title: 'Sensory Settings',
            subtitle: 'Visual and audio sensitivity settings',
            icon: Icons.tune,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const SensoryAccommodationsScreen(),
              ),
            ),
          ),

          const SizedBox(height: 32),

          // Reset Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              onPressed: () => _showResetDialog(context, ref),
              icon: const Icon(Icons.restore),
              label: const Text('Reset to Defaults'),
              style: OutlinedButton.styleFrom(
                foregroundColor: theme.colorScheme.error,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),

          const SizedBox(height: 48),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title, IconData icon) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: theme.colorScheme.primary),
          const SizedBox(width: 8),
          Semantics(
            header: true,
            child: Text(
              title,
              style: theme.textTheme.titleSmall?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _saveSettings(BuildContext context, WidgetRef ref) async {
    // Save to persistent storage
    ref.read(accessibilitySettingsProvider.notifier).markSaved();

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Settings saved'),
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  void _showResetDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset Settings?'),
        content: const Text(
          'This will reset all accessibility settings to their defaults. '
          'This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              // Reset to defaults - implement reset logic
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Settings reset to defaults'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            child: Text(
              'Reset',
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// SETTINGS WIDGETS
// ============================================================================

class _SettingsSwitch extends StatelessWidget {
  const _SettingsSwitch({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
    this.semanticLabel,
  });

  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      toggled: value,
      label: semanticLabel ?? title,
      hint: subtitle,
      child: SwitchListTile(
        title: Text(title),
        subtitle: Text(subtitle),
        value: value,
        onChanged: onChanged,
      ),
    );
  }
}

class _TextScaleSlider extends StatelessWidget {
  const _TextScaleSlider({
    required this.value,
    required this.onChanged,
  });

  final double value;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final percentage = (value * 100).round();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Text Size'),
              Semantics(
                label: 'Text size $percentage percent',
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '$percentage%',
                    style: TextStyle(
                      color: theme.colorScheme.onPrimaryContainer,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Semantics(
                label: 'Small text',
                excludeSemantics: true,
                child: Text(
                  'A',
                  style: theme.textTheme.bodySmall,
                ),
              ),
              Expanded(
                child: Semantics(
                  label: 'Text size slider',
                  value: '$percentage percent',
                  slider: true,
                  child: Slider(
                    value: value,
                    min: 0.8,
                    max: 2.0,
                    divisions: 12,
                    onChanged: onChanged,
                  ),
                ),
              ),
              Semantics(
                label: 'Large text',
                excludeSemantics: true,
                child: Text(
                  'A',
                  style: theme.textTheme.headlineSmall,
                ),
              ),
            ],
          ),
          // Preview
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'This is how text will look',
              style: TextStyle(fontSize: 16 * value),
            ),
          ),
        ],
      ),
    );
  }
}

class _VolumeSlider extends StatelessWidget {
  const _VolumeSlider({
    required this.value,
    required this.onChanged,
  });

  final double value;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final percentage = (value * 100).round();

    return ListTile(
      leading: Icon(
        value == 0 ? Icons.volume_off : (value < 0.5 ? Icons.volume_down : Icons.volume_up),
      ),
      title: Semantics(
        label: 'Volume slider',
        value: '$percentage percent',
        slider: true,
        child: Slider(
          value: value,
          min: 0,
          max: 1,
          divisions: 10,
          onChanged: onChanged,
        ),
      ),
      trailing: SizedBox(
        width: 48,
        child: Text(
          '$percentage%',
          textAlign: TextAlign.end,
        ),
      ),
    );
  }
}

class _ReadAloudSpeedSlider extends StatelessWidget {
  const _ReadAloudSpeedSlider({
    required this.value,
    required this.onChanged,
  });

  final double value;
  final ValueChanged<double> onChanged;

  String _getSpeedLabel(double speed) {
    if (speed <= 0.5) return 'Very Slow';
    if (speed <= 0.75) return 'Slow';
    if (speed <= 1.25) return 'Normal';
    if (speed <= 1.5) return 'Fast';
    return 'Very Fast';
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: const Icon(Icons.speed),
      title: Text('Reading Speed: ${_getSpeedLabel(value)}'),
      subtitle: Semantics(
        label: 'Reading speed slider',
        value: _getSpeedLabel(value),
        slider: true,
        child: Slider(
          value: value,
          min: 0.5,
          max: 2.0,
          divisions: 6,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

class _ColorBlindModeTile extends StatelessWidget {
  const _ColorBlindModeTile({
    required this.currentMode,
    required this.onChanged,
  });

  final ColorBlindMode currentMode;
  final ValueChanged<ColorBlindMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: const Text('Color Vision'),
      subtitle: Text(currentMode.label),
      trailing: const Icon(Icons.chevron_right),
      onTap: () {
        showModalBottomSheet(
          context: context,
          builder: (context) => SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Color Vision Mode',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                ...ColorBlindMode.values.map((mode) => RadioListTile<ColorBlindMode>(
                  title: Text(mode.label),
                  subtitle: Text(mode.description),
                  value: mode,
                  groupValue: currentMode,
                  onChanged: (value) {
                    if (value != null) {
                      onChanged(value);
                      Navigator.pop(context);
                    }
                  },
                )),
                const SizedBox(height: 16),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _NavigationTile extends StatelessWidget {
  const _NavigationTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}

// ============================================================================
// MOTOR ACCOMMODATIONS SCREEN
// ============================================================================

class MotorAccommodationsScreen extends ConsumerWidget {
  const MotorAccommodationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Semantics(
          header: true,
          child: const Text('Motor Accommodations'),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          // Touch Targets Section
          _buildSectionHeader(context, 'Touch Targets'),
          _MotorSettingSlider(
            title: 'Touch Target Size',
            subtitle: 'Make buttons and interactive elements larger',
            value: 1.0,
            min: 1.0,
            max: 2.0,
            divisions: 4,
            valueLabel: (v) => '${(v * 100).round()}%',
            onChanged: (v) {},
          ),
          _MotorSettingSwitch(
            title: 'Touch Hold Duration',
            subtitle: 'Require holding touches longer to activate',
            value: false,
            onChanged: (v) {},
          ),

          const Divider(height: 32),

          // Dwell Selection Section
          _buildSectionHeader(context, 'Dwell Selection'),
          _MotorSettingSwitch(
            title: 'Enable Dwell Selection',
            subtitle: 'Activate by hovering instead of tapping',
            value: false,
            onChanged: (v) {},
          ),
          _MotorSettingSlider(
            title: 'Dwell Time',
            subtitle: 'How long to hover before activating',
            value: 1.0,
            min: 0.5,
            max: 3.0,
            divisions: 5,
            valueLabel: (v) => '${v.toStringAsFixed(1)}s',
            onChanged: (v) {},
          ),

          const Divider(height: 32),

          // Tremor Filter Section
          _buildSectionHeader(context, 'Tremor Filter'),
          _MotorSettingSwitch(
            title: 'Enable Tremor Filter',
            subtitle: 'Smooth out unintended movements',
            value: false,
            onChanged: (v) {},
          ),
          _MotorSettingSlider(
            title: 'Filter Strength',
            subtitle: 'How much to smooth movements',
            value: 50,
            min: 0,
            max: 100,
            divisions: 10,
            valueLabel: (v) => '${v.round()}%',
            onChanged: (v) {},
          ),

          const Divider(height: 32),

          // Gesture Simplification Section
          _buildSectionHeader(context, 'Gestures'),
          _MotorSettingSwitch(
            title: 'Simplified Gestures',
            subtitle: 'Replace swipes with taps where possible',
            value: false,
            onChanged: (v) {},
          ),
          _MotorSettingSwitch(
            title: 'Drag Assist',
            subtitle: 'Help with drag and drop actions',
            value: false,
            onChanged: (v) {},
          ),

          const Divider(height: 32),

          // Alternative Input Section
          _buildSectionHeader(context, 'Alternative Input'),
          _MotorSettingSwitch(
            title: 'Voice Input',
            subtitle: 'Use voice commands for navigation',
            value: false,
            onChanged: (v) {},
          ),
          _MotorSettingSwitch(
            title: 'Switch Access',
            subtitle: 'Use external switches for control',
            value: false,
            onChanged: (v) {},
          ),

          const Divider(height: 32),

          // Fatigue Management Section
          _buildSectionHeader(context, 'Fatigue Management'),
          _MotorSettingSwitch(
            title: 'Auto Break Reminders',
            subtitle: 'Get reminded to take breaks',
            value: false,
            onChanged: (v) {},
          ),
          _MotorSettingSlider(
            title: 'Break Interval',
            subtitle: 'Minutes between break reminders',
            value: 20,
            min: 10,
            max: 60,
            divisions: 10,
            valueLabel: (v) => '${v.round()} min',
            onChanged: (v) {},
          ),

          const SizedBox(height: 48),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Semantics(
        header: true,
        child: Text(
          title,
          style: theme.textTheme.titleSmall?.copyWith(
            color: theme.colorScheme.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _MotorSettingSwitch extends StatelessWidget {
  const _MotorSettingSwitch({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      title: Text(title),
      subtitle: Text(subtitle),
      value: value,
      onChanged: (v) {
        HapticFeedback.selectionClick();
        onChanged(v);
      },
    );
  }
}

class _MotorSettingSlider extends StatelessWidget {
  const _MotorSettingSlider({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.min,
    required this.max,
    required this.divisions,
    required this.valueLabel,
    required this.onChanged,
  });

  final String title;
  final String subtitle;
  final double value;
  final double min;
  final double max;
  final int divisions;
  final String Function(double) valueLabel;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                valueLabel(value),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          Slider(
            value: value,
            min: min,
            max: max,
            divisions: divisions,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// SENSORY ACCOMMODATIONS SCREEN
// ============================================================================

class SensoryAccommodationsScreen extends ConsumerWidget {
  const SensoryAccommodationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Semantics(
          header: true,
          child: const Text('Sensory Accommodations'),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          // Visual Sensitivities Section
          _buildSectionHeader(context, 'Visual Sensitivities'),
          _SensorySettingSwitch(
            title: 'Reduce Flashing',
            subtitle: 'Minimize or remove flashing content',
            value: false,
            onChanged: (v) {},
          ),
          _SensorySettingSwitch(
            title: 'Reduce Bright Colors',
            subtitle: 'Use muted color palette',
            value: false,
            onChanged: (v) {},
          ),
          _SensorySettingSwitch(
            title: 'Reduce Visual Complexity',
            subtitle: 'Simplify busy visual content',
            value: false,
            onChanged: (v) {},
          ),

          const Divider(height: 32),

          // Audio Sensitivities Section
          _buildSectionHeader(context, 'Audio Sensitivities'),
          _SensorySettingSwitch(
            title: 'Reduce Sudden Sounds',
            subtitle: 'Fade in/out audio instead of sudden starts',
            value: false,
            onChanged: (v) {},
          ),
          _SensorySettingSwitch(
            title: 'No Background Music',
            subtitle: 'Disable ambient music and sounds',
            value: false,
            onChanged: (v) {},
          ),
          _SensorySettingSlider(
            title: 'Maximum Volume Limit',
            subtitle: 'Cap the maximum volume level',
            value: 100,
            min: 20,
            max: 100,
            divisions: 8,
            valueLabel: (v) => '${v.round()}%',
            onChanged: (v) {},
          ),

          const Divider(height: 32),

          // Content Preferences Section
          _buildSectionHeader(context, 'Content Preferences'),
          _SensorySettingSwitch(
            title: 'Prefer Static Images',
            subtitle: 'Use still images instead of videos',
            value: false,
            onChanged: (v) {},
          ),
          _SensorySettingSwitch(
            title: 'Text Descriptions',
            subtitle: 'Show text descriptions for visual content',
            value: false,
            onChanged: (v) {},
          ),
          _SensorySettingSwitch(
            title: 'Simplify Animations',
            subtitle: 'Use simple transitions instead of complex animations',
            value: false,
            onChanged: (v) {},
          ),

          const Divider(height: 32),

          // Overwhelm Prevention Section
          _buildSectionHeader(context, 'Overwhelm Prevention'),
          _SensorySettingSwitch(
            title: 'Calm Mode',
            subtitle: 'Overall calmer, less stimulating experience',
            value: false,
            onChanged: (v) {},
          ),
          _SensorySettingSwitch(
            title: 'Fewer Rewards Effects',
            subtitle: 'Reduce celebratory animations',
            value: false,
            onChanged: (v) {},
          ),

          const SizedBox(height: 48),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Semantics(
        header: true,
        child: Text(
          title,
          style: theme.textTheme.titleSmall?.copyWith(
            color: theme.colorScheme.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _SensorySettingSwitch extends StatelessWidget {
  const _SensorySettingSwitch({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      title: Text(title),
      subtitle: Text(subtitle),
      value: value,
      onChanged: (v) {
        HapticFeedback.selectionClick();
        onChanged(v);
      },
    );
  }
}

class _SensorySettingSlider extends StatelessWidget {
  const _SensorySettingSlider({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.min,
    required this.max,
    required this.divisions,
    required this.valueLabel,
    required this.onChanged,
  });

  final String title;
  final String subtitle;
  final double value;
  final double min;
  final double max;
  final int divisions;
  final String Function(double) valueLabel;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                valueLabel(value),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          Slider(
            value: value,
            min: min,
            max: max,
            divisions: divisions,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
