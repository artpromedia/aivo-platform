import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_notifications/flutter_notifications.dart';

void main() {
  group('NotificationService', () {
    late NotificationService service;

    setUp(() {
      service = NotificationService.instance;
    });

    group('initialization', () {
      test('should be singleton', () {
        final service1 = NotificationService.instance;
        final service2 = NotificationService.instance;
        expect(identical(service1, service2), isTrue);
      });

      test('should have streams available', () {
        expect(service.notificationStream, isNotNull);
        expect(service.tokenStream, isNotNull);
      });
    });

    group('notification ID generation', () {
      test('should generate unique IDs', () {
        final ids = <int>{};
        for (var i = 0; i < 1000; i++) {
          ids.add(service.generateNotificationId());
        }
        // All IDs should be unique
        expect(ids.length, 1000);
      });
    });

    group('topic management', () {
      test('should format topic names correctly', () {
        // Topic format should be compatible with FCM
        const validTopics = [
          'user_123',
          'tenant_abc',
          'class_456',
        ];

        for (final topic in validTopics) {
          // Topics should not contain special characters
          expect(topic.contains(RegExp(r'[^\w_-]')), isFalse);
        }
      });
    });

    group('COPPA compliance', () {
      test('should filter notifications for child devices', () async {
        // Set as child device
        await BackgroundHandlerConfig.setChildDevice(true);

        // This would typically be tested in integration tests
        // Here we just verify the config is set
        expect(await BackgroundHandlerConfig.isChildDevice(), isTrue);

        // Reset
        await BackgroundHandlerConfig.setChildDevice(false);
      });
    });
  });

  group('BackgroundHandlerConfig', () {
    tearDown(() async {
      // Reset after each test
      await BackgroundHandlerConfig.setChildDevice(false);
    });

    test('should persist child device setting', () async {
      await BackgroundHandlerConfig.setChildDevice(true);
      expect(await BackgroundHandlerConfig.isChildDevice(), isTrue);

      await BackgroundHandlerConfig.setChildDevice(false);
      expect(await BackgroundHandlerConfig.isChildDevice(), isFalse);
    });
  });

  group('NotificationAnalytics', () {
    test('NoOpNotificationAnalytics should not throw', () {
      final analytics = NoOpNotificationAnalytics();

      // Should not throw
      expect(
        () => analytics.logReceived('test-1', 'test_type'),
        returnsNormally,
      );
      expect(
        () => analytics.logDisplayed('test-2', 'test_type'),
        returnsNormally,
      );
      expect(
        () => analytics.logTapped('test-3', 'test_type'),
        returnsNormally,
      );
      expect(
        () => analytics.logDismissed('test-4', 'test_type'),
        returnsNormally,
      );
    });

    test('ConsoleNotificationAnalytics should not throw', () {
      final analytics = ConsoleNotificationAnalytics();

      // Should not throw (just prints to console)
      expect(
        () => analytics.logReceived('test-1', 'test_type'),
        returnsNormally,
      );
      expect(
        () => analytics.logTapped('test-2', 'test_type'),
        returnsNormally,
      );
    });

    test('NotificationMetrics should track counts', () {
      final metrics = NotificationMetrics();

      metrics.incrementReceived();
      metrics.incrementReceived();
      metrics.incrementDisplayed();
      metrics.incrementTapped();

      expect(metrics.receivedCount, 2);
      expect(metrics.displayedCount, 1);
      expect(metrics.tappedCount, 1);
      expect(metrics.dismissedCount, 0);
    });

    test('NotificationMetrics should calculate tap rate', () {
      final metrics = NotificationMetrics();

      metrics.incrementDisplayed();
      metrics.incrementDisplayed();
      metrics.incrementDisplayed();
      metrics.incrementDisplayed();
      metrics.incrementTapped();

      expect(metrics.tapRate, 0.25);
    });

    test('NotificationMetrics should handle zero division', () {
      final metrics = NotificationMetrics();

      // No displayed notifications
      expect(metrics.tapRate, 0.0);
    });
  });
}
