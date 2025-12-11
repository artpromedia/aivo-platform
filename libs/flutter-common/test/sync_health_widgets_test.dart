import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_common/offline/sync_health_widgets.dart';
import 'package:flutter_common/offline/sync_scheduler.dart';

void main() {
  group('SyncHealthWidgets', () {
    group('SyncHealthInfo', () {
      test('creates with required parameters', () {
        final info = SyncHealthInfo(
          lastSyncTime: DateTime.now(),
          isOnline: true,
          syncState: SyncStateStatus.idle,
        );

        expect(info.pendingSessions, 0);
        expect(info.pendingEvents, 0);
        expect(info.failedItems, 0);
        expect(info.stuckItems, 0);
      });

      test('totalPending calculates correctly', () {
        const info = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: true,
          syncState: SyncStateStatus.idle,
          pendingSessions: 3,
          pendingEvents: 7,
        );

        expect(info.totalPending, 10);
        expect(info.hasPendingItems, isTrue);
      });

      test('hasIssues returns true when failed or stuck items exist', () {
        const withFailed = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: true,
          syncState: SyncStateStatus.idle,
          failedItems: 2,
        );
        expect(withFailed.hasIssues, isTrue);

        const withStuck = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: true,
          syncState: SyncStateStatus.idle,
          stuckItems: 1,
        );
        expect(withStuck.hasIssues, isTrue);

        const noIssues = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: true,
          syncState: SyncStateStatus.idle,
        );
        expect(noIssues.hasIssues, isFalse);
      });

      test('overallStatus returns correct status', () {
        const offline = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: false,
          syncState: SyncStateStatus.idle,
        );
        expect(offline.overallStatus, SyncHealthStatus.offline);

        const stuck = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: true,
          syncState: SyncStateStatus.idle,
          stuckItems: 1,
        );
        expect(stuck.overallStatus, SyncHealthStatus.stuck);

        const failing = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: true,
          syncState: SyncStateStatus.idle,
          failedItems: 2,
        );
        expect(failing.overallStatus, SyncHealthStatus.failing);

        const syncing = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: true,
          syncState: SyncStateStatus.syncing,
        );
        expect(syncing.overallStatus, SyncHealthStatus.syncing);

        const pending = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: true,
          syncState: SyncStateStatus.idle,
          pendingEvents: 5,
        );
        expect(pending.overallStatus, SyncHealthStatus.pending);

        const healthy = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: true,
          syncState: SyncStateStatus.idle,
        );
        expect(healthy.overallStatus, SyncHealthStatus.healthy);
      });

      test('lastSyncDisplay shows correct time strings', () {
        final now = DateTime.now();

        final justNow = SyncHealthInfo(
          lastSyncTime: now.subtract(const Duration(seconds: 30)),
          isOnline: true,
          syncState: SyncStateStatus.idle,
        );
        expect(justNow.lastSyncDisplay, 'Just now');

        final minutesAgo = SyncHealthInfo(
          lastSyncTime: now.subtract(const Duration(minutes: 15)),
          isOnline: true,
          syncState: SyncStateStatus.idle,
        );
        expect(minutesAgo.lastSyncDisplay, '15m ago');

        final hoursAgo = SyncHealthInfo(
          lastSyncTime: now.subtract(const Duration(hours: 3)),
          isOnline: true,
          syncState: SyncStateStatus.idle,
        );
        expect(hoursAgo.lastSyncDisplay, '3h ago');

        final daysAgo = SyncHealthInfo(
          lastSyncTime: now.subtract(const Duration(days: 2)),
          isOnline: true,
          syncState: SyncStateStatus.idle,
        );
        expect(daysAgo.lastSyncDisplay, '2d ago');

        const neverSynced = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: true,
          syncState: SyncStateStatus.idle,
        );
        expect(neverSynced.lastSyncDisplay, 'Never synced');
      });

      test('timeSinceLastSync calculates correctly', () {
        final now = DateTime.now();
        final fiveMinutesAgo = now.subtract(const Duration(minutes: 5));

        final info = SyncHealthInfo(
          lastSyncTime: fiveMinutesAgo,
          isOnline: true,
          syncState: SyncStateStatus.idle,
        );

        expect(info.timeSinceLastSync, isNotNull);
        expect(info.timeSinceLastSync!.inMinutes, greaterThanOrEqualTo(5));
        expect(info.timeSinceLastSync!.inMinutes, lessThan(6));
      });
    });

    group('SyncHealthStatus', () {
      test('all statuses are defined', () {
        expect(SyncHealthStatus.values.length, 6);
        expect(SyncHealthStatus.values, contains(SyncHealthStatus.healthy));
        expect(SyncHealthStatus.values, contains(SyncHealthStatus.syncing));
        expect(SyncHealthStatus.values, contains(SyncHealthStatus.pending));
        expect(SyncHealthStatus.values, contains(SyncHealthStatus.offline));
        expect(SyncHealthStatus.values, contains(SyncHealthStatus.failing));
        expect(SyncHealthStatus.values, contains(SyncHealthStatus.stuck));
      });
    });

    group('LearnerSyncIndicator', () {
      testWidgets('renders correctly when healthy', (tester) async {
        final info = SyncHealthInfo(
          lastSyncTime: DateTime.now().subtract(const Duration(minutes: 5)),
          isOnline: true,
          syncState: SyncStateStatus.idle,
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LearnerSyncIndicator(healthInfo: info),
            ),
          ),
        );

        expect(find.byIcon(Icons.cloud_done), findsOneWidget);
        expect(find.text('5m ago'), findsOneWidget);
      });

      testWidgets('renders correctly when offline', (tester) async {
        const info = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: false,
          syncState: SyncStateStatus.idle,
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LearnerSyncIndicator(healthInfo: info),
            ),
          ),
        );

        expect(find.byIcon(Icons.cloud_off), findsOneWidget);
        expect(find.text('Never synced'), findsOneWidget);
      });

      testWidgets('shows spinner when syncing', (tester) async {
        const info = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: true,
          syncState: SyncStateStatus.syncing,
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LearnerSyncIndicator(healthInfo: info),
            ),
          ),
        );

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });

      testWidgets('calls onTap when tapped', (tester) async {
        var tapped = false;
        final info = SyncHealthInfo(
          lastSyncTime: DateTime.now(),
          isOnline: true,
          syncState: SyncStateStatus.idle,
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: LearnerSyncIndicator(
                healthInfo: info,
                onTap: () => tapped = true,
              ),
            ),
          ),
        );

        await tester.tap(find.byType(LearnerSyncIndicator));
        expect(tapped, isTrue);
      });
    });

    group('TeacherSyncPanel', () {
      testWidgets('renders all sections correctly', (tester) async {
        final info = SyncHealthInfo(
          lastSyncTime: DateTime.now().subtract(const Duration(minutes: 10)),
          isOnline: true,
          syncState: SyncStateStatus.idle,
          pendingSessions: 2,
          pendingEvents: 5,
          failedItems: 1,
          stuckItems: 1,
          lastError: 'Network timeout',
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: TeacherSyncPanel(healthInfo: info),
              ),
            ),
          ),
        );

        expect(find.text('Sync Health'), findsOneWidget);
        expect(find.text('10m ago'), findsOneWidget);
        expect(find.text('7'), findsOneWidget); // totalPending
        expect(find.text('1'), findsWidgets); // failedItems and stuckItems
        expect(find.text('Network timeout'), findsOneWidget);
        expect(find.text('Reset'), findsOneWidget);
      });

      testWidgets('shows sync button when online', (tester) async {
        final info = SyncHealthInfo(
          lastSyncTime: DateTime.now(),
          isOnline: true,
          syncState: SyncStateStatus.idle,
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TeacherSyncPanel(
                healthInfo: info,
                onSyncNow: () {},
              ),
            ),
          ),
        );

        expect(find.text('Sync Now'), findsOneWidget);
      });

      testWidgets('disables sync button when syncing', (tester) async {
        const info = SyncHealthInfo(
          lastSyncTime: null,
          isOnline: true,
          syncState: SyncStateStatus.syncing,
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: TeacherSyncPanel(
                healthInfo: info,
                onSyncNow: () {},
              ),
            ),
          ),
        );

        final button = tester.widget<TextButton>(
          find.widgetWithText(TextButton, 'Sync Now'),
        );
        expect(button.onPressed, isNull);
      });
    });

    group('OfflineBanner', () {
      testWidgets('shows nothing when online', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: OfflineBanner(isOffline: false),
            ),
          ),
        );

        expect(find.byType(MaterialBanner), findsNothing);
      });

      testWidgets('shows banner when offline', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: OfflineBanner(isOffline: true),
            ),
          ),
        );

        expect(find.byType(MaterialBanner), findsOneWidget);
        expect(find.byIcon(Icons.cloud_off), findsOneWidget);
      });

      testWidgets('shows pending count in message', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: OfflineBanner(isOffline: true, pendingCount: 5),
            ),
          ),
        );

        expect(find.textContaining('5 items waiting to sync'), findsOneWidget);
      });

      testWidgets('shows custom message', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: OfflineBanner(
                isOffline: true,
                message: 'Custom offline message',
              ),
            ),
          ),
        );

        expect(find.text('Custom offline message'), findsOneWidget);
      });
    });

    group('SyncProgressOverlay', () {
      testWidgets('shows only child when not syncing', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SyncProgressOverlay(
                isSyncing: false,
                child: Text('Content'),
              ),
            ),
          ),
        );

        expect(find.text('Content'), findsOneWidget);
        expect(find.byType(CircularProgressIndicator), findsNothing);
      });

      testWidgets('shows progress overlay when syncing', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SyncProgressOverlay(
                isSyncing: true,
                child: Text('Content'),
              ),
            ),
          ),
        );

        expect(find.text('Content'), findsOneWidget);
        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        expect(find.text('Syncing...'), findsOneWidget);
      });

      testWidgets('shows custom message when syncing', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SyncProgressOverlay(
                isSyncing: true,
                message: 'Uploading data...',
                child: Text('Content'),
              ),
            ),
          ),
        );

        expect(find.text('Uploading data...'), findsOneWidget);
      });

      testWidgets('shows determinate progress when provided', (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: SyncProgressOverlay(
                isSyncing: true,
                progress: 0.5,
                child: Text('Content'),
              ),
            ),
          ),
        );

        final indicator = tester.widget<CircularProgressIndicator>(
          find.byType(CircularProgressIndicator),
        );
        expect(indicator.value, 0.5);
      });
    });

    group('SyncHealthProvider', () {
      testWidgets('provides health info to descendants', (tester) async {
        final info = SyncHealthInfo(
          lastSyncTime: DateTime.now(),
          isOnline: true,
          syncState: SyncStateStatus.idle,
          pendingEvents: 5,
        );

        late SyncHealthInfo providedInfo;

        await tester.pumpWidget(
          MaterialApp(
            home: SyncHealthProvider(
              healthInfo: info,
              child: Builder(
                builder: (context) {
                  providedInfo = SyncHealthProvider.of(context);
                  return const SizedBox();
                },
              ),
            ),
          ),
        );

        expect(providedInfo.isOnline, isTrue);
        expect(providedInfo.pendingEvents, 5);
      });

      testWidgets('returns default info when no provider', (tester) async {
        late SyncHealthInfo providedInfo;

        await tester.pumpWidget(
          MaterialApp(
            home: Builder(
              builder: (context) {
                providedInfo = SyncHealthProvider.of(context);
                return const SizedBox();
              },
            ),
          ),
        );

        expect(providedInfo.isOnline, isFalse);
        expect(providedInfo.syncState, SyncStateStatus.unknown);
      });
    });
  });
}
