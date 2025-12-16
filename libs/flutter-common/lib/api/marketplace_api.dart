/// Marketplace API Client
///
/// API client for marketplace entitlements and partner content.
library;

import 'package:dio/dio.dart';

import 'api_client.dart';

/// Types
enum MarketplaceItemType {
  contentPack,
  embeddedTool,
}

/// Partner content item from marketplace
class PartnerContentItem {
  final String id;
  final String slug;
  final String title;
  final String shortDescription;
  final MarketplaceItemType itemType;
  final List<String> subjects;
  final List<String> gradeBands;
  final String? iconUrl;
  final PartnerVendor vendor;
  final PartnerLicense license;
  final int loCount;
  final List<String> accessibilityTags;
  final List<String> safetyTags;

  const PartnerContentItem({
    required this.id,
    required this.slug,
    required this.title,
    required this.shortDescription,
    required this.itemType,
    required this.subjects,
    required this.gradeBands,
    this.iconUrl,
    required this.vendor,
    required this.license,
    required this.loCount,
    required this.accessibilityTags,
    required this.safetyTags,
  });

  factory PartnerContentItem.fromJson(Map<String, dynamic> json) {
    return PartnerContentItem(
      id: json['id'] as String,
      slug: json['slug'] as String,
      title: json['title'] as String,
      shortDescription: json['shortDescription'] as String,
      itemType: json['itemType'] == 'CONTENT_PACK'
          ? MarketplaceItemType.contentPack
          : MarketplaceItemType.embeddedTool,
      subjects: List<String>.from(json['subjects'] ?? []),
      gradeBands: List<String>.from(json['gradeBands'] ?? []),
      iconUrl: json['iconUrl'] as String?,
      vendor: PartnerVendor.fromJson(json['vendor'] as Map<String, dynamic>),
      license: PartnerLicense.fromJson(json['license'] as Map<String, dynamic>),
      loCount: json['loCount'] as int? ?? 0,
      accessibilityTags: List<String>.from(json['accessibilityTags'] ?? []),
      safetyTags: List<String>.from(json['safetyTags'] ?? []),
    );
  }
}

class PartnerVendor {
  final String id;
  final String slug;
  final String name;
  final String? logoUrl;

  const PartnerVendor({
    required this.id,
    required this.slug,
    required this.name,
    this.logoUrl,
  });

  factory PartnerVendor.fromJson(Map<String, dynamic> json) {
    return PartnerVendor(
      id: json['id'] as String,
      slug: json['slug'] as String,
      name: json['name'] as String,
      logoUrl: json['logoUrl'] as String?,
    );
  }
}

class PartnerLicense {
  final String id;
  final String status;
  final int? seatLimit;
  final int seatsUsed;
  final DateTime? validUntil;

  const PartnerLicense({
    required this.id,
    required this.status,
    this.seatLimit,
    required this.seatsUsed,
    this.validUntil,
  });

  factory PartnerLicense.fromJson(Map<String, dynamic> json) {
    return PartnerLicense(
      id: json['id'] as String,
      status: json['status'] as String,
      seatLimit: json['seatLimit'] as int?,
      seatsUsed: json['seatsUsed'] as int? ?? 0,
      validUntil: json['validUntil'] != null
          ? DateTime.parse(json['validUntil'] as String)
          : null,
    );
  }

  bool get hasSeatsAvailable =>
      seatLimit == null || seatsUsed < seatLimit!;
}

class EntitledContentResponse {
  final List<PartnerContentItem> data;
  final int total;
  final bool hasMore;

  const EntitledContentResponse({
    required this.data,
    required this.total,
    required this.hasMore,
  });

  factory EntitledContentResponse.fromJson(Map<String, dynamic> json) {
    final pagination = json['pagination'] as Map<String, dynamic>;
    return EntitledContentResponse(
      data: (json['data'] as List)
          .map((e) => PartnerContentItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: pagination['total'] as int,
      hasMore: pagination['hasMore'] as bool,
    );
  }
}

class EntitlementCheckResult {
  final List<String> entitled;
  final List<DeniedEntitlement> denied;
  final int totalRequested;
  final int totalEntitled;

