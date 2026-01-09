/// Teacher Settings Screen
///
/// App settings and account management for teachers.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../main.dart';

class TeacherSettingsScreen extends ConsumerWidget {
  const TeacherSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final authState = ref.watch(teacherAuthProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        children: [
          // Profile section
          Padding(
            padding: const EdgeInsets.all(16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: colorScheme.primaryContainer,
                      child: Icon(
                        Icons.person,
                        size: 32,
                        color: colorScheme.onPrimaryContainer,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            authState.teacherName ?? 'Teacher',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Aivo Teacher',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit),
                      onPressed: () => _showProfileEditor(context, ref),
                    ),
                  ],
                ),
              ),
            ),
          ),

          const Divider(height: 1),

          // Notifications
          _SettingsSection(
            title: 'Notifications',
            children: [
              _SettingsTile(
                icon: Icons.notifications_outlined,
                title: 'Push Notifications',
                subtitle: 'Receive alerts for important updates',
                trailing: Switch(
                  value: true, // TODO: Connect to actual preference
                  onChanged: (value) {
                    // TODO: Save preference
                  },
                ),
              ),
              _SettingsTile(
                icon: Icons.warning_amber,
                title: 'Student Alerts',
                subtitle: 'Get notified when students need attention',
                trailing: Switch(
                  value: true, // TODO: Connect to actual preference
                  onChanged: (value) {
                    // TODO: Save preference
                  },
                ),
              ),
            ],
          ),

          // Appearance & Accessibility
          _SettingsSection(
            title: 'Appearance & Accessibility',
            children: [
              _SettingsTile(
                icon: Icons.accessibility_new,
                title: 'Accessibility',
                subtitle: 'Text size, contrast, and display options',
                onTap: () => context.go('/accessibility'),
              ),
              _SettingsTile(
                icon: Icons.dark_mode_outlined,
                title: 'Dark Mode',
                subtitle: 'Use dark theme',
                trailing: Switch(
                  value: false, // TODO: Connect to actual theme
                  onChanged: (value) {
                    // TODO: Save preference
                  },
                ),
              ),
            ],
          ),

          // Data & Privacy
          _SettingsSection(
            title: 'Data & Privacy',
            children: [
              _SettingsTile(
                icon: Icons.cloud_download_outlined,
                title: 'Offline Data',
                subtitle: 'Manage cached data',
                onTap: () {
                  _showOfflineDataDialog(context);
                },
              ),
              _SettingsTile(
                icon: Icons.shield_outlined,
                title: 'Privacy Policy',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Opening privacy policy...')),
                  );
                },
              ),
            ],
          ),

          // Support
          _SettingsSection(
            title: 'Support',
            children: [
              _SettingsTile(
                icon: Icons.help_outline,
                title: 'Help Center',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Opening help center...')),
                  );
                },
              ),
              _SettingsTile(
                icon: Icons.feedback_outlined,
                title: 'Send Feedback',
                onTap: () {
                  _showFeedbackDialog(context);
                },
              ),
              _SettingsTile(
                icon: Icons.info_outline,
                title: 'About',
                subtitle: 'Version 1.0.0',
                onTap: () {
                  showAboutDialog(
                    context: context,
                    applicationName: 'Aivo Teacher',
                    applicationVersion: '1.0.0',
                    applicationLegalese: '© 2024 Aivo Education',
                  );
                },
              ),
            ],
          ),

          // Sign out
          Padding(
            padding: const EdgeInsets.all(16),
            child: OutlinedButton(
              onPressed: () => _handleLogout(context, ref),
              style: OutlinedButton.styleFrom(
                foregroundColor: colorScheme.error,
                side: BorderSide(color: colorScheme.error),
              ),
              child: const Text('Sign Out'),
            ),
          ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  void _showProfileEditor(BuildContext context, WidgetRef ref) {
    final authState = ref.read(teacherAuthProvider);
    final nameController = TextEditingController(text: authState.teacherName ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Edit Profile',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Display Name',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Profile updated')),
                    );
                  },
                  child: const Text('Save Changes'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showOfflineDataDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Offline Data'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Cached data: 12.5 MB'),
            const SizedBox(height: 8),
            Text(
              'Last synced: Today, 2:30 PM',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton.tonal(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Cache cleared')),
              );
            },
            child: const Text('Clear Cache'),
          ),
        ],
      ),
    );
  }

  void _showFeedbackDialog(BuildContext context) {
    final feedbackController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Send Feedback',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: feedbackController,
                  decoration: const InputDecoration(
                    labelText: 'Your feedback',
                    hintText: 'Tell us what you think...',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 4,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Thank you for your feedback!')),
                    );
                  },
                  child: const Text('Submit'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleLogout(BuildContext context, WidgetRef ref) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign Out?'),
        content: const Text('You will need to sign in again to access your classes.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await ref.read(teacherAuthProvider.notifier).logout();
      if (context.mounted) {
        context.go('/login');
      }
    }
  }
}

class _SettingsSection extends StatelessWidget {
  const _SettingsSection({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
          ),
        ),
        ...children,
      ],
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: subtitle != null ? Text(subtitle!) : null,
      trailing: trailing ?? (onTap != null ? const Icon(Icons.chevron_right) : null),
      onTap: onTap,
    );
  }
}
