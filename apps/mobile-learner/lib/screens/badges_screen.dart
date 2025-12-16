import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../engagement/models.dart';
import '../engagement/providers.dart';

/// Screen displaying all earned and in-progress badges
class BadgesScreen extends ConsumerWidget {
  const BadgesScreen({super.key, required this.tenantId, required this.learnerId});

  final String tenantId;
  final String learnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final params = (tenantId: tenantId, learnerId: learnerId);
    final badgesAsync = ref.watch(learnerBadgesProvider(params));
    final progressAsync = ref.watch(badgeProgressProvider(params));

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Badges'),
      ),
      body: badgesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
              const SizedBox(height: 16),
              Text('Failed to load badges', style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.invalidate(learnerBadgesProvider(params)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (badges) => _BadgesContent(
          tenantId: tenantId,
          learnerId: learnerId,
          badges: badges,
          progressAsync: progressAsync,
        ),
      ),
    );
  }
}

class _BadgesContent extends StatelessWidget {
  const _BadgesContent({
    required this.tenantId,
    required this.learnerId,
    required this.badges,
    required this.progressAsync,
  });

  final String tenantId;
  final String learnerId;
  final List<LearnerBadge> badges;
  final AsyncValue<List<BadgeProgress>> progressAsync;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // LearnerBadge.awardedAt is required, so all badges are earned
    final earnedBadges = badges;

    return RefreshIndicator(
      onRefresh: () async {
        // This would need ProviderScope access, handled via Consumer
      },
      child: CustomScrollView(
        slivers: [
          // Stats header
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const Text('🏆', style: TextStyle(fontSize: 48)),
                  const SizedBox(height: 8),
                  Text(
                    '${earnedBadges.length} Badge${earnedBadges.length != 1 ? 's' : ''} Earned',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Earned badges section
          if (earnedBadges.isNotEmpty) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: Text(
                  'Earned',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverGrid(
                delegate: SliverChildBuilderDelegate(
                  (context, index) => _EarnedBadgeCard(badge: earnedBadges[index]),
                  childCount: earnedBadges.length,
                ),
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 160,
                  childAspectRatio: 0.85,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
              ),
            ),
          ],

          // In-progress badges section
          progressAsync.when(
            loading: () => const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
            error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
            data: (progress) {
              final inProgress = progress.where((p) => !p.earned).toList();
              if (inProgress.isEmpty) {
                return const SliverToBoxAdapter(child: SizedBox.shrink());
              }

              return SliverList(
                delegate: SliverChildListDelegate([
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
                    child: Text(
                      'In Progress',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  ...inProgress.map((p) => _InProgressBadgeCard(progress: p)),
                ]),
              );
            },
          ),

          // Empty state
          if (earnedBadges.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.emoji_events_outlined,
                      size: 64,
                      color: theme.colorScheme.outlineVariant,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No badges yet',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Complete activities to earn badges!',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          const SliverPadding(padding: EdgeInsets.only(bottom: 24)),
        ],
      ),
    );
  }
}

class _EarnedBadgeCard extends StatelessWidget {
  const _EarnedBadgeCard({required this.badge});

  final LearnerBadge badge;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.amber.withValues(alpha: 0.5),
          width: 2,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _showBadgeDetails(context),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  _getIconEmoji(badge.iconKey),
                  style: const TextStyle(fontSize: 36),
                ),
                const SizedBox(height: 8),
                Text(
                  badge.badgeName,
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  badge.badgeDescription,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _getIconEmoji(String iconKey) {
    // Map icon keys to emojis - could be expanded
    const iconMap = {
      'trophy': '🏆',
      'star': '⭐',
      'medal': '🥇',
      'fire': '🔥',
      'lightning': '⚡',
      'heart': '❤️',
      'book': '📚',
      'rocket': '🚀',
    };
    return iconMap[iconKey] ?? '🏆';
  }

  void _showBadgeDetails(BuildContext context) {
    final theme = Theme.of(context);

    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _getIconEmoji(badge.iconKey),
              style: const TextStyle(fontSize: 64),
            ),
            const SizedBox(height: 16),
            Text(
              badge.badgeName,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              badge.badgeDescription,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Earned ${_formatDate(badge.awardedAt)}',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) return 'today';
    if (diff.inDays == 1) return 'yesterday';
    if (diff.inDays < 7) return '${diff.inDays} days ago';
    return '${date.month}/${date.day}/${date.year}';
  }
}

class _InProgressBadgeCard extends StatelessWidget {
  const _InProgressBadgeCard({required this.progress});

  final BadgeProgress progress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final percentage = progress.target > 0
        ? progress.progress / progress.target
        : 0.0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerLow,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Text(
              _getIconEmoji(progress.iconKey),
              style: TextStyle(
                fontSize: 32,
                color: Colors.grey.withValues(alpha: 0.7),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    progress.badgeName,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: percentage.clamp(0.0, 1.0),
                    backgroundColor: theme.colorScheme.outlineVariant.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${progress.progress} / ${progress.target}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getIconEmoji(String iconKey) {
    const iconMap = {
      'trophy': '🏆',
      'star': '⭐',
      'medal': '🥇',
      'fire': '🔥',
      'lightning': '⚡',
      'heart': '❤️',
      'book': '📚',
      'rocket': '🚀',
    };
    return iconMap[iconKey] ?? '🔒';
  }
}
