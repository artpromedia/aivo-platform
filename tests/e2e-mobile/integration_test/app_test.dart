/// AIVO E2E Tests - Main Entry Point
///
/// This file serves as the main entry point for running all E2E tests.
/// Import all test files here to run them as a single test suite.

// Configuration
export 'config/test_config.dart';
export 'config/test_users.dart';

// Common utilities
export 'common/base_test.dart';
export 'common/test_utils.dart';
export 'common/matchers.dart';
export 'common/actions.dart';

// Parent App Tests

// Teacher App Tests

// Learner App Tests

// Cross-App Tests

/// Main function - entry point for Patrol tests
void main() {
  // This file can be used as a single entry point for running all tests.
  // However, Patrol typically discovers and runs tests from individual files.
  //
  // To run all tests:
  //   patrol test --target integration_test/
  //
  // To run specific app tests:
  //   patrol test --target integration_test/parent_app/
  //   patrol test --target integration_test/teacher_app/
  //   patrol test --target integration_test/learner_app/
  //
  // To run with tags:
  //   patrol test --tags smoke
  //   patrol test --tags "smoke,critical"
  //
  // The imports above ensure all test files are compiled and available.
  // Each test file contains its own patrolTest() definitions.
}

/// Test suite registry for programmatic access
class E2ETestRegistry {
  static const Map<String, List<String>> suites = {
    'parent': [
      'onboarding',
      'add_child',
      'view_progress',
      'billing',
      'notifications',
    ],
    'teacher': [
      'login',
      'class_management',
      'live_monitoring',
      'iep_tracking',
      'offline',
    ],
    'learner': [
      'session_flow',
      'achievements',
      'accessibility',
      'break_reminders',
    ],
    'cross_app': [
      'parent_learner_sync',
      'teacher_parent_comm',
      'notification_delivery',
    ],
  };

  /// Total number of test files
  static int get totalTestFiles {
    return suites.values.fold(0, (sum, tests) => sum + tests.length);
  }

  /// Get test files for a specific suite
  static List<String> getTestsForSuite(String suite) {
    return suites[suite] ?? [];
  }

  /// Get all test tags used across the suite
  static const List<String> allTags = [
    'smoke',
    'regression',
    'critical',
    'offline',
    'billing',
    'accessibility',
    'iep',
    'sync',
    'notifications',
    'slow',
  ];
}
