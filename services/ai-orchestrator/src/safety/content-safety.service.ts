/**
 * Content Safety Service
 *
 * 4-layer pipeline that validates ALL AI-generated output before it reaches
 * students (minors). Every layer runs; the result is an aggregate.
 *
 * Layers:
 *   1. Local Pattern Matching — PII, crisis, profanity   (~0 ms)
 *   2. Age-Appropriateness Scoring — Flesch-Kincaid       (~1 ms)
 *   3. FERPA / COPPA Compliance Check                     (~0 ms)
 *   4. Toxicity Scoring — local TF-IDF weighted dict      (~1 ms)
 */

import { createHash } from 'node:crypto';

import type {
  SafetyConfig,
  SafetyContext,
  SafetyFlag,
  SafetyFlagSeverity,
  SafetyResult,
  SafetyValidationParams,
} from './safety.types.js';
import { getSafetyConfig } from './safety-config.js';

// ══════════════════════════════════════════════════════════════════════════════
// PII PATTERNS (Layer 1)
// ══════════════════════════════════════════════════════════════════════════════

const PII_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: 'credit_card', regex: /\b\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}\b/g },
  {
    name: 'phone',
    regex: /\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  },
  {
    name: 'email',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// CRISIS KEYWORDS (Layer 1) — 50+ terms
// ══════════════════════════════════════════════════════════════════════════════

const CRISIS_KEYWORDS: string[] = [
  'suicide', 'suicidal', 'kill myself', 'kill yourself', 'end my life',
  'end your life', 'self-harm', 'self harm', 'cut myself', 'cutting myself',
  'hurt myself', 'hurt yourself', 'want to die', 'wanna die', 'rather be dead',
  'take my life', 'take my own life', 'overdose', 'hang myself',
  'jump off', 'slit my wrists', 'pills to die', 'no reason to live',
  'nobody would miss me', 'better off dead', 'not worth living',
  'child abuse', 'child molest', 'sexual abuse', 'molested', 'trafficking',
  'domestic violence', 'being beaten', 'hits me', 'hurts me at home',
  'touches me', 'inappropriate touching', 'forced me', 'rape', 'raped',
  'school shooting', 'shoot up', 'bomb threat', 'bring a gun',
  'bring a knife', 'stab', 'kill everyone', 'murder', 'mass shooting',
  'white supremacy', 'ethnic cleansing', 'genocide',
  'anorexia', 'bulimia', 'starving myself', 'purging',
  'sell drugs', 'buy drugs', 'get high',
  'run away from home', 'nobody loves me', 'i am worthless',
];

const crisisRegex = new RegExp(
  CRISIS_KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'gi',
);

// ══════════════════════════════════════════════════════════════════════════════
// PROFANITY LIST (Layer 1) — 60 terms
// ══════════════════════════════════════════════════════════════════════════════

const PROFANITY_TERMS: string[] = [
  'fuck', 'fucking', 'fucker', 'fucked', 'motherfucker',
  'shit', 'shitty', 'bullshit', 'horseshit',
  'ass', 'asshole', 'arsehole', 'dumbass', 'jackass', 'badass',
  'bitch', 'bitches', 'bitching', 'son of a bitch',
  'damn', 'goddamn', 'dammit',
  'dick', 'dickhead', 'cock', 'cocksucker',
  'cunt', 'twat', 'pussy',
  'bastard', 'prick', 'wanker', 'tosser',
  'slut', 'whore', 'skank', 'hoe',
  'nigger', 'nigga', 'faggot', 'fag', 'dyke', 'retard', 'retarded',
  'spic', 'chink', 'kike', 'gook', 'wetback', 'beaner',
  'crap', 'piss', 'pissed',
  'boobs', 'tits', 'titties',
  'jerk off', 'jack off', 'blow job', 'handjob',
  'porn', 'pornography', 'xxx',
];

const profanityRegex = new RegExp(
  '\\b(' +
    PROFANITY_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') +
    ')\\b',
  'gi',
);

// ══════════════════════════════════════════════════════════════════════════════
// ADULT THEME PATTERNS (Layer 2)
// ══════════════════════════════════════════════════════════════════════════════

const ADULT_THEME_PATTERNS: RegExp[] = [
  /\b(boyfriend|girlfriend|dating|hookup|hook up|make out|making out)\b/i,
  /\b(sexy|seductive|aroused|orgasm|erotic)\b/i,
  /\b(beer|wine|vodka|whiskey|marijuana|cocaine|heroin|meth)\b/i,
  /\b(gambling|casino|bet money|wager)\b/i,
];

// ══════════════════════════════════════════════════════════════════════════════
// TOXICITY DICTIONARY (Layer 4) — 200-term weighted
// ══════════════════════════════════════════════════════════════════════════════

const TOXICITY_DICT: Record<string, number> = {
  // Hate / identity attacks (0.8 – 1.0)
  hate: 0.9, hatred: 0.9, racist: 1.0, racism: 1.0,
  sexist: 0.95, sexism: 0.95, bigot: 0.9, bigotry: 0.9,
  homophobic: 0.95, transphobic: 0.95, xenophobic: 0.95,
  misogyny: 0.95, misogynist: 0.95,
  supremacist: 1.0, supremacy: 1.0, inferior: 0.8, subhuman: 1.0,
  // Threats / violence (0.7 – 1.0)
  kill: 0.85, murder: 0.95, attack: 0.7, assault: 0.8,
  destroy: 0.6, threaten: 0.8, threat: 0.8,
  strangle: 0.9, stab: 0.9, shoot: 0.85, execute: 0.8,
  torture: 0.95, maim: 0.9, slaughter: 0.95,
  beat: 0.5, punch: 0.6, kick: 0.5, fight: 0.4,
  weapon: 0.7, bomb: 0.85, explosive: 0.85, gun: 0.7, knife: 0.6,
  // Insults (0.4 – 0.8)
  stupid: 0.5, idiot: 0.6, moron: 0.65, dumb: 0.5,
  loser: 0.5, pathetic: 0.55, worthless: 0.65,
  ugly: 0.5, disgusting: 0.55, revolting: 0.5,
  trash: 0.5, garbage: 0.45, useless: 0.5,
  incompetent: 0.5, failure: 0.45, weak: 0.4,
  lame: 0.4, annoying: 0.35, irritating: 0.35,
  creep: 0.5, creepy: 0.5, freak: 0.5, weirdo: 0.5,
  // Profanity / vulgarity (0.5 – 0.9) — duplicates toxicity weight
  fuck: 0.8, shit: 0.7, ass: 0.5, bitch: 0.75,
  damn: 0.4, hell: 0.35, crap: 0.35,
  dick: 0.65, cock: 0.7, pussy: 0.7, cunt: 0.9,
  slut: 0.8, whore: 0.8, bastard: 0.6,
  // Harassment (0.5 – 0.9)
  bully: 0.7, bullying: 0.7, harass: 0.8, harassment: 0.8,
  stalk: 0.8, stalking: 0.8, intimidate: 0.7, intimidation: 0.7,
  humiliate: 0.7, humiliation: 0.7, shame: 0.5, shaming: 0.55,
  mock: 0.5, mocking: 0.5, ridicule: 0.55,
  tease: 0.4, taunt: 0.5, belittle: 0.55,
  exclude: 0.45, ostracize: 0.5, isolate: 0.4,
  // Self-harm / mental health crisis (0.8 – 1.0)
  suicide: 1.0, suicidal: 1.0, selfharm: 1.0,
  overdose: 0.9, cutting: 0.6, depressed: 0.4,
  hopeless: 0.5, worthlessness: 0.6,
  // Sexual content (0.6 – 1.0)
  porn: 0.95, pornography: 0.95, nude: 0.7, naked: 0.6,
  erotic: 0.8, orgasm: 0.9, fetish: 0.85,
  sexy: 0.5, seductive: 0.6, aroused: 0.7,
  // Substance abuse (0.4 – 0.8)
  cocaine: 0.8, heroin: 0.8, meth: 0.8, marijuana: 0.5,
  weed: 0.45, drugs: 0.5, drunk: 0.5, alcohol: 0.4,
  overdosed: 0.9, intoxicated: 0.5, stoned: 0.5,
  // Manipulation / deception (0.3 – 0.6)
  manipulate: 0.5, deceive: 0.5, exploit: 0.55,
  cheat: 0.5, fraud: 0.55, scam: 0.55,
  lie: 0.35, lying: 0.4, dishonest: 0.4,
  // Negative emotional intensifiers (0.2 – 0.5)
  terrible: 0.3, horrible: 0.35, awful: 0.3,
  dreadful: 0.3, abysmal: 0.3, miserable: 0.35,
  atrocious: 0.35, vile: 0.45, wretched: 0.35,
  // Dangerous / illegal behaviour (0.5 – 0.8)
  steal: 0.6, stealing: 0.6, robbery: 0.65, arson: 0.75,
  vandalism: 0.6, trafficking: 0.8, smuggle: 0.7,
  kidnap: 0.85, ransom: 0.7, blackmail: 0.7, extortion: 0.7,
  // Extremism (0.8 – 1.0)
  terrorist: 0.95, terrorism: 0.95, extremist: 0.85,
  radicalize: 0.9, jihad: 0.85, militia: 0.6,
  propaganda: 0.55, indoctrinate: 0.7,
  // Misc negative (0.2 – 0.4)
  suck: 0.35, sucks: 0.35, stink: 0.3, stinks: 0.3,
  boring: 0.2, liar: 0.45, coward: 0.4, jerk: 0.45,
  nerd: 0.3, dork: 0.3, geek: 0.25,
  shut: 0.25, shutup: 0.4,
};

const TOXICITY_TERMS = Object.keys(TOXICITY_DICT);

// ══════════════════════════════════════════════════════════════════════════════
// FLESCH-KINCAID HELPERS (Layer 2)
// ══════════════════════════════════════════════════════════════════════════════

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 2) return 1;
  let count = 0;
  const vowels = 'aeiouy';
  let prevVowel = false;
  for (const ch of w) {
    const isVowel = vowels.includes(ch);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }
  // Adjust for silent e
  if (w.endsWith('e') && count > 1) count--;
  return Math.max(count, 1);
}

