import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import '../config/environment.dart';

class LearnerService {
  LearnerService() : _dio = Dio(BaseOptions(baseUrl: EnvironmentConfig.learnerBaseUrl));

  final Dio _dio;

  Future<Learner> fetchLearner(String learnerId) async {
    if (EnvironmentConfig.useLearnerMock) {
      debugPrint('⚠️ [LearnerService] Using mock data - development only');
      return mockLearnerById(learnerId);
    }

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
    } catch (e) {
      debugPrint('[LearnerService] Unexpected error fetching learner $learnerId: $e');
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
