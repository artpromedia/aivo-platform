/// Motor Accommodation Service - ND-3.3
///
/// Client service for motor profile management.
/// Communicates with personalization-svc backend.

import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'motor_models.dart';

/// Service for managing motor accommodations
class MotorAccommodationService {
  final String baseUrl;
  final String? authToken;
  final http.Client _client;

  String? _currentLearnerId;
  String? _tenantId;

  String? get currentLearnerId => _currentLearnerId;

  MotorAccommodationService({
    required this.baseUrl,
    this.authToken,
    http.Client? client,
  }) : _client = client ?? http.Client();

  /// Set the current learner context
  void setLearnerContext(String learnerId, String tenantId) {
    _currentLearnerId = learnerId;
    _tenantId = tenantId;
  }

  /// Get motor profile for a learner
  Future<MotorProfile> getProfile(String learnerId) async {
    try {
      final response = await _client.get(
        Uri.parse('$baseUrl/motor-profiles/$learnerId'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return MotorProfile.fromJson(json);
      } else if (response.statusCode == 404) {
        // Return default profile if none exists
        return MotorProfile.defaults(learnerId: learnerId);
      } else {
        throw MotorServiceException(
          'Failed to get motor profile',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is MotorServiceException) rethrow;
      debugPrint('Error getting motor profile: $e');
      // Return default profile on error for offline support
      return MotorProfile.defaults(learnerId: learnerId);
    }
  }

  /// Get active accommodations for a learner
  Future<MotorAccommodations> getAccommodations(String learnerId) async {
    try {
      final response = await _client.get(
        Uri.parse('$baseUrl/motor-profiles/$learnerId/accommodations'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return MotorAccommodations.fromJson(json);
      } else {
        // Return defaults
        return MotorAccommodations.defaults();
      }
    } catch (e) {
      debugPrint('Error getting accommodations: $e');
      return MotorAccommodations.defaults();
    }
  }

  /// Update motor profile
  Future<MotorProfile> updateProfile(
    String learnerId,
    Map<String, dynamic> updates,
  ) async {
    final response = await _client.patch(
      Uri.parse('$baseUrl/motor-profiles/$learnerId'),
      headers: _headers,
      body: jsonEncode(updates),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return MotorProfile.fromJson(json);
    } else {
      throw MotorServiceException(
        'Failed to update motor profile',
        statusCode: response.statusCode,
      );
    }
  }

  /// Auto-configure accommodations based on motor level
  Future<MotorProfile> autoConfigureFromLevel(
    String learnerId,
    MotorAbilityLevel fineMotorLevel,
    MotorAbilityLevel grossMotorLevel,
  ) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/motor-profiles/$learnerId/auto-configure'),
      headers: _headers,
      body: jsonEncode({
        'fineMotorLevel': fineMotorLevel.name,
        'grossMotorLevel': grossMotorLevel.name,
      }),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return MotorProfile.fromJson(json);
    } else {
      throw MotorServiceException(
        'Failed to auto-configure motor profile',
        statusCode: response.statusCode,
      );
    }
  }

  /// Log a motor interaction for analytics
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
    try {
      await _client.post(
        Uri.parse('$baseUrl/motor-profiles/$learnerId/interactions'),
        headers: _headers,
        body: jsonEncode({
          'interactionType': interactionType,
          'sessionId': sessionId,
          'targetElement': targetElement,
          'attemptCount': attemptCount,
          'successOnAttempt': successOnAttempt,
          'totalTimeMs': totalTimeMs,
          'targetHitAccuracy': targetHitAccuracy,
          'dragPathSmoothness': dragPathSmoothness,
          'successful': successful,
          'usedAlternative': usedAlternative,
          'alternativeMethod': alternativeMethod,
          'accommodationsActive': accommodationsActive,
        }),
      );
    } catch (e) {
      // Log locally if server unreachable
      debugPrint('Failed to log motor interaction: $e');
    }
  }

  /// Get content adaptations for the learner's motor profile
  Future<Map<String, dynamic>> getContentAdaptations(String learnerId) async {
    try {
      final response = await _client.get(
        Uri.parse('$baseUrl/motor-profiles/$learnerId/content-adaptations'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return {};
    } catch (e) {
      debugPrint('Error getting content adaptations: $e');
      return {};
    }
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (authToken != null) 'Authorization': 'Bearer $authToken',
        if (_tenantId != null) 'X-Tenant-ID': _tenantId!,
      };

  void dispose() {
    _client.close();
  }
}

/// Exception for motor service errors
class MotorServiceException implements Exception {
  final String message;
  final int? statusCode;

  MotorServiceException(this.message, {this.statusCode});

  @override
  String toString() => 'MotorServiceException: $message (status: $statusCode)';
}
