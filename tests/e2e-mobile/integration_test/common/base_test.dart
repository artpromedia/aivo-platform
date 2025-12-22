/// Base E2E Test Class
///
/// Abstract base class providing common functionality for all E2E tests.
/// Handles setup, teardown, screenshots, and common utilities.
library;

import 'dart:async';
import 'dart:io';

import 'package:patrol/patrol.dart';

import '../config/test_config.dart';
import '../../fixtures/api_mocks.dart';
import 'test_utils.dart';

/// Base class for all E2E tests
abstract class BaseE2ETest {
  /// Patrol tester instance
  late PatrolIntegrationTester $;

  /// Test start time for duration tracking
  late DateTime _testStartTime;

  /// Screenshot counter for ordering
  int _screenshotCounter = 0;

  /// Test name for logging
  String get testName;

  /// Package name for Android
  String get androidPackageName;

  /// Bundle ID for iOS
  String get iosBundleId;

  /// Get appropriate app identifier for current platform
  String get appIdentifier {
    if (Platform.isAndroid) {
      return androidPackageName;
    } else {
      return iosBundleId;
    }
  }

  /// Setup before each test
  Future<void> setUp(PatrolIntegrationTester tester) async {
    $ = tester;
    _testStartTime = DateTime.now();
    _screenshotCounter = 0;

    TestLogger.info('Starting test: $testName');

    // Clear app data for clean slate
    await clearAppData();

    // Reset test state on backend
    await resetTestState();

    // Handle any initial system dialogs
    await handleSystemDialogs();
  }

  /// Teardown after each test
  Future<void> tearDown() async {
    final duration = DateTime.now().difference(_testStartTime);
    TestLogger.info('Test completed in ${duration.inSeconds}s: $testName');

    // Capture final state screenshot
    await captureScreenshot('final_state');

    // Close app
    try {
      await $.native.closeApp();
    } catch (e) {
      TestLogger.warn('Failed to close app: $e');
    }
  }

  /// Clear app data for clean slate
  Future<void> clearAppData() async {
    TestLogger.debug('Clearing app data...');

    try {
      if (Platform.isAndroid) {
        await $.native.pressHome();
        // Use ADB to clear app data
        final result = await Process.run('adb', [
          'shell',
          'pm',
          'clear',
          androidPackageName,
        ]);
        if (result.exitCode != 0) {
          TestLogger.warn('Failed to clear Android app data: ${result.stderr}');
        }
      } else {
        // iOS: Terminate and reset app state
        await $.native.pressHome();
        // Note: Full data clear on iOS requires uninstall/reinstall
        // For testing purposes, we rely on the app's test mode to reset
      }
    } catch (e) {
      TestLogger.warn('Error clearing app data: $e');
    }
  }

  /// Reset test state on backend
  Future<void> resetTestState() async {
    TestLogger.debug('Resetting test state on backend...');
    try {
      await TestApiClient.resetTestData();
    } catch (e) {
      TestLogger.warn('Failed to reset test state: $e');
    }
  }

  /// Capture screenshot for debugging
  Future<void> captureScreenshot(String name) async {
    if (!TestConfig.screenshotOnFailure && !TestConfig.screenshotAtSteps) {
      return;
    }

    try {
      _screenshotCounter++;
      final filename = '${_screenshotCounter.toString().padLeft(3, '0')}_$name';
      await $.native.takeScreenshot(name: filename);
      TestLogger.debug('Screenshot captured: $filename');
    } catch (e) {
      TestLogger.warn('Failed to capture screenshot: $e');
    }
  }

  /// Capture screenshot at key step
  Future<void> step(String description) async {
    TestLogger.info('Step: $description');
    if (TestConfig.screenshotAtSteps) {
      await captureScreenshot(description.replaceAll(' ', '_').toLowerCase());
    }
  }

