/// Coverage Profile Service for Parent App
///
/// Fetches and caches coverage profiles from the billing service.
/// Provides methods to check feature access and display coverage info.
library;

import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'coverage_profile_models.dart';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const _billingBaseUrl = String.fromEnvironment(
  'BILLING_BASE_URL',
  defaultValue: 'http://localhost:4060',
);

const _useMock = bool.fromEnvironment('USE_COVERAGE_MOCK', defaultValue: true);

// Cache duration
const _cacheDuration = Duration(minutes: 5);

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/// Service for fetching and managing coverage profiles.
class CoverageProfileService {
  CoverageProfileService({String? accessToken}) {
    final headers = accessToken != null 
        ? {'Authorization': 'Bearer $accessToken'} 
        : <String, dynamic>{};
    
    _dio = Dio(BaseOptions(baseUrl: _billingBaseUrl, headers: headers));
  }

  late final Dio _dio;

  // Cache
  final Map<String, _CachedProfile> _cache = {};

  // ──────────────────────────────────────────────────────────────────────────
  // COVERAGE PROFILE OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────

  /// Get coverage profile for a learner.
  Future<CoverageProfile> getCoverageProfile({
    required String learnerId,
    required String tenantId,
    required int grade,
    String? schoolId,
    bool forceRefresh = false,
  }) async {
    final cacheKey = 'profile:$learnerId';
    
    // Check cache
    if (!forceRefresh) {
      final cached = _cache[cacheKey];
      if (cached != null && cached.isValid) {
        return cached.profile;
      }
    }

    // Fetch from service
    CoverageProfile profile;
    if (_useMock) {
      profile = _mockCoverageProfile(learnerId, tenantId, grade, schoolId);
    } else {
      final response = await _dio.get(
        '/api/v1/coverage/$learnerId',
        queryParameters: {
          'tenantId': tenantId,
          'grade': grade,
          if (schoolId != null) 'schoolId': schoolId,
          'includeDetails': true,
          'forceRefresh': forceRefresh,
        },
      );
      
      final data = response.data as Map<String, dynamic>;
      profile = CoverageProfile.fromJson(data['profile'] as Map<String, dynamic>);
    }

    // Update cache
    _cache[cacheKey] = _CachedProfile(
      profile: profile,
      expiresAt: DateTime.now().add(_cacheDuration),
    );

    return profile;
  }

  /// Get coverage profile summary (lightweight).
  Future<CoverageProfileSummary> getCoverageProfileSummary({
    required String learnerId,
    required String tenantId,
    required int grade,
    String? schoolId,
  }) async {
    // Get full profile (from cache if available)
    final profile = await getCoverageProfile(
      learnerId: learnerId,
      tenantId: tenantId,
      grade: grade,
      schoolId: schoolId,
    );

    return CoverageProfileSummary(
      learnerId: profile.learnerId,
      hasDistrictBase: profile.hasDistrictCoverage,
      hasParentSubscription: profile.hasParentCoverage,
      districtFeatureCount: profile.districtModules.length,
      parentFeatureCount: profile.parentModules.length,
      totalEffectiveFeatures: profile.effectiveModules.length,
      refundableOverlapCount: profile.parentCoverage?.overlappingFeatures.length ?? 0,
    );
  }

  /// Check if a learner has access to a specific feature.
  Future<FeatureAccessResult> checkFeatureAccess({
    required String learnerId,
    required String featureKey,
    required String tenantId,
    required int grade,
    String? schoolId,
  }) async {
    if (_useMock) {
      return _mockFeatureAccess(featureKey);
    }

    final response = await _dio.get(
      '/api/v1/coverage/$learnerId/feature/$featureKey',
      queryParameters: {
        'tenantId': tenantId,
        'grade': grade,
        if (schoolId != null) 'schoolId': schoolId,
      },
    );

    final data = response.data as Map<String, dynamic>;
    return FeatureAccessResult(
      hasAccess: data['hasAccess'] as bool,
      providedBy: FeaturePayer.fromCode(data['providedBy'] as String),
      displayLabel: data['displayLabel'] as String,
    );
  }

