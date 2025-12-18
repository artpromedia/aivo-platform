/// Notification Settings Screen
///
/// Screen for parents to manage notification preferences per child.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../notifications/notification_service.dart';

class NotificationSettingsScreen extends ConsumerStatefulWidget {
  const NotificationSettingsScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  ConsumerState<NotificationSettingsScreen> createState() =>
      _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState
    extends ConsumerState<NotificationSettingsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(notificationPreferencesProvider.notifier)
          .loadPreferencesForLearner(widget.learnerId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final state = ref.watch(notificationPreferencesProvider);
    final preferences = state.getPreferencesForLearner(widget.learnerId);

    return Scaffold(
      appBar: AppBar(
        title: Text('Notifications for ${widget.learnerName}'),
        actions: [
          if (preferences != null)
            IconButton(
              icon: const Icon(Icons.restore),
              tooltip: 'Reset to Defaults',
              onPressed: () => _showResetConfirmation(context),
            ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? _buildErrorState(context, state.error!)
              : preferences == null
                  ? _buildEmptyState(context)
                  : RefreshIndicator(
                      onRefresh: () => ref
                          .read(notificationPreferencesProvider.notifier)
                          .loadPreferencesForLearner(widget.learnerId),
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildDeliveryChannelsSection(
                                context, preferences, colorScheme),
                            const SizedBox(height: 24),
                            _buildCategorySection(
                                context, preferences, colorScheme),
                            const SizedBox(height: 24),
                            _buildUrgencySection(
                                context, preferences, colorScheme),
                            const SizedBox(height: 24),
                            _buildQuietHoursSection(
                                context, preferences, colorScheme),
                            const SizedBox(height: 24),
                            _buildDigestSection(
                                context, preferences, colorScheme),
                            const SizedBox(height: 24),
                            _buildRateLimitSection(
                                context, preferences, colorScheme),
                            const SizedBox(height: 32),
                          ],
                        ),
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
            onPressed: () => ref
                .read(notificationPreferencesProvider.notifier)
                .loadPreferencesForLearner(widget.learnerId),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return const Center(
      child: Text('No preferences found'),
    );
  }

  Widget _buildDeliveryChannelsSection(
    BuildContext context,
    NotificationPreferences preferences,
    ColorScheme colorScheme,
  ) {
    return _SettingsSection(
      title: 'Delivery Channels',
      icon: Icons.notifications_active,
      children: [
        _ChannelToggle(
          title: 'Push Notifications',
          subtitle: 'Receive alerts on your device',
          icon: Icons.phone_android,
          value: preferences.pushEnabled,
          onChanged: (value) => _updatePreference('pushEnabled', value),
        ),
        _ChannelToggle(
          title: 'Email',
          subtitle: preferences.email ?? 'No email set',
          icon: Icons.email,
          value: preferences.emailEnabled,
          onChanged: (value) => _updatePreference('emailEnabled', value),
        ),
        _ChannelToggle(
          title: 'SMS',
          subtitle: preferences.phoneNumber ?? 'No phone set',
          icon: Icons.sms,
          value: preferences.smsEnabled,
          onChanged: (value) => _updatePreference('smsEnabled', value),
        ),
        _ChannelToggle(
          title: 'In-App',
          subtitle: 'See notifications in the app',
          icon: Icons.inbox,
          value: preferences.inAppEnabled,
          onChanged: (value) => _updatePreference('inAppEnabled', value),
        ),
      ],
    );
  }

  Widget _buildCategorySection(
    BuildContext context,
    NotificationPreferences preferences,
    ColorScheme colorScheme,
  ) {
    return _SettingsSection(
      title: 'Notification Categories',
      icon: Icons.category,
      children: [
        for (final category in NotificationCategory.values)
          _CategoryTile(
            category: category,
            settings: preferences.categorySettings[category],
            onToggle: (enabled) => _updateCategorySetting(
              category,
              enabled,
              preferences.categorySettings[category]?.minimumUrgency ??
                  NotificationUrgency.low,
            ),
            onUrgencyChanged: (urgency) => _updateCategorySetting(
              category,
              preferences.categorySettings[category]?.enabled ?? true,
              urgency,
            ),
          ),
      ],
    );
  }

  Widget _buildUrgencySection(
    BuildContext context,
    NotificationPreferences preferences,
    ColorScheme colorScheme,
  ) {
    return _SettingsSection(
      title: 'Urgency Settings',
      icon: Icons.priority_high,
      subtitle: 'Configure which channels are used for each urgency level',
      children: [
        for (final urgency in NotificationUrgency.values)
          _UrgencyChannelTile(
            urgency: urgency,
            settings: preferences.urgencySettings[urgency],
            pushEnabled: preferences.pushEnabled,
            emailEnabled: preferences.emailEnabled,
            smsEnabled: preferences.smsEnabled,
            inAppEnabled: preferences.inAppEnabled,
            onChanged: (settings) => _updateUrgencySettings(urgency, settings),
          ),
      ],
    );
  }

  Widget _buildQuietHoursSection(
    BuildContext context,
    NotificationPreferences preferences,
    ColorScheme colorScheme,
  ) {
    return _SettingsSection(
      title: 'Quiet Hours',
      icon: Icons.do_not_disturb_on,
      children: [
        SwitchListTile(
          title: const Text('Enable Quiet Hours'),
          subtitle: Text(
            preferences.quietHoursEnabled
                ? '${preferences.quietHoursStart} - ${preferences.quietHoursEnd}'
                : 'Receive notifications anytime',
          ),
          value: preferences.quietHoursEnabled,
          onChanged: (value) => _updatePreference('quietHoursEnabled', value),
        ),
        if (preferences.quietHoursEnabled) ...[
          ListTile(
            title: const Text('Start Time'),
            trailing: Text(preferences.quietHoursStart),
            onTap: () => _selectTime(
              context,
              preferences.quietHoursStart,
              (time) => _updatePreference('quietHoursStart', time),
            ),
          ),
          ListTile(
            title: const Text('End Time'),
            trailing: Text(preferences.quietHoursEnd),
            onTap: () => _selectTime(
              context,
              preferences.quietHoursEnd,
              (time) => _updatePreference('quietHoursEnd', time),
            ),
          ),
          SwitchListTile(
            title: const Text('Bypass for Critical Alerts'),
            subtitle: const Text(
              'Always receive critical safety alerts',
            ),
            value: preferences.quietHoursBypassCritical,
            onChanged: (value) =>
                _updatePreference('quietHoursBypassCritical', value),
          ),
        ],
      ],
    );
  }

  Widget _buildDigestSection(
    BuildContext context,
    NotificationPreferences preferences,
    ColorScheme colorScheme,
  ) {
    return _SettingsSection(
      title: 'Digest Settings',
      icon: Icons.summarize,
      children: [
        SwitchListTile(
          title: const Text('Enable Digest'),
          subtitle: const Text(
            'Receive a summary instead of individual notifications',
          ),
          value: preferences.digestEnabled,
          onChanged: (value) => _updatePreference('digestEnabled', value),
        ),
        if (preferences.digestEnabled) ...[
          ListTile(
            title: const Text('Frequency'),
            trailing: DropdownButton<DigestFrequency>(
              value: preferences.digestFrequency,
              underline: const SizedBox(),
              items: DigestFrequency.values.map((f) {
                return DropdownMenuItem(
                  value: f,
                  child: Text(f.displayName),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  _updatePreference('digestFrequency', value.value);
                }
              },
            ),
          ),
          ListTile(
            title: const Text('Delivery Time'),
            trailing: Text(preferences.digestTime),
            onTap: () => _selectTime(
              context,
              preferences.digestTime,
              (time) => _updatePreference('digestTime', time),
            ),
          ),
          if (preferences.digestFrequency == DigestFrequency.weekly)
            ListTile(
              title: const Text('Day of Week'),
              trailing: DropdownButton<int>(
                value: preferences.digestDay,
                underline: const SizedBox(),
                items: const [
                  DropdownMenuItem(value: 0, child: Text('Sunday')),
                  DropdownMenuItem(value: 1, child: Text('Monday')),
                  DropdownMenuItem(value: 2, child: Text('Tuesday')),
                  DropdownMenuItem(value: 3, child: Text('Wednesday')),
                  DropdownMenuItem(value: 4, child: Text('Thursday')),
                  DropdownMenuItem(value: 5, child: Text('Friday')),
                  DropdownMenuItem(value: 6, child: Text('Saturday')),
                ],
                onChanged: (value) {
                  if (value != null) {
                    _updatePreference('digestDay', value);
                  }
                },
              ),
            ),
        ],
      ],
    );
  }

  Widget _buildRateLimitSection(
    BuildContext context,
    NotificationPreferences preferences,
    ColorScheme colorScheme,
  ) {
    return _SettingsSection(
      title: 'Rate Limiting',
      icon: Icons.speed,
      subtitle: 'Prevent notification overload',
      children: [
        ListTile(
          title: const Text('Max per Hour'),
          trailing: SizedBox(
            width: 80,
            child: DropdownButton<int>(
              value: preferences.maxNotificationsPerHour,
              isExpanded: true,
              underline: const SizedBox(),
              items: [5, 10, 15, 20, 25, 30].map((n) {
                return DropdownMenuItem(value: n, child: Text('$n'));
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  _updatePreference('maxNotificationsPerHour', value);
                }
              },
            ),
          ),
        ),
        ListTile(
          title: const Text('Max per Day'),
          trailing: SizedBox(
            width: 80,
            child: DropdownButton<int>(
              value: preferences.maxNotificationsPerDay,
              isExpanded: true,
              underline: const SizedBox(),
              items: [25, 50, 75, 100, 150, 200].map((n) {
                return DropdownMenuItem(value: n, child: Text('$n'));
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  _updatePreference('maxNotificationsPerDay', value);
                }
              },
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _updatePreference(String key, dynamic value) async {
    final success = await ref
        .read(notificationPreferencesProvider.notifier)
        .updatePreferences(widget.learnerId, {key: value});

    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Failed to update preference'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  Future<void> _updateCategorySetting(
    NotificationCategory category,
    bool enabled,
    NotificationUrgency minimumUrgency,
  ) async {
    final preferences =
        ref.read(notificationPreferencesProvider).getPreferencesForLearner(widget.learnerId);
    if (preferences == null) return;

    final categorySettingsJson = <String, dynamic>{};
    for (final entry in preferences.categorySettings.entries) {
      categorySettingsJson[entry.key.value] = entry.value.toJson();
    }
    categorySettingsJson[category.value] = {
      'enabled': enabled,
      'minimumUrgency': minimumUrgency.value,
    };

    await _updatePreference('categorySettings', categorySettingsJson);
  }

  Future<void> _updateUrgencySettings(
    NotificationUrgency urgency,
    UrgencyChannelSettings settings,
  ) async {
    final preferences =
        ref.read(notificationPreferencesProvider).getPreferencesForLearner(widget.learnerId);
    if (preferences == null) return;

    final urgencySettingsJson = <String, dynamic>{};
    for (final entry in preferences.urgencySettings.entries) {
      urgencySettingsJson[entry.key.value] = entry.value.toJson();
    }
    urgencySettingsJson[urgency.value] = settings.toJson();

    await _updatePreference('urgencySettings', urgencySettingsJson);
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

    final selected = await showTimePicker(
      context: context,
      initialTime: initialTime,
    );

    if (selected != null) {
      final formatted =
          '${selected.hour.toString().padLeft(2, '0')}:${selected.minute.toString().padLeft(2, '0')}';
      onSelected(formatted);
    }
  }

  void _showResetConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset Preferences'),
        content: const Text(
          'Are you sure you want to reset all notification preferences to defaults?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              final success = await ref
                  .read(notificationPreferencesProvider.notifier)
                  .resetPreferences(widget.learnerId);

              if (!success && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('Failed to reset preferences'),
                    backgroundColor: Theme.of(context).colorScheme.error,
                  ),
                );
              } else if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Preferences reset to defaults')),
                );
              }
            },
            child: const Text('Reset'),
          ),
        ],
      ),
    );
  }
}

/// Settings section widget
class _SettingsSection extends StatelessWidget {
  const _SettingsSection({
    required this.title,
    required this.icon,
    required this.children,
    this.subtitle,
  });