function fleschKincaidGradeLevel(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9']/g, ''))
    .filter((w) => w.length > 0);

  if (sentences.length === 0 || words.length === 0) return 0;

  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = totalSyllables / words.length;

  // Flesch-Kincaid Grade Level formula
  const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  return Math.max(0, Math.round(grade * 10) / 10);
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT SAFETY SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class ContentSafetyService {
  // ─── Layer 1 — Pattern Matching ────────────────────────────────────────────

  private runPatternMatching(content: string): SafetyFlag[] {
    const flags: SafetyFlag[] = [];

    // PII
    for (const { name, regex } of PII_PATTERNS) {
      // Reset lastIndex for global regex
      regex.lastIndex = 0;
      if (regex.test(content)) {
        flags.push({
          layer: 'pattern',
          type: `pii_${name}`,
          severity: 'critical',
          detail: `Detected PII pattern: ${name}`,
        });
      }
    }

    // Crisis keywords
    crisisRegex.lastIndex = 0;
    const crisisMatch = content.match(crisisRegex);
    if (crisisMatch) {
      flags.push({
        layer: 'pattern',
        type: 'crisis_content',
        severity: 'critical',
        detail: `Crisis keyword detected: "${crisisMatch[0]}"`,
      });
    }

    // Profanity
    profanityRegex.lastIndex = 0;
    const profanityMatch = content.match(profanityRegex);
    if (profanityMatch) {
      flags.push({
        layer: 'pattern',
        type: 'profanity',
        severity: 'high',
        detail: `Profanity detected: "${profanityMatch[0]}"`,
      });
    }

    return flags;
  }

  // ─── Layer 2 — Age-Appropriateness ─────────────────────────────────────────

  private runAgeAppropriatenessCheck(
    content: string,
    studentAge?: number,
    maxGradeLevel?: number,
  ): SafetyFlag[] {
    const flags: SafetyFlag[] = [];
    const gradeLevel = fleschKincaidGradeLevel(content);

    // Tenant-level grade cap
    if (maxGradeLevel !== undefined && gradeLevel > maxGradeLevel) {
      flags.push({
        layer: 'age',
        type: 'grade_level_cap',
        severity: 'medium',
        detail: `Content grade level ${gradeLevel} exceeds tenant cap of ${maxGradeLevel}`,
      });
    }

    if (studentAge !== undefined) {
      if (studentAge < 8 && gradeLevel > 5) {
        flags.push({
          layer: 'age',
          type: 'too_complex',
          severity: 'medium',
          detail: `Content grade level ${gradeLevel} too complex for age ${studentAge} (max 5)`,
        });
      } else if (studentAge < 13 && gradeLevel > 9) {
        flags.push({
          layer: 'age',
          type: 'too_complex',
          severity: 'low',
          detail: `Content grade level ${gradeLevel} may be too complex for age ${studentAge} (max 9)`,
        });
      }
    }

    // Adult themes
    for (const pattern of ADULT_THEME_PATTERNS) {
      if (pattern.test(content)) {
        flags.push({
          layer: 'age',
          type: 'adult_theme',
          severity: 'high',
          detail: `Adult theme detected in content`,
        });
        break; // one flag is enough
      }
    }

    return flags;
  }

  // ─── Layer 3 — FERPA / COPPA ───────────────────────────────────────────────

  private runFerpaCoppaCheck(content: string): SafetyFlag[] {
    const flags: SafetyFlag[] = [];

    // Check for patterns that suggest other-student data leakage
    const otherStudentPatterns = [
      /\b(another student|other student|classmate|peer)\b.*\b(score|grade|IEP|disability|diagnosis)\b/i,
      /\b(score|grade|IEP|disability|diagnosis)\b.*\b(another student|other student|classmate|peer)\b/i,
      /\bstudent\s+(?:named|called)\s+[A-Z][a-z]+/,
    ];

    for (const pattern of otherStudentPatterns) {
      if (pattern.test(content)) {
        flags.push({
          layer: 'ferpa',
          type: 'other_student_data',
          severity: 'critical',
          detail: 'Content may contain information about another student (FERPA violation)',
        });
        break;
      }
    }

    // Teacher personal info leakage
    const teacherInfoPatterns = [
      /\b(teacher|instructor|professor)\b.*\b(home|address|phone|salary|ssn)\b/i,
      /\b(home|address|phone|salary|ssn)\b.*\b(teacher|instructor|professor)\b/i,
      /\bMr\.|Mrs\.|Ms\.|Dr\.\s+[A-Z][a-z]+\b.*\b(lives at|phone number|address is)\b/i,
    ];

    for (const pattern of teacherInfoPatterns) {
      if (pattern.test(content)) {
        flags.push({
          layer: 'ferpa',
          type: 'teacher_personal_info',
          severity: 'high',
          detail: 'Content may contain teacher personal information',
        });
        break;
      }
    }

    // IEP content about other students
    const iepPatterns = [
      /\b(IEP|individualized education|accommodation|504 plan)\b.*\b(for|about|regarding)\s+[A-Z][a-z]+/i,
      /\b[A-Z][a-z]+('s)?\s+(IEP|individualized education|accommodation|504 plan)\b/i,
    ];

    for (const pattern of iepPatterns) {
      if (pattern.test(content)) {
        flags.push({
          layer: 'ferpa',
          type: 'iep_disclosure',
          severity: 'critical',
          detail: 'Content may disclose IEP/504 plan information',
        });
        break;
      }
    }

    // Data aggregation risk — multiple student-identifying fields together
    const identifyingFields = [
      /\bage\s*:?\s*\d+/i,
      /\bgrade\s*:?\s*\d+/i,
      /\bschool\s*:?\s*[A-Z]/i,
      /\bclass\s*:?\s*\d/i,
    ];
    const matchCount = identifyingFields.filter((p) => p.test(content)).length;
    if (matchCount >= 3) {
      flags.push({
        layer: 'ferpa',
        type: 'data_aggregation_risk',
        severity: 'medium',
        detail: `Content contains ${matchCount} student-identifying fields that could combine to identify a minor`,
      });
    }

    return flags;
  }

  // ─── Layer 4 — Toxicity Scoring ────────────────────────────────────────────

  private runToxicityScoring(content: string): {
    flags: SafetyFlag[];
    toxicityScore: number;
  } {
    const flags: SafetyFlag[] = [];
    const lowerContent = content.toLowerCase();
    const words = lowerContent.split(/\s+/).filter((w) => w.length > 0);

    if (words.length === 0) return { flags, toxicityScore: 0 };

    // Compute TF (term frequency) for toxicity terms
    let weightedSum = 0;
    let matchCount = 0;

    for (const term of TOXICITY_TERMS) {
      const weight = TOXICITY_DICT[term];
      // Count occurrences (simple word-boundary match)
      const termRegex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = lowerContent.match(termRegex);
      if (matches) {
        const tf = matches.length / words.length; // term frequency
        // IDF approximation: rarer toxic terms get higher weight
        const idf = 1 + Math.log(200 / (1 + TOXICITY_TERMS.indexOf(term) * 0.1));
        weightedSum += tf * idf * weight;
        matchCount += matches.length;
      }
    }

    // Normalize score to 0–1 range
    const toxicityScore = Math.min(1, weightedSum * 10);

    if (toxicityScore > 0.4) {
      let severity: SafetyFlagSeverity = 'medium';
      if (toxicityScore > 0.8) severity = 'critical';
      else if (toxicityScore > 0.6) severity = 'high';

      flags.push({
        layer: 'toxicity',
        type: 'toxic_content',
        severity,
        detail: `Toxicity score ${toxicityScore.toFixed(2)} exceeds 0.4 threshold (${matchCount} toxic terms found)`,
      });
    }

    return { flags, toxicityScore };
  }

  // ─── Sanitization ──────────────────────────────────────────────────────────

  sanitizeContent(content: string): string {
    let sanitized = content;

    // Redact PII
    for (const { regex } of PII_PATTERNS) {
      regex.lastIndex = 0;
      sanitized = sanitized.replace(regex, '[REDACTED]');
    }

    // Remove crisis terms
    crisisRegex.lastIndex = 0;
    sanitized = sanitized.replace(crisisRegex, '[CONTENT REMOVED]');

    // Remove profanity
    profanityRegex.lastIndex = 0;
    sanitized = sanitized.replace(profanityRegex, '[CONTENT REMOVED]');

    return sanitized;
  }

  // ─── Audit Logging ─────────────────────────────────────────────────────────

  private async logToAuditService(
    tenantId: string,
    userId: string,
    context: SafetyContext,
    flags: SafetyFlag[],
    score: number,
    contentHash: string,
  ): Promise<void> {
    const url =
      process.env.AUDIT_SVC_URL || 'http://audit-svc:4050';

    try {
      await fetch(`${url}/audit/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'SECURITY',
          action: 'ai.content.blocked',
          tenantId,
          userId,
          context,
          metadata: {
            flags: flags.map((f) => ({
              layer: f.layer,
              type: f.type,
              severity: f.severity,
            })),
            score,
            contentHash,
          },
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Best-effort — never let audit failures block the response
    }
  }

  // ─── Main Pipeline ─────────────────────────────────────────────────────────

  async validateOutput(params: SafetyValidationParams): Promise<SafetyResult> {
    const start = performance.now();
    const { content, studentAge, tenantId, userId, context } = params;

    // Fetch tenant config
    const config: SafetyConfig = await getSafetyConfig(tenantId);

    if (!config.enabled) {
      return {
        safe: true,
        score: 1.0,
        flags: [],
        processingMs: performance.now() - start,
      };
    }

    // Run all 4 layers
    const patternFlags = this.runPatternMatching(content);
    const ageFlags = this.runAgeAppropriatenessCheck(
      content,
      studentAge,
      config.maxGradeLevel,
    );
    const ferpaFlags = this.runFerpaCoppaCheck(content);
    const { flags: toxicityFlags, toxicityScore } = this.runToxicityScoring(content);

    const allFlags: SafetyFlag[] = [
      ...patternFlags,
      ...ageFlags,
      ...ferpaFlags,
      ...toxicityFlags,
    ];

    // Compute aggregate safety score (1.0 = perfectly safe)
    let score = 1.0;
    for (const flag of allFlags) {
      switch (flag.severity) {
        case 'critical':
          score -= 0.4;
          break;
        case 'high':
          score -= 0.25;
          break;
        case 'medium':
          score -= 0.15;
          break;
        case 'low':
          score -= 0.05;
          break;
      }
    }
    // Factor in toxicity score
    if (toxicityScore > 0) {
      score -= toxicityScore * 0.3;
    }
    score = Math.max(0, Math.min(1, Math.round(score * 100) / 100));

    // Determine if content should be blocked
    const hasCritical = allFlags.some((f) => f.severity === 'critical');
    const hasHigh = allFlags.some((f) => f.severity === 'high');
    const hasMedium = allFlags.some((f) => f.severity === 'medium');

    const blocked =
      (config.blockOnCritical && hasCritical) ||
      (config.blockOnHigh && hasHigh) ||
      (config.blockOnMedium && hasMedium) ||
      score < config.minimumSafetyScore;

    // Build result
    const sanitizedContent = config.sanitizePii
      ? this.sanitizeContent(content)
      : undefined;

    const blockedReason = blocked
      ? allFlags
          .filter((f) => f.severity === 'critical' || f.severity === 'high')
          .map((f) => f.detail)
          .join('; ') || `Safety score ${score} below minimum ${config.minimumSafetyScore}`
      : undefined;

    const processingMs = Math.round((performance.now() - start) * 100) / 100;

    const result: SafetyResult = {
      safe: !blocked,
      score,
      flags: allFlags,
      sanitizedContent,
      blockedReason,
      processingMs,
    };

    // Audit log on high/critical blocks
    if (blocked && (hasCritical || hasHigh)) {
      const contentHash = createHash('sha256').update(content).digest('hex').substring(0, 16);
      // Fire and forget
      this.logToAuditService(tenantId, userId, context, allFlags, score, contentHash).catch(
        () => {},
      );
    }

    return result;
  }
}

// Singleton instance
export const contentSafetyService = new ContentSafetyService();
