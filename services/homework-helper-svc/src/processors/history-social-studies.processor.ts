/**
 * History & Social Studies Processor
 * Specialized processing for history and social studies homework problems
 *
 * Features:
 * - Date/timeline extraction
 * - Primary source analysis
 * - Map interpretation
 * - Historical context building
 */

import type { GradeBand } from '../types/aiContract.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface HistorySocialStudiesProblem {
  rawText: string;
  category: HSCategory;
  problemType: HSProblemType;
  timeReferences: TimeReference[];
  geographicReferences: GeographicReference[];
  historicalFigures: HistoricalFigure[];
  concepts: string[];
  difficulty: number;
  gradeBand: GradeBand;
}

export type HSCategory =
  | 'us-history'
  | 'world-history'
  | 'civics'
  | 'geography'
  | 'economics'
  | 'current-events'
  | 'social-studies';

export type HSProblemType =
  | 'timeline'
  | 'cause-effect'
  | 'primary-source-analysis'
  | 'map-interpretation'
  | 'comparison'
  | 'essay'
  | 'definition'
  | 'identification'
  | 'document-analysis'
  | 'unknown';

export interface TimeReference {
  raw: string;
  year?: number;
  decade?: number;
  century?: number;
  era?: string;
  period?: string;
  type: 'exact' | 'approximate' | 'range' | 'era';
}

export interface GeographicReference {
  name: string;
  type: 'country' | 'region' | 'city' | 'continent' | 'body-of-water' | 'landmark';
  modernName?: string;
  historicalName?: string;
}

export interface HistoricalFigure {
  name: string;
  role?: string;
  era?: string;
  significance?: string;
}

export interface TimelineEvent {
  date: string;
  year: number;
  event: string;
  significance: string;
  category?: string;
}

export interface PrimarySourceAnalysis {
  sourceType: 'letter' | 'speech' | 'document' | 'newspaper' | 'photograph' | 'map' | 'artifact' | 'other';
  questions: AnalysisQuestion[];
  contextualization: string;
  perspectiveConsiderations: string[];
  biasIndicators: string[];
}

export interface AnalysisQuestion {
  question: string;
  purpose: string;
  sampleAnswer?: string;
}

export interface MapElement {
  name: string;
  type: 'border' | 'river' | 'mountain' | 'city' | 'region' | 'trade-route' | 'battle';
  historicalSignificance?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// HISTORICAL ERAS
// ══════════════════════════════════════════════════════════════════════════════

const HISTORICAL_ERAS: Record<string, { start: number; end: number; name: string }> = {
  ancient: { start: -3000, end: 500, name: 'Ancient History' },
  medieval: { start: 500, end: 1500, name: 'Medieval Period' },
  renaissance: { start: 1300, end: 1600, name: 'Renaissance' },
  'age-of-exploration': { start: 1400, end: 1600, name: 'Age of Exploration' },
  enlightenment: { start: 1685, end: 1815, name: 'Age of Enlightenment' },
  'industrial-revolution': { start: 1760, end: 1840, name: 'Industrial Revolution' },
  'civil-war': { start: 1861, end: 1865, name: 'American Civil War Era' },
  'world-war-i': { start: 1914, end: 1918, name: 'World War I' },
  'great-depression': { start: 1929, end: 1939, name: 'Great Depression' },
  'world-war-ii': { start: 1939, end: 1945, name: 'World War II' },
  'cold-war': { start: 1947, end: 1991, name: 'Cold War' },
  'civil-rights': { start: 1954, end: 1968, name: 'Civil Rights Movement' },
};

// ══════════════════════════════════════════════════════════════════════════════
// HISTORY & SOCIAL STUDIES PROCESSOR
// ══════════════════════════════════════════════════════════════════════════════

export class HistorySocialStudiesProcessor {
  /**
   * Parse raw text into a structured history/social studies problem
   */
  parseProblem(rawText: string, gradeBand: GradeBand): HistorySocialStudiesProblem {
    const category = this.detectCategory(rawText);
    const problemType = this.detectProblemType(rawText);
    const timeReferences = this.extractTimeReferences(rawText);
    const geographicReferences = this.extractGeographicReferences(rawText);
    const historicalFigures = this.extractHistoricalFigures(rawText);
    const concepts = this.extractConcepts(rawText, category);
    const difficulty = this.calculateDifficulty(category, problemType, gradeBand);

    return {
      rawText,
      category,
      problemType,
      timeReferences,
      geographicReferences,
      historicalFigures,
      concepts,
      difficulty,
      gradeBand,
    };
  }

