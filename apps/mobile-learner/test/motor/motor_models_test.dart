import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_learner/motor/motor_models.dart';

void main() {
  group('MotorProfile', () {
    group('constructor', () {
      test('creates profile with required fields', () {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
        );

        expect(profile.learnerId, equals('learner-123'));
        expect(profile.tenantId, equals('tenant-456'));
        expect(profile.id, isNull);
      });

      test('uses default values for all optional fields', () {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
        );

        expect(profile.fineMotorLevel, equals(MotorAbilityLevel.ageAppropriate));
        expect(profile.grossMotorLevel, equals(MotorAbilityLevel.ageAppropriate));
        expect(profile.hasTremor, isFalse);
        expect(profile.touchTargetMultiplier, equals(1.0));
        expect(profile.touchHoldDuration, equals(0));
        expect(profile.voiceInputEnabled, isFalse);
        expect(profile.dwellSelectionEnabled, isFalse);
        expect(profile.dwellTimeMs, equals(1000));
        expect(profile.switchAccessEnabled, isFalse);
        expect(profile.tremorFilterEnabled, isFalse);
        expect(profile.tremorFilterStrength, equals(0.5));
        expect(profile.dragAssistEnabled, isFalse);
        expect(profile.dragSnapToGrid, isFalse);
        expect(profile.dragGridSize, equals(32));
      });
    });

    group('defaults factory', () {
      test('creates profile with learner ID', () {
        final profile = MotorProfile.defaults(learnerId: 'learner-123');

        expect(profile.learnerId, equals('learner-123'));
        expect(profile.tenantId, equals('default'));
      });

      test('accepts custom tenant ID', () {
        final profile = MotorProfile.defaults(
          learnerId: 'learner-123',
          tenantId: 'custom-tenant',
        );

        expect(profile.tenantId, equals('custom-tenant'));
      });
    });

    group('fromJson', () {
      test('parses all motor profile fields', () {
        final json = {
          'id': 'profile-id',
          'learnerId': 'learner-123',
          'tenantId': 'tenant-456',
          'fineMotorLevel': 'MODERATE_DIFFICULTY',
          'grossMotorLevel': 'MILD_DIFFICULTY',
          'hasTremor': true,
          'tremorSeverity': 3,
          'touchTargetMultiplier': 1.5,
          'touchHoldDuration': 500,
          'voiceInputEnabled': true,
          'dwellSelectionEnabled': true,
          'dwellTimeMs': 1200,
          'dwellIndicatorStyle': 'fill',
          'switchAccessEnabled': true,
          'switchAccessMode': 'manual',
          'tremorFilterEnabled': true,
          'tremorFilterStrength': 0.8,
          'tremorFilterAlgorithm': 'kalman',
          'dragAssistEnabled': true,
          'dragSnapToGrid': true,
          'dragGridSize': 24,
          'simplifiedGestures': true,
        };

        final profile = MotorProfile.fromJson(json);

        expect(profile.id, equals('profile-id'));
        expect(profile.learnerId, equals('learner-123'));
        expect(profile.tenantId, equals('tenant-456'));
        expect(profile.fineMotorLevel, equals(MotorAbilityLevel.moderateDifficulty));
        expect(profile.grossMotorLevel, equals(MotorAbilityLevel.mildDifficulty));
        expect(profile.hasTremor, isTrue);
        expect(profile.tremorSeverity, equals(3));
        expect(profile.touchTargetMultiplier, equals(1.5));
        expect(profile.touchHoldDuration, equals(500));
        expect(profile.voiceInputEnabled, isTrue);
        expect(profile.dwellSelectionEnabled, isTrue);
        expect(profile.dwellTimeMs, equals(1200));
        expect(profile.dwellIndicatorStyle, equals(DwellIndicatorStyle.fill));
        expect(profile.switchAccessEnabled, isTrue);
        expect(profile.switchAccessMode, equals(SwitchAccessMode.manual));
        expect(profile.tremorFilterEnabled, isTrue);
        expect(profile.tremorFilterStrength, equals(0.8));
        expect(profile.tremorFilterAlgorithm, equals(TremorFilterAlgorithm.kalman));
        expect(profile.dragAssistEnabled, isTrue);
        expect(profile.dragSnapToGrid, isTrue);
        expect(profile.dragGridSize, equals(24));
        expect(profile.simplifiedGestures, isTrue);
      });

      test('handles missing optional fields with defaults', () {
        final json = {
          'learnerId': 'learner-123',
          'tenantId': 'tenant-456',
        };

        final profile = MotorProfile.fromJson(json);

        expect(profile.fineMotorLevel, equals(MotorAbilityLevel.ageAppropriate));
        expect(profile.hasTremor, isFalse);
        expect(profile.touchTargetMultiplier, equals(1.0));
        expect(profile.voiceInputEnabled, isFalse);
      });

      test('parses timestamps correctly', () {
        final json = {
          'learnerId': 'learner-123',
          'tenantId': 'tenant-456',
          'createdAt': '2024-01-15T10:30:00Z',
          'updatedAt': '2024-01-20T14:45:00Z',
          'assessedAt': '2024-01-10T09:00:00Z',
        };

        final profile = MotorProfile.fromJson(json);

        expect(profile.createdAt, isNotNull);
        expect(profile.createdAt!.year, equals(2024));
        expect(profile.createdAt!.month, equals(1));
        expect(profile.createdAt!.day, equals(15));
        expect(profile.updatedAt, isNotNull);
        expect(profile.assessedAt, isNotNull);
      });
    });

    group('toJson', () {
      test('serializes all fields correctly', () {
        const profile = MotorProfile(
          id: 'profile-id',
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          fineMotorLevel: MotorAbilityLevel.moderateDifficulty,
          hasTremor: true,
          tremorSeverity: 4,
          touchTargetMultiplier: 1.75,
          voiceInputEnabled: true,
          dwellSelectionEnabled: true,
          dwellTimeMs: 1500,
          tremorFilterEnabled: true,
          tremorFilterStrength: 0.6,
        );

        final json = profile.toJson();

        expect(json['id'], equals('profile-id'));
        expect(json['learnerId'], equals('learner-123'));
        expect(json['tenantId'], equals('tenant-456'));
        expect(json['fineMotorLevel'], equals('MODERATE_DIFFICULTY'));
        expect(json['hasTremor'], isTrue);
        expect(json['tremorSeverity'], equals(4));
        expect(json['touchTargetMultiplier'], equals(1.75));
        expect(json['voiceInputEnabled'], isTrue);
        expect(json['dwellSelectionEnabled'], isTrue);
        expect(json['dwellTimeMs'], equals(1500));
        expect(json['tremorFilterEnabled'], isTrue);
        expect(json['tremorFilterStrength'], equals(0.6));
      });

      test('round-trip serialization preserves data', () {
        const original = MotorProfile(
          id: 'test-id',
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          fineMotorLevel: MotorAbilityLevel.significantDifficulty,
          hasTremor: true,
          touchTargetMultiplier: 2.0,
          dwellSelectionEnabled: true,
          dwellTimeMs: 800,
          dragAssistEnabled: true,
          dragSnapToGrid: true,
          dragGridSize: 16,
        );

        final json = original.toJson();
        final restored = MotorProfile.fromJson(json);

        expect(restored.id, equals(original.id));
        expect(restored.learnerId, equals(original.learnerId));
        expect(restored.fineMotorLevel, equals(original.fineMotorLevel));
        expect(restored.hasTremor, equals(original.hasTremor));
        expect(restored.touchTargetMultiplier, equals(original.touchTargetMultiplier));
        expect(restored.dwellSelectionEnabled, equals(original.dwellSelectionEnabled));
        expect(restored.dwellTimeMs, equals(original.dwellTimeMs));
        expect(restored.dragAssistEnabled, equals(original.dragAssistEnabled));
        expect(restored.dragSnapToGrid, equals(original.dragSnapToGrid));
        expect(restored.dragGridSize, equals(original.dragGridSize));
      });
    });

    group('copyWith', () {
      test('creates copy with modified fields', () {
        const original = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          touchTargetMultiplier: 1.0,
          voiceInputEnabled: false,
        );

        final modified = original.copyWith(
          touchTargetMultiplier: 2.0,
          voiceInputEnabled: true,
        );

        expect(modified.touchTargetMultiplier, equals(2.0));
        expect(modified.voiceInputEnabled, isTrue);
        // Preserved fields
        expect(modified.learnerId, equals('learner-123'));
        expect(modified.tenantId, equals('tenant-456'));
      });

      test('preserves all unchanged fields', () {
        const original = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          fineMotorLevel: MotorAbilityLevel.mildDifficulty,
          hasTremor: true,
          tremorSeverity: 2,
          dwellTimeMs: 1200,
        );

        final modified = original.copyWith(dwellTimeMs: 1500);

        expect(modified.fineMotorLevel, equals(MotorAbilityLevel.mildDifficulty));
        expect(modified.hasTremor, isTrue);
        expect(modified.tremorSeverity, equals(2));
        expect(modified.dwellTimeMs, equals(1500));
      });
    });

    group('computed properties', () {
      test('needsAccommodations returns true when motor level is not age appropriate', () {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          fineMotorLevel: MotorAbilityLevel.moderateDifficulty,
        );

        expect(profile.needsAccommodations, isTrue);
      });

      test('needsAccommodations returns true when has tremor', () {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          hasTremor: true,
        );

        expect(profile.needsAccommodations, isTrue);
      });

      test('needsAccommodations returns false for typical learner', () {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
        );

        expect(profile.needsAccommodations, isFalse);
      });

      test('hasAlternativeInput returns true when voice input enabled', () {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          voiceInputEnabled: true,
        );

        expect(profile.hasAlternativeInput, isTrue);
      });

      test('hasAlternativeInput returns true when dwell selection enabled', () {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          dwellSelectionEnabled: true,
        );

        expect(profile.hasAlternativeInput, isTrue);
      });

      test('recommendedTouchTargetSize calculates correctly', () {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          touchTargetMultiplier: 1.5,
        );

        // Base size is 44.0 pixels
        expect(profile.recommendedTouchTargetSize, equals(66.0));
      });
    });
  });

  group('MotorAccommodations', () {
    group('constructor', () {
      test('creates with default values', () {
        const accommodations = MotorAccommodations();

        expect(accommodations.touchTargetMultiplier, equals(1.0));
        expect(accommodations.touchHoldDuration, equals(0));
        expect(accommodations.voiceInputEnabled, isFalse);
        expect(accommodations.dwellSelectionEnabled, isFalse);
        expect(accommodations.dwellTimeMs, equals(1000));
        expect(accommodations.tremorFilterEnabled, isFalse);
        expect(accommodations.tremorSmoothingFactor, equals(0.7));
        expect(accommodations.dragAssistEnabled, isFalse);
      });

      test('creates with custom values', () {
        const accommodations = MotorAccommodations(
          touchTargetMultiplier: 2.0,
          voiceInputEnabled: true,
          dwellSelectionEnabled: true,
          dwellTimeMs: 800,
          tremorFilterEnabled: true,
          tremorSmoothingFactor: 0.9,
        );

        expect(accommodations.touchTargetMultiplier, equals(2.0));
        expect(accommodations.voiceInputEnabled, isTrue);
        expect(accommodations.dwellSelectionEnabled, isTrue);
        expect(accommodations.dwellTimeMs, equals(800));
        expect(accommodations.tremorFilterEnabled, isTrue);
        expect(accommodations.tremorSmoothingFactor, equals(0.9));
      });
    });

    group('defaults factory', () {
      test('creates accommodations with all defaults', () {
        final accommodations = MotorAccommodations.defaults();

        expect(accommodations.touchTargetMultiplier, equals(1.0));
        expect(accommodations.voiceInputEnabled, isFalse);
        expect(accommodations.holdToActivateEnabled, isFalse);
      });
    });

    group('fromJson', () {
      test('parses all accommodation fields', () {
        final json = {
          'touchTargetMultiplier': 1.75,
          'touchHoldDuration': 400,
          'voiceInputEnabled': true,
          'dwellSelectionEnabled': true,
          'dwellTimeMs': 1200,
          'dwellIndicatorStyle': 'shrink',
          'tremorFilterEnabled': true,
          'tremorFilterStrength': 75,
          'tremorSmoothingFactor': 0.85,
          'tremorWindowSize': 7,
          'tremorMovementThreshold': 5,
          'dragAssistEnabled': true,
          'dragSnapToGrid': true,
          'dragGridSize': 24,
          'switchAccessEnabled': true,
          'switchScanSpeed': 1500,
          'simplifiedGestures': true,
        };

        final accommodations = MotorAccommodations.fromJson(json);

        expect(accommodations.touchTargetMultiplier, equals(1.75));
        expect(accommodations.touchHoldDuration, equals(400));
        expect(accommodations.voiceInputEnabled, isTrue);
        expect(accommodations.dwellSelectionEnabled, isTrue);
        expect(accommodations.dwellTimeMs, equals(1200));
        expect(accommodations.dwellIndicatorStyle, equals('shrink'));
        expect(accommodations.tremorFilterEnabled, isTrue);
        expect(accommodations.tremorFilterStrength, equals(75));
        expect(accommodations.tremorSmoothingFactor, equals(0.85));
        expect(accommodations.tremorWindowSize, equals(7));
        expect(accommodations.tremorMovementThreshold, equals(5));
        expect(accommodations.dragAssistEnabled, isTrue);
        expect(accommodations.dragSnapToGrid, isTrue);
        expect(accommodations.dragGridSize, equals(24));
        expect(accommodations.switchAccessEnabled, isTrue);
        expect(accommodations.switchScanSpeed, equals(1500));
        expect(accommodations.simplifiedGestures, isTrue);
      });

      test('handles missing fields with defaults', () {
        final json = <String, dynamic>{};
        final accommodations = MotorAccommodations.fromJson(json);

        expect(accommodations.touchTargetMultiplier, equals(1.0));
        expect(accommodations.dwellTimeMs, equals(1000));
        expect(accommodations.tremorSmoothingFactor, equals(0.7));
      });
    });

    group('fromProfile', () {
      test('extracts runtime accommodations from full profile', () {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          touchTargetMultiplier: 1.5,
          touchHoldDuration: 300,
          voiceInputEnabled: true,
          dwellSelectionEnabled: true,
          dwellTimeMs: 900,
          tremorFilterEnabled: true,
          tremorFilterStrength: 0.7,
          dragAssistEnabled: true,
          dragSnapToGrid: true,
          dragGridSize: 20,
        );

        final accommodations = MotorAccommodations.fromProfile(profile);

        expect(accommodations.touchTargetMultiplier, equals(1.5));
        expect(accommodations.touchHoldDuration, equals(300));
        expect(accommodations.voiceInputEnabled, isTrue);
        expect(accommodations.dwellSelectionEnabled, isTrue);
        expect(accommodations.dwellTimeMs, equals(900));
        expect(accommodations.tremorFilterEnabled, isTrue);
        expect(accommodations.dragAssistEnabled, isTrue);
        expect(accommodations.dragSnapToGrid, isTrue);
        expect(accommodations.dragGridSize, equals(20));
      });

      test('calculates tremor smoothing factor from filter strength', () {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          tremorFilterStrength: 0.5, // Mid-range
        );

        final accommodations = MotorAccommodations.fromProfile(profile);

        // Formula: 0.5 + (0.5 * 0.4) = 0.7
        expect(accommodations.tremorSmoothingFactor, equals(0.7));
      });

      test('converts filter strength to percentage scale', () {
        const profile = MotorProfile(
          learnerId: 'learner-123',
          tenantId: 'tenant-456',
          tremorFilterStrength: 0.8,
        );

        final accommodations = MotorAccommodations.fromProfile(profile);

        // 0.8 * 100 = 80
        expect(accommodations.tremorFilterStrength, equals(80));
      });
    });

    group('computed properties', () {
      test('holdToActivateEnabled returns true when duration > 0', () {
        const accommodations = MotorAccommodations(touchHoldDuration: 500);
        expect(accommodations.holdToActivateEnabled, isTrue);
      });

      test('holdToActivateEnabled returns false when duration is 0', () {
        const accommodations = MotorAccommodations(touchHoldDuration: 0);
        expect(accommodations.holdToActivateEnabled, isFalse);
      });

      test('gesturesToButtons returns simplifiedGestures value', () {
        const accommodations = MotorAccommodations(simplifiedGestures: true);
        expect(accommodations.gesturesToButtons, isTrue);
      });
    });

    group('toJson', () {
      test('serializes all fields', () {
        const accommodations = MotorAccommodations(
          touchTargetMultiplier: 1.5,
          voiceInputEnabled: true,
          dwellSelectionEnabled: true,
          dwellTimeMs: 1100,
          tremorFilterEnabled: true,
          tremorFilterStrength: 60,
          tremorSmoothingFactor: 0.8,
        );

        final json = accommodations.toJson();

        expect(json['touchTargetMultiplier'], equals(1.5));
        expect(json['voiceInputEnabled'], isTrue);
        expect(json['dwellSelectionEnabled'], isTrue);
        expect(json['dwellTimeMs'], equals(1100));
        expect(json['tremorFilterEnabled'], isTrue);
        expect(json['tremorFilterStrength'], equals(60));
        expect(json['tremorSmoothingFactor'], equals(0.8));
      });

      test('round-trip serialization works', () {
        const original = MotorAccommodations(
          touchTargetMultiplier: 2.0,
          voiceInputEnabled: true,
          dragAssistEnabled: true,
          dragGridSize: 16,
        );

        final json = original.toJson();
        final restored = MotorAccommodations.fromJson(json);

        expect(restored.touchTargetMultiplier, equals(original.touchTargetMultiplier));
        expect(restored.voiceInputEnabled, equals(original.voiceInputEnabled));
        expect(restored.dragAssistEnabled, equals(original.dragAssistEnabled));
        expect(restored.dragGridSize, equals(original.dragGridSize));
      });
    });
  });

  group('Enums', () {
    group('MotorAbilityLevel', () {
      test('fromString parses all valid values', () {
        expect(MotorAbilityLevel.fromString('AGE_APPROPRIATE'),
            equals(MotorAbilityLevel.ageAppropriate));
        expect(MotorAbilityLevel.fromString('MILD_DIFFICULTY'),
            equals(MotorAbilityLevel.mildDifficulty));
        expect(MotorAbilityLevel.fromString('MODERATE_DIFFICULTY'),
            equals(MotorAbilityLevel.moderateDifficulty));
        expect(MotorAbilityLevel.fromString('SIGNIFICANT_DIFFICULTY'),
            equals(MotorAbilityLevel.significantDifficulty));
        expect(MotorAbilityLevel.fromString('REQUIRES_FULL_SUPPORT'),
            equals(MotorAbilityLevel.requiresFullSupport));
      });

      test('fromString defaults to ageAppropriate for unknown values', () {
        expect(MotorAbilityLevel.fromString('UNKNOWN'),
            equals(MotorAbilityLevel.ageAppropriate));
      });

      test('toApiString returns correct values', () {
        expect(MotorAbilityLevel.ageAppropriate.toApiString(),
            equals('AGE_APPROPRIATE'));
        expect(MotorAbilityLevel.moderateDifficulty.toApiString(),
            equals('MODERATE_DIFFICULTY'));
      });
    });

    group('DwellIndicatorStyle', () {
      test('fromString parses all valid values', () {
        expect(DwellIndicatorStyle.fromString('circle'),
            equals(DwellIndicatorStyle.circle));
        expect(DwellIndicatorStyle.fromString('shrink'),
            equals(DwellIndicatorStyle.shrink));
        expect(DwellIndicatorStyle.fromString('fill'),
            equals(DwellIndicatorStyle.fill));
      });

      test('fromString defaults to circle for unknown values', () {
        expect(DwellIndicatorStyle.fromString('unknown'),
            equals(DwellIndicatorStyle.circle));
      });
    });

    group('SwitchAccessMode', () {
      test('fromString parses all valid values', () {
        expect(SwitchAccessMode.fromString('auto_scan'),
            equals(SwitchAccessMode.autoScan));
        expect(SwitchAccessMode.fromString('manual'),
            equals(SwitchAccessMode.manual));
        expect(SwitchAccessMode.fromString('step_scan'),
            equals(SwitchAccessMode.stepScan));
      });

      test('toApiString returns correct values', () {
        expect(SwitchAccessMode.autoScan.toApiString(), equals('auto_scan'));
        expect(SwitchAccessMode.manual.toApiString(), equals('manual'));
      });
    });

    group('HapticIntensity', () {
      test('fromString parses all valid values', () {
        expect(HapticIntensity.fromString('none'),
            equals(HapticIntensity.none));
        expect(HapticIntensity.fromString('light'),
            equals(HapticIntensity.light));
        expect(HapticIntensity.fromString('normal'),
            equals(HapticIntensity.normal));
        expect(HapticIntensity.fromString('strong'),
            equals(HapticIntensity.strong));
      });
    });

    group('KeyboardType', () {
      test('fromString parses all valid values', () {
        expect(KeyboardType.fromString('standard'),
            equals(KeyboardType.standard));
        expect(KeyboardType.fromString('large'),
            equals(KeyboardType.large));
        expect(KeyboardType.fromString('split'),
            equals(KeyboardType.split));
        expect(KeyboardType.fromString('one_handed'),
            equals(KeyboardType.oneHanded));
      });

      test('toApiString returns correct values', () {
        expect(KeyboardType.standard.toApiString(), equals('standard'));
        expect(KeyboardType.oneHanded.toApiString(), equals('one_handed'));
      });
    });
  });
}
