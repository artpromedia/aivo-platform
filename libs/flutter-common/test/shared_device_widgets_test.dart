
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:flutter_common/shared_device/shared_device.dart';
import 'package:flutter_common/widgets/class_code_entry_screen.dart';
import 'package:flutter_common/widgets/roster_selection_screen.dart';
import 'package:flutter_common/widgets/shared_session_bar.dart';
import 'package:flutter_common/device/device.dart';

class MockSharedDeviceService extends Mock implements SharedDeviceService {}
class MockDeviceService extends Mock implements DeviceService {}

void main() {
  group('ClassCodeEntryScreen', () {
    late MockSharedDeviceService mockService;
    late MockDeviceService mockDeviceService;

    setUp(() {
      mockService = MockSharedDeviceService();
      mockDeviceService = MockDeviceService();

      when(() => mockDeviceService.effectivePolicy).thenReturn(
        DevicePolicy(kioskMode: true),
      );
      when(() => mockDeviceService.registration).thenReturn(null);
    });

    testWidgets('displays class code input field', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ClassCodeEntryScreen(
            service: mockService,
            onRosterLoaded: (_) {},
          ),
        ),
      );

      expect(find.text('Join Your Class'), findsOneWidget);
      expect(find.text('Class Code'), findsOneWidget);
      expect(find.byType(TextFormField), findsOneWidget);
      expect(find.text('Join Class'), findsOneWidget);
    });

    testWidgets('validates empty input', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ClassCodeEntryScreen(
            service: mockService,
            onRosterLoaded: (_) {},
          ),
        ),
      );

      await tester.tap(find.text('Join Class'));
      await tester.pump();

      expect(find.text('Please enter a class code'), findsOneWidget);
    });

    testWidgets('validates short input', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ClassCodeEntryScreen(
            service: mockService,
            onRosterLoaded: (_) {},
          ),
        ),
      );

      await tester.enterText(find.byType(TextFormField), 'AB');
      await tester.tap(find.text('Join Class'));
      await tester.pump();

      expect(find.text('Code should be at least 4 characters'), findsOneWidget);
    });

    testWidgets('calls service and triggers callback on valid code', (tester) async {
      final roster = ClassroomRoster(
        classroomId: 'class-1',
        classroomName: 'Test Class',
        teacherName: 'Teacher',
        learners: [],
      );

      when(() => mockService.validateClassCode(any()))
          .thenAnswer((_) async => roster);

      ClassroomRoster? receivedRoster;
      await tester.pumpWidget(
        MaterialApp(
          home: ClassCodeEntryScreen(
            service: mockService,
            onRosterLoaded: (r) => receivedRoster = r,
          ),
        ),
      );

      await tester.enterText(find.byType(TextFormField), 'ABC123');
      await tester.tap(find.text('Join Class'));
      await tester.pumpAndSettle();

      verify(() => mockService.validateClassCode('ABC123')).called(1);
      expect(receivedRoster, roster);
    });

    testWidgets('shows error on invalid code', (tester) async {
      when(() => mockService.validateClassCode(any()))
          .thenThrow(SharedDeviceException('Invalid class code', code: 'INVALID_CODE'));

      await tester.pumpWidget(
        MaterialApp(
          home: ClassCodeEntryScreen(
            service: mockService,
            onRosterLoaded: (_) {},
          ),
        ),
      );

      await tester.enterText(find.byType(TextFormField), 'BADCODE');
      await tester.tap(find.text('Join Class'));
      await tester.pumpAndSettle();

      expect(find.text('Invalid class code'), findsOneWidget);
    });

    testWidgets('shows QR button when callback provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ClassCodeEntryScreen(
            service: mockService,
            onRosterLoaded: (_) {},
            onScanQR: () {},
          ),
        ),
      );

      expect(find.text('Scan Class QR Code'), findsOneWidget);
    });
  });

  group('RosterSelectionScreen', () {
    testWidgets('displays classroom name and learners', (tester) async {
      final roster = ClassroomRoster(
        classroomId: 'class-1',
        classroomName: 'Mrs. Smith\'s Class',
        teacherName: 'Mrs. Smith',
        learners: [
          RosterLearner(learnerId: 'l1', displayName: 'Alice A.'),
          RosterLearner(learnerId: 'l2', displayName: 'Bob B.'),
          RosterLearner(learnerId: 'l3', displayName: 'Carol C.'),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: RosterSelectionScreen(
            roster: roster,
            onLearnerSelected: (_) {},
            onBack: () {},
          ),
        ),
      );

      expect(find.text('Mrs. Smith\'s Class'), findsOneWidget);
      expect(find.text('Tap your name to sign in'), findsOneWidget);
      expect(find.text('Alice A.'), findsOneWidget);
      expect(find.text('Bob B.'), findsOneWidget);
      expect(find.text('Carol C.'), findsOneWidget);
    });

    testWidgets('calls onLearnerSelected when learner tapped', (tester) async {
      final roster = ClassroomRoster(
        classroomId: 'class-1',
        classroomName: 'Test Class',
        teacherName: 'Teacher',
        learners: [
          RosterLearner(learnerId: 'l1', displayName: 'Alice A.'),
        ],
      );

      RosterLearner? selectedLearner;
      await tester.pumpWidget(
        MaterialApp(
          home: RosterSelectionScreen(
            roster: roster,
            onLearnerSelected: (l) => selectedLearner = l,
            onBack: () {},
          ),
        ),
      );

      await tester.tap(find.text('Alice A.'));
      expect(selectedLearner?.learnerId, 'l1');
    });

    testWidgets('calls onBack when back button pressed', (tester) async {
      final roster = ClassroomRoster(
        classroomId: 'class-1',
        classroomName: 'Test Class',
        teacherName: 'Teacher',
        learners: [],
      );

      var backPressed = false;
      await tester.pumpWidget(
        MaterialApp(
          home: RosterSelectionScreen(
            roster: roster,
            onLearnerSelected: (_) {},
            onBack: () => backPressed = true,
          ),
        ),
      );

      await tester.tap(find.byIcon(Icons.arrow_back));
      expect(backPressed, isTrue);
    });

    testWidgets('shows empty state when no learners', (tester) async {
      final roster = ClassroomRoster(
        classroomId: 'class-1',
        classroomName: 'Test Class',
        teacherName: 'Teacher',
        learners: [],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: RosterSelectionScreen(
            roster: roster,
            onLearnerSelected: (_) {},
            onBack: () {},
          ),
        ),
      );

      expect(find.text('No learners in this class'), findsOneWidget);
    });

    testWidgets('shows PIN indicator for learners with PIN', (tester) async {
      final roster = ClassroomRoster(
        classroomId: 'class-1',
        classroomName: 'Test Class',
        teacherName: 'Teacher',
        learners: [
          RosterLearner(learnerId: 'l1', displayName: 'Alice A.', hasPin: true),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: RosterSelectionScreen(
            roster: roster,
            onLearnerSelected: (_) {},
            onBack: () {},
          ),
        ),
      );

      expect(find.text('PIN required'), findsOneWidget);
      expect(find.byIcon(Icons.lock_outline), findsOneWidget);
    });
  });

  group('SharedSessionBar', () {
    testWidgets('displays learner name and end session button', (tester) async {
      final session = SharedDeviceSession(
        sessionId: 'session-1',
        classroomId: 'class-1',
        classroomName: 'Test Class',
        learnerId: 'learner-1',
        learnerDisplayName: 'Alice Anderson',
        startedAt: DateTime.now(),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: const SizedBox(),
            bottomNavigationBar: SharedSessionBar(
              session: session,
              onEndSession: () {},
            ),
          ),
        ),
      );

      expect(find.text('Alice Anderson'), findsOneWidget);
      expect(find.text('Test Class'), findsOneWidget);
      expect(find.text('End Session'), findsOneWidget);
    });

    testWidgets('calls onEndSession when button pressed', (tester) async {
      final session = SharedDeviceSession(
        sessionId: 'session-1',
        classroomId: 'class-1',
        classroomName: 'Test Class',
        learnerId: 'learner-1',
        learnerDisplayName: 'Alice',
        startedAt: DateTime.now(),
      );

      var endSessionCalled = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: const SizedBox(),
            bottomNavigationBar: SharedSessionBar(
              session: session,
              onEndSession: () => endSessionCalled = true,
            ),
          ),
        ),
      );

      await tester.tap(find.text('End Session'));
      expect(endSessionCalled, isTrue);
    });

    testWidgets('hides learner name when showLearnerName is false', (tester) async {
      final session = SharedDeviceSession(
        sessionId: 'session-1',
        classroomId: 'class-1',
        classroomName: 'Test Class',
        learnerId: 'learner-1',
        learnerDisplayName: 'Alice',
        startedAt: DateTime.now(),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: const SizedBox(),
            bottomNavigationBar: SharedSessionBar(
              session: session,
              onEndSession: () {},
              showLearnerName: false,
            ),
          ),
        ),
      );

      expect(find.text('Alice'), findsNothing);
      expect(find.text('End Session'), findsOneWidget);
    });
  });

  group('End Session Confirmation', () {
    testWidgets('shows confirmation dialog', (tester) async {
      final session = SharedDeviceSession(
        sessionId: 'session-1',
        classroomId: 'class-1',
        classroomName: 'Test Class',
        learnerId: 'learner-1',
        learnerDisplayName: 'Alice Anderson',
        startedAt: DateTime.now(),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () async {
                await showEndSessionConfirmDialog(
                  context: context,
                  session: session,
                );
              },
              child: const Text('Show Dialog'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show Dialog'));
      await tester.pumpAndSettle();

      expect(find.text('End Session?'), findsOneWidget);
      expect(find.text('Are you finished, Alice?'), findsOneWidget);
      expect(find.text('Your work has been saved!'), findsOneWidget);
      expect(find.text('Keep Learning'), findsOneWidget);
    });

    testWidgets('returns true on confirm', (tester) async {
      final session = SharedDeviceSession(
        sessionId: 'session-1',
        classroomId: 'class-1',
        classroomName: 'Test Class',
        learnerId: 'learner-1',
        learnerDisplayName: 'Alice Anderson',
        startedAt: DateTime.now(),
      );

      bool? result;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () async {
                result = await showEndSessionConfirmDialog(
                  context: context,
                  session: session,
                );
              },
              child: const Text('Show Dialog'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show Dialog'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'End Session'));
      await tester.pumpAndSettle();

      expect(result, isTrue);
    });

    testWidgets('returns false on cancel', (tester) async {
      final session = SharedDeviceSession(
        sessionId: 'session-1',
        classroomId: 'class-1',
        classroomName: 'Test Class',
        learnerId: 'learner-1',
        learnerDisplayName: 'Alice Anderson',
        startedAt: DateTime.now(),
      );

      bool? result;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () async {
                result = await showEndSessionConfirmDialog(
                  context: context,
                  session: session,
                );
              },
              child: const Text('Show Dialog'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Show Dialog'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Keep Learning'));
      await tester.pumpAndSettle();

      expect(result, isFalse);
    });
  });
}
