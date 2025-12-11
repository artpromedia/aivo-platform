import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_common/offline/sync_scheduler.dart';

void main() {
  group('SyncScheduler', () {
    group('SyncState', () {
      test('creates initial state correctly', () {
        final state = SyncState.initial();

        expect(state.status, SyncStateStatus.idle);
        expect(state.consecutiveFailures, 0);
        expect(state.currentBackoffLevel, 0);
        expect(state.lastSyncAttempt, isNull);
        expect(state.lastSuccessfulSync, isNull);
      });

      test('shouldSync returns true when no previous attempts', () {
        final state = SyncState.initial();
        expect(state.shouldSync, isTrue);
      });

      test('shouldSync respects nextScheduledSync', () {
        final now = DateTime.now();
        final future = now.add(const Duration(minutes: 10));
        final past = now.subtract(const Duration(minutes: 10));

        final stateWithFutureSync = SyncState(
          status: SyncStateStatus.backoff,
          consecutiveFailures: 1,
          currentBackoffLevel: 1,
          nextScheduledSync: future,
        );
        expect(stateWithFutureSync.shouldSync, isFalse);

        final stateWithPastSync = SyncState(
          status: SyncStateStatus.backoff,
          consecutiveFailures: 1,
          currentBackoffLevel: 1,
          nextScheduledSync: past,
        );
        expect(stateWithPastSync.shouldSync, isTrue);
      });

      test('serialization roundtrip works', () {
        final original = SyncState(
          status: SyncStateStatus.backoff,
          consecutiveFailures: 3,
          currentBackoffLevel: 2,
          lastSyncAttempt: DateTime(2024, 1, 15, 10, 30),
          lastSuccessfulSync: DateTime(2024, 1, 15, 9, 0),
          nextScheduledSync: DateTime(2024, 1, 15, 10, 45),
          lastError: 'Network error',
        );

        final json = original.toJson();
        final restored = SyncState.fromJson(json);

        expect(restored.status, original.status);
        expect(restored.consecutiveFailures, original.consecutiveFailures);
        expect(restored.currentBackoffLevel, original.currentBackoffLevel);
        expect(restored.lastSyncAttempt, original.lastSyncAttempt);
        expect(restored.lastSuccessfulSync, original.lastSuccessfulSync);
        expect(restored.nextScheduledSync, original.nextScheduledSync);
        expect(restored.lastError, original.lastError);
      });
    });

    group('ErrorClassification', () {
      test('classifies network errors correctly', () {
        expect(
          ErrorClassification.classifyError(Exception('SocketException')),
          ErrorCategory.network,
        );
        expect(
          ErrorClassification.classifyError(Exception('Connection refused')),
          ErrorCategory.network,
        );
        expect(
          ErrorClassification.classifyError(Exception('No internet connection')),
          ErrorCategory.network,
        );
      });

      test('classifies timeout errors correctly', () {
        expect(
          ErrorClassification.classifyError(Exception('TimeoutException')),
          ErrorCategory.timeout,
        );
        expect(
          ErrorClassification.classifyError(Exception('Request timed out')),
          ErrorCategory.timeout,
        );
      });

      test('classifies server errors as transient', () {
        expect(ErrorClassification.classifyStatusCode(500), ErrorCategory.serverError);
        expect(ErrorClassification.classifyStatusCode(502), ErrorCategory.serverError);
        expect(ErrorClassification.classifyStatusCode(503), ErrorCategory.serverError);
        expect(ErrorClassification.classifyStatusCode(504), ErrorCategory.serverError);
      });

      test('classifies client errors as permanent', () {
        expect(ErrorClassification.classifyStatusCode(400), ErrorCategory.clientError);
        expect(ErrorClassification.classifyStatusCode(401), ErrorCategory.clientError);
        expect(ErrorClassification.classifyStatusCode(403), ErrorCategory.clientError);
        expect(ErrorClassification.classifyStatusCode(404), ErrorCategory.clientError);
      });

      test('classifies rate limit errors correctly', () {
        expect(ErrorClassification.classifyStatusCode(429), ErrorCategory.rateLimited);
      });

      test('isTransient returns correct values', () {
        expect(ErrorClassification.isTransient(ErrorCategory.network), isTrue);
        expect(ErrorClassification.isTransient(ErrorCategory.serverError), isTrue);
        expect(ErrorClassification.isTransient(ErrorCategory.timeout), isTrue);
        expect(ErrorClassification.isTransient(ErrorCategory.rateLimited), isTrue);

        expect(ErrorClassification.isTransient(ErrorCategory.clientError), isFalse);
        expect(ErrorClassification.isTransient(ErrorCategory.validation), isFalse);
      });

      test('isConflict returns correct values', () {
        expect(ErrorClassification.isConflict(ErrorCategory.conflict), isTrue);
        expect(ErrorClassification.isConflict(ErrorCategory.network), isFalse);
      });
    });

    group('ItemRetryTracker', () {
      test('tracks retry counts correctly', () {
        final tracker = ItemRetryTracker(maxRetries: 3);

        expect(tracker.getRetryCount('item1'), 0);

        tracker.recordFailure('item1', 'error');
        expect(tracker.getRetryCount('item1'), 1);

        tracker.recordFailure('item1', 'error');
        expect(tracker.getRetryCount('item1'), 2);
      });

      test('canRetry respects max retries', () {
        final tracker = ItemRetryTracker(maxRetries: 2);

        expect(tracker.canRetry('item1'), isTrue);

        tracker.recordFailure('item1', 'error');
        expect(tracker.canRetry('item1'), isTrue);

        tracker.recordFailure('item1', 'error');
        expect(tracker.canRetry('item1'), isFalse);
      });

      test('recordSuccess clears retry count', () {
        final tracker = ItemRetryTracker(maxRetries: 3);

        tracker.recordFailure('item1', 'error');
        tracker.recordFailure('item1', 'error');
        expect(tracker.getRetryCount('item1'), 2);

        tracker.recordSuccess('item1');
        expect(tracker.getRetryCount('item1'), 0);
        expect(tracker.canRetry('item1'), isTrue);
      });

      test('getAbandonedItems returns items at max retries', () {
        final tracker = ItemRetryTracker(maxRetries: 2);

        tracker.recordFailure('item1', 'error');
        tracker.recordFailure('item1', 'error');
        tracker.recordFailure('item2', 'error');
        tracker.recordFailure('item3', 'error');
        tracker.recordFailure('item3', 'error');

        final abandoned = tracker.getAbandonedItems();
        expect(abandoned, containsAll(['item1', 'item3']));
        expect(abandoned, isNot(contains('item2')));
      });

      test('resetItem clears single item', () {
        final tracker = ItemRetryTracker(maxRetries: 3);

        tracker.recordFailure('item1', 'error');
        tracker.recordFailure('item2', 'error');

        tracker.resetItem('item1');

        expect(tracker.getRetryCount('item1'), 0);
        expect(tracker.getRetryCount('item2'), 1);
      });

      test('clear removes all tracking', () {
        final tracker = ItemRetryTracker(maxRetries: 3);

        tracker.recordFailure('item1', 'error');
        tracker.recordFailure('item2', 'error');

        tracker.clear();

        expect(tracker.getRetryCount('item1'), 0);
        expect(tracker.getRetryCount('item2'), 0);
      });
    });

    group('Backoff calculation', () {
      test('backoff intervals follow expected progression', () {
        // Default intervals: [1, 5, 15, 60, 360] minutes
        const intervals = SyncScheduler.defaultBackoffIntervals;

        expect(intervals[0], 1);
        expect(intervals[1], 5);
        expect(intervals[2], 15);
        expect(intervals[3], 60);
        expect(intervals[4], 360);
      });

      test('backoff level is capped at max', () {
        // Backoff level should never exceed (intervals.length - 1)
        const intervals = SyncScheduler.defaultBackoffIntervals;
        const maxLevel = 4; // intervals.length - 1

        var state = SyncState.initial();

        // Simulate many failures
        for (var i = 0; i < 20; i++) {
          final newLevel = (state.currentBackoffLevel + 1)
              .clamp(0, intervals.length - 1);
          state = state.copyWith(
            currentBackoffLevel: newLevel,
            consecutiveFailures: state.consecutiveFailures + 1,
          );
        }

        expect(state.currentBackoffLevel, maxLevel);
      });
    });
  });
}
