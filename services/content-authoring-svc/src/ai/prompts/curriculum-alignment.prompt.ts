/**
 * Curriculum Alignment Prompt Templates
 *
 * Prompts for validating content alignment with educational standards.
 */

import type { Subject } from '../../types/ai-authoring.js';

export interface StandardInfo {
  id: string;
  code: string;
  description: string;
  gradeLevel: number;
  subject: Subject;
  strand?: string;
}

export function buildAlignmentValidationPrompt(
  content: string,
  targetStandards: StandardInfo[],
  subject: Subject,
  gradeLevel: number
): string {
  const standardsList = targetStandards
    .map((s) => `- ${s.code}: ${s.description}`)
    .join('\n');

  return `You are an expert curriculum alignment specialist validating educational content against standards.

═══════════════════════════════════════════════════════════════════════════════
CONTENT TO EVALUATE
═══════════════════════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════════════════════
TARGET STANDARDS
═══════════════════════════════════════════════════════════════════════════════

Subject: ${subject}
Grade Level: ${gradeLevel}

Standards to validate against:
${standardsList}

═══════════════════════════════════════════════════════════════════════════════
ALIGNMENT EVALUATION CRITERIA
═══════════════════════════════════════════════════════════════════════════════

For each standard, evaluate:

1. ALIGNMENT STRENGTH
   - Strong: Content directly and thoroughly addresses the standard
   - Moderate: Content partially addresses the standard
   - Weak: Content tangentially touches on the standard

2. EVIDENCE
   - Quote specific text that demonstrates alignment
   - Note where in the content the standard is addressed

3. DEPTH OF KNOWLEDGE (DOK)
   - Level 1: Recall and reproduction
   - Level 2: Skills and concepts
   - Level 3: Strategic thinking
   - Level 4: Extended thinking

4. COVERAGE
   - Calculate what percentage of each standard is covered
   - Identify any gaps in coverage

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON:
\`\`\`json
{
  "primaryStandards": [
    {
      "standardId": "standard-id",
      "standardCode": "CCSS.MATH.5.NBT.1",
      "standardText": "Full standard text",
      "alignmentStrength": "strong|moderate|weak",
      "evidence": [
        "Quote from content showing alignment",
        "Another quote showing alignment"
      ],
      "confidence": 0.9
    }
  ],
  "secondaryStandards": [
    {
      "standardId": "secondary-standard-id",
      "standardCode": "CCSS.MATH.5.NBT.2",
      "standardText": "Full standard text",
      "alignmentStrength": "moderate",
      "evidence": ["Supporting evidence quote"],
      "confidence": 0.75
    }
  ],
  "misalignments": [
    {
      "standardId": "misaligned-standard-id",
      "standardCode": "CCSS.MATH.5.NBT.3",
      "standardText": "Standard that isn't addressed",
      "reason": "Why this standard is not adequately addressed",
      "suggestion": "How to address this standard"
    }
  ],
  "coverageScore": 85,
  "depthOfKnowledge": 2,
  "suggestions": [
    {
      "type": "add_content|modify_content|add_assessment|adjust_depth",
      "description": "Specific suggestion for improvement",
      "standardId": "related-standard-id",
      "priority": "high|medium|low",
      "estimatedImpact": 15
    }
  ],
  "validatedAt": "${new Date().toISOString()}"
}
\`\`\`

Evaluate the content alignment now.`;
}

