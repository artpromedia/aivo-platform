/**
 * Explainability Copy Constants
 *
 * Centralized, neurodiversity-aware copy strings for explainability features.
 * These strings follow the guidelines in docs/explainability/copy_guidelines.md
 *
 * Principles:
 * - Growth-oriented language
 * - Non-pathologizing
 * - Honest about AI limitations
 * - Partnership framing
 */

// ══════════════════════════════════════════════════════════════════════════════
// PARENT APP COPY
// ══════════════════════════════════════════════════════════════════════════════

export const parentCopy = {
  // Why This - Activity explanations
  whyThis: {
    title: {
      activity: 'Why Aivo chose this activity',
      recommendation: 'Why we suggest this',
      difficultyChange: 'About this adjustment',
      planChange: "About today's learning plan",
    },
    fallback: {
      noDetails:
        "Aivo used your child's recent work and learning goals to choose this activity. Detailed explanations aren't available for this one yet.",
      noExplanation:
        "We don't have a detailed explanation for this yet. Aivo used recent activity and goals to make this choice.",
      stillLearning:
        "We're still getting to know your learner. After a few sessions, we'll show more detailed insights here.",
    },
    intro: {
      contentSelection: 'We chose this activity because',
      difficultyAdjustment: 'We adjusted the difficulty because',
      planUpdate: "We updated today's plan because",
      focusBreak: 'We suggested a break because',
    },
  },

  // Disclaimers
  disclaimer: {
    aiLimits:
      'Aivo uses AI to support learning. It can make mistakes and is not a medical or diagnostic tool.',
    suggestions:
      "Aivo's suggestions are based on patterns in your child's recent work. They may not always be perfect.",
    partnership:
      'You know your child best. These suggestions work best when combined with your own observations.',
    notDiagnostic:
      'Aivo is an educational tool, not a diagnostic system. It cannot identify or diagnose learning differences.',
  },

  // Empty states
  emptyState: {
    noActivity:
      "We're still getting to know your learner. After a few sessions, we'll show more detailed insights here.",
    noProgress:
      "Progress data will appear here after your child completes some activities. Every bit of practice helps build skills!",
    noInsights:
      "We're gathering information to provide helpful insights. Check back soon!",
  },

  // Error states
  error: {
    loadFailed:
      "We couldn't load the explanation right now. The activity will still work normally. Please try again later.",
    generic:
      'Something went wrong on our end. Please try again in a moment.',
    offline:
      "It looks like you're offline. Please check your connection and try again.",
  },

  // Encouragement
  encouragement: {
    progress: 'Keep up the great work!',
    practice: 'Every bit of practice helps build skills.',
    patience: "Learning takes time, and that's okay.",
    journey: "Progress isn't always a straight line, and that's perfectly normal.",
    effort: 'Effort and practice are what matter most.',
  },
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER APP COPY
// ══════════════════════════════════════════════════════════════════════════════

export const teacherCopy = {
  // Why This - Recommendations
  whyThis: {
    title: {
      recommendation: 'How this recommendation was decided',
      difficultyChange: 'Difficulty adjustment details',
      planChange: 'Plan modification details',
      intervention: 'Suggested intervention rationale',
    },
    fallback: {
      noDetails:
        'This recommendation is based on recent learner activity and assessment data. Detailed reasoning is not available for this suggestion.',
      noExplanation:
        "Detailed explanation data isn't available. The suggestion is based on patterns in the learner's recent work.",
    },
    intro: {
      contentSelection: 'This content was selected because',
      difficultyAdjustment: 'The difficulty was adjusted because',
      grouping: 'This grouping is suggested because',
      pacing: 'This pacing adjustment is suggested because',
    },
  },

  // Disclaimers
  disclaimer: {
    professionalJudgment:
      "Use your professional judgment. Aivo's suggestions are one input among many.",
    dataLimits:
      'These insights are based on available data and may not capture the full picture of student learning.',
    notPrescriptive:
      'These are suggestions, not prescriptions. You know your students best.',
    supplementary:
      'AI-generated insights should supplement, not replace, your professional expertise and direct observations.',
  },

  // Empty states
  emptyState: {
    noData:
      "We don't have enough data yet to provide insights. After students complete a few activities, recommendations will appear here.",
    noRecommendations:
      'No specific recommendations at this time. Continue with your planned instruction.',
    newStudent:
      "We're still gathering data for this student. Insights will become available as they complete more activities.",
  },

  // Error states
  error: {
    loadFailed:
      "We couldn't load the recommendation details. Please try refreshing the page.",
    syncFailed:
      'Unable to sync the latest data. The information shown may not be current.',
  },

  // Data quality indicators
  dataQuality: {
    highConfidence: 'Based on substantial recent activity data',
    mediumConfidence: 'Based on limited recent data',
    lowConfidence: 'Based on minimal data—interpret with caution',
    staleData: 'Based on data that may be outdated',
  },
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN APP COPY (District & Platform)
// ══════════════════════════════════════════════════════════════════════════════

export const adminCopy = {
  // Model cards
  modelCard: {
    disclaimer:
      'This system uses machine learning models. They may reflect biases in their training data. Aivo uses safety measures and policies to reduce harm, but residual risks remain.',
    limitations: {
      intro: 'This model has the following known limitations:',
      bias: 'May reflect biases present in training data',
      context: 'Performance may vary across different contexts and populations',
      notDiagnostic: 'Not designed for diagnostic or clinical purposes',
    },
    safetyMeasures: {
      intro: 'Safety measures in place:',
      contentFiltering: 'Content is filtered for age-appropriateness',
      guardrails: 'Guardrails prevent discussion of harmful topics',
      humanReview: 'Flagged interactions receive human review',
    },
  },

  // Audit
  audit: {
    title: {
      learner: 'Learner Change History',
      policy: 'Policy Change Log',
      system: 'System Activity Log',
    },
    emptyState: {
      noChanges: 'No changes recorded for this time period.',
      noAuditData: 'Audit data is not available for this entity.',
    },
    actorTypes: {
      user: 'User',
      system: 'System',
      agent: 'AI Agent',
    },
  },

  // Compliance
  compliance: {
    disclaimer:
      'This dashboard provides an overview of AI system activity for compliance purposes. It does not constitute legal advice.',
    dataRetention:
      'Data shown is subject to retention policies and may not include historical records beyond the retention period.',
  },

  // Error states
  error: {
    loadFailed: 'Unable to load data. Please try again or contact support if the issue persists.',
    unauthorized: "You don't have permission to view this information.",
    notFound: 'The requested information could not be found.',
  },
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// SHARED COPY (used across multiple apps)
// ══════════════════════════════════════════════════════════════════════════════

export const sharedCopy = {
  // Action types (human-readable)
  actionTypes: {
    contentSelection: 'Activity Selection',
    difficultyChange: 'Difficulty Adjustment',
    focusBreak: 'Break Suggestion',
    planUpdate: 'Plan Update',
    moduleRecommendation: 'Module Recommendation',
    scaffolding: 'Support Adjustment',
  },

  // Difficulty descriptions (non-judgmental)
  difficulty: {
    increased: 'moved to more challenging content',
    decreased: 'adjusted to build stronger foundations',
    maintained: 'continuing at the current level',
    descriptions: {
      increase: "Building on recent success, we're introducing more challenging content.",
      decrease:
        'Taking time to strengthen foundational skills before moving forward.',
      maintain: 'Continuing practice at the current level to build confidence.',
    },
  },

  // Time references
  time: {
    justNow: 'Just now',
    minutesAgo: (n: number) => `${n} minute${n === 1 ? '' : 's'} ago`,
    hoursAgo: (n: number) => `${n} hour${n === 1 ? '' : 's'} ago`,
    daysAgo: (n: number) => `${n} day${n === 1 ? '' : 's'} ago`,
    today: 'Today',
    yesterday: 'Yesterday',
  },

  // Generic states
  loading: 'Loading...',
  tryAgain: 'Try Again',
  learnMore: 'Learn More',
  viewDetails: 'View Details',
  viewExplanation: 'View Explanation',
  close: 'Close',
  dismiss: 'Dismiss',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// BANNED PHRASES (for lint testing)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Phrases that should never appear in user-facing copy.
 * Used by copy lint tests to catch violations.
 */
export const bannedPhrases = {
  // Negative labels
  negativeLabels: [
    'lazy',
    'bad student',
    'stupid',
    'dumb',
    'slow learner',
    'not smart',
    'incapable',
    'hopeless',
    'worthless',
  ],

  // Comparative judgments
  comparativeJudgments: [
    'behind others',
    'behind grade level',
    'below average',
    'worse than',
    'failing compared',
    'not keeping up',
    'falling behind',
    'lagging',
  ],

  // Diagnostic language
  diagnosticLanguage: [
    'has adhd',
    'has add',
    'is autistic',
    'is dyslexic',
    'learning disabled',
    'mentally',
    'disorder',
    'deficit',
    'syndrome',
    'diagnosis',
    'diagnosed with',
    'suffers from',
  ],

  // Fear-inducing
  fearInducing: [
    'urgent action required',
    'critical failure',
    'emergency',
    'danger',
    'crisis',
    'severe',
    'alarming',
  ],

  // Absolutist negative
  absolutistNegative: [
    "can't learn",
    "won't ever",
    'impossible for',
    'never able',
    'always fails',
    'always struggles',
  ],
} as const;

/**
 * Flattened list of all banned phrases for easy checking
 */
export const allBannedPhrases: readonly string[] = [
  ...bannedPhrases.negativeLabels,
  ...bannedPhrases.comparativeJudgments,
  ...bannedPhrases.diagnosticLanguage,
  ...bannedPhrases.fearInducing,
  ...bannedPhrases.absolutistNegative,
];

// ══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export type ParentCopy = typeof parentCopy;
export type TeacherCopy = typeof teacherCopy;
export type AdminCopy = typeof adminCopy;
export type SharedCopy = typeof sharedCopy;
