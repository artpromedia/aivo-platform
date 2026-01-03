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
export declare const parentCopy: {
    readonly whyThis: {
        readonly title: {
            readonly activity: "Why Aivo chose this activity";
            readonly recommendation: "Why we suggest this";
            readonly difficultyChange: "About this adjustment";
            readonly planChange: "About today's learning plan";
        };
        readonly fallback: {
            readonly noDetails: "Aivo used your child's recent work and learning goals to choose this activity. Detailed explanations aren't available for this one yet.";
            readonly noExplanation: "We don't have a detailed explanation for this yet. Aivo used recent activity and goals to make this choice.";
            readonly stillLearning: "We're still getting to know your learner. After a few sessions, we'll show more detailed insights here.";
        };
        readonly intro: {
            readonly contentSelection: "We chose this activity because";
            readonly difficultyAdjustment: "We adjusted the difficulty because";
            readonly planUpdate: "We updated today's plan because";
            readonly focusBreak: "We suggested a break because";
        };
    };
    readonly disclaimer: {
        readonly aiLimits: "Aivo uses AI to support learning. It can make mistakes and is not a medical or diagnostic tool.";
        readonly suggestions: "Aivo's suggestions are based on patterns in your child's recent work. They may not always be perfect.";
        readonly partnership: "You know your child best. These suggestions work best when combined with your own observations.";
        readonly notDiagnostic: "Aivo is an educational tool, not a diagnostic system. It cannot identify or diagnose learning differences.";
    };
    readonly emptyState: {
        readonly noActivity: "We're still getting to know your learner. After a few sessions, we'll show more detailed insights here.";
        readonly noProgress: "Progress data will appear here after your child completes some activities. Every bit of practice helps build skills!";
        readonly noInsights: "We're gathering information to provide helpful insights. Check back soon!";
    };
    readonly error: {
        readonly loadFailed: "We couldn't load the explanation right now. The activity will still work normally. Please try again later.";
        readonly generic: "Something went wrong on our end. Please try again in a moment.";
        readonly offline: "It looks like you're offline. Please check your connection and try again.";
    };
    readonly encouragement: {
        readonly progress: "Keep up the great work!";
        readonly practice: "Every bit of practice helps build skills.";
        readonly patience: "Learning takes time, and that's okay.";
        readonly journey: "Progress isn't always a straight line, and that's perfectly normal.";
        readonly effort: "Effort and practice are what matter most.";
    };
};
export declare const teacherCopy: {
    readonly whyThis: {
        readonly title: {
            readonly recommendation: "How this recommendation was decided";
            readonly difficultyChange: "Difficulty adjustment details";
            readonly planChange: "Plan modification details";
            readonly intervention: "Suggested intervention rationale";
        };
        readonly fallback: {
            readonly noDetails: "This recommendation is based on recent learner activity and assessment data. Detailed reasoning is not available for this suggestion.";
            readonly noExplanation: "Detailed explanation data isn't available. The suggestion is based on patterns in the learner's recent work.";
        };
        readonly intro: {
            readonly contentSelection: "This content was selected because";
            readonly difficultyAdjustment: "The difficulty was adjusted because";
            readonly grouping: "This grouping is suggested because";
            readonly pacing: "This pacing adjustment is suggested because";
        };
    };
    readonly disclaimer: {
        readonly professionalJudgment: "Use your professional judgment. Aivo's suggestions are one input among many.";
        readonly dataLimits: "These insights are based on available data and may not capture the full picture of student learning.";
        readonly notPrescriptive: "These are suggestions, not prescriptions. You know your students best.";
        readonly supplementary: "AI-generated insights should supplement, not replace, your professional expertise and direct observations.";
    };
    readonly emptyState: {
        readonly noData: "We don't have enough data yet to provide insights. After students complete a few activities, recommendations will appear here.";
        readonly noRecommendations: "No specific recommendations at this time. Continue with your planned instruction.";
        readonly newStudent: "We're still gathering data for this student. Insights will become available as they complete more activities.";
    };
    readonly error: {
        readonly loadFailed: "We couldn't load the recommendation details. Please try refreshing the page.";
        readonly syncFailed: "Unable to sync the latest data. The information shown may not be current.";
    };
    readonly dataQuality: {
        readonly highConfidence: "Based on substantial recent activity data";
        readonly mediumConfidence: "Based on limited recent data";
        readonly lowConfidence: "Based on minimal data—interpret with caution";
        readonly staleData: "Based on data that may be outdated";
    };
};
export declare const adminCopy: {
    readonly modelCard: {
        readonly disclaimer: "This system uses machine learning models. They may reflect biases in their training data. Aivo uses safety measures and policies to reduce harm, but residual risks remain.";
        readonly limitations: {
            readonly intro: "This model has the following known limitations:";
            readonly bias: "May reflect biases present in training data";
            readonly context: "Performance may vary across different contexts and populations";
            readonly notDiagnostic: "Not designed for diagnostic or clinical purposes";
        };
        readonly safetyMeasures: {
            readonly intro: "Safety measures in place:";
            readonly contentFiltering: "Content is filtered for age-appropriateness";
            readonly guardrails: "Guardrails prevent discussion of harmful topics";
            readonly humanReview: "Flagged interactions receive human review";
        };
    };
    readonly audit: {
        readonly title: {
            readonly learner: "Learner Change History";
            readonly policy: "Policy Change Log";
            readonly system: "System Activity Log";
        };
        readonly emptyState: {
            readonly noChanges: "No changes recorded for this time period.";
            readonly noAuditData: "Audit data is not available for this entity.";
        };
        readonly actorTypes: {
            readonly user: "User";
            readonly system: "System";
            readonly agent: "AI Agent";
        };
    };
    readonly compliance: {
        readonly disclaimer: "This dashboard provides an overview of AI system activity for compliance purposes. It does not constitute legal advice.";
        readonly dataRetention: "Data shown is subject to retention policies and may not include historical records beyond the retention period.";
    };
    readonly error: {
        readonly loadFailed: "Unable to load data. Please try again or contact support if the issue persists.";
        readonly unauthorized: "You don't have permission to view this information.";
        readonly notFound: "The requested information could not be found.";
    };
};
export declare const sharedCopy: {
    readonly actionTypes: {
        readonly contentSelection: "Activity Selection";
        readonly difficultyChange: "Difficulty Adjustment";
        readonly focusBreak: "Break Suggestion";
        readonly planUpdate: "Plan Update";
        readonly moduleRecommendation: "Module Recommendation";
        readonly scaffolding: "Support Adjustment";
    };
    readonly difficulty: {
        readonly increased: "moved to more challenging content";
        readonly decreased: "adjusted to build stronger foundations";
        readonly maintained: "continuing at the current level";
        readonly descriptions: {
            readonly increase: "Building on recent success, we're introducing more challenging content.";
            readonly decrease: "Taking time to strengthen foundational skills before moving forward.";
            readonly maintain: "Continuing practice at the current level to build confidence.";
        };
    };
    readonly time: {
        readonly justNow: "Just now";
        readonly minutesAgo: (n: number) => string;
        readonly hoursAgo: (n: number) => string;
        readonly daysAgo: (n: number) => string;
        readonly today: "Today";
        readonly yesterday: "Yesterday";
    };
    readonly loading: "Loading...";
    readonly tryAgain: "Try Again";
    readonly learnMore: "Learn More";
    readonly viewDetails: "View Details";
    readonly viewExplanation: "View Explanation";
    readonly close: "Close";
    readonly dismiss: "Dismiss";
};
/**
 * Phrases that should never appear in user-facing copy.
 * Used by copy lint tests to catch violations.
 */
export declare const bannedPhrases: {
    readonly negativeLabels: readonly ["lazy", "bad student", "stupid", "dumb", "slow learner", "not smart", "incapable", "hopeless", "worthless"];
    readonly comparativeJudgments: readonly ["behind others", "behind grade level", "below average", "worse than", "failing compared", "not keeping up", "falling behind", "lagging"];
    readonly diagnosticLanguage: readonly ["has adhd", "has add", "is autistic", "is dyslexic", "learning disabled", "mentally", "disorder", "deficit", "syndrome", "diagnosis", "diagnosed with", "suffers from"];
    readonly fearInducing: readonly ["urgent action required", "critical failure", "emergency", "danger", "crisis", "severe", "alarming"];
    readonly absolutistNegative: readonly ["can't learn", "won't ever", "impossible for", "never able", "always fails", "always struggles"];
};
/**
 * Flattened list of all banned phrases for easy checking
 */
export declare const allBannedPhrases: readonly string[];
export type ParentCopy = typeof parentCopy;
export type TeacherCopy = typeof teacherCopy;
export type AdminCopy = typeof adminCopy;
export type SharedCopy = typeof sharedCopy;
//# sourceMappingURL=copy.d.ts.map