  /**
   * Extract and organize timeline events from text
   */
  extractTimeline(text: string): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const timeRefs = this.extractTimeReferences(text);

    // Try to associate dates with events in the text
    for (const ref of timeRefs) {
      if (ref.year) {
        // Find sentence containing this date
        const sentences = text.split(/[.!?]+/);
        for (const sentence of sentences) {
          if (sentence.includes(ref.raw)) {
            events.push({
              date: ref.raw,
              year: ref.year,
              event: sentence.trim(),
              significance: this.inferSignificance(sentence),
              category: this.categorizeEvent(sentence),
            });
            break;
          }
        }
      }
    }

    // Sort by year
    events.sort((a, b) => a.year - b.year);

    return events;
  }

  /**
   * Generate primary source analysis framework
   */
  generatePrimarySourceAnalysis(sourceType: PrimarySourceAnalysis['sourceType']): PrimarySourceAnalysis {
    const commonQuestions: AnalysisQuestion[] = [
      {
        question: 'Who created this source?',
        purpose: 'Identify the author/creator and their perspective',
        sampleAnswer: 'Consider the creator\'s background, position, and potential biases.',
      },
      {
        question: 'When was this source created?',
        purpose: 'Understand the historical context',
        sampleAnswer: 'Consider what was happening at this time that might have influenced the source.',
      },
      {
        question: 'Who was the intended audience?',
        purpose: 'Understand why the source was created',
        sampleAnswer: 'Think about who the creator was trying to reach and why.',
      },
      {
        question: 'What was the purpose of this source?',
        purpose: 'Identify the creator\'s goals',
        sampleAnswer: 'Was it meant to inform, persuade, record, or entertain?',
      },
    ];

    const typeSpecificQuestions: Record<typeof sourceType, AnalysisQuestion[]> = {
      letter: [
        {
          question: 'What is the relationship between the sender and recipient?',
          purpose: 'Understand the context of the communication',
        },
        {
          question: 'What emotions or concerns does the letter express?',
          purpose: 'Identify personal perspectives and feelings',
        },
      ],
      speech: [
        {
          question: 'What rhetorical devices does the speaker use?',
          purpose: 'Analyze persuasive techniques',
        },
        {
          question: 'What was the occasion for this speech?',
          purpose: 'Understand the historical moment',
        },
      ],
      document: [
        {
          question: 'What type of document is this (legal, political, personal)?',
          purpose: 'Categorize the source',
        },
        {
          question: 'What authority or power does this document represent?',
          purpose: 'Understand institutional context',
        },
      ],
      newspaper: [
        {
          question: 'What perspective does the newspaper represent?',
          purpose: 'Identify potential editorial bias',
        },
        {
          question: 'Is this a news report or an opinion piece?',
          purpose: 'Distinguish fact from opinion',
        },
      ],
      photograph: [
        {
          question: 'What is shown in the photograph and what is not shown?',
          purpose: 'Consider framing and selection',
        },
        {
          question: 'Was this photo posed or candid?',
          purpose: 'Assess authenticity',
        },
      ],
      map: [
        {
          question: 'What does this map include or exclude?',
          purpose: 'Understand choices in representation',
        },
        {
          question: 'What perspective or projection is used?',
          purpose: 'Consider geographic bias',
        },
      ],
      artifact: [
        {
          question: 'What was this object used for?',
          purpose: 'Understand historical function',
        },
        {
          question: 'Who would have owned or used this object?',
          purpose: 'Consider social and economic context',
        },
      ],
      other: [],
    };

    const questions = [...commonQuestions, ...(typeSpecificQuestions[sourceType] || [])];

    return {
      sourceType,
      questions,
      contextualization:
        'Consider what was happening historically when this source was created. ' +
        'Think about the social, political, economic, and cultural context.',
      perspectiveConsiderations: [
        'Consider the creator\'s social position, education, and experiences',
        'Think about what the creator might have gained from creating this source',
        'Consider whose voices might be missing from this source',
        'Think about how different groups might interpret this source differently',
      ],
      biasIndicators: [
        'Strong emotional language',
        'One-sided presentation of events',
        'Omission of important information',
        'Stereotyping or generalizations',
        'Appeals to authority without evidence',
        'Loaded or propaganda-like language',
      ],
    };
  }

