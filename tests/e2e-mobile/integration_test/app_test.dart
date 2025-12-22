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
import 'parent_app/onboarding_test.dart' as parent_onboarding;
import 'parent_app/add_child_test.dart' as parent_add_child;
import 'parent_app/view_progress_test.dart' as parent_view_progress;
import 'parent_app/billing_test.dart' as parent_billing;
import 'parent_app/notifications_test.dart' as parent_notifications;

// Teacher App Tests
import 'teacher_app/login_test.dart' as teacher_login;
import 'teacher_app/class_management_test.dart' as teacher_class_management;
import 'teacher_app/live_monitoring_test.dart' as teacher_live_monitoring;
import 'teacher_app/iep_tracking_test.dart' as teacher_iep_tracking;
import 'teacher_app/offline_test.dart' as teacher_offline;

// Learner App Tests
import 'learner_app/session_flow_test.dart' as learner_session_flow;
import 'learner_app/achievements_test.dart' as learner_achievements;
import 'learner_app/accessibility_test.dart' as learner_accessibility;
import 'learner_app/break_reminders_test.dart' as learner_break_reminders;

// Cross-App Tests
import 'cross_app/parent_learner_sync_test.dart' as cross_parent_learner_sync;
import 'cross_app/teacher_parent_comm_test.dart' as cross_teacher_parent_comm;
import 'cross_app/notification_delivery_test.dart' as cross_notification_delivery;

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
