import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'dart:convert';

import 'package:mobile_learner/sensory/models.dart';
import 'package:mobile_learner/sensory/sensory_accommodations_service.dart';

void main() {
  group('SensoryService', () {
    late SensoryService service;

    group('Sensory Breaks', () {
      test('getSensoryBreaks returns list of breaks', () async {
        final mockClient = MockClient((request) async {
          expect(request.url.toString(), contains('/api/sensory/breaks'));
          return http.Response(
            json.encode([
              {
                'id': 'break-1',
                'name': 'Deep Breathing',
                'description': 'Calm breathing exercise',
                'type': 'breathing',
                'durationMinutes': 5,
                'instructions': ['Breathe in slowly', 'Hold', 'Breathe out'],
                'requiresSupervision': false,
              },
              {
                'id': 'break-2',
                'name': 'Stretching',
                'description': 'Gentle stretches',
                'type': 'stretching',
                'durationMinutes': 10,
                'instructions': ['Stand up', 'Reach high', 'Touch toes'],
                'requiresSupervision': false,
              },
            ]),
            200,
          );
        });

        service = SensoryService(client: mockClient);
        final breaks = await service.getSensoryBreaks();

        expect(breaks.length, 2);
        expect(breaks[0].name, 'Deep Breathing');
        expect(breaks[0].type, SensoryBreakType.breathing);
        expect(breaks[1].name, 'Stretching');
        expect(breaks[1].type, SensoryBreakType.stretching);
      });

      test('getSensoryBreaks filters by type', () async {
        final mockClient = MockClient((request) async {
          expect(request.url.toString(), contains('type=breathing'));
          return http.Response(
            json.encode([
              {
                'id': 'break-1',
                'name': 'Deep Breathing',
                'description': 'Calm breathing exercise',
                'type': 'breathing',
                'durationMinutes': 5,
                'instructions': ['Breathe in', 'Hold', 'Breathe out'],
                'requiresSupervision': false,
              },
            ]),
            200,
          );
        });

        service = SensoryService(client: mockClient);
        final breaks = await service.getSensoryBreaks(type: SensoryBreakType.breathing);

        expect(breaks.length, 1);
        expect(breaks[0].type, SensoryBreakType.breathing);
      });

      test('getSensoryBreak returns single break', () async {
        final mockClient = MockClient((request) async {
          expect(request.url.toString(), contains('/breaks/break-1'));
          return http.Response(
            json.encode({
              'id': 'break-1',
              'name': 'Deep Breathing',
              'description': 'Calm breathing exercise',
              'type': 'breathing',
              'durationMinutes': 5,
              'instructions': ['Breathe in', 'Hold', 'Breathe out'],
              'imageUrl': 'https://example.com/image.png',
              'requiresSupervision': false,
            }),
            200,
          );
        });

        service = SensoryService(client: mockClient);
        final breakItem = await service.getSensoryBreak('break-1');

        expect(breakItem.id, 'break-1');
        expect(breakItem.name, 'Deep Breathing');
        expect(breakItem.imageUrl, 'https://example.com/image.png');
      });

      test('startBreakSession creates new session', () async {
        final mockClient = MockClient((request) async {
          expect(request.url.toString(), contains('/breaks/sessions'));
          expect(request.method, 'POST');
          
          final body = json.decode(request.body) as Map<String, dynamic>;
          expect(body['learnerId'], 'learner-123');
          expect(body['breakId'], 'break-1');

          return http.Response(
            json.encode({
              'id': 'session-1',
              'learnerId': 'learner-123',
              'breakId': 'break-1',
              'startTime': DateTime.now().toIso8601String(),
            }),
            201,
          );
        });

        service = SensoryService(client: mockClient);
        final session = await service.startBreakSession('learner-123', 'break-1');

        expect(session.id, 'session-1');
        expect(session.learnerId, 'learner-123');
        expect(session.breakId, 'break-1');
      });

      test('completeBreakSession updates session with rating', () async {
        final mockClient = MockClient((request) async {
          expect(request.url.toString(), contains('/breaks/sessions/session-1'));
          expect(request.method, 'PUT');
          
          final body = json.decode(request.body) as Map<String, dynamic>;
          expect(body['rating'], 5);
          expect(body['notes'], 'Felt great!');

          return http.Response(
            json.encode({
              'id': 'session-1',
              'learnerId': 'learner-123',
              'breakId': 'break-1',
              'startTime': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
              'endTime': DateTime.now().toIso8601String(),
              'rating': 5,
              'notes': 'Felt great!',
            }),
            200,
          );
        });

        service = SensoryService(client: mockClient);
        final session = await service.completeBreakSession('session-1', 5, notes: 'Felt great!');

        expect(session.rating, 5);
        expect(session.notes, 'Felt great!');
        expect(session.endTime, isNotNull);
      });

      test('getBreakSessions returns session history', () async {
        final mockClient = MockClient((request) async {
          expect(request.url.toString(), contains('learnerId=learner-123'));
          return http.Response(
            json.encode([
              {
                'id': 'session-1',
                'learnerId': 'learner-123',
                'breakId': 'break-1',
                'startTime': DateTime.now().toIso8601String(),
                'endTime': DateTime.now().toIso8601String(),
                'rating': 5,
              },
              {
                'id': 'session-2',
                'learnerId': 'learner-123',
                'breakId': 'break-2',
                'startTime': DateTime.now().toIso8601String(),
                'endTime': DateTime.now().toIso8601String(),
                'rating': 4,
              },
            ]),
            200,
          );
        });

        service = SensoryService(client: mockClient);
        final sessions = await service.getBreakSessions('learner-123');

        expect(sessions.length, 2);
        expect(sessions[0].rating, 5);
        expect(sessions[1].rating, 4);
      });
    });

    group('Environment Customization', () {
      test('getEnvironmentSettings returns list of settings', () async {
        final mockClient = MockClient((request) async {
          expect(request.url.toString(), contains('learnerId=learner-123'));
          return http.Response(
            json.encode([
              {
                'id': 'setting-1',
                'type': 'brightness',
                'name': 'Screen Brightness',
                'description': 'Adjust screen brightness',
                'value': 75,
                'defaultValue': 100,
                'minValue': 0,
                'maxValue': 100,
              },
              {
                'id': 'setting-2',
                'type': 'colorScheme',
                'name': 'Color Scheme',
                'description': 'Choose color scheme',
                'value': 'light',
                'defaultValue': 'light',
                'options': ['light', 'dark', 'highContrast'],
              },
            ]),
            200,
          );
        });

        service = SensoryService(client: mockClient);
        final settings = await service.getEnvironmentSettings('learner-123');

        expect(settings.length, 2);
        expect(settings[0].type, EnvironmentSettingType.brightness);
        expect(settings[0].value, 75);
        expect(settings[1].type, EnvironmentSettingType.colorScheme);
        expect(settings[1].options, ['light', 'dark', 'highContrast']);
      });

      test('updateEnvironmentSetting changes setting value', () async {
        final mockClient = MockClient((request) async {
          expect(request.method, 'PUT');
          
          final body = json.decode(request.body) as Map<String, dynamic>;
          expect(body['value'], 50);

          return http.Response(
            json.encode({
              'id': 'setting-1',
              'type': 'brightness',
              'name': 'Screen Brightness',
              'description': 'Adjust screen brightness',
              'value': 50,
              'defaultValue': 100,
              'minValue': 0,
              'maxValue': 100,
            }),
            200,
          );
        });

        service = SensoryService(client: mockClient);
        final setting = await service.updateEnvironmentSetting('learner-123', 'setting-1', 50);

        expect(setting.value, 50);
      });

      test('resetEnvironmentSettings resets all settings', () async {
        final mockClient = MockClient((request) async {
          expect(request.url.toString(), contains('/reset'));
          expect(request.method, 'POST');

          return http.Response(
            json.encode([
              {
                'id': 'setting-1',
                'type': 'brightness',
                'name': 'Screen Brightness',
                'description': 'Adjust screen brightness',
                'value': 100,
                'defaultValue': 100,
                'minValue': 0,
                'maxValue': 100,
              },
            ]),
            200,
          );
        });

        service = SensoryService(client: mockClient);
        final settings = await service.resetEnvironmentSettings('learner-123');

        expect(settings[0].value, 100);
        expect(settings[0].defaultValue, 100);
      });
    });

    group('Calming Activities', () {
      test('getCalmingActivities returns list of activities', () async {
        final mockClient = MockClient((request) async {
          return http.Response(
            json.encode([
              {
                'id': 'activity-1',
                'name': '4-7-8 Breathing',
                'description': 'Relaxation technique',
                'type': 'breathing',
                'durationMinutes': 5,
                'steps': ['Breathe in for 4', 'Hold for 7', 'Breathe out for 8'],
                'isGuided': true,
              },
              {
                'id': 'activity-2',
                'name': 'Progressive Relaxation',
                'description': 'Muscle relaxation',
                'type': 'movement',
                'durationMinutes': 10,
                'steps': ['Tense muscles', 'Hold', 'Release'],
                'isGuided': false,
              },
            ]),
            200,
          );
        });

        service = SensoryService(client: mockClient);
        final activities = await service.getCalmingActivities();

        expect(activities.length, 2);
        expect(activities[0].name, '4-7-8 Breathing');
        expect(activities[0].isGuided, true);
        expect(activities[1].name, 'Progressive Relaxation');
      });

      test('getCalmingActivities filters by type', () async {
        final mockClient = MockClient((request) async {
          expect(request.url.toString(), contains('type=breathing'));
          return http.Response(
            json.encode([
              {
                'id': 'activity-1',
                'name': '4-7-8 Breathing',
                'description': 'Relaxation technique',
                'type': 'breathing',
                'durationMinutes': 5,
                'steps': ['Breathe in for 4', 'Hold for 7', 'Breathe out for 8'],
                'isGuided': true,
              },
            ]),
            200,
          );
        });

        service = SensoryService(client: mockClient);
        final activities = await service.getCalmingActivities(type: CalmingActivityType.breathing);

        expect(activities.length, 1);
        expect(activities[0].type, CalmingActivityType.breathing);
      });

      test('startCalmingSession creates session with mood', () async {
        final mockClient = MockClient((request) async {
          expect(request.method, 'POST');
          
          final body = json.decode(request.body) as Map<String, dynamic>;
          expect(body['moodBefore'], 2);

          return http.Response(
            json.encode({
              'id': 'session-1',
              'learnerId': 'learner-123',
              'activityId': 'activity-1',
              'startTime': DateTime.now().toIso8601String(),
              'moodBefore': 2,
              'completed': false,
            }),
            201,
          );
        });

        service = SensoryService(client: mockClient);
        final session = await service.startCalmingSession('learner-123', 'activity-1', 2);

        expect(session.moodBefore, 2);
        expect(session.completed, false);
      });

      test('completeCalmingSession updates session with mood improvement', () async {
        final mockClient = MockClient((request) async {
          expect(request.method, 'PUT');
          
          final body = json.decode(request.body) as Map<String, dynamic>;
          expect(body['moodAfter'], 4);
          expect(body['completed'], true);

          return http.Response(
            json.encode({
              'id': 'session-1',
              'learnerId': 'learner-123',
              'activityId': 'activity-1',
              'startTime': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
              'endTime': DateTime.now().toIso8601String(),
              'moodBefore': 2,
              'moodAfter': 4,
              'completed': true,
            }),
            200,
          );
        });

        service = SensoryService(client: mockClient);
        final session = await service.completeCalmingSession('session-1', 4);

        expect(session.moodAfter, 4);
        expect(session.completed, true);
        expect(session.endTime, isNotNull);
      });
    });

    group('Sensory Preferences', () {
      test('getSensoryProfile returns complete profile', () async {
        final mockClient = MockClient((request) async {
          return http.Response(
            json.encode({
              'learnerId': 'learner-123',
              'preferences': [
                {
                  'id': 'pref-1',
                  'category': 'visual',
                  'name': 'Reduce Animations',
                  'description': 'Minimize motion',
                  'enabled': true,
                  'intensity': 3,
                },
              ],
              'sensitivities': ['bright lights', 'loud sounds'],
              'favoriteBreaks': ['break-1'],
              'favoriteActivities': ['activity-1'],
              'lastUpdated': DateTime.now().toIso8601String(),
            }),
            200,
          );
        });

        service = SensoryService(client: mockClient);
        final profile = await service.getSensoryProfile('learner-123');

        expect(profile.learnerId, 'learner-123');
        expect(profile.preferences.length, 1);
        expect(profile.sensitivities, ['bright lights', 'loud sounds']);
        expect(profile.favoriteBreaks, ['break-1']);
        expect(profile.favoriteActivities, ['activity-1']);
      });

      test('updateSensoryPreference modifies preference', () async {
        final preference = SensoryPreference(
          id: 'pref-1',
          category: SensoryPreferenceCategory.visual,
          name: 'Reduce Animations',
          description: 'Minimize motion',
          enabled: true,
          intensity: 4,
        );

        final mockClient = MockClient((request) async {
          expect(request.method, 'PUT');
          return http.Response(json.encode(preference.toJson()), 200);
        });

        service = SensoryService(client: mockClient);
        final updated = await service.updateSensoryPreference('learner-123', preference);

        expect(updated.intensity, 4);
      });

      test('addFavoriteBreak adds break to favorites', () async {
        final mockClient = MockClient((request) async {
          expect(request.method, 'POST');
          expect(request.url.toString(), contains('/favorites/breaks'));
          return http.Response('', 200);
        });

        service = SensoryService(client: mockClient);
        await service.addFavoriteBreak('learner-123', 'break-1');
      });

      test('updateSensitivities updates sensitivity list', () async {
        final mockClient = MockClient((request) async {
          final body = json.decode(request.body) as Map<String, dynamic>;
          expect(body['sensitivities'], ['loud sounds', 'bright lights', 'crowds']);

          return http.Response(
            json.encode({
              'learnerId': 'learner-123',
              'preferences': [],
              'sensitivities': ['loud sounds', 'bright lights', 'crowds'],
              'favoriteBreaks': [],
              'favoriteActivities': [],
              'lastUpdated': DateTime.now().toIso8601String(),
            }),
            200,
          );
        });

        service = SensoryService(client: mockClient);
        final profile = await service.updateSensitivities(
          'learner-123',
          ['loud sounds', 'bright lights', 'crowds'],
        );

        expect(profile.sensitivities.length, 3);
        expect(profile.sensitivities, contains('crowds'));
      });
    });
  });
}
