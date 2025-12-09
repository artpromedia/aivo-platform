/// Subscription and entitlement models for parent app.
library;

import 'package:flutter/foundation.dart';

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

/// Subscription/trial status.
enum SubscriptionStatus {
  none,
  inTrial,
  active,
  pastDue,
  canceled,
  expired,
}

/// Available premium modules.
enum PremiumModule {
  sel('SEL', 'Social-Emotional Learning', 'Help your child develop emotional intelligence'),
  speech('SPEECH', 'Speech & Language', 'Targeted speech and language support'),
  science('SCIENCE', 'Science Explorer', 'Hands-on science learning activities'),
  coding('CODING', 'Coding Basics', 'Introduction to computational thinking'),
  writing('WRITING', 'Creative Writing', 'Express ideas through writing');

  const PremiumModule(this.code, this.displayName, this.description);

  final String code;
  final String displayName;
  final String description;

  static PremiumModule? fromCode(String code) {
    return PremiumModule.values.where((m) => m.code == code).firstOrNull;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DATA CLASSES
// ══════════════════════════════════════════════════════════════════════════════

/// Represents a billing subscription from the backend.
@immutable
class Subscription {
  const Subscription({
    required this.id,
    required this.billingAccountId,
    required this.planId,
    required this.status,
    required this.quantity,
    this.trialStartAt,
    this.trialEndAt,
    required this.currentPeriodStart,
    required this.currentPeriodEnd,
    this.cancelAtPeriodEnd = false,
    this.canceledAt,
    this.providerSubscriptionId,
  });

  final String id;
  final String billingAccountId;
  final String planId;
  final SubscriptionStatus status;
  final int quantity;
  final DateTime? trialStartAt;
  final DateTime? trialEndAt;
  final DateTime currentPeriodStart;
  final DateTime currentPeriodEnd;
  final bool cancelAtPeriodEnd;
  final DateTime? canceledAt;
  final String? providerSubscriptionId;

  factory Subscription.fromJson(Map<String, dynamic> json) {
    return Subscription(
      id: json['id'] as String,
      billingAccountId: json['billingAccountId'] as String,
      planId: json['planId'] as String,
      status: _parseStatus(json['status'] as String),
      quantity: json['quantity'] as int? ?? 1,
      trialStartAt: json['trialStartAt'] != null
          ? DateTime.parse(json['trialStartAt'] as String)
          : null,
      trialEndAt: json['trialEndAt'] != null
          ? DateTime.parse(json['trialEndAt'] as String)
          : null,
      currentPeriodStart: DateTime.parse(json['currentPeriodStart'] as String),
      currentPeriodEnd: DateTime.parse(json['currentPeriodEnd'] as String),
      cancelAtPeriodEnd: json['cancelAtPeriodEnd'] as bool? ?? false,
      canceledAt: json['canceledAt'] != null
          ? DateTime.parse(json['canceledAt'] as String)
          : null,
      providerSubscriptionId: json['providerSubscriptionId'] as String?,
    );
  }

  static SubscriptionStatus _parseStatus(String status) {
    switch (status) {
      case 'IN_TRIAL':
        return SubscriptionStatus.inTrial;
      case 'ACTIVE':
        return SubscriptionStatus.active;
      case 'PAST_DUE':
        return SubscriptionStatus.pastDue;
      case 'CANCELED':
        return SubscriptionStatus.canceled;
      case 'EXPIRED':
        return SubscriptionStatus.expired;
      default:
        return SubscriptionStatus.none;
    }
  }

  bool get isActive =>
      status == SubscriptionStatus.active || status == SubscriptionStatus.inTrial;

  bool get isPremium => isActive && !cancelAtPeriodEnd;

  int? get daysLeftInTrial {
    if (status != SubscriptionStatus.inTrial || trialEndAt == null) return null;
    return trialEndAt!.difference(DateTime.now()).inDays;
  }

  Subscription copyWith({
    String? id,
    String? billingAccountId,
    String? planId,
    SubscriptionStatus? status,
    int? quantity,
    DateTime? trialStartAt,
    DateTime? trialEndAt,
    DateTime? currentPeriodStart,
    DateTime? currentPeriodEnd,
    bool? cancelAtPeriodEnd,
    DateTime? canceledAt,
    String? providerSubscriptionId,
  }) {
    return Subscription(
      id: id ?? this.id,
      billingAccountId: billingAccountId ?? this.billingAccountId,
      planId: planId ?? this.planId,
      status: status ?? this.status,
      quantity: quantity ?? this.quantity,
      trialStartAt: trialStartAt ?? this.trialStartAt,
      trialEndAt: trialEndAt ?? this.trialEndAt,
      currentPeriodStart: currentPeriodStart ?? this.currentPeriodStart,
      currentPeriodEnd: currentPeriodEnd ?? this.currentPeriodEnd,
      cancelAtPeriodEnd: cancelAtPeriodEnd ?? this.cancelAtPeriodEnd,
      canceledAt: canceledAt ?? this.canceledAt,
      providerSubscriptionId: providerSubscriptionId ?? this.providerSubscriptionId,
    );
  }
}

/// Entitlement granted to a tenant/account.
@immutable
class Entitlement {
  const Entitlement({
    required this.id,
    required this.tenantId,
    required this.moduleCode,
    required this.isEnabled,
    this.expiresAt,
  });

  final String id;
  final String tenantId;
  final String moduleCode;
  final bool isEnabled;
  final DateTime? expiresAt;

  factory Entitlement.fromJson(Map<String, dynamic> json) {
    return Entitlement(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      moduleCode: json['moduleCode'] as String,
      isEnabled: json['isEnabled'] as bool? ?? true,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
    );
  }

  bool get isValid => isEnabled && (expiresAt == null || expiresAt!.isAfter(DateTime.now()));
}

/// Billing account info.
@immutable
class BillingAccount {
  const BillingAccount({
    required this.id,
    required this.tenantId,
    required this.displayName,
    this.providerCustomerId,
    this.billingEmail,
    this.hasPaymentMethod = false,
  });

  final String id;
  final String tenantId;
  final String displayName;
  final String? providerCustomerId;
  final String? billingEmail;
  final bool hasPaymentMethod;

  factory BillingAccount.fromJson(Map<String, dynamic> json) {
    return BillingAccount(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      displayName: json['displayName'] as String,
      providerCustomerId: json['providerCustomerId'] as String?,
      billingEmail: json['billingEmail'] as String?,
      hasPaymentMethod: json['hasPaymentMethod'] as bool? ?? false,
    );
  }

  bool get hasStripeCustomer => providerCustomerId != null;
}

/// Payment instrument (card) info.
@immutable
class PaymentInstrument {
  const PaymentInstrument({
    required this.id,
    this.brand,
    this.last4,
    this.expiryMonth,
    this.expiryYear,
    this.isDefault = false,
  });

  final String id;
  final String? brand;
  final String? last4;
  final int? expiryMonth;
  final int? expiryYear;
  final bool isDefault;

  factory PaymentInstrument.fromJson(Map<String, dynamic> json) {
    return PaymentInstrument(
      id: json['id'] as String? ?? json['instrumentId'] as String,
      brand: json['brand'] as String?,
      last4: json['last4'] as String?,
      expiryMonth: json['expiryMonth'] as int?,
      expiryYear: json['expiryYear'] as int?,
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }

  String get displayText {
    if (brand == null || last4 == null) return 'Card on file';
    return '${brand!.toUpperCase()} •••• $last4';
  }

  String? get expiryText {
    if (expiryMonth == null || expiryYear == null) return null;
    return '${expiryMonth.toString().padLeft(2, '0')}/${expiryYear! % 100}';
  }
}

/// Plan info from billing service.
@immutable
class Plan {
  const Plan({
    required this.id,
    required this.sku,
    required this.name,
    this.description,
    required this.unitPriceCents,
    required this.billingPeriod,
    this.trialDays = 0,
    this.modules = const [],
  });

  final String id;
  final String sku;
  final String name;
  final String? description;
  final int unitPriceCents;
  final String billingPeriod; // MONTHLY or YEARLY
  final int trialDays;
  final List<String> modules;

  factory Plan.fromJson(Map<String, dynamic> json) {
    final metadata = json['metadataJson'] as Map<String, dynamic>?;
    return Plan(
      id: json['id'] as String,
      sku: json['sku'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      unitPriceCents: json['unitPriceCents'] as int,
      billingPeriod: json['billingPeriod'] as String,
      trialDays: json['trialDays'] as int? ?? 0,
      modules: (metadata?['modules'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }

  String get priceDisplay {
    final dollars = unitPriceCents / 100;
    final period = billingPeriod == 'YEARLY' ? '/year' : '/month';
    return '\$${dollars.toStringAsFixed(2)}$period';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST/RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/// Request to create a subscription.
@immutable
class CreateSubscriptionRequest {
  const CreateSubscriptionRequest({
    required this.billingAccountId,
    required this.planSku,
    this.quantity = 1,
    this.trialDays,
    this.metadata,
  });

  final String billingAccountId;
  final String planSku;
  final int quantity;
  final int? trialDays;
  final Map<String, dynamic>? metadata;

  Map<String, dynamic> toJson() {
    return {
      'billingAccountId': billingAccountId,
      'planSku': planSku,
      'quantity': quantity,
      if (trialDays != null) 'trialDays': trialDays,
      if (metadata != null) 'metadata': metadata,
    };
  }
}

/// Response from creating a subscription.
@immutable
class CreateSubscriptionResponse {
  const CreateSubscriptionResponse({
    required this.subscriptionId,
    required this.providerSubscriptionId,
    required this.status,
    this.trialStartAt,
    this.trialEndAt,
    required this.currentPeriodStart,
    required this.currentPeriodEnd,
  });

  final String subscriptionId;
  final String providerSubscriptionId;
  final SubscriptionStatus status;
  final DateTime? trialStartAt;
  final DateTime? trialEndAt;
  final DateTime currentPeriodStart;
  final DateTime currentPeriodEnd;

  factory CreateSubscriptionResponse.fromJson(Map<String, dynamic> json) {
    return CreateSubscriptionResponse(
      subscriptionId: json['subscriptionId'] as String,
      providerSubscriptionId: json['providerSubscriptionId'] as String,
      status: Subscription._parseStatus(json['status'] as String),
      trialStartAt: json['trialStartAt'] != null
          ? DateTime.parse(json['trialStartAt'] as String)
          : null,
      trialEndAt: json['trialEndAt'] != null
          ? DateTime.parse(json['trialEndAt'] as String)
          : null,
      currentPeriodStart: DateTime.parse(json['currentPeriodStart'] as String),
      currentPeriodEnd: DateTime.parse(json['currentPeriodEnd'] as String),
    );
  }
}
