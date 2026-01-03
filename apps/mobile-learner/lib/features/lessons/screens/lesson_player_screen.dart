import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:audioplayers/audioplayers.dart';

import '../providers/lesson_player_provider.dart';
import '../widgets/lesson_progress_bar.dart';
import '../widgets/xp_animation.dart';
import '../widgets/streak_celebration.dart';
import '../widgets/lesson_block_widget.dart';
import '../../../core/services/analytics_service.dart';
import '../../../theme/learner_theme.dart';

/// Lesson Player Screen
///
/// Immersive lesson experience with:
/// - Smooth block transitions
/// - Haptic feedback
/// - XP and streak animations
/// - Confetti celebrations
/// - Sound effects
/// - Accessibility support
class LessonPlayerScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const LessonPlayerScreen({
    super.key,
    required this.sessionId,
  });

  @override
  ConsumerState<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends ConsumerState<LessonPlayerScreen>
    with TickerProviderStateMixin {
  late final PageController _pageController;
  late final AnimationController _xpAnimationController;
  late final AnimationController _progressAnimationController;
  late final AnimationController _celebrationController;

  final AudioPlayer _audioPlayer = AudioPlayer();

  bool _isTransitioning = false;
  int _currentBlockIndex = 0;
  int _pendingXp = 0;
  bool _showCelebration = false;

  @override
  void initState() {
    super.initState();

    _pageController = PageController();

    _xpAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _progressAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );

    _celebrationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );

    // Lock to portrait for lesson player
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
    ]);

    // Load lesson data
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(lessonPlayerProvider(widget.sessionId).notifier).loadLesson();
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _xpAnimationController.dispose();
    _progressAnimationController.dispose();
    _celebrationController.dispose();
    _audioPlayer.dispose();

    // Restore orientations
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);

    super.dispose();
  }

  Future<void> _goToNextBlock() async {
    if (_isTransitioning) return;

    final lessonState = ref.read(lessonPlayerProvider(widget.sessionId));

    if (lessonState is! LessonPlayerLoaded) return;

    if (_currentBlockIndex >= lessonState.blocks.length - 1) {
      // Lesson complete
      await _handleLessonComplete(lessonState);
      return;
    }

    setState(() => _isTransitioning = true);

    // Haptic feedback
    await _triggerHaptic(HapticType.light);

    // Animate to next block
    await _pageController.nextPage(
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOutCubic,
    );

    setState(() {
      _currentBlockIndex++;
      _isTransitioning = false;
    });

    // Update progress
    ref
        .read(lessonPlayerProvider(widget.sessionId).notifier)
        .updateProgress(_currentBlockIndex);

    // Progress animation
    _progressAnimationController.forward(from: 0);
  }

  Future<void> _goToPreviousBlock() async {
    if (_isTransitioning || _currentBlockIndex == 0) return;

    setState(() => _isTransitioning = true);

    await _triggerHaptic(HapticType.light);

    await _pageController.previousPage(
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOutCubic,
    );

    setState(() {
      _currentBlockIndex--;
      _isTransitioning = false;
    });
  }

  Future<void> _handleLessonComplete(LessonPlayerLoaded lessonState) async {
    // Play completion sound
    try {
      await _audioPlayer.play(AssetSource('sounds/lesson_complete.mp3'));
    } catch (_) {
      // Audio may not be available
    }

    // Strong haptic feedback
    await _triggerHaptic(HapticType.heavy);

    // Show celebration
    setState(() => _showCelebration = true);
    _celebrationController.forward();

    // Calculate rewards
    final rewards = await ref
        .read(lessonPlayerProvider(widget.sessionId).notifier)
        .completeLesson();

    // Track analytics
    final analytics = ref.read(analyticsServiceProvider);
    await analytics.logLessonCompleted(
      lessonId: lessonState.lesson.id,
      subject: lessonState.lesson.subject,
      durationSeconds: lessonState.elapsedSeconds,
      xpEarned: rewards.xpEarned,
    );

    // Show completion dialog
    if (mounted) {
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        isDismissible: false,
        builder: (context) => LessonCompleteSheet(
          lessonTitle: lessonState.lesson.title,
          xpEarned: rewards.xpEarned,
          streakDay: rewards.streakDay,
          achievements: rewards.newAchievements,
          onContinue: () {
            Navigator.of(context).pop();
            Navigator.of(context).pop(); // Return to previous screen
          },
        ),
      );
    }
  }

  Future<void> _handleBlockComplete({
    required int xpEarned,
    required bool isCorrect,
  }) async {
    if (isCorrect) {
      // Play success sound
      try {
        await _audioPlayer.play(AssetSource('sounds/correct.mp3'));
      } catch (_) {}
      await _triggerHaptic(HapticType.success);

      // Animate XP gain
      if (xpEarned > 0) {
        setState(() => _pendingXp = xpEarned);
        _xpAnimationController.forward(from: 0);

        ref
            .read(lessonPlayerProvider(widget.sessionId).notifier)
            .addXP(xpEarned);
      }
    } else {
      // Play error sound
      try {
        await _audioPlayer.play(AssetSource('sounds/incorrect.mp3'));
      } catch (_) {}
      await _triggerHaptic(HapticType.error);
    }
  }

  Future<void> _triggerHaptic(HapticType type) async {
    switch (type) {
      case HapticType.light:
        HapticFeedback.lightImpact();
        break;
      case HapticType.medium:
        HapticFeedback.mediumImpact();
        break;
      case HapticType.heavy:
        HapticFeedback.heavyImpact();
        break;
      case HapticType.success:
        HapticFeedback.mediumImpact();
        await Future.delayed(const Duration(milliseconds: 100));
        HapticFeedback.lightImpact();
        break;
      case HapticType.error:
        HapticFeedback.heavyImpact();
        await Future.delayed(const Duration(milliseconds: 50));
        HapticFeedback.mediumImpact();
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final lessonState = ref.watch(lessonPlayerProvider(widget.sessionId));

    return Scaffold(
      body: Stack(
        children: [
          // Main content
          SafeArea(
            child: Column(
              children: [
                // Header with progress
                _buildHeader(theme, lessonState),

                // Lesson content
                Expanded(
                  child: _buildContent(lessonState),
                ),

                // Navigation
                _buildNavigation(theme, lessonState),
              ],
            ),
          ),

          // Celebration overlay
          if (_showCelebration)
            Positioned.fill(
              child: StreakCelebration(
                controller: _celebrationController,
                onComplete: () => setState(() => _showCelebration = false),
              ),
            ),

          // XP animation overlay
          if (lessonState is LessonPlayerLoaded && _pendingXp > 0)
            Positioned(
              top: MediaQuery.of(context).padding.top + 60,
              right: 16,
              child: XPAnimation(
                controller: _xpAnimationController,
                xpAmount: _pendingXp,
                onComplete: () => setState(() => _pendingXp = 0),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHeader(ThemeData theme, LessonPlayerState lessonState) {
    return Semantics(
      label: 'Lesson progress header',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            // Close button
            Semantics(
              button: true,
              label: 'Exit lesson',
              child: GestureDetector(
                onTap: () => _showExitConfirmation(),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.close,
                    color: theme.colorScheme.onSurfaceVariant,
                    size: 20,
                  ),
                ),
              ),
            ),

            const SizedBox(width: 16),

            // Progress bar
            Expanded(
              child: lessonState is LessonPlayerLoaded
                  ? LessonProgressBar(
                      currentBlock: _currentBlockIndex,
                      totalBlocks: lessonState.blocks.length,
                    )
                  : const SizedBox.shrink(),
            ),

            const SizedBox(width: 16),

            // XP display
            if (lessonState is LessonPlayerLoaded)
              Semantics(
                label: '${lessonState.sessionXP} experience points earned',
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.stars_rounded,
                        size: 16,
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${lessonState.sessionXP}',
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: theme.colorScheme.onPrimaryContainer,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(LessonPlayerState lessonState) {
    switch (lessonState) {
      case LessonPlayerLoading():
        return const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading lesson...'),
            ],
          ),
        );

      case LessonPlayerError():
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.error_outline,
                  size: 64,
                  color: Theme.of(context).colorScheme.error,
                ),
                const SizedBox(height: 16),
                Text(
                  'Something went wrong',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  lessonState.message,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    ref
                        .read(lessonPlayerProvider(widget.sessionId).notifier)
                        .loadLesson();
                  },
                  child: const Text('Try Again'),
                ),
              ],
            ),
          ),
        );

      case LessonPlayerLoaded():
        return GestureDetector(
          // Swipe gestures
          onHorizontalDragEnd: (details) {
            if (details.primaryVelocity == null) return;

            if (details.primaryVelocity! < -300) {
              _goToNextBlock();
            } else if (details.primaryVelocity! > 300) {
              _goToPreviousBlock();
            }
          },
          child: PageView.builder(
            controller: _pageController,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: lessonState.blocks.length,
            itemBuilder: (context, index) {
              final block = lessonState.blocks[index];

              return AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: LessonBlockWidget(
                  key: ValueKey(block.id),
                  block: block,
                  isActive: index == _currentBlockIndex,
                  onComplete: (result) {
                    _handleBlockComplete(
                      xpEarned: result.xpEarned,
                      isCorrect: result.isCorrect,
                    );
                    if (result.shouldAdvance) {
                      _goToNextBlock();
                    }
                  },
                ),
              );
            },
          ),
        );

      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildNavigation(ThemeData theme, LessonPlayerState lessonState) {
    if (lessonState is! LessonPlayerLoaded) {
      return const SizedBox.shrink();
    }

    final isLastBlock = _currentBlockIndex >= lessonState.blocks.length - 1;
    final currentBlock = lessonState.blocks[_currentBlockIndex];
    final canAdvance =
        currentBlock.isComplete || !currentBlock.requiresCompletion;

    return Semantics(
      label: 'Lesson navigation',
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              // Previous button
              if (_currentBlockIndex > 0)
                Semantics(
                  button: true,
                  label: 'Go to previous',
                  child: GestureDetector(
                    onTap: _goToPreviousBlock,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: theme.colorScheme.outline,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.arrow_back_rounded,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                  ),
                )
              else
                const SizedBox(width: 48),

              const SizedBox(width: 16),

              // Continue button
              Expanded(
                child: Semantics(
                  button: true,
                  label: isLastBlock ? 'Complete lesson' : 'Continue to next',
                  enabled: canAdvance,
                  child: GestureDetector(
                    onTap: canAdvance ? _goToNextBlock : null,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: canAdvance
                            ? theme.colorScheme.primary
                            : theme.colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          isLastBlock ? 'Complete' : 'Continue',
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: canAdvance
                                ? theme.colorScheme.onPrimary
                                : theme.colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showExitConfirmation() async {
    await _triggerHaptic(HapticType.light);

    final shouldExit = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Exit lesson?'),
        content: const Text(
          'Your progress in this session will not be saved.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Exit'),
          ),
        ],
      ),
    );

    if (shouldExit == true && mounted) {
      // Track abandonment
      final lessonState = ref.read(lessonPlayerProvider(widget.sessionId));
      if (lessonState is LessonPlayerLoaded) {
        final analytics = ref.read(analyticsServiceProvider);
        await analytics.logLessonAbandoned(
          lessonId: lessonState.lesson.id,
          progressPercent:
              ((_currentBlockIndex / lessonState.blocks.length) * 100).round(),
          durationSeconds: lessonState.elapsedSeconds,
          reason: 'user_exit',
        );
      }

      Navigator.of(context).pop();
    }
  }
}

