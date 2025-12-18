/// Offline Regulation Tests - ND-3.2
///
/// Tests for offline regulation activities functionality.

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_learner/offline/cached_activities.dart';
import 'package:mobile_learner/offline/offline_regulation_service.dart';

void main() {
  group('CachedActivities', () {
    test('provides all built-in activities', () {
      final all = CachedActivities.all;
      
      expect(all, isNotEmpty);
      expect(all.length, greaterThanOrEqualTo(15)); // At least 15 built-in activities
    });

    test('provides activities by category', () {
      final breathingActivities = CachedActivities.byCategory(ActivityCategory.breathing);
      expect(breathingActivities, isNotEmpty);
      expect(
        breathingActivities.every((a) => a.category == ActivityCategory.breathing),
        isTrue,
      );

      final groundingActivities = CachedActivities.byCategory(ActivityCategory.grounding);
      expect(groundingActivities, isNotEmpty);
      expect(
        groundingActivities.every((a) => a.category == ActivityCategory.grounding),
        isTrue,
      );

      final movementActivities = CachedActivities.byCategory(ActivityCategory.movement);
      expect(movementActivities, isNotEmpty);
      expect(
        movementActivities.every((a) => a.category == ActivityCategory.movement),
        isTrue,
      );
    });

    test('provides activities by age group', () {
      final preschoolActivities = CachedActivities.byAgeGroup(AgeGroup.preschool);
      expect(preschoolActivities, isNotEmpty);
      
      // Preschool activities should be appropriate for young children
      for (final activity in preschoolActivities) {
        expect(
          activity.ageGroups.contains(AgeGroup.preschool) ||
          activity.ageGroups.contains(AgeGroup.all),
          isTrue,
          reason: '${activity.name} should be suitable for preschool',
        );
      }
    });

    test('provides activities by difficulty', () {
      final beginnerActivities = CachedActivities.byDifficulty(ActivityDifficulty.beginner);
      expect(beginnerActivities, isNotEmpty);
      expect(
        beginnerActivities.every((a) => a.difficulty == ActivityDifficulty.beginner),
        isTrue,
      );
    });

    test('provides activities by tag', () {
      final calmActivities = CachedActivities.byTag('calm');
      expect(calmActivities, isNotEmpty);
      expect(
        calmActivities.every((a) => a.tags.contains('calm')),
        isTrue,
      );
    });

    test('finds activity by ID', () {
      final boxBreathing = CachedActivities.byId('breathing_box');
      expect(boxBreathing, isNotNull);
      expect(boxBreathing!.name, 'Box Breathing');
      expect(boxBreathing.category, ActivityCategory.breathing);
    });

    test('returns null for unknown activity ID', () {
      final unknown = CachedActivities.byId('unknown_activity_id');
      expect(unknown, isNull);
    });

    test('provides offline-only activities', () {
      final offlineActivities = CachedActivities.offlineOnly();
      expect(offlineActivities, isNotEmpty);
      
      // Offline-only activities should not require audio
      for (final activity in offlineActivities) {
        expect(activity.requiresAudio, isFalse);
      }
    });

    test('provides all unique categories', () {
      final categories = CachedActivities.allCategories;
      expect(categories, isNotEmpty);
      expect(categories, contains('breathing'));
      expect(categories, contains('grounding'));
      expect(categories, contains('movement'));
      expect(categories, contains('sensory'));
    });

    test('provides all unique tags', () {
      final tags = CachedActivities.allTags;
      expect(tags, isNotEmpty);
      expect(tags, contains('calm'));
      expect(tags, contains('anxiety'));
    });
  });

  group('BreathingExercises', () {
    test('contains box breathing', () {
      final boxBreathing = BreathingExercises.boxBreathing;
      
      expect(boxBreathing.id, 'breathing_box');
      expect(boxBreathing.name, 'Box Breathing');
      expect(boxBreathing.category, ActivityCategory.breathing);
      expect(boxBreathing.steps.length, 4);
      expect(boxBreathing.customData, isNotNull);
      expect(boxBreathing.customData!['inhaleSeconds'], 4);
      expect(boxBreathing.customData!['holdInSeconds'], 4);
      expect(boxBreathing.customData!['exhaleSeconds'], 4);
      expect(boxBreathing.customData!['holdOutSeconds'], 4);
    });

    test('contains 4-7-8 breathing', () {
      final breathing478 = BreathingExercises.fourSevenEight;
      
      expect(breathing478.id, 'breathing_478');
      expect(breathing478.name, '4-7-8 Breathing');
      expect(breathing478.customData!['inhaleSeconds'], 4);
      expect(breathing478.customData!['holdSeconds'], 7);
      expect(breathing478.customData!['exhaleSeconds'], 8);
    });

    test('contains bunny breathing for young children', () {
      final bunnyBreathing = BreathingExercises.bunnyBreathing;
      
      expect(bunnyBreathing.id, 'breathing_bunny');
      expect(bunnyBreathing.ageGroups, contains(AgeGroup.preschool));
      expect(bunnyBreathing.ageGroups, contains(AgeGroup.elementary));
    });

    test('all breathing exercises have valid steps', () {
      for (final exercise in BreathingExercises.all) {
        expect(exercise.steps, isNotEmpty);
        expect(exercise.durationSeconds, greaterThan(0));
        
        for (final step in exercise.steps) {
          expect(step.instruction, isNotEmpty);
          expect(step.durationSeconds, greaterThan(0));
        }
      }
    });
  });

  group('GroundingExercises', () {
    test('contains 5-4-3-2-1 grounding', () {
      final fiveToOne = GroundingExercises.fiveToOne;
      
      expect(fiveToOne.id, 'grounding_54321');
      expect(fiveToOne.name, '5-4-3-2-1 Grounding');
      expect(fiveToOne.category, ActivityCategory.grounding);
      expect(fiveToOne.steps.length, 5); // 5 senses
    });

    test('contains body awareness exercise', () {
      final bodyAwareness = GroundingExercises.bodyAwareness;
      
      expect(bodyAwareness.id, 'grounding_body');
      expect(bodyAwareness.category, ActivityCategory.grounding);
    });
  });

  group('MovementExercises', () {
    test('contains shake it off exercise', () {
      final shakeItOff = MovementExercises.shakeItOff;
      
      expect(shakeItOff.id, 'movement_shake');
      expect(shakeItOff.name, 'Shake It Off');
      expect(shakeItOff.category, ActivityCategory.movement);
      expect(shakeItOff.customData!['intensity'], 'high');
    });

    test('contains slow stretch exercise', () {
      final slowStretch = MovementExercises.slowStretch;
      
      expect(slowStretch.id, 'movement_stretch');
      expect(slowStretch.customData!['intensity'], 'low');
    });

    test('contains animal moves for kids', () {
      final animalMoves = MovementExercises.animalMoves;
      
      expect(animalMoves.id, 'movement_animals');
      expect(animalMoves.ageGroups, contains(AgeGroup.preschool));
    });
  });

  group('SensoryExercises', () {
    test('contains hand squeezes exercise', () {
      final handSqueezes = SensoryExercises.handSqueezes;
      
      expect(handSqueezes.id, 'sensory_squeeze');
      expect(handSqueezes.category, ActivityCategory.sensory);
    });

    test('contains wall push exercise', () {
      final wallPush = SensoryExercises.wallPush;
      
      expect(wallPush.id, 'sensory_wall');
      expect(wallPush.customData!['proprioceptive'], isTrue);
    });

    test('contains self hug exercise', () {
      final selfHug = SensoryExercises.selfHug;
      
      expect(selfHug.id, 'sensory_hug');
      expect(selfHug.customData!['type'], 'deep_pressure');
    });
  });

  group('CountingExercises', () {
    test('contains count to 10', () {
      final countToTen = CountingExercises.countToTen;
      
      expect(countToTen.id, 'counting_10');
      expect(countToTen.steps.length, 10);
    });

    test('contains count backwards', () {
      final countBackwards = CountingExercises.countBackwards;
      
      expect(countBackwards.id, 'counting_backwards');
      expect(countBackwards.customData!['direction'], 'backwards');
    });
  });

  group('CachedActivity', () {
    test('serializes to JSON correctly', () {
      final activity = BreathingExercises.boxBreathing;
      final json = activity.toJson();
      
      expect(json['id'], 'breathing_box');
      expect(json['name'], 'Box Breathing');
      expect(json['category'], 'breathing');
      expect(json['difficulty'], 'beginner');
      expect(json['steps'], isList);
      expect((json['steps'] as List).length, 4);
    });

    test('deserializes from JSON correctly', () {
      final original = BreathingExercises.boxBreathing;
      final json = original.toJson();
      final restored = CachedActivity.fromJson(json);
      
      expect(restored.id, original.id);
      expect(restored.name, original.name);
      expect(restored.category, original.category);
      expect(restored.difficulty, original.difficulty);
      expect(restored.steps.length, original.steps.length);
    });
  });

  group('ActivityStep', () {
    test('serializes to JSON correctly', () {
      const step = ActivityStep(
        stepNumber: 1,
        instruction: 'Breathe in',
        durationSeconds: 4,
        visualCue: 'arrow_up',
      );
      
      final json = step.toJson();
      
      expect(json['stepNumber'], 1);
      expect(json['instruction'], 'Breathe in');
      expect(json['durationSeconds'], 4);
      expect(json['visualCue'], 'arrow_up');
    });

    test('deserializes from JSON correctly', () {
      final json = {
        'stepNumber': 2,
        'instruction': 'Hold',
        'durationSeconds': 7,
        'isTransition': false,
      };
      
      final step = ActivityStep.fromJson(json);
      
      expect(step.stepNumber, 2);
      expect(step.instruction, 'Hold');
      expect(step.durationSeconds, 7);
      expect(step.isTransition, isFalse);
    });
  });

  group('ActivityFilters', () {
    test('equality works correctly', () {
      const filter1 = ActivityFilters(
        category: ActivityCategory.breathing,
        ageGroup: AgeGroup.elementary,
      );
      
      const filter2 = ActivityFilters(
        category: ActivityCategory.breathing,
        ageGroup: AgeGroup.elementary,
      );
      
      const filter3 = ActivityFilters(
        category: ActivityCategory.grounding,
        ageGroup: AgeGroup.elementary,
      );
      
      expect(filter1, equals(filter2));
      expect(filter1, isNot(equals(filter3)));
    });

    test('hashCode is consistent with equality', () {
      const filter1 = ActivityFilters(
        category: ActivityCategory.breathing,
        tag: 'calm',
      );
      
      const filter2 = ActivityFilters(
        category: ActivityCategory.breathing,
        tag: 'calm',
      );
      
      expect(filter1.hashCode, equals(filter2.hashCode));
    });
  });

  group('ActivityUsageStats', () {
    test('creates empty stats', () {
      final stats = ActivityUsageStats.empty();
      
      expect(stats.totalSessions, 0);
      expect(stats.completedSessions, 0);
      expect(stats.totalDurationSeconds, 0);
      expect(stats.sessionsByCategory, isEmpty);
      expect(stats.favoriteCategory, isNull);
    });

    test('calculates completion rate correctly', () {
      final stats = ActivityUsageStats(
        totalSessions: 10,
        completedSessions: 7,
        totalDurationSeconds: 600,
        sessionsByCategory: {},
      );
      
      expect(stats.completionRate, closeTo(0.7, 0.01));
    });

    test('calculates average session duration', () {
      final stats = ActivityUsageStats(
        totalSessions: 5,
        completedSessions: 5,
        totalDurationSeconds: 300,
        sessionsByCategory: {},
      );
      
      expect(stats.averageSessionDuration, const Duration(seconds: 60));
    });
  });

  group('LearnerRegulationPreferences', () {
    test('creates with defaults', () {
      final prefs = LearnerRegulationPreferences();
      
      expect(prefs.enableAudio, isTrue);
      expect(prefs.enableVibration, isTrue);
      expect(prefs.enableAnimations, isTrue);
      expect(prefs.defaultDurationSeconds, 60);
      expect(prefs.favoriteActivityIds, isEmpty);
      expect(prefs.recentActivityIds, isEmpty);
    });

    test('serializes to JSON correctly', () {
      final prefs = LearnerRegulationPreferences(
        preferredAgeGroup: AgeGroup.elementary,
        preferredCategories: [ActivityCategory.breathing, ActivityCategory.grounding],
        enableAudio: false,
        favoriteActivityIds: ['breathing_box'],
      );
      
      final json = prefs.toJson();
      
      expect(json['preferredAgeGroup'], 'elementary');
      expect(json['preferredCategories'], ['breathing', 'grounding']);
      expect(json['enableAudio'], isFalse);
      expect(json['favoriteActivityIds'], ['breathing_box']);
    });

    test('deserializes from JSON correctly', () {
      final json = {
        'preferredAgeGroup': 'middleSchool',
        'preferredCategories': ['movement'],
        'enableVibration': false,
        'defaultDurationSeconds': 120,
        'recentActivityIds': ['movement_shake', 'breathing_478'],
      };
      
      final prefs = LearnerRegulationPreferences.fromJson(json);
      
      expect(prefs.preferredAgeGroup, AgeGroup.middleSchool);
      expect(prefs.preferredCategories, [ActivityCategory.movement]);
      expect(prefs.enableVibration, isFalse);
      expect(prefs.defaultDurationSeconds, 120);
      expect(prefs.recentActivityIds, ['movement_shake', 'breathing_478']);
    });
  });
}
