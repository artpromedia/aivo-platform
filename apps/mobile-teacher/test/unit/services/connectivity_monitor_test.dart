/// Connectivity Monitor Unit Tests
///
/// Tests for connectivity monitoring service.
library;

import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mobile_teacher/services/sync/connectivity_monitor.dart';
import 'package:flutter_common/flutter_common.dart';

class MockConnectivityService extends Mock implements ConnectivityService {}

void main() {
  late ConnectivityMonitor monitor;
  late MockConnectivityService mockService;
  late StreamController<bool> connectivityController;

  setUp(() {
    mockService = MockConnectivityService();
    connectivityController = StreamController<bool>.broadcast();

    when(() => mockService.isOnline).thenReturn(true);
    when(() => mockService.onConnectivityChanged)
        .thenAnswer((_) => connectivityController.stream);

    monitor = ConnectivityMonitor(service: mockService);
  });

  tearDown(() {
    connectivityController.close();
    monitor.dispose();
  });

  group('ConnectivityMonitor', () {
    group('isOnline', () {
      test('should return true when service reports online', () async {
        when(() => mockService.isOnline).thenReturn(true);

        final result = await monitor.isOnline;

        expect(result, isTrue);
      });

      test('should return false when service reports offline', () async {
        when(() => mockService.isOnline).thenReturn(false);

        final result = await monitor.isOnline;

        expect(result, isFalse);
      });
    });

    group('isOnlineSync', () {
      test('should return synchronous value', () {
        when(() => mockService.isOnline).thenReturn(true);

        expect(monitor.isOnlineSync, isTrue);
      });
    });

    group('stateStream', () {
      test('should emit connectivity changes', () async {
        final states = <bool>[];
        monitor.stateStream.listen(states.add);

        connectivityController.add(true);
        connectivityController.add(false);
        connectivityController.add(true);

        await Future.delayed(const Duration(milliseconds: 50));

        expect(states, equals([true, false, true]));
      });

      test('should debounce rapid changes', () async {
        final states = <bool>[];
        monitor.stateStream.listen(states.add);

        // Rapid toggling
        for (var i = 0; i < 10; i++) {
          connectivityController.add(i.isEven);
        }

        await Future.delayed(const Duration(milliseconds: 200));

        // Should have fewer events due to debouncing
        expect(states.length, lessThan(10));
      });
    });

    group('connectivity callbacks', () {
      test('should call onOnline callback when coming online', () async {
        var onlineCalled = false;
        monitor.onOnline = () => onlineCalled = true;

        connectivityController.add(false);
        await Future.delayed(const Duration(milliseconds: 10));
        connectivityController.add(true);
        await Future.delayed(const Duration(milliseconds: 50));

        expect(onlineCalled, isTrue);
      });

      test('should call onOffline callback when going offline', () async {
        var offlineCalled = false;
        monitor.onOffline = () => offlineCalled = true;

        connectivityController.add(true);
        await Future.delayed(const Duration(milliseconds: 10));
        connectivityController.add(false);
        await Future.delayed(const Duration(milliseconds: 50));

        expect(offlineCalled, isTrue);
      });
    });

    group('dispose', () {
      test('should cancel subscription on dispose', () {
        final states = <bool>[];
        monitor.stateStream.listen(states.add);

        monitor.dispose();

        // Should not receive events after dispose
        connectivityController.add(false);

        expect(states, isEmpty);
      });
    });
  });
}
