/// E2E Test Configuration
///
/// Central configuration for all E2E tests including environment settings,
/// timeouts, and feature flags.
library;

import 'dart:io';

/// Test environment configuration
class TestConfig {
  TestConfig._();

  /// Current test environment
  static TestEnvironment get environment {
    final env = Platform.environment['TEST_ENV'] ?? 'test';
    return TestEnvironment.values.firstWhere(
      (e) => e.name == env,
      orElse: () => TestEnvironment.test,
    );
  }

  /// API base URL for current environment
  static String get apiBaseUrl {
    switch (environment) {
      case TestEnvironment.test:
        return 'http://localhost:3000';
      case TestEnvironment.staging:
        return 'https://api-staging.aivolearning.com';
      case TestEnvironment.production:
        return 'https://api.aivolearning.com';
    }
  }

  /// Whether authentication can be bypassed for testing
  static bool get authBypassEnabled {
    return environment == TestEnvironment.test;
  }

  /// Whether to use mock payment provider
  static bool get mockPaymentsEnabled {
    return environment != TestEnvironment.production;
  }

  /// Default timeout for waiting on elements
  static const Duration elementTimeout = Duration(seconds: 10);

  /// Timeout for network operations
  static const Duration networkTimeout = Duration(seconds: 30);

  /// Timeout for animations to settle
  static const Duration animationTimeout = Duration(seconds: 2);

  /// Timeout for app launch
  static const Duration appLaunchTimeout = Duration(seconds: 60);

  /// Maximum test duration
  static const Duration testTimeout = Duration(minutes: 5);

  /// Whether to capture screenshots on failure
  static const bool screenshotOnFailure = true;

  /// Whether to capture screenshots at key steps
  static const bool screenshotAtSteps = true;

  /// Number of retries for flaky operations
  static const int maxRetries = 3;

  /// Delay between retries
  static const Duration retryDelay = Duration(milliseconds: 500);

  /// Whether running in CI environment
  static bool get isCI {
    return Platform.environment.containsKey('CI') ||
        Platform.environment.containsKey('GITHUB_ACTIONS');
  }

  /// Whether to run tests in headless mode
  static bool get headless {
    return isCI || Platform.environment['HEADLESS'] == 'true';
  }

  /// Shard index for parallel test execution
  static int get shardIndex {
    final value = Platform.environment['SHARD_INDEX'];
    return value != null ? int.parse(value) : 0;
  }

  /// Total number of shards
  static int get totalShards {
    final value = Platform.environment['TOTAL_SHARDS'];
    return value != null ? int.parse(value) : 1;
  }
}

/// Test environments
enum TestEnvironment {
  test,
  staging,
  production,
}

/// App identifiers for each platform
class AppIdentifiers {
  AppIdentifiers._();

  // Android package names
  static const String parentAndroid = 'com.aivo.parent';
  static const String teacherAndroid = 'com.aivo.teacher';
  static const String learnerAndroid = 'com.aivo.learner';

  // iOS bundle IDs
  static const String parentIos = 'com.aivo.parent';
  static const String teacherIos = 'com.aivo.teacher';
  static const String learnerIos = 'com.aivo.learner';

  /// Get package name for app type
  static String androidPackage(AppType type) {
    switch (type) {
      case AppType.parent:
        return parentAndroid;
      case AppType.teacher:
        return teacherAndroid;
      case AppType.learner:
        return learnerAndroid;
    }
  }

  /// Get bundle ID for app type
  static String iosBundle(AppType type) {
    switch (type) {
      case AppType.parent:
        return parentIos;
      case AppType.teacher:
        return teacherIos;
      case AppType.learner:
        return learnerIos;
    }
  }
}

/// App types
enum AppType {
  parent,
  teacher,
  learner,
}

/// Test feature flags
class TestFeatureFlags {
  TestFeatureFlags._();

  /// Whether to test push notifications
  static const bool testPushNotifications = true;

  /// Whether to test in-app purchases
  static const bool testInAppPurchases = true;

  /// Whether to test offline mode
  static const bool testOfflineMode = true;

  /// Whether to test accessibility features
  static const bool testAccessibility = true;

  /// Whether to test cross-app scenarios
  static const bool testCrossApp = true;

  /// Whether to test biometric authentication
  static const bool testBiometrics = false; // Disabled in CI

  /// Whether to test camera features
  static const bool testCamera = false; // Requires physical device
}

/// Test timeouts by category
class TestTimeouts {
  TestTimeouts._();

  /// Quick smoke tests
  static const Duration smoke = Duration(minutes: 2);

  /// Standard tests
  static const Duration standard = Duration(minutes: 5);

  /// Complex workflow tests
  static const Duration complex = Duration(minutes: 10);

  /// Cross-app tests
  static const Duration crossApp = Duration(minutes: 15);

  /// Payment flow tests
  static const Duration payment = Duration(minutes: 5);

  /// Sync operation timeout
  static const Duration sync = Duration(seconds: 30);
}
