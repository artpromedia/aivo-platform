/// Sessions Provider Unit Tests
///
/// Tests for the sessions provider.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mobile_teacher/models/models.dart';
import 'package:mobile_teacher/providers/sessions_provider.dart';

import '../../mocks/mock_providers.dart';
import '../../mocks/fixtures/sessions.dart';

void main() {
  late ProviderContainer container;

  setUpAll(() {
    registerFallbackValue(TestSessions.mathSession);
  });

  setUp(() {
    setupDefaultMocks();
    container = ProviderContainer(overrides: defaultMockProviders);
  });

  tearDown(() {
    container.dispose();
    resetAllMocks();
  });

  group('SessionsProvider', () {
    group('sessionsProvider', () {
      test('should load all sessions', () async {
        // Arrange
        when(() => mockSessionRepository.getSessions())
            .thenAnswer((_) async => TestSessions.all);

        // Act - Use notifier to load sessions
        await container.read(sessionsProvider.notifier).loadSessions();
        final state = container.read(sessionsProvider);

        // Assert
        expect(state.sessions, equals(TestSessions.all));
      });
    });

    group('activeSessionsProvider', () {
      test('should return only active sessions', () async {
        // Arrange
        when(() => mockSessionRepository.getActiveSessions(any()))
            .thenAnswer((_) async => TestSessions.active);

        // Act
        final sessions = await container.read(activeSessionsByClassProvider('class-1').future);

        // Assert
        expect(sessions.every((s) => s.isActive), isTrue);
        expect(sessions, hasLength(TestSessions.active.length));
      });

      test('should return empty list when no active sessions', () async {
        // Arrange
        when(() => mockSessionRepository.getActiveSessions(any()))
            .thenAnswer((_) async => []);

        // Act
        final sessions = await container.read(activeSessionsByClassProvider('class-1').future);

        // Assert
        expect(sessions, isEmpty);
      });
    });

    group('sessionProvider', () {
      test('should return specific session by id', () async {
        // Arrange
        when(() => mockSessionRepository.getSession('session-math-1'))
            .thenAnswer((_) async => TestSessions.mathSession);

        // Act
        final session = await container
            .read(sessionProvider('session-math-1').future);

        // Assert
        expect(session, equals(TestSessions.mathSession));
        expect(session?.title, contains('Multiplication'));
      });
    });

    group('sessionsByClassProvider', () {
      test('should return sessions for a specific class', () async {
        // Arrange
        final classSessions = TestSessions.all
            .where((s) => s.classId == 'class-math-5')
            .toList();
        when(() => mockSessionRepository.getSessionsByClass('class-math-5'))
            .thenAnswer((_) async => classSessions);

        // Act
        final sessions = await container
            .read(sessionsByClassProvider('class-math-5').future);

        // Assert
        expect(sessions, isNotEmpty);
        expect(sessions.every((s) => s.classId == 'class-math-5'), isTrue);
      });
    });

    group('todaysSessionsProvider', () {
      test('should filter sessions for today', () async {
        // Arrange
        final today = DateTime.now();
        final todaySession = TestSessions.create(
          scheduledAt: today,
          status: SessionStatus.scheduled,
        );
        when(() => mockSessionRepository.getSessions())
            .thenAnswer((_) async => [...TestSessions.all, todaySession]);

        // Act - Load sessions first
        await container.read(sessionsProvider.notifier).loadSessions();
        final sessions = container.read(todaysSessionsProvider);

        // Assert
        for (final session in sessions) {
          if (session.scheduledAt != null) {
            expect(session.scheduledAt!.day, equals(today.day));
          }
        }
      });
    });

    group('upcomingSessionsProvider', () {
      test('should return future scheduled sessions', () async {
        // Arrange
        final futureDate = DateTime.now().add(const Duration(days: 1));
        final futureSession = TestSessions.create(
          scheduledAt: futureDate,
          status: SessionStatus.scheduled,
        );
        when(() => mockSessionRepository.getSessions())
            .thenAnswer((_) async => [...TestSessions.all, futureSession]);

        // Act - Load sessions first
        await container.read(sessionsProvider.notifier).loadSessions();
        final sessions = container.read(upcomingSessionsProvider);

        // Assert
        for (final session in sessions) {
          expect(session.status, equals(SessionStatus.scheduled));
        }
      });
    });
  });

  group('SessionsNotifier', () {
    group('createSession', () {
      test('should create new session via repository', () async {
        // Arrange
        final newSession = TestSessions.create(
          title: 'New Test Session',
          classId: 'class-math-5',
        );
        final dto = CreateSessionDto(
          classId: 'class-math-5',
          title: 'New Test Session',
          sessionType: SessionType.individual,
          studentIds: [],
        );
        when(() => mockSessionRepository.createSession(any()))
            .thenAnswer((_) async => newSession);

        // Act
        final result = await container
            .read(sessionsProvider.notifier)
            .createSession(dto);

        // Assert
        expect(result.title, equals(newSession.title));
        verify(() => mockSessionRepository.createSession(any())).called(1);
      });
    });

    group('startSession', () {
      test('should update session status to active', () async {
        // Arrange
        final startedSession = TestSessions.scheduledSession.copyWith(
          status: SessionStatus.active,
          startedAt: DateTime.now(),
        );
        when(() => mockSessionRepository.startSession(any()))
            .thenAnswer((_) async => startedSession);

        // Act
        await container
            .read(sessionsProvider.notifier)
            .startSession(TestSessions.scheduledSession.id);

        // Assert
        verify(() => mockSessionRepository.startSession(any())).called(1);
      });
    });

    group('endSession', () {
      test('should update session status to completed', () async {
        // Arrange
        final completedSession = TestSessions.mathSession.copyWith(
          status: SessionStatus.completed,
          endedAt: DateTime.now(),
        );
        when(() => mockSessionRepository.endSession(any(), notes: any(named: 'notes')))
            .thenAnswer((_) async => completedSession);

        // Act
        await container
            .read(sessionsProvider.notifier)
            .endSession(TestSessions.mathSession.id);

        // Assert
        verify(() => mockSessionRepository.endSession(any(), notes: any(named: 'notes'))).called(1);
      });

      test('should add notes when ending session', () async {
        // Arrange
        final completedSession = TestSessions.mathSession.copyWith(
          status: SessionStatus.completed,
          endedAt: DateTime.now(),
        );
        when(() => mockSessionRepository.endSession(any(), notes: any(named: 'notes')))
            .thenAnswer((_) async => completedSession);

        // Act
        await container
            .read(sessionsProvider.notifier)
            .endSession(
              TestSessions.mathSession.id,
              notes: 'Session went well',
            );

        // Assert
        verify(() => mockSessionRepository.endSession(any(), notes: 'Session went well')).called(1);
      });
    });
  });
}
