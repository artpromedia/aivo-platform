import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import 'subscription_models.dart';
import 'subscription_service.dart';

/// Provider for the current access token.
final _accessTokenProvider = FutureProvider<String?>((ref) async {
  final storage = ref.read(tokenStorageProvider);
  final tokens = await storage.readTokens();
  return tokens?.$1;
});

// ══════════════════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════════════════

/// Complete subscription state for the parent app.
@immutable
class SubscriptionState {
  const SubscriptionState({
    this.isLoading = true,
    this.error,
    this.billingAccount,
    this.subscription,
    this.defaultPaymentMethod,
    this.entitlements = const [],
    this.availablePlans = const [],
    this.selectedPremiumModules = const {},
  });

  final bool isLoading;
  final String? error;
  final BillingAccount? billingAccount;
  final Subscription? subscription;
  final PaymentInstrument? defaultPaymentMethod;
  final List<Entitlement> entitlements;
  final List<Plan> availablePlans;
  
  /// Modules selected by user during module selection flow (before subscription created).
  final Set<PremiumModule> selectedPremiumModules;

  // ──────────────────────────────────────────────────────────────────────────
  // COMPUTED PROPERTIES
  // ──────────────────────────────────────────────────────────────────────────

  /// Whether basic modules (ELA + Math) are enabled.
  bool get basicEnabled {
    // Basic is always enabled once user has any subscription or entitlements
    if (subscription != null && subscription!.isActive) return true;
    return entitlements.any((e) => 
        (e.moduleCode == 'ELA' || e.moduleCode == 'MATH') && e.isValid);
  }

  /// Set of premium modules that are currently enabled.
  Set<PremiumModule> get premiumEnabledModules {
    final enabled = <PremiumModule>{};
    for (final entitlement in entitlements) {
      if (!entitlement.isValid) continue;
      final module = PremiumModule.fromCode(entitlement.moduleCode);
      if (module != null) {
        enabled.add(module);
      }
    }
    return enabled;
  }

  /// Current trial/subscription status.
  SubscriptionStatus get trialStatus {
    return subscription?.status ?? SubscriptionStatus.none;
  }

  /// Trial end date if in trial.
  DateTime? get trialEndDate => subscription?.trialEndAt;

  /// Days remaining in trial.
  int? get daysLeftInTrial => subscription?.daysLeftInTrial;

  /// Whether user has an active subscription (trial or paid).
  bool get hasActiveSubscription =>
      subscription != null && subscription!.isActive;

  /// Whether user has a payment method on file.
  bool get hasPaymentMethod => defaultPaymentMethod != null;

  /// Whether user is on premium plan.
  bool get isPremium =>
      subscription != null && 
      subscription!.isActive && 
      !subscription!.cancelAtPeriodEnd;

  /// Whether subscription is set to cancel at period end.
  bool get willCancelAtPeriodEnd =>
      subscription?.cancelAtPeriodEnd ?? false;

  /// Whether subscription payment failed.
  bool get isPastDue => subscription?.status == SubscriptionStatus.pastDue;

  /// Check if a specific module is enabled.
  bool isModuleEnabled(String moduleCode) {
    // Basic modules always enabled if basic is enabled
    if ((moduleCode == 'ELA' || moduleCode == 'MATH') && basicEnabled) {
      return true;
    }
    return entitlements.any((e) => e.moduleCode == moduleCode && e.isValid);
  }

  /// Get the premium plan.
  Plan? get premiumPlan =>
      availablePlans.where((p) => p.sku.contains('PREMIUM')).firstOrNull;

  /// Get the basic plan.
  Plan? get basicPlan =>
      availablePlans.where((p) => p.sku.contains('BASE')).firstOrNull;

  // ──────────────────────────────────────────────────────────────────────────
  // COPY WITH
  // ──────────────────────────────────────────────────────────────────────────

