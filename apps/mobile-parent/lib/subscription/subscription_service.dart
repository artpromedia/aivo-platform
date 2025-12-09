import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'subscription_models.dart';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const _paymentsBaseUrl = String.fromEnvironment(
  'PAYMENTS_BASE_URL',
  defaultValue: 'http://localhost:4070',
);

const _billingBaseUrl = String.fromEnvironment(
  'BILLING_BASE_URL',
  defaultValue: 'http://localhost:4060',
);

const _entitlementsBaseUrl = String.fromEnvironment(
  'ENTITLEMENTS_BASE_URL',
  defaultValue: 'http://localhost:4080',
);

const _useMock = bool.fromEnvironment('USE_SUBSCRIPTION_MOCK', defaultValue: true);

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/// Service for subscription, billing, and entitlement operations.
class SubscriptionService {
  SubscriptionService({String? accessToken}) {
    final headers = accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null;
    
    _paymentsDio = Dio(BaseOptions(baseUrl: _paymentsBaseUrl, headers: headers));
    _billingDio = Dio(BaseOptions(baseUrl: _billingBaseUrl, headers: headers));
    _entitlementsDio = Dio(BaseOptions(baseUrl: _entitlementsBaseUrl, headers: headers));
  }

  late final Dio _paymentsDio;
  late final Dio _billingDio;
  late final Dio _entitlementsDio;

  // ──────────────────────────────────────────────────────────────────────────
  // BILLING ACCOUNT
  // ──────────────────────────────────────────────────────────────────────────

  /// Get or create billing account for tenant.
  Future<BillingAccount> getBillingAccount(String tenantId) async {
    if (_useMock) return _mockBillingAccount(tenantId);

    final response = await _billingDio.get('/billing-accounts/by-tenant/$tenantId');
    return BillingAccount.fromJson(response.data as Map<String, dynamic>);
  }

