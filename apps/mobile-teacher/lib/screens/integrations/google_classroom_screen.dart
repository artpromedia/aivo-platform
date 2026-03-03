/// Google Classroom Integration Screen
/// Manages OAuth connection, course linking, and sync operations
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../models/lms_integration.dart';
import '../../providers/lms_provider.dart';
import 'student_roster_screen.dart';

/// Main Google Classroom integration management screen
class GoogleClassroomScreen extends ConsumerStatefulWidget {
  const GoogleClassroomScreen({super.key});

  @override
  ConsumerState<GoogleClassroomScreen> createState() =>
      _GoogleClassroomScreenState();
}

class _GoogleClassroomScreenState extends ConsumerState<GoogleClassroomScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(lmsConnectionProvider.notifier).loadConnectionData();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(lmsConnectionProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Google Classroom'),
        actions: [
          if (state.isConnected)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: state.isLoading
                  ? null
                  : () => ref.read(lmsConnectionProvider.notifier).refresh(),
            ),
        ],
      ),
      body: state.isLoading && state.status == null
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () =>
                  ref.read(lmsConnectionProvider.notifier).refresh(),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Connection status card
                  _buildConnectionCard(state, theme),

                  // Error message
                  if (state.error != null) ...[
                    const SizedBox(height: 16),
                    _buildErrorCard(state.error!, theme),
                  ],

                  // Connected content
                  if (state.isConnected) ...[
                    const SizedBox(height: 24),
                    _buildCoursesSection(state, theme),

                    const SizedBox(height: 24),
                    _buildSyncSection(theme),

                    const SizedBox(height: 24),
                    _buildActionsSection(theme),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildConnectionCard(LmsConnectionState state, ThemeData theme) {
    final isConnected = state.isConnected;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Google Classroom logo
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: isConnected ? AivoBrand.mint[50] : AivoBrand.gray[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.school,
                    color: isConnected ? AivoBrand.success : AivoBrand.gray,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Google Classroom',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: isConnected ? AivoBrand.success : AivoBrand.gray,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            isConnected ? 'Connected' : 'Not connected',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: isConnected ? AivoBrand.success : AivoBrand.gray,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),

            if (isConnected && state.status != null) ...[
              const Divider(height: 24),
              _buildConnectionDetails(state.status!, theme),
            ],

            const SizedBox(height: 16),

            // Connect/Disconnect button
            SizedBox(
              width: double.infinity,
              child: isConnected
                  ? OutlinedButton.icon(
                      onPressed: state.isLoading ? null : _showDisconnectDialog,
                      icon: const Icon(Icons.link_off),
                      label: const Text('Disconnect'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AivoBrand.error,
                      ),
                    )
                  : FilledButton.icon(
                      onPressed: state.isConnecting ? null : _initiateConnection,
                      icon: state.isConnecting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.link),
                      label: Text(
                        state.isConnecting ? 'Connecting...' : 'Connect',
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConnectionDetails(
    GoogleClassroomConnectionStatus status,
    ThemeData theme,
  ) {
    return Column(
      children: [
        _DetailRow(
          icon: Icons.email_outlined,
          label: 'Account',
          value: status.email ?? 'Unknown',
        ),
        const SizedBox(height: 8),
        _DetailRow(
          icon: Icons.class_outlined,
          label: 'Courses linked',
          value: '${status.coursesLinked ?? 0}',
        ),
        if (status.lastSyncAt != null) ...[
          const SizedBox(height: 8),
          _DetailRow(
            icon: Icons.sync,
            label: 'Last sync',
            value: _formatRelativeTime(status.lastSyncAt!),
          ),
        ],
        if (status.isExpiringSoon) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AivoBrand.sunshine[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AivoBrand.sunshine[200]!),
            ),
            child: Row(
              children: [
                Icon(Icons.warning_amber, color: AivoBrand.sunshine[700], size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Connection expires soon. Please reconnect to continue syncing.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AivoBrand.sunshine[700],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildErrorCard(String error, ThemeData theme) {
    return Card(
      color: AivoBrand.error[50],
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(Icons.error_outline, color: AivoBrand.error[700]),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                error,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AivoBrand.error[700],
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () {
                // Clear error by refreshing
                ref.read(lmsConnectionProvider.notifier).refresh();
              },
              iconSize: 18,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCoursesSection(LmsConnectionState state, ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Linked Courses',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const Spacer(),
            TextButton.icon(
              onPressed: _showLinkCourseDialog,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Link Course'),
            ),
          ],
        ),
        const SizedBox(height: 12),

        if (state.mappings.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Icon(
                    Icons.school_outlined,
                    size: 48,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'No courses linked yet',
                    style: theme.textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Link a Google Classroom course to sync rosters and grades',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          )
        else
          ...state.mappings.map((mapping) => _CourseCard(
                mapping: mapping,
                onSync: () => _syncCourse(mapping.googleCourseId),
                onUnlink: () => _showUnlinkDialog(mapping),
                onManageStudents: () => _navigateToStudentRoster(mapping),
              )),
      ],
    );
  }

  void _navigateToStudentRoster(CourseMapping mapping) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => StudentRosterScreen(
          courseId: mapping.googleCourseId,
          courseName: mapping.googleCourseName,
          classId: mapping.classId,
        ),
      ),
    );
  }

  Widget _buildSyncSection(ThemeData theme) {
    final syncState = ref.watch(syncOperationProvider);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.sync, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Roster Sync',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Sync student and teacher rosters from Google Classroom to keep your classes up to date.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: syncState.isSyncing ? null : _syncAllCourses,
                icon: syncState.isSyncing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.sync),
                label: Text(
                  syncState.isSyncing ? 'Syncing...' : 'Sync All Courses',
                ),
              ),
            ),
            if (syncState.lastResult != null) ...[
              const SizedBox(height: 12),
              _buildSyncResult(syncState.lastResult!, theme),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSyncResult(SyncResult result, ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: result.success ? AivoBrand.mint[50] : AivoBrand.error[50],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                result.success ? Icons.check_circle : Icons.error,
                size: 18,
                color: result.success ? AivoBrand.success : AivoBrand.error,
              ),
              const SizedBox(width: 8),
              Text(
                result.success ? 'Sync completed' : 'Sync failed',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: result.success ? AivoBrand.mint[700] : AivoBrand.error[700],
                ),
              ),
            ],
          ),
          if (result.totalChanges > 0) ...[
            const SizedBox(height: 8),
            Text(
              '${result.studentsAdded} added, ${result.studentsUpdated} updated, ${result.studentsRemoved} removed',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActionsSection(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        _ActionCard(
          icon: Icons.grade,
          title: 'Grade Passback',
          subtitle: 'Sync grades to Google Classroom',
          onTap: () => Navigator.of(context).pushNamed('/integrations/grades'),
        ),
        const SizedBox(height: 8),
        _ActionCard(
          icon: Icons.people,
          title: 'Student Roster',
          subtitle: 'Manage student mappings',
          onTap: () => _showCourseSelectionForRoster(),
        ),
        const SizedBox(height: 8),
        _ActionCard(
          icon: Icons.history,
          title: 'Sync History',
          subtitle: 'View past sync operations',
          onTap: () => _showSyncHistoryDialog(),
        ),
        const SizedBox(height: 8),
        _ActionCard(
          icon: Icons.help_outline,
          title: 'Help & Support',
          subtitle: 'Learn about Google Classroom integration',
          onTap: () => _showHelpDialog(),
        ),
      ],
    );
  }

  void _showCourseSelectionForRoster() {
    final state = ref.read(lmsConnectionProvider);
    
    if (state.mappings.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No linked courses available')),
      );
      return;
    }

    if (state.mappings.length == 1) {
      // Only one course, go directly to roster
      _navigateToStudentRoster(state.mappings.first);
      return;
    }

    // Multiple courses, show selection dialog
    showModalBottomSheet(
      context: context,
      builder: (context) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Select Course',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const Divider(height: 1),
          ...state.mappings.map((mapping) => ListTile(
                leading: const Icon(Icons.class_),
                title: Text(mapping.googleCourseName),
                subtitle: Text('Linked to ${mapping.className}'),
                onTap: () {
                  Navigator.of(context).pop();
                  _navigateToStudentRoster(mapping);
                },
              )),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Future<void> _initiateConnection() async {
    try {
      final url = await ref.read(lmsConnectionProvider.notifier).initiateConnection();

      // Open OAuth URL in browser
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);

        // Show dialog to wait for connection
        if (mounted) {
          _showWaitingForConnectionDialog();
        }
      } else {
        ref.read(lmsConnectionProvider.notifier).handleConnectionError(
          'Could not open authorization URL',
        );
      }
    } catch (e) {
      // Error handled by provider
    }
  }

  void _showWaitingForConnectionDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Connecting...'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text(
              'Complete the authorization in your browser, then return here.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              ref.read(lmsConnectionProvider.notifier).handleConnectionError(
                'Connection cancelled',
              );
            },
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              ref.read(lmsConnectionProvider.notifier).completeConnection();
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  void _showDisconnectDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Disconnect Google Classroom?'),
        content: const Text(
          'This will unlink all courses and stop syncing. You can reconnect later.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              ref.read(lmsConnectionProvider.notifier).disconnect();
            },
            style: FilledButton.styleFrom(backgroundColor: AivoBrand.error),
            child: const Text('Disconnect'),
          ),
        ],
      ),
    );
  }

  void _showLinkCourseDialog() {
    final state = ref.read(lmsConnectionProvider);
    final unlinkedCourses = state.activeCourses
        .where((c) => !c.isLinked)
        .toList();

    if (unlinkedCourses.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('All courses are already linked')),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _LinkCourseSheet(
        courses: unlinkedCourses,
        onLink: (courseId, classId) {
          ref.read(lmsConnectionProvider.notifier).linkCourse(
            googleCourseId: courseId,
            classId: classId,
          );
          Navigator.of(context).pop();
        },
      ),
    );
  }

  void _showUnlinkDialog(CourseMapping mapping) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Unlink Course?'),
        content: Text(
          'This will stop syncing "${mapping.googleCourseName}" with "${mapping.className}".',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              ref.read(lmsConnectionProvider.notifier).unlinkCourse(mapping.id);
            },
            style: FilledButton.styleFrom(backgroundColor: AivoBrand.error),
            child: const Text('Unlink'),
          ),
        ],
      ),
    );
  }

  Future<void> _syncCourse(String courseId) async {
    final result = await ref.read(syncOperationProvider.notifier).syncCourse(courseId);
    if (result != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.success
                ? 'Sync completed: ${result.totalChanges} changes'
                : 'Sync failed: ${result.errors.first}',
          ),
          backgroundColor: result.success ? AivoBrand.success : AivoBrand.error,
        ),
      );
    }
  }

  Future<void> _syncAllCourses() async {
    final results = await ref.read(syncOperationProvider.notifier).syncAllCourses();
    if (mounted) {
      final successful = results.where((r) => r.success).length;
      final failed = results.where((r) => !r.success).length;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Sync completed: $successful succeeded, $failed failed'),
        ),
      );
    }
  }

  void _showSyncHistoryDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => _SyncHistorySheet(
          scrollController: scrollController,
        ),
      ),
    );
  }

  void _showHelpDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Google Classroom Integration'),
        content: const SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'What you can do:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text('• Sync student rosters from Google Classroom'),
              Text('• Post assignments to Google Classroom'),
              Text('• Sync grades back to Google Classroom'),
              Text('• Keep class data synchronized'),
              SizedBox(height: 16),
              Text(
                'Permissions:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text('This integration requires access to:'),
              Text('• View your courses'),
              Text('• View student rosters'),
              Text('• Create and manage coursework'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  String _formatRelativeTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) return 'Just now';
    if (difference.inMinutes < 60) return '${difference.inMinutes}m ago';
    if (difference.inHours < 24) return '${difference.inHours}h ago';
    return '${difference.inDays}d ago';
  }
}

