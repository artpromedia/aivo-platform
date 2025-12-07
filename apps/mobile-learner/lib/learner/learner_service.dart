import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

const _baseUrl = String.fromEnvironment('LEARNER_BASE_URL', defaultValue: 'http://localhost:4002');
const _useLearnerMock = bool.fromEnvironment('USE_LEARNER_MOCK', defaultValue: true);

class LearnerService {
  LearnerService() : _dio = Dio(BaseOptions(baseUrl: _baseUrl));

  final Dio _dio;

  Future<Learner> fetchLearner(String learnerId) async {
    if (_useLearnerMock) return mockLearnerById(learnerId);

    try {
      final response = await _dio.get<Map<String, dynamic>>('/learners/$learnerId');
      final data = response.data;
      if (data == null) throw const LearnerException('Missing learner payload');
      return Learner.fromJson(data);
    } on DioException catch (err) {
      final message = err.response?.data is Map && (err.response!.data as Map)['error'] != null
          ? (err.response!.data as Map)['error'].toString()
          : 'Unable to load learner';
      throw LearnerException(message);
    } catch (_) {
      throw const LearnerException('Unable to load learner');
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