  SubscriptionState copyWith({
    bool? isLoading,
    String? error,
    BillingAccount? billingAccount,
    Subscription? subscription,
    PaymentInstrument? defaultPaymentMethod,
    List<Entitlement>? entitlements,
    List<Plan>? availablePlans,
    Set<PremiumModule>? selectedPremiumModules,
    bool clearError = false,
    bool clearSubscription = false,
    bool clearPaymentMethod = false,
  }) {
    return SubscriptionState(
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      billingAccount: billingAccount ?? this.billingAccount,
      subscription: clearSubscription ? null : (subscription ?? this.subscription),
      defaultPaymentMethod: clearPaymentMethod ? null : (defaultPaymentMethod ?? this.defaultPaymentMethod),
      entitlements: entitlements ?? this.entitlements,
      availablePlans: availablePlans ?? this.availablePlans,
      selectedPremiumModules: selectedPremiumModules ?? this.selectedPremiumModules,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

/// Controller for subscription state management.
class SubscriptionController extends StateNotifier<SubscriptionState> {
  SubscriptionController(this._service, this._tenantId)
      : super(const SubscriptionState()) {
    if (_tenantId != null) {
      loadSubscriptionData();
    }
  }

  final SubscriptionService _service;
  final String? _tenantId;

  /// Load all subscription-related data.
  Future<void> loadSubscriptionData() async {
    if (_tenantId == null) return;

    state = state.copyWith(isLoading: true, clearError: true);

    try {
      // Fetch all data in parallel
      final results = await Future.wait([
        _service.getBillingAccount(_tenantId),
        _service.getEntitlements(_tenantId),
        _service.getAvailablePlans(),
      ]);

      final billingAccount = results[0] as BillingAccount;
      final entitlements = results[1] as List<Entitlement>;
      final plans = results[2] as List<Plan>;

      // Get subscription and payment method
      Subscription? subscription;
      PaymentInstrument? paymentMethod;

      try {
        subscription = await _service.getSubscription(billingAccount.id);
      } catch (_) {
        // No subscription yet
      }

      try {
        paymentMethod = await _service.getDefaultPaymentMethod(billingAccount.id);
      } catch (_) {
        // No payment method yet
      }

      state = state.copyWith(
        isLoading: false,
        billingAccount: billingAccount,
        subscription: subscription,
        defaultPaymentMethod: paymentMethod,
        entitlements: entitlements,
        availablePlans: plans,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load subscription data: $e',
      );
    }
  }

  /// Toggle a premium module selection (before subscription is created).
  void togglePremiumModule(PremiumModule module) {
    final current = Set<PremiumModule>.from(state.selectedPremiumModules);
    if (current.contains(module)) {
      current.remove(module);
    } else {
      current.add(module);
    }
    state = state.copyWith(selectedPremiumModules: current);
  }

  /// Set all premium modules selected/unselected.
  void setAllPremiumModules(bool selected) {
    if (selected) {
      state = state.copyWith(
        selectedPremiumModules: Set.from(PremiumModule.values),
      );
    } else {
      state = state.copyWith(selectedPremiumModules: {});
    }
  }

  /// Clear module selection.
  void clearModuleSelection() {
    state = state.copyWith(selectedPremiumModules: {});
  }

  /// Ensure Stripe customer exists.
  Future<String?> ensureStripeCustomer() async {
    if (state.billingAccount == null) return null;

    try {
      final customerId = await _service.ensureStripeCustomer(
        state.billingAccount!.id,
      );
      return customerId;
    } catch (e) {
      state = state.copyWith(error: 'Failed to create customer: $e');
      return null;
    }
  }

  /// Attach a payment method.
  Future<bool> attachPaymentMethod(String paymentMethodId) async {
    if (state.billingAccount == null) return false;

    state = state.copyWith(isLoading: true, clearError: true);

    try {
      // Ensure customer exists first
      await ensureStripeCustomer();

      final instrument = await _service.attachPaymentMethod(
        state.billingAccount!.id,
        paymentMethodId,
      );

      state = state.copyWith(
        isLoading: false,
        defaultPaymentMethod: instrument,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to attach payment method: $e',
      );
      return false;
    }
  }

  /// Start a subscription (with trial).
  Future<CreateSubscriptionResponse?> startSubscription({
    required String planSku,
    int? trialDays,
    Map<String, dynamic>? metadata,
  }) async {
    if (state.billingAccount == null) return null;

    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final response = await _service.createSubscription(
        CreateSubscriptionRequest(
          billingAccountId: state.billingAccount!.id,
          planSku: planSku,
          trialDays: trialDays ?? 30,
          metadata: metadata,
        ),
      );

      // Reload subscription data
      await loadSubscriptionData();

      return response;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to start subscription: $e',
      );
      return null;
    }
  }

  /// Cancel subscription at end of period.
  Future<bool> cancelSubscription({bool immediately = false}) async {
    if (state.subscription == null) return false;

    state = state.copyWith(isLoading: true, clearError: true);

    try {
      await _service.cancelSubscription(
        state.subscription!.id,
        cancelImmediately: immediately,
      );

      // Reload subscription data
      await loadSubscriptionData();

      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to cancel subscription: $e',
      );
      return false;
    }
  }

  /// Clear any error.
  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

/// Provider for subscription controller.
final subscriptionControllerProvider =
    StateNotifierProvider<SubscriptionController, SubscriptionState>((ref) {
  final authState = ref.watch(authControllerProvider);
  final accessTokenAsync = ref.watch(_accessTokenProvider);
  final accessToken = accessTokenAsync.valueOrNull;
  final service = ref.watch(subscriptionServiceProvider(accessToken));
  return SubscriptionController(service, authState.tenantId);
});

/// Provider for checking if a specific module is enabled.
final isModuleEnabledProvider = Provider.family<bool, String>((ref, moduleCode) {
  final state = ref.watch(subscriptionControllerProvider);
  return state.isModuleEnabled(moduleCode);
});

/// Provider for available plans.
final availablePlansProvider = Provider<List<Plan>>((ref) {
  final state = ref.watch(subscriptionControllerProvider);
  return state.availablePlans;
});

/// Provider for premium plan.
final premiumPlanProvider = Provider<Plan?>((ref) {
  final state = ref.watch(subscriptionControllerProvider);
  return state.premiumPlan;
});

/// Provider for basic plan.
final basicPlanProvider = Provider<Plan?>((ref) {
  final state = ref.watch(subscriptionControllerProvider);
  return state.basicPlan;
});