  /**
   * Analyze map elements and significance
   */
  analyzeMap(description: string): MapElement[] {
    const elements: MapElement[] = [];
    const lowerDesc = description.toLowerCase();

    // Detect geographic features
    if (lowerDesc.includes('river')) {
      elements.push({
        name: 'River',
        type: 'river',
        historicalSignificance: 'Rivers were crucial for transportation, trade, and settlement patterns.',
      });
    }

    if (lowerDesc.includes('mountain') || lowerDesc.includes('range')) {
      elements.push({
        name: 'Mountain Range',
        type: 'mountain',
        historicalSignificance: 'Mountains served as natural barriers affecting migration, trade, and territorial boundaries.',
      });
    }

    if (lowerDesc.includes('border') || lowerDesc.includes('boundary')) {
      elements.push({
        name: 'Political Border',
        type: 'border',
        historicalSignificance: 'Borders define political authority and have often been sources of conflict.',
      });
    }

    if (lowerDesc.includes('trade route') || lowerDesc.includes('silk road') || lowerDesc.includes('spice')) {
      elements.push({
        name: 'Trade Route',
        type: 'trade-route',
        historicalSignificance: 'Trade routes facilitated cultural exchange, economic development, and the spread of ideas.',
      });
    }

    if (lowerDesc.includes('battle') || lowerDesc.includes('war') || lowerDesc.includes('conflict')) {
      elements.push({
        name: 'Battle Site',
        type: 'battle',
        historicalSignificance: 'Battle locations often determined the outcome of wars and changed political boundaries.',
      });
    }

    return elements;
  }

