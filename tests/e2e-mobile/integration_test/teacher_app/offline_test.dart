/// Teacher App - Offline Mode E2E Test
///
/// Tests offline functionality, data sync, and graceful degradation.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_users.dart';

void main() {
  patrolTest(
    'Offline mode - detect offline state',
    ($) async {
      final test = OfflineModeTest();
      await test.setUp($);

      try {
        await test.testDetectOfflineState();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Offline mode - cached data access',
    ($) async {
      final test = OfflineModeTest();
      await test.setUp($);

      try {
        await test.testCachedDataAccess();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Offline mode - sync on reconnect',
    ($) async {
      final test = OfflineModeTest();
      await test.setUp($);

      try {
        await test.testSyncOnReconnect();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class OfflineModeTest extends TeacherAppTest {
  @override
  String get testName => 'Offline Mode';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test detecting offline state
  Future<void> testDetectOfflineState() async {
    await step('Login while online');
    await actions.auth.login(TestUsers.existingTeacher);
    await $('Dashboard').waitUntilVisible();

    await step('Verify online indicator');
    verifyNotExists($(#offlineIndicator), 'Offline indicator');
    await captureScreenshot('online_state');

    await step('Go offline');
    await goOffline();

    await step('Trigger network request');
    await actions.nav.pullToRefresh();
    await $.pump(const Duration(seconds: 2));

    await step('Verify offline indicator appears');
    await $(#offlineIndicator).waitUntilVisible();
    await captureScreenshot('offline_state');

    await step('Verify offline message');
    await $('You are offline').waitUntilVisible();

    await step('Restore connection');
    await goOnline();
    await $.pump(const Duration(seconds: 3));

    await step('Verify back online');
    await waitForElementToDisappear($(#offlineIndicator));
    await captureScreenshot('back_online');
  }

  /// Test accessing cached data offline
  Future<void> testCachedDataAccess() async {
    await step('Login and load data');
    await actions.auth.login(TestUsers.existingTeacher);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to classes to cache');
    await $(#classesTab).tap();
    await $.pumpAndSettle();
    await $(#classList).waitUntilVisible();

    await step('Open class details to cache');
    await $(#classCard).first.tap();
    await $.pumpAndSettle();
    await $(#studentRoster).waitUntilVisible();
    await captureScreenshot('data_cached');

    await step('Go offline');
    await goOffline();

    await step('Navigate back and verify data available');
    await actions.nav.goBack();
    await $.pumpAndSettle();

    await step('Verify class list still shows');
    await $(#classList).waitUntilVisible();
    await $(#classCard).waitUntilVisible();
    await captureScreenshot('cached_classes');

    await step('Reopen class');
    await $(#classCard).first.tap();
    await $.pumpAndSettle();

    await step('Verify cached details');
    await $(#studentRoster).waitUntilVisible();
    await captureScreenshot('cached_details');

    await step('Verify limited actions warning');
    await $(#limitedActionsWarning).waitUntilVisible();

    await step('Restore connection');
    await goOnline();
  }

  /// Test syncing pending changes on reconnect
  Future<void> testSyncOnReconnect() async {
    await step('Login as teacher');
    await actions.auth.login(TestUsers.teacherWithIep);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to IEP');
    await $(#iepTab).tap();
    await $.pumpAndSettle();
    await $(#iepStudentCard).first.tap();
    await $.pumpAndSettle();

    await step('Go offline');
    await goOffline();

    await step('Log progress while offline');
    await $(#goalCard).first.tap();
    await $.pumpAndSettle();
    await $(#logProgressButton).tap();
    await $.pumpAndSettle();

    await $(#progressSlider).scrollBy(dx: 30);
    await $(#notesField).enterText('Offline progress note');
    await $(#saveButton).tap();
    await $.pumpAndSettle();

    await step('Verify pending sync indicator');
    await $(#pendingSyncBadge).waitUntilVisible();
    await captureScreenshot('pending_sync');

    await step('Make another offline change');
    await actions.nav.goBack();
    await $(#goalCard).at(1).tap();
    await $.pumpAndSettle();
    await $(#logProgressButton).tap();
    await $.pumpAndSettle();

    await $(#progressSlider).scrollBy(dx: 20);
    await $(#saveButton).tap();
    await $.pumpAndSettle();

    await step('Check pending count');
    await $('2 pending').waitUntilVisible();
    await captureScreenshot('multiple_pending');

    await step('Go online');
    await goOnline();
    await $.pump(const Duration(seconds: 2));

    await step('Verify sync in progress');
    await $(#syncingIndicator).waitUntilVisible();
    await captureScreenshot('syncing');

    await step('Wait for sync completion');
    await $.pump(const Duration(seconds: 5));

    await step('Verify sync complete');
    await $('Sync complete').waitUntilVisible();
    verifyNotExists($(#pendingSyncBadge), 'Pending sync badge');
    await captureScreenshot('sync_complete');
  }
}
