/// Child Notification Settings Screen
///
/// Screen for parents to manage COPPA-compliant notification preferences
/// for their child's learner device.
/// 
/// COPPA COMPLIANCE NOTE:
/// All notification settings for children under 13 must be controlled by
/// the parent/guardian. This screen provides parent-controlled settings
/// that are synced to the child's device.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_notifications/flutter_notifications.dart';

/// Provider for child notification settings
final childNotificationSettingsProvider =
    StateNotifierProvider.family<ChildNotificationSettingsNotifier, ChildNotificationSettingsState, String>(
  (ref, learnerId) => ChildNotificationSettingsNotifier(learnerId),
);

class ChildNotificationSettingsState {
  const ChildNotificationSettingsState({
    this.isLoading = false,
    this.error,
    this.sessionRemindersEnabled = true,
    this.achievementAlertsEnabled = true,
    this.streakRemindersEnabled = true,
    this.encouragementEnabled = true,
    this.soundsEnabled = true,
    this.vibrationEnabled = true,
    this.quietHoursEnabled = true,
    this.quietHoursStart = '20:00',
    this.quietHoursEnd = '08:00',
  });

  final bool isLoading;
  final String? error;
  
  // Educational notifications
  final bool sessionRemindersEnabled;
  final bool achievementAlertsEnabled;
  final bool streakRemindersEnabled;
  final bool encouragementEnabled;
  
  // Delivery settings
  final bool soundsEnabled;
  final bool vibrationEnabled;
  
  // Quiet hours (stricter for children)
  final bool quietHoursEnabled;
  final String quietHoursStart;
  final String quietHoursEnd;

  ChildNotificationSettingsState copyWith({
    bool? isLoading,
    String? error,
    bool? sessionRemindersEnabled,
    bool? achievementAlertsEnabled,
    bool? streakRemindersEnabled,
    bool? encouragementEnabled,
    bool? soundsEnabled,
    bool? vibrationEnabled,
    bool? quietHoursEnabled,
    String? quietHoursStart,
    String? quietHoursEnd,
  }) {
    return ChildNotificationSettingsState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      sessionRemindersEnabled: sessionRemindersEnabled ?? this.sessionRemindersEnabled,
      achievementAlertsEnabled: achievementAlertsEnabled ?? this.achievementAlertsEnabled,
      streakRemindersEnabled: streakRemindersEnabled ?? this.streakRemindersEnabled,
      encouragementEnabled: encouragementEnabled ?? this.encouragementEnabled,
      soundsEnabled: soundsEnabled ?? this.soundsEnabled,
      vibrationEnabled: vibrationEnabled ?? this.vibrationEnabled,
      quietHoursEnabled: quietHoursEnabled ?? this.quietHoursEnabled,
      quietHoursStart: quietHoursStart ?? this.quietHoursStart,
      quietHoursEnd: quietHoursEnd ?? this.quietHoursEnd,
    );
  }

  /// Convert to LearnerNotificationSettings for the shared library
  LearnerNotificationSettings toLibrarySettings() {
    return LearnerNotificationSettings(
      sessionRemindersEnabled: sessionRemindersEnabled,
      achievementNotificationsEnabled: achievementAlertsEnabled,
      encouragementEnabled: encouragementEnabled,
    );
  }
}

class ChildNotificationSettingsNotifier extends StateNotifier<ChildNotificationSettingsState> {
  ChildNotificationSettingsNotifier(this.learnerId) : super(const ChildNotificationSettingsState());

  final String learnerId;

