import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'dart:convert';
import 'package:mobile_learner/motor_skills/models.dart';
import 'package:mobile_learner/motor_skills/motor_skills_service.dart';

void main() {
  group('MotorSkillsService - Handwriting Practice', () {
    test('getHandwritingExercises returns list of exercises', () async {
      final client = MockClient((request) async {
        expect(request.url.path, '/api/motor-skills/handwriting/exercises');
        return http.Response(
          json.encode([
            {
              'id': 'ex1',
              'name': 'Letter A Practice',
              'description': 'Practice uppercase A',
              'type': 'uppercase',
              'letterOrWord': 'A',
              'strokes': [
                {
                  'order': 1,
                  'direction': 'diagonal down-left',
                  'points': [
                    {'x': 50.0, 'y': 0.0},
                    {'x': 0.0, 'y': 100.0}
                  ],
                  'description': 'Draw left diagonal line'
                }
              ],
              'difficulty': 2,
              'estimatedTime': 300,
              'tips': ['Start at the top', 'Keep lines straight']
            }
          ]),
          200,
        );
      });

      final service = MotorSkillsService(client: client);
      final exercises = await service.getHandwritingExercises();

      expect(exercises.length, 1);
      expect(exercises[0].name, 'Letter A Practice');
      expect(exercises[0].type, HandwritingType.uppercase);
      expect(exercises[0].difficulty, 2);
      expect(exercises[0].strokes.length, 1);
    });

    test('getHandwritingExercises filters by type', () async {
      final client = MockClient((request) async {
        expect(request.url.queryParameters['type'], 'lowercase');
        return http.Response(json.encode([]), 200);
      });

      final service = MotorSkillsService(client: client);
      await service.getHandwritingExercises(type: HandwritingType.lowercase);
    });

    test('getHandwritingExercise returns single exercise', () async {
      final client = MockClient((request) async {
        expect(request.url.path, '/api/motor-skills/handwriting/exercises/ex1');
        return http.Response(
          json.encode({
            'id': 'ex1',
            'name': 'Letter B Practice',
            'description': 'Practice uppercase B',
            'type': 'uppercase',
            'letterOrWord': 'B',
            'strokes': [],
            'difficulty': 3,
            'estimatedTime': 360,
            'tips': []
          }),
          200,
        );
      });

      final service = MotorSkillsService(client: client);
      final exercise = await service.getHandwritingExercise('ex1');

      expect(exercise.name, 'Letter B Practice');
      expect(exercise.letterOrWord, 'B');
    });

    test('startHandwritingSession creates new session', () async {
      final client = MockClient((request) async {
        expect(request.url.path, '/api/motor-skills/handwriting/sessions');
        final body = json.decode(request.body);
        expect(body['learnerId'], 'learner1');
        expect(body['exerciseId'], 'ex1');
        return http.Response(
          json.encode({
            'id': 'session1',
            'learnerId': 'learner1',
            'exerciseId': 'ex1',
            'startedAt': '2026-01-16T10:00:00Z',
            'accuracy': 0,
            'strokesCompleted': 0,
            'totalStrokes': 3,
            'feedback': []
          }),
          201,
        );
      });

      final service = MotorSkillsService(client: client);
      final session = await service.startHandwritingSession(
        learnerId: 'learner1',
        exerciseId: 'ex1',
      );

      expect(session.id, 'session1');
      expect(session.learnerId, 'learner1');
      expect(session.strokesCompleted, 0);
    });

    test('completeHandwritingSession updates session with accuracy', () async {
      final client = MockClient((request) async {
        expect(request.url.path, '/api/motor-skills/handwriting/sessions/session1/complete');
        final body = json.decode(request.body);
        expect(body['accuracy'], 85);
        expect(body['strokesCompleted'], 3);
        return http.Response(
          json.encode({
            'id': 'session1',
            'learnerId': 'learner1',
            'exerciseId': 'ex1',
            'startedAt': '2026-01-16T10:00:00Z',
            'completedAt': '2026-01-16T10:05:00Z',
            'accuracy': 85,
            'strokesCompleted': 3,
            'totalStrokes': 3,
            'feedback': ['Good work!']
          }),
          200,
        );
      });

      final service = MotorSkillsService(client: client);
      final session = await service.completeHandwritingSession(
        sessionId: 'session1',
        accuracy: 85,
        strokesCompleted: 3,
        feedback: ['Good work!'],
      );

      expect(session.completedAt, isNotNull);
      expect(session.accuracy, 85);
      expect(session.strokesCompleted, 3);
    });

    test('getHandwritingSessions returns user sessions', () async {
      final client = MockClient((request) async {
        expect(request.url.queryParameters['learnerId'], 'learner1');
        return http.Response(
          json.encode([
            {
              'id': 'session1',
              'learnerId': 'learner1',
              'exerciseId': 'ex1',
              'startedAt': '2026-01-16T10:00:00Z',
              'completedAt': '2026-01-16T10:05:00Z',
              'accuracy': 85,
              'strokesCompleted': 3,
              'totalStrokes': 3,
              'feedback': []
            }
          ]),
          200,
        );
      });

      final service = MotorSkillsService(client: client);
      final sessions = await service.getHandwritingSessions('learner1');

      expect(sessions.length, 1);
      expect(sessions[0].accuracy, 85);
    });
  });

  group('MotorSkillsService - Fine Motor Activities', () {
    test('getFineMotorActivities returns list of activities', () async {
      final client = MockClient((request) async {
        expect(request.url.path, '/api/motor-skills/fine-motor/activities');
        return http.Response(
          json.encode([
            {
              'id': 'act1',
              'name': 'Tap the Targets',
              'description': 'Tap all the circles',
              'type': 'tapping',
              'difficulty': 1,
              'steps': [
                {
                  'order': 1,
                  'instruction': 'Tap the red circle',
                }
              ],
              'estimatedTime': 180,
              'materials': [],
              'benefits': ['Improves hand-eye coordination']
            }
          ]),
          200,
        );
      });

      final service = MotorSkillsService(client: client);
      final activities = await service.getFineMotorActivities();

      expect(activities.length, 1);
      expect(activities[0].name, 'Tap the Targets');
      expect(activities[0].type, FineMotorType.tapping);
    });

    test('getFineMotorActivities filters by type', () async {
      final client = MockClient((request) async {
        expect(request.url.queryParameters['type'], 'dragging');
        return http.Response(json.encode([]), 200);
      });

      final service = MotorSkillsService(client: client);
      await service.getFineMotorActivities(type: FineMotorType.dragging);
    });

    test('startFineMotorSession creates new session', () async {
      final client = MockClient((request) async {
        expect(request.url.path, '/api/motor-skills/fine-motor/sessions');
        return http.Response(
          json.encode({
            'id': 'session2',
            'learnerId': 'learner1',
            'activityId': 'act1',
            'startedAt': '2026-01-16T11:00:00Z',
            'stepsCompleted': 0,
            'totalSteps': 5,
            'accuracy': 0,
            'achievements': []
          }),
          201,
        );
      });

      final service = MotorSkillsService(client: client);
      final session = await service.startFineMotorSession(
        learnerId: 'learner1',
        activityId: 'act1',
      );

      expect(session.id, 'session2');
      expect(session.stepsCompleted, 0);
    });

    test('completeFineMotorSession updates session with achievements', () async {
      final client = MockClient((request) async {
        final body = json.decode(request.body);
        expect(body['stepsCompleted'], 5);
        expect(body['accuracy'], 90);
        expect(body['achievements'], contains('Perfect Score'));
        return http.Response(
          json.encode({
            'id': 'session2',
            'learnerId': 'learner1',
            'activityId': 'act1',
            'startedAt': '2026-01-16T11:00:00Z',
            'completedAt': '2026-01-16T11:05:00Z',
            'stepsCompleted': 5,
            'totalSteps': 5,
            'accuracy': 90,
            'achievements': ['Perfect Score']
          }),
          200,
        );
      });

      final service = MotorSkillsService(client: client);
      final session = await service.completeFineMotorSession(
        sessionId: 'session2',
        stepsCompleted: 5,
        accuracy: 90,
        achievements: ['Perfect Score'],
      );

      expect(session.completedAt, isNotNull);
      expect(session.achievements, contains('Perfect Score'));
    });
  });

  group('MotorSkillsService - Gross Motor Exercises', () {
    test('getGrossMotorExercises returns list of exercises', () async {
      final client = MockClient((request) async {
        expect(request.url.path, '/api/motor-skills/gross-motor/exercises');
        return http.Response(
          json.encode([
            {
              'id': 'gm1',
              'name': 'Jumping Jacks',
              'description': 'Classic jumping exercise',
              'type': 'jumping',
              'difficulty': 2,
              'movements': [
                {
                  'order': 1,
                  'name': 'Jump',
                  'description': 'Jump with arms up',
                  'repetitions': 10,
                  'duration': 30,
                  'cues': ['Keep knees soft']
                }
              ],
              'duration': 300,
              'equipment': [],
              'caloriesBurned': 50,
              'muscleGroups': ['legs', 'arms']
            }
          ]),
          200,
        );
      });

      final service = MotorSkillsService(client: client);
      final exercises = await service.getGrossMotorExercises();

      expect(exercises.length, 1);
      expect(exercises[0].name, 'Jumping Jacks');
      expect(exercises[0].type, GrossMotorType.jumping);
      expect(exercises[0].caloriesBurned, 50);
    });

    test('getGrossMotorExercises filters by type and difficulty', () async {
      final client = MockClient((request) async {
        expect(request.url.queryParameters['type'], 'yoga');
        expect(request.url.queryParameters['difficulty'], '1');
        return http.Response(json.encode([]), 200);
      });

      final service = MotorSkillsService(client: client);
      await service.getGrossMotorExercises(
        type: GrossMotorType.yoga,
        difficulty: 1,
      );
    });

    test('startGrossMotorSession creates new session', () async {
      final client = MockClient((request) async {
        return http.Response(
          json.encode({
            'id': 'session3',
            'learnerId': 'learner1',
            'exerciseId': 'gm1',
            'startedAt': '2026-01-16T12:00:00Z',
            'movementsCompleted': 0,
            'totalMovements': 3,
            'accuracy': 0,
            'notes': []
          }),
          201,
        );
      });

      final service = MotorSkillsService(client: client);
      final session = await service.startGrossMotorSession(
        learnerId: 'learner1',
        exerciseId: 'gm1',
      );

      expect(session.id, 'session3');
      expect(session.movementsCompleted, 0);
    });

    test('completeGrossMotorSession updates session with tracking data', () async {
      final client = MockClient((request) async {
        final body = json.decode(request.body);
        expect(body['movementsCompleted'], 3);
        expect(body['accuracy'], 95);
        return http.Response(
          json.encode({
            'id': 'session3',
            'learnerId': 'learner1',
            'exerciseId': 'gm1',
            'startedAt': '2026-01-16T12:00:00Z',
            'completedAt': '2026-01-16T12:10:00Z',
            'movementsCompleted': 3,
            'totalMovements': 3,
            'accuracy': 95,
            'trackingData': {'heartRate': 120},
            'notes': ['Great workout']
          }),
          200,
        );
      });

      final service = MotorSkillsService(client: client);
      final session = await service.completeGrossMotorSession(
        sessionId: 'session3',
        movementsCompleted: 3,
        accuracy: 95,
        trackingData: {'heartRate': 120},
        notes: ['Great workout'],
      );

      expect(session.completedAt, isNotNull);
      expect(session.accuracy, 95);
    });
  });

  group('MotorSkillsService - Adaptive Input', () {
    test('getAdaptiveInputProfile returns profile with settings', () async {
      final client = MockClient((request) async {
        expect(request.url.queryParameters['learnerId'], 'learner1');
        return http.Response(
          json.encode({
            'id': 'profile1',
            'learnerId': 'learner1',
            'settings': [
              {
                'id': 'setting1',
                'name': 'Touch Target Size',
                'type': 'touchTargetSize',
                'value': 48,
                'defaultValue': 44,
                'description': 'Size of touch targets in pixels',
                'constraints': {'min': 36, 'max': 72}
              }
            ],
            'updatedAt': '2026-01-16T10:00:00Z',
            'isActive': true
          }),
          200,
        );
      });

      final service = MotorSkillsService(client: client);
      final profile = await service.getAdaptiveInputProfile('learner1');

      expect(profile.id, 'profile1');
      expect(profile.settings.length, 1);
      expect(profile.settings[0].name, 'Touch Target Size');
      expect(profile.settings[0].value, 48);
      expect(profile.isActive, true);
    });

    test('updateAdaptiveInputSetting updates specific setting', () async {
      final client = MockClient((request) async {
        expect(request.url.path,
            '/api/motor-skills/adaptive-input/profile/profile1/settings/setting1');
        final body = json.decode(request.body);
        expect(body['value'], 52);
        return http.Response(
          json.encode({
            'id': 'profile1',
            'learnerId': 'learner1',
            'settings': [
              {
                'id': 'setting1',
                'name': 'Touch Target Size',
                'type': 'touchTargetSize',
                'value': 52,
                'defaultValue': 44,
                'description': 'Size of touch targets in pixels',
                'constraints': {'min': 36, 'max': 72}
              }
            ],
            'updatedAt': '2026-01-16T10:05:00Z',
            'isActive': true
          }),
          200,
        );
      });

      final service = MotorSkillsService(client: client);
      final profile = await service.updateAdaptiveInputSetting(
        profileId: 'profile1',
        settingId: 'setting1',
        value: 52,
      );

      expect(profile.settings[0].value, 52);
    });

    test('resetAdaptiveInputSettings resets all settings to defaults', () async {
      final client = MockClient((request) async {
        expect(request.url.path, '/api/motor-skills/adaptive-input/profile/profile1/reset');
        return http.Response(
          json.encode({
            'id': 'profile1',
            'learnerId': 'learner1',
            'settings': [
              {
                'id': 'setting1',
                'name': 'Touch Target Size',
                'type': 'touchTargetSize',
                'value': 44,
                'defaultValue': 44,
                'description': 'Size of touch targets in pixels',
                'constraints': {'min': 36, 'max': 72}
              }
            ],
            'updatedAt': '2026-01-16T10:10:00Z',
            'isActive': true
          }),
          200,
        );
      });

      final service = MotorSkillsService(client: client);
      final profile = await service.resetAdaptiveInputSettings('profile1');

      expect(profile.settings[0].value, profile.settings[0].defaultValue);
    });

    test('activateAdaptiveInputProfile activates profile', () async {
      final client = MockClient((request) async {
        expect(request.url.path,
            '/api/motor-skills/adaptive-input/profile/profile1/activate');
        return http.Response(
          json.encode({
            'id': 'profile1',
            'learnerId': 'learner1',
            'settings': [],
            'updatedAt': '2026-01-16T10:15:00Z',
            'isActive': true
          }),
          200,
        );
      });

      final service = MotorSkillsService(client: client);
      final profile = await service.activateAdaptiveInputProfile('profile1');

      expect(profile.isActive, true);
    });
  });
}
