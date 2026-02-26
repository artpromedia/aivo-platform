import { describe, it, expect } from 'vitest';

import {
  generateFAQSchema,
  generateEducationalMaterialSchema,
  generateHowToSchema,
  organizationSchema,
  platformSchema,
  aivoPadSchema,
} from '../src/lib/schema-org';

// ── Static schemas ───────────────────────────────────────────────

describe('organizationSchema', () => {
  it('has correct @context and @type', () => {
    expect(organizationSchema['@context']).toBe('https://schema.org');
    expect(organizationSchema['@type']).toBe('Organization');
  });

  it('has required organization fields', () => {
    expect(organizationSchema.name).toBe('AIVO Learning');
    expect(organizationSchema.url).toBeTruthy();
    expect(organizationSchema.logo).toBeTruthy();
    expect(organizationSchema.email).toBeTruthy();
  });

  it('has social media links', () => {
    expect(organizationSchema.sameAs).toBeInstanceOf(Array);
    expect((organizationSchema.sameAs as string[]).length).toBeGreaterThanOrEqual(3);
  });
});

describe('platformSchema', () => {
  it('has SoftwareApplication type', () => {
    expect(platformSchema['@type']).toBe('SoftwareApplication');
  });

  it('is categorized as educational', () => {
    expect(platformSchema.applicationCategory).toBe('EducationalApplication');
  });

  it('lists accessibility features', () => {
    expect(platformSchema.accessibilityFeature).toContain('alternativeText');
    expect(platformSchema.accessibilityFeature).toContain('captions');
  });

  it('has no hazards', () => {
    expect(platformSchema.accessibilityHazard).toContain('noFlashingHazard');
  });
});

describe('aivoPadSchema', () => {
  it('has Product type', () => {
    expect(aivoPadSchema['@type']).toBe('Product');
  });

  it('has pricing info', () => {
    const offer = aivoPadSchema.offers as { price: string; priceCurrency: string };
    expect(offer.price).toBe('299');
    expect(offer.priceCurrency).toBe('USD');
  });
});

// ── generateFAQSchema ────────────────────────────────────────────

describe('generateFAQSchema', () => {
  it('creates FAQPage schema', () => {
    const faqs = [
      { question: 'What is AIVO?', answer: 'An adaptive learning platform.' },
    ];
    const schema = generateFAQSchema(faqs);
    expect(schema['@type']).toBe('FAQPage');
    expect(schema['@context']).toBe('https://schema.org');
  });

  it('maps individual FAQ items', () => {
    const faqs = [
      { question: 'Q1?', answer: 'A1' },
      { question: 'Q2?', answer: 'A2' },
    ];
    const schema = generateFAQSchema(faqs);
    const entities = schema.mainEntity as Array<{ '@type': string; name: string }>;
    expect(entities).toHaveLength(2);
    expect(entities[0]['@type']).toBe('Question');
    expect(entities[0].name).toBe('Q1?');
  });
});

// ── generateEducationalMaterialSchema ────────────────────────────

describe('generateEducationalMaterialSchema', () => {
  it('creates LearningResource schema', () => {
    const schema = generateEducationalMaterialSchema({
      name: 'Math Basics',
      description: 'Learn math',
      educationalLevel: 'K-2',
      learningResourceType: 'lesson',
    });
    expect(schema['@type']).toBe('LearningResource');
    expect(schema.name).toBe('Math Basics');
    expect(schema.educationalLevel).toBe('K-2');
  });

  it('includes accessibility features', () => {
    const schema = generateEducationalMaterialSchema({
      name: 'Test',
      description: 'Desc',
      educationalLevel: '3-5',
      learningResourceType: 'quiz',
    });
    expect(schema.accessibilityFeature).toContain('alternativeText');
  });
});

// ── generateHowToSchema ──────────────────────────────────────────

describe('generateHowToSchema', () => {
  it('creates HowTo schema with steps', () => {
    const schema = generateHowToSchema({
      name: 'Setup Guide',
      description: 'How to set up AIVO',
      steps: [
        { name: 'Step 1', text: 'Create account' },
        { name: 'Step 2', text: 'Add learner' },
      ],
    });
    expect(schema['@type']).toBe('HowTo');
    expect(schema.step).toHaveLength(2);
  });

  it('assigns correct position to steps', () => {
    const schema = generateHowToSchema({
      name: 'Guide',
      description: 'Desc',
      steps: [
        { name: 'A', text: 'First' },
        { name: 'B', text: 'Second' },
      ],
    });
    expect(schema.step[0].position).toBe(1);
    expect(schema.step[1].position).toBe(2);
  });

  it('includes optional step image', () => {
    const schema = generateHowToSchema({
      name: 'Guide',
      description: 'Desc',
      steps: [
        { name: 'A', text: 'First', image: 'https://img.example.com/step1.png' },
      ],
    });
    expect(schema.step[0].image).toBe('https://img.example.com/step1.png');
  });
});
