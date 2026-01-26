import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../components/button';
import { Card } from '../components/card';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { AchievementBadge, AchievementGrid } from '../components/gamification/AchievementBadge';
import { GradeThemeProvider, useGradeTheme } from '../providers/GradeThemeProvider';
import type { GradeLevel } from '../themes/grade-themes';

/**
 * Theme Showcase
 *
 * This story demonstrates the grade-based theming system with all three themes
 * side by side, showing how components adapt to each grade band.
 */

// Component to display current theme info
function ThemeInfo() {
  const { theme, themeId } = useGradeTheme();
  return (
    <div className="mb-4 p-3 bg-surface-muted rounded-[var(--radius-card)] border border-border">
      <div className="text-title font-semibold">{theme.name}</div>
      <div className="text-label text-text-muted">
        Grade Range: {theme.gradeRange} | ID: {themeId}
      </div>
    </div>
  );
}

// Component showcase panel
function ComponentShowcase() {
  return (
    <div className="space-y-6">
      <ThemeInfo />

      {/* Buttons */}
      <div className="space-y-3">
        <h3 className="text-body font-semibold text-text">Buttons</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="success">Success</Button>
          <Button variant="destructive">Delete</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button loading>Loading</Button>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        <h3 className="text-body font-semibold text-text">Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Default Card" subtitle="With subtitle" icon="📚">
            This is a card with the default variant.
          </Card>
          <Card variant="elevated" title="Elevated Card" interactive>
            Interactive elevated card. Click me!
          </Card>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-3">
        <h3 className="text-body font-semibold text-text">Inputs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder="Outlined input" variant="outlined" />
          <Input placeholder="Filled input" variant="filled" />
          <Input placeholder="Underlined input" variant="underlined" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder="Small" inputSize="sm" />
          <Input placeholder="Medium" inputSize="md" />
          <Input placeholder="Large" inputSize="lg" />
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <h3 className="text-body font-semibold text-text">Progress Bars</h3>
        <div className="space-y-4">
          <Progress value={60} max={100} label="Default" showLabel />
          <Progress value={75} variant="gradient" color="success" label="Gradient" showLabel />
          <Progress value={45} variant="animated" color="info" label="Animated" showLabel />
          <Progress value={100} celebrateOnComplete label="Complete!" showLabel />
        </div>
      </div>

      {/* Achievements */}
      <div className="space-y-3">
        <h3 className="text-body font-semibold text-text">Achievement Badges</h3>
        <AchievementGrid>
          <AchievementBadge
            name="First Steps"
            icon="🎯"
            rarity="common"
            unlocked
          />
          <AchievementBadge
            name="Quick Learner"
            icon="⚡"
            rarity="uncommon"
            unlocked
          />
          <AchievementBadge
            name="Math Wizard"
            icon="🧙"
            rarity="rare"
            unlocked
          />
          <AchievementBadge
            name="Problem Solver"
            icon="🧩"
            rarity="epic"
            unlocked
          />
          <AchievementBadge
            name="Genius"
            icon="🏆"
            rarity="legendary"
            unlocked
          />
          <AchievementBadge
            name="Locked"
            icon="🔒"
            rarity="rare"
            unlocked={false}
            progress={65}
          />
        </AchievementGrid>
      </div>
    </div>
  );
}

// Side-by-side theme comparison
function ThemeComparison() {
  const themes: GradeLevel[] = ['K5', 'MS', 'HS'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {themes.map((themeId) => (
        <GradeThemeProvider
          key={themeId}
          gradeLevel={themeId}
          persistPreference={false}
          respectSystemPreferences={false}
        >
          <div className="bg-background p-4 rounded-lg border border-border">
            <ComponentShowcase />
          </div>
        </GradeThemeProvider>
      ))}
    </div>
  );
}

const meta: Meta = {
  title: 'Theme System/Theme Showcase',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj;

/**
 * All Themes Side by Side
 *
 * View all three grade themes (Explorer, Navigator, Scholar) displayed
 * side by side to compare how components adapt to each age group.
 */
export const AllThemesSideBySide: Story = {
  render: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Grade Theme Comparison</h1>
      <p className="mb-8 text-text-muted">
        Compare how components adapt to different grade bands. From playful K-5 to professional High School.
      </p>
      <ThemeComparison />
    </div>
  ),
};