  Future<void> loadSettings() async {
    state = state.copyWith(isLoading: true);

    try {
      // TODO: Load from backend
      await Future.delayed(const Duration(milliseconds: 500));
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> updateSetting(String key, dynamic value) async {
    switch (key) {
      case 'sessionRemindersEnabled':
        state = state.copyWith(sessionRemindersEnabled: value as bool);
        break;
      case 'achievementAlertsEnabled':
        state = state.copyWith(achievementAlertsEnabled: value as bool);
        break;
      case 'streakRemindersEnabled':
        state = state.copyWith(streakRemindersEnabled: value as bool);
        break;
      case 'encouragementEnabled':
        state = state.copyWith(encouragementEnabled: value as bool);
        break;
      case 'soundsEnabled':
        state = state.copyWith(soundsEnabled: value as bool);
        break;
      case 'vibrationEnabled':
        state = state.copyWith(vibrationEnabled: value as bool);
        break;
      case 'quietHoursEnabled':
        state = state.copyWith(quietHoursEnabled: value as bool);
        break;
      case 'quietHoursStart':
        state = state.copyWith(quietHoursStart: value as String);
        break;
      case 'quietHoursEnd':
        state = state.copyWith(quietHoursEnd: value as String);
        break;
    }

    // TODO: Save to backend and sync to child device
  }

  Future<void> disableAllNotifications() async {
    state = state.copyWith(
      sessionRemindersEnabled: false,
      achievementAlertsEnabled: false,
      streakRemindersEnabled: false,
      encouragementEnabled: false,
    );
    // TODO: Save to backend
  }

  Future<void> enableRecommendedSettings() async {
    state = state.copyWith(
      sessionRemindersEnabled: true,
      achievementAlertsEnabled: true,
      streakRemindersEnabled: true,
      encouragementEnabled: true,
      soundsEnabled: true,
      vibrationEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '20:00',
      quietHoursEnd: '08:00',
    );
    // TODO: Save to backend
  }
}

class ChildNotificationSettingsScreen extends ConsumerStatefulWidget {
  const ChildNotificationSettingsScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  ConsumerState<ChildNotificationSettingsScreen> createState() =>
      _ChildNotificationSettingsScreenState();
}

class _ChildNotificationSettingsScreenState
    extends ConsumerState<ChildNotificationSettingsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(childNotificationSettingsProvider(widget.learnerId).notifier).loadSettings();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final state = ref.watch(childNotificationSettingsProvider(widget.learnerId));

    return Scaffold(
      appBar: AppBar(
        title: Text("${widget.learnerName}'s Notifications"),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'disable_all':
                  _confirmDisableAll(context);
                  break;
                case 'recommended':
                  ref
                      .read(childNotificationSettingsProvider(widget.learnerId).notifier)
                      .enableRecommendedSettings();
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'recommended',
                child: ListTile(
                  leading: Icon(Icons.recommend),
                  title: Text('Use Recommended'),
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'disable_all',
                child: ListTile(
                  leading: Icon(Icons.notifications_off),
                  title: Text('Disable All'),
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? _buildErrorState(context, state.error!)
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildCoppaNotice(context, colorScheme),
                      const SizedBox(height: 16),
                      _buildEducationalSection(context, state, colorScheme),
                      const SizedBox(height: 24),
                      _buildDeliverySection(context, state, colorScheme),
                      const SizedBox(height: 24),
                      _buildQuietHoursSection(context, state, colorScheme),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
    );
  }

  Widget _buildCoppaNotice(BuildContext context, ColorScheme colorScheme) {
    return Card(
      color: colorScheme.secondaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              Icons.shield_outlined,
              color: colorScheme.onSecondaryContainer,
              size: 32,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Child Safety',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: colorScheme.onSecondaryContainer,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'You control all notifications sent to ${widget.learnerName}\'s device. '
                    'Only educational content is allowed.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSecondaryContainer,
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

  Widget _buildErrorState(BuildContext context, String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          Text('Failed to load settings', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(error, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => ref
                .read(childNotificationSettingsProvider(widget.learnerId).notifier)
                .loadSettings(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildEducationalSection(
    BuildContext context,
    ChildNotificationSettingsState state,
    ColorScheme colorScheme,
  ) {
    return _SettingsSection(
      title: 'Learning Notifications',
      icon: Icons.school,
      subtitle: 'Age-appropriate educational notifications only',
      children: [
        SwitchListTile(
          title: const Text('Session Reminders'),
          subtitle: const Text('Remind to start learning sessions'),
          secondary: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.blue.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.access_time, color: Colors.blue.shade700),
          ),
          value: state.sessionRemindersEnabled,
          onChanged: (value) => _updateSetting('sessionRemindersEnabled', value),
        ),
        SwitchListTile(
          title: const Text('Achievement Alerts'),
          subtitle: const Text('Celebrate badges and milestones'),
          secondary: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.amber.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.emoji_events, color: Colors.amber.shade700),
          ),
          value: state.achievementAlertsEnabled,
          onChanged: (value) => _updateSetting('achievementAlertsEnabled', value),
        ),
        SwitchListTile(
          title: const Text('Streak Reminders'),
          subtitle: const Text('Help maintain learning streaks'),
          secondary: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.orange.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.local_fire_department, color: Colors.orange.shade700),
          ),
          value: state.streakRemindersEnabled,
          onChanged: (value) => _updateSetting('streakRemindersEnabled', value),
        ),
        SwitchListTile(
          title: const Text('Encouragement'),
          subtitle: const Text('Positive motivational messages'),
          secondary: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.green.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.favorite, color: Colors.green.shade700),
          ),
          value: state.encouragementEnabled,
          onChanged: (value) => _updateSetting('encouragementEnabled', value),
        ),
      ],
    );
  }

  Widget _buildDeliverySection(
    BuildContext context,
    ChildNotificationSettingsState state,
    ColorScheme colorScheme,
  ) {
    return _SettingsSection(
      title: 'Alert Settings',
      icon: Icons.volume_up,
      children: [
        SwitchListTile(
          title: const Text('Notification Sounds'),
          subtitle: const Text('Play sound with notifications'),
          value: state.soundsEnabled,
          onChanged: (value) => _updateSetting('soundsEnabled', value),
        ),
        SwitchListTile(
          title: const Text('Vibration'),
          subtitle: const Text('Vibrate with notifications'),
          value: state.vibrationEnabled,
          onChanged: (value) => _updateSetting('vibrationEnabled', value),
        ),
      ],
    );
  }

  Widget _buildQuietHoursSection(
    BuildContext context,
    ChildNotificationSettingsState state,
    ColorScheme colorScheme,
  ) {
    return _SettingsSection(
      title: 'Quiet Hours',
      icon: Icons.bedtime,
      subtitle: 'Recommended: Enable quiet hours during bedtime',
      children: [
        SwitchListTile(
          title: const Text('Enable Quiet Hours'),
          subtitle: Text(
            state.quietHoursEnabled
                ? 'No notifications from ${state.quietHoursStart} to ${state.quietHoursEnd}'
                : 'Notifications can arrive anytime',
          ),
          value: state.quietHoursEnabled,
          onChanged: (value) => _updateSetting('quietHoursEnabled', value),
        ),
        if (state.quietHoursEnabled) ...[
          ListTile(
            title: const Text('Bedtime (Start)'),
            subtitle: const Text('When quiet hours begin'),
            trailing: TextButton(
              onPressed: () => _selectTime(
                context,
                state.quietHoursStart,
                (time) => _updateSetting('quietHoursStart', time),
              ),
              child: Text(state.quietHoursStart),
            ),
          ),
          ListTile(
            title: const Text('Wake Time (End)'),
            subtitle: const Text('When quiet hours end'),
            trailing: TextButton(
              onPressed: () => _selectTime(
                context,
                state.quietHoursEnd,
                (time) => _updateSetting('quietHoursEnd', time),
              ),
              child: Text(state.quietHoursEnd),
            ),
          ),
        ],
      ],
    );
  }

  void _updateSetting(String key, dynamic value) {
    ref.read(childNotificationSettingsProvider(widget.learnerId).notifier).updateSetting(key, value);
  }

  Future<void> _selectTime(
    BuildContext context,
    String currentTime,
    void Function(String) onSelected,
  ) async {
    final parts = currentTime.split(':');
    final initialTime = TimeOfDay(
      hour: int.parse(parts[0]),
      minute: int.parse(parts[1]),
    );

    final selectedTime = await showTimePicker(
      context: context,
      initialTime: initialTime,
    );

    if (selectedTime != null) {
      final formattedTime =
          '${selectedTime.hour.toString().padLeft(2, '0')}:${selectedTime.minute.toString().padLeft(2, '0')}';
      onSelected(formattedTime);
    }
  }

  void _confirmDisableAll(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Disable All Notifications?'),
        content: Text(
          'This will turn off all notifications for ${widget.learnerName}\'s device. '
          'They won\'t receive reminders or achievement alerts.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              ref
                  .read(childNotificationSettingsProvider(widget.learnerId).notifier)
                  .disableAllNotifications();
            },
            child: const Text('Disable All'),
          ),
        ],
      ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  const _SettingsSection({
    required this.title,
    required this.icon,
    required this.children,
    this.subtitle,
  });

  final String title;
  final IconData icon;
  final List<Widget> children;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(icon, color: colorScheme.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: colorScheme.primary,
                        ),
                      ),
                      if (subtitle != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            subtitle!,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ...children,
        ],
      ),
    );
  }
}
