/// Caregiver API
///
/// API client for caregiver management endpoints in parent-svc.
library;

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/api_client.dart';
import '../models/caregiver_models.dart';

part 'caregiver_api.g.dart';

/// Provider for the caregiver API client.
@riverpod
CaregiverApi caregiverApi(Ref ref) {
  final dio = ref.watch(dioProvider);
  return CaregiverApi(dio);
}

/// API client for caregiver management.
class CaregiverApi {
  CaregiverApi(this._dio);

  final Dio _dio;

  // ============================================================
  // Read APIs
  // ============================================================

  /// Fetch all caregivers and pending invites for a student.
  Future<StudentCaregiverSummary> getCaregivers(String studentId) async {
    final response =
        await _dio.get('/api/v1/caregivers?studentId=$studentId');
    return StudentCaregiverSummary.fromJson(
        response.data as Map<String, dynamic>);
  }

  /// Fetch caregiver slot limit info for a student.
  Future<CaregiverLimitInfo> getLimit(String studentId) async {
    final response = await _dio.get('/api/v1/caregivers/limit/$studentId');
    return CaregiverLimitInfo.fromJson(
        response.data as Map<String, dynamic>);
  }

  // ============================================================
  // Invite APIs
  // ============================================================

  /// Create a new caregiver invitation.
  Future<CaregiverInviteResponse> createInvite(
      CreateCaregiverInviteRequest request) async {
    final response =
        await _dio.post('/api/v1/caregivers/invite', data: request.toJson());
    return CaregiverInviteResponse.fromJson(
        response.data as Map<String, dynamic>);
  }

  /// Resend an existing caregiver invitation.
  Future<void> resendInvite(String inviteId) async {
    await _dio.post('/api/v1/caregivers/invite/$inviteId');
  }

  /// Cancel a pending caregiver invitation.
  Future<void> cancelInvite(String inviteId) async {
    await _dio.delete('/api/v1/caregivers/invite/$inviteId');
  }

  // ============================================================
  // Permission & Access APIs
  // ============================================================

  /// Update a caregiver's permission set.
  Future<void> updatePermissions(
      UpdateCaregiverPermissionsRequest request) async {
    await _dio.put('/api/v1/caregivers/permissions', data: request.toJson());
  }

  /// Revoke a caregiver's access to a student's data.
  Future<void> revokeAccess(
    String caregiverId,
    String studentId, {
    String? reason,
  }) async {
    await _dio.delete('/api/v1/caregivers/access', data: {
      'caregiverId': caregiverId,
      'studentId': studentId,
      if (reason != null) 'reason': reason,
    });
  }
}
