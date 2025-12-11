/// Data models and services for platform explanations.
///
/// Provides "Why this?" functionality for Parent and Learner apps,
/// surfacing contextual explanations for AI-driven decisions.

import 'dart:convert';
import 'package:http/http.dart' as http;

// ══════════════════════════════════════════════════════════════════════════════
// MODELS
// ══════════════════════════════════════════════════════════════════════════════

/// A formatted reason for an explanation.
class ExplanationReason {
  final String label;
  final String description;

  const ExplanationReason({
    required this.label,
    required this.description,
  });

  factory ExplanationReason.fromJson(Map<String, dynamic> json) {
    return ExplanationReason(
      label: json['label'] as String? ?? '',
      description: json['description'] as String? ?? '',
    );
  }
}

/// A formatted input metric shown in explanations.
class ExplanationInput {
  final String label;
  final String value;
  final String? unit;

  const ExplanationInput({
    required this.label,
    required this.value,
    this.unit,
  });

  factory ExplanationInput.fromJson(Map<String, dynamic> json) {
    return ExplanationInput(
      label: json['label'] as String? ?? '',
      value: json['value'] as String? ?? '',
      unit: json['unit'] as String?,
    );
  }

  /// Formatted display value with optional unit.
  String get displayValue {
    if (unit != null && unit!.isNotEmpty) {
      return '$value $unit';
    }
    return value;
  }
}

/// Details section of an explanation.
class ExplanationDetails {
  final List<ExplanationReason> reasons;
  final List<ExplanationInput> inputs;
  final String? additionalContext;

  const ExplanationDetails({
    required this.reasons,
    required this.inputs,
    this.additionalContext,
  });

  factory ExplanationDetails.fromJson(Map<String, dynamic> json) {
    return ExplanationDetails(
      reasons: (json['reasons'] as List<dynamic>?)
              ?.map((e) => ExplanationReason.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      inputs: (json['inputs'] as List<dynamic>?)
              ?.map((e) => ExplanationInput.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      additionalContext: json['additionalContext'] as String?,
    );
  }

  bool get hasContent => reasons.isNotEmpty || inputs.isNotEmpty;
}

/// A formatted explanation event.
class Explanation {
  final String id;
  final String sourceType;
  final String actionType;
  final String relatedEntityType;
  final String relatedEntityId;
  final String summary;
  final ExplanationDetails details;
  final DateTime createdAt;

  const Explanation({
    required this.id,
    required this.sourceType,
    required this.actionType,
    required this.relatedEntityType,
    required this.relatedEntityId,
    required this.summary,
    required this.details,
    required this.createdAt,
  });

  factory Explanation.fromJson(Map<String, dynamic> json) {
    return Explanation(
      id: json['id'] as String? ?? '',
      sourceType: json['sourceType'] as String? ?? '',
      actionType: json['actionType'] as String? ?? '',
      relatedEntityType: json['relatedEntityType'] as String? ?? '',
      relatedEntityId: json['relatedEntityId'] as String? ?? '',
      summary: json['summary'] as String? ?? '',
      details: ExplanationDetails.fromJson(
        json['details'] as Map<String, dynamic>? ?? {},
      ),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }

  /// Whether this is a fallback explanation (no real data available).
  bool get isFallback => id == 'fallback';
}

/// Response from the explanations API.
class ExplanationsResponse {
  final List<Explanation> explanations;
  final bool hasFallback;

  const ExplanationsResponse({
    required this.explanations,
    required this.hasFallback,
  });

  factory ExplanationsResponse.fromJson(Map<String, dynamic> json) {
    return ExplanationsResponse(
      explanations: (json['explanations'] as List<dynamic>?)
              ?.map((e) => Explanation.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      hasFallback: json['hasFallback'] as bool? ?? false,
    );
  }

  /// Get the primary explanation (first one).
  Explanation? get primary => explanations.isNotEmpty ? explanations.first : null;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/// Service for fetching explanations from the analytics API.
class ExplanationService {
  final String baseUrl;
  final Future<String> Function() getAuthToken;

  ExplanationService({
    required this.baseUrl,
    required this.getAuthToken,
  });

  /// Fetch explanations for a specific entity.
  ///
  /// Used by "Why this?" buttons on activity cards, recommendations, etc.
  Future<ExplanationsResponse> getByEntity({
    required String relatedEntityType,
    required String relatedEntityId,
    String? learnerId,
    int limit = 3,
  }) async {
    final token = await getAuthToken();

    final queryParams = {
      'relatedEntityType': relatedEntityType,
      'relatedEntityId': relatedEntityId,
      if (learnerId != null) 'learnerId': learnerId,
      'limit': limit.toString(),
    };

    final uri = Uri.parse('$baseUrl/analytics/explanations/by-entity')
        .replace(queryParameters: queryParams);

    try {
      final response = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return ExplanationsResponse.fromJson(json);
      } else {
        // Return fallback on error
        return ExplanationsResponse(
          explanations: [_createFallbackExplanation(relatedEntityType, relatedEntityId)],
          hasFallback: true,
        );
      }
    } catch (e) {
      // Return fallback on network error
      return ExplanationsResponse(
        explanations: [_createFallbackExplanation(relatedEntityType, relatedEntityId)],
        hasFallback: true,
      );
    }
  }

  /// Fetch recent explanations for a learner.
  Future<List<Explanation>> getRecentForLearner({
    required String learnerId,
    List<String>? actionTypes,
    int limit = 10,
  }) async {
    final token = await getAuthToken();

    final queryParams = {
      if (actionTypes != null && actionTypes.isNotEmpty)
        'actionTypes': actionTypes.join(','),
      'limit': limit.toString(),
    };

    final uri = Uri.parse('$baseUrl/analytics/explanations/learners/$learnerId/recent')
        .replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);

    try {
      final response = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return (json['explanations'] as List<dynamic>?)
                ?.map((e) => Explanation.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [];
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  /// Create a fallback explanation for when API fails.
  Explanation _createFallbackExplanation(String entityType, String entityId) {
    String summary;
    switch (entityType) {
      case 'LEARNING_OBJECT_VERSION':
        summary = "Aivo used your child's recent work and learning goals to pick this activity. "
            "Detailed explanations are not available for this item yet.";
        break;
      case 'SKILL':
        summary = "This skill was identified based on your child's learning progress.";
        break;
      case 'MODULE':
        summary = "This module was suggested to build on what your child has been learning.";
        break;
      default:
        summary = "Aivo made this decision based on learning data and goals.";
    }

    return Explanation(
      id: 'fallback',
      sourceType: 'SYSTEM',
      actionType: 'UNKNOWN',
      relatedEntityType: entityType,
      relatedEntityId: entityId,
      summary: summary,
      details: const ExplanationDetails(reasons: [], inputs: []),
      createdAt: DateTime.now(),
    );
  }
}
