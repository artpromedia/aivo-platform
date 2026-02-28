import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../gamification/models.dart';
import '../gamification/providers.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Rarity → Color mapping
// ─────────────────────────────────────────────────────────────────────────────

Color _rarityColor(BadgeRarity rarity) {
  switch (rarity) {
    case BadgeRarity.common:
      return Colors.grey.shade600;
    case BadgeRarity.uncommon:
      return const Color(0xFF10B981); // emerald-500
    case BadgeRarity.rare:
      return const Color(0xFF3B82F6); // blue-500
    case BadgeRarity.epic:
      return const Color(0xFF8B5CF6); // purple-500
    case BadgeRarity.legendary:
      return const Color(0xFFF59E0B); // amber-500
  }
}

String _rarityLabel(BadgeRarity rarity) {
  switch (rarity) {
    case BadgeRarity.common:
      return 'Common';
    case BadgeRarity.uncommon:
      return 'Uncommon';
    case BadgeRarity.rare:
      return 'Rare';
    case BadgeRarity.epic:
      return 'Epic';
    case BadgeRarity.legendary:
      return 'Legendary';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Category helpers
// ─────────────────────────────────────────────────────────────────────────────

const _categoryLabels = <String, String>{
  'all': 'All',
  'onboarding': 'Onboarding',
  'learning': 'Learning',
  'streak': 'Streak',
  'mastery': 'Mastery',
  'skill': 'Skill',
  'quiz': 'Quiz',
  'social': 'Social',
  'special': 'Special',
  'xp': 'XP',
  'time': 'Time',
};

IconData _categoryIcon(String cat) {
  switch (cat) {
    case 'onboarding':
      return Icons.waving_hand;
    case 'learning':
      return Icons.school;
    case 'streak':
      return Icons.local_fire_department;
    case 'mastery':
      return Icons.star;
    case 'skill':
      return Icons.psychology;
    case 'quiz':
      return Icons.quiz;
    case 'social':
      return Icons.people;
    case 'special':
      return Icons.auto_awesome;
    case 'xp':
      return Icons.trending_up;
    case 'time':
      return Icons.schedule;
    default:
      return Icons.emoji_events;
  }
}

String _badgeEmoji(String category) {
  switch (category) {
    case 'onboarding':
      return '👋';
    case 'learning':
      return '📚';
    case 'streak':
      return '🔥';
    case 'mastery':
      return '⭐';
    case 'skill':
      return '🧠';
    case 'quiz':
      return '❓';
    case 'social':
      return '🤝';
    case 'special':
      return '✨';
    case 'xp':
      return '📈';
    case 'time':
      return '⏰';
    default:
      return '🏆';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Achievements Screen
// ─────────────────────────────────────────────────────────────────────────────

/// Full achievements screen showing all available and earned badges.
///
/// Features:
/// - Stats row (total earned, total available, points, streak)
/// - Horizontal category filter chips
/// - 3-column badge grid: earned = colored, unearned = greyed + lock
/// - Tap badge → bottom sheet with detail, rarity, progress, date
class AchievementsScreen extends ConsumerStatefulWidget {
  const AchievementsScreen({super.key, required this.learnerId});

  final String learnerId;

  @override
  ConsumerState<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends ConsumerState<AchievementsScreen> {
  String _selectedCategory = 'all';

  @override
  Widget build(BuildContext context) {
    final allBadgesAsync = ref.watch(allBadgesProvider);
    final earnedAsync = ref.watch(earnedBadgesProvider(widget.learnerId));
    final profileAsync = ref.watch(gamificationProfileProvider(widget.learnerId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Achievements'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterSheet,
            tooltip: 'Filter badges',
          ),
        ],
      ),
      body: allBadgesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => _ErrorView(
          message: 'Failed to load achievements',
          onRetry: () => ref.invalidate(allBadgesProvider),
        ),
        data: (allBadges) => earnedAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => _ErrorView(
            message: 'Failed to load your badges',
            onRetry: () => ref.invalidate(earnedBadgesProvider(widget.learnerId)),
          ),
          data: (earnedBadges) {
            final earnedIds = earnedBadges.map((e) => e.badge.id).toSet();

            // Derive visible categories from the badge catalog
            final categories = <String>{'all'};
            for (final b in allBadges) {
              categories.add(b.category);
            }

            // Apply category filter
            final filtered = _selectedCategory == 'all'
                ? allBadges
                : allBadges.where((b) => b.category == _selectedCategory).toList();

            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(allBadgesProvider);
                ref.invalidate(earnedBadgesProvider(widget.learnerId));
                ref.invalidate(gamificationProfileProvider(widget.learnerId));
              },
              child: CustomScrollView(
                slivers: [
                  // ── Stats Row ────────────────────────────────────────────
                  SliverToBoxAdapter(
                    child: _StatsRow(
                      earnedCount: earnedBadges.length,
                      totalCount: allBadges.length,
                      profileAsync: profileAsync,
                    ),
                  ),

                  // ── Category Filter Chips ────────────────────────────────
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 48,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: categories.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, i) {
                          final cat = categories.elementAt(i);
                          final selected = _selectedCategory == cat;
                          return FilterChip(
                            label: Text(_categoryLabels[cat] ?? cat),
                            avatar: cat == 'all'
                                ? null
                                : Icon(_categoryIcon(cat), size: 18),
                            selected: selected,
                            onSelected: (_) =>
                                setState(() => _selectedCategory = cat),
                          );
                        },
                      ),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 16)),

                  // ── Badge Grid ───────────────────────────────────────────
                  filtered.isEmpty
                      ? SliverFillRemaining(
                          hasScrollBody: false,
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.emoji_events_outlined,
                                    size: 64, color: theme.colorScheme.outline),
                                const SizedBox(height: 12),
                                Text(
                                  'No badges in this category yet',
                                  style: theme.textTheme.bodyLarge?.copyWith(
                                    color: theme.colorScheme.outline,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : SliverPadding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          sliver: SliverGrid(
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              mainAxisSpacing: 12,
                              crossAxisSpacing: 12,
                              childAspectRatio: 0.78,
                            ),
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final badge = filtered[index];
                                final isEarned = earnedIds.contains(badge.id);
                                final earned = isEarned
                                    ? earnedBadges
                                        .firstWhere((e) => e.badge.id == badge.id)
                                    : null;

                                return _BadgeTile(
                                  badge: badge,
                                  isEarned: isEarned,
                                  earned: earned,
                                  onTap: () => _showBadgeDetail(
                                    context,
                                    badge: badge,
                                    isEarned: isEarned,
                                    earned: earned,
                                  ),
                                );
                              },
                              childCount: filtered.length,
                            ),
                          ),
                        ),

                  const SliverToBoxAdapter(child: SizedBox(height: 32)),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  void _showFilterSheet() {
    // The filter chips above are always visible; this button scrolls to top
    // as a convenience. Could add a bottom-sheet sort in the future.
  }

  void _showBadgeDetail(
    BuildContext context, {
    required GamificationBadge badge,
    required bool isEarned,
    EarnedBadge? earned,
  }) {
    final theme = Theme.of(context);
    final color = _rarityColor(badge.rarity);

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle bar
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outline.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),

              // Badge icon large
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isEarned
                      ? color.withValues(alpha: 0.15)
                      : theme.colorScheme.surfaceContainerHighest,
                  border: Border.all(
                    color: isEarned ? color : theme.colorScheme.outline,
                    width: 3,
                  ),
                ),
                child: Center(
                  child: isEarned
                      ? Text(
                          _badgeEmoji(badge.category),
                          style: const TextStyle(fontSize: 36),
                        )
                      : Icon(Icons.lock, size: 32, color: theme.colorScheme.outline),
                ),
              ),
              const SizedBox(height: 16),

              // Name
              Text(
                badge.name,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),

              // Rarity chip
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: color),
                ),
                child: Text(
                  _rarityLabel(badge.rarity),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Description
              Text(
                badge.description,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),

              // Points value
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.star, size: 18, color: Colors.amber.shade700),
                  const SizedBox(width: 4),
                  Text(
                    '${badge.pointsValue} XP',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Earned date or locked
              if (isEarned && earned != null) ...[
                const Divider(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle, size: 20, color: Colors.green.shade600),
                    const SizedBox(width: 8),
                    Text(
                      'Earned ${_formatDate(earned.earnedAt)}',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: Colors.green.shade700,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ] else ...[
                const Divider(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.lock_outline, size: 20,
                        color: theme.colorScheme.outline),
                    const SizedBox(width: 8),
                    Text(
                      'Not yet earned — keep learning!',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.outline,
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  String _formatDate(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate);
      final months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
    } catch (_) {
      return isoDate;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Row
// ─────────────────────────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  const _StatsRow({
    required this.earnedCount,
    required this.totalCount,
    required this.profileAsync,
  });

  final int earnedCount;
  final int totalCount;
  final AsyncValue<GamificationProfile> profileAsync;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Row(
        children: [
          _StatCard(
            icon: Icons.emoji_events,
            value: '$earnedCount / $totalCount',
            label: 'Badges',
            color: Colors.amber,
          ),
          const SizedBox(width: 12),
          profileAsync.when(
            loading: () => const Expanded(
              child: SizedBox(height: 70, child: Center(child: CircularProgressIndicator(strokeWidth: 2))),
            ),
            error: (_, __) => _StatCard(
              icon: Icons.trending_up,
              value: '--',
              label: 'Points',
              color: theme.colorScheme.primary,
            ),
            data: (profile) => _StatCard(
              icon: Icons.trending_up,
              value: '${profile.totalPoints}',
              label: 'Points',
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(width: 12),
          profileAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => _StatCard(
              icon: Icons.local_fire_department,
              value: '--',
              label: 'Streak',
              color: Colors.deepOrange,
            ),
            data: (profile) => _StatCard(
              icon: Icons.local_fire_department,
              value: '${profile.streakDays}d',
              label: 'Streak',
              color: Colors.deepOrange,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 4),
            Text(
              value,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(label, style: theme.textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge Tile
// ─────────────────────────────────────────────────────────────────────────────

class _BadgeTile extends StatelessWidget {
  const _BadgeTile({
    required this.badge,
    required this.isEarned,
    this.earned,
    required this.onTap,
  });

  final GamificationBadge badge;
  final bool isEarned;
  final EarnedBadge? earned;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _rarityColor(badge.rarity);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: isEarned
              ? color.withValues(alpha: 0.08)
              : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isEarned ? color.withValues(alpha: 0.4) : theme.colorScheme.outline.withValues(alpha: 0.2),
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Badge circle
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isEarned
                    ? color.withValues(alpha: 0.15)
                    : theme.colorScheme.surfaceContainerHighest,
                border: Border.all(
                  color: isEarned ? color : theme.colorScheme.outline.withValues(alpha: 0.3),
                  width: 2,
                ),
              ),
              child: Center(
                child: isEarned
                    ? Text(_badgeEmoji(badge.category),
                        style: const TextStyle(fontSize: 24))
                    : Icon(Icons.lock,
                        size: 22, color: theme.colorScheme.outline),
              ),
            ),
            const SizedBox(height: 8),

            // Badge name
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                badge.name,
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: isEarned ? null : theme.colorScheme.outline,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),

            // Rarity dot
            const SizedBox(height: 4),
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isEarned ? color : color.withValues(alpha: 0.3),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Error View
// ─────────────────────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
          const SizedBox(height: 16),
          Text(message, style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          TextButton(
            onPressed: onRetry,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
