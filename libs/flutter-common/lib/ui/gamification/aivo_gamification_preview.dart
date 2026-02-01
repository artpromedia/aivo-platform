/// Aivo Gamification Preview
///
/// Showcase gallery demonstrating all gamification widgets.
/// Used for testing, design review, and documentation.
library;

import 'package:flutter/material.dart';

import 'aivo_achievement_card.dart';
import 'aivo_challenge_card.dart';
import 'aivo_coins_widget.dart';
import 'aivo_gamification_colors.dart';
import 'aivo_hearts_widget.dart';
import 'aivo_progress_widgets.dart';
import 'aivo_streak_widget.dart';

// ══════════════════════════════════════════════════════════════════════════════
// GAMIFICATION PREVIEW PAGE
// ══════════════════════════════════════════════════════════════════════════════

/// Full preview page showing all gamification widgets.
class AivoGamificationPreview extends StatefulWidget {
  const AivoGamificationPreview({super.key});

  @override
  State<AivoGamificationPreview> createState() =>
      _AivoGamificationPreviewState();
}

class _AivoGamificationPreviewState extends State<AivoGamificationPreview> {
  // Demo state
  int _xp = 750;
  int _level = 5;
  int _streak = 7;
  int _hearts = 3;
  int _coins = 1250;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gamification Preview'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _resetState,
            tooltip: 'Reset',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Progress section
          _buildSection(
            title: 'Progress Widgets',
            children: [
              _buildSubsection(
                title: 'XP Progress Bar',
                child: Column(
                  children: [
                    AivoXpProgressBar(
                      currentXp: _xp,
                      maxXp: 1000,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ElevatedButton(
                          onPressed: () => setState(() => _xp = (_xp - 100).clamp(0, 1000)),
                          child: const Text('-100 XP'),
                        ),
                        const SizedBox(width: 16),
                        ElevatedButton(
                          onPressed: () => setState(() => _xp = (_xp + 100).clamp(0, 1000)),
                          child: const Text('+100 XP'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              _buildSubsection(
                title: 'Level Ring',
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    AivoLevelRing(
                      level: _level,
                      progress: _xp / 1000,
                      size: 80,
                    ),
                    AivoLevelRing(
                      level: _level,
                      progress: _xp / 1000,
                      size: 60,
                    ),
                    AivoLevelRing(
                      level: _level,
                      progress: _xp / 1000,
                      size: 48,
                    ),
                  ],
                ),
              ),
              _buildSubsection(
                title: 'Combined Level Progress',
                child: AivoLevelProgress(
                  level: _level,
                  currentXp: _xp,
                  xpForNextLevel: 1000,
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Streak section
          _buildSection(
            title: 'Streak Widgets',
            children: [
              _buildSubsection(
                title: 'Streak Flames',
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: const [
                    AivoStreakFlame(size: 64),
                    AivoStreakFlame(size: 48),
                    AivoStreakFlame(size: 32),
                  ],
                ),
              ),
              _buildSubsection(
                title: 'Streak Counter',
                child: Column(
                  children: [
                    AivoStreakCounter(streakDays: _streak),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ElevatedButton(
                          onPressed: () => setState(() => _streak = (_streak - 1).clamp(0, 100)),
                          child: const Text('-1'),
                        ),
                        const SizedBox(width: 16),
                        ElevatedButton(
                          onPressed: () => setState(() => _streak++),
                          child: const Text('+1'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              _buildSubsection(
                title: 'Streak Card',
                child: AivoStreakCard(
                  currentStreak: _streak,
                  longestStreak: 14,
                  nextMilestone: 10,
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Achievement section
          _buildSection(
            title: 'Achievement Widgets',
            children: [
              _buildSubsection(
                title: 'Achievement Badges',
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: const [
                    AivoAchievementBadge(
                      tier: BadgeTier.bronze,
                      emoji: '🌟',
                      size: 56,
                    ),
                    AivoAchievementBadge(
                      tier: BadgeTier.silver,
                      icon: Icons.school_rounded,
                      size: 56,
                    ),
                    AivoAchievementBadge(
                      tier: BadgeTier.gold,
                      icon: Icons.emoji_events_rounded,
                      size: 56,
                    ),
                    AivoAchievementBadge(
                      tier: BadgeTier.platinum,
                      icon: Icons.diamond_rounded,
                      size: 56,
                    ),
                  ],
                ),
              ),
              _buildSubsection(
                title: 'Locked Badge',
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    AivoAchievementBadge(
                      tier: BadgeTier.gold,
                      isLocked: true,
                      size: 64,
                    ),
                  ],
                ),
              ),
              _buildSubsection(
                title: 'Achievement Card (Unlocked)',
                child: const AivoAchievementCard(
                  title: 'Math Master',
                  description: 'Complete 100 math lessons with 90% accuracy',
                  tier: BadgeTier.gold,
                  icon: Icons.calculate_rounded,
                  xpReward: 500,
                  coinReward: 100,
                  unlockedAt: null,
                ),
              ),
              _buildSubsection(
                title: 'Achievement Card (In Progress)',
                child: const AivoAchievementCard(
                  title: 'Reading Champion',
                  description: 'Read 50 books this semester',
                  tier: BadgeTier.silver,
                  emoji: '📚',
                  xpReward: 300,
                  coinReward: 50,
                  progress: 32,
                  progressTotal: 50,
                ),
              ),
              _buildSubsection(
                title: 'Achievement Card (Locked)',
                child: const AivoAchievementCard(
                  title: 'Expert Explorer',
                  description: 'Unlock all lessons in every subject',
                  tier: BadgeTier.platinum,
                  icon: Icons.explore_rounded,
                  xpReward: 1000,
                  coinReward: 500,
                  isLocked: true,
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Hearts section
          _buildSection(
            title: 'Hearts / Lives',
            children: [
              _buildSubsection(
                title: 'Single Hearts',
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    AivoHeart(isFull: true, size: 40),
                    AivoHeart(isFull: false, size: 40),
                  ],
                ),
              ),
              _buildSubsection(
                title: 'Hearts Row',
                child: Column(
                  children: [
                    AivoHeartsRow(
                      currentHearts: _hearts,
                      maxHearts: 5,
                      heartSize: 32,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ElevatedButton(
                          onPressed: () => setState(() => _hearts = (_hearts - 1).clamp(0, 5)),
                          child: const Text('-1'),
                        ),
                        const SizedBox(width: 16),
                        ElevatedButton(
                          onPressed: () => setState(() => _hearts = (_hearts + 1).clamp(0, 5)),
                          child: const Text('+1'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              _buildSubsection(
                title: 'Hearts Display with Timer',
                child: AivoHeartsDisplay(
                  currentHearts: _hearts,
                  maxHearts: 5,
                  showCount: true,
                  nextRefillTime: _hearts < 5 ? const Duration(minutes: 14, seconds: 32) : null,
                ),
              ),
              _buildSubsection(
                title: 'Compact Hearts',
                child: AivoHeartsDisplay(
                  currentHearts: _hearts,
                  maxHearts: 5,
                  compact: true,
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Coins section
          _buildSection(
            title: 'Coins / Currency',
            children: [
              _buildSubsection(
                title: 'Single Coin',
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    AivoCoin(size: 48),
                    AivoCoin(size: 36),
                    AivoCoin(size: 24),
                  ],
                ),
              ),
              _buildSubsection(
                title: 'Coin Counter',
                child: Column(
                  children: [
                    AivoCoinCounter(count: _coins),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ElevatedButton(
                          onPressed: () => setState(() => _coins = (_coins - 100).clamp(0, 99999)),
                          child: const Text('-100'),
                        ),
                        const SizedBox(width: 16),
                        ElevatedButton(
                          onPressed: () => setState(() => _coins += 100),
                          child: const Text('+100'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              _buildSubsection(
                title: 'Compact Coin Counter',
                child: AivoCoinCounter(count: _coins, compact: true),
              ),
              _buildSubsection(
                title: 'Coin Stack',
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: const [
                    AivoCoinStack(amount: 50),
                    AivoCoinStack(amount: 250),
                    AivoCoinStack(amount: 1000),
                  ],
                ),
              ),
              _buildSubsection(
                title: 'Price Tags',
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    AivoCoinPriceTag(price: 100),
                    AivoCoinPriceTag(price: 75, originalPrice: 100),
                    AivoCoinPriceTag(price: 500, canAfford: false),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Challenge section
          _buildSection(
            title: 'Challenge Widgets',
            children: [
              _buildSubsection(
                title: 'Difficulty Badges',
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    AivoDifficultyBadge(difficulty: Difficulty.easy),
                    AivoDifficultyBadge(difficulty: Difficulty.medium),
                    AivoDifficultyBadge(difficulty: Difficulty.hard),
                    AivoDifficultyBadge(difficulty: Difficulty.expert),
                  ],
                ),
              ),
              _buildSubsection(
                title: 'Challenge Type Badges',
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    AivoChallengeTypeBadge(type: ChallengeType.daily),
                    AivoChallengeTypeBadge(type: ChallengeType.weekly),
                    AivoChallengeTypeBadge(type: ChallengeType.monthly),
                    AivoChallengeTypeBadge(type: ChallengeType.special),
                  ],
                ),
              ),
              _buildSubsection(
                title: 'Reward Preview',
                child: const AivoChallengeRewardPreview(
                  xpReward: 100,
                  coinReward: 50,
                  badgeReward: 'Badge',
                ),
              ),
              _buildSubsection(
                title: 'Challenge Card (In Progress)',
                child: const AivoChallengeCard(
                  title: 'Daily Math Master',
                  description: 'Complete 5 math exercises with 80% accuracy today',
                  difficulty: Difficulty.medium,
                  type: ChallengeType.daily,
                  progress: 3,
                  progressTotal: 5,
                  xpReward: 50,
                  coinReward: 25,
                  timeRemaining: Duration(hours: 5, minutes: 30),
                  icon: Icons.calculate_rounded,
                ),
              ),
              _buildSubsection(
                title: 'Challenge Card (Completed)',
                child: const AivoChallengeCard(
                  title: 'Weekly Reading Goal',
                  description: 'Read 3 chapters this week',
                  difficulty: Difficulty.easy,
                  type: ChallengeType.weekly,
                  xpReward: 100,
                  coinReward: 50,
                  isCompleted: true,
                  icon: Icons.menu_book_rounded,
                ),
              ),
              _buildSubsection(
                title: 'Challenge Card (Locked)',
                child: const AivoChallengeCard(
                  title: 'Expert Challenge',
                  description: 'Complete all expert-level challenges',
                  difficulty: Difficulty.expert,
                  type: ChallengeType.special,
                  xpReward: 500,
                  coinReward: 200,
                  badgeReward: 'Expert',
                  isLocked: true,
                  icon: Icons.workspace_premium_rounded,
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Colors showcase
          _buildSection(
            title: 'Color Palette',
            children: [
              _buildSubsection(
                title: 'XP Colors',
                child: _buildColorRow([
                  ('Primary', AivoGamificationColors.xpPrimary),
                  ('Secondary', AivoGamificationColors.xpSecondary),
                ]),
              ),
              _buildSubsection(
                title: 'Streak Colors',
                child: _buildColorRow([
                  ('Fire', AivoGamificationColors.streakFire),
                  ('Flame', AivoGamificationColors.streakFlame),
                ]),
              ),
              _buildSubsection(
                title: 'Badge Colors',
                child: _buildColorRow([
                  ('Bronze', AivoGamificationColors.badgeBronze),
                  ('Silver', AivoGamificationColors.badgeSilver),
                  ('Gold', AivoGamificationColors.badgeGold),
                  ('Platinum', AivoGamificationColors.badgePlatinum),
                ]),
              ),
              _buildSubsection(
                title: 'Heart & Coin Colors',
                child: _buildColorRow([
                  ('Heart Full', AivoGamificationColors.heartFull),
                  ('Heart Empty', AivoGamificationColors.heartEmpty),
                  ('Coin Gold', AivoGamificationColors.coinGold),
                  ('Coin Shadow', AivoGamificationColors.coinShadow),
                ]),
              ),
              _buildSubsection(
                title: 'Difficulty Colors',
                child: _buildColorRow([
                  ('Easy', AivoGamificationColors.difficultyEasy),
                  ('Medium', AivoGamificationColors.difficultyMedium),
                  ('Hard', AivoGamificationColors.difficultyHard),
                  ('Expert', AivoGamificationColors.difficultyExpert),
                ]),
              ),
            ],
          ),

          const SizedBox(height: 48),
        ],
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required List<Widget> children,
  }) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        ...children,
      ],
    );
  }

  Widget _buildSubsection({
    required String title,
    required Widget child,
  }) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerLowest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: theme.colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            child: child,
          ),
        ],
      ),
    );
  }

  Widget _buildColorRow(List<(String, Color)> colors) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: colors.map((colorData) {
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: colorData.$2,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.2),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              colorData.$1,
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ],
        );
      }).toList(),
    );
  }

  void _resetState() {
    setState(() {
      _xp = 750;
      _level = 5;
      _streak = 7;
      _hearts = 3;
      _coins = 1250;
    });
  }
}
