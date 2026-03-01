import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_parent/features/caregiver/models/caregiver_models.dart';
import 'package:mobile_parent/features/caregiver/presentation/caregiver_screen.dart';
import 'package:mobile_parent/features/caregiver/providers/caregiver_provider.dart';

import '../test_helpers.dart';

// ══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ══════════════════════════════════════════════════════════════════════════════

const _studentId = 'student-1';
const _studentName = 'Emma';

StudentCaregiverSummary _makeSummary({
  int maxCaregivers = 3,
  List<Caregiver> caregivers = const [],
  List<CaregiverInvite> pendingInvites = const [],
}) {
  return StudentCaregiverSummary(
    studentId: _studentId,
    studentName: _studentName,
    maxCaregivers: maxCaregivers,
    currentCount: caregivers.length,
    remainingSlots: maxCaregivers - caregivers.length - pendingInvites.length,
    caregivers: caregivers,
    pendingInvites: pendingInvites,
  );
}

Caregiver _makeCaregiver({
  String id = 'cg-1',
  String email = 'grandma@example.com',
  String givenName = 'Jane',
  String familyName = 'Doe',
  CaregiverRelationship relationship = CaregiverRelationship.grandparent,
}) {
  return Caregiver(
    id: id,
    email: email,
    givenName: givenName,
    familyName: familyName,
    relationship: relationship,
    status: 'active',
    permissions: const CaregiverPermissions(),
    delegatedAt: '2024-06-01T00:00:00Z',
  );
}

CaregiverInvite _makeInvite({
  String id = 'inv-1',
  String email = 'uncle@example.com',
  String? name = 'Uncle Bob',
  CaregiverRelationship relationship = CaregiverRelationship.auntUncle,
}) {
  return CaregiverInvite(
    id: id,
    caregiverEmail: email,
    caregiverName: name,
    relationship: relationship,
    status: 'pending',
    permissions: const CaregiverPermissions(),
    expiresAt: '2025-12-31T00:00:00Z',
    createdAt: '2024-06-01T00:00:00Z',
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ══════════════════════════════════════════════════════════════════════════════

Widget _buildScreen({
  required StudentCaregiverSummary summary,
}) {
  return createTestableWidget(
    const CaregiverScreen(
      studentId: _studentId,
      studentName: _studentName,
    ),
    overrides: [
      studentCaregiversProvider(_studentId)
          .overrideWith((ref) async => summary),
    ],
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

void main() {
  group('CaregiverScreen', () {
    testWidgets('shows app bar title', (tester) async {
      await tester.pumpWidget(
        _buildScreen(summary: _makeSummary()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Caregiver Access'), findsOneWidget);
    });

    testWidgets('shows slots indicator with correct count', (tester) async {
      final summary = _makeSummary(
        maxCaregivers: 3,
        caregivers: [_makeCaregiver()],
      );

      await tester.pumpWidget(_buildScreen(summary: summary));
      await tester.pumpAndSettle();

      // Should show "1 of 3 slots used"
      expect(find.textContaining('1'), findsWidgets);
      expect(find.textContaining('3'), findsWidgets);
    });

    testWidgets('shows active caregiver in list', (tester) async {
      final cg = _makeCaregiver(
        givenName: 'Jane',
        familyName: 'Doe',
        email: 'jane@example.com',
      );
      final summary = _makeSummary(caregivers: [cg]);

      await tester.pumpWidget(_buildScreen(summary: summary));
      await tester.pumpAndSettle();

      expect(find.text('Jane Doe'), findsOneWidget);
      expect(find.text('jane@example.com'), findsOneWidget);
      expect(find.text('Active Caregivers'), findsOneWidget);
    });

    testWidgets('shows pending invite', (tester) async {
      final inv = _makeInvite(
        email: 'uncle@example.com',
        name: 'Uncle Bob',
      );
      final summary = _makeSummary(pendingInvites: [inv]);

      await tester.pumpWidget(_buildScreen(summary: summary));
      await tester.pumpAndSettle();

      expect(find.text('Pending Invites'), findsOneWidget);
      expect(find.text('uncle@example.com'), findsOneWidget);
    });

    testWidgets('shows FAB when slots available', (tester) async {
      final summary = _makeSummary(maxCaregivers: 3);

      await tester.pumpWidget(_buildScreen(summary: summary));
      await tester.pumpAndSettle();

      expect(find.text('Invite Caregiver'), findsAtLeast(1));
      expect(find.byType(FloatingActionButton), findsOneWidget);
    });

    testWidgets('hides FAB when all slots used', (tester) async {
      final summary = _makeSummary(
        maxCaregivers: 3,
        caregivers: [
          _makeCaregiver(id: 'cg-1'),
          _makeCaregiver(id: 'cg-2', givenName: 'Alice'),
          _makeCaregiver(id: 'cg-3', givenName: 'Bob'),
        ],
      );

      await tester.pumpWidget(_buildScreen(summary: summary));
      await tester.pumpAndSettle();

      expect(find.byType(FloatingActionButton), findsNothing);
    });

    testWidgets('shows empty state when no caregivers', (tester) async {
      final summary = _makeSummary();

      await tester.pumpWidget(_buildScreen(summary: summary));
      await tester.pumpAndSettle();

      // Should show the invite button / empty state messaging
      expect(find.byIcon(Icons.people_outline), findsWidgets);
    });

    testWidgets('shows loading indicator initially', (tester) async {
      final completer = Completer<StudentCaregiverSummary>();
      addTearDown(() {
        if (!completer.isCompleted) completer.complete(_makeSummary());
      });

      await tester.pumpWidget(
        createTestableWidget(
          const CaregiverScreen(
            studentId: _studentId,
            studentName: _studentName,
          ),
          overrides: [
            studentCaregiversProvider(_studentId).overrideWith(
              (ref) => completer.future,
            ),
          ],
        ),
      );
      // Don't settle — should show loading
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows both active and pending sections', (tester) async {
      final summary = _makeSummary(
        caregivers: [_makeCaregiver()],
        pendingInvites: [_makeInvite()],
      );

      await tester.pumpWidget(_buildScreen(summary: summary));
      await tester.pumpAndSettle();

      expect(find.text('Active Caregivers'), findsOneWidget);
      expect(find.text('Pending Invites'), findsOneWidget);
    });

    testWidgets('shows relationship badge on caregiver card', (tester) async {
      final cg = _makeCaregiver(
        relationship: CaregiverRelationship.grandparent,
      );
      final summary = _makeSummary(caregivers: [cg]);

      await tester.pumpWidget(_buildScreen(summary: summary));
      await tester.pumpAndSettle();

      expect(find.text('Grandparent'), findsOneWidget);
    });
  });
}
