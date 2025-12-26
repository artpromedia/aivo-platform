/// Leaderboard Widget
///
/// Displays rankings with podium and list views
library;

import 'package:flutter/material.dart';
import '../gamification_models.dart';

/// Full leaderboard widget with podium and list
class LeaderboardWidget extends StatelessWidget {
  /// List of leaderboard entries
  final List<LeaderboardEntry> entries;

  /// Current scope (class, school, global)
  final String scope;

  /// Current period (daily, weekly, monthly, allTime)
  final String period;

  /// Callback when scope changes
  final void Function(String)? onScopeChange;

  /// Callback when period changes
  final void Function(String)? onPeriodChange;

  const LeaderboardWidget({
    super.key,
    required this.entries,
    this.scope = 'class',
    this.period = 'weekly',
    this.onScopeChange,
    this.onPeriodChange,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Separate top 3 and rest
    final top3 = entries.take(3).toList();
    final rest = entries.skip(3).toList();

    return Column(
      children: [
        // Filters
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Expanded(
                child: _FilterChips(
                  options: const ['class', 'school', 'global'],
                  labels: const ['Class', 'School', 'Global'],
                  selected: scope,
                  onSelected: onScopeChange,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _FilterChips(
            options: const ['daily', 'weekly', 'monthly', 'allTime'],
            labels: const ['Today', 'Week', 'Month', 'All Time'],
            selected: period,
            onSelected: onPeriodChange,
          ),
        ),
        const SizedBox(height: 16),

        // Podium for top 3
        if (top3.isNotEmpty)
          _Podium(entries: top3),

        const SizedBox(height: 16),

        // Rest of the list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: rest.length,
            itemBuilder: (context, index) {
              return _LeaderboardRow(entry: rest[index]);
            },
          ),
        ),
      ],
    );
  }
}

class _FilterChips extends StatelessWidget {
  final List<String> options;
  final List<String> labels;
  final String selected;
  final void Function(String)? onSelected;

  const _FilterChips({
    required this.options,
    required this.labels,
    required this.selected,
    this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(options.length, (index) {
        final option = options[index];
        final label = labels[index];
        final isSelected = option == selected;

        return Padding(
          padding: const EdgeInsets.only(right: 8),
          child: FilterChip(
            label: Text(label),
            selected: isSelected,
            onSelected: onSelected != null ? (_) => onSelected!(option) : null,
            backgroundColor: Colors.grey.shade100,
            selectedColor: Colors.blue.shade100,
            labelStyle: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              color: isSelected ? Colors.blue.shade700 : Colors.grey.shade700,
            ),
          ),
        );
      }),
    );
  }
}

class _Podium extends StatelessWidget {
  final List<LeaderboardEntry> entries;

  const _Podium({required this.entries});

