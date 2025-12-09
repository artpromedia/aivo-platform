import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:mobile_parent/screens/module_selection_screen.dart';
import 'package:mobile_parent/screens/payment_setup_screen.dart';
import 'package:mobile_parent/screens/subscription_management_screen.dart';
import 'package:mobile_parent/subscription/subscription_controller.dart';
import 'package:mobile_parent/subscription/subscription_models.dart';
import 'package:mobile_parent/subscription/subscription_service.dart';

// ══════════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/// Mock subscription service for testing.
class MockSubscriptionService extends SubscriptionService {
  MockSubscriptionService() : super();

  bool hasPaymentMethod = false;
  Subscription? mockSubscription;
  List<Entitlement> mockEntitlements = [];
  bool shouldFailPayment = false;
  bool shouldFailSubscription = false;

  @override
  Future<BillingAccount> getBillingAccount(String tenantId) async {
    return BillingAccount(
      id: 'ba_test_$tenantId',
      tenantId: tenantId,
      displayName: 'Test Family Account',
      hasPaymentMethod: hasPaymentMethod,
    );
  }

  @override
  Future<PaymentInstrument?> getDefaultPaymentMethod(String billingAccountId) async {
    if (!hasPaymentMethod) return null;
    return const PaymentInstrument(
      id: 'pi_test_123',
      brand: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2027,
      isDefault: true,
    );
  }

  @override
  Future<Subscription?> getSubscription(String billingAccountId) async {
    return mockSubscription;
  }

  @override
  Future<List<Plan>> getAvailablePlans() async {
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
    ];
  }

  @override
  Future<List<Entitlement>> getEntitlements(String tenantId) async {
    return mockEntitlements.isEmpty
        ? [
            Entitlement(id: 'ent_ela', tenantId: tenantId, moduleCode: 'ELA', isEnabled: true),
            Entitlement(id: 'ent_math', tenantId: tenantId, moduleCode: 'MATH', isEnabled: true),
          ]
        : mockEntitlements;
  }

  @override
  Future<PaymentInstrument> attachPaymentMethod(
    String billingAccountId,
    String paymentMethodId, {
    bool setAsDefault = true,
  }) async {
    if (shouldFailPayment) {
      throw Exception('Payment method attachment failed');
    }
    hasPaymentMethod = true;
    return const PaymentInstrument(
      id: 'pi_test_new',
      brand: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2027,
      isDefault: true,
    );
  }

  @override
  Future<String> ensureStripeCustomer(String billingAccountId) async {
    return 'cus_test_123';
  }

  @override
  Future<CreateSubscriptionResponse> createSubscription(
    CreateSubscriptionRequest request,
  ) async {
    if (shouldFailSubscription) {
      throw Exception('Subscription creation failed');
    }
    final now = DateTime.now();
    final trialEnd = now.add(Duration(days: request.trialDays ?? 30));
    
    mockSubscription = Subscription(
      id: 'sub_test_${now.millisecondsSinceEpoch}',
      billingAccountId: request.billingAccountId,
      planId: 'plan_premium',
      status: SubscriptionStatus.inTrial,
      quantity: 1,
      trialStartAt: now,
      trialEndAt: trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
    );
    
    return CreateSubscriptionResponse(
      subscriptionId: mockSubscription!.id,
      providerSubscriptionId: 'sub_stripe_test',
      status: SubscriptionStatus.inTrial,
      trialStartAt: now,
      trialEndAt: trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
    );
  }

  @override
  Future<void> cancelSubscription(
    String subscriptionId, {
    bool cancelImmediately = false,
  }) async {
    if (mockSubscription != null) {
      mockSubscription = mockSubscription!.copyWith(
        cancelAtPeriodEnd: !cancelImmediately,
        status: cancelImmediately ? SubscriptionStatus.canceled : mockSubscription!.status,
      );
    }
  }
}

/// Creates a testable widget with providers.
Widget createTestWidget({
  required Widget child,
  MockSubscriptionService? mockService,
  String tenantId = 'tenant_test_123',
}) {
  final service = mockService ?? MockSubscriptionService();
  
  return ProviderScope(
    overrides: [
      subscriptionServiceProvider.overrideWith(
        (ref, accessToken) => service,
      ),
    ],
    child: MaterialApp(
      home: child,
    ),
  );
}

