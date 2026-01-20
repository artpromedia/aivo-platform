import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_learner/onboarding/onboarding_controller.dart';
import 'package:mobile_learner/onboarding/onboarding_state.dart';
import 'package:mobile_learner/onboarding/onboarding_steps.dart';
import 'package:mobile_learner/onboarding/onboarding_storage.dart';

/// Mock storage that keeps data in memory for testing.
class MockOnboardingStorage extends OnboardingStorage {
  final Map<String, String> _data = {};

  @override
  Future<bool> isCompleted() async => _data['onboarding_completed'] == 'true';

  @override
  Future<void> markCompleted(String learnerId) async {
    _data['onboarding_completed_$learnerId'] = 'true';
    _data['onboarding_completed'] = 'true';
  }

  @override
  Future<bool> isCompletedForLearner(String learnerId) async =>
      _data['onboarding_completed_$learnerId'] == 'true';

  @override
  Future<void> saveProfileName(String learnerId, String name) async {
    _data['onboarding_profile_name_$learnerId'] = name;
  }

  @override
  Future<String?> getProfileName(String learnerId) async =>
      _data['onboarding_profile_name_$learnerId'];

  @override
  Future<void> saveAvatarId(String learnerId, String avatarId) async {
    _data['onboarding_avatar_id_$learnerId'] = avatarId;
  }

  @override
  Future<String?> getAvatarId(String learnerId) async =>
      _data['onboarding_avatar_id_$learnerId'];

  @override
  Future<void> saveGradeLevel(String learnerId, int gradeLevel) async {
    _data['onboarding_grade_level_$learnerId'] = gradeLevel.toString();
  }

  @override
  Future<int?> getGradeLevel(String learnerId) async {
    final value = _data['onboarding_grade_level_$learnerId'];
    return value != null ? int.tryParse(value) : null;
  }

  @override
  Future<void> clearForLearner(String learnerId) async {
    _data.removeWhere((key, _) => key.contains(learnerId));
  }

  @override
  Future<void> clearAll() async {
    _data.clear();
  }

  void setCompleted(String learnerId) {
    _data['onboarding_completed_$learnerId'] = 'true';
    _data['onboarding_completed'] = 'true';
  }
}

