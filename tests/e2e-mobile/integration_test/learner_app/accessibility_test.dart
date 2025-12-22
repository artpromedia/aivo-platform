/// Learner App - Accessibility E2E Test
///
/// Tests accessibility features and accommodations for learners with IEP/504.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_users.dart';

void main() {
  patrolTest(
    'Accessibility - text to speech',
    ($) async {
      final test = AccessibilityTest();
      await test.setUp($);

      try {
        await test.testTextToSpeech();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Accessibility - extended time',
    ($) async {
      final test = AccessibilityTest();
      await test.setUp($);

      try {
        await test.testExtendedTime();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Accessibility - visual settings',
    ($) async {
      final test = AccessibilityTest();
      await test.setUp($);

      try {
        await test.testVisualSettings();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class AccessibilityTest extends LearnerAppTest {
  @override
  String get testName => 'Accessibility';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test text-to-speech accommodation
  Future<void> testTextToSpeech() async {
    await step('Login as IEP learner with TTS');
    await actions.auth.loginWithAccessCode(TestUsers.learnerWithIep.accessCode!);
    await $('Home').waitUntilVisible();

    await step('Verify TTS enabled indicator');
    await $(#ttsEnabledIcon).waitUntilVisible();
    await captureScreenshot('tts_enabled');

    await step('Start session');
    await $('Reading').tap();
    await $.pumpAndSettle();
    await $(#startSessionButton).tap();
    await $.pumpAndSettle();

    await step('Verify TTS button on question');
    await $(#questionCard).waitUntilVisible();
    await $(#readAloudButton).waitUntilVisible();
    await captureScreenshot('tts_button_visible');

    await step('Tap read aloud');
    await $(#readAloudButton).tap();
    await $.pumpAndSettle();

    await step('Verify playing state');
    await $(#ttsPlayingIndicator).waitUntilVisible();
    await captureScreenshot('tts_playing');

    await step('Pause TTS');
    await $(#readAloudButton).tap();
    await $.pumpAndSettle();
    verifyNotExists($(#ttsPlayingIndicator), 'TTS playing indicator');

    await step('Read answer options');
    await $(#readAnswersButton).tap();
    await $.pumpAndSettle();
    await $(#ttsPlayingIndicator).waitUntilVisible();
    await captureScreenshot('reading_answers');

    await step('Adjust speech rate');
    await $(#ttsSettingsButton).tap();
    await $.pumpAndSettle();
    await $(#speechRateSlider).scrollBy(dx: -30);
    await $.pumpAndSettle();
    await captureScreenshot('tts_settings');
  }

  /// Test extended time accommodation
  Future<void> testExtendedTime() async {
    await step('Login as IEP learner');
    await actions.auth.loginWithAccessCode(TestUsers.learnerWithIep.accessCode!);
    await $('Home').waitUntilVisible();

    await step('Start session');
    await $('Mathematics').tap();
    await $.pumpAndSettle();
    await $(#startSessionButton).tap();
    await $.pumpAndSettle();

    await step('Verify extended time indicator');
    await $(#extendedTimeIcon).waitUntilVisible();
    await captureScreenshot('extended_time_active');

    await step('Check timer shows extended time');
    // Extended time: 1.5x normal, so 30 min becomes 45 min
    await $('45:00').waitUntilVisible();
    await captureScreenshot('extended_timer');

    await step('Verify no time pressure warnings');
    // Simulate time passing
    await $.pump(const Duration(seconds: 30));
    verifyNotExists($(#timePressureWarning), 'Time pressure warning');

    await step('Request more time');
    await $(#moreTimeButton).tap();
    await $.pumpAndSettle();

    await step('Verify time added');
    await $('Time added').waitUntilVisible();
    await captureScreenshot('time_added');
  }

  /// Test visual accessibility settings
  Future<void> testVisualSettings() async {
    await step('Login as 504 learner');
    await actions.auth.loginWithAccessCode(TestUsers.learnerWith504.accessCode!);
    await $('Home').waitUntilVisible();

    await step('Go to settings');
    await $(#settingsTab).tap();
    await $.pumpAndSettle();

    await step('Open accessibility settings');
    await $('Accessibility').tap();
    await $.pumpAndSettle();
    await captureScreenshot('accessibility_settings');

    await step('Increase font size');
    await $(#fontSizeSlider).scrollBy(dx: 50);
    await $.pumpAndSettle();
    await captureScreenshot('larger_font');

    await step('Enable high contrast');
    await $(#highContrastToggle).tap();
    await $.pumpAndSettle();
    await captureScreenshot('high_contrast');

    await step('Enable reduce motion');
    await $(#reduceMotionToggle).tap();
    await $.pumpAndSettle();

    await step('Enable dyslexia font');
    await $(#dyslexiaFontToggle).tap();
    await $.pumpAndSettle();
    await captureScreenshot('dyslexia_font');

    await step('Go to session to verify');
    await actions.nav.goHome();
    await $('Mathematics').tap();
    await $.pumpAndSettle();
    await $(#startSessionButton).tap();
    await $.pumpAndSettle();

    await step('Verify settings applied');
    await captureScreenshot('settings_applied_in_session');
  }
}
