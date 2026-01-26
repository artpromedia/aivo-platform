/**
 * Science Processor
 * Specialized processing for science homework problems
 *
 * Features:
 * - Scientific notation handling
 * - Unit conversion support
 * - Diagram interpretation
 * - Lab report assistance
 */

import type { GradeBand } from '../types/aiContract.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ScienceProblem {
  rawText: string;
  category: ScienceCategory;
  problemType: ScienceProblemType;
  concepts: string[];
  units: Unit[];
  scientificNotation: ScientificNotation[];
  difficulty: number;
  gradeBand: GradeBand;
}

export type ScienceCategory = 'biology' | 'chemistry' | 'physics' | 'earth-science' | 'environmental' | 'general';

export type ScienceProblemType =
  | 'calculation'
  | 'concept-explanation'
  | 'diagram-analysis'
  | 'experiment-design'
  | 'data-analysis'
  | 'hypothesis'
  | 'classification'
  | 'process-description'
  | 'comparison'
  | 'unknown';

export interface Unit {
  value: number;
  unit: string;
  type: UnitType;
  siUnit?: string;
}

export type UnitType = 'length' | 'mass' | 'time' | 'temperature' | 'volume' | 'force' | 'energy' | 'other';

export interface ScientificNotation {
  raw: string;
  coefficient: number;
  exponent: number;
  standard: number;
}

export interface UnitConversion {
  from: Unit;
  to: Unit;
  factor: number;
  explanation: string;
}

export interface ScienceFormula {
  name: string;
  formula: string;
  latex: string;
  description: string;
  variables: Array<{ symbol: string; meaning: string; unit: string }>;
  category: ScienceCategory;
  examples: string[];
}

export interface DiagramElement {
  name: string;
  description: string;
  function?: string;
  connections?: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// UNIT CONVERSION DATA
// ══════════════════════════════════════════════════════════════════════════════

const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  // Length
  m: { km: 0.001, cm: 100, mm: 1000, ft: 3.28084, in: 39.3701, mi: 0.000621371 },
  km: { m: 1000, cm: 100000, mm: 1000000, ft: 3280.84, mi: 0.621371 },
  cm: { m: 0.01, mm: 10, in: 0.393701 },
  mm: { m: 0.001, cm: 0.1, in: 0.0393701 },

  // Mass
  kg: { g: 1000, mg: 1000000, lb: 2.20462, oz: 35.274 },
  g: { kg: 0.001, mg: 1000, lb: 0.00220462 },
  mg: { g: 0.001, kg: 0.000001 },
  lb: { kg: 0.453592, g: 453.592, oz: 16 },

  // Volume
  L: { mL: 1000, gal: 0.264172, qt: 1.05669 },
  mL: { L: 0.001, cc: 1 },
  gal: { L: 3.78541, qt: 4 },

  // Temperature (handled separately due to non-linear conversion)

  // Time
  s: { ms: 1000, min: 1 / 60, hr: 1 / 3600 },
  min: { s: 60, hr: 1 / 60 },
  hr: { s: 3600, min: 60, day: 1 / 24 },

  // Energy
  J: { kJ: 0.001, cal: 0.239006, kcal: 0.000239006, eV: 6.242e18 },
  kJ: { J: 1000, cal: 239.006, kcal: 0.239006 },
  cal: { J: 4.184, kcal: 0.001 },

  // Force
  N: { kN: 0.001, dyn: 100000, lbf: 0.224809 },
};

// ══════════════════════════════════════════════════════════════════════════════
// SCIENCE PROCESSOR
// ══════════════════════════════════════════════════════════════════════════════

export class ScienceProcessor {
  /**
   * Parse raw text into a structured science problem
   */
  parseProblem(rawText: string, gradeBand: GradeBand): ScienceProblem {
    const category = this.detectCategory(rawText);
    const problemType = this.detectProblemType(rawText);
    const concepts = this.extractConcepts(rawText, category);
    const units = this.extractUnits(rawText);
    const scientificNotation = this.extractScientificNotation(rawText);
    const difficulty = this.calculateDifficulty(category, problemType, gradeBand);

    return {
      rawText,
      category,
      problemType,
      concepts,
      units,
      scientificNotation,
      difficulty,
      gradeBand,
    };
  }

