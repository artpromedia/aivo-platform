/// Parent App - Billing E2E Test
///
/// Tests subscription management, payment methods, and billing history.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_users.dart';
import '../fixtures/api_mocks.dart';

void main() {
  patrolTest(
    'Billing - view subscription status',
    ($) async {
      final test = BillingTest();
      await test.setUp($);

      try {
        await test.testViewSubscriptionStatus();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Billing - upgrade subscription',
    ($) async {
      final test = BillingTest();
      await test.setUp($);

      try {
        await test.testUpgradeSubscription();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Billing - update payment method',
    ($) async {
      final test = BillingTest();
      await test.setUp($);

      try {
        await test.testUpdatePaymentMethod();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Billing - handle payment failure',
    ($) async {
      final test = BillingTest();
      await test.setUp($);

      try {
        await test.testPaymentFailure();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class BillingTest extends ParentAppTest {
  @override
  String get testName => 'Billing';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test viewing subscription status
  Future<void> testViewSubscriptionStatus() async {
    await step('Login as subscribed parent');
    await actions.auth.login(TestUsers.existingParentPro);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to subscription');
    await actions.nav.goToProfile();
    await $(#subscriptionButton).tap();
    await $.pumpAndSettle();

    await step('Verify subscription details');
    await $('Subscription').waitUntilVisible();
    await $('Pro Plan').waitUntilVisible();
    await captureScreenshot('subscription_status');

    await step('Check billing cycle');
    await $('Next billing date').waitUntilVisible();

    await step('View plan features');
    await $('Your Features').waitUntilVisible();
    await $('AI Tutor').waitUntilVisible();
    await $('Priority Support').waitUntilVisible();

    await step('View billing history');
    await $(#billingHistoryButton).tap();
    await $.pumpAndSettle();

    await step('Verify history items');
    await $(#invoiceList).waitUntilVisible();
    await captureScreenshot('billing_history');
  }

  /// Test upgrading subscription
  Future<void> testUpgradeSubscription() async {
    await step('Login as free user');
    await actions.auth.login(TestUsers.existingParentFree);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to subscription');
    await actions.nav.goToProfile();
    await $(#subscriptionButton).tap();
    await $.pumpAndSettle();

    await step('View upgrade options');
    await $('Upgrade').tap();
    await $.pumpAndSettle();

    await step('Select Pro plan');
    await $(#proPlanCard).waitUntilVisible();
    await captureScreenshot('plan_selection');
    await $(#proPlanCard).tap();
    await $.pumpAndSettle();

    await step('Choose billing cycle');
    await $('Choose Plan').waitUntilVisible();
    await $(#yearlyOption).tap();
    await $.pumpAndSettle();
    await captureScreenshot('billing_cycle');

    await step('Enter payment details');
    await $(#continueToPaymentButton).tap();
    await $.pumpAndSettle();

    await $(#cardNumberField).enterText(MockPaymentProvider.validCard);
    await $(#expiryField).enterText('12/28');
    await $(#cvvField).enterText('123');
    await $(#zipField).enterText('12345');
    await captureScreenshot('payment_form');

    await step('Complete purchase');
    await $(#purchaseButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 3));

    await step('Verify upgrade success');
    await $('Welcome to Pro!').waitUntilVisible();
    await captureScreenshot('upgrade_success');
  }

  /// Test updating payment method
  Future<void> testUpdatePaymentMethod() async {
    await step('Login as subscribed parent');
    await actions.auth.login(TestUsers.existingParentPro);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to payment methods');
    await actions.nav.goToProfile();
    await $(#subscriptionButton).tap();
    await $.pumpAndSettle();
    await $(#paymentMethodsButton).tap();
    await $.pumpAndSettle();

    await step('View current payment method');
    await $('Payment Methods').waitUntilVisible();
    await $(#paymentMethodCard).waitUntilVisible();
    await captureScreenshot('current_payment');

    await step('Add new payment method');
    await $(#addPaymentButton).tap();
    await $.pumpAndSettle();

    await step('Enter new card details');
    await $(#cardNumberField).enterText('4111111111111111');
    await $(#expiryField).enterText('06/29');
    await $(#cvvField).enterText('456');
    await $(#zipField).enterText('54321');
    await captureScreenshot('new_card_form');

    await step('Save new card');
    await $(#saveCardButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Set as default');
    await $(#newPaymentMethodCard).tap();
    await $.pumpAndSettle();
    await $('Set as Default').tap();
    await $.pumpAndSettle();

    await step('Verify update');
    await $('Payment method updated').waitUntilVisible();
    await captureScreenshot('payment_updated');
  }

  /// Test handling payment failure
  Future<void> testPaymentFailure() async {
    await step('Login as user with payment issue');
    await actions.auth.login(TestUsers.parentPaymentIssue);
    await $('Dashboard').waitUntilVisible();

    await step('Check for payment banner');
    await $(#paymentIssueBanner).waitUntilVisible();
    await captureScreenshot('payment_issue_banner');

    await step('Tap to resolve');
    await $(#paymentIssueBanner).tap();
    await $.pumpAndSettle();

    await step('View issue details');
    await $('Payment Issue').waitUntilVisible();
    await $('Your payment method was declined').waitUntilVisible();
    await captureScreenshot('payment_issue_details');

    await step('Update card with declined card');
    await $(#updatePaymentButton).tap();
    await $.pumpAndSettle();

    await $(#cardNumberField).enterText(MockPaymentProvider.declinedCard);
    await $(#expiryField).enterText('12/28');
    await $(#cvvField).enterText('123');
    await $(#saveButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify decline error');
    await $('Card declined').waitUntilVisible();
    await captureScreenshot('card_declined');

    await step('Try valid card');
    await $(#cardNumberField).enterText('');
    await $(#cardNumberField).enterText(MockPaymentProvider.validCard);
    await $(#saveButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify success');
    await $('Payment successful').waitUntilVisible();
    await captureScreenshot('payment_resolved');
  }
}
