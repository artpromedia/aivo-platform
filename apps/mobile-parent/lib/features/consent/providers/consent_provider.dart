import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../core/api_client.dart';

part 'consent_provider.g.dart';

// Consent record model
class ConsentRecord {
  final String id;
  final String type;
  final String title;
  final String description;
  final bool granted;
  final bool required;
  final DateTime? grantedAt;
  final DateTime? revokedAt;

  ConsentRecord({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.granted,
    required this.required,
    this.grantedAt,
    this.revokedAt,
  });

  factory ConsentRecord.fromJson(Map<String, dynamic> json) {
    return ConsentRecord(
      id: json['id'] as String,
      type: json['type'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      granted: json['granted'] as bool,
      required: json['required'] as bool? ?? false,
      grantedAt: json['grantedAt'] != null
          ? DateTime.parse(json['grantedAt'] as String)
          : null,
      revokedAt: json['revokedAt'] != null
          ? DateTime.parse(json['revokedAt'] as String)
          : null,
    );
  }
}

// Provider for consent records
@riverpod
Future<List<ConsentRecord>> consentRecords(Ref ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/parent/consent');
  final data = response.data as List<dynamic>;
  return data.map((c) => ConsentRecord.fromJson(c as Map<String, dynamic>)).toList();
}

// Provider for updating consent
@riverpod
Future<void> updateConsent(
  Ref ref, {
  required String type,
  required bool granted,
}) async {
  final dio = ref.watch(dioProvider);
  await dio.put('/parent/consent/$type', data: {
    'granted': granted,
  });
}

// Provider for requesting data export
@riverpod
Future<void> requestDataExport(Ref ref) async {
  final dio = ref.watch(dioProvider);
  await dio.post('/parent/data/export');
}

// Provider for requesting data deletion
@riverpod
Future<void> requestDataDeletion(Ref ref) async {
  final dio = ref.watch(dioProvider);
  await dio.post('/parent/data/deletion');
}
