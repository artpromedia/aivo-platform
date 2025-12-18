/// Social Stories Widget Tests - ND-1.2
///
/// Tests for social story models, services, and widgets.

import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_learner/social_stories/social_story_models.dart';

void main() {
  group('SocialStoryModels', () {
    group('SocialStory', () {
      test('creates story from JSON', () {
        final json = {
          'id': 'story-123',
          'tenantId': 'tenant-456',
          'slug': 'starting-my-lesson',
          'title': 'Starting My Lesson',
          'description': 'A story about starting lessons',
          'category': 'STARTING_LESSON',
          'readingLevel': 'DEVELOPING',
          'defaultVisualStyle': 'CARTOON',
          'isBuiltIn': true,
          'isApproved': true,
          'supportsPersonalization': true,
          'estimatedDuration': 180,
          'pages': [
            {
              'id': 'page-1',
              'pageNumber': 1,
              'sentences': [
                {
                  'id': 'sent-1',
                  'text': 'I am about to start my lesson.',
                  'type': 'DESCRIPTIVE',
                  'emphasisWords': ['lesson'],
                }
              ],
            }
          ],
          'createdAt': '2024-01-01T00:00:00Z',
          'updatedAt': '2024-01-01T00:00:00Z',
        };

        final story = SocialStory.fromJson(json);

        expect(story.id, 'story-123');
        expect(story.slug, 'starting-my-lesson');
        expect(story.title, 'Starting My Lesson');
        expect(story.category, SocialStoryCategory.startingLesson);
        expect(story.readingLevel, SocialStoryReadingLevel.developing);
        expect(story.isBuiltIn, true);
        expect(story.pageCount, 1);
        expect(story.pages.length, 1);
      });

      test('has correct default values', () {
        final json = {
          'id': 'story-123',
          'slug': 'test-story',
          'title': 'Test Story',
          'category': 'CALMING_DOWN',
          'readingLevel': 'DEVELOPING',
          'defaultVisualStyle': 'CARTOON',
          'isBuiltIn': false,
          'isApproved': true,
          'supportsPersonalization': true,
          'estimatedDuration': 120,
          'pages': [],
          'createdAt': '2024-01-01T00:00:00Z',
          'updatedAt': '2024-01-01T00:00:00Z',
        };

        final story = SocialStory.fromJson(json);

        expect(story.id, 'story-123');
        expect(story.slug, 'test-story');
        expect(story.category, SocialStoryCategory.calmingDown);
        expect(story.readingLevel, SocialStoryReadingLevel.developing);
      });
    });

    group('StoryPage', () {
      test('creates page from JSON', () {
        final json = {
          'id': 'page-1',
          'pageNumber': 1,
          'sentences': [
            {
              'id': 'sent-1',
              'text': 'Hello!',
              'type': 'DESCRIPTIVE',
            }
          ],
          'visual': {
            'id': 'visual-1',
            'type': 'image',
            'url': 'https://example.com/image.png',
            'altText': 'Test image',
            'style': 'CARTOON',
            'position': 'center',
          },
        };

        final page = StoryPage.fromJson(json);

        expect(page.pageNumber, 1);
        expect(page.sentences.length, 1);
        expect(page.visual, isNotNull);
        expect(page.visual!.url, 'https://example.com/image.png');
      });

      test('handles page without optional fields', () {
        final json = {
          'id': 'page-2',
          'pageNumber': 2,
          'sentences': [],
        };

        final page = StoryPage.fromJson(json);

        expect(page.pageNumber, 2);
        expect(page.visual, isNull);
        expect(page.audioNarration, isNull);
      });
    });

    group('StorySentence', () {
      test('creates sentence from JSON', () {
        final json = {
          'id': 'sent-123',
          'text': 'I can stay calm.',
          'type': 'DIRECTIVE',
          'emphasisWords': ['stay', 'calm'],
          'personalizationTokens': ['learnerName'],
        };

        final sentence = StorySentence.fromJson(json);

        expect(sentence.id, 'sent-123');
        expect(sentence.text, 'I can stay calm.');
        expect(sentence.type, SentenceType.directive);
        expect(sentence.emphasisWords, ['stay', 'calm']);
        expect(sentence.personalizationTokens, ['learnerName']);
      });

      test('parses all sentence types correctly', () {
        final types = {
          'DESCRIPTIVE': SentenceType.descriptive,
          'PERSPECTIVE': SentenceType.perspective,
          'DIRECTIVE': SentenceType.directive,
          'AFFIRMATIVE': SentenceType.affirmative,
          'COOPERATIVE': SentenceType.cooperative,
          'CONTROL': SentenceType.control,
          'PARTIAL': SentenceType.partial,
        };

        for (final entry in types.entries) {
          final json = {
            'id': 'test-${entry.key}',
            'text': 'Test sentence',
            'type': entry.key,
          };
          final sentence = StorySentence.fromJson(json);
          expect(sentence.type, entry.value);
        }
      });
    });

    group('LearnerStoryPreferences', () {
      test('creates preferences from JSON', () {
        final json = {
          'learnerId': 'learner-456',
          'preferredReadingLevel': 'PRE_READER',
          'preferredVisualStyle': 'CARTOON',
          'enableAudio': true,
          'enableTts': true,
          'ttsSpeed': 0.9,
        };

        final prefs = LearnerStoryPreferences.fromJson(json);

        expect(prefs.learnerId, 'learner-456');
        expect(prefs.preferredReadingLevel, SocialStoryReadingLevel.preReader);
        expect(prefs.preferredVisualStyle, SocialStoryVisualStyle.cartoon);
        expect(prefs.enableAudio, true);
        expect(prefs.ttsSpeed, 0.9);
      });

      test('uses defaults for missing optional fields', () {
        final json = {
          'learnerId': 'learner-456',
        };

        final prefs = LearnerStoryPreferences.fromJson(json);

        expect(prefs.preferredReadingLevel, SocialStoryReadingLevel.developing);
        expect(prefs.enableAudio, true);
        expect(prefs.ttsSpeed, 1.0);
      });
    });

    group('StoryRecommendation', () {
      test('creates recommendation from JSON', () {
        final json = {
          'storyId': 'story-123',
          'story': _createMinimalStoryJson(),
          'score': 0.95,
          'reason': 'EMOTIONAL_SUPPORT',
          'context': {'emotionalState': 'frustrated'},
        };

        final rec = StoryRecommendation.fromJson(json);

        expect(rec.storyId, 'story-123');
        expect(rec.reason, RecommendationReason.emotionalSupport);
        expect(rec.score, 0.95);
      });

      test('parses all recommendation reasons', () {
        final reasons = {
          'TRANSITION_SUPPORT': RecommendationReason.transitionSupport,
          'EMOTIONAL_SUPPORT': RecommendationReason.emotionalSupport,
          'SCHEDULED': RecommendationReason.scheduled,
          'TEACHER_ASSIGNED': RecommendationReason.teacherAssigned,
          'FREQUENTLY_HELPFUL': RecommendationReason.frequentlyHelpful,
          'SIMILAR_SITUATION': RecommendationReason.similarSituation,
          'NEW_SCENARIO': RecommendationReason.newScenario,
        };

        for (final entry in reasons.entries) {
          final json = {
            'storyId': 'story-test',
            'story': _createMinimalStoryJson(),
            'score': 0.5,
            'reason': entry.key,
          };
          final rec = StoryRecommendation.fromJson(json);
          expect(rec.reason, entry.value);
        }
      });
    });

    group('StoryInteraction', () {
      test('creates interaction from JSON', () {
        final json = {
          'id': 'interaction-1',
          'type': 'BREATHING',
          'config': {
            'inhale': 4,
            'hold': 4,
            'exhale': 4,
            'cycles': 3,
          },
          'required': true,
        };

        final interaction = StoryInteraction.fromJson(json);

        expect(interaction.id, 'interaction-1');
        expect(interaction.type, 'BREATHING');
        expect(interaction.config['inhale'], 4);
        expect(interaction.config['cycles'], 3);
        expect(interaction.required, true);
      });

      test('creates choice interaction from JSON', () {
        final json = {
          'id': 'interaction-2',
          'type': 'CHOICE',
          'config': {
            'prompt': 'What would you do?',
            'choices': ['Take a break', 'Ask for help', 'Keep trying'],
            'correctChoices': [0, 1, 2],
          },
          'required': false,
        };

        final interaction = StoryInteraction.fromJson(json);

        expect(interaction.type, 'CHOICE');
        expect(interaction.config['choices'], isA<List>());
        expect((interaction.config['choices'] as List).length, 3);
      });
    });

    group('SocialStoryCategory', () {
      test('parses all categories correctly', () {
        final categories = [
          'STARTING_LESSON',
          'ENDING_LESSON',
          'CHANGING_ACTIVITY',
          'TAKING_QUIZ',
          'FEELING_FRUSTRATED',
          'FEELING_OVERWHELMED',
          'CALMING_DOWN',
          'ASKING_FOR_HELP',
          'ASKING_FOR_BREAK',
          'FIRE_DRILL',
          'LOCKDOWN',
        ];

        for (final cat in categories) {
          final parsed = SocialStoryCategory.values.firstWhere(
            (e) => _categoryToString(e) == cat,
            orElse: () => throw Exception('Category not found: $cat'),
          );
          expect(parsed, isNotNull);
        }
      });
    });
  });
}

