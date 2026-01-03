import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Dashboard Page Object
 *
 * Main learner dashboard interactions:
 * - Today's plan view
 * - Progress display
 * - Quick actions
 * - Navigation to lessons/courses
 * - Gamification elements
 * - User profile access
 */

export class DashboardPage extends BasePage {
  protected readonly path = '/dashboard';

  constructor(page: Page) {
    super(page);
  }

  // ============================================================================
  // LOCATORS - HEADER
  // ============================================================================

  get userGreeting(): Locator {
    return this.page.getByTestId('user-greeting');
  }

  get userAvatar(): Locator {
    return this.page.getByTestId('user-avatar');
  }

  get profileButton(): Locator {
    return this.page.getByRole('button', { name: /profile|account/i });
  }

  get notificationBell(): Locator {
    return this.page.getByRole('button', { name: /notifications/i });
  }

  get notificationBadge(): Locator {
    return this.page.getByTestId('notification-badge');
  }

  get settingsButton(): Locator {
    return this.page.getByRole('button', { name: /settings/i });
  }

  get logoutButton(): Locator {
    return this.page.getByRole('button', { name: /logout|sign out/i });
  }

  // ============================================================================
  // LOCATORS - PROGRESS
  // ============================================================================

  get xpDisplay(): Locator {
    return this.page.getByTestId('xp-display');
  }

  get levelDisplay(): Locator {
    return this.page.getByTestId('level-display');
  }

  get streakDisplay(): Locator {
    return this.page.getByTestId('streak-display');
  }

  get progressRing(): Locator {
    return this.page.getByTestId('progress-ring');
  }

  get dailyGoalProgress(): Locator {
    return this.page.getByTestId('daily-goal-progress');
  }

  get weeklyProgress(): Locator {
    return this.page.getByTestId('weekly-progress');
  }

  // ============================================================================
  // LOCATORS - TODAY'S PLAN
  // ============================================================================

  get todaysPlan(): Locator {
    return this.page.getByTestId('todays-plan');
  }

  get todaysLessons(): Locator {
    return this.page.getByTestId('todays-lesson');
  }

  get continueButton(): Locator {
    return this.page.getByRole('button', { name: /continue|resume/i });
  }

  get startLearningButton(): Locator {
    return this.page.getByRole('button', { name: /start learning|begin/i });
  }

  get viewAllButton(): Locator {
    return this.page.getByRole('link', { name: /view all|see more/i });
  }

  // ============================================================================
  // LOCATORS - QUICK ACTIONS
  // ============================================================================

  get browseLessonsButton(): Locator {
    return this.page.getByRole('link', { name: /browse lessons|explore/i });
  }

  get myCoursesButton(): Locator {
    return this.page.getByRole('link', { name: /my courses/i });
  }

  get achievementsButton(): Locator {
    return this.page.getByRole('link', { name: /achievements|badges/i });
  }

  get leaderboardButton(): Locator {
    return this.page.getByRole('link', { name: /leaderboard/i });
  }

  // ============================================================================
  // LOCATORS - RECOMMENDED
  // ============================================================================

  get recommendedSection(): Locator {
    return this.page.getByTestId('recommended-section');
  }

  get recommendedLessons(): Locator {
    return this.page.getByTestId('recommended-lesson');
  }

  // ============================================================================
  // LOCATORS - RECENT ACTIVITY
  // ============================================================================

  get recentActivitySection(): Locator {
    return this.page.getByTestId('recent-activity');
  }

  get activityItems(): Locator {
    return this.page.getByTestId('activity-item');
  }

  // ============================================================================
  // LOCATORS - ANNOUNCEMENTS
  // ============================================================================

  get announcementBanner(): Locator {
    return this.page.getByTestId('announcement-banner');
  }

  get dismissAnnouncementButton(): Locator {
    return this.announcementBanner.getByRole('button', { name: /dismiss|close/i });
  }

  // ============================================================================
  // ACTIONS - NAVIGATION
  // ============================================================================

  /**
   * Navigate to profile
   */
  async navigateToProfile(): Promise<void> {
    await this.profileButton.click();
    await this.waitForUrl(/\/profile/);
  }

  /**
   * Navigate to settings
   */
  async navigateToSettings(): Promise<void> {
    await this.settingsButton.click();
    await this.waitForUrl(/\/settings/);
  }

  /**
   * Navigate to browse lessons
   */
  async navigateToBrowseLessons(): Promise<void> {
    await this.browseLessonsButton.click();
    await this.waitForUrl(/\/lessons/);
  }

  /**
   * Navigate to my courses
   */
  async navigateToMyCourses(): Promise<void> {
    await this.myCoursesButton.click();
    await this.waitForUrl(/\/courses/);
  }

  /**
   * Navigate to achievements
   */
  async navigateToAchievements(): Promise<void> {
    await this.achievementsButton.click();
    await this.waitForUrl(/\/achievements/);
  }

  /**
   * Navigate to leaderboard
   */
  async navigateToLeaderboard(): Promise<void> {
    await this.leaderboardButton.click();
    await this.waitForUrl(/\/leaderboard/);
  }

  /**
   * Open notifications panel
   */
  async openNotifications(): Promise<void> {
    await this.notificationBell.click();
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    // Open profile menu if needed
    if (await this.userAvatar.isVisible()) {
      await this.userAvatar.click();
    }
    await this.logoutButton.click();
    await this.waitForUrl(/\/login/);
  }

