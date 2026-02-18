/**
 * Content Moderation Service
 *
 * Filters messages for inappropriate content in a K-12 education context.
 * Implements a multi-layer approach:
 *   1. Profanity / slur word list (built-in, fast)
 *   2. Pattern-based detection (harassment, bullying, threats)
 *   3. Severity classification (info, warning, block)
 *
 * COPPA / CIPA compliance: Schools receiving E-Rate funding must implement
 * content filtering. This service provides the messaging layer's contribution.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ModerationCategory =
  | 'PROFANITY'
  | 'HARASSMENT'
  | 'THREAT'
  | 'HATE_SPEECH'
  | 'SEXUAL_CONTENT'
  | 'SELF_HARM'
  | 'SPAM';

export type ModerationAction = 'allow' | 'flag' | 'block';

export interface ModerationMatch {
  category: ModerationCategory;
  pattern: string; // The matched pattern description (NOT the offensive content)
  severity: 'low' | 'medium' | 'high';
}

export interface ModerationResult {
  action: ModerationAction;
  matches: ModerationMatch[];
  /** Whether the message should be blocked from sending */
  blocked: boolean;
  /** Whether the message was flagged for review */
  flagged: boolean;
  /** Human-readable reason if blocked */
  reason?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// WORD LISTS
// These lists are intentionally minimal/hashed — not storing explicit slurs
// in source code. In production, load from a managed blocklist service.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Mild profanity — flagged but not blocked (teachers/parents may use informally).
 */
const MILD_PROFANITY = new Set([
  'damn', 'hell', 'crap', 'piss', 'suck', 'sucks', 'ass',
]);

/**
 * Strong profanity — blocked in K-12 messaging context.
 */
const STRONG_PROFANITY = new Set([
  'fuck', 'fucking', 'fucker', 'shit', 'shitty', 'bitch', 'bitches',
  'bastard', 'asshole', 'assholes', 'dickhead', 'motherfucker',
  'wtf', 'stfu', 'bullshit',
]);

/**
 * Slurs and hate speech terms — always blocked.
 */
const HATE_TERMS = new Set([
  'n-word', 'f-word-slur', // Placeholder keys — actual slurs loaded from config
]);

// ══════════════════════════════════════════════════════════════════════════════
// PATTERN-BASED DETECTION
// ══════════════════════════════════════════════════════════════════════════════

interface ContentPattern {
  category: ModerationCategory;
  regex: RegExp;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

const CONTENT_PATTERNS: ContentPattern[] = [
  // Threat patterns
  {
    category: 'THREAT',
    regex: /\b(i('ll|m\s+going\s+to)\s+(kill|hurt|beat\s+up|shoot|stab|punch))\b/gi,
    severity: 'high',
    description: 'Violent threat language',
  },
  {
    category: 'THREAT',
    regex: /\b(bring\s+a\s+(gun|knife|weapon))\b/gi,
    severity: 'high',
    description: 'Weapon threat',
  },

  // Harassment / bullying patterns
  {
    category: 'HARASSMENT',
    regex: /\b(you('re|\s+are)\s+(stupid|dumb|ugly|worthless|pathetic|an?\s+idiot))\b/gi,
    severity: 'medium',
    description: 'Direct insult / bullying language',
  },
  {
    category: 'HARASSMENT',
    regex: /\b(shut\s+up|go\s+away|nobody\s+likes\s+you|loser)\b/gi,
    severity: 'low',
    description: 'Dismissive / bullying language',
  },

  // Self-harm indicators (flagged for review, not blocked)
  {
    category: 'SELF_HARM',
    regex: /\b(want\s+to\s+die|kill\s+myself|suicide|self[- ]?harm|cutting\s+myself)\b/gi,
    severity: 'high',
    description: 'Self-harm indicator — requires welfare check',
  },

  // Spam patterns
  {
    category: 'SPAM',
    regex: /\b(buy\s+now|click\s+here|free\s+money|act\s+fast|limited\s+time)\b/gi,
    severity: 'low',
    description: 'Spam language',
  },
  {
    category: 'SPAM',
    regex: /(https?:\/\/\S+){3,}/gi,
    severity: 'medium',
    description: 'Multiple URLs (potential spam)',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Moderate a message's text content.
 *
 * Returns a result indicating whether the message should be allowed,
 * flagged for review, or blocked entirely.
 */
export function moderateContent(content: string): ModerationResult {
  if (!content || content.trim().length === 0) {
    return { action: 'allow', matches: [], blocked: false, flagged: false };
  }

  const matches: ModerationMatch[] = [];
  const words = content.toLowerCase().split(/\s+/);

  // ── Word-list checks ────────────────────────────────────────────────────
  for (const word of words) {
    // Strip common punctuation from word edges
    const cleaned = word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
    if (!cleaned) continue;

    if (STRONG_PROFANITY.has(cleaned)) {
      matches.push({
        category: 'PROFANITY',
        pattern: 'Strong profanity detected',
        severity: 'high',
      });
    } else if (MILD_PROFANITY.has(cleaned)) {
      matches.push({
        category: 'PROFANITY',
        pattern: 'Mild profanity detected',
        severity: 'low',
      });
    }

    if (HATE_TERMS.has(cleaned)) {
      matches.push({
        category: 'HATE_SPEECH',
        pattern: 'Hate speech term detected',
        severity: 'high',
      });
    }
  }

  // ── Pattern-based checks ────────────────────────────────────────────────
  for (const pattern of CONTENT_PATTERNS) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(content)) {
      matches.push({
        category: pattern.category,
        pattern: pattern.description,
        severity: pattern.severity,
      });
    }
  }

  // Deduplicate matches by category+severity
  const uniqueMatches = deduplicateMatches(matches);

  // Determine action
  const { action, reason } = determineAction(uniqueMatches);

  return {
    action,
    matches: uniqueMatches,
    blocked: action === 'block',
    flagged: action === 'flag' || action === 'block',
    reason,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function deduplicateMatches(matches: ModerationMatch[]): ModerationMatch[] {
  const seen = new Set<string>();
  return matches.filter((m) => {
    const key = `${m.category}:${m.severity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function determineAction(
  matches: ModerationMatch[]
): { action: ModerationAction; reason?: string } {
  if (matches.length === 0) {
    return { action: 'allow' };
  }

  // Any high-severity match → block
  const highSeverity = matches.find((m) => m.severity === 'high');
  if (highSeverity) {
    // Self-harm should be flagged, not blocked — we want the message to go through
    // so counselors can see it and respond
    if (highSeverity.category === 'SELF_HARM') {
      return {
        action: 'flag',
        reason: 'Message flagged for welfare review: self-harm indicators detected',
      };
    }

    return {
      action: 'block',
      reason: `Message blocked: ${highSeverity.pattern}`,
    };
  }

  // Multiple medium-severity matches → block
  const mediumMatches = matches.filter((m) => m.severity === 'medium');
  if (mediumMatches.length >= 2) {
    return {
      action: 'block',
      reason: 'Message blocked: multiple content policy violations',
    };
  }

  // Single medium or any low → flag for review
  return {
    action: 'flag',
    reason: `Message flagged for review: ${matches[0].pattern}`,
  };
}
