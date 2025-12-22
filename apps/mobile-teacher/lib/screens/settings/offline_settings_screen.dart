/// Offline Settings Screen
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../providers/providers.dart';

/// Screen for managing offline data.
class OfflineSettingsScreen extends ConsumerWidget {
  const OfflineSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncProvider);
    final isOnline = ref.watch(isOnlineProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Offline Data'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Status card
          Card(
            color: isOnline ? Colors.green.shade50 : Colors.orange.shade50,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    isOnline ? Icons.cloud_done : Icons.cloud_off,
                    color: isOnline ? Colors.green : Colors.orange,
                    size: 32,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isOnline ? 'Connected' : 'Offline Mode',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text(
                          isOnline
                              ? 'Your data is syncing automatically'
                              : 'Changes will sync when online',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Pending changes
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ListTile(
                  leading: const Icon(Icons.pending_actions),
                  title: const Text('Pending Changes'),
                  trailing: Text(
                    '${syncState.pendingCount}',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                if (syncState.hasPendingChanges)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: FilledButton.icon(
                      onPressed: isOnline
                          ? () => ref.read(syncProvider.notifier).syncNow()
                          : null,
                      icon: const Icon(Icons.sync),
                      label: const Text('Sync Now'),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Last sync
          Card(
            child: ListTile(
              leading: const Icon(Icons.history),
              title: const Text('Last Synced'),
              trailing: Text(
                syncState.lastSyncAt != null
                    ? DateFormat('MMM d, h:mm a').format(syncState.lastSyncAt!)
                    : 'Never',
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Conflicts
          if (syncState.hasConflicts)
            Card(
              color: Colors.orange.shade50,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ListTile(
                    leading: Icon(Icons.warning_amber, color: Colors.orange.shade700),
                    title: Text(
                      'Sync Conflicts',
                      style: TextStyle(color: Colors.orange.shade700),
                    ),
                    trailing: Text(
                      '${syncState.conflicts.length}',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.orange.shade700,
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Text(
                      'Some changes conflict with server data. Review and resolve.',
                      style: TextStyle(color: Colors.orange.shade700),
                    ),
                  ),
                  ...syncState.conflicts.take(3).map((conflict) => ListTile(
                    title: Text(conflict.entityType),
                    subtitle: Text(conflict.conflictType.name),
                    trailing: TextButton(
                      onPressed: () => _showResolveDialog(context, ref, conflict.operationId),
                      child: const Text('Resolve'),
                    ),
                  )),
                ],
              ),
            ),

          const SizedBox(height: 24),

          // Cached data info
          Text(
            'Cached Data',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                _CacheInfoTile(icon: Icons.people, title: 'Students'),
                const Divider(height: 1),
                _CacheInfoTile(icon: Icons.play_circle, title: 'Sessions'),
                const Divider(height: 1),
                _CacheInfoTile(icon: Icons.assignment, title: 'IEP Goals'),
                const Divider(height: 1),
                _CacheInfoTile(icon: Icons.message, title: 'Messages'),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Clear cache button
          OutlinedButton.icon(
            onPressed: () => _confirmClearCache(context),
            icon: const Icon(Icons.delete_outline),
            label: const Text('Clear Cached Data'),
          ),
        ],
      ),
    );
  }

  void _showResolveDialog(BuildContext context, WidgetRef ref, String operationId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Resolve Conflict'),
        content: const Text('How would you like to resolve this conflict?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          OutlinedButton(
            onPressed: () {
              // Would resolve with local
              Navigator.pop(context);
            },
            child: const Text('Keep Local'),
          ),
          FilledButton(
            onPressed: () {
              // Would resolve with server
              Navigator.pop(context);
            },
            child: const Text('Use Server'),
          ),
        ],
      ),
    );
  }

  void _confirmClearCache(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Cache'),
        content: const Text(
          'This will remove all cached data. Pending changes will be lost. '
          'Are you sure?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Cache cleared')),
              );
            },
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }
}

class _CacheInfoTile extends StatelessWidget {
  const _CacheInfoTile({
    required this.icon,
    required this.title,
  });

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: Colors.grey),
      title: Text(title),
      trailing: Text(
        'Cached',
        style: TextStyle(color: Colors.green.shade700),
      ),
    );
  }
}
