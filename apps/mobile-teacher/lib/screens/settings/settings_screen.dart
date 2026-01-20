/// Settings Screen
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../providers/providers.dart';

/// Main settings screen.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncProvider);
    final isOnline = ref.watch(isOnlineProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        children: [
          // Account section
          _SectionHeader(title: 'Account'),
          ListTile(
            leading: const Icon(Icons.person),
            title: const Text('Profile'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/settings/profile'),
          ),
          ListTile(
            leading: const Icon(Icons.notifications),
            title: const Text('Notifications'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/settings/notifications'),
          ),

          // Sync section
          _SectionHeader(title: 'Sync & Data'),
          ListTile(
            leading: Icon(
              isOnline ? Icons.cloud_done : Icons.cloud_off,
              color: isOnline ? AivoBrand.success : AivoBrand.warning,
            ),
            title: Text(isOnline ? 'Online' : 'Offline'),
            subtitle: syncState.hasPendingChanges
                ? Text('${syncState.pendingCount} pending changes')
                : const Text('All synced'),
            trailing: syncState.hasPendingChanges
                ? TextButton(
                    onPressed: () => ref.read(syncProvider.notifier).syncNow(),
                    child: const Text('Sync Now'),
                  )
                : null,
          ),
          if (syncState.hasConflicts)
            ListTile(
              leading: const Icon(Icons.warning_amber, color: Colors.orange),
              title: const Text('Sync Conflicts'),
              subtitle: Text('${syncState.conflicts.length} conflict(s) to resolve'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/settings/sync-conflicts'),
            ),
          ListTile(
            leading: const Icon(Icons.storage),
            title: const Text('Offline Data'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/settings/offline'),
          ),

          // App section
          _SectionHeader(title: 'App'),
          ListTile(
            leading: const Icon(Icons.color_lens),
            title: const Text('Appearance'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/settings/appearance'),
          ),
          ListTile(
            leading: const Icon(Icons.help),
            title: const Text('Help & Support'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/settings/help'),
          ),
          ListTile(
            leading: const Icon(Icons.info),
            title: const Text('About'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showAboutDialog(context),
          ),

          // Logout
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              onPressed: () => _confirmLogout(context),
              icon: Icon(Icons.logout, color: AivoBrand.error),
              label: Text('Sign Out', style: TextStyle(color: AivoBrand.error)),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AivoBrand.error),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  void _showAboutDialog(BuildContext context) {
    showAboutDialog(
      context: context,
      applicationName: 'AIVO Teacher',
      applicationVersion: '1.0.0',
      applicationLegalese: '© 2024 AIVO Platform',
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              context.go('/login');
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: AivoBrand.gray,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}
