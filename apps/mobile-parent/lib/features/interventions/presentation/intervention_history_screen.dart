/// Intervention History Screen
///
/// Screen showing all interventions for a child.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/intervention_history.dart';
import '../providers/intervention_provider.dart';
import '../widgets/widgets.dart';

/// Screen showing intervention history for a child.
class InterventionHistoryScreen extends ConsumerStatefulWidget {
  const InterventionHistoryScreen({
    super.key,
    required this.childId,
  });

  final String childId;

  @override
  ConsumerState<InterventionHistoryScreen> createState() =>
      _InterventionHistoryScreenState();
}

class _InterventionHistoryScreenState
    extends ConsumerState<InterventionHistoryScreen> {
  InterventionCategory? _selectedCategory;
  InterventionStatus? _selectedStatus;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final historyAsync = ref.watch(interventionHistoryProvider(widget.childId));
    final activeAsync = ref.watch(activeInterventionsProvider(widget.childId));
    final summaryAsync = ref.watch(interventionSummaryProvider(widget.childId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Support History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _showInfoDialog(context),
            tooltip: 'About Support',
          ),
        ],
      ),
      body: historyAsync.when(
        data: (history) => _buildContent(
          history,
          activeAsync,
          summaryAsync,
          theme,
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => _buildErrorState(error.toString()),
      ),
    );
  }

  Widget _buildContent(
    List<InterventionRecord> history,
    AsyncValue<List<InterventionRecord>> activeAsync,
    AsyncValue<InterventionSummary> summaryAsync,
    ThemeData theme,
  ) {
    // Filter interventions
    var filteredHistory = history;
    if (_selectedCategory != null) {
      filteredHistory = filteredHistory
          .where((i) => i.category == _selectedCategory)
          .toList();
    }
    if (_selectedStatus != null) {
      filteredHistory = filteredHistory
          .where((i) => i.status == _selectedStatus)
          .toList();
    }

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(interventionHistoryProvider(widget.childId));
        ref.invalidate(activeInterventionsProvider(widget.childId));
      },
      child: CustomScrollView(
        slivers: [
          // Summary section
          summaryAsync.when(
            data: (summary) => SliverToBoxAdapter(
              child: _buildSummarySection(summary, theme),
            ),
            loading: () => const SliverToBoxAdapter(child: SizedBox.shrink()),
            error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
          ),

          // Active interventions section
          activeAsync.when(
            data: (active) {
              if (active.isEmpty) return const SliverToBoxAdapter(child: SizedBox.shrink());
              return SliverToBoxAdapter(
                child: _buildActiveSection(active, theme),
              );
            },
            loading: () => const SliverToBoxAdapter(child: SizedBox.shrink()),
            error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
          ),

          // Filters
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'Filter by Category',
                      style: theme.textTheme.titleSmall,
                    ),
                  ),
                  const SizedBox(height: 8),
                  CategoryFilterChips(
                    selectedCategory: _selectedCategory,
                    onCategorySelected: (category) {
                      setState(() {
                        _selectedCategory = category;
                      });
                    },
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'Filter by Status',
                      style: theme.textTheme.titleSmall,
                    ),
                  ),
                  const SizedBox(height: 8),
                  StatusFilterChips(
                    selectedStatus: _selectedStatus,
                    onStatusSelected: (status) {
                      setState(() {
                        _selectedStatus = status;
                      });
                    },
                  ),
                ],
              ),
            ),
          ),

          // History section header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Text(
                    'History',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${filteredHistory.length} records',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // History timeline
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: InterventionTimeline(
                interventions: filteredHistory,
                onItemTap: (intervention) => _navigateToDetail(intervention),
              ),
            ),
          ),

          const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
        ],
      ),
    );
  }

  Widget _buildSummarySection(InterventionSummary summary, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Support Overview',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _SummaryItem(
                      label: 'Total',
                      value: '${summary.totalInterventions}',
                      icon: Icons.history,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  Expanded(
                    child: _SummaryItem(
                      label: 'Active',
                      value: '${summary.activeCount}',
                      icon: Icons.play_arrow,
                      color: Colors.blue,
                    ),
                  ),
                  Expanded(
                    child: _SummaryItem(
                      label: 'Completed',
                      value: '${summary.completedCount}',
                      icon: Icons.check_circle,
                      color: Colors.green,
                    ),
                  ),
                  Expanded(
                    child: _SummaryItem(
                      label: 'Successful',
                      value: '${summary.successfulCount}',
                      icon: Icons.star,
                      color: Colors.amber,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActiveSection(
    List<InterventionRecord> active,
    ThemeData theme,
  ) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.play_circle, color: Colors.blue, size: 20),
              const SizedBox(width: 8),
              Text(
                'Currently Active',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${active.length}',
                  style: TextStyle(
                    color: Colors.blue,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...active.map((intervention) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InterventionCard(
                  intervention: intervention,
                  onTap: () => _navigateToDetail(intervention),
                ),
              )),
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
            Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Failed to load support history',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(error),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () =>
                  ref.invalidate(interventionHistoryProvider(widget.childId)),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  void _navigateToDetail(InterventionRecord intervention) {
    context.push('/interventions/${intervention.id}');
  }

  void _showInfoDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('About Support History'),
        content: const SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'What is Support?',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'Support (also called interventions) are extra help measures '
                'provided to your child to help them succeed. These can be '
                'AI-powered adaptations, teacher recommendations, or targeted '
                'practice activities.',
              ),
              SizedBox(height: 16),
              Text(
                'Types of Support',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                '• AI-Powered: Automatic adjustments made by the AI tutor\n'
                '• Teacher Recommended: Suggestions from your child\'s teacher\n'
                '• Parent Requested: Support you\'ve requested for your child',
              ),
              SizedBox(height: 16),
              Text(
                'Tracking Progress',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'You can see how well each support measure is working by '
                'checking the outcome badges. Tap any item to see detailed '
                'progress information.',
              ),
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
}

/// Summary item widget.
class _SummaryItem extends StatelessWidget {
  const _SummaryItem({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 4),
        Text(
          value,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