  /**
   * Convert between units
   */
  convertUnit(value: number, fromUnit: string, toUnit: string): UnitConversion | null {
    const normalizedFrom = this.normalizeUnit(fromUnit);
    const normalizedTo = this.normalizeUnit(toUnit);

    if (normalizedFrom === normalizedTo) {
      return {
        from: { value, unit: fromUnit, type: 'other' },
        to: { value, unit: toUnit, type: 'other' },
        factor: 1,
        explanation: 'Units are the same; no conversion needed.',
      };
    }

    // Check direct conversion
    if (UNIT_CONVERSIONS[normalizedFrom]?.[normalizedTo]) {
      const factor = UNIT_CONVERSIONS[normalizedFrom][normalizedTo];
      const converted = value * factor;

      return {
        from: { value, unit: fromUnit, type: this.getUnitType(normalizedFrom) },
        to: { value: converted, unit: toUnit, type: this.getUnitType(normalizedTo) },
        factor,
        explanation: `Multiply ${value} ${fromUnit} by ${factor} to get ${converted} ${toUnit}`,
      };
    }

    // Check reverse conversion
    if (UNIT_CONVERSIONS[normalizedTo]?.[normalizedFrom]) {
      const factor = 1 / UNIT_CONVERSIONS[normalizedTo][normalizedFrom];
      const converted = value * factor;

      return {
        from: { value, unit: fromUnit, type: this.getUnitType(normalizedFrom) },
        to: { value: converted, unit: toUnit, type: this.getUnitType(normalizedTo) },
        factor,
        explanation: `Divide ${value} ${fromUnit} by ${1 / factor} to get ${converted} ${toUnit}`,
      };
    }

    // Temperature conversion (special case)
    if (this.isTemperatureUnit(normalizedFrom) && this.isTemperatureUnit(normalizedTo)) {
      return this.convertTemperature(value, normalizedFrom, normalizedTo);
    }

    return null;
  }

  /**
   * Parse and convert scientific notation
   */
  parseScientificNotation(text: string): ScientificNotation | null {
    // Matches patterns like 6.02e23, 6.02 × 10^23, 6.02 x 10^23
    const patterns = [
      /(-?\d+\.?\d*)\s*[eE]\s*([+-]?\d+)/,
      /(-?\d+\.?\d*)\s*[×x]\s*10\s*\^\s*([+-]?\d+)/,
      /(-?\d+\.?\d*)\s*\*\s*10\s*\^\s*([+-]?\d+)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const coefficient = Number.parseFloat(match[1]);
        const exponent = Number.parseInt(match[2], 10);
        const standard = coefficient * Math.pow(10, exponent);

        return { raw: match[0], coefficient, exponent, standard };
      }
    }

