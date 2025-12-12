/// Coverage Profile Models and Hooks for Parent App
///
/// These models and hooks enable the parent app to display
/// coverage information, showing which features are:
/// - "Provided by your school" (district coverage)
/// - "Your subscription" (parent coverage)
/// - Available for upgrade (upsell)
///
/// PRECEDENCE: District coverage always wins for overlapping features.
library;

import 'package:flutter/foundation.dart';

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

/// Who is paying for a feature.
enum FeaturePayer {
  /// Feature is covered by district contract
  district('DISTRICT'),

  /// Feature is covered by parent subscription
  parent('PARENT'),

  /// Feature is not covered - upsell opportunity
  none('NONE');

  const FeaturePayer(this.code);

  final String code;

  static FeaturePayer fromCode(String code) {
    return FeaturePayer.values.firstWhere(
      (p) => p.code == code,
      orElse: () => FeaturePayer.none,
    );
  }
}

/// Standard feature keys.
enum FeatureKey {
  moduleEla('MODULE_ELA', 'English Language Arts'),
  moduleMath('MODULE_MATH', 'Mathematics'),
  moduleScience('MODULE_SCIENCE', 'Science'),
  addonSel('ADDON_SEL', 'Social-Emotional Learning'),
  addonSpeech('ADDON_SPEECH', 'Speech & Language'),
  addonTutoring('ADDON_TUTORING', 'AI Tutoring'),
  featureHomeworkHelper('FEATURE_HOMEWORK_HELPER', 'Homework Helper'),
  featureProgressReports('FEATURE_PROGRESS_REPORTS', 'Progress Reports'),
  featureParentInsights('FEATURE_PARENT_INSIGHTS', 'Parent Insights');

  const FeatureKey(this.code, this.displayName);

  final String code;
  final String displayName;

