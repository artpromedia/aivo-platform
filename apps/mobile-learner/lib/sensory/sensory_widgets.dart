/// Sensory Widgets - ND-2.1
///
/// UI components for sensory-adaptive content presentation.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'sensory_models.dart';
import 'sensory_service.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// SENSORY ADAPTED SCAFFOLD
// ═══════════════════════════════════════════════════════════════════════════════

/// A scaffold that adapts based on sensory settings
class SensoryAdaptedScaffold extends ConsumerWidget {
  const SensoryAdaptedScaffold({
    super.key,
    required this.child,
    this.appBar,
    this.bottomNavigationBar,
    this.floatingActionButton,
    this.backgroundColor,
  });

  final Widget child;
  final PreferredSizeWidget? appBar;
  final Widget? bottomNavigationBar;
  final Widget? floatingActionButton;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsState = ref.watch(sensorySettingsNotifierProvider);
    final settings = settingsState.settings;

    // Apply brightness adjustment
    final brightness = settings.brightness / 100;

    return ColorFiltered(
      colorFilter: ColorFilter.matrix([
        brightness, 0, 0, 0, 0,
        0, brightness, 0, 0, 0,
        0, 0, brightness, 0, 0,
        0, 0, 0, 1, 0,
      ]),
      child: MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaler: TextScaler.linear(settings.textScale),
          disableAnimations: settings.reducedMotion,
        ),
        child: Scaffold(
          appBar: appBar,
          body: child,
          bottomNavigationBar: bottomNavigationBar,
          floatingActionButton: floatingActionButton,
          backgroundColor: backgroundColor,
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENSORY WARNING BANNER
// ═══════════════════════════════════════════════════════════════════════════════

/// Banner that displays sensory warnings before content
class SensoryWarningBanner extends StatelessWidget {
  const SensoryWarningBanner({
    super.key,
    required this.warnings,
    this.onDismiss,
    this.onSkipContent,
  });

  final List<SensoryWarning> warnings;
  final VoidCallback? onDismiss;
  final VoidCallback? onSkipContent;

  @override
  Widget build(BuildContext context) {
    if (warnings.isEmpty) return const SizedBox.shrink();

    final criticalWarnings =
        warnings.where((w) => w.level == WarningSeverity.critical).toList();
    final regularWarnings =
        warnings.where((w) => w.level != WarningSeverity.critical).toList();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (criticalWarnings.isNotEmpty)
          _buildCriticalWarning(context, criticalWarnings.first),
        if (regularWarnings.isNotEmpty)
          _buildInfoWarnings(context, regularWarnings),
      ],
    );
  }

