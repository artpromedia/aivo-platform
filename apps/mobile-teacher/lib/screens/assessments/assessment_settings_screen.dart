/// Assessment Settings Screen
///
/// Configure assessment settings like time limits, attempts, grading options.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/assessment.dart';
import '../../providers/assessment_provider.dart';

/// Screen for configuring assessment settings
class AssessmentSettingsScreen extends ConsumerStatefulWidget {
  const AssessmentSettingsScreen({super.key});

  @override
  ConsumerState<AssessmentSettingsScreen> createState() =>
      _AssessmentSettingsScreenState();
}

class _AssessmentSettingsScreenState
    extends ConsumerState<AssessmentSettingsScreen> {
  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(currentAssessmentSettingsProvider);
    final theme = Theme.of(context);

    if (settings == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Settings')),
        body: const Center(child: Text('No assessment loaded')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Assessment Settings'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Time settings
            _buildSectionHeader(context, Icons.timer, 'Time Settings'),
            _buildTimeSettings(context, settings),
            const SizedBox(height: 24),

            // Attempt settings
            _buildSectionHeader(context, Icons.replay, 'Attempt Settings'),
            _buildAttemptSettings(context, settings),
            const SizedBox(height: 24),

            // Display settings
            _buildSectionHeader(context, Icons.visibility, 'Display Settings'),
            _buildDisplaySettings(context, settings),
            const SizedBox(height: 24),

            // Grading settings
            _buildSectionHeader(context, Icons.grade, 'Grading Settings'),
            _buildGradingSettings(context, settings),
            const SizedBox(height: 24),

            // Security settings
            _buildSectionHeader(context, Icons.security, 'Security Settings'),
            _buildSecuritySettings(context, settings),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(
    BuildContext context,
    IconData icon,
    String title,
  ) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, color: theme.colorScheme.primary, size: 20),
          const SizedBox(width: 8),
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeSettings(BuildContext context, AssessmentSettings settings) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Time limit toggle
            SwitchListTile(
              title: const Text('Time Limit'),
              subtitle: const Text('Set a maximum time for the assessment'),
              value: settings.timeLimit != null,
              onChanged: (enabled) {
                _updateSettings(
                  settings.copyWith(
                    timeLimit: enabled ? 30 : null,
                  ),
                );
              },
            ),

            // Time limit slider
            if (settings.timeLimit != null) ...[
              const Divider(),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    const Text('Minutes: '),
                    Expanded(
                      child: Slider(
                        value: settings.timeLimit!.toDouble(),
                        min: 5,
                        max: 180,
                        divisions: 35,
                        label: '${settings.timeLimit} min',
                        onChanged: (value) {
                          _updateSettings(
                            settings.copyWith(timeLimit: value.toInt()),
                          );
                        },
                      ),
                    ),
                    SizedBox(
                      width: 60,
                      child: Text(
                        '${settings.timeLimit} min',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const Divider(),

            // Late submission
            SwitchListTile(
              title: const Text('Allow Late Submissions'),
              subtitle: const Text('Accept submissions after due date'),
              value: settings.allowLateSubmissions,
              onChanged: (value) {
                _updateSettings(settings.copyWith(allowLateSubmissions: value));
              },
            ),

            // Late penalty
            if (settings.allowLateSubmissions) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    const Text('Late Penalty: '),
                    Expanded(
                      child: Slider(
                        value: settings.latePenaltyPercent ?? 0,
                        min: 0,
                        max: 50,
                        divisions: 10,
                        label: '${settings.latePenaltyPercent?.toInt() ?? 0}%',
                        onChanged: (value) {
                          _updateSettings(
                            settings.copyWith(latePenaltyPercent: value),
                          );
                        },
                      ),
                    ),
                    SizedBox(
                      width: 50,
                      child: Text(
                        '${settings.latePenaltyPercent?.toInt() ?? 0}%',
                        style: const TextStyle(fontWeight: FontWeight.bold),
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

  Widget _buildAttemptSettings(
    BuildContext context,
    AssessmentSettings settings,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Multiple attempts
            SwitchListTile(
              title: const Text('Allow Multiple Attempts'),
              subtitle: const Text('Let students retake the assessment'),
              value: settings.maxAttempts > 1,
              onChanged: (enabled) {
                _updateSettings(
                  settings.copyWith(maxAttempts: enabled ? 3 : 1),
                );
              },
            ),

            // Max attempts
            if (settings.maxAttempts > 1) ...[
              const Divider(),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    const Text('Max Attempts: '),
                    Expanded(
                      child: Slider(
                        value: settings.maxAttempts.toDouble(),
                        min: 2,
                        max: 10,
                        divisions: 8,
                        label: '${settings.maxAttempts}',
                        onChanged: (value) {
                          _updateSettings(
                            settings.copyWith(maxAttempts: value.toInt()),
                          );
                        },
                      ),
                    ),
                    SizedBox(
                      width: 40,
                      child: Text(
                        '${settings.maxAttempts}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              // Score calculation
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Score Calculation:'),
                    const SizedBox(height: 8),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(
                          value: 'HIGHEST',
                          label: Text('Highest'),
                        ),
                        ButtonSegment(
                          value: 'LATEST',
                          label: Text('Latest'),
                        ),
                        ButtonSegment(
                          value: 'AVERAGE',
                          label: Text('Average'),
                        ),
                      ],
                      selected: {settings.attemptsGradingPolicy},
                      onSelectionChanged: (selection) {
                        _updateSettings(
                          settings.copyWith(attemptsGradingPolicy: selection.first),
                        );
                      },
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

  Widget _buildDisplaySettings(
    BuildContext context,
    AssessmentSettings settings,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Shuffle questions
            SwitchListTile(
              title: const Text('Shuffle Questions'),
              subtitle: const Text('Randomize question order for each student'),
              value: settings.shuffleQuestions,
              onChanged: (value) {
                _updateSettings(settings.copyWith(shuffleQuestions: value));
              },
            ),
            const Divider(),

            // Shuffle options
            SwitchListTile(
              title: const Text('Shuffle Answer Options'),
              subtitle:
                  const Text('Randomize answer choices within questions'),
              value: settings.shuffleOptions,
              onChanged: (value) {
                _updateSettings(settings.copyWith(shuffleOptions: value));
              },
            ),
            const Divider(),

            // Show one question at a time
            SwitchListTile(
              title: const Text('One Question at a Time'),
              subtitle: const Text('Display questions individually'),
              value: settings.showOneQuestionAtATime,
              onChanged: (value) {
                _updateSettings(settings.copyWith(showOneQuestionAtATime: value));
              },
            ),
            const Divider(),

            // Allow back navigation
            SwitchListTile(
              title: const Text('Allow Back Navigation'),
              subtitle:
                  const Text('Let students go back to previous questions'),
              value: settings.allowBackNavigation,
              onChanged: (value) {
                _updateSettings(settings.copyWith(allowBackNavigation: value));
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGradingSettings(
    BuildContext context,
    AssessmentSettings settings,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Show score immediately (using gradeReleasePolicy)
            SwitchListTile(
              title: const Text('Show Score Immediately'),
              subtitle: const Text('Display score right after submission'),
              value: settings.gradeReleasePolicy == 'IMMEDIATE',
              onChanged: (value) {
                _updateSettings(settings.copyWith(
                  gradeReleasePolicy: value ? 'IMMEDIATE' : 'MANUAL',
                ));
              },
            ),
            const Divider(),

            // Show correct answers
            SwitchListTile(
              title: const Text('Show Correct Answers'),
              subtitle: const Text('Reveal correct answers after submission'),
              value: settings.showCorrectAnswers,
              onChanged: (value) {
                _updateSettings(settings.copyWith(showCorrectAnswers: value));
              },
            ),
            const Divider(),

            // Show feedback
            SwitchListTile(
              title: const Text('Show Feedback'),
              subtitle: const Text('Display feedback after grading'),
              value: settings.showFeedback,
              onChanged: (value) {
                _updateSettings(settings.copyWith(showFeedback: value));
              },
            ),
            const Divider(),

            // Passing score
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Text('Passing Score: '),
                  Expanded(
                    child: Slider(
                      value: settings.passingScore ?? 60,
                      min: 0,
                      max: 100,
                      divisions: 20,
                      label: '${(settings.passingScore ?? 60).toInt()}%',
                      onChanged: (value) {
                        _updateSettings(
                          settings.copyWith(passingScore: value),
                        );
                      },
                    ),
                  ),
                  SizedBox(
                    width: 50,
                    child: Text(
                      '${(settings.passingScore ?? 60).toInt()}%',
                      style: const TextStyle(fontWeight: FontWeight.bold),
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

  Widget _buildSecuritySettings(
    BuildContext context,
    AssessmentSettings settings,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Lockdown browser mode
            SwitchListTile(
              title: const Text('Lockdown Browser'),
              subtitle: const Text('Require lockdown browser features'),
              value: settings.requireLockdownBrowser,
              onChanged: (value) {
                _updateSettings(settings.copyWith(requireLockdownBrowser: value));
              },
            ),
            const Divider(),

            // Detect tab switching
            SwitchListTile(
              title: const Text('Detect Tab Switching'),
              subtitle: const Text('Monitor when students leave the page'),
              value: settings.detectTabSwitch,
              onChanged: (value) {
                _updateSettings(settings.copyWith(detectTabSwitch: value));
              },
            ),
            const Divider(),

            // Prevent copy/paste
            SwitchListTile(
              title: const Text('Prevent Copy/Paste'),
              subtitle: const Text('Disable copying question content'),
              value: settings.preventCopyPaste,
              onChanged: (value) {
                _updateSettings(settings.copyWith(preventCopyPaste: value));
              },
            ),

            // Max violations
            if (settings.detectTabSwitch) ...[
              const Divider(),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Text('Max Violations: '),
                    Expanded(
                      child: Slider(
                        value: settings.maxViolations.toDouble(),
                        min: 1,
                        max: 10,
                        divisions: 9,
                        label: '${settings.maxViolations}',
                        onChanged: (value) {
                          _updateSettings(
                            settings.copyWith(maxViolations: value.toInt()),
                          );
                        },
                      ),
                    ),
                    SizedBox(
                      width: 40,
                      child: Text(
                        '${settings.maxViolations}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const Divider(),

            // Info note
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.grey[600], size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Additional security options like IP restrictions can be configured in the web admin panel.',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
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

  void _updateSettings(AssessmentSettings settings) {
    ref.read(currentAssessmentProvider.notifier).updateSettings(settings);
  }
}
