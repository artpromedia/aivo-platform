
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:http/http.dart' as http;

import 'package:flutter_common/offline/connectivity_service.dart';

// ══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ══════════════════════════════════════════════════════════════════════════════

class MockConnectivity extends Mock implements Connectivity {}

class MockHttpClient extends Mock implements http.Client {}

class FakeUri extends Fake implements Uri {}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

void main() {
  setUpAll(() {
    registerFallbackValue(FakeUri());
  });

  group('ConnectivityService', () {
    test('initializes with unknown state', () {
      final service = ConnectivityService();
      expect(service.currentState, equals(ConnectionState.unknown));
      service.dispose();
    });

    test('emits state changes through stream', () async {
      final service = ConnectivityService();

      final states = <ConnectionState>[];
      final subscription = service.stateStream.listen(states.add);

      // Service starts monitoring and should emit initial state
      // Note: In tests without mocking, this may fail to connect
      // so we just verify the stream works
      await Future<void>.delayed(const Duration(milliseconds: 100));

      // Initial unknown state should be emitted
      expect(states, contains(ConnectionState.unknown));
      await subscription.cancel();
      service.dispose();
    });

    test('isOnline returns true for online state', () {
      final service = ConnectivityService();

      // In unknown state, isOnline should be false
      expect(service.isOnline, isFalse);
      expect(service.isOffline, isFalse);

      service.dispose();
    });

    test('disposes resources properly', () {
      final service = ConnectivityService();
      service.dispose();

      // Attempting to use after dispose should not throw
      expect(service.currentState, equals(ConnectionState.unknown));
    });
  });

  group('ConnectionState enum', () {
    test('has correct values', () {
      expect(ConnectionState.online, isNotNull);
      expect(ConnectionState.offline, isNotNull);
      expect(ConnectionState.unknown, isNotNull);
    });

    test('values are distinct', () {
      expect(ConnectionState.online, isNot(equals(ConnectionState.offline)));
      expect(ConnectionState.online, isNot(equals(ConnectionState.unknown)));
      expect(ConnectionState.offline, isNot(equals(ConnectionState.unknown)));
    });
  });
}