  /**
   * Get key concepts for a historical topic
   */
  getRelatedConcepts(topic: string): {
    name: string;
    definition: string;
    examples: string[];
    relatedTerms: string[];
  }[] {
    const concepts: Record<string, {
      name: string;
      definition: string;
      examples: string[];
      relatedTerms: string[];
    }> = {
      democracy: {
        name: 'Democracy',
        definition: 'A system of government where power is held by the people, either directly or through elected representatives.',
        examples: ['Ancient Athens', 'United States Constitution', 'Modern elections'],
        relatedTerms: ['republic', 'voting rights', 'representation', 'citizenship'],
      },
      revolution: {
        name: 'Revolution',
        definition: 'A fundamental change in political power or organizational structures, often occurring in a relatively short period.',
        examples: ['American Revolution', 'French Revolution', 'Industrial Revolution'],
        relatedTerms: ['reform', 'rebellion', 'independence', 'transformation'],
      },
      imperialism: {
        name: 'Imperialism',
        definition: 'A policy of extending a country\'s power and influence through colonization, use of military force, or other means.',
        examples: ['British Empire', 'Scramble for Africa', 'European colonization of Americas'],
        relatedTerms: ['colonialism', 'expansion', 'exploitation', 'nationalism'],
      },
      nationalism: {
        name: 'Nationalism',
        definition: 'Strong identification with one\'s own nation and support for its interests, especially to the exclusion of others.',
        examples: ['Unification of Italy and Germany', 'Independence movements', 'World War I'],
        relatedTerms: ['patriotism', 'self-determination', 'identity', 'sovereignty'],
      },
      'civil-rights': {
        name: 'Civil Rights',
        definition: 'Rights that protect individuals from discrimination and guarantee equal treatment under the law.',
        examples: ['Civil Rights Act of 1964', 'Brown v. Board of Education', 'Voting Rights Act'],
        relatedTerms: ['equality', 'discrimination', 'segregation', 'justice'],
      },
      immigration: {
        name: 'Immigration',
        definition: 'The movement of people into a country or region where they are not native residents.',
        examples: ['Ellis Island', 'Great Migration', 'Modern immigration policy'],
        relatedTerms: ['migration', 'assimilation', 'diversity', 'citizenship'],
      },
      capitalism: {
        name: 'Capitalism',
        definition: 'An economic system based on private ownership and free markets.',
        examples: ['Industrial Revolution', 'Stock markets', 'Free enterprise'],
        relatedTerms: ['free market', 'supply and demand', 'competition', 'profit'],
      },
      socialism: {
        name: 'Socialism',
        definition: 'An economic and political system where the means of production are owned or regulated by the community.',
        examples: ['Soviet Union', 'Welfare states', 'Public services'],
        relatedTerms: ['communism', 'collective ownership', 'redistribution', 'welfare'],
      },
    };

    const lowerTopic = topic.toLowerCase();
    const matches: typeof concepts[string][] = [];

    for (const [key, concept] of Object.entries(concepts)) {
      if (lowerTopic.includes(key) || concept.relatedTerms.some((t) => lowerTopic.includes(t))) {
        matches.push(concept);
      }
    }

    return matches;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private detectCategory(text: string): HSCategory {
    const lowerText = text.toLowerCase();

    // US History
    const usHistoryKeywords = [
      'constitution',
      'founding fathers',
      'civil war',
      'declaration of independence',
      'revolutionary war',
      'slavery',
      'reconstruction',
      'great depression',
      'new deal',
      'civil rights movement',
      'american',
      'united states',
      'congress',
      'president',
    ];
    if (usHistoryKeywords.some((k) => lowerText.includes(k))) {
      return 'us-history';
    }

    // World History
    const worldHistoryKeywords = [
      'world war',
      'ancient',
      'medieval',
      'renaissance',
      'empire',
      'dynasty',
      'colonization',
      'imperialism',
      'revolution',
      'cold war',
      'rome',
      'greece',
      'egypt',
      'china',
      'europe',
    ];
    if (worldHistoryKeywords.some((k) => lowerText.includes(k))) {
      return 'world-history';
    }

    // Civics/Government
    const civicsKeywords = [
      'government',
      'democracy',
      'constitution',
      'rights',
      'law',
      'voting',
      'election',
      'citizen',
      'branches',
      'judicial',
      'executive',
      'legislative',
    ];
    if (civicsKeywords.some((k) => lowerText.includes(k))) {
      return 'civics';
    }

    // Geography
    const geographyKeywords = [
      'map',
      'continent',
      'ocean',
      'climate',
      'region',
      'population',
      'border',
      'terrain',
      'physical features',
      'latitude',
      'longitude',
    ];
    if (geographyKeywords.some((k) => lowerText.includes(k))) {
      return 'geography';
    }

    // Economics
    const economicsKeywords = [
      'economy',
      'trade',
      'market',
      'supply',
      'demand',
      'inflation',
      'gdp',
      'unemployment',
      'capitalism',
      'socialism',
      'currency',
    ];
    if (economicsKeywords.some((k) => lowerText.includes(k))) {
      return 'economics';
    }

    // Current Events
    const currentEventKeywords = ['current', 'today', 'modern', 'recent', 'news', 'contemporary'];
    if (currentEventKeywords.some((k) => lowerText.includes(k))) {
      return 'current-events';
    }

    return 'social-studies';
  }

  private detectProblemType(text: string): HSProblemType {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('timeline') || lowerText.includes('chronological') || lowerText.includes('sequence')) {
      return 'timeline';
    }

    if (lowerText.includes('cause') || lowerText.includes('effect') || lowerText.includes('resulted in') || lowerText.includes('led to')) {
      return 'cause-effect';
    }

    if (lowerText.includes('primary source') || lowerText.includes('document') || lowerText.includes('analyze the')) {
      return 'primary-source-analysis';
    }

    if (lowerText.includes('map') || lowerText.includes('locate') || lowerText.includes('geographic')) {
      return 'map-interpretation';
    }

    if (lowerText.includes('compare') || lowerText.includes('contrast') || lowerText.includes('similar') || lowerText.includes('different')) {
      return 'comparison';
    }

    if (lowerText.includes('essay') || lowerText.includes('explain') || lowerText.includes('discuss')) {
      return 'essay';
    }

    if (lowerText.includes('define') || lowerText.includes('what is') || lowerText.includes('meaning')) {
      return 'definition';
    }

    if (lowerText.includes('identify') || lowerText.includes('who was') || lowerText.includes('name the')) {
      return 'identification';
    }

    if (lowerText.includes('document') || lowerText.includes('excerpt') || lowerText.includes('passage')) {
      return 'document-analysis';
    }

    return 'unknown';
  }

