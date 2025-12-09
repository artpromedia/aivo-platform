import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_common/flutter_common.dart';

import 'package:mobile_learner/baseline/baseline_controller.dart';
import 'package:mobile_learner/baseline/baseline_service.dart';

void main() {
  group('LearnerBaselineController', () {
    late LearnerBaselineService service;
    late LearnerBaselineController controller;

    setUp(() {
      LearnerBaselineService.resetMockState();
      service = LearnerBaselineService();
      controller = LearnerBaselineController(service);
    });

    test('initial state is correct', () {
      expect(controller.state.profile, isNull);
      expect(controller.state.currentItem, isNull);
      expect(controller.state.isLoading, isFalse);
      expect(controller.state.isComplete, isFalse);
      expect(controller.state.isOnBreak, isFalse);
    });

    test('checkBaselineStatus loads profile', () async {
      await controller.checkBaselineStatus('learner-test-1');

      // Mock service returns profile based on learner ID hash
      expect(controller.state.isLoading, isFalse);
    });

    test('loadNextItem fetches next question', () async {
      // Set up attempt ID first
      controller.setAttemptId('mock-attempt-1');

      await controller.loadNextItem();

      expect(controller.state.isLoading, isFalse);
      expect(controller.state.currentItem, isNotNull);
      expect(controller.state.currentItem!.sequence, equals(1));
      expect(controller.state.questionStartTime, isNotNull);
    });

    test('submitAnswer sends response and returns true', () async {
      controller.setAttemptId('mock-attempt-1');
      await controller.loadNextItem();

      final success = await controller.submitAnswer({'selectedOption': 0});

      expect(success, isTrue);
      expect(controller.state.error, isNull);
    });

    test('takeBreak and resumeFromBreak toggle break state', () {
      expect(controller.state.isOnBreak, isFalse);

      controller.takeBreak();
      expect(controller.state.isOnBreak, isTrue);

      controller.resumeFromBreak();
      expect(controller.state.isOnBreak, isFalse);
    });

    test('reset clears all state', () async {
      controller.setAttemptId('mock-attempt-1');
      await controller.loadNextItem();
      controller.takeBreak();

      controller.reset();

      expect(controller.state.profile, isNull);
      expect(controller.state.currentItem, isNull);
      expect(controller.state.attemptId, isNull);
      expect(controller.state.isOnBreak, isFalse);
    });

    test('clearError removes error from state', () async {
      // Trigger an error by not setting attempt ID
      await controller.loadNextItem();

      expect(controller.state.error, isNotNull);

      controller.clearError();
      expect(controller.state.error, isNull);
    });
  });

  group('LearnerBaselineState', () {
    test('progress calculation is correct', () {
      final item = BaselineItem(
        itemId: 'item-1',
        sequence: 10,
        totalItems: 25,
        domain: BaselineDomain.math,
        skillCode: 'MATH.SKILL.1',
        questionType: 'MULTIPLE_CHOICE',
        questionText: 'Test?',
        options: ['A', 'B', 'C', 'D'],
      );

      final state = LearnerBaselineState(currentItem: item);

      expect(state.currentQuestion, equals(10));
      expect(state.totalQuestions, equals(25));
      expect(state.progress, equals(0.4)); // 10/25
    });

    test('needsStart is true for NOT_STARTED profile', () {
      final profile = BaselineProfile(
        id: 'p1',
        tenantId: 't1',
        learnerId: 'l1',
        gradeBand: 'K5',
        status: BaselineProfileStatus.notStarted,
        attemptCount: 0,
      );

      final state = LearnerBaselineState(profile: profile);

      expect(state.needsStart, isTrue);
      expect(state.isInProgress, isFalse);
      expect(state.isDone, isFalse);
    });

    test('isInProgress is true for IN_PROGRESS profile', () {
      final profile = BaselineProfile(
        id: 'p1',
        tenantId: 't1',
        learnerId: 'l1',
        gradeBand: 'K5',
        status: BaselineProfileStatus.inProgress,
        attemptCount: 1,
      );

      final state = LearnerBaselineState(profile: profile);

      expect(state.needsStart, isFalse);
      expect(state.isInProgress, isTrue);
      expect(state.isDone, isFalse);
    });

    test('isDone is true for COMPLETED or FINAL_ACCEPTED', () {
      final completedProfile = BaselineProfile(
        id: 'p1',
        tenantId: 't1',
        learnerId: 'l1',
        gradeBand: 'K5',
        status: BaselineProfileStatus.completed,
        attemptCount: 1,
      );

      final acceptedProfile = BaselineProfile(
        id: 'p1',
        tenantId: 't1',
        learnerId: 'l1',
        gradeBand: 'K5',
        status: BaselineProfileStatus.finalAccepted,
        attemptCount: 1,
      );

      expect(LearnerBaselineState(profile: completedProfile).isDone, isTrue);
      expect(LearnerBaselineState(profile: acceptedProfile).isDone, isTrue);
    });
  });

  group('BaselineItem', () {
    test('isMultipleChoice returns true for MULTIPLE_CHOICE type', () {
      final item = BaselineItem(
        itemId: 'item-1',
        sequence: 1,
        totalItems: 25,
        domain: BaselineDomain.ela,
        skillCode: 'ELA.SKILL.1',
        questionType: 'MULTIPLE_CHOICE',
        questionText: 'Choose the best answer.',
        options: ['A', 'B', 'C', 'D'],
      );

      expect(item.isMultipleChoice, isTrue);
      expect(item.isOpenEnded, isFalse);
    });

    test('isOpenEnded returns true for OPEN_ENDED type', () {
      final item = BaselineItem(
        itemId: 'item-1',
        sequence: 1,
        totalItems: 25,
        domain: BaselineDomain.speech,
        skillCode: 'SPEECH.SKILL.1',
        questionType: 'OPEN_ENDED',
        questionText: 'Write your answer.',
      );

      expect(item.isMultipleChoice, isFalse);
      expect(item.isOpenEnded, isTrue);
    });
  });

  group('BaselineDomain', () {
    test('fromCode returns correct domain', () {
      expect(BaselineDomain.fromCode('ELA'), equals(BaselineDomain.ela));
      expect(BaselineDomain.fromCode('MATH'), equals(BaselineDomain.math));
      expect(BaselineDomain.fromCode('SCIENCE'), equals(BaselineDomain.science));
      expect(BaselineDomain.fromCode('SPEECH'), equals(BaselineDomain.speech));
      expect(BaselineDomain.fromCode('SEL'), equals(BaselineDomain.sel));
    });

    test('fromCode is case insensitive', () {
      expect(BaselineDomain.fromCode('ela'), equals(BaselineDomain.ela));
      expect(BaselineDomain.fromCode('Math'), equals(BaselineDomain.math));
    });

    test('domain has correct labels', () {
      expect(BaselineDomain.ela.label, equals('Reading & Writing'));
      expect(BaselineDomain.math.label, equals('Math'));
      expect(BaselineDomain.science.label, equals('Science'));
      expect(BaselineDomain.speech.label, equals('Speech & Language'));
      expect(BaselineDomain.sel.label, equals('Social-Emotional'));
    });
  });

  group('LearnerBaselineService mock', () {
    late LearnerBaselineService service;

    setUp(() {
      LearnerBaselineService.resetMockState();
      service = LearnerBaselineService();
    });

    test('getNextItem returns sequential items', () async {
      final response1 = await service.getNextItem('attempt-1');
      expect(response1.complete, isFalse);
      expect(response1.item?.sequence, equals(1));

      final response2 = await service.getNextItem('attempt-1');
      expect(response2.complete, isFalse);
      expect(response2.item?.sequence, equals(2));
    });

    test('submitAnswer returns success response', () async {
      final response = await service.submitAnswer(
        itemId: 'item-1',
        response: {'selectedOption': 0},
        latencyMs: 5000,
      );

      expect(response.responseId, isNotEmpty);
      expect(response.isCorrect, isTrue);
    });

    test('completeAttempt returns scores', () async {
      final response = await service.completeAttempt('attempt-1');

      expect(response.status, equals('COMPLETED'));
      expect(response.score, greaterThan(0));
      expect(response.domainScores, isNotEmpty);
      expect(response.domainScores.length, equals(5)); // All 5 domains
    });
  });
}
