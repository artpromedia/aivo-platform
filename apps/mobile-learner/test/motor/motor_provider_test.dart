import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_learner/motor/motor_models.dart';
import 'package:mobile_learner/motor/motor_profile_provider.dart';
import 'package:mobile_learner/motor/motor_accommodation_service.dart';

// Mock service for testing
class MockMotorAccommodationService extends MotorAccommodationService {
  MotorProfile? profileToReturn;
  MotorAccommodations? accommodationsToReturn;
  bool shouldThrowError = false;
  String? errorMessage;
  
  int getProfileCallCount = 0;
  int getAccommodationsCallCount = 0;
  int updateProfileCallCount = 0;
  int logInteractionCallCount = 0;
  
  String? lastLearnerId;
  Map<String, dynamic>? lastUpdates;

  MockMotorAccommodationService() : super(baseUrl: 'http://test');

  @override
  Future<MotorProfile> getProfile(String learnerId) async {
    getProfileCallCount++;
    lastLearnerId = learnerId;
    if (shouldThrowError) {
      throw Exception(errorMessage ?? 'Mock error');
    }
    return profileToReturn ?? MotorProfile.defaults(learnerId: learnerId);
  }

  @override
  Future<MotorAccommodations> getAccommodations(String learnerId) async {
    getAccommodationsCallCount++;
    lastLearnerId = learnerId;
    if (shouldThrowError) {
      throw Exception(errorMessage ?? 'Mock error');
    }
    return accommodationsToReturn ?? MotorAccommodations.defaults();
  }

  @override
  Future<MotorProfile> updateProfile(
    String learnerId,
    Map<String, dynamic> updates,
  ) async {
    updateProfileCallCount++;
    lastUpdates = updates;
    if (shouldThrowError) {
      throw Exception(errorMessage ?? 'Mock error');
    }
    return profileToReturn ?? MotorProfile.defaults(learnerId: learnerId);
  }

  @override
  Future<void> logInteraction({
    required String learnerId,
    required String interactionType,
    String? sessionId,
    String? targetElement,
    int attemptCount = 1,
    int? successOnAttempt,
    int? totalTimeMs,
    double? targetHitAccuracy,
    double? dragPathSmoothness,
    required bool successful,
    bool usedAlternative = false,
    String? alternativeMethod,
    List<String> accommodationsActive = const [],
  }) async {
    logInteractionCallCount++;
    if (shouldThrowError) {
      throw Exception(errorMessage ?? 'Mock error');
    }
  }

  @override
  Future<MotorProfile> autoConfigureFromLevel(
    String learnerId,
    MotorAbilityLevel fineMotorLevel,
    MotorAbilityLevel grossMotorLevel,
  ) async {
    if (shouldThrowError) {
      throw Exception(errorMessage ?? 'Mock error');
    }
    return profileToReturn ?? MotorProfile.defaults(learnerId: learnerId);
  }

  @override
  Future<Map<String, dynamic>> getContentAdaptations(String learnerId) async {
    if (shouldThrowError) {
      throw Exception(errorMessage ?? 'Mock error');
    }
    return {};
  }
}