  @override
  Widget build(BuildContext context) {
    // Arrange for podium: [2nd, 1st, 3rd]
    final arranged = <LeaderboardEntry?>[];
    if (entries.length >= 2) arranged.add(entries[1]);
    if (entries.isNotEmpty) arranged.add(entries[0]);
    if (entries.length >= 3) arranged.add(entries[2]);

    final heights = [80.0, 100.0, 60.0];
    final colors = [Colors.grey.shade400, Colors.amber, Colors.brown.shade300];
    final medals = ['🥈', '🥇', '🥉'];

    return Container(
      height: 180,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: List.generate(arranged.length, (index) {
          final entry = arranged[index];
          if (entry == null) return const SizedBox(width: 80);

          return Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                // Medal
                Text(medals[index], style: const TextStyle(fontSize: 24)),
                const SizedBox(height: 4),
                // Avatar
                CircleAvatar(
                  radius: index == 1 ? 28 : 24,
                  backgroundColor: colors[index],
                  child: entry.avatarUrl != null
                      ? ClipOval(
                          child: Image.network(
                            entry.avatarUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _buildInitials(entry),
                          ),
                        )
                      : _buildInitials(entry),
                ),
                const SizedBox(height: 4),
                // Name
                Text(
                  entry.displayName,
                  style: TextStyle(
                    fontSize: index == 1 ? 14 : 12,
                    fontWeight: FontWeight.w600,
                    color: entry.isCurrentUser ? Colors.blue : Colors.black87,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
                Text(
                  '${entry.score} XP',
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 8),
                // Podium bar
                Container(
                  height: heights[index],
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: colors[index],
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(8),
                    ),
                  ),
                  child: Center(
                    child: Text(
                      '${entry.rank}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildInitials(LeaderboardEntry entry) {
    final initials = entry.displayName.split(' ').take(2).map((s) => s.isEmpty ? '' : s[0]).join();
    return Text(
      initials.toUpperCase(),
      style: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.bold,
      ),
    );
  }
}

class _LeaderboardRow extends StatelessWidget {
  final LeaderboardEntry entry;

  const _LeaderboardRow({required this.entry});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: entry.isCurrentUser ? Colors.blue.shade50 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: entry.isCurrentUser ? Colors.blue.shade200 : Colors.grey.shade200,
        ),
      ),
      child: Row(
        children: [
          // Rank
          SizedBox(
            width: 32,
            child: Text(
              '#${entry.rank}',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: entry.isCurrentUser ? Colors.blue : Colors.grey.shade700,
              ),
            ),
          ),
          // Avatar
          CircleAvatar(
            radius: 20,
            backgroundColor: Colors.grey.shade200,
            child: entry.avatarUrl != null
                ? ClipOval(
                    child: Image.network(
                      entry.avatarUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _buildInitials(),
                    ),
                  )
                : _buildInitials(),
          ),
          const SizedBox(width: 12),
          // Name and level
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.displayName,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: entry.isCurrentUser ? Colors.blue : Colors.black87,
                  ),
                ),
                Text(
                  'Level ${entry.level}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade500,
                  ),
                ),
              ],
            ),
          ),
          // Score
          Text(
            '${entry.score} XP',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: entry.isCurrentUser ? Colors.blue : Colors.grey.shade700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInitials() {
    final initials = entry.displayName.split(' ').take(2).map((s) => s.isEmpty ? '' : s[0]).join();
    return Text(
      initials.toUpperCase(),
      style: const TextStyle(fontWeight: FontWeight.bold),
    );
  }
}

/// Compact leaderboard showing just top 3
class LeaderboardCompact extends StatelessWidget {
  /// List of leaderboard entries (will take top 3)
  final List<LeaderboardEntry> entries;

  /// Callback when tapped to expand
  final VoidCallback? onExpand;

  const LeaderboardCompact({
    super.key,
    required this.entries,
    this.onExpand,
  });

  @override
  Widget build(BuildContext context) {
    final top3 = entries.take(3).toList();

    return InkWell(
      onTap: onExpand,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          children: [
            Row(
              children: [
                const Icon(Icons.leaderboard, color: Colors.amber),
                const SizedBox(width: 8),
                const Text(
                  'Leaderboard',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Text(
                  'View All',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.blue.shade600,
                  ),
                ),
                Icon(Icons.chevron_right, size: 16, color: Colors.blue.shade600),
              ],
            ),
            const SizedBox(height: 12),
            ...top3.map((entry) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  _buildMedal(entry.rank),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      entry.displayName,
                      style: TextStyle(
                        fontWeight: entry.isCurrentUser ? FontWeight.w600 : FontWeight.normal,
                        color: entry.isCurrentUser ? Colors.blue : Colors.black87,
                      ),
                    ),
                  ),
                  Text(
                    '${entry.score} XP',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildMedal(int rank) {
    final medals = ['🥇', '🥈', '🥉'];
    if (rank <= 3) {
      return Text(medals[rank - 1], style: const TextStyle(fontSize: 18));
    }
    return SizedBox(
      width: 24,
      child: Text(
        '#$rank',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.grey.shade600,
        ),
      ),
    );
  }
}
