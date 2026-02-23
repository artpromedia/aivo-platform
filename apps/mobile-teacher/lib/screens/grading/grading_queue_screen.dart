/// Grading Queue Screen
///
/// Screen for managing the grading queue.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/rubric.dart';
import '../../providers/grading_provider.dart';
import 'widgets/widgets.dart';

/// Screen for the grading queue.
class GradingQueueScreen extends ConsumerStatefulWidget {
  const GradingQueueScreen({super.key});

  @override
  ConsumerState<GradingQueueScreen> createState() => _GradingQueueScreenState();
}

class _GradingQueueScreenState extends ConsumerState<GradingQueueScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(gradingQueueProvider.notifier).loadQueue();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final queueState = ref.watch(gradingQueueProvider);
    final statsAsync = ref.watch(gradingQueueStatsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Grading'),
        actions: [
          IconButton(
            icon: const Icon(Icons.library_books),
            onPressed: () => context.push('/grading/rubrics'),
            tooltip: 'Rubrics',
          ),
          PopupMenuButton<String>(
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'new_rubric',
                child: Row(
                  children: [
                    Icon(Icons.add),
                    SizedBox(width: 8),
                    Text('New Rubric'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings),
                    SizedBox(width: 8),
                    Text('Settings'),
                  ],
                ),
              ),
            ],
            onSelected: (value) {
              if (value == 'new_rubric') {
                context.push('/grading/rubrics/new');
              }
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Pending'),
                  if (queueState.pendingCount > 0) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.orange,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${queueState.pendingCount}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Tab(text: 'In Progress'),
            const Tab(text: 'Completed'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Stats card
          statsAsync.when(
            data: (stats) => GradingQueueStatsCard(stats: stats),
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          // Filters
          _FiltersBar(
            statusFilter: queueState.statusFilter,
            priorityFilter: queueState.priorityFilter,
            onStatusChanged: (status) {
              ref.read(gradingQueueProvider.notifier).setStatusFilter(status);
            },
            onPriorityChanged: (priority) {
              ref.read(gradingQueueProvider.notifier).setPriorityFilter(priority);
            },
          ),
          // Queue list
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildQueueList(
                  queueState.items
                      .where((i) => i.status == GradingStatus.pending)
                      .toList(),
                  queueState,
                ),
                _buildQueueList(
                  queueState.items
                      .where((i) => i.status == GradingStatus.inProgress)
                      .toList(),
                  queueState,
                ),
                _buildQueueList(
                  queueState.items
                      .where((i) =>
                          i.status == GradingStatus.graded ||
                          i.status == GradingStatus.returned)
                      .toList(),
                  queueState,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQueueList(List<GradingQueueItem> items, GradingQueueState state) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text('Error: ${state.error}'),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () {
                ref.read(gradingQueueProvider.notifier).loadQueue();
              },
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (items.isEmpty) {
      return _EmptyQueueState(tabName: _getCurrentTabName());
    }

    return RefreshIndicator(
      onRefresh: () async {
        await ref.read(gradingQueueProvider.notifier).loadQueue();
      },
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final item = items[index];
          return GradingQueueItemTile(
            item: item,
            onTap: () => _navigateToGrading(item),
            onPriorityChanged: (priority) {
              ref.read(gradingQueueProvider.notifier).updatePriority(
                    item.id,
                    priority,
                  );
            },
            onSkip: () => _confirmSkip(item),
          );
        },
      ),
    );
  }

  String _getCurrentTabName() {
    switch (_tabController.index) {
      case 0:
        return 'Pending';
      case 1:
        return 'In Progress';
      case 2:
        return 'Completed';
      default:
        return 'Queue';
    }
  }

  void _navigateToGrading(GradingQueueItem item) {
    context.push('/grading/submissions/${item.submissionId}');
  }

  void _confirmSkip(GradingQueueItem item) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Skip Submission'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Skip "${item.studentName}\'s" submission for now?'),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(
                labelText: 'Reason (optional)',
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
              Navigator.of(context).pop();
              ref.read(gradingQueueProvider.notifier).skipItem(item.id);
            },
            child: const Text('Skip'),
          ),
        ],
      ),
    );
  }
}

/// Filters bar.
class _FiltersBar extends StatelessWidget {
  const _FiltersBar({
    required this.statusFilter,
    required this.priorityFilter,
    required this.onStatusChanged,
    required this.onPriorityChanged,
  });

  final GradingStatus? statusFilter;
  final GradingPriority? priorityFilter;
  final ValueChanged<GradingStatus?> onStatusChanged;
  final ValueChanged<GradingPriority?> onPriorityChanged;

  @override
  Widget build(BuildContext context) {
    // ignore: unused_local_variable
    final theme = Theme.of(context);

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // Priority filter
          DropdownButton<GradingPriority?>(
            value: priorityFilter,
            hint: const Text('Priority'),
            underline: const SizedBox.shrink(),
            items: [
              const DropdownMenuItem(
                value: null,
                child: Text('All Priorities'),
              ),
              ...GradingPriority.values.map((p) {
                return DropdownMenuItem(
                  value: p,
                  child: Row(
                    children: [
                      Icon(_getPriorityIcon(p), size: 16, color: _getPriorityColor(p)),
                      const SizedBox(width: 8),
                      Text(p.name.toUpperCase()),
                    ],
                  ),
                );
              }),
            ],
            onChanged: onPriorityChanged,
          ),
          const SizedBox(width: 16),
          // Quick filters
          FilterChip(
            label: const Text('Overdue'),
            selected: false,
            onSelected: (_) {},
            avatar: const Icon(Icons.warning, size: 16, color: Colors.red),
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('AI Ready'),
            selected: false,
            onSelected: (_) {},
            avatar: const Icon(Icons.auto_awesome, size: 16, color: Colors.purple),
          ),
        ],
      ),
    );
  }

  IconData _getPriorityIcon(GradingPriority priority) {
    switch (priority) {
      case GradingPriority.low:
        return Icons.arrow_downward;
      case GradingPriority.normal:
        return Icons.remove;
      case GradingPriority.high:
        return Icons.arrow_upward;
      case GradingPriority.urgent:
        return Icons.priority_high;
    }
  }

  Color _getPriorityColor(GradingPriority priority) {
    switch (priority) {
      case GradingPriority.low:
        return Colors.grey;
      case GradingPriority.normal:
        return Colors.blue;
      case GradingPriority.high:
        return Colors.orange;
      case GradingPriority.urgent:
        return Colors.red;
    }
  }
}

/// Empty queue state.
class _EmptyQueueState extends StatelessWidget {
  const _EmptyQueueState({required this.tabName});

  final String tabName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _getEmptyIcon(),
              size: 64,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              _getEmptyTitle(),
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              _getEmptySubtitle(),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  IconData _getEmptyIcon() {
    switch (tabName) {
      case 'Pending':
        return Icons.check_circle;
      case 'In Progress':
        return Icons.hourglass_empty;
      case 'Completed':
        return Icons.history;
      default:
        return Icons.inbox;
    }
  }

  String _getEmptyTitle() {
    switch (tabName) {
      case 'Pending':
        return 'All Caught Up!';
      case 'In Progress':
        return 'No Active Grading';
      case 'Completed':
        return 'No Completed Items';
      default:
        return 'No Items';
    }
  }

  String _getEmptySubtitle() {
    switch (tabName) {
      case 'Pending':
        return 'No submissions waiting to be graded.';
      case 'In Progress':
        return 'Start grading from the Pending tab.';
      case 'Completed':
        return 'Graded submissions will appear here.';
      default:
        return 'Nothing to show.';
    }
  }
}
