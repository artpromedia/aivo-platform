/**
 * Language Arts Processor
 * Specialized processing for ELA/Language Arts homework problems
 *
 * Features:
 * - Grammar analysis
 * - Writing feedback
 * - Citation formatting
 * - Reading comprehension support
 */

import type { GradeBand } from '../types/aiContract.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface LanguageArtsProblem {
  rawText: string;
  problemType: LanguageArtsProblemType;
  textType?: TextType;
  literaryDevices: LiteraryDevice[];
  grammarIssues: GrammarIssue[];
  writingElements: WritingElement[];
  difficulty: number;
  gradeBand: GradeBand;
}

export type LanguageArtsProblemType =
  | 'reading-comprehension'
  | 'essay-writing'
  | 'grammar'
  | 'vocabulary'
  | 'literary-analysis'
  | 'creative-writing'
  | 'research'
  | 'citation'
  | 'speech'
  | 'unknown';

export type TextType =
  | 'narrative'
  | 'expository'
  | 'persuasive'
  | 'descriptive'
  | 'poetry'
  | 'drama'
  | 'informational';

export interface LiteraryDevice {
  type: string;
  example?: string;
  definition: string;
  function: string;
}

export interface GrammarIssue {
  type: GrammarIssueType;
  location?: { start: number; end: number };
  original: string;
  suggestion: string;
  explanation: string;
}

export type GrammarIssueType =
  | 'subject-verb-agreement'
  | 'tense-consistency'
  | 'comma-usage'
  | 'run-on-sentence'
  | 'fragment'
  | 'pronoun-agreement'
  | 'apostrophe'
  | 'capitalization'
  | 'spelling'
  | 'word-choice';

export interface WritingElement {
  name: string;
  description: string;
  purpose: string;
  tips: string[];
}

export interface CitationInfo {
  format: CitationFormat;
  template: string;
  example: string;
  explanation: string;
}

export type CitationFormat = 'MLA' | 'APA' | 'Chicago';

