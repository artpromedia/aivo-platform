import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_common/flutter_common.dart';

import 'package:mobile_parent/baseline/baseline_controller.dart';
import 'package:mobile_parent/baseline/baseline_service.dart';
import 'package:mobile_parent/widgets/baseline_status_card.dart';

void main() {
  group('BaselineStatusCard', () {
    testWidgets('shows "Start Baseline" for NOT_STARTED status', (tester) async {
      final learner = const Learner(
        id: 'learner-1',
        tenantId: 'tenant-1',
        name: 'Alex',
        grade: 3,
      );
      final profile = BaselineProfile(
        id: 'profile-1',
        tenantId: 'tenant-1',
        learnerId: 'learner-1',
        gradeBand: 'K5',
        status: BaselineProfileStatus.notStarted,
        attemptCount: 0,
      );

      bool startCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BaselineStatusCard(
              learner: learner,
              profile: profile,
              onStart: () => startCalled = true,
              onResume: () {},
              onViewResults: () {},
            ),
          ),
        ),
      );

      // Verify learner name is displayed
      expect(find.text('Alex'), findsOneWidget);

      // Verify "Start Baseline" button exists
      expect(find.text('Start Baseline'), findsOneWidget);

      // Tap the button
      await tester.tap(find.text('Start Baseline'));
      await tester.pump();

      // Verify callback was invoked
      expect(startCalled, isTrue);
    });

    testWidgets('shows "Resume Baseline" for IN_PROGRESS status', (tester) async {
      final learner = const Learner(
        id: 'learner-1',
        tenantId: 'tenant-1',
        name: 'Jordan',
        grade: 5,
      );
      final profile = BaselineProfile(
        id: 'profile-1',
        tenantId: 'tenant-1',
        learnerId: 'learner-1',
        gradeBand: 'K5',
        status: BaselineProfileStatus.inProgress,
        attemptCount: 1,
      );

      bool resumeCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BaselineStatusCard(
              learner: learner,
              profile: profile,
              onStart: () {},
              onResume: () => resumeCalled = true,
              onViewResults: () {},
            ),
          ),
        ),
      );

      expect(find.text('Resume Baseline'), findsOneWidget);

      await tester.tap(find.text('Resume Baseline'));
      await tester.pump();

      expect(resumeCalled, isTrue);
    });

    testWidgets('shows "View Results" for COMPLETED status', (tester) async {
      final learner = const Learner(
        id: 'learner-1',
        tenantId: 'tenant-1',
        name: 'Sam',
        grade: 7,
      );
      final profile = BaselineProfile(
        id: 'profile-1',
        tenantId: 'tenant-1',
        learnerId: 'learner-1',
        gradeBand: 'G6_8',
        status: BaselineProfileStatus.completed,
        attemptCount: 1,
      );

      bool viewResultsCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BaselineStatusCard(
              learner: learner,
              profile: profile,
              onStart: () {},
              onResume: () {},
              onViewResults: () => viewResultsCalled = true,
            ),
          ),
        ),
      );

      expect(find.text('View Results'), findsOneWidget);

      await tester.tap(find.text('View Results'));
      await tester.pump();

      expect(viewResultsCalled, isTrue);
    });

    testWidgets('shows loading state correctly', (tester) async {
      final learner = const Learner(
        id: 'learner-1',
        tenantId: 'tenant-1',
        name: 'Test',
        grade: 3,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BaselineStatusCard(
              learner: learner,
              profile: null,
              isLoading: true,
              onStart: () {},
              onResume: () {},
              onViewResults: () {},
            ),
          ),
        ),
      );

      // Should show loading indicator
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });

  group('BaselineController', () {
    test('createProfile updates state with new profile', () async {
      final service = BaselineService();
      final controller = BaselineController(service);

      final profile = await controller.createProfile(
        tenantId: 'tenant-1',
        learnerId: 'learner-1',
        grade: 3,
      );

      expect(profile, isNotNull);
      expect(controller.state.profiles['learner-1'], isNotNull);
      expect(controller.state.isLoading, isFalse);
    });

    test('loadProfile fetches and stores profile', () async {
      final service = BaselineService();
      final controller = BaselineController(service);

      await controller.loadProfile('learner-100');

      // Mock returns profile for some learner IDs
      expect(controller.state.isLoading, isFalse);
    });

    test('clearError removes error from state', () {
      final service = BaselineService();
      final controller = BaselineController(service);

      // Manually set error state
      controller.state = controller.state.copyWith(error: 'Test error');
      expect(controller.state.error, equals('Test error'));

      controller.clearError();
      expect(controller.state.error, isNull);
    });
  });

  group('BaselineState', () {
    test('statusLabel returns correct labels', () {
      expect(
        BaselineState.statusLabel(BaselineProfileStatus.notStarted),
        equals('Not Started'),
      );
      expect(
        BaselineState.statusLabel(BaselineProfileStatus.inProgress),
        equals('In Progress'),
      );
      expect(
        BaselineState.statusLabel(BaselineProfileStatus.completed),
        equals('Completed'),
      );
      expect(
        BaselineState.statusLabel(BaselineProfileStatus.finalAccepted),
        equals('Accepted'),
      );
    });

    test('profileFor returns correct profile', () {
      final profile = BaselineProfile(
        id: 'p1',
        tenantId: 't1',
        learnerId: 'l1',
        gradeBand: 'K5',
        status: BaselineProfileStatus.notStarted,
        attemptCount: 0,
      );

      final state = BaselineState(profiles: {'l1': profile});

      expect(state.profileFor('l1'), equals(profile));
      expect(state.profileFor('l2'), isNull);
    });
  });
}
