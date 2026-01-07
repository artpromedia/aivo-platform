/// Lesson Player Provider
///
/// State management for the lesson player screen.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

// ============================================================================
// State Classes
// ============================================================================

/// Base state for the lesson player.
sealed class LessonPlayerState {
  const LessonPlayerState();
}

/// Loading state.
class LessonPlayerLoading extends LessonPlayerState {
  const LessonPlayerLoading();
}

/// Error state.
class LessonPlayerError extends LessonPlayerState {
  const LessonPlayerError(this.message);
  final String message;
}

/// Loaded state with lesson data.
class LessonPlayerLoaded extends LessonPlayerState {
  const LessonPlayerLoaded({
    required this.lesson,
    required this.blocks,
    this.currentBlockIndex = 0,
    this.sessionXP = 0,
    this.elapsedSeconds = 0,
  });

  final LessonData lesson;
  final List<LessonBlock> blocks;
  final int currentBlockIndex;
  final int sessionXP;
  final int elapsedSeconds;

  LessonPlayerLoaded copyWith({
    LessonData? lesson,
    List<LessonBlock>? blocks,
    int? currentBlockIndex,
    int? sessionXP,
    int? elapsedSeconds,
  }) {
    return LessonPlayerLoaded(
      lesson: lesson ?? this.lesson,
      blocks: blocks ?? this.blocks,
      currentBlockIndex: currentBlockIndex ?? this.currentBlockIndex,
      sessionXP: sessionXP ?? this.sessionXP,
      elapsedSeconds: elapsedSeconds ?? this.elapsedSeconds,
    );
  }
}

// ============================================================================
// Data Models
// ============================================================================

/// Lesson data.
class LessonData {
  const LessonData({
    required this.id,
    required this.title,
    required this.subject,
    this.description,
  });

  final String id;
  final String title;
  final String subject;
  final String? description;
}

/// Lesson block representing one step in the lesson.
class LessonBlock {
  const LessonBlock({
    required this.id,
    required this.type,
    required this.content,
    this.isComplete = false,
    this.requiresCompletion = true,
  });

  final String id;
  final LessonBlockType type;
  final Map<String, dynamic> content;
  final bool isComplete;
  final bool requiresCompletion;

  LessonBlock copyWith({
    bool? isComplete,
  }) {
    return LessonBlock(
      id: id,
      type: type,
      content: content,
      isComplete: isComplete ?? this.isComplete,
      requiresCompletion: requiresCompletion,
    );
  }
}

/// Types of lesson blocks.
enum LessonBlockType {
  instruction,
  video,
  question,
  exercise,
  reflection,
  summary,
}

/// Rewards from completing a lesson.
class LessonRewards {
  const LessonRewards({
    required this.xpEarned,
    this.streakDay,
    this.newAchievements = const [],
  });

  final int xpEarned;
  final int? streakDay;
  final List<String> newAchievements;
}

// ============================================================================
// Notifier
// ============================================================================

/// Lesson player notifier.
class LessonPlayerNotifier extends StateNotifier<LessonPlayerState> {
  LessonPlayerNotifier(this.sessionId) : super(const LessonPlayerLoading());

  final String sessionId;

  /// Load the lesson data.
  Future<void> loadLesson() async {
    state = const LessonPlayerLoading();

    try {
      // Mock implementation - would fetch from API
      await Future.delayed(const Duration(milliseconds: 500));

      state = LessonPlayerLoaded(
        lesson: LessonData(
          id: sessionId,
          title: 'Math Practice',
          subject: 'Mathematics',
        ),
        blocks: [
          const LessonBlock(
            id: 'block-1',
            type: LessonBlockType.instruction,
            content: {'text': 'Welcome to today\'s lesson!'},
            requiresCompletion: false,
          ),
          const LessonBlock(
            id: 'block-2',
            type: LessonBlockType.question,
            content: {'question': 'What is 2 + 2?', 'answer': '4'},
          ),
          const LessonBlock(
            id: 'block-3',
            type: LessonBlockType.exercise,
            content: {'type': 'practice'},
          ),
          const LessonBlock(
            id: 'block-4',
            type: LessonBlockType.summary,
            content: {'text': 'Great work today!'},
            requiresCompletion: false,
          ),
        ],
      );
    } catch (e) {
      state = LessonPlayerError(e.toString());
    }
  }

  /// Update progress.
  void updateProgress(int blockIndex) {
    final current = state;
    if (current is LessonPlayerLoaded) {
      state = current.copyWith(currentBlockIndex: blockIndex);
    }
  }

  /// Add XP to session.
  void addXP(int xp) {
    final current = state;
    if (current is LessonPlayerLoaded) {
      state = current.copyWith(sessionXP: current.sessionXP + xp);
    }
  }

  /// Complete the lesson.
  Future<LessonRewards> completeLesson() async {
    // Mock implementation
    await Future.delayed(const Duration(milliseconds: 300));

    final current = state;
    final xp = current is LessonPlayerLoaded ? current.sessionXP : 0;

    return LessonRewards(
      xpEarned: xp + 50, // Bonus for completion
      streakDay: 5,
      newAchievements: xp >= 100 ? ['First 100 XP!'] : [],
    );
  }
}

// ============================================================================
// Provider
// ============================================================================

/// Lesson player provider.
final lessonPlayerProvider = StateNotifierProvider.family<
    LessonPlayerNotifier, LessonPlayerState, String>((ref, sessionId) {
  return LessonPlayerNotifier(sessionId);
});