export interface VocabularyWord {
  word: string;
  definition: string;
  partOfSpeech: string;
  synonyms: string[];
  antonyms: string[];
  exampleSentence: string;
  etymology?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// LITERARY DEVICES DATA
// ══════════════════════════════════════════════════════════════════════════════

const LITERARY_DEVICES: Record<string, LiteraryDevice> = {
  metaphor: {
    type: 'metaphor',
    definition: 'A direct comparison between two unlike things without using "like" or "as"',
    function: 'Creates vivid imagery and deeper meaning by equating two different concepts',
  },
  simile: {
    type: 'simile',
    definition: 'A comparison using "like" or "as"',
    function: 'Makes descriptions more vivid and relatable by comparing to familiar things',
  },
  personification: {
    type: 'personification',
    definition: 'Giving human qualities to non-human things',
    function: 'Makes abstract concepts or objects more relatable and engaging',
  },
  alliteration: {
    type: 'alliteration',
    definition: 'Repetition of consonant sounds at the beginning of words',
    function: 'Creates rhythm and makes phrases memorable',
  },
  hyperbole: {
    type: 'hyperbole',
    definition: 'Extreme exaggeration for emphasis or effect',
    function: 'Emphasizes a point or creates humor through obvious exaggeration',
  },
  imagery: {
    type: 'imagery',
    definition: 'Language that appeals to the five senses',
    function: 'Helps readers visualize and experience the writing more vividly',
  },
  symbolism: {
    type: 'symbolism',
    definition: 'Using objects, characters, or colors to represent abstract ideas',
    function: 'Adds layers of meaning and connects to broader themes',
  },
  foreshadowing: {
    type: 'foreshadowing',
    definition: 'Hints or clues about what will happen later in the story',
    function: 'Builds suspense and prepares readers for future events',
  },
  irony: {
    type: 'irony',
    definition: 'A contrast between expectation and reality',
    function: 'Creates surprise, humor, or emphasizes themes',
  },
  onomatopoeia: {
    type: 'onomatopoeia',
    definition: 'Words that imitate sounds',
    function: 'Adds sensory detail and makes writing more vivid',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// LANGUAGE ARTS PROCESSOR
// ══════════════════════════════════════════════════════════════════════════════

export class LanguageArtsProcessor {
  /**
   * Parse raw text into a structured language arts problem
   */
  parseProblem(rawText: string, gradeBand: GradeBand): LanguageArtsProblem {
    const problemType = this.detectProblemType(rawText);
    const textType = this.detectTextType(rawText);
    const literaryDevices = this.detectLiteraryDevices(rawText);
    const grammarIssues = this.analyzeGrammar(rawText);
    const writingElements = this.identifyWritingElements(rawText, problemType);
    const difficulty = this.calculateDifficulty(problemType, gradeBand);

    return {
      rawText,
      problemType,
      textType,
      literaryDevices,
      grammarIssues,
      writingElements,
      difficulty,
      gradeBand,
    };
  }

  /**
   * Analyze grammar in text and identify issues
   */
  analyzeGrammar(text: string): GrammarIssue[] {
    const issues: GrammarIssue[] = [];

    // Check for common grammar issues

    // Run-on sentences (very long sentences without proper punctuation)
    const sentences = text.split(/[.!?]+/);
    sentences.forEach((sentence, index) => {
      const words = sentence.trim().split(/\s+/);
      if (words.length > 35 && !sentence.includes(',') && !sentence.includes(';')) {
        issues.push({
          type: 'run-on-sentence',
          original: sentence.trim().substring(0, 50) + '...',
          suggestion: 'Consider breaking this into shorter sentences',
          explanation: 'Long sentences without punctuation are hard to read. Try breaking this into 2-3 shorter sentences.',
        });
      }
    });

    // Common word confusions
    const confusions: Array<{ pattern: RegExp; type: GrammarIssueType; suggestion: string; explanation: string }> = [
      {
        pattern: /\btheir\s+(is|was|are|were)\b/gi,
        type: 'word-choice',
        suggestion: 'Use "there" for location or "they\'re" for "they are"',
        explanation: '"Their" is possessive (belonging to them). "There" indicates place. "They\'re" means "they are".',
      },
      {
        pattern: /\bits\s+(?!own|time|way|self)/gi,
        type: 'apostrophe',
        suggestion: 'Check if you mean "it\'s" (it is) or "its" (possessive)',
        explanation: '"It\'s" is a contraction of "it is." "Its" shows possession.',
      },
      {
        pattern: /\byour\s+(a|an|the)\b/gi,
        type: 'word-choice',
        suggestion: 'Check if you mean "you\'re" (you are)',
        explanation: '"Your" is possessive. "You\'re" is a contraction of "you are."',
      },
      {
        pattern: /\bcould\s+of\b/gi,
        type: 'word-choice',
        suggestion: 'Use "could have" or "could\'ve"',
        explanation: 'The correct phrase is "could have," not "could of."',
      },
      {
        pattern: /\bshould\s+of\b/gi,
        type: 'word-choice',
        suggestion: 'Use "should have" or "should\'ve"',
        explanation: 'The correct phrase is "should have," not "should of."',
      },
    ];

    for (const { pattern, type, suggestion, explanation } of confusions) {
      const match = text.match(pattern);
      if (match) {
        issues.push({
          type,
          original: match[0],
          suggestion,
          explanation,
        });
      }
    }

    // Check capitalization at sentence starts
    const sentenceStarts = text.match(/[.!?]\s+[a-z]/g);
    if (sentenceStarts && sentenceStarts.length > 0) {
      issues.push({
        type: 'capitalization',
        original: sentenceStarts[0],
        suggestion: 'Capitalize the first letter of each sentence',
        explanation: 'Every sentence should begin with a capital letter.',
      });
    }

    return issues;
  }

  /**
   * Provide writing feedback
   */
  provideWritingFeedback(text: string, textType?: TextType): WritingFeedback {
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = (text.match(/[.!?]+/g) || []).length;
    const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : wordCount;
    const paragraphCount = (text.match(/\n\s*\n/g) || []).length + 1;

    const strengths: string[] = [];
    const areasForImprovement: string[] = [];
    const suggestions: string[] = [];

    // Analyze sentence variety
    if (avgSentenceLength >= 12 && avgSentenceLength <= 20) {
      strengths.push('Good sentence length variety');
    } else if (avgSentenceLength < 12) {
      areasForImprovement.push('Sentences are quite short');
      suggestions.push('Try combining some short sentences with conjunctions like "and," "but," or "because"');
    } else {
      areasForImprovement.push('Sentences are quite long');
      suggestions.push('Break up long sentences into shorter ones for clarity');
    }

    // Check paragraph structure
    if (paragraphCount >= 3 && wordCount / paragraphCount >= 50) {
      strengths.push('Good paragraph structure');
    } else if (paragraphCount < 3 && wordCount > 150) {
      areasForImprovement.push('Consider breaking text into more paragraphs');
      suggestions.push('Start a new paragraph when you introduce a new idea');
    }

    // Check for transition words
    const transitionWords = [
      'however',
      'therefore',
      'moreover',
      'furthermore',
      'consequently',
      'nevertheless',
      'additionally',
      'first',
      'second',
      'finally',
      'in conclusion',
      'for example',
      'in contrast',
    ];
    const usedTransitions = transitionWords.filter((w) => text.toLowerCase().includes(w));

    if (usedTransitions.length >= 3) {
      strengths.push('Good use of transition words');
    } else {
      areasForImprovement.push('Could use more transition words');
      suggestions.push(`Try using words like "${transitionWords.slice(0, 5).join('", "')}" to connect ideas`);
    }

    // Type-specific feedback
    if (textType === 'persuasive') {
      const persuasiveElements = text.match(/\b(should|must|important|believe|evidence|reason|because)\b/gi);
      if (persuasiveElements && persuasiveElements.length >= 3) {
        strengths.push('Uses persuasive language effectively');
      } else {
        suggestions.push('Include more persuasive language and reasons to support your argument');
      }
    }

    if (textType === 'narrative') {
      const dialogueMarkers = text.match(/[""]/g);
      const sensoryWords = text.match(/\b(saw|heard|felt|smelled|tasted|looked|sounded)\b/gi);

      if (dialogueMarkers && dialogueMarkers.length > 0) {
        strengths.push('Includes dialogue');
      }
      if (sensoryWords && sensoryWords.length >= 2) {
        strengths.push('Uses sensory details');
      } else {
        suggestions.push('Add more sensory details to help readers experience the story');
      }
    }

    return {
      wordCount,
      sentenceCount,
      paragraphCount,
      averageSentenceLength: avgSentenceLength,
      strengths,
      areasForImprovement,
      suggestions,
    };
  }

  /**
   * Format citations in various styles
   */
  formatCitation(
    format: CitationFormat,
    source: {
      type: 'book' | 'article' | 'website';
      author?: string;
      title: string;
      publisher?: string;
      year?: number;
      url?: string;
      accessDate?: string;
      volume?: number;
      issue?: number;
      pages?: string;
    }
  ): CitationInfo {
    let template = '';
    let example = '';
    let explanation = '';

    switch (format) {
      case 'MLA':
        if (source.type === 'book') {
          template = 'Author Last, First. Title. Publisher, Year.';
          example = `${source.author ?? 'Author'}. ${source.title}. ${source.publisher ?? 'Publisher'}, ${source.year ?? 'Year'}.`;
          explanation = 'MLA uses author-first format with periods between elements.';
        } else if (source.type === 'website') {
          template = 'Author. "Title." Website Name, Publisher, Day Month Year, URL.';
          example = `${source.author ?? 'Author'}. "${source.title}." ${source.publisher ?? 'Website'}, ${source.accessDate ?? 'Access Date'}, ${source.url ?? 'URL'}.`;
          explanation = 'For websites, include the access date and full URL.';
        }
        break;

      case 'APA':
        if (source.type === 'book') {
          template = 'Author, A. A. (Year). Title of work. Publisher.';
          example = `${source.author ?? 'Author, A.'} (${source.year ?? 'Year'}). ${source.title}. ${source.publisher ?? 'Publisher'}.`;
          explanation = 'APA puts the year after the author and uses sentence case for titles.';
        } else if (source.type === 'website') {
          template = 'Author, A. A. (Year, Month Day). Title of page. Site Name. URL';
          example = `${source.author ?? 'Author'} (${source.year ?? 'Year'}). ${source.title}. ${source.publisher ?? 'Site'}. ${source.url ?? 'URL'}`;
          explanation = 'APA requires specific date format and retrieval information.';
        }
        break;

      case 'Chicago':
        if (source.type === 'book') {
          template = 'Author Last, First. Title. Place: Publisher, Year.';
          example = `${source.author ?? 'Author'}. ${source.title}. ${source.publisher ?? 'Place: Publisher'}, ${source.year ?? 'Year'}.`;
          explanation = 'Chicago style includes place of publication for books.';
        } else if (source.type === 'website') {
          template = 'Author Last, First. "Title." Site Name. Last modified Date. URL.';
          example = `${source.author ?? 'Author'}. "${source.title}." ${source.publisher ?? 'Site'}. ${source.accessDate ?? 'Date'}. ${source.url ?? 'URL'}.`;
          explanation = 'Chicago style for websites includes the last modified date.';
        }
        break;
    }

    return { format, template, example, explanation };
  }

  /**
   * Get vocabulary information for a word
   */
  getVocabularyInfo(word: string): VocabularyWord | null {
    // In production, this would connect to a dictionary API
    // Here we provide some common vocabulary examples

    const vocabulary: Record<string, VocabularyWord> = {
      analyze: {
        word: 'analyze',
        definition: 'To examine something in detail in order to understand or explain it',
        partOfSpeech: 'verb',
        synonyms: ['examine', 'study', 'investigate', 'scrutinize'],
        antonyms: ['ignore', 'overlook', 'neglect'],
        exampleSentence: 'The scientist will analyze the data from the experiment.',
        etymology: 'From Greek "analusis" meaning "a breaking up"',
      },
      protagonist: {
        word: 'protagonist',
        definition: 'The main character in a story, novel, or play',
        partOfSpeech: 'noun',
        synonyms: ['hero', 'main character', 'lead'],
        antonyms: ['antagonist', 'villain'],
        exampleSentence: 'The protagonist of the novel faces many challenges on her journey.',
      },
      theme: {
        word: 'theme',
        definition: 'The main idea or message of a literary work',
        partOfSpeech: 'noun',
        synonyms: ['subject', 'topic', 'motif', 'message'],
        antonyms: [],
        exampleSentence: 'The theme of friendship runs throughout the entire book.',
      },
      inference: {
        word: 'inference',
        definition: 'A conclusion reached based on evidence and reasoning',
        partOfSpeech: 'noun',
        synonyms: ['deduction', 'conclusion', 'interpretation'],
        antonyms: ['fact', 'certainty'],
        exampleSentence: 'Based on the clues in the text, I made an inference about the character\'s motivation.',
      },
    };

    return vocabulary[word.toLowerCase()] ?? null;
  }

  /**
   * Detect literary devices in text
   */
  detectLiteraryDevices(text: string): LiteraryDevice[] {
    const devices: LiteraryDevice[] = [];
    const lowerText = text.toLowerCase();

    // Simile detection
    const similePattern = /\b\w+\s+(is|was|are|were|seems?|looks?|feels?)\s+like\s+\w+/gi;
    const asPattern = /as\s+\w+\s+as/gi;
    if (similePattern.test(text) || asPattern.test(text)) {
      devices.push({
        ...LITERARY_DEVICES.simile,
        example: text.match(similePattern)?.[0] ?? text.match(asPattern)?.[0],
      });
    }

    // Alliteration detection
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const current = words[i].toLowerCase().replace(/[^a-z]/g, '');
      const next = words[i + 1].toLowerCase().replace(/[^a-z]/g, '');
      if (current[0] === next[0] && current.length > 2 && next.length > 2) {
        devices.push({
          ...LITERARY_DEVICES.alliteration,
          example: `${words[i]} ${words[i + 1]}`,
        });
        break;
      }
    }

    // Hyperbole detection
    const hyperbolePatterns = [
      /million\s+times/i,
      /forever/i,
      /never\s+in\s+my\s+life/i,
      /best\s+ever/i,
      /worst\s+ever/i,
      /dying\s+(to|of)/i,
      /starving/i,
    ];
    for (const pattern of hyperbolePatterns) {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        devices.push({
          ...LITERARY_DEVICES.hyperbole,
          example: match?.[0],
        });
        break;
      }
    }

    // Personification detection
    const personificationPatterns = [
      /\b(wind|sun|moon|stars?|trees?|flowers?)\s+(whisper|dance|sing|cry|sleep|wake)/gi,
      /\b(time|death|love|nature)\s+(waits?|calls?|speaks?)/gi,
    ];
    for (const pattern of personificationPatterns) {
      if (pattern.test(text)) {
        devices.push({
          ...LITERARY_DEVICES.personification,
          example: text.match(pattern)?.[0],
        });
        break;
      }
    }

    // Onomatopoeia detection
    const onomatopoeia = ['buzz', 'hiss', 'bang', 'crash', 'splash', 'whoosh', 'boom', 'click', 'pop', 'sizzle'];
    for (const word of onomatopoeia) {
      if (lowerText.includes(word)) {
        devices.push({
          ...LITERARY_DEVICES.onomatopoeia,
          example: word,
        });
        break;
      }
    }

    return devices;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private detectProblemType(text: string): LanguageArtsProblemType {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes('read') ||
      lowerText.includes('passage') ||
      lowerText.includes('according to the text') ||
      lowerText.includes('what does the author')
    ) {
      return 'reading-comprehension';
    }

    if (
      lowerText.includes('write an essay') ||
      lowerText.includes('paragraph') ||
      lowerText.includes('compose')
    ) {
      return 'essay-writing';
    }

    if (
      lowerText.includes('grammar') ||
      lowerText.includes('correct the sentence') ||
      lowerText.includes('identify the error')
    ) {
      return 'grammar';
    }

    if (
      lowerText.includes('define') ||
      lowerText.includes('vocabulary') ||
      lowerText.includes('meaning of the word')
    ) {
      return 'vocabulary';
    }

    if (
      lowerText.includes('analyze') ||
      lowerText.includes('theme') ||
      lowerText.includes('literary device') ||
      lowerText.includes('symbolism')
    ) {
      return 'literary-analysis';
    }

    if (
      lowerText.includes('story') ||
      lowerText.includes('poem') ||
      lowerText.includes('creative')
    ) {
      return 'creative-writing';
    }

    if (lowerText.includes('cite') || lowerText.includes('bibliography') || lowerText.includes('works cited')) {
      return 'citation';
    }

    if (lowerText.includes('research') || lowerText.includes('sources')) {
      return 'research';
    }

    if (lowerText.includes('speech') || lowerText.includes('presentation')) {
      return 'speech';
    }

    return 'unknown';
  }

  private detectTextType(text: string): TextType | undefined {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes('once upon') ||
      lowerText.includes('story') ||
      lowerText.match(/\bcharacter\b.*\bplot\b/)
    ) {
      return 'narrative';
    }

    if (
      lowerText.includes('should') ||
      lowerText.includes('must') ||
      lowerText.includes('argue') ||
      lowerText.includes('convince')
    ) {
      return 'persuasive';
    }

    if (
      lowerText.includes('describe') ||
      lowerText.includes('imagery') ||
      lowerText.includes('sensory')
    ) {
      return 'descriptive';
    }

    if (lowerText.includes('poem') || lowerText.includes('stanza') || lowerText.includes('rhyme')) {
      return 'poetry';
    }

    if (lowerText.includes('play') || lowerText.includes('act') || lowerText.includes('scene')) {
      return 'drama';
    }

    if (
      lowerText.includes('explain') ||
      lowerText.includes('inform') ||
      lowerText.includes('facts')
    ) {
      return 'expository';
    }

    return undefined;
  }