  private extractTimeReferences(text: string): TimeReference[] {
    const references: TimeReference[] = [];

    // Exact years (1776, 2001, etc.)
    const yearPattern = /\b(1[0-9]{3}|20[0-9]{2})\b/g;
    let match;
    while ((match = yearPattern.exec(text)) !== null) {
      references.push({
        raw: match[0],
        year: Number.parseInt(match[0], 10),
        type: 'exact',
      });
    }

    // Decades (1960s, 1920s, etc.)
    const decadePattern = /\b(1[0-9]|20)[0-9]0s\b/gi;
    while ((match = decadePattern.exec(text)) !== null) {
      const decade = Number.parseInt(match[0].replace('s', ''), 10);
      references.push({
        raw: match[0],
        decade,
        type: 'approximate',
      });
    }

    // Centuries (19th century, 20th century, etc.)
    const centuryPattern = /\b(\d+)(st|nd|rd|th)\s+century\b/gi;
    while ((match = centuryPattern.exec(text)) !== null) {
      const century = Number.parseInt(match[1], 10);
      references.push({
        raw: match[0],
        century,
        type: 'era',
      });
    }

    // Named eras
    for (const [key, era] of Object.entries(HISTORICAL_ERAS)) {
      if (text.toLowerCase().includes(key.replace(/-/g, ' ')) || text.toLowerCase().includes(era.name.toLowerCase())) {
        references.push({
          raw: era.name,
          era: era.name,
          period: `${era.start} - ${era.end}`,
          type: 'era',
        });
      }
    }

    return references;
  }

  private extractGeographicReferences(text: string): GeographicReference[] {
    const references: GeographicReference[] = [];
    const lowerText = text.toLowerCase();

    // Countries
    const countries = [
      'united states', 'america', 'britain', 'england', 'france', 'germany', 'russia',
      'china', 'japan', 'india', 'egypt', 'greece', 'rome', 'italy', 'spain', 'mexico',
    ];
    for (const country of countries) {
      if (lowerText.includes(country)) {
        references.push({ name: country, type: 'country' });
      }
    }

    // Regions
    const regions = [
      'europe', 'asia', 'africa', 'middle east', 'latin america', 'pacific',
      'atlantic', 'mediterranean', 'new england', 'midwest', 'south', 'west',
    ];
    for (const region of regions) {
      if (lowerText.includes(region)) {
        references.push({ name: region, type: 'region' });
      }
    }

    // Bodies of water
    const waters = [
      'atlantic ocean', 'pacific ocean', 'mississippi river', 'nile',
      'mediterranean sea', 'gulf of mexico',
    ];
    for (const water of waters) {
      if (lowerText.includes(water)) {
        references.push({ name: water, type: 'body-of-water' });
      }
    }

    return references;
  }

  private extractHistoricalFigures(text: string): HistoricalFigure[] {
    const figures: HistoricalFigure[] = [];
    const lowerText = text.toLowerCase();

    const knownFigures: Record<string, { role: string; era: string }> = {
      'george washington': { role: 'First US President', era: 'American Revolution' },
      'abraham lincoln': { role: '16th US President', era: 'Civil War' },
      'martin luther king': { role: 'Civil Rights Leader', era: 'Civil Rights Movement' },
      'thomas jefferson': { role: 'Founding Father', era: 'American Revolution' },
      'benjamin franklin': { role: 'Founding Father', era: 'American Revolution' },
      'franklin roosevelt': { role: '32nd US President', era: 'Great Depression/WWII' },
      'julius caesar': { role: 'Roman Dictator', era: 'Ancient Rome' },
      'napoleon': { role: 'French Emperor', era: 'Napoleonic Era' },
      'winston churchill': { role: 'British Prime Minister', era: 'World War II' },
      'adolf hitler': { role: 'Nazi Leader', era: 'World War II' },
      'cleopatra': { role: 'Egyptian Queen', era: 'Ancient Egypt' },
    };

    for (const [name, info] of Object.entries(knownFigures)) {
      if (lowerText.includes(name)) {
        figures.push({
          name: name.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          role: info.role,
          era: info.era,
        });
      }
    }

    return figures;
  }

