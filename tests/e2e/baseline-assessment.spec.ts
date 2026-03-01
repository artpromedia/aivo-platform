/**
 * AIVO Platform - Baseline Assessment E2E Tests
 *
 * Comprehensive test coverage for the entire baseline assessment flow
 * across all 5 pages (intro, assessment, brain-clone, complete, dashboard redirect)
 * and all 8 assessment phases (loading, preparing, learning_style,
 * transition_to_domains, domain_intro, domain_questions, game_break, completing).
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.LEARNER_URL || 'http://localhost:3000';

// Helpers ────────────────────────────────────────────────────────────────────

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Bypass the preparation & loading phases and reach the first learning-style
 * question. Returns once the first question is visible.
 */
async function navigateToLearningStyle(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/baseline/assessment`);
  // Wait for preparing phase to complete and first learning-style question
  await page.waitForSelector('text=When learning something new', { timeout: 30_000 });
}

/**
 * Complete all 7 learning-style questions quickly.
 * Returns with the transition-to-domains screen visible.
 */
async function completeLearningStylePhase(page: Page): Promise<void> {
  // Q1 (choice): auto-advances on click
  await page.getByText('Watch videos or pictures').click();
  await expect(page.getByText('I remember things best when')).toBeVisible({ timeout: 3000 });

  // Q2 (choice): auto-advances
  await page.getByText('I see pictures or diagrams').click();
  await expect(page.getByText('What subjects do you like')).toBeVisible({ timeout: 3000 });

  // Q3 (multi_select): pick ≥1 then Continue
  await page.getByText('Math', { exact: true }).click();
  await page.getByText('Science', { exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.getByText('I feel really good at')).toBeVisible({ timeout: 3000 });

  // Q4 (multi_select)
  await page.getByText('Solving puzzles').click();
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.getByText('Sometimes I find it hard to')).toBeVisible({ timeout: 3000 });

  // Q5 (multi_select)
  await page.getByText('Nothing - I got this!').click();
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.getByText('How do you feel about taking breaks')).toBeVisible({ timeout: 3000 });

  // Q6 (emoji_scale): auto-advances
  await page.getByText("They're nice").click();
  await expect(page.getByText('When do you feel most ready to learn')).toBeVisible({ timeout: 3000 });

  // Q7 (choice): auto-advances → transition screen
  await page.getByText('Anytime!').click();
  // Wait for transition screen
  await expect(page.getByText('Great job so far!')).toBeVisible({ timeout: 3000 });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. INTRO PAGE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Baseline Assessment — Intro Page', () => {
  test('renders intro page with welcome header and all 4 info cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline`);
    await waitForPageReady(page);

    // Welcome header
    await expect(page.getByText('Welcome to AIVO!')).toBeVisible();
    await expect(page.getByText("Let's discover how you learn best!")).toBeVisible();

    // 4 feature cards
    await expect(page.getByText("It's Not a Test!")).toBeVisible();
    await expect(page.getByText('Fun Activities')).toBeVisible();
    await expect(page.getByText('Take Your Time')).toBeVisible();
    await expect(page.getByText('Personalized Learning')).toBeVisible();
  });

  test('shows tip text at the bottom', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline`);
    await waitForPageReady(page);
    await expect(page.getByText('Find a quiet spot')).toBeVisible();
  });

  test('"Let\'s Go!" button navigates to assessment page', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline`);
    await waitForPageReady(page);
    await page.getByRole('button', { name: /let.s go/i }).click();
    await expect(page).toHaveURL(/\/baseline\/assessment/);
  });

  test('"Let\'s Go!" button shows loading state while navigating', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline`);
    await waitForPageReady(page);
    await page.getByRole('button', { name: /let.s go/i }).click();
    // The button should become disabled and show "Getting Ready..."
    await expect(page.getByText('Getting Ready...')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ASSESSMENT - PREPARATION PHASE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Baseline Assessment — Preparation Phase', () => {
  test('shows preparing UI with progress bar', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/assessment`);
    // Should show the brain animation and preparation status
    await expect(page.getByText('Preparing Your Assessment').or(page.getByText(/Getting ready for you/))).toBeVisible({ timeout: 5000 });
  });

  test('progress bar advances during preparation', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/assessment`);
    // Initial status message
    await expect(page.getByText(/Loading your learning profile|Analyzing your learning profile/)).toBeVisible({ timeout: 5000 });
    // Should eventually reach completion and move to learning_style
    await expect(page.getByText('When learning something new')).toBeVisible({ timeout: 30_000 });
  });

  test('preparation warning banner shown for stub questions', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/assessment`);
    // Wait for learning style to load (preparation finishes)
    await page.waitForSelector('text=When learning something new', { timeout: 30_000 });
    // If stub questions were used, a warning banner should appear
    const warningBanner = page.getByText("practice questions");
    // Warning may or may not appear depending on API availability — just confirm no crash
    const isVisible = await warningBanner.isVisible().catch(() => false);
    if (isVisible) {
      // Verify dismiss button works
      await page.getByText('✕').click();
      await expect(warningBanner).not.toBeVisible();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ASSESSMENT - LEARNING STYLE PHASE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Baseline Assessment — Learning Style Phase', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any saved progress so resume dialog doesn't appear
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.evaluate(() => localStorage.removeItem('aivo_baseline_progress'));
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.waitForSelector('text=When learning something new', { timeout: 30_000 });
  });

  test('displays first learning-style question (Q1 - choice)', async ({ page }) => {
    await expect(page.getByText('When learning something new, I like to...')).toBeVisible();
    // Should show 4 options for Q1
    await expect(page.getByText('Watch videos or pictures')).toBeVisible();
    await expect(page.getByText('Listen to someone explain it')).toBeVisible();
    await expect(page.getByText('Read about it')).toBeVisible();
    await expect(page.getByText('Try it myself')).toBeVisible();
  });

  test('choice questions auto-advance after selection', async ({ page }) => {
    await page.getByText('Watch videos or pictures').click();
    // Should auto-advance to Q2 after 300ms delay
    await expect(page.getByText('I remember things best when')).toBeVisible({ timeout: 2000 });
  });

  test('multi-select questions require Continue button', async ({ page }) => {
    // Advance to Q3 (multi_select)
    await page.getByText('Watch videos or pictures').click();
    await expect(page.getByText('I remember things best when')).toBeVisible({ timeout: 2000 });
    await page.getByText('I see pictures or diagrams').click();
    await expect(page.getByText('What subjects do you like')).toBeVisible({ timeout: 2000 });

    // Q3 should show "Pick as many as you want!" hint
    await expect(page.getByText('Pick as many as you want!')).toBeVisible();

    // Continue button should be disabled when no selection made
    const continueBtn = page.getByRole('button', { name: /continue/i });
    await expect(continueBtn).toBeDisabled();

    // Select items then Continue should be enabled
    await page.getByText('Math', { exact: true }).click();
    await expect(continueBtn).toBeEnabled();
    await page.getByText('Science', { exact: true }).click();
    await continueBtn.click();
    // Should advance to Q4
    await expect(page.getByText('I feel really good at')).toBeVisible({ timeout: 2000 });
  });

  test('Back button works during learning style phase', async ({ page }) => {
    // Answer Q1
    await page.getByText('Watch videos or pictures').click();
    await expect(page.getByText('I remember things best when')).toBeVisible({ timeout: 2000 });

    // Click Back → should return to Q1
    await page.getByText('← Back').click();
    await expect(page.getByText('When learning something new, I like to...')).toBeVisible();
  });

  test('Back button is disabled on first question', async ({ page }) => {
    const backBtn = page.getByText('← Back');
    await expect(backBtn).toBeVisible();
    // The button should be disabled (has disabled:opacity-30)
    await expect(backBtn).toBeDisabled();
  });

  test('progress dots reflect current question index', async ({ page }) => {
    // On Q1 → 1 active dot, 6 inactive
    const dots = page.locator('.rounded-full.w-2.h-2');
    const count = await dots.count();
    expect(count).toBe(7);

    // Advance to Q2
    await page.getByText('Watch videos or pictures').click();
    await expect(page.getByText('I remember things best when')).toBeVisible({ timeout: 2000 });

    // Previous dot should be filled (bg-indigo-400), current should be active (bg-indigo-600)
    const filledDots = page.locator('.rounded-full.w-2.h-2.bg-indigo-400');
    await expect(filledDots).toHaveCount(1);
  });

  test('completes all 7 learning style questions and reaches transition', async ({ page }) => {
    await completeLearningStylePhase(page);
    await expect(page.getByText('Great job so far!')).toBeVisible();
  });

  test('header shows "Getting to know you..." during learning style', async ({ page }) => {
    await expect(page.getByText('Getting to know you...')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ASSESSMENT - TRANSITION TO DOMAINS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Baseline Assessment — Transition to Domains', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.evaluate(() => localStorage.removeItem('aivo_baseline_progress'));
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.waitForSelector('text=When learning something new', { timeout: 30_000 });
    await completeLearningStylePhase(page);
  });

  test('shows celebration and domain icons', async ({ page }) => {
    await expect(page.getByText('Great job so far!')).toBeVisible();
    // Domain icons should be visible (at least the first 4)
    await expect(page.getByText('Math', { exact: true })).toBeVisible();
    await expect(page.getByText('Reading & Language')).toBeVisible();
  });

  test('shows encouragement text', async ({ page }) => {
    await expect(page.getByText("Don't worry - there are no wrong answers!")).toBeVisible();
  });

  test('"Let\'s Go!" button starts domain assessment', async ({ page }) => {
    await page.getByRole('button', { name: /let.s go/i }).click();
    // Should move to domain_intro or domain_questions phase
    // Header should change to indicate domain assessment
    await expect(page.getByText(/Starting|Math|Reading/).first()).toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ASSESSMENT - DOMAIN INTRO
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Baseline Assessment — Domain Intro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.evaluate(() => localStorage.removeItem('aivo_baseline_progress'));
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.waitForSelector('text=When learning something new', { timeout: 30_000 });
    await completeLearningStylePhase(page);
    await page.getByRole('button', { name: /let.s go/i }).click();
  });

  test('shows domain name, description, and question count', async ({ page }) => {
    // First domain is Math
    await expect(page.getByRole('heading', { name: 'Math' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('5 quick questions')).toBeVisible();
  });

  test('"Start!" button loads domain questions', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Math' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /start/i }).click();
    // Should show a question or loading state
    await expect(page.getByText(/Question 1 of/).or(page.getByText('Getting your questions ready'))).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. ASSESSMENT - DOMAIN QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Baseline Assessment — Domain Questions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.evaluate(() => localStorage.removeItem('aivo_baseline_progress'));
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.waitForSelector('text=When learning something new', { timeout: 30_000 });
    await completeLearningStylePhase(page);
    await page.getByRole('button', { name: /let.s go/i }).click();
    // Wait for domain intro
    await expect(page.getByRole('heading', { name: 'Math' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /start/i }).click();
    // Wait for questions to load
    await page.waitForSelector('text=Question 1 of', { timeout: 10_000 });
  });

  test('shows question text with option buttons (A, B, C, D)', async ({ page }) => {
    // Should show answer option badges with letters
    await expect(page.getByText('A', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('B', { exact: true }).first()).toBeVisible();
  });

  test('shows domain progress dots', async ({ page }) => {
    const dots = page.locator('.rounded-full.w-3.h-3');
    const count = await dots.count();
    expect(count).toBe(5); // 5 questions per domain
  });

  test('clicking an option advances to next question', async ({ page }) => {
    // Answer Q1 by clicking the first option button
    const firstOption = page.locator('button:has-text("A")').first();
    await firstOption.click();
    // Should advance to Q2
    await expect(page.getByText('Question 2 of')).toBeVisible({ timeout: 3000 });
  });

  test('header shows domain name and question progress', async ({ page }) => {
    await expect(page.getByText(/Math.*Q1\/5|Math - Q1/)).toBeVisible();
  });

  test('skip button is NOT visible for STANDARD assessment', async ({ page }) => {
    // STANDARD assessments should not show skip
    const skipBtn = page.getByText('Skip this question →');
    await expect(skipBtn).not.toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. ASSESSMENT - GAME BREAKS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Baseline Assessment — Game Breaks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.evaluate(() => localStorage.removeItem('aivo_baseline_progress'));
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.waitForSelector('text=When learning something new', { timeout: 30_000 });
    await completeLearningStylePhase(page);
    await page.getByRole('button', { name: /let.s go/i }).click();
    // Wait for domain intro then start
    await expect(page.getByRole('heading', { name: 'Math' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /start/i }).click();
    await page.waitForSelector('text=Question 1 of', { timeout: 10_000 });
  });

  test('game break appears after completing all questions in a domain', async ({ page }) => {
    // Answer all 5 questions in the first domain (Math)
    for (let q = 0; q < 5; q++) {
      const option = page.locator('button:has-text("A")').first();
      await option.click();
      await page.waitForTimeout(500);
    }

    // Should show game break or next domain intro
    // Game break: look for break activity text or "Skip break →"
    const breakOrIntro = page.getByText('Skip break →').or(page.getByText('Reading & Language'));
    await expect(breakOrIntro).toBeVisible({ timeout: 10_000 });
  });

  test('"Skip break →" advances to next domain', async ({ page }) => {
    // Answer all 5 questions
    for (let q = 0; q < 5; q++) {
      const option = page.locator('button:has-text("A")').first();
      await option.click();
      await page.waitForTimeout(500);
    }

    const skipBtn = page.getByText('Skip break →');
    const isBreak = await skipBtn.isVisible().catch(() => false);
    if (isBreak) {
      await skipBtn.click();
      // Should show next domain intro (Reading & Language)
      await expect(page.getByText('Reading & Language')).toBeVisible({ timeout: 5000 });
    }
    // If no break shown (break may be skipped based on config), next domain should still appear
  });

  test('game break shows countdown number', async ({ page }) => {
    // Answer all 5 questions
    for (let q = 0; q < 5; q++) {
      const option = page.locator('button:has-text("A")').first();
      await option.click();
      await page.waitForTimeout(500);
    }

    const skipBtn = page.getByText('Skip break →');
    const isBreak = await skipBtn.isVisible().catch(() => false);
    if (isBreak) {
      // Countdown number should be visible inside the SVG circle
      // The countdown is a number (e.g., 8, 10) rendered as text
      const countdownText = page.locator('span:has-text(/^[0-9]+$/)').first();
      await expect(countdownText).toBeVisible();
    }
  });

  test('game break header shows completion message', async ({ page }) => {
    // Answer all 5 questions
    for (let q = 0; q < 5; q++) {
      const option = page.locator('button:has-text("A")').first();
      await option.click();
      await page.waitForTimeout(500);
    }

    const skipBtn = page.getByText('Skip break →');
    const isBreak = await skipBtn.isVisible().catch(() => false);
    if (isBreak) {
      // Should show a celebration message like "You completed Math!"
      await expect(page.getByText(/Math.*more to go|completed.*Math/i)).toBeVisible();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. BRAIN CLONE PAGE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Baseline Assessment — Brain Clone Page', () => {
  test('auto-advances through phases: analyzing → building → personalizing → consent', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/brain-clone`);
    await waitForPageReady(page);

    await expect(page.getByText('Analyzing Your Responses')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Building Your Brain')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Personalizing Your Experience')).toBeVisible({ timeout: 10_000 });
    // ready phase is brief (2s) then consent
    await expect(page.getByText('Parent Approval Needed')).toBeVisible({ timeout: 15_000 });
  });

  test('shows progress bar during animated phases', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/brain-clone`);
    await expect(page.getByText('Analyzing Your Responses')).toBeVisible({ timeout: 5000 });
    // Progress percentage should be visible
    await expect(page.getByText(/%/)).toBeVisible();
  });

  test('brain visualization SVG is rendered', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/brain-clone`);
    await waitForPageReady(page);
    // SVG with neurons should be rendered
    const svg = page.locator('svg[viewBox="0 0 300 300"]');
    await expect(svg).toBeVisible();
  });

  test('consent requires both checkboxes before activation', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/brain-clone`);
    // Wait for consent phase
    await page.waitForSelector('text=Parent Approval Needed', { timeout: 20_000 });

    // Activate button should be disabled initially
    const activateBtn = page.getByRole('button', { name: /activate learning brain/i });
    await expect(activateBtn).toBeVisible();
    await expect(activateBtn).toBeDisabled();

    // Check parent checkbox only → activate still disabled
    await page.getByText('I am a parent/guardian').click();
    await expect(activateBtn).toBeDisabled();

    // Check consent checkbox → activate should become enabled
    await page.getByText('I consent to creating this learning profile').click();
    await expect(activateBtn).toBeEnabled();
  });

  test('consent checkbox is disabled until parent checkbox is checked', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/brain-clone`);
    await page.waitForSelector('text=Parent Approval Needed', { timeout: 20_000 });

    // Consent checkbox input should be disabled
    const consentCheckbox = page.locator('input[type="checkbox"]').nth(1);
    await expect(consentCheckbox).toBeDisabled();

    // Check parent checkbox
    await page.getByText('I am a parent/guardian').click();
    // Now consent checkbox should be enabled
    await expect(consentCheckbox).toBeEnabled();
  });

  test('unchecking parent checkbox also unchecks consent', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/brain-clone`);
    await page.waitForSelector('text=Parent Approval Needed', { timeout: 20_000 });

    // Check parent → check consent
    await page.getByText('I am a parent/guardian').click();
    await page.getByText('I consent to creating this learning profile').click();
    const activateBtn = page.getByRole('button', { name: /activate learning brain/i });
    await expect(activateBtn).toBeEnabled();

    // Uncheck parent → activate should become disabled
    await page.getByText('I am a parent/guardian').click();
    await expect(activateBtn).toBeDisabled();
  });

  test('shows consent explanatory info (what this means section)', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/brain-clone`);
    await page.waitForSelector('text=Parent Approval Needed', { timeout: 20_000 });

    await expect(page.getByText('What this means:')).toBeVisible();
    await expect(page.getByText("Lessons adapted to your child's pace")).toBeVisible();
    await expect(page.getByText('Content matching their interests')).toBeVisible();
    await expect(page.getByText('Progress tracking for parents')).toBeVisible();
  });

  test('page header says "Creating Your Learning Brain"', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/brain-clone`);
    await waitForPageReady(page);
    await expect(page.getByText('Creating Your Learning Brain')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. COMPLETE PAGE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Baseline Assessment — Complete Page', () => {
  test('shows celebration header with "Awesome Job!"', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/complete`);
    await waitForPageReady(page);
    await expect(page.getByText('Awesome Job!')).toBeVisible();
  });

  test('shows confetti animation that fades after 5 seconds', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/complete`);
    await waitForPageReady(page);
    // Confetti particles should be present initially (z-50 container)
    const confetti = page.locator('.pointer-events-none.z-50').first();
    // Initially visible
    await expect(confetti).toBeVisible();
    // After 6 seconds the confetti should be removed
    await page.waitForTimeout(6000);
    await expect(confetti).not.toBeVisible();
  });

  test('shows "What\'s Next?" card with 4 learning path items', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/complete`);
    await waitForPageReady(page);

    await expect(page.getByText("What's Next?")).toBeVisible();
    await expect(page.getByText('Personalized Lessons')).toBeVisible();
    await expect(page.getByText('Fun Games')).toBeVisible();
    await expect(page.getByText('Track Progress')).toBeVisible();
    await expect(page.getByText('Earn Rewards')).toBeVisible();
  });

  test('"Start Learning!" link is visible and links to dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/complete`);
    await waitForPageReady(page);

    const startLink = page.getByRole('link', { name: /start learning/i });
    await expect(startLink).toBeVisible();
    await expect(startLink).toHaveAttribute('href', '/dashboard');
  });

  test('"Start Learning!" navigates to dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/complete`);
    await waitForPageReady(page);
    await page.getByRole('link', { name: /start learning/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('shows learning journey info section', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/complete`);
    await waitForPageReady(page);
    await expect(page.getByText('Your Learning Journey')).toBeVisible();
    await expect(page.getByText('AIVO will now create personalized lessons')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. PROGRESS PERSISTENCE (localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Baseline Assessment — Progress Persistence', () => {
  test('resume dialog appears when saved progress exists', async ({ page }) => {
    // Navigate and complete some questions to create saved state
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.evaluate(() => localStorage.removeItem('aivo_baseline_progress'));
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.waitForSelector('text=When learning something new', { timeout: 30_000 });
    // Answer Q1
    await page.getByText('Watch videos or pictures').click();
    await expect(page.getByText('I remember things best when')).toBeVisible({ timeout: 2000 });

    // Reload — should show resume dialog
    await page.reload();
    await expect(page.getByText('Welcome back!')).toBeVisible({ timeout: 10_000 });
  });

  test('"Continue where I left off" resumes at saved position', async ({ page }) => {
    // Setup: navigate and answer Q1
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.evaluate(() => localStorage.removeItem('aivo_baseline_progress'));
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.waitForSelector('text=When learning something new', { timeout: 30_000 });
    await page.getByText('Watch videos or pictures').click();
    await expect(page.getByText('I remember things best when')).toBeVisible({ timeout: 2000 });

    // Reload and resume
    await page.reload();
    await expect(page.getByText('Welcome back!')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /continue where i left off/i }).click();

    // Should be on Q2 (learning_style phase, index 1)
    await expect(page.getByText('I remember things best when')).toBeVisible({ timeout: 5000 });
  });

  test('"Start over" clears progress and begins fresh', async ({ page }) => {
    // Setup: navigate and answer Q1
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.evaluate(() => localStorage.removeItem('aivo_baseline_progress'));
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.waitForSelector('text=When learning something new', { timeout: 30_000 });
    await page.getByText('Watch videos or pictures').click();
    await expect(page.getByText('I remember things best when')).toBeVisible({ timeout: 2000 });

    // Reload and start over
    await page.reload();
    await expect(page.getByText('Welcome back!')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /start over/i }).click();

    // Should go through preparation again and land on Q1
    await expect(page.getByText('When learning something new')).toBeVisible({ timeout: 30_000 });
  });

  test('resume dialog shows expiry notice', async ({ page }) => {
    // Setup saved progress
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.evaluate(() => localStorage.removeItem('aivo_baseline_progress'));
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.waitForSelector('text=When learning something new', { timeout: 30_000 });
    await page.getByText('Watch videos or pictures').click();
    await page.waitForTimeout(500);

    await page.reload();
    await expect(page.getByText('Welcome back!')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Saved progress expires after 24 hours')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. FULL E2E FLOW (Intro → Assessment → Brain Clone → Complete → Dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Baseline Assessment — Full E2E Flow', () => {
  test('complete entire baseline from intro to completion page', async ({ page }) => {
    test.setTimeout(120_000); // 2 minutes for full flow

    // Clear saved progress
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.evaluate(() => localStorage.removeItem('aivo_baseline_progress'));

    // 1. Start at intro page
    await page.goto(`${BASE_URL}/baseline`);
    await waitForPageReady(page);
    await expect(page.getByText('Welcome to AIVO!')).toBeVisible();

    // 2. Click "Let's Go!"
    await page.getByRole('button', { name: /let.s go/i }).click();
    await expect(page).toHaveURL(/\/baseline\/assessment/);

    // 3. Wait for preparation phase to complete
    await page.waitForSelector('text=When learning something new', { timeout: 30_000 });

    // 4. Answer all 7 learning style questions
    await completeLearningStylePhase(page);
    await expect(page.getByText('Great job so far!')).toBeVisible();

    // 5. Click "Let's Go!" on transition screen
    await page.getByRole('button', { name: /let.s go/i }).click();

    // 6. For each enabled domain: click "Start!", answer 5 questions, handle break
    const domainCount = 7; // 7 default domains
    for (let d = 0; d < domainCount; d++) {
      // Wait for domain intro (Start button)
      const startBtn = page.getByRole('button', { name: /start/i });
      await expect(startBtn).toBeVisible({ timeout: 15_000 });
      await startBtn.click();

      // Wait for questions to load
      await page.waitForSelector('text=Question 1 of', { timeout: 10_000 });

      // Answer all questions in this domain
      for (let q = 0; q < 5; q++) {
        const option = page.locator('button:has-text("A")').first();
        await option.click();
        await page.waitForTimeout(300);
      }

      // If not the last domain, may see a game break — skip it
      if (d < domainCount - 1) {
        const skipBtn = page.getByText('Skip break →');
        const isBreak = await skipBtn.isVisible({ timeout: 5000 }).catch(() => false);
        if (isBreak) {
          await skipBtn.click();
        }
      }
    }

    // 7. Should reach the completing phase
    await expect(
      page.getByText('Amazing work!').or(page.getByText('Preparing your personalized learning brain'))
    ).toBeVisible({ timeout: 10_000 });

    // 8. Should auto-navigate to brain-clone page
    await expect(page).toHaveURL(/\/baseline\/(brain-clone|complete)/, { timeout: 15_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. EDGE CASES & ERROR STATES
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Baseline Assessment — Edge Cases', () => {
  test('direct navigation to /baseline/assessment shows preparation', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/assessment`);
    // Should see either preparing state or loading state initially
    await expect(
      page.getByText('Preparing Your Assessment')
        .or(page.getByText(/Getting ready for you/))
        .or(page.getByText('Loading'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('direct navigation to /baseline/complete shows celebration', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/complete`);
    await waitForPageReady(page);
    await expect(page.getByText('Awesome Job!')).toBeVisible();
  });

  test('direct navigation to /baseline/brain-clone starts visualization', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/brain-clone`);
    await waitForPageReady(page);
    await expect(page.getByText('Analyzing Your Responses')).toBeVisible({ timeout: 5000 });
  });

  test('stale progress (>24h) is auto-cleared', async ({ page }) => {
    // Inject stale progress into localStorage
    await page.goto(`${BASE_URL}/baseline/assessment`);
    await page.evaluate(() => {
      const staleProgress = {
        phase: 'learning_style',
        lsIndex: 3,
        savedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };
      localStorage.setItem('aivo_baseline_progress', JSON.stringify(staleProgress));
    });

    // Reload
    await page.reload();

    // Should NOT show resume dialog — stale data is cleared
    // Instead should go through preparation phase
    await expect(page.getByText('Welcome back!')).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText('When learning something new')).toBeVisible({ timeout: 30_000 });
  });

  test('brain clone handles activation error gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/baseline/brain-clone`);
    await page.waitForSelector('text=Parent Approval Needed', { timeout: 20_000 });

    // Mock the activate API to fail
    await page.route('**/api/baseline/activate-brain', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
    });

    // Complete consent
    await page.getByText('I am a parent/guardian').click();
    await page.getByText('I consent to creating this learning profile').click();

    // Click activate
    const activateBtn = page.getByRole('button', { name: /activate learning brain/i });
    await activateBtn.click();

    // Should show error message
    await expect(page.getByText('Could not activate your learning brain')).toBeVisible({ timeout: 5000 });

    // "Try Again" link should be visible
    await expect(page.getByText('Try Again')).toBeVisible();
  });
});
