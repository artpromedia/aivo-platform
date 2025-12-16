import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../engagement/models.dart';
import '../widgets/engagement_widgets.dart';

/// Session complete celebration screen with XP, streaks, and badges
class SessionCompleteScreen extends ConsumerStatefulWidget {
  const SessionCompleteScreen({
    super.key,
    this.xpAwarded,
    this.leveledUp = false,
    this.newLevel,
    this.previousLevel,
    this.streakDays,
    this.streakUpdated = false,
    this.awardedBadges = const [],
    this.muteCelebrations = false,
    this.reducedVisuals = false,
  });

  final int? xpAwarded;
  final bool leveledUp;
  final int? newLevel;
  final int? previousLevel;
  final int? streakDays;
  final bool streakUpdated;
  final List<BadgeAward> awardedBadges;
  final bool muteCelebrations;
  final bool reducedVisuals;

  @override
  ConsumerState<SessionCompleteScreen> createState() => _SessionCompleteScreenState();
}

class _SessionCompleteScreenState extends ConsumerState<SessionCompleteScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: widget.reducedVisuals
          ? const Duration(milliseconds: 200)
          : const Duration(milliseconds: 800),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.elasticOut),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeIn),
    );

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = LocalStrings.en;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: Text(strings.sessionComplete),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 24),
              // Main celebration
              _buildCelebration(context),
              const SizedBox(height: 32),

              // XP awarded
              if (widget.xpAwarded != null && widget.xpAwarded! > 0)
                _buildXpSection(context),

              // Level up
              if (widget.leveledUp && widget.newLevel != null)
                _buildLevelUpSection(context),

              // Streak
              if (widget.streakDays != null && widget.streakDays! > 0)
                _buildStreakSection(context),

              // New badges
              if (widget.awardedBadges.isNotEmpty) _buildBadgesSection(context),

              const SizedBox(height: 32),

              // Actions
              _buildActions(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCelebration(BuildContext context) {
    final theme = Theme.of(context);

    return AnimatedBuilder(
      animation: _animationController,
      builder: (context, child) {
        return Transform.scale(
          scale: widget.reducedVisuals ? 1.0 : _scaleAnimation.value,
          child: Opacity(
            opacity: _fadeAnimation.value,
            child: Column(
              children: [
                Icon(
                  widget.leveledUp ? Icons.celebration : Icons.check_circle,
                  size: 80,
                  color: widget.leveledUp ? Colors.amber : Colors.green,
                ),
                const SizedBox(height: 16),
                Text(
                  widget.leveledUp ? 'Level Up! 🎉' : 'Great Job!',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _getCelebrationMessage(),
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _getCelebrationMessage() {
    if (widget.leveledUp) {
      return 'You reached Level ${widget.newLevel}!';
    }
    if (widget.streakUpdated && widget.streakDays != null) {
      return 'You\'re on a ${widget.streakDays}-day streak!';
    }
    return 'You finished your session.';
  }

  Widget _buildXpSection(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.star,
              color: Colors.amber,
              size: 28,
            ),
            const SizedBox(width: 8),
            Text(
              '+${widget.xpAwarded} XP',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLevelUpSection(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Colors.amber.withValues(alpha: 0.3),
              Colors.orange.withValues(alpha: 0.3),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.amber),
        ),
        child: Column(
          children: [
            const Text('🎊', style: TextStyle(fontSize: 32)),
            const SizedBox(height: 8),
            Text(
              'Level ${widget.previousLevel} → Level ${widget.newLevel}',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStreakSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: StreakIndicator(
        streakDays: widget.streakDays!,
        showFlame: true,
        compact: false,
      ),
    );
  }

  Widget _buildBadgesSection(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        children: [
          Text(
            'New Badge${widget.awardedBadges.length > 1 ? 's' : ''} Earned!',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: widget.awardedBadges.map((badge) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('🏆', style: TextStyle(fontSize: 20)),
                    const SizedBox(width: 8),
                    Text(
                      badge.name,
                      style: theme.textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildActions(BuildContext context) {
    return Column(
      children: [
        FilledButton.icon(
          onPressed: () => context.go('/today'),
          icon: const Icon(Icons.home),
          label: const Text('Back to Today'),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => context.go('/badges'),
          child: const Text('View All Badges'),
        ),
      ],
    );
  }
}