  /// Wait for element with retry
  Future<void> waitForElement(
    PatrolFinder finder, {
    Duration? timeout,
    String? description,
  }) async {
    final effectiveTimeout = timeout ?? TestConfig.elementTimeout;
    final stopwatch = Stopwatch()..start();

    while (stopwatch.elapsed < effectiveTimeout) {
      try {
        if (finder.exists) {
          return;
        }
      } catch (_) {
        // Element not found yet, continue waiting
      }
      await Future.delayed(const Duration(milliseconds: 100));
    }

    final desc = description ?? finder.toString();
    throw TimeoutException(
      'Element not found within ${effectiveTimeout.inSeconds}s: $desc',
    );
  }

  /// Wait for element to disappear
  Future<void> waitForElementToDisappear(
    PatrolFinder finder, {
    Duration? timeout,
  }) async {
    final effectiveTimeout = timeout ?? TestConfig.elementTimeout;
    final stopwatch = Stopwatch()..start();

    while (stopwatch.elapsed < effectiveTimeout) {
      try {
        if (!finder.exists) {
          return;
        }
      } catch (_) {
        // Element gone, success
        return;
      }
      await Future.delayed(const Duration(milliseconds: 100));
    }

    throw TimeoutException(
      'Element still visible after ${effectiveTimeout.inSeconds}s',
    );
  }

  /// Handle system dialogs (permissions, etc.)
  Future<void> handleSystemDialogs() async {
    TestLogger.debug('Handling system dialogs...');

    try {
      // Handle location permission
      if (await $.native.isPermissionDialogVisible(
        timeout: const Duration(seconds: 2),
      )) {
        await $.native.grantPermissionWhenInUse();
      }

      // Handle notification permission (iOS)
      if (Platform.isIOS) {
        if (await $.native.isPermissionDialogVisible(
          timeout: const Duration(seconds: 2),
        )) {
          await $.native.grantPermissionOnlyThisTime();
        }
      }
    } catch (e) {
      TestLogger.debug('No permission dialogs to handle');
    }
  }

  /// Grant all permissions proactively
  Future<void> grantAllPermissions() async {
    TestLogger.debug('Granting all permissions...');

    if (Platform.isAndroid) {
      final permissions = [
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
      ];

      for (final permission in permissions) {
        try {
          await Process.run('adb', [
            'shell',
            'pm',
            'grant',
            androidPackageName,
            permission,
          ]);
        } catch (_) {
          // Permission might not be declared in manifest
        }
      }
    }
  }

