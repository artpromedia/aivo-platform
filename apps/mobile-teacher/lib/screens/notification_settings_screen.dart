/// Teacher Notification Settings Screen
///
/// Settings screen for teachers to manage their notification preferences.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';


/// Provider for teacher notification preferences
final teacherNotificationPreferencesProvider =
    StateNotifierProvider<TeacherNotificationPreferencesNotifier, TeacherNotificationPreferencesState>(
  (ref) => TeacherNotificationPreferencesNotifier(),
);

class TeacherNotificationPreferencesState {
  const TeacherNotificationPreferencesState({
    this.isLoading = false,
    this.error,
    this.pushEnabled = true,
    this.emailEnabled = true,
    this.studentAlertsEnabled = true,
    this.sessionCompletionsEnabled = true,
    this.parentMessagesEnabled = true,
    this.classRemindersEnabled = true,
    this.iepRemindersEnabled = true,
    this.quietHoursEnabled = false,
    this.quietHoursStart = '22:00',
    this.quietHoursEnd = '07:00',
  });

  final bool isLoading;
  final String? error;
  final bool pushEnabled;
  final bool emailEnabled;
  final bool studentAlertsEnabled;
  final bool sessionCompletionsEnabled;
  final bool parentMessagesEnabled;
  final bool classRemindersEnabled;
  final bool iepRemindersEnabled;
  final bool quietHoursEnabled;
  final String quietHoursStart;
  final String quietHoursEnd;

  TeacherNotificationPreferencesState copyWith({
    bool? isLoading,
    String? error,
    bool? pushEnabled,
    bool? emailEnabled,
    bool? studentAlertsEnabled,
    bool? sessionCompletionsEnabled,
    bool? parentMessagesEnabled,
    bool? classRemindersEnabled,
    bool? iepRemindersEnabled,
    bool? quietHoursEnabled,
    String? quietHoursStart,
    String? quietHoursEnd,
  }) {
    return TeacherNotificationPreferencesState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      pushEnabled: pushEnabled ?? this.pushEnabled,
      emailEnabled: emailEnabled ?? this.emailEnabled,
      studentAlertsEnabled: studentAlertsEnabled ?? this.studentAlertsEnabled,
      sessionCompletionsEnabled: sessionCompletionsEnabled ?? this.sessionCompletionsEnabled,
      parentMessagesEnabled: parentMessagesEnabled ?? this.parentMessagesEnabled,
      classRemindersEnabled: classRemindersEnabled ?? this.classRemindersEnabled,
      iepRemindersEnabled: iepRemindersEnabled ?? this.iepRemindersEnabled,
      quietHoursEnabled: quietHoursEnabled ?? this.quietHoursEnabled,
      quietHoursStart: quietHoursStart ?? this.quietHoursStart,
      quietHoursEnd: quietHoursEnd ?? this.quietHoursEnd,
    );
  }
}

class TeacherNotificationPreferencesNotifier extends StateNotifier<TeacherNotificationPreferencesState> {
  TeacherNotificationPreferencesNotifier() : super(const TeacherNotificationPreferencesState());

