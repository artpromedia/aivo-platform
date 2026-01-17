/// Behavior Tracking API Client
///
/// Provides API methods for behavior incident logging, pattern analysis,
/// interventions, and reporting.
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';

import 'models.dart';

/// Base URL for the behavior tracking service.
const _baseUrl = 'http://localhost:8093';

/// API client for behavior tracking operations.
class BehaviorTrackingApi {
  BehaviorTrackingApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  // ============================================================================
  // Behavior Incidents
  // ============================================================================

  /// Get all behavior incidents for a student.
  Future<List<BehaviorIncident>> getIncidents({
    required String studentId,
    String? startDate,
    String? endDate,
    BehaviorType? type,
    BehaviorSeverity? severity,
  }) async {
    final queryParams = <String, String>{
      'studentId': studentId,
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
      if (type != null) 'type': type.name,
      if (severity != null) 'severity': severity.name,
    };

    final uri = Uri.parse('$_baseUrl/api/behavior/incidents')
        .replace(queryParameters: queryParams);
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => BehaviorIncident.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load incidents: ${response.statusCode}');
    }
  }

  /// Create a new behavior incident.
  Future<BehaviorIncident> createIncident(BehaviorIncident incident) async {
    final response = await _client.post(
      Uri.parse('$_baseUrl/api/behavior/incidents'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(incident.toJson()),
    );

    if (response.statusCode == 201) {
      return BehaviorIncident.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to create incident: ${response.statusCode}');
    }
  }

  /// Update an existing behavior incident.
  Future<BehaviorIncident> updateIncident(BehaviorIncident incident) async {
    final response = await _client.put(
      Uri.parse('$_baseUrl/api/behavior/incidents/${incident.id}'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(incident.toJson()),
    );

    if (response.statusCode == 200) {
      return BehaviorIncident.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to update incident: ${response.statusCode}');
    }
  }

  /// Delete a behavior incident.
  Future<void> deleteIncident(String incidentId) async {
    final response = await _client.delete(
      Uri.parse('$_baseUrl/api/behavior/incidents/$incidentId'),
    );

    if (response.statusCode != 204) {
      throw Exception('Failed to delete incident: ${response.statusCode}');
    }
  }

  // ============================================================================
  // Pattern Analysis
  // ============================================================================

  /// Get behavior patterns for a student.
  Future<BehaviorPattern> getPatterns({
    required String studentId,
    String? startDate,
    String? endDate,
  }) async {
    final queryParams = <String, String>{
      'studentId': studentId,
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
    };

    final uri = Uri.parse('$_baseUrl/api/behavior/patterns')
        .replace(queryParameters: queryParams);
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      return BehaviorPattern.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to load patterns: ${response.statusCode}');
    }
  }

  /// Get behavior trends over time.
  Future<List<BehaviorTrend>> getTrends({
    required String studentId,
    String? startDate,
    String? endDate,
    String? groupBy, // day, week, month
  }) async {
    final queryParams = <String, String>{
      'studentId': studentId,
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
      if (groupBy != null) 'groupBy': groupBy,
    };

    final uri = Uri.parse('$_baseUrl/api/behavior/trends')
        .replace(queryParameters: queryParams);
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => BehaviorTrend.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load trends: ${response.statusCode}');
    }
  }

  // ============================================================================
  // Interventions
  // ============================================================================

  /// Get all interventions for a student.
  Future<List<BehaviorIntervention>> getInterventions({
    required String studentId,
    InterventionStatus? status,
  }) async {
    final queryParams = <String, String>{
      'studentId': studentId,
      if (status != null) 'status': status.name,
    };

    final uri = Uri.parse('$_baseUrl/api/behavior/interventions')
        .replace(queryParameters: queryParams);
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => BehaviorIntervention.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load interventions: ${response.statusCode}');
    }
  }

  /// Create a new intervention.
  Future<BehaviorIntervention> createIntervention(
      BehaviorIntervention intervention) async {
    final response = await _client.post(
      Uri.parse('$_baseUrl/api/behavior/interventions'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(intervention.toJson()),
    );

    if (response.statusCode == 201) {
      return BehaviorIntervention.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to create intervention: ${response.statusCode}');
    }
  }

  /// Update an intervention.
  Future<BehaviorIntervention> updateIntervention(
      BehaviorIntervention intervention) async {
    final response = await _client.put(
      Uri.parse('$_baseUrl/api/behavior/interventions/${intervention.id}'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(intervention.toJson()),
    );

    if (response.statusCode == 200) {
      return BehaviorIntervention.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to update intervention: ${response.statusCode}');
    }
  }

  /// Record intervention implementation.
  Future<InterventionLog> recordImplementation({
    required String interventionId,
    required String studentId,
    required DateTime date,
    required bool implemented,
    required int effectiveness,
    String? notes,
  }) async {
    final response = await _client.post(
      Uri.parse('$_baseUrl/api/behavior/interventions/$interventionId/log'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'studentId': studentId,
        'date': date.toIso8601String(),
        'implemented': implemented,
        'effectiveness': effectiveness,
        'notes': notes,
      }),
    );

    if (response.statusCode == 201) {
      return InterventionLog.fromJson(json.decode(response.body));
    } else {
      throw Exception(
          'Failed to record implementation: ${response.statusCode}');
    }
  }

  /// Get intervention logs.
  Future<List<InterventionLog>> getInterventionLogs({
    required String interventionId,
    String? startDate,
    String? endDate,
  }) async {
    final queryParams = <String, String>{
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
    };

    final uri = Uri.parse(
            '$_baseUrl/api/behavior/interventions/$interventionId/logs')
        .replace(queryParameters: queryParams);
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => InterventionLog.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load intervention logs: ${response.statusCode}');
    }
  }

  // ============================================================================
  // Reports
  // ============================================================================

  /// Generate behavior summary report.
  Future<BehaviorReport> generateReport({
    required String studentId,
    required String startDate,
    required String endDate,
    bool includeInterventions = true,
    bool includePatterns = true,
  }) async {
    final queryParams = <String, String>{
      'studentId': studentId,
      'startDate': startDate,
      'endDate': endDate,
      'includeInterventions': includeInterventions.toString(),
      'includePatterns': includePatterns.toString(),
    };

    final uri = Uri.parse('$_baseUrl/api/behavior/reports')
        .replace(queryParameters: queryParams);
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      return BehaviorReport.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to generate report: ${response.statusCode}');
    }
  }

  /// Get intervention templates.
  Future<List<InterventionTemplate>> getInterventionTemplates({
    BehaviorType? behaviorType,
    String? category,
  }) async {
    final queryParams = <String, String>{
      if (behaviorType != null) 'behaviorType': behaviorType.name,
      if (category != null) 'category': category,
    };

    final uri = Uri.parse('$_baseUrl/api/behavior/intervention-templates')
        .replace(queryParameters: queryParams);
    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => InterventionTemplate.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load templates: ${response.statusCode}');
    }
  }

  void dispose() {
    _client.close();
  }
}