/// Lesson complete bottom sheet
class LessonCompleteSheet extends StatelessWidget {
  final String lessonTitle;
  final int xpEarned;
  final int? streakDay;
  final List<String> achievements;
  final VoidCallback onContinue;

  const LessonCompleteSheet({
    super.key,
    required this.lessonTitle,
    required this.xpEarned,
    this.streakDay,
    this.achievements = const [],
    required this.onContinue,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gamification =
        theme.extension<LearnerGamificationExtension>();

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(24),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.outline,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            const SizedBox(height: 24),

            // Celebration icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: gamification?.xpGradient,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.celebration_rounded,
                size: 40,
                color: Colors.white,
              ),
            ),

            const SizedBox(height: 24),

            // Title
            Text(
              'Lesson Complete!',
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 8),

            Text(
              lessonTitle,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 32),

            // Stats row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                // XP earned
                _StatItem(
                  icon: Icons.stars_rounded,
                  value: '+$xpEarned',
                  label: 'XP Earned',
                  color: gamification?.coinGold ?? Colors.amber,
                ),

                // Streak
                if (streakDay != null)
                  _StatItem(
                    icon: Icons.local_fire_department_rounded,
                    value: '$streakDay',
                    label: 'Day Streak',
                    color: gamification?.heartFull ?? Colors.orange,
                  ),
              ],
            ),

            // Achievements
            if (achievements.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Divider(),
              const SizedBox(height: 16),
              Text(
                'New Achievements',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: achievements.map((achievement) {
                  return Chip(
                    avatar: const Icon(Icons.emoji_events, size: 18),
                    label: Text(achievement),
                    backgroundColor: theme.colorScheme.primaryContainer,
                  );
                }).toList(),
              ),
            ],

            const SizedBox(height: 32),

            // Continue button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onContinue,
                child: const Text('Continue'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  const _StatItem({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 28),
        ),
        const SizedBox(height: 8),
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

/// Haptic feedback types
enum HapticType { light, medium, heavy, success, error }
