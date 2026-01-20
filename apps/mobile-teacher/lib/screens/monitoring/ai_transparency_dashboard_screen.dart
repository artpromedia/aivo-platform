/// AI Transparency Dashboard Screen
///
/// Dashboard for teachers to monitor AI interactions across their class.
/// Provides visibility into how students are using AI tutoring features.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../models/ai_transparency.dart';
import '../../providers/ai_transparency_provider.dart';

/// Screen displaying AI usage transparency dashboard for a class.
class AITransparencyDashboardScreen extends ConsumerStatefulWidget {
  const AITransparencyDashboardScreen({
    super.key,
    required this.classId,
  });

  final String classId;

  @override
  ConsumerState<AITransparencyDashboardScreen> createState() =>
      _AITransparencyDashboardScreenState();
}

class _AITransparencyDashboardScreenState
    extends ConsumerState<AITransparencyDashboardScreen> {
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(aiTransparencyProvider(widget.classId));
    final notifier = ref.read(aiTransparencyProvider(widget.classId).notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Transparency'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => notifier.loadData(),
            tooltip: 'Refresh',
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilterSheet(context, notifier, state),
            tooltip: 'Filter',
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? _buildErrorView(state.error!, notifier)
              : RefreshIndicator(
                  onRefresh: () => notifier.loadData(),
                  child: _buildContent(context, state, notifier),
                ),
    );
  }

  Widget _buildErrorView(String error, AITransparencyNotifier notifier) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AivoBrand.error),
          const SizedBox(height: 16),
          Text(
            'Error loading AI data',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(error, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => notifier.loadData(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    AITransparencyState state,
    AITransparencyNotifier notifier,
  ) {
    return CustomScrollView(
      slivers: [
        // Stats summary
        if (state.stats != null) SliverToBoxAdapter(child: _buildStatsCard(state.stats!)),

        // Filter chips
        SliverToBoxAdapter(child: _buildFilterChips(state, notifier)),

        // Alert banner for flagged items
        if (state.stats != null && (state.stats!.flaggedCount > 0 || state.stats!.reviewCount > 0))
          SliverToBoxAdapter(child: _buildAlertBanner(state.stats!)),

        // Active now section
        if (state.selectedFilter == AITransparencyFilter.all ||
            state.selectedFilter == AITransparencyFilter.activeNow)
          SliverToBoxAdapter(child: _buildSectionHeader('Active Now', state.stats?.activeNow ?? 0)),

        // Student activity list
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final activities = notifier.filteredActivities;
                if (index >= activities.length) return null;
                return _StudentActivityCard(
                  activity: activities[index],
                  onTap: () => _navigateToStudentConversations(activities[index]),
                );
              },
              childCount: notifier.filteredActivities.length,
            ),
          ),
        ),

        // Empty state
        if (notifier.filteredActivities.isEmpty)
          SliverFillRemaining(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.psychology_outlined,
                    size: 64,
                    color: AivoBrand.gray[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No AI activity found',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AivoBrand.gray[600],
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Students\' AI interactions will appear here',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AivoBrand.gray[500],
                        ),
                  ),
                ],
              ),
            ),
          ),

        const SliverToBoxAdapter(child: SizedBox(height: 24)),
      ],
    );
  }

  Widget _buildStatsCard(AIUsageStats stats) {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.insights, size: 20),
                const SizedBox(width: 8),
                Text(
                  'AI Usage Overview',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _StatItem(
                  icon: Icons.chat_bubble_outline,
                  label: 'Conversations',
                  value: '${stats.totalConversations}',
                ),
                _StatItem(
                  icon: Icons.message_outlined,
                  label: 'Messages',
                  value: '${stats.totalMessages}',
                ),
                _StatItem(
                  icon: Icons.timer_outlined,
                  label: 'Avg Duration',
                  value: _formatDuration(stats.averageSessionDuration),
                ),
                _StatItem(
                  icon: Icons.person,
                  label: 'Active Now',
                  value: '${stats.activeNow}',
                  color: stats.activeNow > 0 ? AivoBrand.success : null,
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 12),
            Text(
              'By Subject',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AivoBrand.gray[600],
                  ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: stats.bySubject.entries.map((entry) {
                return Chip(
                  label: Text('${entry.key}: ${entry.value}'),
                  visualDensity: VisualDensity.compact,
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChips(AITransparencyState state, AITransparencyNotifier notifier) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          _FilterChip(
            label: 'All',
            selected: state.selectedFilter == AITransparencyFilter.all,
            onSelected: () => notifier.setFilter(AITransparencyFilter.all),
          ),
          _FilterChip(
            label: 'Active Now',
            selected: state.selectedFilter == AITransparencyFilter.activeNow,
            onSelected: () => notifier.setFilter(AITransparencyFilter.activeNow),
            icon: Icons.circle,
            iconColor: AivoBrand.success,
          ),
          _FilterChip(
            label: 'Needs Review',
            selected: state.selectedFilter == AITransparencyFilter.needsReview,
            onSelected: () => notifier.setFilter(AITransparencyFilter.needsReview),
            icon: Icons.flag,
            iconColor: AivoBrand.warning,
          ),
          _FilterChip(
            label: 'Flagged',
            selected: state.selectedFilter == AITransparencyFilter.flagged,
            onSelected: () => notifier.setFilter(AITransparencyFilter.flagged),
            icon: Icons.warning,
            iconColor: AivoBrand.error,
          ),
        ],
      ),
    );
  }

  Widget _buildAlertBanner(AIUsageStats stats) {
    final total = stats.flaggedCount + stats.reviewCount;
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AivoBrand.sunshine[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AivoBrand.sunshine[200]!),
      ),
      child: Row(
        children: [
          Icon(Icons.flag, color: AivoBrand.sunshine[700]),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              '$total conversation${total > 1 ? 's' : ''} need${total == 1 ? 's' : ''} review',
              style: TextStyle(
                color: AivoBrand.sunshine[800],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          TextButton(
            onPressed: () => ref
                .read(aiTransparencyProvider(widget.classId).notifier)
                .setFilter(AITransparencyFilter.needsReview),
            child: const Text('View'),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, int count) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '$count',
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ),
        ],
      ),
    );
  }

  void _showFilterSheet(
    BuildContext context,
    AITransparencyNotifier notifier,
    AITransparencyState state,
  ) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Filter AI Activity',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            ...AITransparencyFilter.values.map((filter) => ListTile(
                  leading: Icon(
                    state.selectedFilter == filter
                        ? Icons.radio_button_checked
                        : Icons.radio_button_off,
                  ),
                  title: Text(_getFilterLabel(filter)),
                  onTap: () {
                    notifier.setFilter(filter);
                    Navigator.pop(context);
                  },
                )),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  String _getFilterLabel(AITransparencyFilter filter) {
    switch (filter) {
      case AITransparencyFilter.all:
        return 'All Activity';
      case AITransparencyFilter.activeNow:
        return 'Active Now';
      case AITransparencyFilter.flagged:
        return 'Flagged';
      case AITransparencyFilter.needsReview:
        return 'Needs Review';
      case AITransparencyFilter.tutoring:
        return 'Tutoring';
      case AITransparencyFilter.homework:
        return 'Homework Help';
      case AITransparencyFilter.writing:
        return 'Writing Assistance';
    }
  }

  void _navigateToStudentConversations(StudentAIActivity activity) {
    context.push('/students/${activity.studentId}/ai-conversations');
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    if (minutes > 0) {
      return '${minutes}m ${seconds}s';
    }
    return '${seconds}s';
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.icon,
    required this.label,
    required this.value,
    this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color ?? Theme.of(context).colorScheme.primary, size: 20),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AivoBrand.gray[600],
              ),
        ),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
    this.icon,
    this.iconColor,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;
  final IconData? icon;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 12, color: iconColor),
              const SizedBox(width: 4),
            ],
            Text(label),
          ],
        ),
        selected: selected,
        onSelected: (_) => onSelected(),
      ),
    );
  }
}

