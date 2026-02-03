/// AI Controls Screen
///
/// Main screen for managing AI autonomy settings.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/ai_autonomy_settings.dart';
import '../providers/ai_controls_provider.dart';
import '../widgets/widgets.dart';

/// Main screen for AI autonomy controls.
class AIControlsScreen extends ConsumerStatefulWidget {
  const AIControlsScreen({
    super.key,
    required this.childId,
  });

  final String childId;

  @override
  ConsumerState<AIControlsScreen> createState() => _AIControlsScreenState();
}

class _AIControlsScreenState extends ConsumerState<AIControlsScreen> {
  Set<DecisionCategory> _expandedCategories = {};

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final settingsAsync = ref.watch(autonomySettingsNotifierProvider(widget.childId));
    final pendingAsync = ref.watch(pendingApprovalsProvider(widget.childId));
    final presetsAsync = ref.watch(autonomyPresetsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Controls'),
        actions: [
          // Pending approvals badge
          pendingAsync.when(
            data: (pending) {
              if (pending.isEmpty) return const SizedBox.shrink();
              return Stack(
                alignment: Alignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.approval),
                    onPressed: () => context.push(
                      '/ai-controls/${widget.childId}/approvals',
                    ),
                    tooltip: 'Pending Approvals',
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '${pending.length}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () => context.push(
              '/ai-controls/${widget.childId}/activity',
            ),
            tooltip: 'Activity Log',
          ),
        ],
      ),
      body: settingsAsync.when(
        data: (settings) => _buildContent(settings, presetsAsync, theme),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => _buildErrorState(error.toString()),
      ),
    );
  }

  Widget _buildContent(
    AIAutonomySettings settings,
    AsyncValue<List<AutonomyPreset>> presetsAsync,
    ThemeData theme,
  ) {
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(autonomySettingsNotifierProvider(widget.childId));
        ref.invalidate(pendingApprovalsProvider(widget.childId));
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Pause AI toggle
          if (settings.pauseAllAI) ...[
            _PausedBanner(
              pauseUntil: settings.pauseUntil,
              pauseReason: settings.pauseReason,
              onResume: () => ref
                  .read(autonomySettingsNotifierProvider(widget.childId).notifier)
                  .resumeAI(),
            ),
            const SizedBox(height: 16),
          ],

          // Quick pause/resume
          _PauseControlCard(
            isPaused: settings.pauseAllAI,
            onPause: () => _showPauseDialog(context),
            onResume: () => ref
                .read(autonomySettingsNotifierProvider(widget.childId).notifier)
                .resumeAI(),
          ),
          const SizedBox(height: 24),

          // Overall autonomy level
          Text(
            'Overall Autonomy Level',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Control how much freedom the AI has when making decisions',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: AutonomySlider(
                value: settings.overallLevel,
                enabled: !settings.pauseAllAI,
                onChanged: (level) {
                  ref
                      .read(autonomySettingsNotifierProvider(widget.childId).notifier)
                      .updateOverallLevel(level);
                },
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Presets
          presetsAsync.when(
            data: (presets) => PresetSelector(
              presets: presets,
              currentLevel: settings.overallLevel,
              onPresetSelected: (preset) {
                ref
                    .read(autonomySettingsNotifierProvider(widget.childId).notifier)
                    .applyPreset(preset.id);
              },
            ),
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const SizedBox(height: 24),

          // Category-specific controls
          Row(
            children: [
              Text(
                'Category Controls',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () {
                  setState(() {
                    if (_expandedCategories.length == DecisionCategory.values.length) {
                      _expandedCategories.clear();
                    } else {
                      _expandedCategories = Set.from(DecisionCategory.values);
                    }
                  });
                },
                child: Text(
                  _expandedCategories.length == DecisionCategory.values.length
                      ? 'Collapse All'
                      : 'Expand All',
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...DecisionCategory.values.map((category) {
            final autonomy = settings.categorySettings[category] ??
                CategoryAutonomy(
                  category: category,
                  level: settings.overallLevel,
                );

            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: CategoryControlTile(
                category: category,
                autonomy: autonomy,
                expanded: _expandedCategories.contains(category),
                onExpandChanged: (expanded) {
                  setState(() {
                    if (expanded) {
                      _expandedCategories.add(category);
                    } else {
                      _expandedCategories.remove(category);
                    }
                  });
                },
                onChanged: (updated) {
                  ref
                      .read(autonomySettingsNotifierProvider(widget.childId).notifier)
                      .updateCategoryAutonomy(category, updated);
                },
              ),
            );
          }),
          const SizedBox(height: 24),

          // Restrictions
          Row(
            children: [
              Text(
                'Restrictions',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: () => context.push(
                  '/ai-controls/${widget.childId}/restrictions/add',
                ),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Add'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          RestrictionChipList(
            restrictions: settings.restrictions,
            onRestrictionTap: (restriction) => context.push(
              '/ai-controls/${widget.childId}/restrictions/${restriction.id}',
            ),
            onRestrictionDelete: (restriction) => _confirmDeleteRestriction(
              context,
              restriction,
            ),
          ),
          const SizedBox(height: 24),

          // Notification settings
          Row(
            children: [
              Text(
                'Notifications',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              NotificationBadge(
                settings: settings.notifications,
                onTap: () => _showNotificationSettings(context, settings),
              ),
            ],
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Failed to load AI settings',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(error),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () =>
                  ref.invalidate(autonomySettingsNotifierProvider(widget.childId)),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showPauseDialog(BuildContext context) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => const _PauseDialog(),
    );

    if (result != null && mounted) {
      ref
          .read(autonomySettingsNotifierProvider(widget.childId).notifier)
          .pauseAI(
            until: result['until'] as DateTime?,
            reason: result['reason'] as String?,
          );
    }
  }

  Future<void> _confirmDeleteRestriction(
    BuildContext context,
    AIRestriction restriction,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Restriction'),
        content: Text('Are you sure you want to delete "${restriction.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      ref
          .read(restrictionsNotifierProvider(widget.childId).notifier)
          .remove(restriction.id);
    }
  }

  void _showNotificationSettings(
    BuildContext context,
    AIAutonomySettings settings,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'Notification Settings',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: NotificationSettingsSection(
                    settings: settings.notifications,
                    onChanged: (updated) {
                      ref
                          .read(autonomySettingsNotifierProvider(widget.childId)
                              .notifier)
                          .updateNotifications(updated);
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Paused banner widget.
class _PausedBanner extends StatelessWidget {
  const _PausedBanner({
    required this.pauseUntil,
    required this.pauseReason,
    required this.onResume,
  });

  final DateTime? pauseUntil;
  final String? pauseReason;
  final VoidCallback onResume;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.orange.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.orange.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.pause_circle, color: Colors.orange),
              const SizedBox(width: 8),
              Text(
                'AI is Paused',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.orange,
                ),
              ),
            ],
          ),
          if (pauseReason != null) ...[
            const SizedBox(height: 8),
            Text(
              pauseReason!,
              style: theme.textTheme.bodySmall,
            ),
          ],
          if (pauseUntil != null) ...[
            const SizedBox(height: 4),
            Text(
              'Until: ${_formatDateTime(pauseUntil!)}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: onResume,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Resume AI'),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDateTime(DateTime dt) {
    return '${dt.month}/${dt.day} at ${_formatHour(dt.hour)}:${dt.minute.toString().padLeft(2, '0')}';
  }

  String _formatHour(int hour) {
    if (hour == 0) return '12';
    if (hour > 12) return '${hour - 12}';
    return '$hour';
  }
}

/// Pause control card.
class _PauseControlCard extends StatelessWidget {
  const _PauseControlCard({
    required this.isPaused,
    required this.onPause,
    required this.onResume,
  });

  final bool isPaused;
  final VoidCallback onPause;
  final VoidCallback onResume;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isPaused
                    ? Colors.orange.withValues(alpha: 0.1)
                    : Colors.green.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                isPaused ? Icons.pause_circle : Icons.play_circle,
                color: isPaused ? Colors.orange : Colors.green,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isPaused ? 'AI Tutor Paused' : 'AI Tutor Active',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    isPaused
                        ? 'Learning continues without AI adaptations'
                        : 'AI is actively adapting to your child',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            FilledButton(
              onPressed: isPaused ? onResume : onPause,
              style: FilledButton.styleFrom(
                backgroundColor: isPaused ? Colors.green : Colors.orange,
              ),
              child: Text(isPaused ? 'Resume' : 'Pause'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Pause dialog.
class _PauseDialog extends StatefulWidget {
  const _PauseDialog();

  @override
  State<_PauseDialog> createState() => _PauseDialogState();
}

class _PauseDialogState extends State<_PauseDialog> {
  final _reasonController = TextEditingController();
  DateTime? _pauseUntil;
  String _selectedDuration = '1 hour';

  final _durations = {
    '1 hour': const Duration(hours: 1),
    '2 hours': const Duration(hours: 2),
    '4 hours': const Duration(hours: 4),
    'Until tomorrow': const Duration(days: 1),
    'Until I resume': null,
  };

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Pause AI Tutor'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('How long would you like to pause the AI?'),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _durations.keys.map((duration) {
              return ChoiceChip(
                label: Text(duration),
                selected: _selectedDuration == duration,
                onSelected: (_) {
                  setState(() {
                    _selectedDuration = duration;
                    final dur = _durations[duration];
                    _pauseUntil = dur != null ? DateTime.now().add(dur) : null;
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _reasonController,
            decoration: const InputDecoration(
              labelText: 'Reason (optional)',
              hintText: 'e.g., Family trip',
              border: OutlineInputBorder(),
            ),
            maxLines: 2,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            Navigator.of(context).pop({
              'until': _pauseUntil,
              'reason': _reasonController.text.isEmpty
                  ? null
                  : _reasonController.text,
            });
          },
          child: const Text('Pause'),
        ),
      ],
    );
  }
}