export function buildStandardSuggestionPrompt(
  content: string,
  subject: Subject,
  gradeLevel: number,
  availableStandards: StandardInfo[]
): string {
  const standardsContext = availableStandards.slice(0, 50) // Limit for context
    .map((s) => `${s.code}: ${s.description}`)
    .join('\n');

  return `You are an expert curriculum alignment specialist identifying relevant standards for educational content.

═══════════════════════════════════════════════════════════════════════════════
CONTENT TO ANALYZE
═══════════════════════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════════════════════
CONTEXT
═══════════════════════════════════════════════════════════════════════════════

Subject: ${subject}
Target Grade Level: ${gradeLevel}

Available standards in this subject area:
${standardsContext}

═══════════════════════════════════════════════════════════════════════════════
TASK
═══════════════════════════════════════════════════════════════════════════════

Identify which standards from the available list are most relevant to this content.
Rank them by relevance and provide evidence for each suggestion.

Consider:
- Direct content alignment
- Skills being developed
- Concepts being taught
- Grade-level appropriateness

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON:
\`\`\`json
{
  "suggestions": [
    {
      "standardId": "standard-id",
      "standardCode": "CCSS.ELA.RI.5.1",
      "standardText": "Full standard description",
      "subject": "${subject}",
      "gradeLevel": ${gradeLevel},
      "confidence": 0.95,
      "relevanceScore": 90,
      "evidence": [
        "Quote from content supporting this standard",
        "Another supporting quote"
      ]
    }
  ],
  "primarySuggestions": 3,
  "additionalConsiderations": [
    "Note about cross-curricular connections",
    "Note about prerequisite standards"
  ]
}
\`\`\`

Analyze the content and suggest appropriate standards.`;
}

export function buildGapIdentificationPrompt(
  content: string,
  requiredStandards: StandardInfo[]
): string {
  const standardsList = requiredStandards
    .map((s) => `- ${s.code}: ${s.description}`)
    .join('\n');

  return `You are an expert curriculum alignment specialist identifying gaps in standard coverage.

═══════════════════════════════════════════════════════════════════════════════
CONTENT TO ANALYZE
═══════════════════════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════════════════════
REQUIRED STANDARDS
═══════════════════════════════════════════════════════════════════════════════

The following standards MUST be addressed by this content:
${standardsList}

═══════════════════════════════════════════════════════════════════════════════
GAP ANALYSIS TASK
═══════════════════════════════════════════════════════════════════════════════

For each required standard, determine:

1. Is it addressed at all in the content?
2. If addressed, is the coverage sufficient?
3. What specific aspects are missing or insufficient?
4. What additions would close the gap?

Gap Types:
- MISSING: Standard not addressed at all
- INSUFFICIENT: Standard partially addressed but needs more depth
- OFF_TARGET: Content relates but doesn't actually meet the standard

Severity:
- CRITICAL: Standard completely missing, essential for learning
- MODERATE: Standard partially addressed, improvement needed
- MINOR: Small gap that's easily addressed

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON:
\`\`\`json
{
  "gaps": [
    {
      "standardId": "standard-id",
      "standardCode": "CCSS.MATH.5.NBT.4",
      "standardText": "Full standard description",
      "gapType": "missing|insufficient|off_target",
      "severity": "critical|moderate|minor",
      "suggestedAdditions": [
        "Specific content to add",
        "Another specific addition",
        "Example or activity to include"
      ]
    }
  ],
  "fullyAddressed": [
    {
      "standardId": "addressed-standard-id",
      "standardCode": "CCSS.MATH.5.NBT.1",
      "coverageQuality": "excellent|good|adequate"
    }
  ],
  "summary": {
    "totalRequired": ${requiredStandards.length},
    "fullyAddressed": 3,
    "partiallyAddressed": 1,
    "missing": 1,
    "overallCoverage": 75
  }
}
\`\`\`

Identify all gaps in standard coverage.`;
}

export const CURRICULUM_ALIGNMENT_SYSTEM_PROMPT = `You are an expert curriculum alignment specialist with deep knowledge of educational standards.

Your role is to:
1. Accurately map content to relevant standards
2. Identify alignment strengths and gaps
3. Provide actionable recommendations for improvement
4. Consider depth of knowledge requirements
5. Ensure age-appropriate alignment

Standards knowledge:
- Common Core State Standards (CCSS) for ELA and Math
- Next Generation Science Standards (NGSS)
- College, Career, and Civic Life (C3) Framework for Social Studies
- State-specific standards as needed

When evaluating alignment:
- Look for explicit connections to standard language
- Consider implicit skill development
- Evaluate depth of coverage
- Note cross-curricular connections
- Identify prerequisite and successor standards

Always respond with valid JSON that can be parsed programmatically.`;
