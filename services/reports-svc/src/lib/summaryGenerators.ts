/**
 * Helper functions for generating plain-language summaries.
 * Converts technical data into parent-friendly text.
 */

// ══════════════════════════════════════════════════════════════════════════════
// BASELINE SUMMARIES
// ══════════════════════════════════════════════════════════════════════════════

export function generateBaselineStatusText(status: string, completedAt: string | null): string {
  switch (status) {
    case 'NOT_STARTED':
      return 'Your child has not yet started the baseline assessment.';
    case 'IN_PROGRESS':
      return 'Your child is currently working through the baseline assessment.';
    case 'FINAL_ACCEPTED':
    case 'COMPLETED':
      if (completedAt) {
        const date = new Date(completedAt).toLocaleDateString();
        return `Baseline assessment completed on ${date}.`;
      }
      return 'Baseline assessment is complete.';
    case 'RETEST_ALLOWED':
      return 'A retest has been requested for the baseline assessment.';
    default:
      return 'Baseline status is being determined.';
  }
}

export function generateDomainSummary(domain: string, score: number, maxScore: number): string {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const domainName = getDomainDisplayName(domain);

  if (percentage >= 80) {
    return `Strong foundation in ${domainName}.`;
  } else if (percentage >= 60) {
    return `Good progress in ${domainName} with room to grow.`;
  } else if (percentage >= 40) {
    return `Building skills in ${domainName}.`;
  } else {
    return `${domainName} is an area of focus for growth.`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// VIRTUAL BRAIN SUMMARIES
// ══════════════════════════════════════════════════════════════════════════════

export function generateVirtualBrainSummary(strengthCount: number, focusCount: number): string {
  if (strengthCount === 0 && focusCount === 0) {
    return 'Learning profile is being established as your child completes activities.';
  }

  if (strengthCount > focusCount) {
    return `Your child shows strengths across multiple areas. Learning activities will build on these while developing focus areas.`;
  } else if (focusCount > strengthCount) {
    return `Several areas have been identified for focused practice. Personalized activities will help build these skills.`;
  } else {
    return `Your child's learning profile shows a balance of strengths and areas for growth.`;
  }
}

export function generateSkillStrengthText(skill: string, masteryLevel: number): string {
  if (masteryLevel >= 8) {
    return `Excellent mastery of ${skill}.`;
  } else if (masteryLevel >= 6) {
    return `Strong understanding of ${skill}.`;
  } else {
    return `Good progress in ${skill}.`;
  }
}

export function generateSkillFocusText(skill: string, masteryLevel: number): string {
  if (masteryLevel < 3) {
    return `${skill} is a new skill to develop.`;
  } else if (masteryLevel < 5) {
    return `Building foundation in ${skill}.`;
  } else {
    return `${skill} is improving with practice.`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GOAL SUMMARIES
// ══════════════════════════════════════════════════════════════════════════════

export function generateGoalProgressText(
  progressRating: number | null,
  objectivesCompleted: number,
  totalObjectives: number
): string {
  // Progress rating is 0-4 scale
  if (progressRating !== null) {
    if (progressRating >= 4) {
      return 'Excellent progress, nearly complete!';
    } else if (progressRating >= 3) {
      return 'Good progress, on track.';
    } else if (progressRating >= 2) {
      return 'Making steady progress.';
    } else if (progressRating >= 1) {
      return 'Getting started, early progress.';
    } else {
      return 'Just beginning this goal.';
    }
  }

  // Fall back to objectives-based summary
  if (totalObjectives === 0) {
    return 'Working on this goal.';
  }

  const percentage = (objectivesCompleted / totalObjectives) * 100;
  if (percentage >= 75) {
    return `${objectivesCompleted} of ${totalObjectives} milestones complete. Almost there!`;
  } else if (percentage >= 50) {
    return `${objectivesCompleted} of ${totalObjectives} milestones complete. Good progress.`;
  } else if (percentage >= 25) {
    return `${objectivesCompleted} of ${totalObjectives} milestones complete. Building momentum.`;
  } else {
    return `${objectivesCompleted} of ${totalObjectives} milestones complete. Just getting started.`;
  }
}

export function generateGoalsOverallSummary(activeCount: number, completedCount: number): string {
  if (activeCount === 0 && completedCount === 0) {
    return 'No goals have been set yet. Goals help track progress toward specific learning outcomes.';
  }

  if (completedCount > 0 && activeCount > 0) {
    return `${completedCount} goal${completedCount > 1 ? 's' : ''} completed! Currently working on ${activeCount} active goal${activeCount > 1 ? 's' : ''}.`;
  } else if (completedCount > 0) {
    return `Great work! ${completedCount} goal${completedCount > 1 ? 's have' : ' has'} been completed.`;
  } else {
    return `Working toward ${activeCount} learning goal${activeCount > 1 ? 's' : ''}.`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HOMEWORK SUMMARIES
// ══════════════════════════════════════════════════════════════════════════════

export function generateHomeworkSummary(
  sessionsPerWeek: number,
  independenceScore: number,
  totalSessions: number
): string {
  if (totalSessions === 0) {
    return 'No homework helper sessions recorded yet.';
  }

  const parts: string[] = [];

  // Frequency
  if (sessionsPerWeek >= 4) {
    parts.push('Using homework helper regularly.');
  } else if (sessionsPerWeek >= 2) {
    parts.push('Good engagement with homework helper.');
  } else if (sessionsPerWeek >= 1) {
    parts.push('Starting to use homework helper.');
  } else {
    parts.push('Light homework helper usage this period.');
  }

  // Independence
  if (independenceScore >= 0.8) {
    parts.push('Working very independently!');
  } else if (independenceScore >= 0.5) {
    parts.push('Building independence with each session.');
  } else {
    parts.push('Learning to work through problems step by step.');
  }

  return parts.join(' ');
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getDomainDisplayName(domain: string): string {
  const names: Record<string, string> = {
    ELA: 'Reading & Language Arts',
    MATH: 'Mathematics',
    SCIENCE: 'Science',
    SPEECH: 'Speech & Communication',
    SEL: 'Social-Emotional Skills',
    OTHER: 'Other Areas',
  };
  return names[domain] || domain;
}

export { getDomainDisplayName };
