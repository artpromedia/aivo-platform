import 'package:flutter_common/network/circuit_breaker.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('CircuitBreaker', () {
    late CircuitBreaker breaker;

    setUp(() {
      breaker = CircuitBreaker(
        name: 'test-service',
        config: const CircuitBreakerConfig(
          failureThreshold: 3,
          successThreshold: 2,
          resetTimeout: Duration(milliseconds: 100),
        ),
      );
    });

    test('starts in closed state', () {
      expect(breaker.state, CircuitState.closed);
    });

    test('allows requests in closed state', () async {
      var executed = false;
      await breaker.execute(() async {
        executed = true;
        return 'success';
      });
      expect(executed, true);
    });

    test('opens after consecutive failures', () async {
      // Cause failures
      for (var i = 0; i < 3; i++) {
        try {
          await breaker.execute(() async {
            throw Exception('Test error');
          });
        } catch (_) {}
      }

      expect(breaker.state, CircuitState.open);
    });

    test('blocks requests when open', () async {
      // Open the circuit
      for (var i = 0; i < 3; i++) {
        try {
          await breaker.execute(() async {
            throw Exception('Test error');
          });
        } catch (_) {}
      }

      expect(
        () => breaker.execute(() async => 'test'),
        throwsA(isA<CircuitBreakerOpenException>()),
      );
    });

    test('transitions to half-open after reset timeout', () async {
      // Open the circuit
      for (var i = 0; i < 3; i++) {
        try {
          await breaker.execute(() async {
            throw Exception('Test error');
          });
        } catch (_) {}
      }

      expect(breaker.state, CircuitState.open);

      // Wait for reset timeout
      await Future.delayed(const Duration(milliseconds: 150));

      // Next request should be allowed (half-open)
      var requestAllowed = false;
      try {
        await breaker.execute(() async {
          requestAllowed = true;
          return 'success';
        });
      } catch (_) {}

      expect(requestAllowed, true);
      expect(breaker.state, CircuitState.closed); // Success closes circuit
    });

    test('closes after successful requests in half-open', () async {
      // Open the circuit
      for (var i = 0; i < 3; i++) {
        try {
          await breaker.execute(() async {
            throw Exception('Test error');
          });
        } catch (_) {}
      }

      // Wait for reset timeout
      await Future.delayed(const Duration(milliseconds: 150));

      // Make successful requests
      for (var i = 0; i < 2; i++) {
        await breaker.execute(() async => 'success');
      }

      expect(breaker.state, CircuitState.closed);
    });

    test('reopens on failure in half-open', () async {
      // Open the circuit
      for (var i = 0; i < 3; i++) {
        try {
          await breaker.execute(() async {
            throw Exception('Test error');
          });
        } catch (_) {}
      }

      // Wait for reset timeout
      await Future.delayed(const Duration(milliseconds: 150));

      // Fail in half-open
      try {
        await breaker.execute(() async {
          throw Exception('Test error');
        });
      } catch (_) {}

      expect(breaker.state, CircuitState.open);
    });

    test('tracks statistics', () async {
      // Success
      await breaker.execute(() async => 'success');

      // Failure
      try {
        await breaker.execute(() async => throw Exception('error'));
      } catch (_) {}

      final stats = breaker.stats;
      expect(stats.successCount, 1);
      expect(stats.failureCount, 1);
      expect(stats.failureRate, 50);
    });

    test('manual reset works', () async {
      // Open the circuit
      for (var i = 0; i < 3; i++) {
        try {
          await breaker.execute(() async {
            throw Exception('Test error');
          });
        } catch (_) {}
      }

      expect(breaker.state, CircuitState.open);

      breaker.reset();

      expect(breaker.state, CircuitState.closed);
    });

    test('force open works', () {
      breaker.forceOpen();
      expect(breaker.state, CircuitState.open);
    });

    test('force close works', () async {
      // Open first
      for (var i = 0; i < 3; i++) {
        try {
          await breaker.execute(() async {
            throw Exception('Test error');
          });
        } catch (_) {}
      }

      breaker.forceClose();
      expect(breaker.state, CircuitState.closed);
    });
  });

  group('CircuitBreakerRegistry', () {
    setUp(() {
      CircuitBreakerRegistry.instance.resetAll();
    });

    test('creates breakers on demand', () {
      final breaker1 = CircuitBreakerRegistry.instance.get('service-1');
      final breaker2 = CircuitBreakerRegistry.instance.get('service-1');

      expect(identical(breaker1, breaker2), true);
    });

    test('uses provided config', () {
      final breaker = CircuitBreakerRegistry.instance.get(
        'custom-service',
        config: const CircuitBreakerConfig(failureThreshold: 10),
      );

      expect(breaker.name, 'custom-service');
    });

    test('tracks open circuits', () async {
      final breaker = CircuitBreakerRegistry.instance.get(
        'test-service',
        config: const CircuitBreakerConfig(failureThreshold: 1),
      );

      try {
        await breaker.execute(() async => throw Exception('error'));
      } catch (_) {}

      expect(CircuitBreakerRegistry.instance.anyCircuitOpen, true);
      expect(CircuitBreakerRegistry.instance.openCircuits, contains('test-service'));
    });

    test('getAllStats returns all breaker stats', () {
      CircuitBreakerRegistry.instance.get('service-1');
      CircuitBreakerRegistry.instance.get('service-2');

      final stats = CircuitBreakerRegistry.instance.getAllStats();
      expect(stats.keys, containsAll(['service-1', 'service-2']));
    });
  });

  group('CircuitBreakerConfig', () {
    test('standard config has reasonable defaults', () {
      const config = CircuitBreakerConfig.standard;
      expect(config.failureThreshold, 5);
      expect(config.successThreshold, 2);
      expect(config.resetTimeout.inSeconds, 30);
    });

    test('AI service config is more tolerant', () {
      const config = CircuitBreakerConfig.aiService;
      expect(config.failureThreshold, 3);
      expect(config.resetTimeout.inSeconds, 60);
    });

    test('critical config is less tolerant', () {
      const config = CircuitBreakerConfig.critical;
      expect(config.failureThreshold, 3);
      expect(config.resetTimeout.inSeconds, 15);
    });
  });

  group('CircuitBreakerOpenException', () {
    test('contains service info', () {
      const exception = CircuitBreakerOpenException(
        serviceName: 'test-service',
        remainingTime: Duration(seconds: 10),
      );

      expect(exception.serviceName, 'test-service');
      expect(exception.remainingTime.inSeconds, 10);
      expect(exception.toString(), contains('test-service'));
    });
  });
}
