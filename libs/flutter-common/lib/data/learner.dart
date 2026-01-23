/// Assessment types aligned with IDEA/Section 504
enum AssessmentType {
  standard('STANDARD', 'Standard Assessment'),
  standardWithAccommodations('STANDARD_WITH_ACCOMMODATIONS', 'Standard with Accommodations'),
  modified('MODIFIED', 'Modified Assessment'),
  alternate('ALTERNATE', 'Alternate Assessment');

  const AssessmentType(this.code, this.label);
  final String code;
  final String label;

  static AssessmentType fromCode(String? code) {
    if (code == null) return AssessmentType.standard;
    return AssessmentType.values.firstWhere(
      (t) => t.code == code,
      orElse: () => AssessmentType.standard,
    );
  }
}

/// Parent assessment data from IDEA/504-compliant assessment
class ParentAssessmentData {
  const ParentAssessmentData({
    this.assessmentType = AssessmentType.standard,
    this.hasIep = false,
    this.has504 = false,
    this.disabilityCategories = const [],
    this.areasOfConcern = const [],
    this.strengths = const [],
    this.accommodations = const [],
    this.currentServices = const [],
    this.assistiveTechnology = const [],
    this.supportLevel = 100,
    this.completedAt,
  });

  final AssessmentType assessmentType;
  final bool hasIep;
  final bool has504;
  final List<String> disabilityCategories;
  final List<String> areasOfConcern;
  final List<String> strengths;
  final List<String> accommodations;
  final List<String> currentServices;
  final List<String> assistiveTechnology;
  final int supportLevel;
  final DateTime? completedAt;

  factory ParentAssessmentData.fromJson(Map<String, dynamic> json) {
    return ParentAssessmentData(
      assessmentType: AssessmentType.fromCode(json['assessmentType'] as String?),
      hasIep: json['hasIep'] == true || json['hasExistingIep'] == true,
      has504: json['has504'] == true || json['hasExisting504'] == true,
      disabilityCategories: _parseStringList(json['disabilityCategories']),
      areasOfConcern: _parseStringList(json['areasOfConcern']),
      strengths: _parseStringList(json['strengths']),
      accommodations: _parseStringList(json['accommodations']),
      currentServices: _parseStringList(json['currentServices']),
      assistiveTechnology: _parseStringList(json['assistiveTechnology']),
      supportLevel: (json['supportLevel'] as num?)?.toInt() ?? 100,
      completedAt: json['completedAt'] != null 
          ? DateTime.tryParse(json['completedAt'] as String) 
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'assessmentType': assessmentType.code,
    'hasIep': hasIep,
    'has504': has504,
    'disabilityCategories': disabilityCategories,
    'areasOfConcern': areasOfConcern,
    'strengths': strengths,
    'accommodations': accommodations,
    'currentServices': currentServices,
    'assistiveTechnology': assistiveTechnology,
    'supportLevel': supportLevel,
    'completedAt': completedAt?.toIso8601String(),
  };

  /// Check if this learner has neurodiverse considerations
  bool get hasNeurodiverseProfile => 
      hasIep || has504 || disabilityCategories.isNotEmpty;

  /// Check if assessment has been completed
  bool get isCompleted => completedAt != null;

  static List<String> _parseStringList(dynamic value) {
    if (value == null) return [];
    if (value is List) {
      return value.whereType<String>().toList();
    }
    return [];
  }
}

class Learner {
  const Learner({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.grade,
    this.progress,
    this.parentAssessment,
  });

  final String id;
  final String tenantId;
  final String name;
  final int? grade;
  final double? progress;
  final ParentAssessmentData? parentAssessment;

  factory Learner.fromJson(Map<String, dynamic> json) {
    return Learner(
      id: json['id']?.toString() ?? '',
      tenantId: json['tenant_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown learner',
      grade: json['grade'] is num ? (json['grade'] as num).toInt() : null,
      progress: json['progress'] is num ? (json['progress'] as num).toDouble() : null,
      parentAssessment: json['parentAssessment'] != null
          ? ParentAssessmentData.fromJson(json['parentAssessment'] as Map<String, dynamic>)
          : null,
    );
  }

  /// Check if learner has completed parent assessment
  bool get hasParentAssessment => parentAssessment?.isCompleted == true;

  /// Get assessment type (defaults to STANDARD if no parent assessment)
  AssessmentType get assessmentType => 
      parentAssessment?.assessmentType ?? AssessmentType.standard;
}

const mockLearners = [
  Learner(id: 'learner-100', tenantId: 'tenant-1', name: 'Avery Stone', grade: 3, progress: 0.42),
  Learner(id: 'learner-200', tenantId: 'tenant-1', name: 'Jordan Lake', grade: 7, progress: 0.65),
  Learner(id: 'learner-300', tenantId: 'tenant-1', name: 'Sam Rivers', grade: 11, progress: 0.58),
];

Learner mockLearnerById(String id) {
  return mockLearners.firstWhere(
    (l) => l.id == id,
    orElse: () => const Learner(id: 'learner-fallback', tenantId: 'tenant-1', name: 'Fallback Learner', grade: 6),
  );
}
