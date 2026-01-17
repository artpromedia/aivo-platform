import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'dart:convert';

import 'package:mobile_learner/speech_therapy/speech_therapy_service.dart';
import 'package:mobile_learner/speech_therapy/models.dart';

void main() {
  group('SpeechTherapyService', () {
    late SpeechTherapyService service;

    group('getExercises', () {
      test('returns list of exercises', () async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode([
              {
                'id': 'ex1',
                'title': 'R Sound Practice',
                'description': 'Practice R sounds',
                'practiceType': 'word',
                'targetSound': {
                  'id': 's1',
                  'sound': 'r',
                  'phoneme': '/r/',
                  'category': 'consonants',
                  'examples': ['red', 'run'],
                },
                'instructions': ['Step 1', 'Step 2'],
                'words': [],
                'durationMinutes': 10,
                'difficulty': 2,
              }
            ]),
            200,
          );
        });

        service = SpeechTherapyService(client: mockClient);
        final exercises = await service.getExercises();

        expect(exercises.length, 1);
        expect(exercises.first.id, 'ex1');
        expect(exercises.first.title, 'R Sound Practice');
        expect(exercises.first.targetSound.sound, 'r');
      });

      test('filters by target sound', () async {
        final mockClient = MockClient((request) async {
          expect(request.url.queryParameters['sound'], 's');
          return http.Response(jsonEncode([]), 200);
        });

        service = SpeechTherapyService(client: mockClient);
        await service.getExercises(targetSound: 's');
      });

      test('throws on error', () async {
        final mockClient = MockClient((request) async {
          return http.Response('Error', 500);
        });

        service = SpeechTherapyService(client: mockClient);
        expect(() => service.getExercises(), throwsException);
      });
    });

    group('saveRecording', () {
      test('saves recording and returns data', () async {
        final mockClient = MockClient((request) async {
          final body = jsonDecode(request.body);
          expect(body['learnerId'], 'learner1');
          expect(body['exerciseId'], 'ex1');
          expect(body['audioFilePath'], '/path/to/audio.mp3');

          return http.Response(
            jsonEncode({
              'id': 'rec1',
              'learnerId': 'learner1',
              'exerciseId': 'ex1',
              'audioFilePath': '/path/to/audio.mp3',
              'durationSeconds': 30,
              'timestamp': DateTime.now().toIso8601String(),
            }),
            200,
          );
        });

        service = SpeechTherapyService(client: mockClient);
        final recording = await service.saveRecording(
          'learner1',
          'ex1',
          '/path/to/audio.mp3',
          30,
        );

        expect(recording.id, 'rec1');
        expect(recording.learnerId, 'learner1');
        expect(recording.durationSeconds, 30);
      });
    });

    group('getProgress', () {
      test('returns progress data', () async {
        final mockClient = MockClient((request) async {
          return http.Response(
            jsonEncode({
              'learnerId': 'learner1',
              'totalExercises': 20,
              'exercisesCompleted': 10,
              'totalRecordings': 15,
              'practiceMinutes': 120,
              'soundProgress': {
                's': {
                  'sound': 's',
                  'attempts': 10,
                  'successful': 8,
                  'averageAccuracy': 0.8,
                  'lastPracticed': DateTime.now().toIso8601String(),
                  'currentLevel': 'word',
                }
              },
              'practiceStreak': [],
              'currentStreakDays': 5,
              'longestStreakDays': 10,
              'overallAccuracy': 0.75,
            }),
            200,
          );
        });

        service = SpeechTherapyService(client: mockClient);
        final progress = await service.getProgress('learner1');

        expect(progress.learnerId, 'learner1');
        expect(progress.totalExercises, 20);
        expect(progress.exercisesCompleted, 10);
        expect(progress.completionRate, 50.0);
        expect(progress.soundProgress.containsKey('s'), true);
        expect(progress.soundProgress['s']!.successRate, 80.0);
      });
    });

    group('submitArticulationAssessment', () {
      test('submits assessment and returns result', () async {
        final mockClient = MockClient((request) async {
          final body = jsonDecode(request.body);
          expect(body['learnerId'], 'learner1');
          expect(body['targetSound'], 's');
          expect(body['attempts'], hasLength(3));

          return http.Response(
            jsonEncode({
              'id': 'assess1',
              'learnerId': 'learner1',
              'timestamp': DateTime.now().toIso8601String(),
              'targetSound': 's',
              'attempts': body['attempts'],
              'overallAccuracy': 0.85,
              'strengths': ['Good initial position'],
              'areasForImprovement': ['Work on medial position'],
            }),
            200,
          );
        });

        service = SpeechTherapyService(client: mockClient);
        final assessment = await service.submitArticulationAssessment(
          'learner1',
          's',
          [
            const ArticulationAttempt(
              word: 'sun',
              position: WordPosition.initial,
              correct: true,
              confidence: 0.9,
            ),
            const ArticulationAttempt(
              word: 'bus',
              position: WordPosition.final_,
              correct: true,
              confidence: 0.85,
            ),
            const ArticulationAttempt(
              word: 'music',
              position: WordPosition.medial,
              correct: false,
              confidence: 0.6,
              error: 'Substitution',
            ),
          ],
        );

        expect(assessment.id, 'assess1');
        expect(assessment.overallAccuracy, 0.85);
        expect(assessment.strengths, hasLength(1));
        expect(assessment.areasForImprovement, hasLength(1));
      });
    });
  });
}
