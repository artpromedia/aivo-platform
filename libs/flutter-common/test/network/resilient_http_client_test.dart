import 'package:flutter_common/network/resilient_http_client.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  group('ResilientHttpClient', () {
    test('makes successful GET request', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'GET');
        expect(request.url.path, '/test');
        expect(request.headers['X-Correlation-Id'], isNotEmpty);
        return http.Response('{"success": true}', 200);
      });

      final client = ResilientHttpClient(
        baseUrl: 'https://api.example.com',
        innerClient: mockClient,
        enableLogging: false,
      );

      final response = await client.get('/test');
      expect(response.statusCode, 200);
      expect(response.body, contains('success'));

      client.close();
    });

    test('makes successful POST request with body', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.body, contains('test data'));
        return http.Response('{"id": 123}', 201);
      });

      final client = ResilientHttpClient(
        baseUrl: 'https://api.example.com',
        innerClient: mockClient,
        enableLogging: false,
      );

      final response = await client.post(
        '/items',
        body: {'data': 'test data'},
      );
      expect(response.statusCode, 201);

      client.close();
    });

    test('includes tenant ID in headers', () async {
      final mockClient = MockClient((request) async {
        expect(request.headers['X-Tenant-Id'], 'tenant-123');
        return http.Response('{}', 200);
      });

      final client = ResilientHttpClient(
        baseUrl: 'https://api.example.com',
        tenantId: 'tenant-123',
        innerClient: mockClient,
        enableLogging: false,
      );

      await client.get('/test');
      client.close();
    });

    test('includes custom correlation ID', () async {
      final mockClient = MockClient((request) async {
        expect(request.headers['X-Correlation-Id'], 'custom-id-123');
        return http.Response('{}', 200);
      });

      final client = ResilientHttpClient(
        baseUrl: 'https://api.example.com',
        innerClient: mockClient,
        enableLogging: false,
      );

      await client.get(
        '/test',
        config: const RequestConfig(correlationId: 'custom-id-123'),
      );
      client.close();
    });

    test('adds query parameters to URL', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.queryParameters['page'], '1');
        expect(request.url.queryParameters['limit'], '10');
        return http.Response('{}', 200);
      });

      final client = ResilientHttpClient(
        baseUrl: 'https://api.example.com',
        innerClient: mockClient,
        enableLogging: false,
      );

      await client.get(
        '/items',
        queryParams: {'page': '1', 'limit': '10'},
      );
      client.close();
    });

    test('throws NetworkException on 4xx error', () async {
      final mockClient = MockClient((request) async {
        return http.Response('{"error": "Not found"}', 404);
      });

      final client = ResilientHttpClient(
        baseUrl: 'https://api.example.com',
        innerClient: mockClient,
        enableLogging: false,
      );

      expect(
        () => client.get('/notfound'),
        throwsA(isA<NetworkException>()
            .having((e) => e.statusCode, 'statusCode', 404)
            .having((e) => e.type, 'type', NetworkErrorType.clientError)),
      );

      client.close();
    });
  });

  group('RetryConfig', () {
    test('calculates exponential backoff delay', () {
      const config = RetryConfig(
        initialDelay: Duration(milliseconds: 100),
        backoffMultiplier: 2.0,
        jitterFactor: 0, // Disable jitter for predictable testing
      );

      expect(config.delayForAttempt(1), Duration.zero);
      
      // Second attempt: initialDelay * 2^0 = 100ms
      final delay2 = config.delayForAttempt(2);
      expect(delay2.inMilliseconds, closeTo(100, 20));
      
      // Third attempt: initialDelay * 2^1 = 200ms
      final delay3 = config.delayForAttempt(3);
      expect(delay3.inMilliseconds, closeTo(200, 40));
    });

    test('caps delay at maxDelay', () {
      const config = RetryConfig(
        initialDelay: Duration(seconds: 1),
        maxDelay: Duration(seconds: 5),
        backoffMultiplier: 10.0,
        jitterFactor: 0,
      );

      // Would be 10 seconds without cap
      final delay = config.delayForAttempt(3);
      expect(delay.inSeconds, lessThanOrEqualTo(5));
    });
  });

  group('NetworkTimeouts', () {
    test('has appropriate timeout durations', () {
      expect(NetworkTimeouts.quick.inSeconds, 5);
      expect(NetworkTimeouts.standard.inSeconds, 10);
      expect(NetworkTimeouts.heavy.inSeconds, 30);
      expect(NetworkTimeouts.aiOperation.inSeconds, 45);
    });
  });

  group('NetworkException', () {
    test('provides user-friendly messages', () {
      expect(
        const NetworkException(
          type: NetworkErrorType.connectionTimeout,
          message: 'test',
        ).userMessage,
        contains('slow'),
      );

      expect(
        const NetworkException(
          type: NetworkErrorType.rateLimited,
          message: 'test',
        ).userMessage,
        contains('Too many requests'),
      );
    });
  });

  group('NetworkTelemetry', () {
    setUp(() {
      NetworkTelemetry.instance.reset();
    });

    test('records errors', () {
      NetworkTelemetry.instance.recordError(NetworkErrorType.connectionTimeout);
      NetworkTelemetry.instance.recordError(NetworkErrorType.connectionTimeout);
      NetworkTelemetry.instance.recordError(NetworkErrorType.serverError);

      final metrics = NetworkTelemetry.instance.getMetrics();
      expect(metrics.errorCounts[NetworkErrorType.connectionTimeout], 2);
      expect(metrics.errorCounts[NetworkErrorType.serverError], 1);
      expect(metrics.totalErrors, 3);
    });

    test('records request durations', () {
      NetworkTelemetry.instance.recordRequestDuration('/api/test', 100);
      NetworkTelemetry.instance.recordRequestDuration('/api/test', 200);
      NetworkTelemetry.instance.recordRequestDuration('/api/test', 150);

      final metrics = NetworkTelemetry.instance.getMetrics();
      expect(metrics.averageDurations['/api/test'], 150);
    });
  });

  group('NetworkErrorAggregator', () {
    test('debounces error notifications', () async {
      var notificationCount = 0;
      final aggregator = NetworkErrorAggregator(
        debounceInterval: const Duration(milliseconds: 100),
        onNotify: (message, count) {
          notificationCount++;
        },
      );

      // Add multiple errors
      aggregator.addError(const NetworkException(
        type: NetworkErrorType.serverError,
        message: 'Error 1',
      ));
      aggregator.addError(const NetworkException(
        type: NetworkErrorType.serverError,
        message: 'Error 2',
      ));
      aggregator.addError(const NetworkException(
        type: NetworkErrorType.serverError,
        message: 'Error 3',
      ));

      // Should not have notified yet
      expect(notificationCount, 0);

      // Wait for debounce
      await Future.delayed(const Duration(milliseconds: 150));

      // Should have exactly one notification
      expect(notificationCount, 1);

      aggregator.dispose();
    });
  });
}