  /// Ensure Stripe customer exists for billing account.
  Future<String> ensureStripeCustomer(String billingAccountId) async {
    if (_useMock) return 'cus_mock_${billingAccountId.substring(0, 8)}';

    final response = await _paymentsDio.post(
      '/payments/accounts/$billingAccountId/customer',
    );
    return response.data['customerId'] as String;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PAYMENT METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /// Attach a payment method to billing account.
  Future<PaymentInstrument> attachPaymentMethod(
    String billingAccountId,
    String paymentMethodId, {
    bool setAsDefault = true,
  }) async {
    if (_useMock) return _mockPaymentInstrument();

    final response = await _paymentsDio.post(
      '/payments/accounts/$billingAccountId/payment-method/attach',
      data: {
        'paymentMethodId': paymentMethodId,
        'setAsDefault': setAsDefault,
      },
    );
    return PaymentInstrument.fromJson(response.data as Map<String, dynamic>);
  }

  /// Get default payment method for billing account.
  Future<PaymentInstrument?> getDefaultPaymentMethod(String billingAccountId) async {
    if (_useMock) return null; // No payment method by default in mock

    try {
      final response = await _billingDio.get(
        '/billing-accounts/$billingAccountId/payment-methods/default',
      );
      return PaymentInstrument.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTIONS
  // ──────────────────────────────────────────────────────────────────────────

  /// Get subscription for billing account.
  Future<Subscription?> getSubscription(String billingAccountId) async {
    if (_useMock) return null; // No subscription by default

    try {
      final response = await _billingDio.get(
        '/subscriptions/by-account/$billingAccountId',
      );
      return Subscription.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  /// Get subscription by ID.
  Future<Subscription> getSubscriptionById(String subscriptionId) async {
    if (_useMock) return _mockSubscription(subscriptionId);

    final response = await _paymentsDio.get(
      '/payments/subscriptions/$subscriptionId',
    );
    return Subscription.fromJson(response.data as Map<String, dynamic>);
  }

  /// Create a new subscription.
  Future<CreateSubscriptionResponse> createSubscription(
    CreateSubscriptionRequest request,
  ) async {
    if (_useMock) return _mockCreateSubscription(request);

    final response = await _paymentsDio.post(
      '/payments/subscriptions',
      data: request.toJson(),
    );
    return CreateSubscriptionResponse.fromJson(response.data as Map<String, dynamic>);
  }

  /// Cancel subscription.
  Future<void> cancelSubscription(
    String subscriptionId, {
    bool cancelImmediately = false,
  }) async {
    if (_useMock) return;

    await _paymentsDio.post(
      '/payments/subscriptions/$subscriptionId/cancel',
      data: {'cancelImmediately': cancelImmediately},
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PLANS
  // ──────────────────────────────────────────────────────────────────────────

  /// Get available plans.
  Future<List<Plan>> getAvailablePlans() async {
    if (_useMock) return _mockPlans();

    final response = await _billingDio.get('/plans');
    final data = response.data as List<dynamic>;
    return data
        .map((p) => Plan.fromJson(p as Map<String, dynamic>))
        .where((p) => p.sku.startsWith('PARENT_'))
        .toList();
  }

  /// Get plan by SKU.
  Future<Plan?> getPlanBySku(String sku) async {
    if (_useMock) return _mockPlans().where((p) => p.sku == sku).firstOrNull;

    try {
      final response = await _billingDio.get('/plans/by-sku/$sku');
      return Plan.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ENTITLEMENTS
  // ──────────────────────────────────────────────────────────────────────────

  /// Get entitlements for tenant.
  Future<List<Entitlement>> getEntitlements(String tenantId) async {
    if (_useMock) return _mockEntitlements(tenantId);

    final response = await _entitlementsDio.get('/entitlements/by-tenant/$tenantId');
    final data = response.data as List<dynamic>;
    return data.map((e) => Entitlement.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Check if a specific module is enabled.
  Future<bool> isModuleEnabled(String tenantId, String moduleCode) async {
    if (_useMock) return moduleCode == 'ELA' || moduleCode == 'MATH';

    try {
      final response = await _entitlementsDio.get(
        '/entitlements/by-tenant/$tenantId/module/$moduleCode',
      );
      final entitlement = Entitlement.fromJson(response.data as Map<String, dynamic>);
      return entitlement.isValid;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return false;
      rethrow;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MOCK DATA
  // ──────────────────────────────────────────────────────────────────────────

  BillingAccount _mockBillingAccount(String tenantId) {
    return BillingAccount(
      id: 'ba_mock_$tenantId',
      tenantId: tenantId,
      displayName: 'Mock Family Account',
      hasPaymentMethod: false,
    );
  }

  PaymentInstrument _mockPaymentInstrument() {
    return const PaymentInstrument(
      id: 'pi_mock_123',
      brand: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2027,
      isDefault: true,
    );
  }

  Subscription _mockSubscription(String subscriptionId) {
    final now = DateTime.now();
    return Subscription(
      id: subscriptionId,
      billingAccountId: 'ba_mock_123',
      planId: 'plan_premium',
      status: SubscriptionStatus.inTrial,
      quantity: 1,
      trialStartAt: now,
      trialEndAt: now.add(const Duration(days: 30)),
      currentPeriodStart: now,
      currentPeriodEnd: now.add(const Duration(days: 30)),
    );
  }

  CreateSubscriptionResponse _mockCreateSubscription(CreateSubscriptionRequest request) {
    final now = DateTime.now();
    final trialEnd = now.add(Duration(days: request.trialDays ?? 30));
    return CreateSubscriptionResponse(
      subscriptionId: 'sub_mock_${DateTime.now().millisecondsSinceEpoch}',
      providerSubscriptionId: 'sub_stripe_mock',
      status: SubscriptionStatus.inTrial,
      trialStartAt: now,
      trialEndAt: trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
    );
  }

  List<Plan> _mockPlans() {
    return const [
      Plan(
        id: 'plan_basic',
        sku: 'PARENT_BASE_MONTHLY',
        name: 'Basic Plan',
        description: 'Core ELA and Math modules',
        unitPriceCents: 0,
        billingPeriod: 'MONTHLY',
        trialDays: 0,
        modules: ['ELA', 'MATH'],
      ),
      Plan(
        id: 'plan_premium',
        sku: 'PARENT_PREMIUM_MONTHLY',
        name: 'Premium Plan',
        description: 'All modules including SEL, Speech, Science, and more',
        unitPriceCents: 1499,
        billingPeriod: 'MONTHLY',
        trialDays: 30,
        modules: ['ELA', 'MATH', 'SEL', 'SPEECH', 'SCIENCE', 'CODING', 'WRITING'],
      ),
      Plan(
        id: 'plan_premium_yearly',
        sku: 'PARENT_PREMIUM_YEARLY',
        name: 'Premium Plan (Annual)',
        description: 'All modules - save 20% with annual billing',
        unitPriceCents: 14390,
        billingPeriod: 'YEARLY',
        trialDays: 30,
        modules: ['ELA', 'MATH', 'SEL', 'SPEECH', 'SCIENCE', 'CODING', 'WRITING'],
      ),
    ];
  }

  List<Entitlement> _mockEntitlements(String tenantId) {
    // By default, only basic modules are enabled
    return [
      Entitlement(id: 'ent_ela', tenantId: tenantId, moduleCode: 'ELA', isEnabled: true),
      Entitlement(id: 'ent_math', tenantId: tenantId, moduleCode: 'MATH', isEnabled: true),
    ];
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

/// Provider for subscription service.
final subscriptionServiceProvider = Provider.family<SubscriptionService, String?>(
  (ref, accessToken) => SubscriptionService(accessToken: accessToken),
);