  private extractConcepts(text: string, category: HSCategory): string[] {
    const concepts: string[] = [];
    const lowerText = text.toLowerCase();

    const conceptLists: Record<HSCategory, string[]> = {
      'us-history': [
        'democracy', 'liberty', 'constitution', 'federalism', 'manifest destiny',
        'civil rights', 'segregation', 'abolition', 'reconstruction',
      ],
      'world-history': [
        'imperialism', 'nationalism', 'colonialism', 'revolution', 'monarchy',
        'feudalism', 'industrialization', 'globalization',
      ],
      civics: [
        'democracy', 'republic', 'citizenship', 'voting', 'representation',
        'checks and balances', 'separation of powers', 'rule of law',
      ],
      geography: [
        'climate', 'population', 'migration', 'urbanization', 'resources',
        'landforms', 'ecosystems', 'regions',
      ],
      economics: [
        'supply', 'demand', 'market', 'trade', 'inflation', 'recession',
        'gdp', 'unemployment', 'capitalism', 'socialism',
      ],
      'current-events': ['policy', 'international relations', 'diplomacy', 'conflict'],
      'social-studies': ['culture', 'society', 'tradition', 'community'],
    };

    const relevantConcepts = conceptLists[category];
    for (const concept of relevantConcepts) {
      if (lowerText.includes(concept)) {
        concepts.push(concept);
      }
    }

    return concepts;
  }

  private inferSignificance(sentence: string): string {
    // Simple heuristic to infer significance
    if (sentence.match(/first|began|started|founded|created/i)) {
      return 'Marks a beginning or founding moment';
    }
    if (sentence.match(/ended|concluded|finished|abolished/i)) {
      return 'Marks an ending or conclusion';
    }
    if (sentence.match(/war|battle|conflict|fought/i)) {
      return 'Military or conflict-related event';
    }
    if (sentence.match(/signed|passed|ratified|enacted/i)) {
      return 'Legal or political milestone';
    }
    if (sentence.match(/discovered|invented|developed/i)) {
      return 'Innovation or discovery';
    }
    return 'Historical event';
  }

  private categorizeEvent(sentence: string): string {
    if (sentence.match(/war|battle|military|army|navy/i)) return 'Military';
    if (sentence.match(/president|congress|law|court|vote/i)) return 'Political';
    if (sentence.match(/trade|economy|market|industry/i)) return 'Economic';
    if (sentence.match(/culture|art|music|literature|religion/i)) return 'Cultural';
    if (sentence.match(/science|discovery|invention|technology/i)) return 'Scientific';
    if (sentence.match(/rights|equality|movement|protest/i)) return 'Social';
    return 'General';
  }

  private calculateDifficulty(
    category: HSCategory,
    problemType: HSProblemType,
    gradeBand: GradeBand
  ): number {
    let difficulty = 5;

    // Adjust by grade band
    if (gradeBand === 'K5') difficulty -= 2;
    if (gradeBand === 'G9_12') difficulty += 2;

    // Adjust by problem type
    const typeAdjustments: Record<HSProblemType, number> = {
      timeline: 0,
      'cause-effect': 1,
      'primary-source-analysis': 2,
      'map-interpretation': 0,
      comparison: 1,
      essay: 2,
      definition: -1,
      identification: -1,
      'document-analysis': 2,
      unknown: 0,
    };
    difficulty += typeAdjustments[problemType] ?? 0;

    return Math.min(10, Math.max(1, difficulty));
  }
}

// Export singleton instance
export const historySocialStudiesProcessor = new HistorySocialStudiesProcessor();