  // ============================================================================
  // ACTIONS - LESSONS
  // ============================================================================

  /**
   * Continue last lesson
   */
  async continueLastLesson(): Promise<void> {
    await this.continueButton.click();
    await this.waitForUrl(/\/lessons\//);
  }

  /**
   * Start learning (first lesson of the day)
   */
  async startLearning(): Promise<void> {
    await this.startLearningButton.click();
    await this.waitForUrl(/\/lessons\//);
  }

  /**
   * Click on specific today's lesson by index
   */
  async clickTodaysLesson(index: number): Promise<void> {
    await this.todaysLessons.nth(index).click();
    await this.waitForUrl(/\/lessons\//);
  }

  /**
   * Click on recommended lesson by index
   */
  async clickRecommendedLesson(index: number): Promise<void> {
    await this.recommendedLessons.nth(index).click();
    await this.waitForUrl(/\/lessons\//);
  }

  // ============================================================================
  // ACTIONS - ANNOUNCEMENTS
  // ============================================================================

  /**
   * Dismiss announcement banner
   */
  async dismissAnnouncement(): Promise<void> {
    if (await this.announcementBanner.isVisible()) {
      await this.dismissAnnouncementButton.click();
      await expect(this.announcementBanner).not.toBeVisible();
    }
  }

  // ============================================================================
  // GETTERS - DATA
  // ============================================================================

  /**
   * Get current XP value
   */
  async getXP(): Promise<number> {
    const text = await this.xpDisplay.textContent();
    return parseInt(text?.replace(/[^0-9]/g, '') || '0', 10);
  }

  /**
   * Get current level
   */
  async getLevel(): Promise<number> {
    const text = await this.levelDisplay.textContent();
    return parseInt(text?.replace(/[^0-9]/g, '') || '0', 10);
  }

  /**
   * Get current streak
   */
  async getStreak(): Promise<number> {
    const text = await this.streakDisplay.textContent();
    return parseInt(text?.replace(/[^0-9]/g, '') || '0', 10);
  }

  /**
   * Get notification count
   */
  async getNotificationCount(): Promise<number> {
    if (await this.notificationBadge.isVisible()) {
      const text = await this.notificationBadge.textContent();
      return parseInt(text || '0', 10);
    }
    return 0;
  }

  /**
   * Get user name from greeting
   */
  async getUserName(): Promise<string> {
    const text = await this.userGreeting.textContent();
    // Extract name from "Hi, [Name]" or similar pattern
    const match = text?.match(/(?:Hi|Hello|Welcome),?\s*(.+?)(?:!|$)/i);
    return match?.[1]?.trim() || '';
  }

  /**
   * Get number of today's lessons
   */
  async getTodaysLessonCount(): Promise<number> {
    return await this.todaysLessons.count();
  }

  /**
   * Get number of recommended lessons
   */
  async getRecommendedLessonCount(): Promise<number> {
    return await this.recommendedLessons.count();
  }

  // ============================================================================
  // ASSERTIONS
  // ============================================================================

  /**
   * Assert dashboard is displayed
   */
  async assertPageDisplayed(): Promise<void> {
    await expect(this.userGreeting).toBeVisible();
    await expect(this.todaysPlan).toBeVisible();
  }

  /**
   * Assert user is greeted by name
   */
  async assertGreetingContains(name: string): Promise<void> {
    await expect(this.userGreeting).toContainText(name);
  }

  /**
   * Assert XP is displayed
   */
  async assertXPDisplayed(): Promise<void> {
    await expect(this.xpDisplay).toBeVisible();
  }

  /**
   * Assert streak is displayed
   */
  async assertStreakDisplayed(): Promise<void> {
    await expect(this.streakDisplay).toBeVisible();
  }

  /**
   * Assert level is displayed
   */
  async assertLevelDisplayed(): Promise<void> {
    await expect(this.levelDisplay).toBeVisible();
  }

  /**
   * Assert today's lessons are loaded
   */
  async assertTodaysLessonsLoaded(): Promise<void> {
    await expect(this.todaysPlan).toBeVisible();
    const count = await this.getTodaysLessonCount();
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Assert recommended section is displayed
   */
  async assertRecommendedDisplayed(): Promise<void> {
    await expect(this.recommendedSection).toBeVisible();
  }

  /**
   * Assert notification badge shows count
   */
  async assertNotificationCount(count: number): Promise<void> {
    const actual = await this.getNotificationCount();
    expect(actual).toBe(count);
  }

  /**
   * Assert no notifications
   */
  async assertNoNotifications(): Promise<void> {
    await expect(this.notificationBadge).not.toBeVisible();
  }

  /**
   * Assert announcement banner is visible
   */
  async assertAnnouncementVisible(text?: string | RegExp): Promise<void> {
    await expect(this.announcementBanner).toBeVisible();
    if (text) {
      await expect(this.announcementBanner).toContainText(text);
    }
  }

  /**
   * Assert continue button is visible (user has in-progress lesson)
   */
  async assertContinueButtonVisible(): Promise<void> {
    await expect(this.continueButton).toBeVisible();
  }

  /**
   * Assert start learning button is visible (no in-progress lesson)
   */
  async assertStartLearningButtonVisible(): Promise<void> {
    await expect(this.startLearningButton).toBeVisible();
  }
}