class _StudentActivityCard extends StatelessWidget {
  const _StudentActivityCard({
    required this.activity,
    required this.onTap,
  });

  final StudentAIActivity activity;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Avatar with status indicator
              Stack(
                children: [
                  CircleAvatar(
                    radius: 24,
                    child: Text(activity.studentName[0]),
                  ),
                  if (activity.isActiveNow)
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: AivoBrand.success,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 12),
              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            activity.studentName,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                        ),
                        if (activity.flagCount > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AivoBrand.sunshine[100],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.flag, size: 12, color: AivoBrand.sunshine[700]),
                                const SizedBox(width: 2),
                                Text(
                                  '${activity.flagCount}',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: AivoBrand.sunshine[700],
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (activity.currentTopic != null)
                      Text(
                        activity.currentTopic!,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        _MetricChip(
                          icon: Icons.chat_bubble_outline,
                          value: '${activity.conversationCount}',
                        ),
                        const SizedBox(width: 8),
                        _MetricChip(
                          icon: Icons.message_outlined,
                          value: '${activity.messageCount}',
                        ),
                        const SizedBox(width: 8),
                        if (activity.sentiment != null) _SentimentChip(sentiment: activity.sentiment!),
                        const Spacer(),
                        Text(
                          _formatTimeAgo(activity.lastActiveAt),
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: AivoBrand.gray[600],
                              ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right, color: AivoBrand.gray),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTimeAgo(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

class _MetricChip extends StatelessWidget {
  const _MetricChip({
    required this.icon,
    required this.value,
  });

  final IconData icon;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AivoBrand.gray[600]),
        const SizedBox(width: 2),
        Text(
          value,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AivoBrand.gray[600],
              ),
        ),
      ],
    );
  }
}

class _SentimentChip extends StatelessWidget {
  const _SentimentChip({required this.sentiment});

  final String sentiment;

  @override
  Widget build(BuildContext context) {
    final config = _getSentimentConfig(sentiment);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(config.icon, size: 12, color: config.color),
          const SizedBox(width: 2),
          Text(
            config.label,
            style: TextStyle(
              fontSize: 10,
              color: config.color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  _SentimentConfig _getSentimentConfig(String sentiment) {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return _SentimentConfig('Positive', Icons.sentiment_satisfied, AivoBrand.success);
      case 'neutral':
        return _SentimentConfig('Neutral', Icons.sentiment_neutral, AivoBrand.gray);
      case 'negative':
        return _SentimentConfig('Negative', Icons.sentiment_dissatisfied, AivoBrand.warning);
      case 'frustrated':
        return _SentimentConfig('Frustrated', Icons.sentiment_very_dissatisfied, AivoBrand.error);
      default:
        return _SentimentConfig('Unknown', Icons.help_outline, AivoBrand.gray);
    }
  }
}

class _SentimentConfig {
  const _SentimentConfig(this.label, this.icon, this.color);

  final String label;
  final IconData icon;
  final Color color;
}
