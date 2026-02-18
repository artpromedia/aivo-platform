/**
 * PII Detection Service
 *
 * Scans message content for Personally Identifiable Information (PII)
 * relevant to K-12 education (FERPA/COPPA compliance).
 *
 * Detects: SSNs, credit card numbers, phone numbers, email addresses,
 * date of birth patterns, student IDs, and other sensitive data.
 *
 * Important: This service does NOT block messages; it flags PII and can
 * optionally redact detected patterns. All flagged messages are logged
 * for compliance review.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type PiiType =
  | 'SSN'
  | 'CREDIT_CARD'
  | 'PHONE_NUMBER'
  | 'EMAIL_ADDRESS'
  | 'DATE_OF_BIRTH'
  | 'STUDENT_ID'
  | 'ADDRESS'
  | 'MEDICAL_RECORD';

export interface PiiMatch {
  type: PiiType;
  value: string;       // Redacted representation (e.g., "***-**-1234")
  startIndex: number;
  endIndex: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface PiiScanResult {
  hasPii: boolean;
  matches: PiiMatch[];
  /** Content with PII redacted (only populated if hasPii is true) */
  redactedContent?: string;
  /** Risk level based on the types of PII found */
  riskLevel: 'none' | 'low' | 'medium' | 'high';
}

// ══════════════════════════════════════════════════════════════════════════════
// DETECTION PATTERNS
// ══════════════════════════════════════════════════════════════════════════════

interface PiiPattern {
  type: PiiType;
  regex: RegExp;
  confidence: 'high' | 'medium' | 'low';
  redact: (match: string) => string;
  validate?: (match: string) => boolean;
}

const PII_PATTERNS: PiiPattern[] = [
  // SSN: 123-45-6789 or 123456789 (9 consecutive digits)
  {
    type: 'SSN',
    regex: /\b(\d{3}[-\s]?\d{2}[-\s]?\d{4})\b/g,
    confidence: 'high',
    redact: (m) => `***-**-${m.replace(/[-\s]/g, '').slice(-4)}`,
    validate: (m) => {
      const digits = m.replace(/[-\s]/g, '');
      if (digits.length !== 9) return false;
      // SSNs don't start with 000, 666, or 9xx
      const area = parseInt(digits.slice(0, 3));
      return area !== 0 && area !== 666 && area < 900;
    },
  },

  // Credit card: 13-19 digit numbers with optional separators
  {
    type: 'CREDIT_CARD',
    regex: /\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{1,7})\b/g,
    confidence: 'high',
    redact: (m) => `****-****-****-${m.replace(/[-\s]/g, '').slice(-4)}`,
    validate: (m) => luhnCheck(m.replace(/[-\s]/g, '')),
  },

  // Phone numbers: various US formats
  {
    type: 'PHONE_NUMBER',
    regex: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    confidence: 'medium',
    redact: (m) => {
      const digits = m.replace(/\D/g, '');
      return `(***) ***-${digits.slice(-4)}`;
    },
  },

  // Email addresses
  {
    type: 'EMAIL_ADDRESS',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    confidence: 'high',
    redact: (m) => {
      const [local, domain] = m.split('@');
      return `${local[0]}***@${domain}`;
    },
  },

  // Date of birth patterns: MM/DD/YYYY, MM-DD-YYYY, "born on ...", "DOB: ..."
  {
    type: 'DATE_OF_BIRTH',
    regex: /\b(?:(?:DOB|date\s+of\s+birth|born\s+(?:on)?|birthday)[:\s]*)?(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b/gi,
    confidence: 'medium',
    redact: () => '[DOB REDACTED]',
    validate: (m) => {
      // Extract just the date portion
      const dateMatch = m.match(/\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}/);
      if (!dateMatch) return false;
      const parts = dateMatch[0].split(/[/\-]/);
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      return month >= 1 && month <= 12 && day >= 1 && day <= 31;
    },
  },

  // Student ID patterns (common formats like "Student ID: 12345" or "SID: ABC123")
  {
    type: 'STUDENT_ID',
    regex: /\b(?:student\s*(?:id|number|#)|SID)[:\s#]*([A-Za-z0-9]{4,12})\b/gi,
    confidence: 'medium',
    redact: (m) => {
      const idMatch = m.match(/[A-Za-z0-9]{4,12}$/);
      return `Student ID: ***${idMatch ? idMatch[0].slice(-3) : '***'}`;
    },
  },

  // Medical record numbers (MRN patterns)
  {
    type: 'MEDICAL_RECORD',
    regex: /\b(?:MRN|medical\s*record)[:\s#]*([A-Za-z0-9]{6,12})\b/gi,
    confidence: 'medium',
    redact: () => '[MRN REDACTED]',
  },
];

// Risk levels by PII type (used to calculate overall risk)
const PII_RISK_WEIGHTS: Record<PiiType, number> = {
  SSN: 10,
  CREDIT_CARD: 10,
  MEDICAL_RECORD: 8,
  DATE_OF_BIRTH: 5,
  STUDENT_ID: 4,
  EMAIL_ADDRESS: 3,
  PHONE_NUMBER: 2,
  ADDRESS: 3,
};

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Scan message content for PII.
 *
 * Returns scan results including any matches found, redacted content,
 * and an overall risk level assessment.
 */
export function scanForPii(content: string): PiiScanResult {
  if (!content || content.trim().length === 0) {
    return { hasPii: false, matches: [], riskLevel: 'none' };
  }

  const matches: PiiMatch[] = [];

  for (const pattern of PII_PATTERNS) {
    // Reset regex state (global flag)
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.regex.exec(content)) !== null) {
      const fullMatch = match[0];

      // Run optional validation
      if (pattern.validate && !pattern.validate(fullMatch)) {
        continue;
      }

      matches.push({
        type: pattern.type,
        value: pattern.redact(fullMatch),
        startIndex: match.index,
        endIndex: match.index + fullMatch.length,
        confidence: pattern.confidence,
      });
    }
  }

  if (matches.length === 0) {
    return { hasPii: false, matches: [], riskLevel: 'none' };
  }

  // Build redacted content by replacing matches (process in reverse to preserve indices)
  const sortedMatches = [...matches].sort((a, b) => b.startIndex - a.startIndex);
  let redactedContent = content;
  for (const m of sortedMatches) {
    redactedContent =
      redactedContent.slice(0, m.startIndex) +
      m.value +
      redactedContent.slice(m.endIndex);
  }

  // Calculate risk level
  const riskScore = matches.reduce(
    (score, m) => score + PII_RISK_WEIGHTS[m.type],
    0
  );

  let riskLevel: PiiScanResult['riskLevel'];
  if (riskScore >= 10) {
    riskLevel = 'high';
  } else if (riskScore >= 5) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return {
    hasPii: true,
    matches,
    redactedContent,
    riskLevel,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Luhn algorithm for credit card validation.
 */
function luhnCheck(num: string): boolean {
  if (num.length < 13 || num.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}