    return null;
  }

  /**
   * Get relevant formulas for the problem
   */
  getRelevantFormulas(problem: ScienceProblem): ScienceFormula[] {
    const formulas: ScienceFormula[] = [];

    // Physics formulas
    if (problem.category === 'physics') {
      if (problem.rawText.match(/velocity|speed|distance|time/i)) {
        formulas.push({
          name: 'Speed Formula',
          formula: 'v = d / t',
          latex: 'v = \\frac{d}{t}',
          description: 'Speed equals distance divided by time',
          variables: [
            { symbol: 'v', meaning: 'Velocity/Speed', unit: 'm/s' },
            { symbol: 'd', meaning: 'Distance', unit: 'm' },
            { symbol: 't', meaning: 'Time', unit: 's' },
          ],
          category: 'physics',
          examples: ['If d = 100m and t = 10s, v = 100/10 = 10 m/s'],
        });
      }

      if (problem.rawText.match(/force|mass|acceleration/i)) {
        formulas.push({
          name: "Newton's Second Law",
          formula: 'F = m × a',
          latex: 'F = m \\times a',
          description: 'Force equals mass times acceleration',
          variables: [
            { symbol: 'F', meaning: 'Force', unit: 'N' },
            { symbol: 'm', meaning: 'Mass', unit: 'kg' },
            { symbol: 'a', meaning: 'Acceleration', unit: 'm/s²' },
          ],
          category: 'physics',
          examples: ['If m = 5kg and a = 2m/s², F = 5 × 2 = 10N'],
        });
      }

      if (problem.rawText.match(/energy|kinetic|work/i)) {
        formulas.push({
          name: 'Kinetic Energy',
          formula: 'KE = ½mv²',
          latex: 'KE = \\frac{1}{2}mv^2',
          description: 'Kinetic energy equals half mass times velocity squared',
          variables: [
            { symbol: 'KE', meaning: 'Kinetic Energy', unit: 'J' },
            { symbol: 'm', meaning: 'Mass', unit: 'kg' },
            { symbol: 'v', meaning: 'Velocity', unit: 'm/s' },
          ],
          category: 'physics',
          examples: ['If m = 2kg and v = 3m/s, KE = ½ × 2 × 9 = 9J'],
        });
      }
    }

    // Chemistry formulas
    if (problem.category === 'chemistry') {
      if (problem.rawText.match(/mol|mole|avogadro/i)) {
        formulas.push({
          name: "Avogadro's Number",
          formula: 'N_A = 6.022 × 10²³',
          latex: 'N_A = 6.022 \\times 10^{23}',
          description: 'Number of particles in one mole',
          variables: [{ symbol: 'N_A', meaning: "Avogadro's Number", unit: 'mol⁻¹' }],
          category: 'chemistry',
          examples: ['1 mole of carbon atoms = 6.022 × 10²³ atoms'],
        });

        formulas.push({
          name: 'Moles Formula',
          formula: 'n = m / M',
          latex: 'n = \\frac{m}{M}',
          description: 'Moles equals mass divided by molar mass',
          variables: [
            { symbol: 'n', meaning: 'Number of moles', unit: 'mol' },
            { symbol: 'm', meaning: 'Mass', unit: 'g' },
            { symbol: 'M', meaning: 'Molar mass', unit: 'g/mol' },
          ],
          category: 'chemistry',
          examples: ['If m = 18g of water (M = 18 g/mol), n = 18/18 = 1 mol'],
        });
      }

      if (problem.rawText.match(/concentration|molarity/i)) {
        formulas.push({
          name: 'Molarity Formula',
          formula: 'M = n / V',
          latex: 'M = \\frac{n}{V}',
          description: 'Molarity equals moles divided by volume in liters',
          variables: [
            { symbol: 'M', meaning: 'Molarity', unit: 'mol/L' },
            { symbol: 'n', meaning: 'Moles of solute', unit: 'mol' },
            { symbol: 'V', meaning: 'Volume of solution', unit: 'L' },
          ],
          category: 'chemistry',
          examples: ['If n = 0.5mol in V = 0.25L, M = 0.5/0.25 = 2M'],
        });
      }
    }

    // Biology formulas
    if (problem.category === 'biology') {
      if (problem.rawText.match(/population|growth|rate/i)) {
        formulas.push({
          name: 'Population Growth',
          formula: 'N_t = N_0 × e^(rt)',
          latex: 'N_t = N_0 \\times e^{rt}',
          description: 'Exponential population growth formula',
          variables: [
            { symbol: 'N_t', meaning: 'Population at time t', unit: '' },
            { symbol: 'N_0', meaning: 'Initial population', unit: '' },
            { symbol: 'r', meaning: 'Growth rate', unit: '' },
            { symbol: 't', meaning: 'Time', unit: '' },
          ],
          category: 'biology',
          examples: ['If N_0 = 100, r = 0.1, t = 5: N = 100 × e^0.5 ≈ 165'],
        });
      }
    }

    return formulas;
  }

  /**
   * Analyze diagram elements from description
   */
  analyzeDiagram(description: string): DiagramElement[] {
    const elements: DiagramElement[] = [];

    // Cell diagram
    if (description.match(/cell|membrane|nucleus|mitochondria|organelle/i)) {
      elements.push(
        {
          name: 'Cell Membrane',
          description: 'Outer boundary of the cell',
          function: 'Controls what enters and exits the cell',
        },
        {
          name: 'Nucleus',
          description: 'Contains genetic material (DNA)',
          function: 'Controls cell activities and reproduction',
          connections: ['Endoplasmic Reticulum'],
        },
        {
          name: 'Mitochondria',
          description: 'Bean-shaped organelles',
          function: 'Produce energy (ATP) through cellular respiration',
        }
      );
    }

    // Circuit diagram
    if (description.match(/circuit|voltage|current|resistor|battery/i)) {
      elements.push(
        {
          name: 'Battery/Voltage Source',
          description: 'Provides electrical energy',
          function: 'Creates potential difference to drive current',
        },
        {
          name: 'Resistor',
          description: 'Opposes current flow',
          function: 'Controls current and converts electrical energy to heat',
        },
        {
          name: 'Wires',
          description: 'Conducting paths',
          function: 'Connect components and allow current to flow',
        }
      );
    }

    return elements;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private detectCategory(text: string): ScienceCategory {
    const lowerText = text.toLowerCase();

    // Biology keywords
    const biologyKeywords = [
      'cell',
      'organism',
      'dna',
      'rna',
      'gene',
      'evolution',
      'species',
      'ecosystem',
      'photosynthesis',
      'mitosis',
      'meiosis',
      'protein',
      'enzyme',
      'bacteria',
      'virus',
    ];
    if (biologyKeywords.some((k) => lowerText.includes(k))) {
      return 'biology';
    }

    // Chemistry keywords
    const chemistryKeywords = [
      'atom',
      'molecule',
      'element',
      'compound',
      'reaction',
      'bond',
      'ion',
      'acid',
      'base',
      'ph',
      'mole',
      'periodic',
      'electron',
      'proton',
      'neutron',
    ];
    if (chemistryKeywords.some((k) => lowerText.includes(k))) {
      return 'chemistry';
    }

    // Physics keywords
    const physicsKeywords = [
      'force',
      'motion',
      'velocity',
      'acceleration',
      'energy',
      'momentum',
      'wave',
      'frequency',
      'electricity',
      'magnetism',
      'gravity',
      'newton',
      'circuit',
      'resistance',
    ];
    if (physicsKeywords.some((k) => lowerText.includes(k))) {
      return 'physics';
    }

    // Earth science keywords
    const earthKeywords = [
      'rock',
      'mineral',
      'earthquake',
      'volcano',
      'plate',
      'tectonic',
      'weather',
      'climate',
      'atmosphere',
      'ocean',
      'erosion',
      'fossil',
      'geology',
    ];
    if (earthKeywords.some((k) => lowerText.includes(k))) {
      return 'earth-science';
    }

    // Environmental science keywords
    const envKeywords = [
      'pollution',
      'conservation',
      'renewable',
      'biodiversity',
      'habitat',
      'carbon',
      'greenhouse',
      'sustainability',
    ];
    if (envKeywords.some((k) => lowerText.includes(k))) {
      return 'environmental';
    }

    return 'general';
  }

  private detectProblemType(text: string): ScienceProblemType {
    const lowerText = text.toLowerCase();

    if (text.match(/\d+\s*[+\-*/=]\s*\d+/) || lowerText.includes('calculate') || lowerText.includes('find the value')) {
      return 'calculation';
    }

    if (lowerText.includes('explain') || lowerText.includes('describe how') || lowerText.includes('what is')) {
      return 'concept-explanation';
    }

    if (lowerText.includes('diagram') || lowerText.includes('label') || lowerText.includes('identify the parts')) {
      return 'diagram-analysis';
    }

    if (lowerText.includes('experiment') || lowerText.includes('design') || lowerText.includes('test')) {
      return 'experiment-design';
    }

    if (lowerText.includes('data') || lowerText.includes('graph') || lowerText.includes('chart') || lowerText.includes('table')) {
      return 'data-analysis';
    }

    if (lowerText.includes('hypothesis') || lowerText.includes('predict')) {
      return 'hypothesis';
    }

    if (lowerText.includes('classify') || lowerText.includes('categorize') || lowerText.includes('group')) {
      return 'classification';
    }

    if (lowerText.includes('process') || lowerText.includes('steps') || lowerText.includes('cycle')) {
      return 'process-description';
    }

    if (lowerText.includes('compare') || lowerText.includes('contrast') || lowerText.includes('difference')) {
      return 'comparison';
    }

    return 'unknown';
  }

  private extractConcepts(text: string, category: ScienceCategory): string[] {
    const concepts: string[] = [];
    const lowerText = text.toLowerCase();

    const conceptLists: Record<ScienceCategory, string[]> = {
      biology: [
        'cell',
        'photosynthesis',
        'respiration',
        'dna',
        'gene',
        'evolution',
        'ecosystem',
        'food chain',
        'mitosis',
        'meiosis',
      ],
      chemistry: [
        'atom',
        'molecule',
        'compound',
        'element',
        'reaction',
        'bond',
        'ion',
        'acid',
        'base',
        'oxidation',
        'reduction',
      ],
      physics: [
        'force',
        'motion',
        'energy',
        'momentum',
        'wave',
        'electricity',
        'magnetism',
        'gravity',
        'friction',
        'acceleration',
      ],
      'earth-science': [
        'plate tectonics',
        'rock cycle',
        'water cycle',
        'weather',
        'climate',
        'erosion',
        'earthquake',
        'volcano',
      ],
      environmental: [
        'ecosystem',
        'biodiversity',
        'pollution',
        'conservation',
        'sustainability',
        'renewable energy',
        'carbon cycle',
      ],
      general: [],
    };

    const relevantConcepts = conceptLists[category];
    for (const concept of relevantConcepts) {
      if (lowerText.includes(concept)) {
        concepts.push(concept);
      }
    }

    return concepts;
  }

  private extractUnits(text: string): Unit[] {
    const units: Unit[] = [];
    const unitPattern = /(\d+\.?\d*)\s*(m|km|cm|mm|kg|g|mg|L|mL|s|min|hr|°?[CF]|N|J|kJ|cal|mol|M)\b/gi;
    let match;

    while ((match = unitPattern.exec(text)) !== null) {
      const value = Number.parseFloat(match[1]);
      const unit = match[2];

      units.push({
        value,
        unit,
        type: this.getUnitType(this.normalizeUnit(unit)),
      });
    }

    return units;
  }

  private extractScientificNotation(text: string): ScientificNotation[] {
    const notations: ScientificNotation[] = [];
    const patterns = [
      /(-?\d+\.?\d*)\s*[eE]\s*([+-]?\d+)/g,
      /(-?\d+\.?\d*)\s*[×x]\s*10\s*\^\s*([+-]?\d+)/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const coefficient = Number.parseFloat(match[1]);
        const exponent = Number.parseInt(match[2], 10);

        notations.push({
          raw: match[0],
          coefficient,
          exponent,
          standard: coefficient * Math.pow(10, exponent),
        });
      }
    }

    return notations;
  }

  private normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().replace(/°/g, '');

    const aliases: Record<string, string> = {
      meter: 'm',
      meters: 'm',
      kilometer: 'km',
      kilometers: 'km',
      centimeter: 'cm',
      centimeters: 'cm',
      millimeter: 'mm',
      millimeters: 'mm',
      gram: 'g',
      grams: 'g',
      kilogram: 'kg',
      kilograms: 'kg',
      liter: 'L',
      liters: 'L',
      milliliter: 'mL',
      milliliters: 'mL',
      second: 's',
      seconds: 's',
      minute: 'min',
      minutes: 'min',
      hour: 'hr',
      hours: 'hr',
      celsius: 'C',
      fahrenheit: 'F',
      newton: 'N',
      newtons: 'N',
      joule: 'J',
      joules: 'J',
      calorie: 'cal',
      calories: 'cal',
    };

    return aliases[normalized] ?? normalized;
  }

  private getUnitType(unit: string): UnitType {
    const normalized = unit.toLowerCase();

    if (['m', 'km', 'cm', 'mm', 'ft', 'in', 'mi'].includes(normalized)) return 'length';
    if (['kg', 'g', 'mg', 'lb', 'oz'].includes(normalized)) return 'mass';
    if (['s', 'min', 'hr', 'ms', 'day'].includes(normalized)) return 'time';
    if (['c', 'f', 'k'].includes(normalized)) return 'temperature';
    if (['l', 'ml', 'gal', 'qt', 'cc'].includes(normalized)) return 'volume';
    if (['n', 'kn', 'dyn', 'lbf'].includes(normalized)) return 'force';
    if (['j', 'kj', 'cal', 'kcal', 'ev'].includes(normalized)) return 'energy';

    return 'other';
  }

  private isTemperatureUnit(unit: string): boolean {
    return ['c', 'f', 'k'].includes(unit.toLowerCase());
  }

  private convertTemperature(value: number, from: string, to: string): UnitConversion {
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();
    let converted: number;
    let explanation: string;

    if (fromLower === 'c' && toLower === 'f') {
      converted = (value * 9) / 5 + 32;
      explanation = `(${value}°C × 9/5) + 32 = ${converted}°F`;
    } else if (fromLower === 'f' && toLower === 'c') {
      converted = ((value - 32) * 5) / 9;
      explanation = `(${value}°F - 32) × 5/9 = ${converted.toFixed(2)}°C`;
    } else if (fromLower === 'c' && toLower === 'k') {
      converted = value + 273.15;
      explanation = `${value}°C + 273.15 = ${converted}K`;
    } else if (fromLower === 'k' && toLower === 'c') {
      converted = value - 273.15;
      explanation = `${value}K - 273.15 = ${converted}°C`;
    } else if (fromLower === 'f' && toLower === 'k') {
      converted = ((value - 32) * 5) / 9 + 273.15;
      explanation = `(${value}°F - 32) × 5/9 + 273.15 = ${converted.toFixed(2)}K`;
    } else if (fromLower === 'k' && toLower === 'f') {
      converted = ((value - 273.15) * 9) / 5 + 32;
      explanation = `(${value}K - 273.15) × 9/5 + 32 = ${converted.toFixed(2)}°F`;
    } else {
      converted = value;
      explanation = 'Same unit';
    }

    return {
      from: { value, unit: from, type: 'temperature' },
      to: { value: converted, unit: to, type: 'temperature' },
      factor: 0, // Not applicable for temperature
      explanation,
    };
  }

  private calculateDifficulty(
    category: ScienceCategory,
    problemType: ScienceProblemType,
    gradeBand: GradeBand
  ): number {
    let difficulty = 5;

    // Adjust by grade band
    if (gradeBand === 'K5') difficulty -= 2;
    if (gradeBand === 'G9_12') difficulty += 2;

    // Adjust by category (some areas are generally more complex)
    const categoryAdjustments: Record<ScienceCategory, number> = {
      biology: 0,
      chemistry: 1,
      physics: 1,
      'earth-science': 0,
      environmental: 0,
      general: -1,
    };
    difficulty += categoryAdjustments[category] ?? 0;

    // Adjust by problem type
    const typeAdjustments: Record<ScienceProblemType, number> = {
      calculation: 1,
      'concept-explanation': 0,
      'diagram-analysis': 0,
      'experiment-design': 2,
      'data-analysis': 1,
      hypothesis: 1,
      classification: -1,
      'process-description': 0,
      comparison: 0,
      unknown: 0,
    };
    difficulty += typeAdjustments[problemType] ?? 0;

    return Math.min(10, Math.max(1, difficulty));
  }
}

// Export singleton instance
export const scienceProcessor = new ScienceProcessor();
