/// E2E Test Utilities
///
/// Helper functions for common testing operations.
library;

import 'dart:io';
import 'dart:math';

import '../config/test_config.dart';

/// Logger for test output
class TestLogger {
  TestLogger._();

  static void info(String message) {
    _log('INFO', message);
  }

  static void debug(String message) {
    if (!TestConfig.isCI) {
      _log('DEBUG', message);
    }
  }

  static void warn(String message) {
    _log('WARN', message);
  }

  static void error(String message, [Object? error, StackTrace? stack]) {
    _log('ERROR', message);
    if (error != null) {
      _log('ERROR', error.toString());
    }
    if (stack != null) {
      _log('ERROR', stack.toString());
    }
  }

  static void _log(String level, String message) {
    final timestamp = DateTime.now().toIso8601String();
    // ignore: avoid_print
    print('[$timestamp] [$level] $message');
  }
}

/// Retry utility for flaky operations
class RetryHelper {
  RetryHelper._();

  static Future<T> retry<T>(
    Future<T> Function() operation, {
    int maxAttempts = 3,
    Duration delay = const Duration(milliseconds: 500),
    bool Function(Exception)? retryIf,
  }) async {
    int attempt = 0;
    while (true) {
      attempt++;
      try {
        return await operation();
      } on Exception catch (e) {
        if (attempt >= maxAttempts) {
          rethrow;
        }
        if (retryIf != null && !retryIf(e)) {
          rethrow;
        }
        TestLogger.debug('Retry attempt $attempt after: $e');
        await Future.delayed(delay * attempt);
      }
    }
  }
}

/// Random data generator for tests
class TestDataGenerator {
  TestDataGenerator._();

  static final _random = Random();

  static String randomEmail() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return 'test_$timestamp@aivo-test.com';
  }

  static String randomPassword() {
    return 'Test${_random.nextInt(9999)}Password!';
  }

  static String randomName() {
    const firstNames = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
    return '${firstNames[_random.nextInt(firstNames.length)]} '
        '${lastNames[_random.nextInt(lastNames.length)]}';
  }

  static String randomAccessCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return List.generate(8, (_) => chars[_random.nextInt(chars.length)]).join();
  }

  static int randomGrade() => _random.nextInt(12) + 1;
}

/// Wait utilities
class WaitUtils {
  WaitUtils._();

  static Future<void> waitForCondition(
    bool Function() condition, {
    Duration timeout = const Duration(seconds: 10),
    Duration pollInterval = const Duration(milliseconds: 100),
    String? description,
  }) async {
    final stopwatch = Stopwatch()..start();
    while (stopwatch.elapsed < timeout) {
      if (condition()) return;
      await Future.delayed(pollInterval);
    }
    throw TimeoutException(
      'Condition not met within ${timeout.inSeconds}s: ${description ?? "unknown"}',
    );
  }

  static Future<T> waitForValue<T>(
    Future<T?> Function() getValue, {
    Duration timeout = const Duration(seconds: 10),
    Duration pollInterval = const Duration(milliseconds: 100),
  }) async {
    final stopwatch = Stopwatch()..start();
    while (stopwatch.elapsed < timeout) {
      final value = await getValue();
      if (value != null) return value;
      await Future.delayed(pollInterval);
    }
    throw TimeoutException('Value not available within ${timeout.inSeconds}s');
  }
}

/// Platform utilities
class PlatformUtils {
  PlatformUtils._();

  static bool get isAndroid => Platform.isAndroid;
  static bool get isIOS => Platform.isIOS;

  static Future<void> runAdbCommand(List<String> args) async {
    if (!isAndroid) return;
    final result = await Process.run('adb', args);
    if (result.exitCode != 0) {
      TestLogger.warn('ADB command failed: ${result.stderr}');
    }
  }

  static Future<void> setAirplaneMode(bool enabled) async {
    if (isAndroid) {
      await runAdbCommand([
        'shell',
        'cmd',
        'connectivity',
        'airplane-mode',
        enabled ? 'enable' : 'disable',
      ]);
    }
  }
}

/// Timeout exception
class TimeoutException implements Exception {
  TimeoutException(this.message);
  final String message;

  @override
  String toString() => 'TimeoutException: $message';
}

/// Date/time utilities for tests
class TestDateUtils {
  TestDateUtils._();

  static DateTime get now => DateTime.now();
  static DateTime get today => DateTime(now.year, now.month, now.day);
  static DateTime get tomorrow => today.add(const Duration(days: 1));
  static DateTime get yesterday => today.subtract(const Duration(days: 1));

  static DateTime daysFromNow(int days) => today.add(Duration(days: days));
  static DateTime daysAgo(int days) => today.subtract(Duration(days: days));

  static String formatDate(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}
