/// Story Recommendation Widget - ND-1.2
///
/// Displays story recommendations with context-aware suggestions.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'social_story_models.dart';
import 'social_story_service.dart';
import 'social_story_viewer.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// STORY RECOMMENDATION CARD
// ═══════════════════════════════════════════════════════════════════════════════

/// Card widget displaying a single story recommendation
class StoryRecommendationCard extends StatelessWidget {
  const StoryRecommendationCard({
    super.key,
    required this.recommendation,
    required this.onTap,
    this.compact = false,
  });

  final StoryRecommendation recommendation;
  final VoidCallback onTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final story = recommendation.story;
    final theme = Theme.of(context);

    if (compact) {
      return Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Category icon
                _CategoryIcon(category: story.category, size: 40),
                const SizedBox(width: 12),
                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        story.title,
                        style: theme.textTheme.titleSmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      _ReasonChip(reason: recommendation.reason),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right),
              ],
            ),
          ),
        ),
      );
    }

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with category
            Container(
              padding: const EdgeInsets.all(16),
              color: _getCategoryColor(story.category).withOpacity(0.1),
              child: Row(
                children: [
                  _CategoryIcon(category: story.category),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      story.title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            // Description
            if (story.description != null)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  story.description!,
                  style: theme.textTheme.bodyMedium,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            // Footer
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Row(
                children: [
                  _ReasonChip(reason: recommendation.reason),
                  const Spacer(),
                  Text(
                    '${story.pageCount} pages · ~${story.estimatedDuration ~/ 60} min',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.grey,
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

  Color _getCategoryColor(SocialStoryCategory category) {
    switch (category) {
      case SocialStoryCategory.startingLesson:
      case SocialStoryCategory.endingLesson:
      case SocialStoryCategory.changingActivity:
        return Colors.blue;
      case SocialStoryCategory.takingQuiz:
      case SocialStoryCategory.testTaking:
        return Colors.purple;
      case SocialStoryCategory.feelingFrustrated:
      case SocialStoryCategory.feelingOverwhelmed:
      case SocialStoryCategory.feelingAnxious:
      case SocialStoryCategory.calmingDown:
        return Colors.orange;
      case SocialStoryCategory.askingForHelp:
      case SocialStoryCategory.askingForBreak:
        return Colors.green;
      default:
        return Colors.grey;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY ICON
// ═══════════════════════════════════════════════════════════════════════════════

class _CategoryIcon extends StatelessWidget {
  const _CategoryIcon({
    required this.category,
    this.size = 48,
  });

  final SocialStoryCategory category;
  final double size;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = _getIconAndColor();

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(size / 4),
      ),
      child: Icon(icon, color: color, size: size * 0.5),
    );
  }

  (IconData, Color) _getIconAndColor() {
    switch (category) {
      case SocialStoryCategory.startingLesson:
        return (Icons.play_circle, Colors.blue);
      case SocialStoryCategory.endingLesson:
        return (Icons.stop_circle, Colors.blue);
      case SocialStoryCategory.changingActivity:
      case SocialStoryCategory.unexpectedChange:
        return (Icons.swap_horiz, Colors.indigo);
      case SocialStoryCategory.takingQuiz:
      case SocialStoryCategory.testTaking:
        return (Icons.quiz, Colors.purple);
      case SocialStoryCategory.receivingFeedback:
        return (Icons.feedback, Colors.purple);
      case SocialStoryCategory.askingForHelp:
        return (Icons.help, Colors.green);
      case SocialStoryCategory.askingForBreak:
        return (Icons.pause_circle, Colors.teal);
      case SocialStoryCategory.raisingHand:
        return (Icons.pan_tool, Colors.green);
      case SocialStoryCategory.talkingToTeacher:
        return (Icons.record_voice_over, Colors.green);
      case SocialStoryCategory.feelingFrustrated:
        return (Icons.sentiment_dissatisfied, Colors.orange);
      case SocialStoryCategory.feelingOverwhelmed:
        return (Icons.whatshot, Colors.deepOrange);
      case SocialStoryCategory.feelingAnxious:
        return (Icons.sentiment_neutral, Colors.amber);
      case SocialStoryCategory.calmingDown:
        return (Icons.self_improvement, Colors.cyan);
      case SocialStoryCategory.celebratingSuccess:
        return (Icons.celebration, Colors.pink);
      case SocialStoryCategory.stayingOnTask:
        return (Icons.center_focus_strong, Colors.blue);
      case SocialStoryCategory.ignoringDistractions:
        return (Icons.visibility_off, Colors.blueGrey);
      case SocialStoryCategory.waitingTurn:
        return (Icons.hourglass_empty, Colors.brown);
      case SocialStoryCategory.usingDevice:
        return (Icons.tablet, Colors.grey);
      case SocialStoryCategory.technicalProblem:
        return (Icons.build, Colors.grey);
      case SocialStoryCategory.workingWithPeers:
        return (Icons.groups, Colors.teal);
      case SocialStoryCategory.sharingMaterials:
        return (Icons.share, Colors.teal);
      case SocialStoryCategory.respectfulDisagreement:
        return (Icons.handshake, Colors.teal);
      case SocialStoryCategory.sensoryBreak:
        return (Icons.spa, Colors.lightGreen);
      case SocialStoryCategory.movementBreak:
        return (Icons.directions_run, Colors.lightGreen);
      case SocialStoryCategory.quietSpace:
        return (Icons.volume_off, Colors.lightGreen);
      case SocialStoryCategory.fireDrill:
      case SocialStoryCategory.lockdown:
      case SocialStoryCategory.feelingUnsafe:
        return (Icons.warning, Colors.red);
      default:
        return (Icons.auto_stories, Colors.grey);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REASON CHIP
// ═══════════════════════════════════════════════════════════════════════════════

class _ReasonChip extends StatelessWidget {
  const _ReasonChip({required this.reason});

  final RecommendationReason reason;

  @override
  Widget build(BuildContext context) {
    final (label, color, icon) = _getReasonConfig();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  (String, Color, IconData) _getReasonConfig() {
    switch (reason) {
      case RecommendationReason.transitionSupport:
        return ('For your next activity', Colors.blue, Icons.swap_horiz);
      case RecommendationReason.emotionalSupport:
        return ('Might help right now', Colors.orange, Icons.favorite);
      case RecommendationReason.scheduled:
        return ('Scheduled', Colors.purple, Icons.schedule);
      case RecommendationReason.teacherAssigned:
        return ('From your teacher', Colors.green, Icons.person);
      case RecommendationReason.frequentlyHelpful:
        return ('Helped before', Colors.teal, Icons.thumb_up);
      case RecommendationReason.similarSituation:
        return ('Similar to before', Colors.indigo, Icons.history);
      case RecommendationReason.newScenario:
        return ('New for you', Colors.pink, Icons.new_releases);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORY RECOMMENDATIONS LIST
// ═══════════════════════════════════════════════════════════════════════════════

/// Widget that displays a list of story recommendations
class StoryRecommendationsList extends ConsumerWidget {
  const StoryRecommendationsList({
    super.key,
    required this.learnerId,
    this.currentActivityType,
    this.nextActivityType,
    this.detectedEmotionalState,
    this.onStorySelected,
    this.compact = false,
    this.maxItems = 5,
  });

  final String learnerId;
  final String? currentActivityType;
  final String? nextActivityType;
  final String? detectedEmotionalState;
  final void Function(SocialStory story)? onStorySelected;
  final bool compact;
  final int maxItems;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = StoryRecommendationQuery(
      learnerId: learnerId,
      currentActivityType: currentActivityType,
      nextActivityType: nextActivityType,
      detectedEmotionalState: detectedEmotionalState,
      maxResults: maxItems,
    );

    final recommendationsAsync = ref.watch(storyRecommendationsProvider(query));

    return recommendationsAsync.when(
      data: (recommendations) {
        if (recommendations.isEmpty) {
          return const SizedBox.shrink();
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                'Stories for You',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ),
            if (compact)
              ...recommendations.map((rec) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: StoryRecommendationCard(
                      recommendation: rec,
                      compact: true,
                      onTap: () => onStorySelected?.call(rec.story),
                    ),
                  ))
            else
              SizedBox(
                height: 200,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: recommendations.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final rec = recommendations[index];
                    return SizedBox(
                      width: 280,
                      child: StoryRecommendationCard(
                        recommendation: rec,
                        onTap: () => onStorySelected?.call(rec.story),
                      ),
                    );
                  },
                ),
              ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => const SizedBox.shrink(),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORY LAUNCHER
// ═══════════════════════════════════════════════════════════════════════════════

/// Helper widget to launch the story viewer
class StoryLauncher {
  /// Launch a story in the full-screen viewer
  static Future<void> launchStory(
    BuildContext context, {
    required SocialStory story,
    required String learnerId,
    LearnerStoryPreferences? preferences,
    StoryTriggerType triggerType = StoryTriggerType.manual,
    Map<String, dynamic> triggerContext = const {},
    String? sessionId,
    VoidCallback? onComplete,
  }) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (context) => SocialStoryViewer(
          story: story,
          learnerId: learnerId,
          preferences: preferences,
          triggerType: triggerType,
          triggerContext: triggerContext,
          sessionId: sessionId,
          onComplete: onComplete,
          onClose: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }
}