/**
 * Interactive Theme Switcher
 *
 * Use the toolbar at the top to switch between themes and see
 * components update in real-time.
 */
export const InteractiveThemeSwitcher: Story = {
  render: () => <ComponentShowcase />,
};

/**
 * Button Variants
 *
 * All button variants in the current theme.
 */
export const ButtonVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-title font-semibold mb-4">Button Variants</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="success">Success</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </div>

      <div>
        <h3 className="text-title font-semibold mb-4">Button Sizes</h3>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">🎯</Button>
        </div>
      </div>

      <div>
        <h3 className="text-title font-semibold mb-4">Button States</h3>
        <div className="flex flex-wrap gap-4">
          <Button>Normal</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <Button leftIcon="✨">With Icon</Button>
        </div>
      </div>

      <div>
        <h3 className="text-title font-semibold mb-4">Without Animation</h3>
        <div className="flex flex-wrap gap-4">
          <Button animated={false}>No Animation</Button>
          <Button animated={false} variant="secondary">No Animation</Button>
        </div>
      </div>
    </div>
  ),
};

/**
 * Card Variants
 *
 * All card variants in the current theme.
 */
export const CardVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Default Card" subtitle="Standard card variant">
          <p>This is the default card style with a title and subtitle.</p>
        </Card>

        <Card variant="elevated" title="Elevated Card" subtitle="With shadow">
          <p>This card has an elevated shadow effect.</p>
        </Card>

        <Card variant="outlined" title="Outlined Card" subtitle="Border only">
          <p>This card has only an outline border, no fill.</p>
        </Card>

        <Card variant="filled" title="Filled Card" subtitle="Muted background">
          <p>This card has a muted background fill.</p>
        </Card>
      </div>

      <div>
        <h3 className="text-title font-semibold mb-4">Interactive Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card interactive title="Click Me" icon="👆">
            <p>Hover and click to see the interaction.</p>
          </Card>
          <Card interactive variant="elevated" title="Hover Effect" icon="✨">
            <p>Watch the shadow grow on hover.</p>
          </Card>
          <Card interactive variant="filled" title="Press Effect" icon="🎯">
            <p>Feel the press feedback.</p>
          </Card>
        </div>
      </div>
    </div>
  ),
};

/**
 * Input Variants
 *
 * All input variants and states in the current theme.
 */
export const InputVariants: Story = {
  render: () => (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-title font-semibold mb-4">Input Variants</h3>
        <div className="space-y-4">
          <Input variant="outlined" placeholder="Outlined input (default)" />
          <Input variant="filled" placeholder="Filled input" />
          <Input variant="underlined" placeholder="Underlined input" />
        </div>
      </div>

      <div>
        <h3 className="text-title font-semibold mb-4">Input Sizes</h3>
        <div className="space-y-4">
          <Input inputSize="sm" placeholder="Small input" />
          <Input inputSize="md" placeholder="Medium input (default)" />
          <Input inputSize="lg" placeholder="Large input" />
        </div>
      </div>

      <div>
        <h3 className="text-title font-semibold mb-4">Input States</h3>
        <div className="space-y-4">
          <Input placeholder="Normal input" />
          <Input placeholder="Disabled input" disabled />
          <Input placeholder="Error state" error />
          <Input type="password" placeholder="Password input" />
        </div>
      </div>
    </div>
  ),
};

/**
 * Progress Variants
 *
 * All progress bar variants in the current theme.
 */
