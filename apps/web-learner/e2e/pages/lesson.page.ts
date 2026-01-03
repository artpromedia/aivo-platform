import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Lesson Page Object
 *
 * Handles lesson player interactions:
 * - Block navigation
 * - Question answering
 * - Video/audio controls
 * - Progress tracking
 * - Gamification (XP, achievements)
 * - Completion handling
 */

export class LessonPage extends BasePage {
  protected readonly path = '/lessons';

  constructor(page: Page) {
    super(page);
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  /**
   * Navigate to specific lesson
   */
  async navigateToLesson(lessonId: string): Promise<void> {
    await this.page.goto(`${this.path}/${lessonId}`);
    await this.waitForPageLoad();
    await this.waitForLoading();
  }

  // ============================================================================
  // LOCATORS - HEADER & PROGRESS
  // ============================================================================

  get lessonTitle(): Locator {
    return this.page.getByTestId('lesson-title');
  }

  get progressBar(): Locator {
    return this.page.getByTestId('lesson-progress-bar');
  }

  get progressPercentage(): Locator {
    return this.page.getByTestId('lesson-progress-percentage');
  }

  get currentBlockIndex(): Locator {
    return this.page.getByTestId('current-block-index');
  }

  get totalBlocks(): Locator {
    return this.page.getByTestId('total-blocks');
  }

  get closeButton(): Locator {
    return this.page.getByRole('button', { name: /close|exit|×/i });
  }

  get xpDisplay(): Locator {
    return this.page.getByTestId('xp-display');
  }

  // ============================================================================
  // LOCATORS - NAVIGATION BUTTONS
  // ============================================================================

  get continueButton(): Locator {
    return this.page.getByRole('button', { name: /continue|next/i });
  }

  get previousButton(): Locator {
    return this.page.getByRole('button', { name: /previous|back/i });
  }

  get skipButton(): Locator {
    return this.page.getByRole('button', { name: /skip/i });
  }

  // ============================================================================
  // LOCATORS - CONTENT BLOCKS
  // ============================================================================

  get lessonContent(): Locator {
    return this.page.getByTestId('lesson-content');
  }

  get textBlock(): Locator {
    return this.page.getByTestId('block-text');
  }

  get headingBlock(): Locator {
    return this.page.getByTestId('block-heading');
  }

  get imageBlock(): Locator {
    return this.page.getByTestId('block-image');
  }

  get videoBlock(): Locator {
    return this.page.getByTestId('block-video');
  }

  get audioBlock(): Locator {
    return this.page.getByTestId('block-audio');
  }

  get questionBlock(): Locator {
    return this.page.getByTestId('block-question');
  }

  get interactiveBlock(): Locator {
    return this.page.getByTestId('block-interactive');
  }

  // ============================================================================
  // LOCATORS - QUESTION ELEMENTS
  // ============================================================================

  get questionStem(): Locator {
    return this.page.getByTestId('question-stem');
  }

  get answerOptions(): Locator {
    return this.page.getByTestId('answer-option');
  }

  get submitAnswerButton(): Locator {
    return this.page.getByRole('button', { name: /submit|check|answer/i });
  }

  get feedbackMessage(): Locator {
    return this.page.getByTestId('feedback-message');
  }

  get correctFeedback(): Locator {
    return this.page.getByTestId('correct-feedback');
  }

  get incorrectFeedback(): Locator {
    return this.page.getByTestId('incorrect-feedback');
  }

  get tryAgainButton(): Locator {
    return this.page.getByRole('button', { name: /try again/i });
  }

  get hintButton(): Locator {
    return this.page.getByRole('button', { name: /hint/i });
  }

  get hintText(): Locator {
    return this.page.getByTestId('hint-text');
  }

  get explanationText(): Locator {
    return this.page.getByTestId('explanation-text');
  }

  // Fill in the blank
  get fillBlankInput(): Locator {
    return this.page.getByTestId('fill-blank-input');
  }

  // Short answer
  get shortAnswerInput(): Locator {
    return this.page.getByTestId('short-answer-input');
  }

  // Matching
  get matchingSource(): Locator {
    return this.page.getByTestId('matching-source');
  }

  get matchingTarget(): Locator {
    return this.page.getByTestId('matching-target');
  }

  // Ordering
  get orderingItems(): Locator {
    return this.page.getByTestId('ordering-item');
  }

  // ============================================================================
  // LOCATORS - VIDEO PLAYER
  // ============================================================================

  get videoPlayer(): Locator {
    return this.page.locator('video');
  }

  get playButton(): Locator {
    return this.page.getByRole('button', { name: /play/i });
  }

  get pauseButton(): Locator {
    return this.page.getByRole('button', { name: /pause/i });
  }

  get muteButton(): Locator {
    return this.page.getByRole('button', { name: /mute|unmute/i });
  }

  get volumeSlider(): Locator {
    return this.page.getByRole('slider', { name: /volume/i });
  }

  get videoProgress(): Locator {
    return this.page.getByRole('slider', { name: /progress|seek/i });
  }

  get fullscreenButton(): Locator {
    return this.page.getByRole('button', { name: /fullscreen/i });
  }

  get captionsButton(): Locator {
    return this.page.getByRole('button', { name: /caption|subtitle/i });
  }

  get playbackSpeedButton(): Locator {
    return this.page.getByRole('button', { name: /speed|playback/i });
  }

  // ============================================================================
  // LOCATORS - COMPLETION
  // ============================================================================

  get completionModal(): Locator {
    return this.page.getByTestId('lesson-completion-modal');
  }

  get completionXP(): Locator {
    return this.page.getByTestId('completion-xp');
  }

  get completionTime(): Locator {
    return this.page.getByTestId('completion-time');
  }

  get completionScore(): Locator {
    return this.page.getByTestId('completion-score');
  }

  get nextLessonButton(): Locator {
    return this.page.getByRole('button', { name: /next lesson/i });
  }

  get backToDashboardButton(): Locator {
    return this.page.getByRole('button', { name: /back to dashboard|home/i });
  }

  get retryLessonButton(): Locator {
    return this.page.getByRole('button', { name: /retry|try again/i });
  }

  // ============================================================================
  // LOCATORS - GAMIFICATION
  // ============================================================================

  get xpAnimation(): Locator {
    return this.page.getByTestId('xp-animation');
  }

  get achievementPopup(): Locator {
    return this.page.getByTestId('achievement-popup');
  }

  get levelUpModal(): Locator {
    return this.page.getByTestId('level-up-modal');
  }

  get streakBanner(): Locator {
    return this.page.getByTestId('streak-banner');
  }

  // ============================================================================
  // ACTIONS - NAVIGATION
  // ============================================================================

  /**
   * Continue to next block
   */
  async continueToNextBlock(): Promise<void> {
    await this.continueButton.click();
    await this.waitForLoading();
  }

  /**
   * Go to previous block
   */
  async goToPreviousBlock(): Promise<void> {
    await this.previousButton.click();
    await this.waitForLoading();
  }

  /**
   * Skip current block
   */
  async skipBlock(): Promise<void> {
    await this.skipButton.click();
    await this.waitForLoading();
  }

  /**
   * Exit lesson
   */
  async exitLesson(): Promise<void> {
    await this.closeButton.click();

    // Handle confirmation dialog if present
    const confirmButton = this.page.getByRole('button', { name: /confirm|exit|yes/i });
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    await this.waitForUrl(/\/dashboard|\/lessons$/);
  }

  // ============================================================================
  // ACTIONS - ANSWERING QUESTIONS
  // ============================================================================

  /**
   * Select answer option by index
   */
  async selectAnswerByIndex(index: number): Promise<void> {
    await this.answerOptions.nth(index).click();
  }

  /**
   * Select answer option by text content
   */
  async selectAnswerByText(text: string): Promise<void> {
    await this.answerOptions.filter({ hasText: text }).click();
  }

  /**
   * Select multiple answers (for multi-select questions)
   */
  async selectMultipleAnswers(indices: number[]): Promise<void> {
    for (const index of indices) {
      await this.answerOptions.nth(index).click();
    }
  }

  /**
   * Submit current answer
   */
  async submitAnswer(): Promise<void> {
    await this.submitAnswerButton.click();
    await this.waitForLoading();
  }

  /**
   * Answer multiple choice question
   */
  async answerMultipleChoice(optionIndex: number): Promise<void> {
    await this.selectAnswerByIndex(optionIndex);
    await this.submitAnswer();
  }

  /**
   * Answer fill in the blank question
   */
  async answerFillBlank(answer: string): Promise<void> {
    await this.fillInput(this.fillBlankInput, answer);
    await this.submitAnswer();
  }

  /**
   * Answer short answer question
   */
  async answerShortAnswer(answer: string): Promise<void> {
    await this.fillInput(this.shortAnswerInput, answer);
    await this.submitAnswer();
  }

  /**
   * Request a hint
   */
  async requestHint(): Promise<string> {
    await this.hintButton.click();
    await expect(this.hintText).toBeVisible();
    return (await this.hintText.textContent()) || '';
  }

  /**
   * Retry after incorrect answer
   */
  async tryAgain(): Promise<void> {
    await this.tryAgainButton.click();
  }

  // ============================================================================
  // ACTIONS - VIDEO
  // ============================================================================

  /**
   * Play video
   */
  async playVideo(): Promise<void> {
    await this.playButton.click();
  }

  /**
   * Pause video
   */
  async pauseVideo(): Promise<void> {
    await this.pauseButton.click();
  }

  /**
   * Toggle mute
   */
  async toggleMute(): Promise<void> {
    await this.muteButton.click();
  }

  /**
   * Set volume
   */
  async setVolume(percentage: number): Promise<void> {
    await this.volumeSlider.fill(String(percentage));
  }

  /**
   * Seek to position (percentage)
   */
  async seekTo(percentage: number): Promise<void> {
    await this.videoProgress.fill(String(percentage));
  }

  /**
   * Toggle fullscreen
   */
  async toggleFullscreen(): Promise<void> {
    await this.fullscreenButton.click();
  }

  /**
   * Toggle captions
   */
  async toggleCaptions(): Promise<void> {
    await this.captionsButton.click();
  }

  /**
   * Wait for video to complete
   */
  async waitForVideoComplete(timeout = 300000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const video = document.querySelector('video');
        return video && video.ended;
      },
      { timeout }
    );
  }

  /**
   * Skip to end of video (for testing)
   */
  async skipVideoToEnd(): Promise<void> {
    await this.page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = video.duration - 0.5;
      }
    });
  }

  /**
   * Get video current time
   */
  async getVideoCurrentTime(): Promise<number> {
    return await this.page.evaluate(() => {
      const video = document.querySelector('video');
      return video?.currentTime || 0;
    });
  }

  /**
   * Get video duration
   */
  async getVideoDuration(): Promise<number> {
    return await this.page.evaluate(() => {
      const video = document.querySelector('video');
      return video?.duration || 0;
    });
  }

  // ============================================================================
  // ACTIONS - COMPLETION
  // ============================================================================

  /**
   * Go to next lesson after completion
   */
  async goToNextLesson(): Promise<void> {
    await this.nextLessonButton.click();
    await this.waitForLoading();
  }

  /**
   * Go back to dashboard after completion
   */
  async goBackToDashboard(): Promise<void> {
    await this.backToDashboardButton.click();
    await this.waitForUrl(/\/dashboard/);
  }

  /**
   * Retry the lesson
   */
  async retryLesson(): Promise<void> {
    await this.retryLessonButton.click();
    await this.waitForLoading();
  }

  /**
   * Dismiss achievement popup
   */
  async dismissAchievement(): Promise<void> {
    if (await this.achievementPopup.isVisible()) {
      await this.achievementPopup.getByRole('button', { name: /close|ok|continue/i }).click();
    }
  }

  /**
   * Dismiss level up modal
   */
  async dismissLevelUp(): Promise<void> {
    if (await this.levelUpModal.isVisible()) {
      await this.levelUpModal.getByRole('button', { name: /close|ok|continue/i }).click();
    }
  }

  // ============================================================================
  // ACTIONS - COMPLETE LESSON
  // ============================================================================

  /**
   * Handle current block based on type
   */
  async handleCurrentBlock(): Promise<void> {
    await this.waitForLoading();

    // Determine block type and handle appropriately
    if (await this.questionBlock.isVisible()) {
      // Answer question (select first option)
      const optionCount = await this.answerOptions.count();
      if (optionCount > 0) {
        await this.selectAnswerByIndex(0);
        await this.submitAnswer();
      } else if (await this.fillBlankInput.isVisible()) {
        await this.answerFillBlank('test answer');
      } else if (await this.shortAnswerInput.isVisible()) {
        await this.answerShortAnswer('test answer');
      }
    } else if (await this.videoBlock.isVisible()) {
      // Skip video for testing
      await this.skipVideoToEnd();
      await this.page.waitForTimeout(500);
    }

    // Dismiss any popups
    await this.dismissAchievement();
    await this.dismissLevelUp();
  }

  /**
   * Complete entire lesson
   */
  async completeLesson(): Promise<void> {
    const totalBlocks = await this.getTotalBlockCount();

    for (let i = 1; i <= totalBlocks; i++) {
      await this.handleCurrentBlock();

      if (i < totalBlocks) {
        await this.continueToNextBlock();
      }
    }

    // Final continue to complete
    if (await this.continueButton.isVisible()) {
      await this.continueButton.click();
    }

    await expect(this.completionModal).toBeVisible({ timeout: 10000 });
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  /**
   * Get current progress percentage
   */
  async getProgress(): Promise<number> {
    const text = await this.progressPercentage.textContent();
    return parseInt(text?.replace('%', '') || '0', 10);
  }

  /**
   * Get current block number
   */
  async getCurrentBlock(): Promise<number> {
    const text = await this.currentBlockIndex.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Get total block count
   */
  async getTotalBlockCount(): Promise<number> {
    const text = await this.totalBlocks.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Get current XP
   */
  async getCurrentXP(): Promise<number> {
    const text = await this.xpDisplay.textContent();
    return parseInt(text?.replace(/[^0-9]/g, '') || '0', 10);
  }

  /**
   * Check if answer was correct
   */
  async isAnswerCorrect(): Promise<boolean> {
    return await this.correctFeedback.isVisible();
  }

  /**
   * Get feedback message text
   */
  async getFeedbackText(): Promise<string> {
    return (await this.feedbackMessage.textContent()) || '';
  }

  /**
   * Get completion score
   */
  async getCompletionScore(): Promise<number> {
    const text = await this.completionScore.textContent();
    return parseInt(text?.replace(/[^0-9]/g, '') || '0', 10);
  }

  /**
   * Get completion XP earned
   */
  async getCompletionXP(): Promise<number> {
    const text = await this.completionXP.textContent();
    return parseInt(text?.replace(/[^0-9]/g, '') || '0', 10);
  }

  // ============================================================================
  // ASSERTIONS
  // ============================================================================

  /**
   * Assert lesson is loaded
   */
  async assertLessonLoaded(expectedTitle?: string): Promise<void> {
    await expect(this.lessonContent).toBeVisible();
    await expect(this.progressBar).toBeVisible();

    if (expectedTitle) {
      await expect(this.lessonTitle).toHaveText(expectedTitle);
    }
  }

  /**
   * Assert on specific block number
   */
  async assertOnBlock(blockNumber: number): Promise<void> {
    await expect(this.currentBlockIndex).toHaveText(String(blockNumber));
  }

  /**
   * Assert progress percentage
   */
  async assertProgress(expectedProgress: number, tolerance = 5): Promise<void> {
    const progress = await this.getProgress();
    expect(progress).toBeGreaterThanOrEqual(expectedProgress - tolerance);
    expect(progress).toBeLessThanOrEqual(expectedProgress + tolerance);
  }

  /**
   * Assert lesson completed
   */
  async assertLessonCompleted(): Promise<void> {
    await expect(this.completionModal).toBeVisible();
    await expect(this.completionModal).toContainText(/complete|congratulations/i);
  }

  /**
   * Assert XP earned
   */
  async assertXPEarned(minXP: number): Promise<void> {
    const xp = await this.getCurrentXP();
    expect(xp).toBeGreaterThanOrEqual(minXP);
  }

  /**
   * Assert correct answer feedback
   */
  async assertCorrectAnswer(): Promise<void> {
    await expect(this.correctFeedback).toBeVisible();
  }

  /**
   * Assert incorrect answer feedback
   */
  async assertIncorrectAnswer(): Promise<void> {
    await expect(this.incorrectFeedback).toBeVisible();
  }

  /**
   * Assert hint is visible
   */
  async assertHintVisible(): Promise<void> {
    await expect(this.hintText).toBeVisible();
  }

  /**
   * Assert video is playing
   */
  async assertVideoPlaying(): Promise<void> {
    const isPlaying = await this.page.evaluate(() => {
      const video = document.querySelector('video');
      return video && !video.paused;
    });
    expect(isPlaying).toBe(true);
  }

  /**
   * Assert video is paused
   */
  async assertVideoPaused(): Promise<void> {
    const isPaused = await this.page.evaluate(() => {
      const video = document.querySelector('video');
      return video?.paused;
    });
    expect(isPaused).toBe(true);
  }

  /**
   * Assert achievement earned
   */
  async assertAchievementEarned(achievementName?: string): Promise<void> {
    await expect(this.achievementPopup).toBeVisible();
    if (achievementName) {
      await expect(this.achievementPopup).toContainText(achievementName);
    }
  }

  /**
   * Assert level up
   */
  async assertLevelUp(): Promise<void> {
    await expect(this.levelUpModal).toBeVisible();
  }
}
