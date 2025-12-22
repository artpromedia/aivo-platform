/// Learner App - Achievements E2E Test
///
/// Tests achievement system, badges, and progress rewards.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_users.dart';
import '../fixtures/api_mocks.dart';

void main() {
  patrolTest(
    'Achievements - view achievements',
    ($) async {
      final test = AchievementsTest();
      await test.setUp($);

      try {
        await test.testViewAchievements();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Achievements - earn achievement',
    ($) async {
      final test = AchievementsTest();
      await test.setUp($);

      try {
        await test.testEarnAchievement();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Achievements - view streaks',
    ($) async {
      final test = AchievementsTest();
      await test.setUp($);

      try {
        await test.testViewStreaks();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class AchievementsTest extends LearnerAppTest {
  @override
  String get testName => 'Achievements';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test viewing achievements screen
  Future<void> testViewAchievements() async {
    await step('Login as high achiever');
    await actions.auth.loginWithAccessCode(TestUsers.learnerHighAchiever.accessCode!);
    await $('Home').waitUntilVisible();

    await step('Navigate to achievements');
    await $(#achievementsTab).tap();
    await $.pumpAndSettle();

    await step('Verify achievements screen');
    await $('Achievements').waitUntilVisible();
    await $(#achievementsList).waitUntilVisible();
    await captureScreenshot('achievements_list');

    await step('Check earned badges');
    await $(#earnedBadge).waitUntilVisible();

    await step('View badge details');
    await $(#earnedBadge).first.tap();
    await $.pumpAndSettle();

    await step('Verify badge details');
    await $(#badgeDetailModal).waitUntilVisible();
    await $('Earned on').waitUntilVisible();
    await captureScreenshot('badge_details');

    await step('Close modal');
    await actions.dialog.dismiss();

    await step('View locked achievements');
    await $(#lockedTab).tap();
    await $.pumpAndSettle();
    await $(#lockedBadge).waitUntilVisible();
    await captureScreenshot('locked_achievements');

    await step('Check progress on locked');
    await $(#lockedBadge).first.tap();
    await $.pumpAndSettle();
    await $('Progress').waitUntilVisible();
    await captureScreenshot('locked_progress');
  }

  /// Test earning an achievement
  Future<void> testEarnAchievement() async {
    await step('Login as near-achievement learner');
    await actions.auth.loginWithAccessCode(TestUsers.learnerNearAchievement.accessCode!);
    await $('Home').waitUntilVisible();

    await step('Start session to complete achievement');
    await $('Mathematics').tap();
    await $.pumpAndSettle();
    await $(#startSessionButton).tap();
    await $.pumpAndSettle();

    await step('Complete session with high score');
    for (int i = 0; i < 10; i++) {
      // Answer all correctly for perfect score
      await $(#correctAnswer).tap();
      await $.pumpAndSettle();
    }
    await $(#finishButton).tap();
    await $.pumpAndSettle();

    await step('Verify achievement unlocked');
    await $('Achievement Unlocked!').waitUntilVisible();
    await $(#newBadgeAnimation).waitUntilVisible();
    await captureScreenshot('achievement_unlocked');

    await step('View new badge');
    await $(#viewBadgeButton).tap();
    await $.pumpAndSettle();

    await step('Verify badge earned');
    await $('Perfect Score').waitUntilVisible();
    await captureScreenshot('new_badge_earned');

    await step('Share achievement');
    await $(#shareButton).tap();
    await $.pumpAndSettle();
    await $('Share Achievement').waitUntilVisible();
    await captureScreenshot('share_achievement');
  }

  /// Test viewing streaks
  Future<void> testViewStreaks() async {
    await step('Login as learner');
    await actions.auth.loginWithAccessCode(TestUsers.learner.accessCode!);
    await $('Home').waitUntilVisible();

    await step('Check streak on home');
    await $(#streakCounter).waitUntilVisible();
    await captureScreenshot('streak_on_home');

    await step('Go to achievements');
    await $(#achievementsTab).tap();
    await $.pumpAndSettle();

    await step('View streaks section');
    await $(#streaksSection).tap();
    await $.pumpAndSettle();

    await step('Verify streak details');
    await $('Current Streak').waitUntilVisible();
    await $('Best Streak').waitUntilVisible();
    await $(#streakCalendar).waitUntilVisible();
    await captureScreenshot('streak_details');

    await step('Check streak milestones');
    await $(#milestonesTab).tap();
    await $.pumpAndSettle();
    await $('7 Day Streak').waitUntilVisible();
    await $('30 Day Streak').waitUntilVisible();
    await captureScreenshot('streak_milestones');
  }
}
