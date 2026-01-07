import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

const _baseUrl = String.fromEnvironment('LEARNER_BASE_URL', defaultValue: 'http://localhost:4002');
const _useLearnerMock = bool.fromEnvironment('USE_LEARNER_MOCK', defaultValue: false);

class LearnerService {
  LearnerService() : _dio = Dio(BaseOptions(baseUrl: _baseUrl));

  final Dio _dio;

  Future<List<Learner>> listChildren(String tenantId) async {
    if (_useLearnerMock) return mockLearners;

    try {
      final response = await _dio.get<List<dynamic>>('/learners', queryParameters: {'tenant_id': tenantId});
      final data = response.data ?? [];
      return data.whereType<Map<String, dynamic>>().map(Learner.fromJson).toList();
    } on DioException catch (err) {
      final message = err.response?.data is Map && (err.response!.data as Map)['error'] != null
          ? (err.response!.data as Map)['error'].toString()
          : 'Unable to load learners';
      throw LearnerException(message);
    } catch (e) {
      debugPrint('[LearnerService] Error loading learners: $e');
      throw const LearnerException('Unable to load learners');
    }
  }
}

class LearnerException implements Exception {
  const LearnerException(this.message);
  final String message;
  @override
  String toString() => message;
}

final learnerServiceProvider = Provider<LearnerService>((_) => LearnerService());

final childrenProvider = FutureProvider.family<List<Learner>, String>((ref, tenantId) async {
  final service = ref.read(learnerServiceProvider);
  return service.listChildren(tenantId);
});