/// Helper to create minimal story JSON for testing
Map<String, dynamic> _createMinimalStoryJson() {
  return {
    'id': 'story-test',
    'tenantId': 'tenant-test',
    'slug': 'test',
    'title': 'Test',
    'category': 'CALMING_DOWN',
    'readingLevel': 'DEVELOPING',
    'defaultVisualStyle': 'CARTOON',
    'isBuiltIn': false,
    'isApproved': true,
    'supportsPersonalization': true,
    'estimatedDuration': 60,
    'pages': [],
    'createdAt': '2024-01-01T00:00:00Z',
    'updatedAt': '2024-01-01T00:00:00Z',
  };
}

/// Helper to convert category enum to string
String _categoryToString(SocialStoryCategory category) {
  switch (category) {
    case SocialStoryCategory.startingLesson:
      return 'STARTING_LESSON';
    case SocialStoryCategory.endingLesson:
      return 'ENDING_LESSON';
    case SocialStoryCategory.changingActivity:
      return 'CHANGING_ACTIVITY';
    case SocialStoryCategory.takingQuiz:
      return 'TAKING_QUIZ';
    case SocialStoryCategory.feelingFrustrated:
      return 'FEELING_FRUSTRATED';
    case SocialStoryCategory.feelingOverwhelmed:
      return 'FEELING_OVERWHELMED';
    case SocialStoryCategory.calmingDown:
      return 'CALMING_DOWN';
    case SocialStoryCategory.askingForHelp:
      return 'ASKING_FOR_HELP';
    case SocialStoryCategory.askingForBreak:
      return 'ASKING_FOR_BREAK';
    case SocialStoryCategory.fireDrill:
      return 'FIRE_DRILL';
    case SocialStoryCategory.lockdown:
      return 'LOCKDOWN';
    default:
      return category.name.toUpperCase();
  }
}