  /// Tap element with retry on failure
  Future<void> tapWithRetry(
    PatrolFinder finder, {
    int maxRetries = 3,
    Duration retryDelay = const Duration(milliseconds: 500),
  }) async {
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await finder.tap();
        return;
      } catch (e) {
        if (attempt == maxRetries) {
          rethrow;
        }
        TestLogger.debug('Tap failed, retrying... ($attempt/$maxRetries)');
        await Future.delayed(retryDelay);
        await $.pumpAndSettle();
      }
    }
  }

  /// Enter text with clear first
  Future<void> enterTextWithClear(
    PatrolFinder finder,
    String text,
  ) async {
    await finder.tap();
    await $.pumpAndSettle();

    // Clear existing text
    if (Platform.isAndroid) {
      await $.native.pressBack(); // Dismiss keyboard first
      await finder.tap();
    }

    await finder.enterText(text);
    await $.pumpAndSettle();
  }

  /// Scroll until element is visible
  Future<void> scrollUntilVisible(
    PatrolFinder finder, {
    PatrolFinder? scrollable,
    double delta = -200,
    int maxScrolls = 10,
  }) async {
    for (int i = 0; i < maxScrolls; i++) {
      try {
        if (finder.exists) {
          return;
        }
      } catch (_) {
        // Not found yet
      }

      if (scrollable != null) {
        await scrollable.scrollBy(dy: delta);
      } else {
        await $.scrollBy(dy: delta);
      }
      await $.pumpAndSettle();
    }

    throw Exception('Element not found after $maxScrolls scrolls');
  }

  /// Wait for network operation to complete
  Future<T> waitForNetwork<T>(
    Future<T> Function() operation, {
    Duration? timeout,
  }) async {
    final effectiveTimeout = timeout ?? TestConfig.networkTimeout;

    return await operation().timeout(
      effectiveTimeout,
      onTimeout: () => throw TimeoutException('Network operation timed out'),
    );
  }

  /// Simulate offline mode
  Future<void> goOffline() async {
    TestLogger.info('Simulating offline mode...');
    if (Platform.isAndroid) {
      await Process.run('adb', ['shell', 'svc', 'wifi', 'disable']);
      await Process.run('adb', ['shell', 'svc', 'data', 'disable']);
    }
    // iOS airplane mode requires MDM or manual intervention
    await Future.delayed(const Duration(seconds: 2));
  }

  /// Restore online mode
  Future<void> goOnline() async {
    TestLogger.info('Restoring online mode...');
    if (Platform.isAndroid) {
      await Process.run('adb', ['shell', 'svc', 'wifi', 'enable']);
      await Process.run('adb', ['shell', 'svc', 'data', 'enable']);
    }
    await Future.delayed(const Duration(seconds: 3)); // Wait for reconnection
  }

  /// Simulate time passing (for time-based features)
  Future<void> simulateTimePassing({required int minutes}) async {
    TestLogger.debug('Simulating $minutes minutes passing...');
    await TestApiClient.advanceTime(minutes: minutes);
  }

  /// Verify element exists with custom message
  void verifyExists(PatrolFinder finder, String description) {
    if (!finder.exists) {
      throw AssertionError('Expected to find: $description');
    }
  }

  /// Verify element does not exist with custom message
  void verifyNotExists(PatrolFinder finder, String description) {
    if (finder.exists) {
      throw AssertionError('Expected NOT to find: $description');
    }
  }

  /// Pull to refresh gesture
  Future<void> pullToRefresh([PatrolFinder? scrollable]) async {
    TestLogger.debug('Performing pull to refresh...');
    if (scrollable != null) {
      await scrollable.scrollBy(dy: 300);
    } else {
      await $.scrollBy(dy: 300);
    }
    await $.pumpAndSettle();
  }

  /// Long press on element
  Future<void> longPress(PatrolFinder finder) async {
    await finder.longPress();
    await $.pumpAndSettle();
  }

  /// Swipe left on element
  Future<void> swipeLeft(PatrolFinder finder) async {
    await finder.scrollBy(dx: -200);
    await $.pumpAndSettle();
  }

  /// Swipe right on element
  Future<void> swipeRight(PatrolFinder finder) async {
    await finder.scrollBy(dx: 200);
    await $.pumpAndSettle();
  }

  /// Navigate back
  Future<void> goBack() async {
    if (Platform.isAndroid) {
      await $.native.pressBack();
    } else {
      // iOS: tap back button or swipe
      try {
        await $('Back').tap();
      } catch (_) {
        await $.scrollBy(dx: 200); // Swipe from left edge
      }
    }
    await $.pumpAndSettle();
  }

  /// Press home button
  Future<void> pressHome() async {
    await $.native.pressHome();
    await Future.delayed(const Duration(seconds: 1));
  }

  /// Relaunch app
  Future<void> relaunchApp() async {
    TestLogger.debug('Relaunching app...');
    await $.native.pressHome();
    await Future.delayed(const Duration(milliseconds: 500));
    await $.native.openApp();
    await $.pumpAndSettle();
  }
}

/// Parent app base test
abstract class ParentAppTest extends BaseE2ETest {
  @override
  String get androidPackageName => AppIdentifiers.parentAndroid;

  @override
  String get iosBundleId => AppIdentifiers.parentIos;
}

/// Teacher app base test
abstract class TeacherAppTest extends BaseE2ETest {
  @override
  String get androidPackageName => AppIdentifiers.teacherAndroid;

  @override
  String get iosBundleId => AppIdentifiers.teacherIos;
}

/// Learner app base test
abstract class LearnerAppTest extends BaseE2ETest {
  @override
  String get androidPackageName => AppIdentifiers.learnerAndroid;

  @override
  String get iosBundleId => AppIdentifiers.learnerIos;
}