  private identifyWritingElements(
    text: string,
    problemType: LanguageArtsProblemType
  ): WritingElement[] {
    const elements: WritingElement[] = [];

    if (problemType === 'essay-writing') {
      elements.push(
        {
          name: 'Introduction',
          description: 'The opening paragraph that introduces your topic',
          purpose: 'Grab the reader\'s attention and present your thesis',
          tips: [
            'Start with a hook (question, quote, or interesting fact)',
            'Provide background context',
            'End with your thesis statement',
          ],
        },
        {
          name: 'Body Paragraphs',
          description: 'The middle paragraphs that develop your argument',
          purpose: 'Present evidence and explain your points',
          tips: [
            'Start each paragraph with a topic sentence',
            'Include evidence (quotes, examples, facts)',
            'Explain how the evidence supports your point',
            'Use transitions between paragraphs',
          ],
        },
        {
          name: 'Conclusion',
          description: 'The final paragraph that wraps up your essay',
          purpose: 'Summarize your argument and leave a lasting impression',
          tips: [
            'Restate your thesis in new words',
            'Summarize main points briefly',
            'End with a thought-provoking statement',
            'Never introduce new information',
          ],
        }
      );
    }

    if (problemType === 'creative-writing' || problemType === 'reading-comprehension') {
      elements.push(
        {
          name: 'Plot',
          description: 'The sequence of events in a story',
          purpose: 'Drives the narrative and keeps readers engaged',
          tips: [
            'Include exposition, rising action, climax, falling action, resolution',
          ],
        },
        {
          name: 'Character Development',
          description: 'How characters grow and change',
          purpose: 'Makes characters believable and relatable',
          tips: [
            'Show character traits through actions and dialogue',
            'Allow characters to face challenges and grow',
          ],
        },
        {
          name: 'Setting',
          description: 'The time and place of the story',
          purpose: 'Creates atmosphere and context',
          tips: [
            'Use sensory details to bring the setting to life',
            'Consider how setting affects mood',
          ],
        }
      );
    }

    return elements;
  }

  private calculateDifficulty(
    problemType: LanguageArtsProblemType,
    gradeBand: GradeBand
  ): number {
    let difficulty = 5;

    // Adjust by grade band
    if (gradeBand === 'K5') difficulty -= 2;
    if (gradeBand === 'G9_12') difficulty += 2;

    // Adjust by problem type
    const typeAdjustments: Record<LanguageArtsProblemType, number> = {
      'reading-comprehension': 0,
      'essay-writing': 1,
      grammar: -1,
      vocabulary: 0,
      'literary-analysis': 2,
      'creative-writing': 1,
      research: 2,
      citation: 1,
      speech: 1,
      unknown: 0,
    };
    difficulty += typeAdjustments[problemType] ?? 0;

    return Math.min(10, Math.max(1, difficulty));
  }
}

interface WritingFeedback {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageSentenceLength: number;
  strengths: string[];
  areasForImprovement: string[];
  suggestions: string[];
}

// Export singleton instance
export const languageArtsProcessor = new LanguageArtsProcessor();