/// Creates a test widget with router for navigation tests.
Widget createTestWidgetWithRouter({
  required String initialRoute,
  MockSubscriptionService? mockService,
  String tenantId = 'tenant_test_123',
}) {
  final service = mockService ?? MockSubscriptionService();
  
  final router = GoRouter(
    initialLocation: initialRoute,
    routes: [
      GoRoute(
        path: '/module-selection',
        builder: (context, state) => const ModuleSelectionScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ),
      GoRoute(
        path: '/payment-setup',
        builder: (context, state) => const PaymentSetupScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ),
      GoRoute(
        path: '/subscription',
        builder: (context, state) => const SubscriptionManagementScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const Scaffold(
          body: Center(child: Text('Dashboard')),
        ),
      ),
    ],
  );

  return ProviderScope(
    overrides: [
      subscriptionServiceProvider.overrideWith(
        (ref, accessToken) => service,
      ),
    ],
    child: MaterialApp.router(
      routerConfig: router,
    ),
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE SELECTION SCREEN TESTS
// ══════════════════════════════════════════════════════════════════════════════

void main() {
  group('ModuleSelectionScreen', () {
    testWidgets('displays basic plan as always included', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const ModuleSelectionScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ));
      await tester.pumpAndSettle();

      // Basic plan should be visible and marked as included
      expect(find.text('Basic Plan'), findsOneWidget);
      expect(find.text('INCLUDED'), findsOneWidget);
      expect(find.text('ELA'), findsOneWidget);
      expect(find.text('Math'), findsOneWidget);
    });

    testWidgets('displays all premium modules with toggles', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const ModuleSelectionScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ));
      await tester.pumpAndSettle();

      // All premium modules should be visible
      for (final module in PremiumModule.values) {
        expect(find.text(module.displayName), findsOneWidget);
      }
    });

    testWidgets('shows trial note when no payment method', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const ModuleSelectionScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ));
      await tester.pumpAndSettle();

      expect(
        find.textContaining('30-day trial'),
        findsWidgets,
      );
    });

    testWidgets('can select premium modules', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const ModuleSelectionScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ));
      await tester.pumpAndSettle();

      // Find and tap a premium module card
      final selCard = find.text('Social-Emotional Learning');
      expect(selCard, findsOneWidget);
      await tester.tap(selCard);
      await tester.pumpAndSettle();

      // Should show price summary after selection
      expect(find.text('Summary'), findsOneWidget);
    });

    testWidgets('select all toggle selects all premium modules', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const ModuleSelectionScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ));
      await tester.pumpAndSettle();

      // Find and tap select all
      final selectAll = find.text('Select all premium modules');
      expect(selectAll, findsOneWidget);
      await tester.tap(selectAll);
      await tester.pumpAndSettle();

      // Should show summary with price
      expect(find.text('Summary'), findsOneWidget);
      expect(find.textContaining('\$14.99'), findsWidgets);
    });

    testWidgets('shows Continue with Basic when no premium selected', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const ModuleSelectionScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Continue with Basic'), findsOneWidget);
    });

    testWidgets('shows Continue to Payment when premium selected', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const ModuleSelectionScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ));
      await tester.pumpAndSettle();

      // Select a premium module
      await tester.tap(find.text('Social-Emotional Learning'));
      await tester.pumpAndSettle();

      expect(find.text('Continue to Payment'), findsOneWidget);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // PAYMENT SETUP SCREEN TESTS
  // ══════════════════════════════════════════════════════════════════════════════

  group('PaymentSetupScreen', () {
    testWidgets('displays trial information', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const PaymentSetupScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Start Your Free Trial'), findsOneWidget);
      expect(find.textContaining('30-day'), findsWidgets);
    });

    testWidgets('displays card input form', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const PaymentSetupScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Card Number'), findsOneWidget);
      expect(find.text('Expiry'), findsOneWidget);
      expect(find.text('CVC'), findsOneWidget);
      expect(find.text('Cardholder Name'), findsOneWidget);
    });

    testWidgets('displays security note', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const PaymentSetupScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.textContaining('encrypted'), findsOneWidget);
      expect(find.textContaining('Stripe'), findsOneWidget);
    });

    testWidgets('shows Start Trial button', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const PaymentSetupScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Start 30-Day Free Trial'), findsOneWidget);
    });

    testWidgets('validates card number input', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const PaymentSetupScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ));
      await tester.pumpAndSettle();

      // Tap submit without entering data
      await tester.tap(find.text('Start 30-Day Free Trial'));
      await tester.pumpAndSettle();

      // Should show validation error
      expect(find.text('Please enter a valid card number'), findsOneWidget);
    });

    testWidgets('formats card number with spaces', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const PaymentSetupScreen(
          learnerId: 'learner_test',
          learnerName: 'Test Child',
        ),
      ));
      await tester.pumpAndSettle();

      // Find card number field and enter digits
      final cardField = find.widgetWithText(TextFormField, 'Card Number');
      await tester.enterText(cardField, '4242424242424242');
      await tester.pumpAndSettle();

      // Should be formatted with spaces
      expect(find.text('4242 4242 4242 4242'), findsOneWidget);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION MANAGEMENT SCREEN TESTS
  // ══════════════════════════════════════════════════════════════════════════════

  group('SubscriptionManagementScreen', () {
    testWidgets('displays current plan info', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const SubscriptionManagementScreen(),
      ));
      await tester.pumpAndSettle();

      // Should show plan info
      expect(find.textContaining('Plan'), findsWidgets);
    });

    testWidgets('displays basic modules as always included', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const SubscriptionManagementScreen(),
      ));
      await tester.pumpAndSettle();

      expect(find.text('ELA (English Language Arts)'), findsOneWidget);
      expect(find.text('Math'), findsOneWidget);
      expect(find.text('INCLUDED'), findsNWidgets(2));
    });

    testWidgets('displays premium modules section', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const SubscriptionManagementScreen(),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Premium Modules'), findsOneWidget);
      
      for (final module in PremiumModule.values) {
        expect(find.text(module.displayName), findsOneWidget);
      }
    });

    testWidgets('shows upgrade prompt when no active subscription', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const SubscriptionManagementScreen(),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Upgrade to Premium'), findsOneWidget);
      expect(find.text('Start Free Trial'), findsOneWidget);
    });

    testWidgets('shows subscription status when active', (tester) async {
      final mockService = MockSubscriptionService();
      final now = DateTime.now();
      mockService.mockSubscription = Subscription(
        id: 'sub_test',
        billingAccountId: 'ba_test',
        planId: 'plan_premium',
        status: SubscriptionStatus.inTrial,
        quantity: 1,
        trialStartAt: now,
        trialEndAt: now.add(const Duration(days: 25)),
        currentPeriodStart: now,
        currentPeriodEnd: now.add(const Duration(days: 25)),
      );

      await tester.pumpWidget(createTestWidget(
        child: const SubscriptionManagementScreen(),
        mockService: mockService,
      ));
      await tester.pumpAndSettle();

      expect(find.text('Trial Period'), findsOneWidget);
      expect(find.textContaining('days remaining'), findsOneWidget);
    });

    testWidgets('shows cancel option for active subscription', (tester) async {
      final mockService = MockSubscriptionService();
      final now = DateTime.now();
      mockService.mockSubscription = Subscription(
        id: 'sub_test',
        billingAccountId: 'ba_test',
        planId: 'plan_premium',
        status: SubscriptionStatus.inTrial,
        quantity: 1,
        trialStartAt: now,
        trialEndAt: now.add(const Duration(days: 25)),
        currentPeriodStart: now,
        currentPeriodEnd: now.add(const Duration(days: 25)),
      );

      await tester.pumpWidget(createTestWidget(
        child: const SubscriptionManagementScreen(),
        mockService: mockService,
      ));
      await tester.pumpAndSettle();

      expect(find.text('Cancel Trial'), findsOneWidget);
    });

    testWidgets('cancel button shows confirmation dialog', (tester) async {
      final mockService = MockSubscriptionService();
      final now = DateTime.now();
      mockService.mockSubscription = Subscription(
        id: 'sub_test',
        billingAccountId: 'ba_test',
        planId: 'plan_premium',
        status: SubscriptionStatus.inTrial,
        quantity: 1,
        trialStartAt: now,
        trialEndAt: now.add(const Duration(days: 25)),
        currentPeriodStart: now,
        currentPeriodEnd: now.add(const Duration(days: 25)),
      );

      await tester.pumpWidget(createTestWidget(
        child: const SubscriptionManagementScreen(),
        mockService: mockService,
      ));
      await tester.pumpAndSettle();

      // Tap cancel button
      await tester.tap(find.text('Cancel Trial'));
      await tester.pumpAndSettle();

      // Should show confirmation dialog
      expect(find.text('Cancel Trial?'), findsOneWidget);
      expect(find.text('Keep Premium'), findsOneWidget);
    });

    testWidgets('shows payment method when present', (tester) async {
      final mockService = MockSubscriptionService();
      mockService.hasPaymentMethod = true;

      await tester.pumpWidget(createTestWidget(
        child: const SubscriptionManagementScreen(),
        mockService: mockService,
      ));
      await tester.pumpAndSettle();

      expect(find.text('Payment Method'), findsOneWidget);
      expect(find.textContaining('4242'), findsOneWidget);
      expect(find.text('Update'), findsOneWidget);
    });

    testWidgets('shows add payment method when none present', (tester) async {
      await tester.pumpWidget(createTestWidget(
        child: const SubscriptionManagementScreen(),
      ));
      await tester.pumpAndSettle();

      expect(find.text('No payment method on file'), findsOneWidget);
      expect(find.text('Add Payment Method'), findsOneWidget);
    });

    testWidgets('shows cancellation pending message', (tester) async {
      final mockService = MockSubscriptionService();
      final now = DateTime.now();
      mockService.mockSubscription = Subscription(
        id: 'sub_test',
        billingAccountId: 'ba_test',
        planId: 'plan_premium',
        status: SubscriptionStatus.active,
        quantity: 1,
        currentPeriodStart: now,
        currentPeriodEnd: now.add(const Duration(days: 15)),
        cancelAtPeriodEnd: true,
      );

      await tester.pumpWidget(createTestWidget(
        child: const SubscriptionManagementScreen(),
        mockService: mockService,
      ));
      await tester.pumpAndSettle();

      expect(find.text('Cancellation Pending'), findsOneWidget);
    });

    testWidgets('module toggle shows confirmation for disabling', (tester) async {
      final mockService = MockSubscriptionService();
      final now = DateTime.now();
      mockService.mockSubscription = Subscription(
        id: 'sub_test',
        billingAccountId: 'ba_test',
        planId: 'plan_premium',
        status: SubscriptionStatus.active,
        quantity: 1,
        currentPeriodStart: now,
        currentPeriodEnd: now.add(const Duration(days: 30)),
      );
      mockService.mockEntitlements = [
        Entitlement(id: 'ent_ela', tenantId: 'test', moduleCode: 'ELA', isEnabled: true),
        Entitlement(id: 'ent_math', tenantId: 'test', moduleCode: 'MATH', isEnabled: true),
        Entitlement(id: 'ent_sel', tenantId: 'test', moduleCode: 'SEL', isEnabled: true),
      ];

      await tester.pumpWidget(createTestWidget(
        child: const SubscriptionManagementScreen(),
        mockService: mockService,
      ));
      await tester.pumpAndSettle();

      // Find SEL module toggle and tap it
      final switches = find.byType(Switch);
      // First switches are for SEL module (after ELA and Math which show INCLUDED)
      await tester.tap(switches.first);
      await tester.pumpAndSettle();

      // Should show confirmation dialog
      expect(find.textContaining('Disable'), findsWidgets);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION MODELS TESTS
  // ══════════════════════════════════════════════════════════════════════════════

  group('SubscriptionModels', () {
    test('Subscription.isActive returns true for active status', () {
      final subscription = Subscription(
        id: 'sub_test',
        billingAccountId: 'ba_test',
        planId: 'plan_test',
        status: SubscriptionStatus.active,
        quantity: 1,
        currentPeriodStart: DateTime.now(),
        currentPeriodEnd: DateTime.now().add(const Duration(days: 30)),
      );

      expect(subscription.isActive, isTrue);
    });

    test('Subscription.isActive returns true for inTrial status', () {
      final now = DateTime.now();
      final subscription = Subscription(
        id: 'sub_test',
        billingAccountId: 'ba_test',
        planId: 'plan_test',
        status: SubscriptionStatus.inTrial,
        quantity: 1,
        trialStartAt: now,
        trialEndAt: now.add(const Duration(days: 30)),
        currentPeriodStart: now,
        currentPeriodEnd: now.add(const Duration(days: 30)),
      );

      expect(subscription.isActive, isTrue);
    });

    test('Subscription.daysLeftInTrial calculates correctly', () {
      final now = DateTime.now();
      final subscription = Subscription(
        id: 'sub_test',
        billingAccountId: 'ba_test',
        planId: 'plan_test',
        status: SubscriptionStatus.inTrial,
        quantity: 1,
        trialStartAt: now,
        trialEndAt: now.add(const Duration(days: 15)),
        currentPeriodStart: now,
        currentPeriodEnd: now.add(const Duration(days: 15)),
      );

      expect(subscription.daysLeftInTrial, equals(15));
    });

    test('Entitlement.isValid checks expiration', () {
      final validEntitlement = Entitlement(
        id: 'ent_test',
        tenantId: 'tenant_test',
        moduleCode: 'ELA',
        isEnabled: true,
        expiresAt: DateTime.now().add(const Duration(days: 30)),
      );

      final expiredEntitlement = Entitlement(
        id: 'ent_test2',
        tenantId: 'tenant_test',
        moduleCode: 'MATH',
        isEnabled: true,
        expiresAt: DateTime.now().subtract(const Duration(days: 1)),
      );

      expect(validEntitlement.isValid, isTrue);
      expect(expiredEntitlement.isValid, isFalse);
    });

    test('Plan.priceDisplay formats correctly', () {
      const plan = Plan(
        id: 'plan_test',
        sku: 'PARENT_PREMIUM_MONTHLY',
        name: 'Premium',
        unitPriceCents: 1499,
        billingPeriod: 'MONTHLY',
      );

      expect(plan.priceDisplay, equals('\$14.99/month'));
    });

    test('PremiumModule.fromCode returns correct module', () {
      expect(PremiumModule.fromCode('SEL'), equals(PremiumModule.sel));
      expect(PremiumModule.fromCode('SPEECH'), equals(PremiumModule.speech));
      expect(PremiumModule.fromCode('INVALID'), isNull);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION STATE TESTS
  // ══════════════════════════════════════════════════════════════════════════════

  group('SubscriptionState', () {
    test('basicEnabled is true when subscription is active', () {
      final now = DateTime.now();
      final state = SubscriptionState(
        subscription: Subscription(
          id: 'sub_test',
          billingAccountId: 'ba_test',
          planId: 'plan_test',
          status: SubscriptionStatus.active,
          quantity: 1,
          currentPeriodStart: now,
          currentPeriodEnd: now.add(const Duration(days: 30)),
        ),
      );

      expect(state.basicEnabled, isTrue);
    });

    test('isPastDue returns true for pastDue status', () {
      final now = DateTime.now();
      final state = SubscriptionState(
        subscription: Subscription(
          id: 'sub_test',
          billingAccountId: 'ba_test',
          planId: 'plan_test',
          status: SubscriptionStatus.pastDue,
          quantity: 1,
          currentPeriodStart: now,
          currentPeriodEnd: now.add(const Duration(days: 30)),
        ),
      );

      expect(state.isPastDue, isTrue);
    });

    test('willCancelAtPeriodEnd returns subscription cancelAtPeriodEnd', () {
      final now = DateTime.now();
      final state = SubscriptionState(
        subscription: Subscription(
          id: 'sub_test',
          billingAccountId: 'ba_test',
          planId: 'plan_test',
          status: SubscriptionStatus.active,
          quantity: 1,
          currentPeriodStart: now,
          currentPeriodEnd: now.add(const Duration(days: 30)),
          cancelAtPeriodEnd: true,
        ),
      );

      expect(state.willCancelAtPeriodEnd, isTrue);
    });

    test('isModuleEnabled checks entitlements', () {
      final state = SubscriptionState(
        entitlements: [
          const Entitlement(id: 'ent1', tenantId: 'test', moduleCode: 'ELA', isEnabled: true),
          const Entitlement(id: 'ent2', tenantId: 'test', moduleCode: 'SEL', isEnabled: true),
        ],
      );

      expect(state.isModuleEnabled('ELA'), isTrue);
      expect(state.isModuleEnabled('SEL'), isTrue);
      expect(state.isModuleEnabled('CODING'), isFalse);
    });
  });
}
