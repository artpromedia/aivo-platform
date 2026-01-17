import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'dart:convert';

import 'package:mobile_parent/home_activities/home_activities_api.dart';
import 'package:mobile_parent/home_activities/models.dart';

void main() {
  group('HomeActivitiesApi', () {
    const childId = 'child-123';

    group('Learning Games API', () {
      test('getGames returns list of games', () async {
        final client = MockClient((request) async {
          expect(request.url.path, '/api/parent/learning-games');
          expect(request.url.queryParameters['childId'], childId);
          return http.Response(
            json.encode([
              {
                'id': 'game-1',
                'title': 'Math Challenge',
                'description': 'Practice math skills',
                'category': 'math',
                'skillArea': 'Arithmetic',
                'difficulty': 'beginner',
                'recommendedAge': '6-8',
                'estimatedTime': 15,
                'thumbnailUrl': 'https://example.com/thumbnail.jpg',
                'learningObjectives': ['Add numbers', 'Subtract numbers'],
                'timesPlayed': 5,
                'averageScore': 85.5,
                'isFavorite': false,
              }
            ]),
            200,
          );
        });

        final api = HomeActivitiesApi(client: client);
        final games = await api.getGames(childId: childId);

        expect(games.length, 1);
        expect(games[0].id, 'game-1');
        expect(games[0].title, 'Math Challenge');
        expect(games[0].category, GameCategory.math);
        expect(games[0].difficulty, DifficultyLevel.beginner);
      });

      test('startGameSession creates new session', () async {
        final client = MockClient((request) async {
          expect(request.url.path, '/api/parent/learning-games/game-1/sessions');
          final body = json.decode(request.body);
          expect(body['childId'], childId);
          return http.Response(
            json.encode({
              'id': 'session-1',
              'gameId': 'game-1',
              'childId': childId,
              'startTime': DateTime.now().toIso8601String(),
              'completed': false,
            }),
            201,
          );
        });

        final api = HomeActivitiesApi(client: client);
        final session = await api.startGameSession(gameId: 'game-1', childId: childId);

        expect(session.id, 'session-1');
        expect(session.gameId, 'game-1');
        expect(session.completed, false);
      });
    });

    group('Practice Exercises API', () {
      test('getExercises returns list of exercises', () async {
        final client = MockClient((request) async {
          expect(request.url.path, '/api/parent/practice-exercises');
          return http.Response(
            json.encode([
              {
                'id': 'exercise-1',
                'title': 'Reading Comprehension',
                'description': 'Test reading skills',
                'subject': 'Reading',
                'skillArea': 'Comprehension',
                'difficulty': 'intermediate',
                'questionCount': 10,
                'estimatedTime': 20,
                'tags': ['reading', 'comprehension'],
                'completionRate': 75.0,
                'averageScore': 80.0,
              }
            ]),
            200,
          );
        });

        final api = HomeActivitiesApi(client: client);
        final exercises = await api.getExercises(childId: childId);

        expect(exercises.length, 1);
        expect(exercises[0].title, 'Reading Comprehension');
        expect(exercises[0].questionCount, 10);
      });

      test('submitAnswer records answer', () async {
        final client = MockClient((request) async {
          expect(
            request.url.path,
            '/api/parent/practice-exercises/sessions/session-1/answers',
          );
          final body = json.decode(request.body);
          expect(body['questionId'], 'q1');
          expect(body['answer'], 'Paris');
          return http.Response(
            json.encode({
              'questionId': 'q1',
              'correct': true,
              'feedback': 'Correct!',
              'explanation': 'Paris is the capital of France.',
            }),
            200,
          );
        });

        final api = HomeActivitiesApi(client: client);
        final result = await api.submitAnswer(
          sessionId: 'session-1',
          questionId: 'q1',
          answer: 'Paris',
        );

        expect(result.correct, true);
        expect(result.feedback, 'Correct!');
      });
    });

    group('Skill Builders API', () {
      test('getSkillBuilders returns list of builders', () async {
        final client = MockClient((request) async {
          return http.Response(
            json.encode([
              {
                'id': 'builder-1',
                'title': 'Reading Mastery',
                'description': 'Build reading skills',
                'skillCategory': 'Reading',
                'difficulty': 'intermediate',
                'activities': [
                  {
                    'id': 'activity-1',
                    'title': 'Letter Sounds',
                    'description': 'Learn letter sounds',
                    'instructions': 'Practice each sound',
                    'estimatedTime': 10,
                    'completed': false,
                  }
                ],
                'totalActivities': 1,
                'completedActivities': 0,
                'progressPercentage': 0.0,
                'iconUrl': 'https://example.com/icon.jpg',
              }
            ]),
            200,
          );
        });

        final api = HomeActivitiesApi(client: client);
        final builders = await api.getSkillBuilders(childId: childId);

        expect(builders.length, 1);
        expect(builders[0].title, 'Reading Mastery');
        expect(builders[0].activities.length, 1);
      });

      test('completeSkillBuilderActivity updates activity', () async {
        final client = MockClient((request) async {
          expect(
            request.url.path,
            '/api/parent/skill-builders/sessions/session-1/complete',
          );
          final body = json.decode(request.body);
          expect(body['completed'], true);
          expect(body['score'], 90);
          return http.Response(
            json.encode({
              'id': 'session-1',
              'builderId': 'builder-1',
              'activityId': 'activity-1',
              'childId': childId,
              'completed': true,
              'score': 90,
              'startTime': DateTime.now().toIso8601String(),
              'endTime': DateTime.now().toIso8601String(),
            }),
            200,
          );
        });

        final api = HomeActivitiesApi(client: client);
        final session = await api.completeSkillBuilderActivity(
          sessionId: 'session-1',
          completed: true,
          score: 90,
        );

        expect(session.completed, true);
        expect(session.score, 90);
      });
    });

    group('Family Activities API', () {
      test('getFamilyActivities returns list of activities', () async {
        final client = MockClient((request) async {
          return http.Response(
            json.encode([
              {
                'id': 'activity-1',
                'title': 'Nature Walk',
                'description': 'Explore nature together',
                'type': 'outdoor',
                'minAge': 5,
                'maxAge': 12,
                'estimatedTime': 60,
                'materials': ['Comfortable shoes', 'Water bottle'],
                'instructions': ['Choose a trail', 'Observe nature'],
                'imageUrl': 'https://example.com/image.jpg',
                'learningBenefits': ['Physical activity', 'Nature awareness'],
                'participantCount': 2,
                'averageRating': 4.5,
                'recommended': true,
              }
            ]),
            200,
          );
        });

        final api = HomeActivitiesApi(client: client);
        final activities = await api.getFamilyActivities(childId: childId);

        expect(activities.length, 1);
        expect(activities[0].title, 'Nature Walk');
        expect(activities[0].type, ActivityType.outdoor);
      });

      test('completeFamilyActivity records completion', () async {
        final client = MockClient((request) async {
          expect(
            request.url.path,
            '/api/parent/family-activities/sessions/session-1/complete',
          );
          final body = json.decode(request.body);
          expect(body['rating'], 5);
          expect(body['feedback'], 'Great activity!');
          return http.Response(
            json.encode({
              'id': 'session-1',
              'activityId': 'activity-1',
              'childId': childId,
              'participants': ['parent-1', 'child-1'],
              'startTime': DateTime.now().toIso8601String(),
              'endTime': DateTime.now().toIso8601String(),
              'completed': true,
              'rating': 5,
              'feedback': 'Great activity!',
              'photos': [],
            }),
            200,
          );
        });

        final api = HomeActivitiesApi(client: client);
        final session = await api.completeFamilyActivity(
          sessionId: 'session-1',
          rating: 5,
          feedback: 'Great activity!',
        );

        expect(session.completed, true);
        expect(session.rating, 5);
      });
    });
  });

  group('Models', () {
    test('LearningGame serialization', () {
      final game = LearningGame(
        id: 'game-1',
        title: 'Math Challenge',
        description: 'Practice math',
        category: GameCategory.math,
        skillArea: 'Arithmetic',
        difficulty: DifficultyLevel.beginner,
        recommendedAge: 7,
        estimatedTime: 15,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        learningObjectives: ['Add', 'Subtract'],
        timesPlayed: 5,
        averageScore: 85.5,
        isFavorite: false,
      );

      final json = game.toJson();
      expect(json['id'], 'game-1');
      expect(json['category'], 'math');

      final deserialized = LearningGame.fromJson(json);
      expect(deserialized.title, game.title);
      expect(deserialized.category, game.category);
    });

    test('PracticeExercise serialization', () {
      final exercise = PracticeExercise(
        id: 'ex-1',
        title: 'Reading Test',
        description: 'Test reading',
        subject: 'Reading',
        skillArea: 'Comprehension',
        difficulty: DifficultyLevel.intermediate,
        questionCount: 10,
        estimatedTime: 20,
        tags: ['reading'],
        completionRate: 75.0,
        averageScore: 80.0,
      );

      final json = exercise.toJson();
      final deserialized = PracticeExercise.fromJson(json);
      expect(deserialized.title, exercise.title);
      expect(deserialized.questionCount, exercise.questionCount);
    });

    test('FamilyActivity serialization', () {
      final activity = FamilyActivity(
        id: 'act-1',
        title: 'Nature Walk',
        description: 'Explore nature',
        type: ActivityType.outdoor,
        minAge: 5,
        maxAge: 12,
        estimatedTime: 60,
        materials: ['Shoes'],
        instructions: ['Walk'],
        imageUrl: 'https://example.com/img.jpg',
        learningBenefits: ['Exercise'],
        participantCount: 2,
        averageRating: 4.5,
        recommended: true,
      );

      final json = activity.toJson();
      expect(json['type'], 'outdoor');

      final deserialized = FamilyActivity.fromJson(json);
      expect(deserialized.type, activity.type);
      expect(deserialized.materials.length, 1);
    });
  });
}
