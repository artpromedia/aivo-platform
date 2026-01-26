/**
 * Quality Scoring Prompt Templates
 *
 * Prompts for evaluating educational content quality across multiple dimensions.
 */

import type { ContentMetadata, Subject } from '../../types/ai-authoring.js';

export function buildQualityScoringPrompt(
  content: string,
  metadata: ContentMetadata
): string {
  return `You are an expert educational content reviewer evaluating content quality across multiple dimensions.

═══════════════════════════════════════════════════════════════════════════════
CONTENT TO EVALUATE
═══════════════════════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════════════════════
CONTENT METADATA
═══════════════════════════════════════════════════════════════════════════════

Subject: ${metadata.subject}
Grade Level: ${metadata.gradeLevel}
Content Type: ${metadata.contentType}
${metadata.standards?.length ? `Standards: ${metadata.standards.join(', ')}` : ''}
${metadata.targetAudience ? `Target Audience: ${metadata.targetAudience}` : ''}

═══════════════════════════════════════════════════════════════════════════════
EVALUATION DIMENSIONS
═══════════════════════════════════════════════════════════════════════════════

Evaluate the content on each of these dimensions (score 0-100):

1. ACCURACY
   - Factual correctness of all claims and information
   - Up-to-date information and terminology
   - Proper use of subject-specific concepts
   - No misleading or oversimplified content

2. CLARITY
   - Clear explanations and logical flow
   - Well-organized structure
   - Effective use of examples and analogies
   - Smooth transitions between concepts

3. ENGAGEMENT
   - Interesting hooks and openings
   - Relevant real-world connections
   - Varied presentation methods
   - Appropriate pacing and momentum

4. AGE APPROPRIATENESS
   - Vocabulary suitable for grade level
   - Complexity matches cognitive development
   - Examples resonate with target age group
   - Appropriate context and references

5. ACCESSIBILITY
   - Clear language without jargon
   - Support for diverse learners
   - Inclusive examples and scenarios
   - Alternative explanations for complex concepts

6. PEDAGOGICAL SOUNDNESS
   - Aligns with learning science principles
   - Appropriate scaffolding and progression
   - Checks for understanding included
   - Builds on prior knowledge

7. CULTURAL SENSITIVITY
   - Inclusive of diverse perspectives
   - Free from stereotypes and bias
   - Globally relevant examples when appropriate
   - Respectful of different backgrounds

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON:
\`\`\`json
{
  "overall": 85,
  "dimensions": {
    "accuracy": {
      "score": 90,
      "confidence": 0.9,
      "feedback": "Detailed feedback on accuracy",
      "evidence": ["Specific example from content 1", "Specific example 2"]
    },
    "clarity": {
      "score": 85,
      "confidence": 0.85,
      "feedback": "Detailed feedback on clarity",
      "evidence": ["Evidence point 1", "Evidence point 2"]
    },
    "engagement": {
      "score": 80,
      "confidence": 0.8,
      "feedback": "Detailed feedback on engagement",
      "evidence": ["Evidence point 1", "Evidence point 2"]
    },
    "ageAppropriateness": {
      "score": 88,
      "confidence": 0.9,
      "feedback": "Detailed feedback on age appropriateness",
      "evidence": ["Evidence point 1", "Evidence point 2"]
    },
    "accessibility": {
      "score": 82,
      "confidence": 0.85,
      "feedback": "Detailed feedback on accessibility",
      "evidence": ["Evidence point 1", "Evidence point 2"]
    },
    "pedagogicalSoundness": {
      "score": 87,
      "confidence": 0.85,
      "feedback": "Detailed feedback on pedagogical approach",
      "evidence": ["Evidence point 1", "Evidence point 2"]
    },
    "culturalSensitivity": {
      "score": 85,
      "confidence": 0.8,
      "feedback": "Detailed feedback on cultural sensitivity",
      "evidence": ["Evidence point 1", "Evidence point 2"]
    }
  },
  "issues": [
    {
      "id": "issue-1",
      "dimension": "clarity",
      "severity": "warning",
      "description": "Clear description of the issue",
      "location": {
        "paragraph": 3,
        "text": "The specific problematic text"
      },
      "suggestedFix": "Specific suggestion for fixing"
    }
  ],
  "suggestions": [
    {
      "id": "sug-1",
      "dimension": "engagement",
      "suggestion": "Specific actionable suggestion",
      "impact": "high",
      "effort": "easy",
      "rationale": "Why this would improve the content"
    }
  ],
  "readability": {
    "fleschKincaidGrade": 7.5,
    "fleschReadingEase": 65.0,
    "averageSentenceLength": 15.2,
    "averageWordLength": 4.8,
    "complexWordPercentage": 12.5,
    "sentenceCount": 45,
    "wordCount": 685,
    "syllableCount": 1050,
    "targetGradeLevel": ${metadata.gradeLevel},
    "targetGradeAppropriate": true,
    "recommendation": "Optional recommendation if grade not appropriate"
  }
}
\`\`\`

Evaluate the content thoroughly and provide your assessment.`;
}