  Future<void> loadPreferences() async {
    state = state.copyWith(isLoading: true);

    try {
      // TODO: Load from backend
      await Future.delayed(const Duration(milliseconds: 500));
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> updatePreference(String key, dynamic value) async {
    switch (key) {
      case 'pushEnabled':
        state = state.copyWith(pushEnabled: value as bool);
        break;
      case 'emailEnabled':
        state = state.copyWith(emailEnabled: value as bool);
        break;
      case 'studentAlertsEnabled':
        state = state.copyWith(studentAlertsEnabled: value as bool);
        break;
      case 'sessionCompletionsEnabled':
        state = state.copyWith(sessionCompletionsEnabled: value as bool);
        break;
      case 'parentMessagesEnabled':
        state = state.copyWith(parentMessagesEnabled: value as bool);
        break;
      case 'classRemindersEnabled':
        state = state.copyWith(classRemindersEnabled: value as bool);
        break;
      case 'iepRemindersEnabled':
        state = state.copyWith(iepRemindersEnabled: value as bool);
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

    // TODO: Save to backend
  }
}

class TeacherNotificationSettingsScreen extends ConsumerStatefulWidget {
  const TeacherNotificationSettingsScreen({super.key});

  @override
  ConsumerState<TeacherNotificationSettingsScreen> createState() =>
      _TeacherNotificationSettingsScreenState();
}

class _TeacherNotificationSettingsScreenState
    extends ConsumerState<TeacherNotificationSettingsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(teacherNotificationPreferencesProvider.notifier).loadPreferences();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final state = ref.watch(teacherNotificationPreferencesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification Settings'),
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
                      _buildDeliverySection(context, state, colorScheme),
                      const SizedBox(height: 24),
                      _buildCategoriesSection(context, state, colorScheme),
                      const SizedBox(height: 24),
                      _buildQuietHoursSection(context, state, colorScheme),
                      const SizedBox(height: 32),
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
          Text('Failed to load preferences', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(error, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => ref.read(teacherNotificationPreferencesProvider.notifier).loadPreferences(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildDeliverySection(
    BuildContext context,
    TeacherNotificationPreferencesState state,
    ColorScheme colorScheme,
  ) {
    return _SettingsSection(
      title: 'Delivery Channels',
      icon: Icons.notifications_active,
      children: [
        SwitchListTile(
          title: const Text('Push Notifications'),
          subtitle: const Text('Receive alerts on your device'),
          secondary: const Icon(Icons.phone_android),
          value: state.pushEnabled,
          onChanged: (value) => _updatePreference('pushEnabled', value),
        ),
        SwitchListTile(
          title: const Text('Email Notifications'),
          subtitle: const Text('Receive daily digests via email'),
          secondary: const Icon(Icons.email),
          value: state.emailEnabled,
          onChanged: (value) => _updatePreference('emailEnabled', value),
        ),
      ],
    );
  }

  Widget _buildCategoriesSection(
    BuildContext context,
    TeacherNotificationPreferencesState state,
    ColorScheme colorScheme,
  ) {
    return _SettingsSection(
      title: 'Notification Categories',
      icon: Icons.category,
      children: [
        SwitchListTile(
          title: const Text('Student Alerts'),
          subtitle: const Text('When students are struggling or need attention'),
          secondary: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.orange.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.warning_amber, color: Colors.orange.shade700),
          ),
          value: state.studentAlertsEnabled,
          onChanged: (value) => _updatePreference('studentAlertsEnabled', value),
        ),
        SwitchListTile(
          title: const Text('Session Completions'),
          subtitle: const Text('When students finish learning sessions'),
          secondary: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.green.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.check_circle, color: Colors.green.shade700),
          ),
          value: state.sessionCompletionsEnabled,
          onChanged: (value) => _updatePreference('sessionCompletionsEnabled', value),
        ),
        SwitchListTile(
          title: const Text('Parent Messages'),
          subtitle: const Text('Messages from parents'),
          secondary: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.blue.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.chat, color: Colors.blue.shade700),
          ),
          value: state.parentMessagesEnabled,
          onChanged: (value) => _updatePreference('parentMessagesEnabled', value),
        ),
        SwitchListTile(
          title: const Text('Class Reminders'),
          subtitle: const Text('Upcoming class sessions'),
          secondary: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.purple.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.event, color: Colors.purple.shade700),
          ),
          value: state.classRemindersEnabled,
          onChanged: (value) => _updatePreference('classRemindersEnabled', value),
        ),
        SwitchListTile(
          title: const Text('IEP Goal Reminders'),
          subtitle: const Text('Upcoming IEP goal review dates'),
          secondary: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.teal.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.assignment, color: Colors.teal.shade700),
          ),
          value: state.iepRemindersEnabled,
          onChanged: (value) => _updatePreference('iepRemindersEnabled', value),
        ),
      ],
    );
  }

  Widget _buildQuietHoursSection(
    BuildContext context,
    TeacherNotificationPreferencesState state,
    ColorScheme colorScheme,
  ) {
    return _SettingsSection(
      title: 'Quiet Hours',
      icon: Icons.do_not_disturb_on,
      children: [
        SwitchListTile(
          title: const Text('Enable Quiet Hours'),
          subtitle: Text(
            state.quietHoursEnabled
                ? '${state.quietHoursStart} - ${state.quietHoursEnd}'
                : 'Receive notifications anytime',
          ),
          value: state.quietHoursEnabled,
          onChanged: (value) => _updatePreference('quietHoursEnabled', value),
        ),
        if (state.quietHoursEnabled) ...[
          ListTile(
            title: const Text('Start Time'),
            trailing: Text(state.quietHoursStart),
            onTap: () => _selectTime(
              context,
              state.quietHoursStart,
              (time) => _updatePreference('quietHoursStart', time),
            ),
          ),
          ListTile(
            title: const Text('End Time'),
            trailing: Text(state.quietHoursEnd),
            onTap: () => _selectTime(
              context,
              state.quietHoursEnd,
              (time) => _updatePreference('quietHoursEnd', time),
            ),
          ),
        ],
      ],
    );
  }

  void _updatePreference(String key, dynamic value) {
    ref.read(teacherNotificationPreferencesProvider.notifier).updatePreference(key, value);
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
}

class _SettingsSection extends StatelessWidget {
  const _SettingsSection({
    required this.title,
    required this.icon,
    required this.children,
  });

  final String title;
  final IconData icon;
  final List<Widget> children;

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
                Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.primary,
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
