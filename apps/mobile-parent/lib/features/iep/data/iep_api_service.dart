/// IEP API Service
///
/// Communicates with iep-svc to fetch real IEP data, replacing mock data.
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../config/environment.dart';
import '../presentation/iep_upload_screen.dart';

class IepApiService {
  IepApiService({
    required this.authToken,
    http.Client? httpClient,
  }) : _client = httpClient ?? http.Client();

  final String authToken;
  final http.Client _client;

  String get _baseUrl => EnvironmentConfig.iepBaseUrl;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $authToken',
      };

  /// Fetch IEPs for a given student (child).
  Future<List<IEPDocument>> getIepsForStudent(String studentId) async {
    final uri = Uri.parse('$_baseUrl/ieps?studentId=$studentId');
    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw IepApiException(
        'Failed to fetch IEPs: ${response.statusCode}',
        statusCode: response.statusCode,
      );
    }

    final body = json.decode(response.body) as Map<String, dynamic>;
    final items = body['data'] as List<dynamic>? ?? [];

    return items.map((item) => _mapIepResponse(item as Map<String, dynamic>)).toList();
  }

  /// Fetch goals for a specific IEP.
  Future<List<IEPGoal>> getGoalsForIep(String iepId) async {
    final uri = Uri.parse('$_baseUrl/ieps/$iepId');
    final response = await _client.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw IepApiException(
        'Failed to fetch IEP details: ${response.statusCode}',
        statusCode: response.statusCode,
      );
    }

    final body = json.decode(response.body) as Map<String, dynamic>;
    final goals = body['goals'] as List<dynamic>? ?? [];

    return goals.map((g) => _mapGoalResponse(g as Map<String, dynamic>)).toList();
  }

  /// Map API IEP response to local IEPDocument model.
  IEPDocument _mapIepResponse(Map<String, dynamic> data) {
    final status = _mapStatus(data['status'] as String? ?? 'DRAFT');
    final goals = (data['goals'] as List<dynamic>?)
            ?.map((g) => _mapGoalResponse(g as Map<String, dynamic>))
            .toList() ??
        [];

    return IEPDocument(
      id: data['id'] as String? ?? '',
      fileName: 'IEP_${data['iepNumber'] ?? 'unknown'}.pdf',
      uploadedAt: DateTime.tryParse(data['createdAt'] as String? ?? '') ?? DateTime.now(),
      iepDate: DateTime.tryParse(data['effectiveDate'] as String? ?? '') ?? DateTime.now(),
      status: status,
      goals: goals,
      notes: data['parentConcerns'] as String?,
    );
  }

  /// Map API goal response to local IEPGoal model.
  IEPGoal _mapGoalResponse(Map<String, dynamic> data) {
    // Calculate progress from latest progressData if available
    final progressData = data['progressData'] as List<dynamic>? ?? [];
    int progressPercent = 0;
    if (progressData.isNotEmpty) {
      final latest = progressData.last as Map<String, dynamic>;
      progressPercent = _progressLevelToPercent(latest['progressLevel'] as String? ?? '');
    }

    return IEPGoal(
      id: data['id'] as String? ?? '',
      area: data['domain'] as String? ?? 'General',
      description: data['description'] as String? ?? '',
      objective: data['targetCriteria'] as String? ?? '',
      progressPercent: progressPercent,
      targetDate: DateTime.tryParse(data['targetDate'] as String? ?? ''),
    );
  }

  IEPStatus _mapStatus(String status) {
    switch (status) {
      case 'ACTIVE':
        return IEPStatus.active;
      case 'DRAFT':
      case 'PENDING_REVIEW':
      case 'PENDING_MEETING':
      case 'PENDING_CONSENT':
        return IEPStatus.draft;
      case 'EXPIRED':
      case 'ARCHIVED':
        return IEPStatus.expired;
      default:
        return IEPStatus.processing;
    }
  }

  int _progressLevelToPercent(String level) {
    switch (level) {
      case 'MASTERED':
        return 100;
      case 'SIGNIFICANT_PROGRESS':
        return 85;
      case 'ADEQUATE_PROGRESS':
        return 70;
      case 'SOME_PROGRESS':
        return 50;
      case 'MINIMAL_PROGRESS':
        return 25;
      case 'REGRESSION':
        return 10;
      case 'NO_PROGRESS':
      default:
        return 0;
    }
  }
}

class IepApiException implements Exception {
  const IepApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'IepApiException($statusCode): $message';
}