  static FeatureKey? fromCode(String code) {
    return FeatureKey.values.where((f) => f.code == code).firstOrNull;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DATA CLASSES
// ══════════════════════════════════════════════════════════════════════════════

/// Coverage details for a single feature.
@immutable
class FeatureCoverageDetail {
  const FeatureCoverageDetail({
    required this.featureKey,
    required this.payer,
    this.sourceId,
    required this.displayLabel,
    this.expiresAt,
  });

  /// The feature/module key.
  final String featureKey;

  /// Who pays for this feature.
  final FeaturePayer payer;

  /// ID of the source (contract ID, subscription ID).
  final String? sourceId;

  /// Human-readable label for UI.
  final String displayLabel;

  /// When coverage expires.
  final DateTime? expiresAt;

  /// Create from JSON response.
  factory FeatureCoverageDetail.fromJson(Map<String, dynamic> json) {
    return FeatureCoverageDetail(
      featureKey: json['featureKey'] as String,
      payer: FeaturePayer.fromCode(json['payer'] as String),
      sourceId: json['sourceId'] as String?,
      displayLabel: json['displayLabel'] as String,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
    );
  }

  /// Whether this feature is covered (by either district or parent).
  bool get isCovered => payer != FeaturePayer.none;

  /// Whether this is provided by the school/district.
  bool get isProvidedBySchool => payer == FeaturePayer.district;

  /// Whether this is covered by parent subscription.
  bool get isParentSubscription => payer == FeaturePayer.parent;
}

/// District coverage information.
@immutable
class DistrictCoverage {
  const DistrictCoverage({
    required this.tenantId,
    required this.contractId,
    required this.contractNumber,
    this.schoolId,
    required this.coveredFeatures,
    required this.startDate,
    required this.endDate,
    required this.isActive,
  });

  final String tenantId;
  final String contractId;
  final String contractNumber;
  final String? schoolId;
  final Set<String> coveredFeatures;
  final DateTime startDate;
  final DateTime endDate;
  final bool isActive;

  factory DistrictCoverage.fromJson(Map<String, dynamic> json) {
    return DistrictCoverage(
      tenantId: json['tenantId'] as String,
      contractId: json['contractId'] as String,
      contractNumber: json['contractNumber'] as String,
      schoolId: json['schoolId'] as String?,
      coveredFeatures: Set<String>.from(json['coveredFeatures'] as List),
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      isActive: json['isActive'] as bool,
    );
  }
}

/// Parent subscription coverage information.
@immutable
class ParentCoverage {
  const ParentCoverage({
    required this.billingAccountId,
    required this.subscriptionId,
    required this.linkedLearnerId,
    required this.coveredFeatures,
    required this.overlappingFeatures,
    required this.periodStart,
    required this.periodEnd,
    required this.isActive,
    required this.status,
  });

  final String billingAccountId;
  final String subscriptionId;
  final String linkedLearnerId;
  final Set<String> coveredFeatures;
  final Set<String> overlappingFeatures;
  final DateTime periodStart;
  final DateTime periodEnd;
  final bool isActive;
  final String status;

  factory ParentCoverage.fromJson(Map<String, dynamic> json) {
    return ParentCoverage(
      billingAccountId: json['billingAccountId'] as String,
      subscriptionId: json['subscriptionId'] as String,
      linkedLearnerId: json['linkedLearnerId'] as String,
      coveredFeatures: Set<String>.from(json['coveredFeatures'] as List),
      overlappingFeatures: Set<String>.from(json['overlappingFeatures'] as List? ?? []),
      periodStart: DateTime.parse(json['periodStart'] as String),
      periodEnd: DateTime.parse(json['periodEnd'] as String),
      isActive: json['isActive'] as bool,
      status: json['status'] as String,
    );
  }

  /// Whether there are features that overlap with district.
  bool get hasOverlap => overlappingFeatures.isNotEmpty;
}

/// Complete coverage profile for a learner.
@immutable
class CoverageProfile {
  const CoverageProfile({
    required this.learnerId,
    required this.grade,
    required this.tenantId,
    this.schoolId,
    required this.hasDistrictCoverage,
    required this.hasParentCoverage,
    this.districtCoverage,
    this.parentCoverage,
    required this.districtModules,
    required this.parentModules,
    required this.effectiveModules,
    required this.payerForFeature,
    required this.coverageDetails,
    required this.upsellOpportunities,
    required this.computedAt,
    required this.expiresAt,
  });

  /// Learner ID this profile is for.
  final String learnerId;

  /// Learner's current grade.
  final int grade;

  /// Tenant (district) ID.
  final String tenantId;

  /// School ID.
  final String? schoolId;

  /// Whether learner has district coverage.
  final bool hasDistrictCoverage;

  /// Whether learner has parent coverage.
  final bool hasParentCoverage;

  /// District coverage details.
  final DistrictCoverage? districtCoverage;

  /// Parent coverage details.
  final ParentCoverage? parentCoverage;

  /// Features covered by district.
  final Set<String> districtModules;

  /// Features covered by parent.
  final Set<String> parentModules;

  /// All features learner has access to.
  final Set<String> effectiveModules;

  /// Map of feature to payer.
  final Map<String, FeaturePayer> payerForFeature;

  /// Detailed coverage info per feature.
  final List<FeatureCoverageDetail> coverageDetails;

  /// Features available for upsell.
  final List<String> upsellOpportunities;

  /// When this profile was computed.
  final DateTime computedAt;

  /// When this profile expires.
  final DateTime expiresAt;

  /// Create from JSON response.
  factory CoverageProfile.fromJson(Map<String, dynamic> json) {
    return CoverageProfile(
      learnerId: json['learnerId'] as String,
      grade: json['grade'] as int,
      tenantId: json['tenantId'] as String,
      schoolId: json['schoolId'] as String?,
      hasDistrictCoverage: json['hasDistrictCoverage'] as bool,
      hasParentCoverage: json['hasParentCoverage'] as bool,
      districtCoverage: json['districtCoverage'] != null
          ? DistrictCoverage.fromJson(json['districtCoverage'] as Map<String, dynamic>)
          : null,
      parentCoverage: json['parentCoverage'] != null
          ? ParentCoverage.fromJson(json['parentCoverage'] as Map<String, dynamic>)
          : null,
      districtModules: Set<String>.from(json['districtModules'] as List),
      parentModules: Set<String>.from(json['parentModules'] as List),
      effectiveModules: Set<String>.from(json['effectiveModules'] as List),
      payerForFeature: (json['payerForFeature'] as Map<String, dynamic>).map(
        (k, v) => MapEntry(k, FeaturePayer.fromCode(v as String)),
      ),
      coverageDetails: (json['coverageDetails'] as List)
          .map((d) => FeatureCoverageDetail.fromJson(d as Map<String, dynamic>))
          .toList(),
      upsellOpportunities: List<String>.from(json['upsellOpportunities'] as List),
      computedAt: DateTime.parse(json['computedAt'] as String),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
    );
  }

  /// Check if a feature is accessible.
  bool hasFeature(String featureKey) => effectiveModules.contains(featureKey);

  /// Check if a feature is provided by school.
  bool isProvidedBySchool(String featureKey) {
    return payerForFeature[featureKey] == FeaturePayer.district;
  }

  /// Check if a feature is a parent subscription feature.
  bool isParentSubscription(String featureKey) {
    return payerForFeature[featureKey] == FeaturePayer.parent;
  }

  /// Get display label for a feature.
  String getDisplayLabel(String featureKey) {
    final detail = coverageDetails.where((d) => d.featureKey == featureKey).firstOrNull;
    if (detail != null) return detail.displayLabel;
    
    if (isProvidedBySchool(featureKey)) return 'Provided by your school';
    if (isParentSubscription(featureKey)) return 'Your subscription';
    return 'Available for upgrade';
  }

  /// Get coverage detail for a feature.
  FeatureCoverageDetail? getCoverageDetail(String featureKey) {
    return coverageDetails.where((d) => d.featureKey == featureKey).firstOrNull;
  }

  /// Whether the profile has any overlap (parent paying for district-covered features).
  bool get hasOverlap => parentCoverage?.hasOverlap ?? false;
}

/// Summary of coverage for quick display.
@immutable
class CoverageProfileSummary {
  const CoverageProfileSummary({
    required this.learnerId,
    required this.hasDistrictBase,
    required this.hasParentSubscription,
    required this.districtFeatureCount,
    required this.parentFeatureCount,
    required this.totalEffectiveFeatures,
    required this.refundableOverlapCount,
  });

  final String learnerId;
  final bool hasDistrictBase;
  final bool hasParentSubscription;
  final int districtFeatureCount;
  final int parentFeatureCount;
  final int totalEffectiveFeatures;
  final int refundableOverlapCount;

  factory CoverageProfileSummary.fromJson(Map<String, dynamic> json) {
    return CoverageProfileSummary(
      learnerId: json['learnerId'] as String,
      hasDistrictBase: json['hasDistrictBase'] as bool,
      hasParentSubscription: json['hasParentSubscription'] as bool,
      districtFeatureCount: json['districtFeatureCount'] as int,
      parentFeatureCount: json['parentFeatureCount'] as int,
      totalEffectiveFeatures: json['totalEffectiveFeatures'] as int,
      refundableOverlapCount: json['refundableOverlapCount'] as int,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/// Get the display label based on who provides the feature.
String getCoverageLabel(FeaturePayer payer) {
  switch (payer) {
    case FeaturePayer.district:
      return 'Provided by your school';
    case FeaturePayer.parent:
      return 'Your subscription';
    case FeaturePayer.none:
      return 'Available for upgrade';
  }
}

/// Check if a feature should show as upgradeable.
bool isUpgradeAvailable(CoverageProfile profile, String featureKey) {
  // Don't show upgrade if already covered by either source
  if (profile.effectiveModules.contains(featureKey)) return false;
  // Don't show upgrade if district provides it (shouldn't happen but safety)
  if (profile.districtModules.contains(featureKey)) return false;
  return true;
}