  Widget _buildCriticalWarning(BuildContext context, SensoryWarning warning) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      color: Theme.of(context).colorScheme.error,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.warning_amber_rounded,
                color: Theme.of(context).colorScheme.onError,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  warning.message,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onError,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          if (warning.recommendation != null) ...[
            const SizedBox(height: 8),
            Text(
              warning.recommendation!,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onError.withOpacity(0.9),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: onSkipContent,
                style: TextButton.styleFrom(
                  foregroundColor: Theme.of(context).colorScheme.onError,
                ),
                child: const Text('Skip This Content'),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: onDismiss,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.onError,
                  foregroundColor: Theme.of(context).colorScheme.error,
                ),
                child: const Text('Continue Anyway'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoWarnings(BuildContext context, List<SensoryWarning> warnings) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
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
              '${warnings.length} sensory adaptation${warnings.length == 1 ? '' : 's'} applied',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          TextButton(
            onPressed: () => _showWarningDetails(context, warnings),
            child: const Text('Details'),
          ),
        ],
      ),
    );
  }

  void _showWarningDetails(BuildContext context, List<SensoryWarning> warnings) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Sensory Adaptations',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...warnings.map((w) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        _getWarningIcon(w.category),
                        size: 20,
                        color: Theme.of(context).colorScheme.secondary,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(w.message),
                            if (w.recommendation != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                w.recommendation!,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurfaceVariant,
                                    ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  IconData _getWarningIcon(String category) {
    switch (category) {
      case 'audio':
        return Icons.volume_up;
      case 'visual':
        return Icons.visibility;
      case 'motion':
        return Icons.animation;
      case 'tactile':
        return Icons.touch_app;
      case 'cognitive':
        return Icons.psychology;
      default:
        return Icons.info_outline;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENSORY MATCH INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

/// Visual indicator of content's sensory match score
class SensoryMatchIndicator extends StatelessWidget {
  const SensoryMatchIndicator({
    super.key,
    required this.score,
    this.size = 40,
    this.showLabel = true,
  });

  final int score;
  final double size;
  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    final color = _getScoreColor(score);
    final icon = _getScoreIcon(score);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: color.withOpacity(0.2),
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 2),
          ),
          child: Center(
            child: Icon(icon, color: color, size: size * 0.5),
          ),
        ),
        if (showLabel) ...[
          const SizedBox(height: 4),
          Text(
            _getScoreLabel(score),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w500,
                ),
          ),
        ],
      ],
    );
  }

  Color _getScoreColor(int score) {
    if (score >= 90) return Colors.green;
    if (score >= 75) return Colors.lightGreen;
    if (score >= 50) return Colors.orange;
    if (score >= 30) return Colors.deepOrange;
    return Colors.red;
  }

  IconData _getScoreIcon(int score) {
    if (score >= 75) return Icons.check_circle;
    if (score >= 50) return Icons.info;
    return Icons.warning;
  }

  String _getScoreLabel(int score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'OK';
    if (score >= 30) return 'Caution';
    return 'Poor';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BREAK REMINDER
// ═══════════════════════════════════════════════════════════════════════════════

/// Widget that shows break reminders based on sensory settings
class BreakReminder extends ConsumerStatefulWidget {
  const BreakReminder({
    super.key,
    required this.child,
    this.onBreakRequested,
  });

  final Widget child;
  final VoidCallback? onBreakRequested;

  @override
  ConsumerState<BreakReminder> createState() => _BreakReminderState();
}

class _BreakReminderState extends ConsumerState<BreakReminder> {
  DateTime _lastBreakReminder = DateTime.now();
  bool _showReminder = false;

  @override
  void initState() {
    super.initState();
    _checkForBreak();
  }

  void _checkForBreak() {
    final settings = ref.read(sensorySettingsNotifierProvider).settings;
    if (!settings.breakRemindersEnabled) return;

    Future.delayed(Duration(minutes: settings.breakFrequencyMinutes), () {
      if (!mounted) return;
      final timeSinceLastBreak = DateTime.now().difference(_lastBreakReminder);
      if (timeSinceLastBreak.inMinutes >= settings.breakFrequencyMinutes) {
        setState(() => _showReminder = true);
      }
      _checkForBreak();
    });
  }

  void _dismissReminder() {
    setState(() {
      _showReminder = false;
      _lastBreakReminder = DateTime.now();
    });
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(sensorySettingsNotifierProvider).settings;

    if (!settings.breakRemindersEnabled) {
      return widget.child;
    }

    return Stack(
      children: [
        widget.child,
        if (_showReminder)
          Positioned.fill(
            child: Container(
              color: Colors.black54,
              child: Center(
                child: Card(
                  margin: const EdgeInsets.all(32),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.self_improvement,
                          size: 64,
                          color: Colors.blue,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Time for a Break!',
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Take a moment to rest your eyes and stretch.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            OutlinedButton(
                              onPressed: _dismissReminder,
                              child: const Text('Not Now'),
                            ),
                            const SizedBox(width: 12),
                            ElevatedButton.icon(
                              onPressed: () {
                                _dismissReminder();
                                widget.onBreakRequested?.call();
                              },
                              icon: const Icon(Icons.pause),
                              label: const Text('Take Break'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENSORY INCIDENT REPORTER
// ═══════════════════════════════════════════════════════════════════════════════

/// Button/widget for reporting sensory incidents
class SensoryIncidentReporter extends ConsumerWidget {
  const SensoryIncidentReporter({
    super.key,
    required this.learnerId,
    required this.tenantId,
    this.contentId,
    this.contentType,
    this.contentTitle,
    this.sessionId,
    this.compact = false,
  });

  final String learnerId;
  final String tenantId;
  final String? contentId;
  final String? contentType;
  final String? contentTitle;
  final String? sessionId;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (compact) {
      return IconButton(
        icon: const Icon(Icons.report_problem_outlined),
        tooltip: 'Report a problem',
        onPressed: () => _showReportDialog(context, ref),
      );
    }

    return ElevatedButton.icon(
      icon: const Icon(Icons.report_problem_outlined),
      label: const Text('Report a Problem'),
      onPressed: () => _showReportDialog(context, ref),
      style: ElevatedButton.styleFrom(
        backgroundColor: Theme.of(context).colorScheme.errorContainer,
        foregroundColor: Theme.of(context).colorScheme.onErrorContainer,
      ),
    );
  }

  void _showReportDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => _IncidentReportDialog(
        learnerId: learnerId,
        tenantId: tenantId,
        contentId: contentId,
        contentType: contentType,
        contentTitle: contentTitle,
        sessionId: sessionId,
        service: ref.read(sensoryServiceProvider),
      ),
    );
  }
}

class _IncidentReportDialog extends StatefulWidget {
  const _IncidentReportDialog({
    required this.learnerId,
    required this.tenantId,
    required this.service,
    this.contentId,
    this.contentType,
    this.contentTitle,
    this.sessionId,
  });

  final String learnerId;
  final String tenantId;
  final String? contentId;
  final String? contentType;
  final String? contentTitle;
  final String? sessionId;
  final SensoryService service;

  @override
  State<_IncidentReportDialog> createState() => _IncidentReportDialogState();
}

class _IncidentReportDialogState extends State<_IncidentReportDialog> {
  TriggerCategory _selectedCategory = TriggerCategory.visual;
  String _selectedType = 'discomfort';
  String _description = '';
  bool _isSubmitting = false;

  final _incidentTypes = [
    ('discomfort', 'General Discomfort'),
    ('too_bright', 'Too Bright'),
    ('too_loud', 'Too Loud'),
    ('too_fast', 'Moving Too Fast'),
    ('overwhelming', 'Overwhelming'),
    ('confusing', 'Confusing'),
    ('scary', 'Scary or Upsetting'),
    ('other', 'Other'),
  ];

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Report a Problem'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'What kind of problem did you experience?',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: TriggerCategory.values.map((cat) {
                return ChoiceChip(
                  label: Text(_getCategoryLabel(cat)),
                  selected: _selectedCategory == cat,
                  onSelected: (selected) {
                    if (selected) setState(() => _selectedCategory = cat);
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _selectedType,
              decoration: const InputDecoration(
                labelText: 'Type of problem',
                border: OutlineInputBorder(),
              ),
              items: _incidentTypes.map((t) {
                return DropdownMenuItem(
                  value: t.$1,
                  child: Text(t.$2),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) setState(() => _selectedType = value);
              },
            ),
            const SizedBox(height: 16),
            TextField(
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Tell us more (optional)',
                border: OutlineInputBorder(),
                hintText: 'What happened?',
              ),
              onChanged: (value) => _description = value,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submitReport,
          child: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Submit'),
        ),
      ],
    );
  }

  String _getCategoryLabel(TriggerCategory category) {
    switch (category) {
      case TriggerCategory.audio:
        return 'Sound';
      case TriggerCategory.visual:
        return 'Visual';
      case TriggerCategory.motion:
        return 'Motion';
      case TriggerCategory.tactile:
        return 'Touch';
      case TriggerCategory.cognitive:
        return 'Thinking';
    }
  }

  Future<void> _submitReport() async {
    setState(() => _isSubmitting = true);

    try {
      await widget.service.reportIncident(
        learnerId: widget.learnerId,
        tenantId: widget.tenantId,
        incidentType: _selectedType,
        triggerCategory: _selectedCategory,
        contentId: widget.contentId,
        contentType: widget.contentType,
        contentTitle: widget.contentTitle,
        sessionId: widget.sessionId,
        userDescription: _description.isNotEmpty ? _description : null,
        reportedByRole: 'learner',
      );

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Report submitted. Thank you!'),
            backgroundColor: Colors.green,
          ),
        );

        // Provide haptic feedback
        HapticFeedback.mediumImpact();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit report: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTED ANIMATION WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

/// Animation widget that respects sensory settings
class SensoryAdaptedAnimation extends ConsumerWidget {
  const SensoryAdaptedAnimation({
    super.key,
    required this.child,
    required this.animation,
    this.reducedMotionChild,
  });

  final Widget child;
  final Animation<double> animation;
  final Widget? reducedMotionChild;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(sensorySettingsNotifierProvider).settings;

    if (settings.reducedMotion) {
      return reducedMotionChild ?? child;
    }

    // Apply animation speed
    return AnimatedBuilder(
      animation: animation,
      builder: (context, _) {
        return child;
      },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENSORY SETTINGS QUICK ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

/// Quick access panel for adjusting sensory settings
class SensoryQuickSettings extends ConsumerStatefulWidget {
  const SensoryQuickSettings({super.key});

  @override
  ConsumerState<SensoryQuickSettings> createState() =>
      _SensoryQuickSettingsState();
}

class _SensoryQuickSettingsState extends ConsumerState<SensoryQuickSettings> {
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(sensorySettingsNotifierProvider);
    final settings = state.settings;
    final notifier = ref.read(sensorySettingsNotifierProvider.notifier);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Sensory Settings',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),

            // Volume
            _buildSliderSetting(
              icon: Icons.volume_up,
              label: 'Volume',
              value: settings.volume.toDouble(),
              min: 0,
              max: 100,
              onChanged: (value) {
                notifier.updateSetting(
                  settings.copyWith(volume: value.round()),
                );
              },
            ),

            // Brightness
            _buildSliderSetting(
              icon: Icons.brightness_6,
              label: 'Brightness',
              value: settings.brightness.toDouble(),
              min: 30,
              max: 100,
              onChanged: (value) {
                notifier.updateSetting(
                  settings.copyWith(brightness: value.round()),
                );
              },
            ),

            // Text size
            _buildSliderSetting(
              icon: Icons.text_fields,
              label: 'Text Size',
              value: settings.textScale,
              min: 0.85,
              max: 1.75,
              onChanged: (value) {
                notifier.updateSetting(
                  settings.copyWith(textScale: value),
                );
              },
            ),

            const Divider(),

            // Toggle settings
            SwitchListTile(
              secondary: const Icon(Icons.animation),
              title: const Text('Reduce Motion'),
              value: settings.reducedMotion,
              onChanged: (value) {
                notifier.updateSetting(
                  settings.copyWith(reducedMotion: value),
                );
              },
            ),

            SwitchListTile(
              secondary: const Icon(Icons.vibration),
              title: const Text('Vibration'),
              value: settings.hapticEnabled,
              onChanged: (value) {
                notifier.updateSetting(
                  settings.copyWith(hapticEnabled: value),
                );
              },
            ),

            SwitchListTile(
              secondary: const Icon(Icons.alarm),
              title: const Text('Break Reminders'),
              value: settings.breakRemindersEnabled,
              onChanged: (value) {
                notifier.updateSetting(
                  settings.copyWith(breakRemindersEnabled: value),
                );
              },
            ),

            const SizedBox(height: 8),
            Center(
              child: TextButton(
                onPressed: () => notifier.resetToDefaults(),
                child: const Text('Reset to Defaults'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSliderSetting({
    required IconData icon,
    required String label,
    required double value,
    required double min,
    required double max,
    required ValueChanged<double> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label),
                Slider(
                  value: value,
                  min: min,
                  max: max,
                  onChanged: onChanged,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
