class Learner {
  const Learner({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.grade,
    this.progress,
  });

  final String id;
  final String tenantId;
  final String name;
  final int? grade;
  final double? progress;

  factory Learner.fromJson(Map<String, dynamic> json) {
    return Learner(
      id: json['id']?.toString() ?? '',
      tenantId: json['tenant_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown learner',
      grade: json['grade'] is num ? (json['grade'] as num).toInt() : null,
      progress: json['progress'] is num ? (json['progress'] as num).toDouble() : null,
    );
  }
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
