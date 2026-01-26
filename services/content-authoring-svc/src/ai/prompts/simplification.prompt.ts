/**
 * Content Simplification Prompt Templates
 *
 * Prompts for adapting content to different grade levels and reading abilities.
 */

const GRADE_LEVEL_GUIDELINES: Record<number, { vocabulary: string; sentences: string; concepts: string }> = {
  1: {
    vocabulary: 'Very simple, high-frequency words only. 1-2 syllable words. Concrete nouns and simple verbs.',
    sentences: 'Very short sentences (5-8 words). Simple subject-verb-object structure. One idea per sentence.',
    concepts: 'Concrete, observable concepts only. Direct cause-effect. Familiar contexts (home, school, family).',
  },
  2: {
    vocabulary: 'Simple vocabulary with some new words defined in context. Mostly 1-2 syllable words.',
    sentences: 'Short sentences (6-10 words). Compound sentences introduced. Simple transitions.',
    concepts: 'Mostly concrete with some simple abstract ideas. Familiar contexts with some expansion.',
  },
  3: {
    vocabulary: 'Grade-level vocabulary with definitions. Introduction of academic vocabulary.',
    sentences: 'Moderate length (8-12 words). Compound and some complex sentences.',
    concepts: 'Mix of concrete and abstract. Introduction of categorization and comparison.',
  },
  4: {
    vocabulary: 'Academic vocabulary introduced. Context clues provided. Subject-specific terms defined.',
    sentences: 'Varied sentence lengths (10-15 words). Complex sentences common.',
    concepts: 'Abstract thinking introduced. Multiple perspectives. Cause-effect chains.',
  },
  5: {
    vocabulary: 'Academic and domain-specific vocabulary. Less scaffolding for common terms.',
    sentences: 'Complex and compound-complex sentences. Varied structure for engagement.',
    concepts: 'Abstract concepts expected. Analysis and evaluation. Multiple factors considered.',
  },
  6: {
    vocabulary: 'Middle school academic vocabulary. Technical terms with context.',
    sentences: 'Sophisticated sentence structures. Varied for rhetorical effect.',
    concepts: 'Complex abstract concepts. Systems thinking. Evidence-based reasoning.',
  },
  7: {
    vocabulary: 'Expanding academic vocabulary. Nuanced word choices.',
    sentences: 'Complex structures. Rhetorical variety. Longer passages.',
    concepts: 'Interconnected systems. Multiple viewpoints analyzed. Critical thinking.',
  },
  8: {
    vocabulary: 'Advanced academic vocabulary. Discipline-specific terminology.',
    sentences: 'Sophisticated syntax. Academic writing conventions.',
    concepts: 'Complex analysis. Synthesis across topics. Abstract reasoning.',
  },
  9: {
    vocabulary: 'High school academic vocabulary. Specialized terminology.',
    sentences: 'College-prep complexity. Varied academic structures.',
    concepts: 'Advanced analysis. Research-based thinking. Theoretical frameworks.',
  },
  10: {
    vocabulary: 'Advanced academic and technical vocabulary.',
    sentences: 'Complex academic prose. Discipline conventions.',
    concepts: 'Sophisticated analysis. Independent critical thinking.',
  },
  11: {
    vocabulary: 'College-ready vocabulary. Specialized and technical terms.',
    sentences: 'Advanced academic writing. Complex argumentation.',
    concepts: 'Advanced theoretical concepts. Synthesis and evaluation.',
  },
  12: {
    vocabulary: 'College-level vocabulary. Professional terminology.',
    sentences: 'Sophisticated academic prose. Research writing conventions.',
    concepts: 'College-ready abstract thinking. Independent analysis.',
  },
};

