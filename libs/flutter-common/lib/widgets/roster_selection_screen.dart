import 'package:flutter/material.dart';

import '../l10n/local_strings.dart';
import '../theme/aivo_theme.dart';
import '../shared_device/shared_device.dart';

/// Screen for selecting a learner from the classroom roster.
///
/// Displays a grid of learner names/avatars for the classroom.
/// When a learner taps their name, they proceed to PIN entry.
class RosterSelectionScreen extends StatefulWidget {
  final ClassroomRoster roster;
  final void Function(RosterLearner learner) onLearnerSelected;
  final VoidCallback onBack;
  final VoidCallback? onRefresh;

  const RosterSelectionScreen({
    super.key,
    required this.roster,
    required this.onLearnerSelected,
    required this.onBack,
    this.onRefresh,
  });

  @override
  State<RosterSelectionScreen> createState() => _RosterSelectionScreenState();
}

class _RosterSelectionScreenState extends State<RosterSelectionScreen> {
  bool _isRefreshing = false;

  Future<void> _handleRefresh() async {
    if (widget.onRefresh == null) return;
    setState(() => _isRefreshing = true);
    try {
      widget.onRefresh!();
    } finally {
      if (mounted) setState(() => _isRefreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.extension<AivoColors>() ?? AivoColors.light;
    final roster = widget.roster;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: widget.onBack,
          tooltip: 'Back to class code',
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              roster.classroomName,
              style: theme.textTheme.titleMedium,
            ),
            Text(
              '${roster.teacherName}\'s Class',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colors.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          if (widget.onRefresh != null)
            IconButton(
              icon: _isRefreshing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.refresh),
              onPressed: _isRefreshing ? null : _handleRefresh,
              tooltip: 'Refresh roster',
            ),
        ],
      ),
      body: Column(
        children: [
          // Header instruction
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: colors.primaryContainer,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.touch_app, color: colors.primary),
                const SizedBox(width: 12),
                Text(
                  'Tap your name to sign in',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: colors.onPrimaryContainer,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),

          // Roster grid
          Expanded(
            child: roster.learners.isEmpty
                ? _buildEmptyState(context)
                : _buildRosterGrid(context),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.extension<AivoColors>() ?? AivoColors.light;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.people_outline,
            size: 64,
            color: colors.textSecondary,
          ),
          const SizedBox(height: 16),
          Text(
            'No learners in this class',
            style: theme.textTheme.titleMedium?.copyWith(
              color: colors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Ask your teacher for help',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRosterGrid(BuildContext context) {
    final roster = widget.roster;

    return LayoutBuilder(
      builder: (context, constraints) {
        // Responsive grid: 2 columns on phone, 3-4 on tablet
        final crossAxisCount = constraints.maxWidth > 800
            ? 4
            : constraints.maxWidth > 600
                ? 3
                : 2;

        return GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.2,
          ),
          itemCount: roster.learners.length,
          itemBuilder: (context, index) {
            final learner = roster.learners[index];
            return _LearnerCard(
              learner: learner,
              displayMode: roster.displayMode,
              onTap: () => widget.onLearnerSelected(learner),
            );
          },
        );
      },
    );
  }
}

class _LearnerCard extends StatelessWidget {
  final RosterLearner learner;
  final RosterDisplayMode displayMode;
  final VoidCallback onTap;

  const _LearnerCard({
    required this.learner,
    required this.displayMode,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.extension<AivoColors>() ?? AivoColors.light;
    final displayName = learner.getDisplayName(displayMode);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Avatar
              _buildAvatar(colors),
              const SizedBox(height: 12),

              // Name
              Text(
                displayName,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),

              // PIN indicator
              if (learner.hasPin) ...[
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.lock_outline,
                      size: 14,
                      color: colors.textSecondary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'PIN required',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar(AivoColors colors) {
    final initials = _getInitials(learner.displayName);

    if (learner.avatarUrl != null) {
      return CircleAvatar(
        radius: 28,
        backgroundImage: NetworkImage(learner.avatarUrl!),
        onBackgroundImageError: (_, __) {},
        child: Text(initials),
      );
    }

    // Generate consistent color from learner ID
    final colorIndex = learner.learnerId.hashCode % _avatarColors.length;
    final bgColor = _avatarColors[colorIndex];

    return CircleAvatar(
      radius: 28,
      backgroundColor: bgColor,
      child: Text(
        initials,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 18,
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[parts.length - 1][0]}'.toUpperCase();
  }

  static const _avatarColors = [
    Color(0xFF4CAF50), // Green
    Color(0xFF2196F3), // Blue
    Color(0xFFFF9800), // Orange
    Color(0xFF9C27B0), // Purple
    Color(0xFFE91E63), // Pink
    Color(0xFF00BCD4), // Cyan
    Color(0xFFFF5722), // Deep Orange
    Color(0xFF607D8B), // Blue Grey
  ];
}