/// Detail row widget
class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AivoBrand.gray),
        const SizedBox(width: 8),
        Text(
          '$label:',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AivoBrand.gray,
              ),
        ),
        const SizedBox(width: 8),
        Text(
          value,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w500,
              ),
        ),
      ],
    );
  }
}

/// Course card widget
class _CourseCard extends StatelessWidget {
  const _CourseCard({
    required this.mapping,
    this.onSync,
    this.onUnlink,
    this.onManageStudents,
  });

  final CourseMapping mapping;
  final VoidCallback? onSync;
  final VoidCallback? onUnlink;
  final VoidCallback? onManageStudents;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Icon(
            Icons.class_,
            color: theme.colorScheme.onPrimaryContainer,
          ),
        ),
        title: Text(mapping.googleCourseName),
        subtitle: Text('Linked to ${mapping.className}'),
        trailing: PopupMenuButton(
          itemBuilder: (context) => [
            PopupMenuItem(
              onTap: onManageStudents,
              child: const Row(
                children: [
                  Icon(Icons.people, size: 20),
                  SizedBox(width: 8),
                  Text('Manage Students'),
                ],
              ),
            ),
            PopupMenuItem(
              onTap: onSync,
              child: const Row(
                children: [
                  Icon(Icons.sync, size: 20),
                  SizedBox(width: 8),
                  Text('Sync Now'),
                ],
              ),
            ),
            PopupMenuItem(
              onTap: onUnlink,
              child: const Row(
                children: [
                  Icon(Icons.link_off, size: 20, color: AivoBrand.error),
                  SizedBox(width: 8),
                  Text('Unlink', style: TextStyle(color: AivoBrand.error)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Action card widget
class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

/// Sheet for linking a course
class _LinkCourseSheet extends StatefulWidget {
  const _LinkCourseSheet({
    required this.courses,
    required this.onLink,
  });

  final List<ClassroomCourse> courses;
  final void Function(String courseId, String classId) onLink;

  @override
  State<_LinkCourseSheet> createState() => _LinkCourseSheetState();
}

class _LinkCourseSheetState extends State<_LinkCourseSheet> {
  String? _selectedCourseId;
  String? _selectedClassId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Link Course',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(
              labelText: 'Google Classroom Course',
              border: OutlineInputBorder(),
            ),
            items: widget.courses.map((course) {
              return DropdownMenuItem(
                value: course.id,
                child: Text(course.displayName),
              );
            }).toList(),
            onChanged: (value) {
              setState(() {
                _selectedCourseId = value;
              });
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            decoration: const InputDecoration(
              labelText: 'AIVO Class ID',
              hintText: 'Enter the class ID to link',
              border: OutlineInputBorder(),
            ),
            onChanged: (value) {
              setState(() {
                _selectedClassId = value;
              });
            },
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _selectedCourseId != null &&
                      _selectedClassId != null &&
                      _selectedClassId!.isNotEmpty
                  ? () => widget.onLink(_selectedCourseId!, _selectedClassId!)
                  : null,
              child: const Text('Link Course'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Sheet for sync history
class _SyncHistorySheet extends ConsumerWidget {
  const _SyncHistorySheet({required this.scrollController});

  final ScrollController scrollController;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(courseSyncHistoryProvider(null));
    final theme = Theme.of(context);

    return Column(
      children: [
        // Handle
        Container(
          width: 40,
          height: 4,
          margin: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: AivoBrand.gray[300],
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Text(
                'Sync History',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        const Divider(),
        Expanded(
          child: historyAsync.when(
            data: (history) {
              if (history.isEmpty) {
                return const Center(
                  child: Text('No sync history yet'),
                );
              }
              return ListView.builder(
                controller: scrollController,
                itemCount: history.length,
                itemBuilder: (context, index) {
                  final entry = history[index];
                  return ListTile(
                    leading: Icon(
                      entry.success ? Icons.check_circle : Icons.error,
                      color: entry.success ? AivoBrand.success : AivoBrand.error,
                    ),
                    title: Text(entry.courseName ?? 'Unknown Course'),
                    subtitle: Text(
                      '${entry.syncType.label} • ${entry.totalChanges} changes',
                    ),
                    trailing: Text(
                      _formatTime(entry.completedAt),
                      style: theme.textTheme.bodySmall,
                    ),
                  );
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Error: $e')),
          ),
        ),
      ],
    );
  }

  String _formatTime(DateTime dateTime) {
    return '${dateTime.month}/${dateTime.day} ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
