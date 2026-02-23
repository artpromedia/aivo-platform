/// Grade Passback Screen
/// Manages syncing grades from AIVO to Google Classroom
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../models/lms_integration.dart';
import '../../providers/lms_provider.dart';

/// Screen for managing grade passback to Google Classroom
class GradePassbackScreen extends ConsumerStatefulWidget {
  const GradePassbackScreen({
    super.key,
    this.courseId,
  });

  final String? courseId;

  @override
  ConsumerState<GradePassbackScreen> createState() =>
      _GradePassbackScreenState();
}

class _GradePassbackScreenState extends ConsumerState<GradePassbackScreen> {
  final Set<String> _selectedGrades = {};
  bool _selectAll = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(gradePassbackProvider.notifier).loadPendingGrades(
            courseId: widget.courseId,
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(gradePassbackProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Grade Passback'),
        actions: [
          // Settings button
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => _showSettingsSheet(context),
            tooltip: 'Passback Settings',
          ),
          if (state.pendingGrades.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: state.isLoading
                  ? null
                  : () => ref.read(gradePassbackProvider.notifier).refresh(),
            ),
        ],
      ),
      body: state.isLoading && state.pendingGrades.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : state.pendingGrades.isEmpty
              ? _buildEmptyState(theme)
              : _buildGradesList(state, theme),
      bottomNavigationBar: state.pendingGrades.isNotEmpty
          ? _buildBottomBar(state, theme)
          : null,
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.check_circle_outline,
              size: 64,
              color: AivoBrand.mint[400],
            ),
            const SizedBox(height: 16),
            Text(
              'All Grades Synced',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'All student grades have been synced to Google Classroom.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: () =>
                  ref.read(gradePassbackProvider.notifier).refresh(),
              icon: const Icon(Icons.refresh),
              label: const Text('Check for New Grades'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGradesList(GradePassbackState state, ThemeData theme) {
    final pendingGrades = state.pendingGrades
        .where((g) => g.syncStatus != GradeSyncStatus.synced)
        .toList();

    return Column(
      children: [
        // Summary card
        _buildSummaryCard(state, theme),

        // Last sync result
        if (state.lastSyncResult != null)
          _buildSyncResultCard(state.lastSyncResult!, theme),

        // Select all checkbox
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Checkbox(
                value: _selectAll,
                onChanged: (value) {
                  setState(() {
                    _selectAll = value ?? false;
                    if (_selectAll) {
                      _selectedGrades.addAll(
                        pendingGrades.where((g) => g.canSync).map((g) => g.id),
                      );
                    } else {
                      _selectedGrades.clear();
                    }
                  });
                },
              ),
              Text(
                'Select All (${pendingGrades.where((g) => g.canSync).length})',
                style: theme.textTheme.bodyMedium,
              ),
              const Spacer(),
              if (_selectedGrades.isNotEmpty)
                Text(
                  '${_selectedGrades.length} selected',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
            ],
          ),
        ),

        const Divider(height: 1),

        // Grades list
        Expanded(
          child: RefreshIndicator(
            onRefresh: () =>
                ref.read(gradePassbackProvider.notifier).refresh(),
            child: ListView.builder(
              itemCount: pendingGrades.length,
              itemBuilder: (context, index) {
                final grade = pendingGrades[index];
                return _GradeItem(
                  grade: grade,
                  isSelected: _selectedGrades.contains(grade.id),
                  onSelect: grade.canSync
                      ? (selected) {
                          setState(() {
                            if (selected) {
                              _selectedGrades.add(grade.id);
                            } else {
                              _selectedGrades.remove(grade.id);
                            }
                            _updateSelectAll(pendingGrades);
                          });
                        }
                      : null,
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryCard(GradePassbackState state, ThemeData theme) {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: _SummaryItem(
                label: 'Pending',
                value: '${state.pendingCount}',
                color: AivoBrand.warning,
              ),
            ),
            Expanded(
              child: _SummaryItem(
                label: 'Failed',
                value: '${state.failedCount}',
                color: AivoBrand.error,
              ),
            ),
            Expanded(
              child: _SummaryItem(
                label: 'Total',
                value: '${state.pendingGrades.length}',
                color: theme.colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSyncResultCard(GradePassbackResult result, ThemeData theme) {
    final isSuccess = result.allSuccessful;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      color: isSuccess ? AivoBrand.mint[50] : AivoBrand.sunshine[50],
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(
              isSuccess ? Icons.check_circle : Icons.warning,
              color: isSuccess ? AivoBrand.success : AivoBrand.warning,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Last Sync: ${result.successful} succeeded, ${result.failed} failed',
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (result.errors.isNotEmpty)
                    Text(
                      result.errors.first.error,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AivoBrand.error,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, size: 18),
              onPressed: () {
                // Clear result
                ref.read(gradePassbackProvider.notifier).refresh();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar(GradePassbackState state, ThemeData theme) {
    final hasFailedGrades = state.failedCount > 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Retry failed button (shown when there are failures)
            if (hasFailedGrades) ...[
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: state.isSyncing ? null : () => _retryFailedGrades(),
                  icon: const Icon(Icons.refresh),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AivoBrand.error,
                    side: BorderSide(color: AivoBrand.error),
                  ),
                  label: Text('Retry ${state.failedCount} Failed'),
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Main action buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: state.isSyncing
                        ? null
                        : () => _syncAllGrades(),
                    child: const Text('Sync All'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: FilledButton.icon(
                    onPressed: state.isSyncing || _selectedGrades.isEmpty
                        ? null
                        : () => _syncSelectedGrades(),
                    icon: state.isSyncing
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.sync),
                    label: Text(
                      state.isSyncing
                          ? 'Syncing...'
                          : 'Sync Selected (${_selectedGrades.length})',
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _updateSelectAll(List<PendingGrade> grades) {
    final syncableGrades = grades.where((g) => g.canSync);
    _selectAll = syncableGrades.isNotEmpty &&
        syncableGrades.every((g) => _selectedGrades.contains(g.id));
  }

  Future<void> _syncSelectedGrades() async {
    final result = await ref.read(gradePassbackProvider.notifier).syncGrades(
          _selectedGrades.toList(),
        );

    if (result != null && mounted) {
      _selectedGrades.clear();
      _selectAll = false;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${result.successful} grades synced${result.failed > 0 ? ', ${result.failed} failed' : ''}',
          ),
          backgroundColor: result.allSuccessful ? AivoBrand.success : AivoBrand.warning,
        ),
      );
    }
  }

  Future<void> _syncAllGrades() async {
    final result = await ref.read(gradePassbackProvider.notifier).syncAllGrades();

    if (result != null && mounted) {
      _selectedGrades.clear();
      _selectAll = false;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${result.successful} grades synced${result.failed > 0 ? ', ${result.failed} failed' : ''}',
          ),
          backgroundColor: result.allSuccessful ? AivoBrand.success : AivoBrand.warning,
        ),
      );
    }
  }

  Future<void> _retryFailedGrades() async {
    final result = await ref.read(passbackQueueProvider.notifier).retryFailed(
          courseId: widget.courseId,
        );

    if (result != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.allSuccessful
                ? '${result.successful} grades synced successfully!'
                : '${result.successful} synced, ${result.failed} still failing',
          ),
          backgroundColor: result.allSuccessful ? AivoBrand.success : AivoBrand.warning,
        ),
      );

      // Refresh the pending grades list
      ref.read(gradePassbackProvider.notifier).refresh();
    }
  }

  void _showSettingsSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => const _PassbackSettingsSheet(),
    );
  }
}

/// Settings sheet for grade passback configuration
class _PassbackSettingsSheet extends ConsumerWidget {
  const _PassbackSettingsSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsState = ref.watch(passbackSettingsProvider);
    final settings = settingsState.settings;
    final theme = Theme.of(context);

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            // Handle bar
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Container(
                width: 32,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurfaceVariant.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Title
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Icon(
                    Icons.settings,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Passback Settings',
                    style: theme.textTheme.titleLarge,
                  ),
                  const Spacer(),
                  if (settingsState.isSaving)
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Settings list
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  // Auto-sync section
                  _buildSectionHeader(theme, 'Automatic Sync', Icons.sync),
                  const SizedBox(height: 8),

                  SwitchListTile(
                    title: const Text('Enable Auto-Sync'),
                    subtitle: const Text('Automatically sync grades in the background'),
                    value: settings.autoSyncEnabled,
                    onChanged: settingsState.isSaving
                        ? null
                        : (_) => ref
                            .read(passbackSettingsProvider.notifier)
                            .toggleAutoSync(),
                  ),

                  if (settings.autoSyncEnabled) ...[
                    ListTile(
                      title: const Text('Sync Interval'),
                      subtitle: Text('Every ${settings.syncIntervalMinutes} minutes'),
                      trailing: DropdownButton<int>(
                        value: settings.syncIntervalMinutes,
                        underline: const SizedBox(),
                        items: const [
                          DropdownMenuItem(value: 5, child: Text('5 min')),
                          DropdownMenuItem(value: 15, child: Text('15 min')),
                          DropdownMenuItem(value: 30, child: Text('30 min')),
                          DropdownMenuItem(value: 60, child: Text('1 hour')),
                        ],
                        onChanged: settingsState.isSaving
                            ? null
                            : (value) {
                                if (value != null) {
                                  ref
                                      .read(passbackSettingsProvider.notifier)
                                      .updateSettings(
                                        settings.copyWith(
                                            syncIntervalMinutes: value),
                                      );
                                }
                              },
                      ),
                    ),
                  ],

                  const Divider(height: 32),

                  // Behavior section
                  _buildSectionHeader(theme, 'Behavior', Icons.tune),
                  const SizedBox(height: 8),

                  SwitchListTile(
                    title: const Text('Sync on Grade Submit'),
                    subtitle:
                        const Text('Immediately sync when you save a grade'),
                    value: settings.syncOnGradeSubmit,
                    onChanged: settingsState.isSaving
                        ? null
                        : (_) => ref
                            .read(passbackSettingsProvider.notifier)
                            .toggleSyncOnGradeSubmit(),
                  ),

                  SwitchListTile(
                    title: const Text('Require Confirmation'),
                    subtitle: const Text('Ask before syncing grades'),
                    value: settings.requireConfirmation,
                    onChanged: settingsState.isSaving
                        ? null
                        : (_) => ref
                            .read(passbackSettingsProvider.notifier)
                            .toggleRequireConfirmation(),
                  ),

                  const Divider(height: 32),

                  // Retry section
                  _buildSectionHeader(theme, 'Failed Sync Retry', Icons.refresh),
                  const SizedBox(height: 8),

                  ListTile(
                    title: const Text('Retry Policy'),
                    subtitle: Text(settings.retryPolicy.description),
                  ),

                  ...PassbackRetryPolicy.values.map((policy) => RadioListTile<PassbackRetryPolicy>(
                        title: Text(policy.label),
                        value: policy,
                        groupValue: settings.retryPolicy,
                        onChanged: settingsState.isSaving
                            ? null
                            : (value) {
                                if (value != null) {
                                  ref
                                      .read(passbackSettingsProvider.notifier)
                                      .setRetryPolicy(value);
                                }
                              },
                      )),

                  const Divider(height: 32),

                  // Notifications section
                  _buildSectionHeader(theme, 'Notifications', Icons.notifications),
                  const SizedBox(height: 8),

                  SwitchListTile(
                    title: const Text('Notify on Failure'),
                    subtitle: const Text('Show notification when sync fails'),
                    value: settings.notifyOnFailure,
                    onChanged: settingsState.isSaving
                        ? null
                        : (value) {
                            ref
                                .read(passbackSettingsProvider.notifier)
                                .updateSettings(
                                  settings.copyWith(notifyOnFailure: value),
                                );
                          },
                  ),

                  const SizedBox(height: 24),

                  // Batch sync threshold
                  _buildSectionHeader(theme, 'Batch Sync', Icons.batch_prediction),
                  const SizedBox(height: 8),

                  ListTile(
                    title: const Text('Batch Prompt Threshold'),
                    subtitle: Text(
                      'Prompt for batch sync when ${settings.batchSyncThreshold}+ grades pending',
                    ),
                    trailing: DropdownButton<int>(
                      value: settings.batchSyncThreshold,
                      underline: const SizedBox(),
                      items: const [
                        DropdownMenuItem(value: 5, child: Text('5')),
                        DropdownMenuItem(value: 10, child: Text('10')),
                        DropdownMenuItem(value: 20, child: Text('20')),
                        DropdownMenuItem(value: 50, child: Text('50')),
                      ],
                      onChanged: settingsState.isSaving
                          ? null
                          : (value) {
                              if (value != null) {
                                ref
                                    .read(passbackSettingsProvider.notifier)
                                    .updateSettings(
                                      settings.copyWith(
                                          batchSyncThreshold: value),
                                    );
                              }
                            },
                    ),
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildSectionHeader(ThemeData theme, String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: theme.colorScheme.primary),
        const SizedBox(width: 8),
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: theme.colorScheme.primary,
          ),
        ),
      ],
    );
  }
}

/// Summary item widget
class _SummaryItem extends StatelessWidget {
  const _SummaryItem({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
      ],
    );
  }
}

