/// Consent Service
///
/// Manages consent grants and checks for parent app.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/// Available consent types.
enum ConsentType {
  baselineAssessment('BASELINE_ASSESSMENT', 'Baseline Assessment', 
    'Allow your child to take assessments to determine their learning level.'),
  aiTutor('AI_TUTOR', 'AI Tutor',
    'Allow your child to receive personalized AI-powered tutoring and explanations.'),
  researchAnalytics('RESEARCH_ANALYTICS', 'Research Analytics',
    'Allow anonymized data to be used for educational research and improvement.');

  const ConsentType(this.code, this.displayName, this.description);

  final String code;
  final String displayName;
  final String description;

  static ConsentType? fromCode(String code) {
    return ConsentType.values.cast<ConsentType?>().firstWhere(
      (t) => t?.code == code,
      orElse: () => null,
    );
  }
}

/// Consent status.
enum ConsentStatus {
  pending,
  granted,
  declined,
  expired,
}

/// Individual consent record.
class Consent {
  const Consent({
    required this.type,
    required this.learnerId,
    required this.status,
    this.grantedAt,
    this.expiresAt,
  });

  final ConsentType type;
  final String learnerId;
  final ConsentStatus status;
  final DateTime? grantedAt;
  final DateTime? expiresAt;

  bool get isActive => 
    status == ConsentStatus.granted && 
    (expiresAt == null || DateTime.now().isBefore(expiresAt!));

  factory Consent.fromJson(Map<String, dynamic> json) {
    return Consent(
      type: ConsentType.fromCode(json['type'] as String) ?? ConsentType.baselineAssessment,
      learnerId: json['learnerId'] as String,
      status: ConsentStatus.values.firstWhere(
        (s) => s.name == (json['status'] as String).toLowerCase(),
        orElse: () => ConsentStatus.pending,
      ),
      grantedAt: json['grantedAt'] != null 
        ? DateTime.tryParse(json['grantedAt'] as String)
        : null,
      expiresAt: json['expiresAt'] != null
        ? DateTime.tryParse(json['expiresAt'] as String)
        : null,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSENT STATE
// ═══════════════════════════════════════════════════════════════════════════════

/// State for consents per learner.
class ConsentState {
  const ConsentState({
    this.consents = const {},
    this.isLoading = false,
    this.error,
  });

  /// Map of learnerId -> list of consents.
  final Map<String, List<Consent>> consents;
  final bool isLoading;
  final String? error;

  /// Get consents for a specific learner.
  List<Consent> getConsentsForLearner(String learnerId) {
    return consents[learnerId] ?? [];
  }

  /// Check if a specific consent is active for a learner.
  bool hasActiveConsent(String learnerId, ConsentType type) {
    return getConsentsForLearner(learnerId)
      .any((c) => c.type == type && c.isActive);
  }

  /// Get pending (required but not granted) consents for a learner.
  List<ConsentType> getPendingConsents(String learnerId) {
    final granted = getConsentsForLearner(learnerId)
      .where((c) => c.isActive)
      .map((c) => c.type)
      .toSet();
    
    return ConsentType.values
      .where((t) => !granted.contains(t))
      .toList();
  }

  ConsentState copyWith({
    Map<String, List<Consent>>? consents,
    bool? isLoading,
    String? error,
  }) {
    return ConsentState(
      consents: consents ?? this.consents,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSENT NOTIFIER
// ═══════════════════════════════════════════════════════════════════════════════

/// Notifier for managing consent state.
class ConsentNotifier extends StateNotifier<ConsentState> {
  ConsentNotifier(this._apiClient) : super(const ConsentState());

  final AivoApiClient _apiClient;

  /// Load consents for a learner.
  Future<void> loadConsents(String learnerId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _apiClient.get(
        ApiEndpoints.consents,
        queryParameters: {'learnerId': learnerId},
      );

      final data = response.data as List<dynamic>? ?? [];
      final consents = data
        .whereType<Map<String, dynamic>>()
        .map((json) => Consent.fromJson(json))
        .toList();

      final newConsents = Map<String, List<Consent>>.from(state.consents);
      newConsents[learnerId] = consents;

      state = state.copyWith(
        consents: newConsents,
        isLoading: false,
      );
    } catch (e) {
      final apiError = extractApiException(e);
      state = state.copyWith(
        isLoading: false,
        error: apiError?.message ?? 'Failed to load consents',
      );
    }
  }

  /// Grant a consent for a learner.
  Future<bool> grantConsent(String learnerId, ConsentType type) async {
    try {
      await _apiClient.post(
        ApiEndpoints.consentGrant(learnerId),
        data: {'type': type.code},
      );

      // Reload consents
      await loadConsents(learnerId);
      return true;
    } catch (e) {
      debugPrint('[ConsentService] Error granting consent: $e');
      return false;
    }
  }

  /// Revoke a consent for a learner.
  Future<bool> revokeConsent(String learnerId, ConsentType type) async {
    try {
      await _apiClient.post(
        ApiEndpoints.consentRevoke(learnerId),
        data: {'type': type.code},
      );

      // Reload consents
      await loadConsents(learnerId);
      return true;
    } catch (e) {
      debugPrint('[ConsentService] Error revoking consent: $e');
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for consent notifier.
final consentNotifierProvider = 
    StateNotifierProvider<ConsentNotifier, ConsentState>((ref) {
  final apiClient = AivoApiClient.instance;
  return ConsentNotifier(apiClient);
});

/// Provider for checking if all required consents are granted.
final hasRequiredConsentsProvider = Provider.family<bool, String>((ref, learnerId) {
  final consentState = ref.watch(consentNotifierProvider);
  // For now, baseline assessment is required
  return consentState.hasActiveConsent(learnerId, ConsentType.baselineAssessment);
});