  final String title;
  final IconData icon;
  final String? subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: theme.colorScheme.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: theme.textTheme.titleMedium),
                      if (subtitle != null)
                        Text(
                          subtitle!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }
}

/// Channel toggle widget
class _ChannelToggle extends StatelessWidget {
  const _ChannelToggle({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.value,
    required this.onChanged,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      title: Text(title),
      subtitle: Text(subtitle),
      secondary: Icon(icon),
      value: value,
      onChanged: onChanged,
    );
  }
}

/// Category tile widget
class _CategoryTile extends StatelessWidget {
  const _CategoryTile({
    required this.category,
    required this.settings,
    required this.onToggle,
    required this.onUrgencyChanged,
  });

  final NotificationCategory category;
  final CategorySettings? settings;
  final ValueChanged<bool> onToggle;
  final ValueChanged<NotificationUrgency> onUrgencyChanged;

  @override
  Widget build(BuildContext context) {
    final enabled = settings?.enabled ?? true;
    final urgency = settings?.minimumUrgency ?? NotificationUrgency.low;

    return ExpansionTile(
      title: Text(category.displayName),
      subtitle: Text(
        enabled ? 'Minimum: ${urgency.displayName}' : 'Disabled',
        style: TextStyle(
          color: enabled ? null : Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
      leading: Switch(
        value: enabled,
        onChanged: onToggle,
      ),
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                category.description,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 12),
              if (enabled) ...[
                const Text('Minimum Urgency Level:'),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: NotificationUrgency.values.map((u) {
                    return ChoiceChip(
                      label: Text(u.displayName),
                      selected: urgency == u,
                      onSelected: (_) => onUrgencyChanged(u),
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// Urgency channel tile widget
class _UrgencyChannelTile extends StatelessWidget {
  const _UrgencyChannelTile({
    required this.urgency,
    required this.settings,
    required this.pushEnabled,
    required this.emailEnabled,
    required this.smsEnabled,
    required this.inAppEnabled,
    required this.onChanged,
  });

  final NotificationUrgency urgency;
  final UrgencyChannelSettings? settings;
  final bool pushEnabled;
  final bool emailEnabled;
  final bool smsEnabled;
  final bool inAppEnabled;
  final ValueChanged<UrgencyChannelSettings> onChanged;

  Color _getUrgencyColor(NotificationUrgency urgency) {
    switch (urgency) {
      case NotificationUrgency.critical:
        return Colors.red;
      case NotificationUrgency.high:
        return Colors.orange;
      case NotificationUrgency.medium:
        return Colors.amber;
      case NotificationUrgency.low:
        return Colors.green;
      case NotificationUrgency.info:
        return Colors.blue;
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentSettings = settings ??
        UrgencyChannelSettings(
          push: false,
          email: false,
          sms: false,
          inApp: true,
        );

    return ExpansionTile(
      title: Text(urgency.displayName),
      leading: CircleAvatar(
        backgroundColor: _getUrgencyColor(urgency).withValues(alpha: 0.2),
        child: Icon(
          Icons.priority_high,
          color: _getUrgencyColor(urgency),
        ),
      ),
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Column(
            children: [
              CheckboxListTile(
                title: const Text('Push'),
                value: currentSettings.push,
                enabled: pushEnabled,
                onChanged: pushEnabled
                    ? (value) => onChanged(
                          currentSettings.copyWith(push: value ?? false),
                        )
                    : null,
              ),
              CheckboxListTile(
                title: const Text('Email'),
                value: currentSettings.email,
                enabled: emailEnabled,
                onChanged: emailEnabled
                    ? (value) => onChanged(
                          currentSettings.copyWith(email: value ?? false),
                        )
                    : null,
              ),
              CheckboxListTile(
                title: const Text('SMS'),
                value: currentSettings.sms,
                enabled: smsEnabled,
                onChanged: smsEnabled
                    ? (value) => onChanged(
                          currentSettings.copyWith(sms: value ?? false),
                        )
                    : null,
              ),
              CheckboxListTile(
                title: const Text('In-App'),
                value: currentSettings.inApp,
                enabled: inAppEnabled,
                onChanged: inAppEnabled
                    ? (value) => onChanged(
                          currentSettings.copyWith(inApp: value ?? false),
                        )
                    : null,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