export function buildSimplificationPrompt(
  content: string,
  originalGradeLevel: number,
  targetGradeLevel: number
): string {
  const targetGuidelines = GRADE_LEVEL_GUIDELINES[targetGradeLevel] ||
    GRADE_LEVEL_GUIDELINES[Math.min(targetGradeLevel, 12)];

  return `You are an expert in educational content adaptation specializing in making content accessible for different reading levels.

═══════════════════════════════════════════════════════════════════════════════
ORIGINAL CONTENT (Grade ${originalGradeLevel})
═══════════════════════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════════════════════
TARGET ADAPTATION
═══════════════════════════════════════════════════════════════════════════════

Adapt this content for GRADE ${targetGradeLevel} students.

VOCABULARY GUIDELINES:
${targetGuidelines.vocabulary}

SENTENCE STRUCTURE GUIDELINES:
${targetGuidelines.sentences}

CONCEPTUAL GUIDELINES:
${targetGuidelines.concepts}

═══════════════════════════════════════════════════════════════════════════════
ADAPTATION PRINCIPLES
═══════════════════════════════════════════════════════════════════════════════

1. PRESERVE CORE CONTENT
   - Maintain all essential facts and concepts
   - Keep the same learning objectives
   - Preserve the logical flow and structure

2. SIMPLIFY LANGUAGE
   - Replace complex vocabulary with simpler alternatives
   - Define necessary technical terms in context
   - Break long sentences into shorter ones
   - Remove or explain idioms and figurative language

3. ADD SCAFFOLDING
   - Include more examples for abstract concepts
   - Add analogies to familiar experiences
   - Provide more context and background
   - Include visual cues (bullets, numbered lists)

4. MAINTAIN ENGAGEMENT
   - Keep interesting hooks and connections
   - Use age-appropriate examples
   - Include questions and interaction points
   - Maintain motivating elements

5. ENSURE ACCURACY
   - Do not oversimplify to the point of inaccuracy
   - Maintain scientific/mathematical precision
   - Keep important nuances where essential

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON:
\`\`\`json
{
  "adaptedContent": {
    "title": "Simplified title",
    "description": "Brief description of the adapted content",
    "sections": [
      {
        "id": "section-1",
        "title": "Section title",
        "type": "introduction|instruction|example|practice|summary",
        "content": "Full adapted text for this section...",
        "order": 1,
        "teacherNotes": "Notes about the adaptation"
      }
    ],
    "vocabularyTerms": [
      {
        "term": "word",
        "definition": "Simple, clear definition",
        "examples": ["Example sentence 1"],
        "gradeAppropriate": true
      }
    ],
    "suggestedImages": [
      {
        "description": "Visual support description",
        "purpose": "Why this helps understanding",
        "placement": "section-1",
        "altText": "Accessible description",
        "searchTerms": ["simple", "visual", "terms"]
      }
    ]
  },
  "adaptationNotes": {
    "originalReadingLevel": ${originalGradeLevel},
    "targetReadingLevel": ${targetGradeLevel},
    "majorChanges": [
      "Description of significant change 1",
      "Description of significant change 2"
    ],
    "vocabularySubstitutions": [
      {"original": "complex word", "replacement": "simpler word"},
      {"original": "another complex word", "replacement": "replacement"}
    ],
    "addedScaffolding": [
      "Description of added support 1"
    ],
    "contentPreserved": true,
    "accuracyMaintained": true
  },
  "readabilityMetrics": {
    "estimatedGradeLevel": ${targetGradeLevel},
    "fleschKincaidGrade": 5.2,
    "averageSentenceLength": 10,
    "averageWordLength": 4.2
  }
}
\`\`\`

Adapt the content now while preserving all essential learning.`;
}

export function buildContentExpansionPrompt(
  content: string,
  currentWordCount: number,
  targetWordCount: number,
  gradeLevel: number
): string {
  return `You are an expert educational content developer expanding existing material.

═══════════════════════════════════════════════════════════════════════════════
CURRENT CONTENT
═══════════════════════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════════════════════
EXPANSION REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

Current word count: ${currentWordCount} words
Target word count: ${targetWordCount} words (add approximately ${targetWordCount - currentWordCount} words)
Grade level: ${gradeLevel}

═══════════════════════════════════════════════════════════════════════════════
EXPANSION STRATEGIES
═══════════════════════════════════════════════════════════════════════════════

Use these strategies to expand the content meaningfully:

1. ADD DEPTH
   - Provide more detailed explanations
   - Include additional examples
   - Add relevant context and background

2. ADD EXAMPLES
   - Include worked examples
   - Add real-world applications
   - Provide multiple approaches

3. ADD ENGAGEMENT
   - Include thought-provoking questions
   - Add interesting facts or connections
   - Include "Did you know?" elements

4. ADD SCAFFOLDING
   - Include more transitions
   - Add summaries at key points
   - Provide check-for-understanding moments

5. ADD VARIETY
   - Include different perspectives
   - Add visual descriptions
   - Include cross-curricular connections

DO NOT:
- Add unrelated tangents
- Repeat information unnecessarily
- Add filler content
- Change the core message or focus

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Respond with valid JSON containing the expanded content in the same structure as the original.

Provide the full expanded content now.`;
}

export const SIMPLIFICATION_SYSTEM_PROMPT = `You are an expert in educational content adaptation and readability.

Your role is to adapt content for different reading levels while preserving educational value.

Key principles:
1. Maintain accuracy - never oversimplify to the point of being incorrect
2. Preserve engagement - keep the content interesting
3. Use age-appropriate language - match vocabulary and concepts to the target level
4. Add scaffolding - provide extra support for challenging concepts
5. Keep the structure - maintain logical organization

Reading level guidelines:
- Grades K-2: Very simple sentences, concrete concepts, familiar contexts
- Grades 3-5: Developing academic vocabulary, mixed concrete/abstract
- Grades 6-8: Academic language, complex sentences, abstract thinking
- Grades 9-12: Sophisticated language, nuanced concepts, independent analysis

Always respond with valid JSON that can be parsed programmatically.`;