  /// Get batch coverage profiles for multiple learners.
  Future<Map<String, CoverageProfile>> getBatchCoverageProfiles({
    required List<LearnerInfo> learners,
    bool includeDetails = false,
  }) async {
    if (_useMock) {
      return {
        for (final l in learners)
          l.learnerId: _mockCoverageProfile(l.learnerId, l.tenantId, l.grade, l.schoolId),
      };
    }

    final response = await _dio.post(
      '/api/v1/coverage/batch',
      data: {
        'learners': learners.map((l) => <String, dynamic>{
            'learnerId': l.learnerId,
            'tenantId': l.tenantId,
            'schoolId': l.schoolId,
            'grade': l.grade,
          }).toList(),
        'includeDetails': includeDetails,
      },
    );

    final data = response.data as Map<String, dynamic>;
    final profiles = data['profiles'] as Map<String, dynamic>;
    
    return profiles.map(
      (k, v) => MapEntry(k, CoverageProfile.fromJson(v as Map<String, dynamic>)),
    );
  }

  /// Invalidate cached profile for a learner.
  void invalidateProfile(String learnerId) {
    _cache.remove('profile:$learnerId');
  }

  /// Clear all cached profiles.
  void clearCache() {
    _cache.clear();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MOCK DATA
  // ──────────────────────────────────────────────────────────────────────────

  CoverageProfile _mockCoverageProfile(
    String learnerId,
    String tenantId,
    int grade,
    String? schoolId,
  ) {
    // Simulate a learner with both district and parent coverage
    final districtModules = <String>{'MODULE_ELA', 'MODULE_MATH'};
    final parentModules = <String>{'ADDON_SEL', 'FEATURE_HOMEWORK_HELPER'};
    final overlapping = <String>{}; // No overlap in mock
    
    final allModules = {...districtModules, ...parentModules};
    
    return CoverageProfile(
      learnerId: learnerId,
      grade: grade,
      tenantId: tenantId,
      schoolId: schoolId,
      hasDistrictCoverage: true,
      hasParentCoverage: true,
      districtCoverage: DistrictCoverage(
        tenantId: tenantId,
        contractId: 'mock-contract-id',
        contractNumber: 'DST-2025-001',
        schoolId: schoolId,
        coveredFeatures: districtModules,
        startDate: DateTime(2025, 1, 1),
        endDate: DateTime(2026, 6, 30),
        isActive: true,
      ),
      parentCoverage: ParentCoverage(
        billingAccountId: 'mock-billing-account',
        subscriptionId: 'mock-subscription-id',
        linkedLearnerId: learnerId,
        coveredFeatures: parentModules,
        overlappingFeatures: overlapping,
        periodStart: DateTime.now().subtract(const Duration(days: 15)),
        periodEnd: DateTime.now().add(const Duration(days: 15)),
        isActive: true,
        status: 'ACTIVE',
      ),
      districtModules: districtModules,
      parentModules: parentModules,
      effectiveModules: allModules,
      payerForFeature: {
        'MODULE_ELA': FeaturePayer.district,
        'MODULE_MATH': FeaturePayer.district,
        'ADDON_SEL': FeaturePayer.parent,
        'FEATURE_HOMEWORK_HELPER': FeaturePayer.parent,
      },
      coverageDetails: [
        const FeatureCoverageDetail(
          featureKey: 'MODULE_ELA',
          payer: FeaturePayer.district,
          sourceId: 'mock-contract-id',
          displayLabel: 'Provided by your school',
          expiresAt: null,
        ),
        const FeatureCoverageDetail(
          featureKey: 'MODULE_MATH',
          payer: FeaturePayer.district,
          sourceId: 'mock-contract-id',
          displayLabel: 'Provided by your school',
          expiresAt: null,
        ),
        FeatureCoverageDetail(
          featureKey: 'ADDON_SEL',
          payer: FeaturePayer.parent,
          sourceId: 'mock-subscription-id',
          displayLabel: 'Your subscription',
          expiresAt: DateTime.now().add(const Duration(days: 15)),
        ),
        FeatureCoverageDetail(
          featureKey: 'FEATURE_HOMEWORK_HELPER',
          payer: FeaturePayer.parent,
          sourceId: 'mock-subscription-id',
          displayLabel: 'Your subscription',
          expiresAt: DateTime.now().add(const Duration(days: 15)),
        ),
      ],
      upsellOpportunities: [
        'MODULE_SCIENCE',
        'ADDON_SPEECH',
        'ADDON_TUTORING',
      ],
      computedAt: DateTime.now(),
      expiresAt: DateTime.now().add(const Duration(minutes: 5)),
    );
  }

  FeatureAccessResult _mockFeatureAccess(String featureKey) {
    // Mock: district provides ELA/MATH, parent provides SEL
    const districtFeatures = {'MODULE_ELA', 'MODULE_MATH'};
    const parentFeatures = {'ADDON_SEL', 'FEATURE_HOMEWORK_HELPER'};

    if (districtFeatures.contains(featureKey)) {
      return const FeatureAccessResult(
        hasAccess: true,
        providedBy: FeaturePayer.district,
        displayLabel: 'Provided by your school',
      );
    }
    if (parentFeatures.contains(featureKey)) {
      return const FeatureAccessResult(
        hasAccess: true,
        providedBy: FeaturePayer.parent,
        displayLabel: 'Your subscription',
      );
    }
    return const FeatureAccessResult(
      hasAccess: false,
      providedBy: FeaturePayer.none,
      displayLabel: 'Available for upgrade',
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER CLASSES
// ══════════════════════════════════════════════════════════════════════════════

/// Cached profile with expiration.
class _CachedProfile {
  _CachedProfile({required this.profile, required this.expiresAt});

  final CoverageProfile profile;
  final DateTime expiresAt;

  bool get isValid => DateTime.now().isBefore(expiresAt);
}

/// Result of feature access check.
class FeatureAccessResult {
  const FeatureAccessResult({
    required this.hasAccess,
    required this.providedBy,
    required this.displayLabel,
  });

  final bool hasAccess;
  final FeaturePayer providedBy;
  final String displayLabel;
}

/// Learner info for batch requests.
class LearnerInfo {
  const LearnerInfo({
    required this.learnerId,
    required this.tenantId,
    this.schoolId,
    required this.grade,
  });

  final String learnerId;
  final String tenantId;
  final String? schoolId;
  final int grade;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

/// Provider for coverage profile service.
final coverageProfileServiceProvider = Provider<CoverageProfileService>((ref) {
  // In real app, get access token from auth state
  // final accessToken = ref.watch(authStateProvider).accessToken;
  return CoverageProfileService();
});

/// Provider for a specific learner's coverage profile.
final coverageProfileProvider = FutureProvider.family<CoverageProfile, LearnerInfo>(
  (ref, learnerInfo) async {
    final service = ref.watch(coverageProfileServiceProvider);
    return service.getCoverageProfile(
      learnerId: learnerInfo.learnerId,
      tenantId: learnerInfo.tenantId,
      grade: learnerInfo.grade,
      schoolId: learnerInfo.schoolId,
    );
  },
);

/// Provider for checking feature access.
final featureAccessProvider = FutureProvider.family<FeatureAccessResult, FeatureAccessParams>(
  (ref, params) async {
    final service = ref.watch(coverageProfileServiceProvider);
    return service.checkFeatureAccess(
      learnerId: params.learnerId,
      featureKey: params.featureKey,
      tenantId: params.tenantId,
      grade: params.grade,
      schoolId: params.schoolId,
    );
  },
);

/// Parameters for feature access check.
class FeatureAccessParams {
  const FeatureAccessParams({
    required this.learnerId,
    required this.featureKey,
    required this.tenantId,
    required this.grade,
    this.schoolId,
  });

  final String learnerId;
  final String featureKey;
  final String tenantId;
  final int grade;
  final String? schoolId;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is FeatureAccessParams &&
        other.learnerId == learnerId &&
        other.featureKey == featureKey &&
        other.tenantId == tenantId &&
        other.grade == grade &&
        other.schoolId == schoolId;
  }

  @override
  int get hashCode {
    return Object.hash(learnerId, featureKey, tenantId, grade, schoolId);
  }
}