export const ProgressVariants: Story = {
  render: () => (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-title font-semibold mb-4">Progress Variants</h3>
        <div className="space-y-4">
          <Progress value={40} label="Default" showLabel />
          <Progress value={60} variant="gradient" label="Gradient" showLabel />
          <Progress value={50} variant="striped" label="Striped" showLabel />
          <Progress value={70} variant="animated" label="Animated" showLabel />
        </div>
      </div>

      <div>
        <h3 className="text-title font-semibold mb-4">Progress Colors</h3>
        <div className="space-y-4">
          <Progress value={80} color="primary" label="Primary" showLabel />
          <Progress value={90} color="success" label="Success" showLabel />
          <Progress value={45} color="warning" label="Warning" showLabel />
          <Progress value={25} color="error" label="Error" showLabel />
          <Progress value={60} color="info" label="Info" showLabel />
        </div>
      </div>

      <div>
        <h3 className="text-title font-semibold mb-4">Progress Sizes</h3>
        <div className="space-y-4">
          <Progress value={70} size="sm" label="Small" showLabel />
          <Progress value={70} size="md" label="Medium" showLabel />
          <Progress value={70} size="lg" label="Large" showLabel />
        </div>
      </div>

      <div>
        <h3 className="text-title font-semibold mb-4">Celebration on Complete</h3>
        <Progress value={100} celebrateOnComplete label="Complete!" showLabel />
      </div>
    </div>
  ),
};

/**
 * Achievement Badges
 *
 * Achievement badge styles for gamification.
 */
export const AchievementBadges: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-title font-semibold mb-4">Rarity Levels</h3>
        <AchievementGrid>
          <AchievementBadge name="Common" icon="⭐" rarity="common" unlocked />
          <AchievementBadge name="Uncommon" icon="🌟" rarity="uncommon" unlocked />
          <AchievementBadge name="Rare" icon="💫" rarity="rare" unlocked />
          <AchievementBadge name="Epic" icon="🔮" rarity="epic" unlocked />
          <AchievementBadge name="Legendary" icon="👑" rarity="legendary" unlocked />
        </AchievementGrid>
      </div>

      <div>
        <h3 className="text-title font-semibold mb-4">Badge Sizes</h3>
        <div className="flex items-end gap-6">
          <AchievementBadge name="Small" icon="🎯" size="sm" unlocked />
          <AchievementBadge name="Medium" icon="🎯" size="md" unlocked />
          <AchievementBadge name="Large" icon="🎯" size="lg" unlocked />
          <AchievementBadge name="X-Large" icon="🎯" size="xl" unlocked />
        </div>
      </div>

      <div>
        <h3 className="text-title font-semibold mb-4">Badge Styles</h3>
        <div className="flex gap-8">
          <AchievementBadge
            name="Playful"
            description="Fun and bouncy"
            icon="🎈"
            style="playful"
            rarity="rare"
            unlocked
          />
          <AchievementBadge
            name="Badge"
            description="Classic style"
            icon="🏅"
            style="badge"
            rarity="rare"
            unlocked
          />
          <AchievementBadge
            name="Minimal"
            description="Clean look"
            icon="✓"
            style="minimal"
            rarity="rare"
            unlocked
          />
        </div>
      </div>

      <div>
        <h3 className="text-title font-semibold mb-4">Locked Badges with Progress</h3>
        <AchievementGrid>
          <AchievementBadge name="25% Progress" icon="🔒" unlocked={false} progress={25} />
          <AchievementBadge name="50% Progress" icon="🔒" unlocked={false} progress={50} />
          <AchievementBadge name="75% Progress" icon="🔒" unlocked={false} progress={75} />
          <AchievementBadge name="Almost There" icon="🔒" unlocked={false} progress={95} />
        </AchievementGrid>
      </div>
    </div>
  ),
};

/**
 * Sensory Profile Integration
 *
 * Demonstrates how the theme adapts to different accessibility settings.
 */
export const SensoryProfileIntegration: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="p-4 bg-info/10 border border-info rounded-[var(--radius-card)]">
        <h3 className="text-title font-semibold mb-2">How to Test</h3>
        <p className="text-body">
          Use the toolbar buttons at the top to toggle:
        </p>
        <ul className="list-disc list-inside mt-2 text-body">
          <li><strong>High Contrast</strong> - Increases color contrast for better visibility</li>
          <li><strong>Dyslexia Font</strong> - Switches to a dyslexia-friendly typeface</li>
          <li><strong>Reduced Motion</strong> - Disables all animations</li>
          <li><strong>Large Text</strong> - Increases text size by 20%</li>
        </ul>
      </div>

      <ComponentShowcase />
    </div>
  ),
};