/// Individual grade item widget
class _GradeItem extends StatelessWidget {
  const _GradeItem({
    required this.grade,
    required this.isSelected,
    this.onSelect,
  });

  final PendingGrade grade;
  final bool isSelected;
  final void Function(bool)? onSelect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: onSelect != null ? () => onSelect!(!isSelected) : null,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Checkbox
              if (onSelect != null)
                Checkbox(
                  value: isSelected,
                  onChanged: (value) => onSelect!(value ?? false),
                ),

              // Student info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      grade.studentName,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      grade.assignmentTitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),

              // Score
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${grade.score.toStringAsFixed(0)}/${grade.maxPoints.toStringAsFixed(0)}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${grade.scorePercent.toStringAsFixed(0)}%',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: _getScoreColor(grade.scorePercent),
                    ),
                  ),
                ],
              ),

              const SizedBox(width: 12),

              // Status badge
              _StatusBadge(status: grade.syncStatus),
            ],
          ),
        ),
      ),
    );
  }

  Color _getScoreColor(double percent) {
    if (percent >= 90) return AivoBrand.success;
    if (percent >= 70) return Colors.blue;
    if (percent >= 60) return AivoBrand.warning;
    return AivoBrand.error;
  }
}

/// Status badge widget
class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final GradeSyncStatus status;

  @override
  Widget build(BuildContext context) {
    final (color, icon, label) = switch (status) {
      GradeSyncStatus.pending => (AivoBrand.warning, Icons.schedule, 'Pending'),
      GradeSyncStatus.synced => (AivoBrand.success, Icons.check_circle, 'Synced'),
      GradeSyncStatus.failed => (AivoBrand.error, Icons.error, 'Failed'),
      GradeSyncStatus.retrying => (Colors.blue, Icons.refresh, 'Retrying'),
    };

    return Tooltip(
      message: label,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          size: 18,
          color: color,
        ),
      ),
    );
  }
}