void main() {
  group('OnboardingController', () {
    late MockOnboardingStorage storage;
    late OnboardingController controller;

    setUp(() {
      storage = MockOnboardingStorage();
      controller = OnboardingController(storage);
    });

    test('initial state is loading', () {
      expect(controller.state.isLoading, isTrue);
      expect(controller.state.isCompleted, isFalse);
      expect(controller.state.currentStep, equals(OnboardingStep.welcome));
    });

    test('init sets state to not started for new learner', () async {
      await controller.init('learner-test-1');

      expect(controller.state.isLoading, isFalse);
      expect(controller.state.isCompleted, isFalse);
      expect(controller.state.currentStep, equals(OnboardingStep.welcome));
    });

    test('init sets state to completed for existing learner', () async {
      storage.setCompleted('learner-test-1');

      await controller.init('learner-test-1');

      expect(controller.state.isLoading, isFalse);
      expect(controller.state.isCompleted, isTrue);
      expect(controller.state.currentStep, equals(OnboardingStep.complete));
    });

    test('init loads saved profile data', () async {
      await storage.saveProfileName('learner-test-1', 'Test User');
      await storage.saveAvatarId('learner-test-1', 'avatar_2');
      await storage.saveGradeLevel('learner-test-1', 5);

      await controller.init('learner-test-1');

      expect(controller.state.profileData?.displayName, equals('Test User'));
      expect(controller.state.profileData?.avatarId, equals('avatar_2'));
      expect(controller.state.profileData?.gradeLevel, equals(5));
    });

    test('nextStep advances through flow', () async {
      await controller.init('learner-test-1');

      expect(controller.state.currentStep, equals(OnboardingStep.welcome));

      controller.nextStep();
      expect(controller.state.currentStep, equals(OnboardingStep.profileSetup));

      controller.nextStep();
      expect(controller.state.currentStep, equals(OnboardingStep.preferences));

      controller.nextStep();
      expect(controller.state.currentStep, equals(OnboardingStep.baselineIntro));

      controller.nextStep();
      expect(controller.state.currentStep, equals(OnboardingStep.complete));
    });

    test('previousStep goes back through flow', () async {
      await controller.init('learner-test-1');

      controller.goToStep(OnboardingStep.preferences);
      expect(controller.state.currentStep, equals(OnboardingStep.preferences));

      controller.previousStep();
      expect(controller.state.currentStep, equals(OnboardingStep.profileSetup));

      controller.previousStep();
      expect(controller.state.currentStep, equals(OnboardingStep.welcome));

      // Cannot go before welcome
      controller.previousStep();
      expect(controller.state.currentStep, equals(OnboardingStep.welcome));
    });

    test('updateProfile saves profile data', () async {
      await controller.init('learner-test-1');

      await controller.updateProfile(
        displayName: 'Test Name',
        avatarId: 'avatar_3',
        gradeLevel: 7,
      );

      expect(controller.state.profileData?.displayName, equals('Test Name'));
      expect(controller.state.profileData?.avatarId, equals('avatar_3'));
      expect(controller.state.profileData?.gradeLevel, equals(7));

      // Verify persisted
      expect(await storage.getProfileName('learner-test-1'), equals('Test Name'));
      expect(await storage.getAvatarId('learner-test-1'), equals('avatar_3'));
      expect(await storage.getGradeLevel('learner-test-1'), equals(7));
    });

    test('updatePreferences saves preferences data', () async {
      await controller.init('learner-test-1');

      controller.updatePreferences(
        useDyslexiaFont: true,
        useHighContrast: false,
        useReducedMotion: true,
        preferredSubjects: ['math', 'science'],
      );

      expect(controller.state.preferencesData?.useDyslexiaFont, isTrue);
      expect(controller.state.preferencesData?.useHighContrast, isFalse);
      expect(controller.state.preferencesData?.useReducedMotion, isTrue);
      expect(controller.state.preferencesData?.preferredSubjects, contains('math'));
      expect(controller.state.preferencesData?.preferredSubjects, contains('science'));
    });

    test('completeOnboarding marks as complete', () async {
      await controller.init('learner-test-1');

      await controller.completeOnboarding();

      expect(controller.state.isCompleted, isTrue);
      expect(controller.state.currentStep, equals(OnboardingStep.complete));
      expect(await storage.isCompletedForLearner('learner-test-1'), isTrue);
    });

    test('skipOnboarding marks as complete immediately', () async {
      await controller.init('learner-test-1');

      await controller.skipOnboarding();

      expect(controller.state.isCompleted, isTrue);
    });

    test('reset clears all state', () async {
      await controller.init('learner-test-1');
      controller.goToStep(OnboardingStep.preferences);
      await controller.updateProfile(displayName: 'Test');

      controller.reset();

      expect(controller.state.isLoading, isTrue);
      expect(controller.state.currentStep, equals(OnboardingStep.welcome));
    });

    test('progress is calculated correctly', () async {
      await controller.init('learner-test-1');

      expect(controller.state.progress, equals(0.0));

      controller.nextStep();
      expect(controller.state.progress, equals(0.25));

      controller.nextStep();
      expect(controller.state.progress, equals(0.5));

      controller.nextStep();
      expect(controller.state.progress, equals(0.75));

      await controller.completeOnboarding();
      expect(controller.state.progress, equals(1.0));
    });
  });

  group('OnboardingStep', () {
    test('stepIndex returns correct indices', () {
      expect(OnboardingStep.welcome.stepIndex, equals(0));
      expect(OnboardingStep.profileSetup.stepIndex, equals(1));
      expect(OnboardingStep.preferences.stepIndex, equals(2));
      expect(OnboardingStep.baselineIntro.stepIndex, equals(3));
      expect(OnboardingStep.complete.stepIndex, equals(4));
    });

    test('nextStep returns correct next step', () {
      expect(OnboardingStep.welcome.nextStep, equals(OnboardingStep.profileSetup));
      expect(OnboardingStep.profileSetup.nextStep, equals(OnboardingStep.preferences));
      expect(OnboardingStep.preferences.nextStep, equals(OnboardingStep.baselineIntro));
      expect(OnboardingStep.baselineIntro.nextStep, equals(OnboardingStep.complete));
      expect(OnboardingStep.complete.nextStep, isNull);
    });

    test('previousStep returns correct previous step', () {
      expect(OnboardingStep.welcome.previousStep, isNull);
      expect(OnboardingStep.profileSetup.previousStep, equals(OnboardingStep.welcome));
      expect(OnboardingStep.preferences.previousStep, equals(OnboardingStep.profileSetup));
      expect(OnboardingStep.baselineIntro.previousStep, equals(OnboardingStep.preferences));
      expect(OnboardingStep.complete.previousStep, equals(OnboardingStep.baselineIntro));
    });

    test('isLastContentStep identifies baseline intro', () {
      expect(OnboardingStep.welcome.isLastContentStep, isFalse);
      expect(OnboardingStep.baselineIntro.isLastContentStep, isTrue);
      expect(OnboardingStep.complete.isLastContentStep, isFalse);
    });

    test('title and description are non-empty', () {
      for (final step in OnboardingStep.values) {
        expect(step.title, isNotEmpty);
        expect(step.description, isNotEmpty);
      }
    });
  });

  group('OnboardingState', () {
    test('initial factory creates loading state', () {
      final state = OnboardingState.initial();

      expect(state.isLoading, isTrue);
      expect(state.isCompleted, isFalse);
      expect(state.currentStep, equals(OnboardingStep.welcome));
    });

    test('completed factory creates completed state', () {
      final state = OnboardingState.completed();

      expect(state.isLoading, isFalse);
      expect(state.isCompleted, isTrue);
      expect(state.currentStep, equals(OnboardingStep.complete));
    });

    test('notStarted factory creates ready state', () {
      final state = OnboardingState.notStarted();

      expect(state.isLoading, isFalse);
      expect(state.isCompleted, isFalse);
      expect(state.isReady, isTrue);
    });

    test('copyWith preserves unchanged values', () {
      const state = OnboardingState(
        currentStep: OnboardingStep.preferences,
        isCompleted: false,
        isLoading: false,
        error: 'Test error',
        profileData: OnboardingProfileData(displayName: 'Test'),
        preferencesData: null,
      );

      final newState = state.copyWith(currentStep: OnboardingStep.baselineIntro);

      expect(newState.currentStep, equals(OnboardingStep.baselineIntro));
      expect(newState.error, equals('Test error'));
      expect(newState.profileData?.displayName, equals('Test'));
    });

    test('copyWith clearError removes error', () {
      const state = OnboardingState(
        currentStep: OnboardingStep.welcome,
        isCompleted: false,
        isLoading: false,
        error: 'Test error',
        profileData: null,
        preferencesData: null,
      );

      final newState = state.copyWith(clearError: true);

      expect(newState.error, isNull);
    });
  });

  group('OnboardingProfileData', () {
    test('isComplete requires displayName', () {
      const empty = OnboardingProfileData();
      expect(empty.isComplete, isFalse);

      const withName = OnboardingProfileData(displayName: 'Test');
      expect(withName.isComplete, isTrue);

      const withEmptyName = OnboardingProfileData(displayName: '');
      expect(withEmptyName.isComplete, isFalse);
    });

    test('copyWith creates new instance', () {
      const data = OnboardingProfileData(
        displayName: 'Original',
        avatarId: 'avatar_1',
        gradeLevel: 5,
      );

      final newData = data.copyWith(displayName: 'New Name');

      expect(newData.displayName, equals('New Name'));
      expect(newData.avatarId, equals('avatar_1'));
      expect(newData.gradeLevel, equals(5));
    });
  });
}
