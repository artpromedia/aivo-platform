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
          'readingLevel': 'STANDARD',
          'visualStyle': 'ILLUSTRATED',
          'isBuiltIn': true,
          'isActive': true,
          'pageCount': 4,
          'estimatedDuration': 180,
          'pages': [
            {
              'pageNumber': 1,
              'title': 'Getting Ready',
              'sentences': [
                {
                  'id': 'sent-1',
                  'text': 'I am about to start my lesson.',
                  'sentenceType': 'DESCRIPTIVE',
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
        expect(story.readingLevel, SocialStoryReadingLevel.standard);
        expect(story.isBuiltIn, true);
        expect(story.pageCount, 4);
        expect(story.pages.length, 1);
      });

      test('converts story to JSON', () {
        final story = SocialStory(
          id: 'story-123',
          tenantId: 'tenant-456',
          slug: 'test-story',
          title: 'Test Story',
          category: SocialStoryCategory.calmingDown,
          readingLevel: SocialStoryReadingLevel.standard,
          visualStyle: SocialStoryVisualStyle.illustrated,
          isBuiltIn: false,
          isActive: true,
          pageCount: 2,
          estimatedDuration: 120,
          pages: [],
          createdAt: DateTime(2024, 1, 1),
          updatedAt: DateTime(2024, 1, 1),
        );

        final json = story.toJson();

        expect(json['id'], 'story-123');
        expect(json['slug'], 'test-story');
        expect(json['category'], 'CALMING_DOWN');
        expect(json['readingLevel'], 'STANDARD');
      });
    });

    group('StoryPage', () {
      test('creates page from JSON', () {
        final json = {
          'pageNumber': 1,
          'title': 'First Page',
          'sentences': [
            {
              'id': 'sent-1',
              'text': 'Hello!',
              'sentenceType': 'DESCRIPTIVE',
            }
          ],
          'visualUrl': 'https://example.com/image.png',
        };

        final page = StoryPage.fromJson(json);

        expect(page.pageNumber, 1);
        expect(page.title, 'First Page');
        expect(page.sentences.length, 1);
        expect(page.visualUrl, 'https://example.com/image.png');
      });

      test('handles page without optional fields', () {
        final json = {
          'pageNumber': 2,
          'sentences': [],
        };

        final page = StoryPage.fromJson(json);

        expect(page.pageNumber, 2);
        expect(page.title, isNull);
        expect(page.visualUrl, isNull);
        expect(page.audioUrl, isNull);
      });
    });

    group('StorySentence', () {
      test('creates sentence from JSON', () {
        final json = {
          'id': 'sent-123',
          'text': 'I can stay calm.',
          'sentenceType': 'DIRECTIVE',
          'emphasisWords': ['stay', 'calm'],
          'personalizable': true,
          'placeholders': ['learnerName'],
        };

        final sentence = StorySentence.fromJson(json);

        expect(sentence.id, 'sent-123');
        expect(sentence.text, 'I can stay calm.');
        expect(sentence.sentenceType, SentenceType.directive);
        expect(sentence.emphasisWords, ['stay', 'calm']);
        expect(sentence.personalizable, true);
        expect(sentence.placeholders, ['learnerName']);
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
            'sentenceType': entry.key,
          };
          final sentence = StorySentence.fromJson(json);
          expect(sentence.sentenceType, entry.value);
        }
      });
    });

    group('LearnerStoryPreferences', () {
      test('creates preferences from JSON', () {
        final json = {
          'id': 'pref-123',
          'learnerId': 'learner-456',
          'tenantId': 'tenant-789',
          'preferredReadingLevel': 'SIMPLIFIED',
          'preferredVisualStyle': 'CARTOON',
          'autoPlayAudio': true,
          'showTextHighlighting': true,
          'fontSizeMultiplier': 1.2,
          'preferredNarrationSpeed': 0.9,
          'enableTts': true,
        };

        final prefs = LearnerStoryPreferences.fromJson(json);

        expect(prefs.id, 'pref-123');
        expect(prefs.learnerId, 'learner-456');
        expect(prefs.preferredReadingLevel, SocialStoryReadingLevel.simplified);
        expect(prefs.preferredVisualStyle, SocialStoryVisualStyle.cartoon);
        expect(prefs.autoPlayAudio, true);
        expect(prefs.fontSizeMultiplier, 1.2);
        expect(prefs.preferredNarrationSpeed, 0.9);
      });

      test('uses defaults for missing optional fields', () {
        final json = {
          'id': 'pref-123',
          'learnerId': 'learner-456',
          'tenantId': 'tenant-789',
        };

        final prefs = LearnerStoryPreferences.fromJson(json);

        expect(prefs.preferredReadingLevel, isNull);
        expect(prefs.autoPlayAudio, false);
        expect(prefs.fontSizeMultiplier, 1.0);
      });
    });

    group('StoryRecommendation', () {
      test('creates recommendation from JSON', () {
        final json = {
          'story': {
            'id': 'story-123',
            'tenantId': 'tenant-456',
            'slug': 'calming-down',
            'title': 'Calming Down',
            'category': 'CALMING_DOWN',
            'readingLevel': 'STANDARD',
            'visualStyle': 'ILLUSTRATED',
            'isBuiltIn': true,
            'isActive': true,
            'pageCount': 5,
            'estimatedDuration': 200,
            'pages': [],
            'createdAt': '2024-01-01T00:00:00Z',
            'updatedAt': '2024-01-01T00:00:00Z',
          },
          'reason': 'EMOTIONAL_SUPPORT',
          'priority': 'HIGH',
          'context': {'emotionalState': 'frustrated'},
        };

        final rec = StoryRecommendation.fromJson(json);

        expect(rec.story.id, 'story-123');
        expect(rec.reason, RecommendationReason.emotionalSupport);
        expect(rec.priority, 'HIGH');
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
            'story': _createMinimalStoryJson(),
            'reason': entry.key,
            'priority': 'MEDIUM',
          };
          final rec = StoryRecommendation.fromJson(json);
          expect(rec.reason, entry.value);
        }
      });
    });

    group('StoryInteraction', () {
      test('creates breathing exercise interaction', () {
        final json = {
          'type': 'BREATHING',
          'prompt': 'Let\'s take a deep breath together',
          'breathingPattern': {
            'inhale': 4,
            'hold': 4,
            'exhale': 4,
            'holdAfterExhale': 4,
            'cycles': 3,
          },
        };

        final interaction = StoryInteraction.fromJson(json);

        expect(interaction.type, InteractionType.breathing);
        expect(interaction.breathingPattern, isNotNull);
        expect(interaction.breathingPattern!.inhale, 4);
        expect(interaction.breathingPattern!.cycles, 3);
      });

      test('creates choice interaction', () {
        final json = {
          'type': 'CHOICE',
          'prompt': 'What would you do?',
          'choices': ['Take a break', 'Ask for help', 'Keep trying'],
          'correctChoices': [0, 1, 2],
        };

        final interaction = StoryInteraction.fromJson(json);

        expect(interaction.type, InteractionType.choice);
        expect(interaction.choices!.length, 3);
        expect(interaction.correctChoices, [0, 1, 2]);
      });

      test('creates emotion check-in interaction', () {
        final json = {
          'type': 'EMOTION_CHECKIN',
          'prompt': 'How are you feeling right now?',
        };

        final interaction = StoryInteraction.fromJson(json);

        expect(interaction.type, InteractionType.emotionCheckin);
        expect(interaction.prompt, 'How are you feeling right now?');
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
            (e) => e.name.toUpperCase().replaceAll(RegExp(r'([A-Z])'), '_\$1').substring(1) == cat ||
                   _categoryToString(e) == cat,
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
    'readingLevel': 'STANDARD',
    'visualStyle': 'ILLUSTRATED',
    'isBuiltIn': false,
    'isActive': true,
    'pageCount': 1,
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
