import { describe, it, expect } from 'vitest';
import { scienceProcessor } from '../../src/processors/science.processor.js';

describe('ScienceProcessor', () => {
  describe('parseProblem', () => {
    it('should detect biology category', () => {
      const problem = scienceProcessor.parseProblem(
        'What is the function of mitochondria in a cell?',
        'G6_8'
      );
      expect(problem.category).toBe('biology');
    });

    it('should detect chemistry category', () => {
      const problem = scienceProcessor.parseProblem(
        'How many protons does a carbon atom have?',
        'G6_8'
      );
      expect(problem.category).toBe('chemistry');
    });

    it('should detect physics category', () => {
      const problem = scienceProcessor.parseProblem(
        'Calculate the force needed to accelerate a 10kg mass at 5 m/s²',
        'G9_12'
      );
      expect(problem.category).toBe('physics');
    });

    it('should detect earth science category', () => {
      const problem = scienceProcessor.parseProblem(
        'Explain how plate tectonics cause earthquakes',
        'G6_8'
      );
      expect(problem.category).toBe('earth-science');
    });

    it('should extract units from text', () => {
      const problem = scienceProcessor.parseProblem(
        'A car travels 100 km in 2 hours',
        'G6_8'
      );
      expect(problem.units.length).toBeGreaterThan(0);
      expect(problem.units.some((u) => u.unit === 'km')).toBe(true);
    });
  });

  describe('convertUnit', () => {
    it('should convert meters to kilometers', () => {
      const result = scienceProcessor.convertUnit(1000, 'm', 'km');
      expect(result).not.toBeNull();
      expect(result?.to.value).toBe(1);
    });

    it('should convert kilograms to grams', () => {
      const result = scienceProcessor.convertUnit(1, 'kg', 'g');
      expect(result).not.toBeNull();
      expect(result?.to.value).toBe(1000);
    });

    it('should convert Celsius to Fahrenheit', () => {
      const result = scienceProcessor.convertUnit(0, 'C', 'F');
      expect(result).not.toBeNull();
      expect(result?.to.value).toBe(32);
    });

    it('should convert Celsius to Kelvin', () => {
      const result = scienceProcessor.convertUnit(0, 'C', 'K');
      expect(result).not.toBeNull();
      expect(result?.to.value).toBe(273.15);
    });

    it('should return null for incompatible units', () => {
      const result = scienceProcessor.convertUnit(1, 'm', 'kg');
      expect(result).toBeNull();
    });

    it('should handle same unit conversion', () => {
      const result = scienceProcessor.convertUnit(5, 'm', 'm');
      expect(result?.factor).toBe(1);
    });
  });

  describe('parseScientificNotation', () => {
    it('should parse e notation', () => {
      const result = scienceProcessor.parseScientificNotation('6.02e23');
      expect(result).not.toBeNull();
      expect(result?.coefficient).toBe(6.02);
      expect(result?.exponent).toBe(23);
    });

    it('should parse × 10^ notation', () => {
      const result = scienceProcessor.parseScientificNotation('6.02 × 10^23');
      expect(result).not.toBeNull();
      expect(result?.coefficient).toBe(6.02);
      expect(result?.exponent).toBe(23);
    });

    it('should return null for non-scientific notation', () => {
      const result = scienceProcessor.parseScientificNotation('123.45');
      expect(result).toBeNull();
    });
  });

  describe('getRelevantFormulas', () => {
    it('should return velocity formula for motion problems', () => {
      const problem = scienceProcessor.parseProblem(
        'Calculate the velocity of a car that travels 100m in 10s',
        'G6_8'
      );
      const formulas = scienceProcessor.getRelevantFormulas(problem);
      expect(formulas.some((f) => f.name.includes('Speed'))).toBe(true);
    });

    it('should return Newton\'s Second Law for force problems', () => {
      const problem = scienceProcessor.parseProblem(
        'Calculate the force on a 5kg mass accelerating at 2 m/s²',
        'G9_12'
      );
      const formulas = scienceProcessor.getRelevantFormulas(problem);
      expect(formulas.some((f) => f.name.includes('Newton'))).toBe(true);
    });

    it('should return moles formula for chemistry problems', () => {
      const problem = scienceProcessor.parseProblem(
        'Calculate the number of moles in 18g of water',
        'G9_12'
      );
      const formulas = scienceProcessor.getRelevantFormulas(problem);
      expect(formulas.some((f) => f.name.includes('Moles'))).toBe(true);
    });
  });

  describe('analyzeDiagram', () => {
    it('should identify cell components', () => {
      const elements = scienceProcessor.analyzeDiagram('cell membrane nucleus mitochondria');
      expect(elements.length).toBeGreaterThan(0);
      expect(elements.some((e) => e.name === 'Nucleus')).toBe(true);
    });

    it('should identify circuit components', () => {
      const elements = scienceProcessor.analyzeDiagram('circuit with battery and resistor');
      expect(elements.length).toBeGreaterThan(0);
      expect(elements.some((e) => e.name.includes('Battery'))).toBe(true);
    });
  });
});