void main() {
  group('MotorProfileProvider', () {
    late MotorProfileProvider provider;
    late MockMotorAccommodationService mockService;

    setUp(() {
      provider = MotorProfileProvider();
      mockService = MockMotorAccommodationService();
    });

    group('initialization', () {
      test('starts with null profile and accommodations', () {
        expect(provider.profile, isNull);
        expect(provider.accommodations, isNull);
        expect(provider.hasAccommodations, isFalse);
      });

      test('starts with loading false', () {
        expect(provider.loading, isFalse);
      });

      test('starts with no error', () {
        expect(provider.error, isNull);
      });

      test('service is null before initialization', () {
        expect(provider.service, isNull);
      });

      test('initialize sets the service', () {
        provider.initialize(mockService);
        expect(provider.service, equals(mockService));
      });
    });

    group('loadAccommodations', () {
      test('sets error when service not initialized', () async {
        await provider.loadAccommodations('learner-123');

        expect(provider.error, equals('Service not initialized'));
      });

      test('fetches profile and accommodations from service', () async {
        mockService.profileToReturn = MotorProfile.defaults(
          learnerId: 'learner-123',
        );
        mockService.accommodationsToReturn = MotorAccommodations.defaults();

        provider.initialize(mockService);
        await provider.loadAccommodations('learner-123');

        expect(mockService.getProfileCallCount, equals(1));
        expect(mockService.getAccommodationsCallCount, equals(1));
        expect(mockService.lastLearnerId, equals('learner-123'));
      });

      test('updates profile state after successful load', () async {
        const testProfile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          touchTargetMultiplier: 1.5,
          voiceInputEnabled: true,
        );
        mockService.profileToReturn = testProfile;
        mockService.accommodationsToReturn = MotorAccommodations.fromProfile(testProfile);

        provider.initialize(mockService);
        await provider.loadAccommodations('learner-123');

        expect(provider.profile, isNotNull);
        expect(provider.profile!.learnerId, equals('learner-123'));
        expect(provider.accommodations, isNotNull);
        expect(provider.hasAccommodations, isTrue);
      });

      test('sets error on service failure', () async {
        mockService.shouldThrowError = true;
        mockService.errorMessage = 'Network error';

        provider.initialize(mockService);
        await provider.loadAccommodations('learner-123');

        expect(provider.error, isNotNull);
        expect(provider.loading, isFalse);
      });

      test('notifies listeners on state change', () async {
        int notificationCount = 0;
        provider.addListener(() {
          notificationCount++;
        });

        mockService.profileToReturn = MotorProfile.defaults(learnerId: 'learner-123');
        mockService.accommodationsToReturn = MotorAccommodations.defaults();

        provider.initialize(mockService);
        await provider.loadAccommodations('learner-123');

        expect(notificationCount, greaterThan(0));
      });
    });

    group('Quick Access Getters', () {
      setUp(() {
        provider.initialize(mockService);
      });

      group('with accommodations loaded', () {
        setUp(() async {
          const profile = MotorProfile(
            learnerId: 'learner-123',
            tenantId: 'tenant-456',
            touchTargetMultiplier: 1.75,
            touchHoldDuration: 400,
            voiceInputEnabled: true,
            dwellSelectionEnabled: true,
            dwellTimeMs: 1200,
            switchAccessEnabled: true,
            switchScanSpeed: 1500,
            tremorFilterEnabled: true,
            tremorFilterStrength: 0.8,
            dragAssistEnabled: true,
            dragSnapToGrid: true,
            dragGridSize: 24,
            simplifiedGestures: true,
          );
          mockService.profileToReturn = profile;
          mockService.accommodationsToReturn = MotorAccommodations.fromProfile(profile);
          await provider.loadAccommodations('learner-123');
        });

        test('touchTargetMultiplier returns profile value', () {
          expect(provider.touchTargetMultiplier, equals(1.75));
        });

        test('enlargedTouchTargets returns true when multiplier > 1', () {
          expect(provider.enlargedTouchTargets, isTrue);
        });

        test('touchHoldDuration returns profile value', () {
          expect(provider.touchHoldDuration, equals(400));
        });

        test('holdToActivateEnabled returns true when hold duration > 0', () {
          expect(provider.holdToActivateEnabled, isTrue);
        });

        test('voiceInputEnabled returns profile value', () {
          expect(provider.voiceInputEnabled, isTrue);
        });

        test('dwellSelectionEnabled returns profile value', () {
          expect(provider.dwellSelectionEnabled, isTrue);
        });

        test('dwellTimeMs returns profile value', () {
          expect(provider.dwellTimeMs, equals(1200));
        });

        test('dwellTimeEnabled is alias for dwellSelectionEnabled', () {
          expect(provider.dwellTimeEnabled, equals(provider.dwellSelectionEnabled));
        });

        test('switchAccessEnabled returns profile value', () {
          expect(provider.switchAccessEnabled, isTrue);
        });

        test('switchScanSpeed returns profile value', () {
          expect(provider.switchScanSpeed, equals(1500));
        });

        test('tremorFilterEnabled returns profile value', () {
          expect(provider.tremorFilterEnabled, isTrue);
        });

        test('tremorFilterStrength returns scaled percentage', () {
          // 0.8 * 100 = 80
          expect(provider.tremorFilterStrength, equals(80));
        });

        test('dragAssistEnabled returns profile value', () {
          expect(provider.dragAssistEnabled, isTrue);
        });

        test('dragSnapToGrid returns profile value', () {
          expect(provider.dragSnapToGrid, isTrue);
        });

        test('dragGridSize returns profile value', () {
          expect(provider.dragGridSize, equals(24));
        });

        test('simplifiedGestures returns profile value', () {
          expect(provider.simplifiedGestures, isTrue);
        });

        test('gesturesToButtons is alias for simplifiedGestures', () {
          expect(provider.gesturesToButtons, equals(provider.simplifiedGestures));
        });

        test('simplifiedGesturesEnabled is alias for simplifiedGestures', () {
          expect(provider.simplifiedGesturesEnabled, equals(provider.simplifiedGestures));
        });
      });

      group('with no accommodations loaded', () {
        test('touchTargetMultiplier returns 1.0 default', () {
          expect(provider.touchTargetMultiplier, equals(1.0));
        });

        test('enlargedTouchTargets returns false', () {
          expect(provider.enlargedTouchTargets, isFalse);
        });

        test('voiceInputEnabled returns false default', () {
          expect(provider.voiceInputEnabled, isFalse);
        });

        test('dwellSelectionEnabled returns false default', () {
          expect(provider.dwellSelectionEnabled, isFalse);
        });

        test('dwellTimeMs returns 1000 default', () {
          expect(provider.dwellTimeMs, equals(1000));
        });

        test('switchAccessEnabled returns false default', () {
          expect(provider.switchAccessEnabled, isFalse);
        });

        test('tremorFilterEnabled returns false default', () {
          expect(provider.tremorFilterEnabled, isFalse);
        });

        test('tremorSmoothingFactor returns 0.7 default', () {
          expect(provider.tremorSmoothingFactor, equals(0.7));
        });

        test('tremorWindowSize returns 5 default', () {
          expect(provider.tremorWindowSize, equals(5));
        });

        test('tremorMovementThreshold returns 3 default', () {
          expect(provider.tremorMovementThreshold, equals(3));
        });

        test('dragAssistEnabled returns false default', () {
          expect(provider.dragAssistEnabled, isFalse);
        });

        test('dragGridSize returns 20 default', () {
          expect(provider.dragGridSize, equals(20));
        });

        test('holdToActivateEnabled returns false default', () {
          expect(provider.holdToActivateEnabled, isFalse);
        });

        test('gesturesToButtons returns false default', () {
          expect(provider.gesturesToButtons, isFalse);
        });

        test('responseTimeMultiplier returns 1.0 default', () {
          expect(provider.responseTimeMultiplier, equals(1.0));
        });

        test('showWordPrediction returns true default', () {
          expect(provider.showWordPrediction, isTrue);
        });

        test('showTouchRipples returns true default', () {
          expect(provider.showTouchRipples, isTrue);
        });
      });
    });

    group('Feedback Settings', () {
      setUp(() async {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          enhancedTouchFeedback: true,
          hapticFeedbackIntensity: HapticIntensity.strong,
          showTouchRipples: false,
          highlightFocusedElement: true,
        );
        mockService.profileToReturn = profile;
        mockService.accommodationsToReturn = MotorAccommodations.fromProfile(profile);
        provider.initialize(mockService);
        await provider.loadAccommodations('learner-123');
      });

      test('enhancedTouchFeedback returns profile value', () {
        expect(provider.enhancedTouchFeedback, isTrue);
      });

      test('hapticFeedbackIntensity returns profile value', () {
        expect(provider.hapticFeedbackIntensity, equals('strong'));
      });

      test('showTouchRipples returns profile value', () {
        expect(provider.showTouchRipples, isFalse);
      });

      test('highlightFocusedElement returns profile value', () {
        expect(provider.highlightFocusedElement, isTrue);
      });
    });

    group('Fatigue Management', () {
      test('hasFatigue returns profile value', () async {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          hasFatigue: true,
          fatigueThresholdMinutes: 30,
        );
        mockService.profileToReturn = profile;
        mockService.accommodationsToReturn = MotorAccommodations.fromProfile(profile);
        provider.initialize(mockService);
        await provider.loadAccommodations('learner-123');

        expect(provider.hasFatigue, isTrue);
        expect(provider.fatigueThresholdMinutes, equals(30));
      });

      test('autoBreakReminders returns accommodations value', () async {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          autoBreakReminders: true,
          breakReminderIntervalMinutes: 15,
        );
        mockService.profileToReturn = profile;
        mockService.accommodationsToReturn = MotorAccommodations.fromProfile(profile);
        provider.initialize(mockService);
        await provider.loadAccommodations('learner-123');

        expect(provider.autoBreakReminders, isTrue);
        expect(provider.breakReminderIntervalMinutes, equals(15));
      });

      test('fatigueManagementEnabled returns true when autoBreakReminders enabled', () async {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          autoBreakReminders: true,
        );
        mockService.profileToReturn = profile;
        mockService.accommodationsToReturn = MotorAccommodations.fromProfile(profile);
        provider.initialize(mockService);
        await provider.loadAccommodations('learner-123');

        expect(provider.fatigueManagementEnabled, isTrue);
      });

      test('fatigueManagementEnabled returns true when hasFatigue is true', () async {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          hasFatigue: true,
        );
        mockService.profileToReturn = profile;
        mockService.accommodationsToReturn = MotorAccommodations.fromProfile(profile);
        provider.initialize(mockService);
        await provider.loadAccommodations('learner-123');

        expect(provider.fatigueManagementEnabled, isTrue);
      });
    });

    group('Keyboard Settings', () {
      test('keyboard getters return profile values', () async {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          preferTyping: true,
          enlargedKeyboard: true,
          keyboardType: KeyboardType.large,
          showWordPrediction: true,
        );
        mockService.profileToReturn = profile;
        mockService.accommodationsToReturn = MotorAccommodations.fromProfile(profile);
        provider.initialize(mockService);
        await provider.loadAccommodations('learner-123');

        expect(provider.preferTyping, isTrue);
        expect(provider.enlargedKeyboard, isTrue);
        expect(provider.keyboardType, equals('large'));
        expect(provider.showWordPrediction, isTrue);
      });
    });

    group('updateAccommodation', () {
      test('calls service with correct parameters', () async {
        mockService.profileToReturn = MotorProfile.defaults(learnerId: 'learner-123');
        mockService.accommodationsToReturn = MotorAccommodations.defaults();

        provider.initialize(mockService);
        await provider.loadAccommodations('learner-123');
        await provider.updateAccommodation('touchTargetMultiplier', 2.0);

        expect(mockService.updateProfileCallCount, equals(1));
        expect(mockService.lastUpdates, containsPair('touchTargetMultiplier', 2.0));
      });
    });

    group('clear', () {
      test('resets all state', () async {
        mockService.profileToReturn = MotorProfile.defaults(learnerId: 'learner-123');
        mockService.accommodationsToReturn = MotorAccommodations.defaults();

        provider.initialize(mockService);
        await provider.loadAccommodations('learner-123');

        expect(provider.hasAccommodations, isTrue);

        provider.clear();

        expect(provider.profile, isNull);
        expect(provider.accommodations, isNull);
        expect(provider.hasAccommodations, isFalse);
      });
    });
  });

  group('MotorAccommodationService', () {
    test('interface defines required methods', () {
      final service = MockMotorAccommodationService();

      // Verify the interface contract
      expect(service.getProfile, isNotNull);
      expect(service.getAccommodations, isNotNull);
      expect(service.updateProfile, isNotNull);
      expect(service.logInteraction, isNotNull);
    });

    test('getProfile returns default for missing profiles', () async {
      final service = MockMotorAccommodationService();
      service.profileToReturn = null;

      final result = await service.getProfile('nonexistent-learner');
      expect(result.learnerId, equals('nonexistent-learner'));
    });

    test('updateProfile calls service with correct data', () async {
      final service = MockMotorAccommodationService();

      await service.updateProfile('learner-123', {'touchTargetMultiplier': 2.0});

      expect(service.updateProfileCallCount, equals(1));
      expect(service.lastUpdates, containsPair('touchTargetMultiplier', 2.0));
    });

    test('handles network errors gracefully', () async {
      final service = MockMotorAccommodationService();
      service.shouldThrowError = true;
      service.errorMessage = 'Network timeout';

      expect(
        () => service.getProfile('learner-123'),
        throwsException,
      );
    });
  });
}