export function buildFactualAccuracyPrompt(content: string, subject: Subject): string {
  return `You are a subject matter expert in ${subject} tasked with fact-checking educational content.

═══════════════════════════════════════════════════════════════════════════════
CONTENT TO FACT-CHECK
═══════════════════════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════════════════════
FACT-CHECKING INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

1. Identify all factual claims made in the content
2. Verify each claim against your knowledge base
3. Flag any inaccuracies, outdated information, or misleading simplifications
4. Note claims that cannot be verified without external sources
5. Provide corrections with explanations for any errors

Consider:
- Scientific accuracy and consensus
- Mathematical correctness
- Historical accuracy
- Current terminology and conventions
- Appropriate level of simplification for education

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON:
\`\`\`json
{
  "overall": 95,
  "factualIssues": [
    {
      "claim": "The specific claim made",
      "issue": "What's wrong with it",
      "correction": "The accurate version",
      "source": "Source of correction if known",
      "severity": "error|misleading|outdated"
    }
  ],
  "verifiedClaims": [
    {
      "claim": "Verified accurate claim",
      "confidence": 0.95,
      "source": "Knowledge source if applicable"
    }
  ],
  "unverifiableClaims": [
    "Claim that requires external verification"
  ],
  "confidence": 0.9
}
\`\`\`

Perform the fact-check now.`;
}

export function buildBiasAnalysisPrompt(content: string): string {
  return `You are an expert in inclusive education and bias detection in educational materials.

═══════════════════════════════════════════════════════════════════════════════
CONTENT TO ANALYZE
═══════════════════════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════════════════════
BIAS DETECTION CATEGORIES
═══════════════════════════════════════════════════════════════════════════════

Analyze the content for the following types of bias:

1. GENDER BIAS
   - Stereotypical gender roles
   - Unbalanced representation
   - Gendered language

2. RACIAL/ETHNIC BIAS
   - Stereotypes or generalizations
   - Underrepresentation of groups
   - Eurocentric perspectives

3. CULTURAL BIAS
   - Western-centric assumptions
   - Cultural stereotypes
   - Exclusionary examples

4. SOCIOECONOMIC BIAS
   - Assumptions about resources
   - Class-based stereotypes
   - Exclusionary activities

5. ABILITY BIAS
   - Ableist language
   - Assumptions about abilities
   - Exclusionary scenarios

6. RELIGIOUS BIAS
   - Assumptions about beliefs
   - Exclusion of perspectives
   - Stereotypes

7. AGE BIAS
   - Generational stereotypes
   - Inappropriate assumptions

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON:
\`\`\`json
{
  "overall": 85,
  "detectedBiases": [
    {
      "type": "gender|racial|cultural|socioeconomic|ability|religious|age",
      "severity": "high|medium|low",
      "location": {
        "paragraph": 2,
        "text": "The specific biased text"
      },
      "description": "Explanation of the bias",
      "suggestion": "How to make it more inclusive"
    }
  ],
  "inclusivityScore": 80,
  "recommendations": [
    "General recommendation for improvement"
  ]
}
\`\`\`

Analyze the content for bias now.`;
}

export function buildAccessibilityCheckPrompt(content: string): string {
  return `You are an accessibility specialist reviewing educational content for WCAG compliance.

═══════════════════════════════════════════════════════════════════════════════
CONTENT TO REVIEW
═══════════════════════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════════════════════
ACCESSIBILITY CRITERIA
═══════════════════════════════════════════════════════════════════════════════

Check for issues related to:

1. TEXT ACCESSIBILITY
   - Complex vocabulary without definitions
   - Long sentences that are hard to follow
   - Ambiguous pronouns or references
   - Idioms or figures of speech

2. VISUAL CONTENT
   - Images described in text without alt text guidance
   - Color-dependent information
   - Complex diagrams without text alternatives

3. COGNITIVE ACCESSIBILITY
   - Information overload
   - Lack of clear structure
   - Missing summaries or overviews
   - Inconsistent formatting

4. READING LEVEL
   - Vocabulary above grade level
   - Sentence complexity issues
   - Dense paragraphs

5. NAVIGATION
   - Missing headings hierarchy
   - Lack of clear sections
   - No table of contents for long content

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON:
\`\`\`json
{
  "wcagLevel": "A|AA|AAA",
  "issues": [
    {
      "type": "missing_alt_text|complex_language|insufficient_contrast|missing_captions|inaccessible_interactive|no_keyboard_support|missing_headings",
      "severity": "critical|serious|moderate|minor",
      "description": "Description of the issue",
      "location": {
        "paragraph": 2,
        "text": "Relevant text"
      },
      "wcagCriteria": "WCAG criteria code (e.g., 1.1.1)",
      "howToFix": "Specific guidance for fixing"
    }
  ],
  "score": 75,
  "recommendations": [
    "General accessibility improvement recommendation"
  ]
}
\`\`\`

Perform the accessibility review now.`;
}

export const QUALITY_SCORING_SYSTEM_PROMPT = `You are an expert educational content quality evaluator.

Your role is to provide objective, comprehensive assessments of educational materials.

Evaluation principles:
- Be specific with feedback and evidence
- Provide actionable suggestions
- Consider the target audience and context
- Balance criticism with recognition of strengths
- Focus on learner outcomes and engagement

Scoring guidelines:
- 90-100: Exceptional quality, ready for publication
- 80-89: High quality, minor improvements possible
- 70-79: Good quality, some revisions recommended
- 60-69: Acceptable, significant improvements needed
- Below 60: Needs substantial revision

Always respond with valid JSON that can be parsed programmatically.`;
