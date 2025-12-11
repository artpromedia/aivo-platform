import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mocktail/mocktail.dart';

import 'package:flutter_common/shared_device/shared_device.dart';
import 'package:flutter_common/device/device.dart';

class MockDeviceService extends Mock implements DeviceService {}

void main() {
  group('SharedDeviceService', () {
    late SharedDeviceService service;
    late MockDeviceService mockDeviceService;
    late MockClient mockHttpClient;

    setUp(() {
      mockDeviceService = MockDeviceService();
      
      // Default device service behavior
      when(() => mockDeviceService.effectivePolicy).thenReturn(
        DevicePolicy(kioskMode: true),
      );
      when(() => mockDeviceService.registration).thenReturn(
        DeviceRegistration(
          deviceId: 'device-123',
          tenantId: 'tenant-456',
          deviceIdentifier: 'test-device',
          deviceType: DeviceType.iosTablet,
        ),
      );
    });

    test('isSharedMode returns true when kioskMode enabled', () {
      when(() => mockDeviceService.effectivePolicy).thenReturn(
        DevicePolicy(kioskMode: true),
      );

      service = SharedDeviceService(
        baseUrl: 'https://api.test',
        tenantId: 'tenant-456',
        deviceService: mockDeviceService,
      );

      expect(service.isSharedMode, isTrue);
    });

    test('isSharedMode returns true when pool has gradeBand', () {
      when(() => mockDeviceService.effectivePolicy).thenReturn(
        DevicePolicy(kioskMode: false),
      );
      when(() => mockDeviceService.registration).thenReturn(
        DeviceRegistration(
          deviceId: 'device-123',
          tenantId: 'tenant-456',
          deviceIdentifier: 'test-device',
          deviceType: DeviceType.iosTablet,
          pools: [
            DevicePoolInfo(id: 'pool-1', name: 'Grade 3 iPads', gradeBand: GradeBand.g35),
          ],
        ),
      );

      service = SharedDeviceService(
        baseUrl: 'https://api.test',
        tenantId: 'tenant-456',
        deviceService: mockDeviceService,
      );

      expect(service.isSharedMode, isTrue);
    });

    test('isSharedMode returns false when not in kiosk mode and no pool gradeBand', () {
      when(() => mockDeviceService.effectivePolicy).thenReturn(
        DevicePolicy(kioskMode: false),
      );
      when(() => mockDeviceService.registration).thenReturn(
        DeviceRegistration(
          deviceId: 'device-123',
          tenantId: 'tenant-456',
          deviceIdentifier: 'test-device',
          deviceType: DeviceType.iosTablet,
          pools: [], // No pools
        ),
      );

      service = SharedDeviceService(
        baseUrl: 'https://api.test',
        tenantId: 'tenant-456',
        deviceService: mockDeviceService,
      );

      expect(service.isSharedMode, isFalse);
    });

    test('validateClassCode returns roster on success', () async {
      final rosterJson = {
        'classroomId': 'class-789',
        'classroomName': 'Mrs. Smith\'s Class',
        'teacherName': 'Mrs. Smith',
        'gradeBand': 'G3_5',
        'displayMode': 'FIRST_NAME_LAST_INITIAL',
        'learners': [
          {
            'learnerId': 'learner-1',
            'displayName': 'Alice A.',
            'hasPin': true,
          },
          {
            'learnerId': 'learner-2',
            'displayName': 'Bob B.',
            'hasPin': true,
          },
        ],
        'fetchedAt': DateTime.now().toIso8601String(),
      };

      mockHttpClient = MockClient((request) async {
        expect(request.url.path, contains('/session-codes/validate'));
        expect(request.method, 'POST');
        return http.Response(jsonEncode(rosterJson), 200);
      });

      service = SharedDeviceService(
        baseUrl: 'https://api.test',
        tenantId: 'tenant-456',
        deviceService: mockDeviceService,
        httpClient: mockHttpClient,
      );

      final roster = await service.validateClassCode('ABC123');

      expect(roster.classroomId, 'class-789');
      expect(roster.classroomName, 'Mrs. Smith\'s Class');
      expect(roster.learners.length, 2);
      expect(roster.learners[0].displayName, 'Alice A.');
    });

    test('validateClassCode throws on invalid code', () async {
      mockHttpClient = MockClient((request) async {
        return http.Response('{"error": "Invalid class code"}', 404);
      });

      service = SharedDeviceService(
        baseUrl: 'https://api.test',
        tenantId: 'tenant-456',
        deviceService: mockDeviceService,
        httpClient: mockHttpClient,
      );

      expect(
        () => service.validateClassCode('INVALID'),
        throwsA(isA<SharedDeviceException>().having(
          (e) => e.code,
          'code',
          'INVALID_CODE',
        )),
      );
    });

    test('validateClassCode throws on expired code', () async {
      mockHttpClient = MockClient((request) async {
        return http.Response('{"error": "Code expired"}', 410);
      });

      service = SharedDeviceService(
        baseUrl: 'https://api.test',
        tenantId: 'tenant-456',
        deviceService: mockDeviceService,
        httpClient: mockHttpClient,
      );

      expect(
        () => service.validateClassCode('EXPIRED'),
        throwsA(isA<SharedDeviceException>().having(
          (e) => e.code,
          'code',
          'CODE_EXPIRED',
        )),
      );
    });

    test('startSession creates session on valid PIN', () async {
      // First set up roster
      final rosterJson = {
        'classroomId': 'class-789',
        'classroomName': 'Mrs. Smith\'s Class',
        'teacherName': 'Mrs. Smith',
        'displayMode': 'FIRST_NAME_LAST_INITIAL',
        'learners': [
          {
            'learnerId': 'learner-1',
            'displayName': 'Alice A.',
            'hasPin': true,
          },
        ],
        'fetchedAt': DateTime.now().toIso8601String(),
      };

      var requestCount = 0;
      mockHttpClient = MockClient((request) async {
        requestCount++;
        if (request.url.path.contains('session-codes/validate')) {
          return http.Response(jsonEncode(rosterJson), 200);
        }
        if (request.url.path.contains('validate-pin')) {
          return http.Response(jsonEncode({'valid': true}), 200);
        }
        return http.Response('Not found', 404);
      });

      service = SharedDeviceService(
        baseUrl: 'https://api.test',
        tenantId: 'tenant-456',
        deviceService: mockDeviceService,
        httpClient: mockHttpClient,
      );

      // Load roster
      await service.validateClassCode('ABC123');
      expect(service.roster, isNotNull);

      // Start session
      final session = await service.startSession('learner-1', '1234');

      expect(session.learnerId, 'learner-1');
      expect(session.learnerDisplayName, 'Alice A.');
      expect(session.classroomId, 'class-789');
      expect(service.currentLearnerId, 'learner-1');
      expect(service.activeSession, isNotNull);
    });

    test('startSession throws on invalid PIN', () async {
      // First set up roster
      final rosterJson = {
        'classroomId': 'class-789',
        'classroomName': 'Mrs. Smith\'s Class',
        'teacherName': 'Mrs. Smith',
        'displayMode': 'FIRST_NAME_LAST_INITIAL',
        'learners': [
          {
            'learnerId': 'learner-1',
            'displayName': 'Alice A.',
            'hasPin': true,
          },
        ],
        'fetchedAt': DateTime.now().toIso8601String(),
      };

      mockHttpClient = MockClient((request) async {
        if (request.url.path.contains('session-codes/validate')) {
          return http.Response(jsonEncode(rosterJson), 200);
        }
        if (request.url.path.contains('validate-pin')) {
          return http.Response(
            jsonEncode({'error': 'Incorrect PIN', 'remainingAttempts': 4}),
            401,
          );
        }
        return http.Response('Not found', 404);
      });

      service = SharedDeviceService(
        baseUrl: 'https://api.test',
        tenantId: 'tenant-456',
        deviceService: mockDeviceService,
        httpClient: mockHttpClient,
      );

      await service.validateClassCode('ABC123');

      expect(
        () => service.startSession('learner-1', 'wrong'),
        throwsA(isA<SharedDeviceException>().having(
          (e) => e.code,
          'code',
          'INVALID_PIN',
        )),
      );
    });

    test('startSession throws on PIN lockout', () async {
      final rosterJson = {
        'classroomId': 'class-789',
        'classroomName': 'Test Class',
        'teacherName': 'Teacher',
        'displayMode': 'FIRST_NAME_LAST_INITIAL',
        'learners': [
          {'learnerId': 'learner-1', 'displayName': 'Alice A.', 'hasPin': true},
        ],
        'fetchedAt': DateTime.now().toIso8601String(),
      };

      mockHttpClient = MockClient((request) async {
        if (request.url.path.contains('session-codes/validate')) {
          return http.Response(jsonEncode(rosterJson), 200);
        }
        if (request.url.path.contains('validate-pin')) {
          return http.Response(
            jsonEncode({'error': 'Too many attempts'}),
            423,
          );
        }
        return http.Response('Not found', 404);
      });

      service = SharedDeviceService(
        baseUrl: 'https://api.test',
        tenantId: 'tenant-456',
        deviceService: mockDeviceService,
        httpClient: mockHttpClient,
      );

      await service.validateClassCode('ABC123');

      expect(
        () => service.startSession('learner-1', 'wrong'),
        throwsA(isA<SharedDeviceException>().having(
          (e) => e.code,
          'code',
          'PIN_LOCKED',
        )),
      );
    });

    test('endSession clears currentLearnerId', () async {
      final rosterJson = {
        'classroomId': 'class-789',
        'classroomName': 'Test Class',
        'teacherName': 'Teacher',
        'displayMode': 'FIRST_NAME_LAST_INITIAL',
        'learners': [
          {'learnerId': 'learner-1', 'displayName': 'Alice A.', 'hasPin': true},
        ],
        'fetchedAt': DateTime.now().toIso8601String(),
      };

      mockHttpClient = MockClient((request) async {
        if (request.url.path.contains('session-codes/validate')) {
          return http.Response(jsonEncode(rosterJson), 200);
        }
        if (request.url.path.contains('validate-pin')) {
          return http.Response(jsonEncode({'valid': true}), 200);
        }
        if (request.url.path.contains('end-session')) {
          return http.Response(jsonEncode({'success': true}), 200);
        }
        return http.Response('Not found', 404);
      });

      service = SharedDeviceService(
        baseUrl: 'https://api.test',
        tenantId: 'tenant-456',
        deviceService: mockDeviceService,
        httpClient: mockHttpClient,
      );

      await service.validateClassCode('ABC123');
      await service.startSession('learner-1', '1234');

      expect(service.currentLearnerId, 'learner-1');
      expect(service.activeSession, isNotNull);

      await service.endSession();

      expect(service.currentLearnerId, isNull);
      expect(service.activeSession, isNull);
      // Roster should still be available
      expect(service.roster, isNotNull);
    });

    test('session updates stream emits on start and end', () async {
      final rosterJson = {
        'classroomId': 'class-789',
        'classroomName': 'Test Class',
        'teacherName': 'Teacher',
        'displayMode': 'FIRST_NAME_LAST_INITIAL',
        'learners': [
          {'learnerId': 'learner-1', 'displayName': 'Alice A.', 'hasPin': true},
        ],
        'fetchedAt': DateTime.now().toIso8601String(),
      };

      mockHttpClient = MockClient((request) async {
        if (request.url.path.contains('session-codes/validate')) {
          return http.Response(jsonEncode(rosterJson), 200);
        }
        if (request.url.path.contains('validate-pin')) {
          return http.Response(jsonEncode({'valid': true}), 200);
        }
        if (request.url.path.contains('end-session')) {
          return http.Response(jsonEncode({'success': true}), 200);
        }
        return http.Response('Not found', 404);
      });

      service = SharedDeviceService(
        baseUrl: 'https://api.test',
        tenantId: 'tenant-456',
        deviceService: mockDeviceService,
        httpClient: mockHttpClient,
      );

      final sessionUpdates = <SharedDeviceSession?>[];
      service.sessionUpdates.listen(sessionUpdates.add);

      await service.validateClassCode('ABC123');
      await service.startSession('learner-1', '1234');
      await service.endSession();

      // Wait for stream events
      await Future.delayed(Duration.zero);

      expect(sessionUpdates.length, 2);
      expect(sessionUpdates[0]?.learnerId, 'learner-1');
      expect(sessionUpdates[1], isNull);
    });
  });

  group('SharedDeviceModels', () {
    test('RosterLearner.getDisplayName respects privacy mode', () {
      final learner = RosterLearner(
        learnerId: 'learner-1',
        displayName: 'Alice Anderson',
        pseudonym: 'Blue Tiger 7',
      );

      expect(
        learner.getDisplayName(RosterDisplayMode.firstNameLastInitial),
        'Alice Anderson',
      );
      expect(
        learner.getDisplayName(RosterDisplayMode.firstNameOnly),
        'Alice',
      );
      expect(
        learner.getDisplayName(RosterDisplayMode.pseudonym),
        'Blue Tiger 7',
      );
    });

    test('ClassSessionCode.isValid checks active and not expired', () {
      final validCode = ClassSessionCode(
        code: 'ABC123',
        classroomId: 'class-1',
        classroomName: 'Test Class',
        teacherId: 'teacher-1',
        teacherName: 'Teacher',
        expiresAt: DateTime.now().add(const Duration(hours: 8)),
        isActive: true,
      );
      expect(validCode.isValid, isTrue);
      expect(validCode.isExpired, isFalse);

      final expiredCode = ClassSessionCode(
        code: 'ABC123',
        classroomId: 'class-1',
        classroomName: 'Test Class',
        teacherId: 'teacher-1',
        teacherName: 'Teacher',
        expiresAt: DateTime.now().subtract(const Duration(hours: 1)),
        isActive: true,
      );
      expect(expiredCode.isValid, isFalse);
      expect(expiredCode.isExpired, isTrue);

      final inactiveCode = ClassSessionCode(
        code: 'ABC123',
        classroomId: 'class-1',
        classroomName: 'Test Class',
        teacherId: 'teacher-1',
        teacherName: 'Teacher',
        expiresAt: DateTime.now().add(const Duration(hours: 8)),
        isActive: false,
      );
      expect(inactiveCode.isValid, isFalse);
    });

    test('SharedDeviceState tracks session state correctly', () {
      const initial = SharedDeviceState();
      expect(initial.isSharedMode, isFalse);
      expect(initial.hasActiveSession, isFalse);
      expect(initial.currentLearnerId, isNull);

      final withSession = initial.copyWith(
        mode: DeviceMode.shared,
        activeSession: SharedDeviceSession(
          sessionId: 'session-1',
          classroomId: 'class-1',
          classroomName: 'Test Class',
          learnerId: 'learner-1',
          learnerDisplayName: 'Alice',
          startedAt: DateTime.now(),
        ),
      );
      expect(withSession.isSharedMode, isTrue);
      expect(withSession.hasActiveSession, isTrue);
      expect(withSession.currentLearnerId, 'learner-1');

      final cleared = withSession.copyWith(clearSession: true);
      expect(cleared.isSharedMode, isTrue);
      expect(cleared.hasActiveSession, isFalse);
      expect(cleared.currentLearnerId, isNull);
    });
  });
}