  const EntitlementCheckResult({
    required this.entitled,
    required this.denied,
    required this.totalRequested,
    required this.totalEntitled,
  });

  factory EntitlementCheckResult.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] as Map<String, dynamic>;
    return EntitlementCheckResult(
      entitled: List<String>.from(json['entitled'] ?? []),
      denied: (json['denied'] as List?)
              ?.map((e) => DeniedEntitlement.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      totalRequested: summary['totalRequested'] as int,
      totalEntitled: summary['totalEntitled'] as int,
    );
  }
}

class DeniedEntitlement {
  final String loId;
  final String reason;

  const DeniedEntitlement({
    required this.loId,
    required this.reason,
  });

  factory DeniedEntitlement.fromJson(Map<String, dynamic> json) {
    return DeniedEntitlement(
      loId: json['loId'] as String,
      reason: json['reason'] as String,
    );
  }
}

/// Marketplace API client for entitlement checks and partner content.
class MarketplaceApiClient {
  MarketplaceApiClient({Dio? dio}) : _dio = dio ?? AivoApiClient.instance.dio;

  final Dio _dio;

  static const String _internalPath = '/internal/entitlements';

  /// Get entitled partner content for the current tenant.
  ///
  /// Returns content packs and tools that the tenant has active licenses for.
  Future<EntitledContentResponse> getEntitledPartnerContent({
    required String tenantId,
    String? schoolId,
    String? classroomId,
    String? gradeBand,
    String? subject,
    MarketplaceItemType? itemType,
    int limit = 50,
    int offset = 0,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '$_internalPath/entitled-content',
      data: {
        'tenantId': tenantId,
        if (schoolId != null) 'schoolId': schoolId,
        if (classroomId != null) 'classroomId': classroomId,
        if (gradeBand != null) 'gradeBand': gradeBand,
        if (subject != null) 'subject': subject,
        if (itemType != null)
          'itemType': itemType == MarketplaceItemType.contentPack
              ? 'CONTENT_PACK'
              : 'EMBEDDED_TOOL',
        'limit': limit,
        'offset': offset,
      },
    );

    return EntitledContentResponse.fromJson(response.data!);
  }

  /// Batch check entitlements for multiple LOs.
  ///
  /// Returns which LOs the tenant is entitled to access.
  Future<EntitlementCheckResult> batchCheckEntitlements({
    required String tenantId,
    required List<String> loIds,
    String? learnerId,
    String? schoolId,
    String? classroomId,
    String? gradeBand,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '$_internalPath/batch-check',
      data: {
        'tenantId': tenantId,
        'loIds': loIds,
        if (learnerId != null) 'learnerId': learnerId,
        if (schoolId != null) 'schoolId': schoolId,
        if (classroomId != null) 'classroomId': classroomId,
        if (gradeBand != null) 'gradeBand': gradeBand,
      },
    );

    return EntitlementCheckResult.fromJson(response.data!);
  }

  /// Get all entitled LO IDs from partner content.
  Future<List<String>> getEntitledLoIds({
    required String tenantId,
    String? schoolId,
    String? gradeBand,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '$_internalPath/entitled-los',
      data: {
        'tenantId': tenantId,
        if (schoolId != null) 'schoolId': schoolId,
        if (gradeBand != null) 'gradeBand': gradeBand,
      },
    );

    return List<String>.from(response.data!['loIds'] ?? []);
  }

  /// Check if a single LO is entitled for the tenant.
  Future<bool> isLoEntitled({
    required String tenantId,
    required String loId,
    String? learnerId,
    String? schoolId,
    String? classroomId,
    String? gradeBand,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '$_internalPath/check',
      data: {
        'tenantId': tenantId,
        'loId': loId,
        if (learnerId != null) 'learnerId': learnerId,
        if (schoolId != null) 'schoolId': schoolId,
        if (classroomId != null) 'classroomId': classroomId,
        if (gradeBand != null) 'gradeBand': gradeBand,
      },
    );

    return response.data!['isAllowed'] as bool;
  }
}
