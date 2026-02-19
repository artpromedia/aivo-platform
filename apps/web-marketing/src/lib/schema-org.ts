/**
 * Schema.org Structured Data for GEO
 *
 * Comprehensive structured data schemas optimized for AI search engines
 * including ChatGPT, Perplexity, Google AI Overviews, and Bing Chat.
 */

import React from 'react';
import type {
  Organization,
  Product,
  SoftwareApplication,
  FAQPage,
  WithContext,
  Offer,
} from 'schema-dts';

const BASE_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'https://aivolearning.com';

/**
 * Organization Schema - Enhanced for GEO
 */
export const organizationSchema: WithContext<Organization> = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${BASE_URL}/#organization`,
  name: 'AIVO Learning',
  legalName: 'AIVO Learning, Inc.',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description:
    'AI-powered personalized learning platform for neurodiverse K-12 students with ADHD, autism, dyslexia, and other learning differences. FERPA and COPPA compliant.',
  foundingDate: '2024',
  slogan: 'Where Every Mind Thrives',
  email: 'hello@aivolearning.com',
  telephone: '+1-800-AIVO-EDU',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'US',
    addressLocality: 'Minneapolis',
    addressRegion: 'MN',
  },
  sameAs: [
    'https://twitter.com/aivolearning',
    'https://facebook.com/aivolearning',
    'https://linkedin.com/company/aivolearning',
    'https://instagram.com/aivolearning',
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      telephone: '+1-800-AIVO-EDU',
      contactType: 'customer service',
      availableLanguage: ['English', 'Spanish'],
      areaServed: 'US',
    },
    {
      '@type': 'ContactPoint',
      telephone: '+1-800-AIVO-EDU',
      contactType: 'sales',
      availableLanguage: 'English',
    },
  ],
  knowsAbout: [
    'Special Education',
    'Neurodiverse Learning',
    'ADHD Education',
    'Autism Education',
    'Dyslexia Support',
    'AI Tutoring',
    'Personalized Learning',
    'IEP Goal Tracking',
    'Adaptive Learning Technology',
    'K-12 Education',
  ],
};

/**
 * AIVO Platform - SoftwareApplication Schema
 */
export const platformSchema: WithContext<SoftwareApplication> = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${BASE_URL}/#platform`,
  name: 'AIVO Learning Platform',
  applicationCategory: 'EducationalApplication',
  operatingSystem: ['Web Browser', 'iOS', 'Android', 'Chrome OS'],
  description:
    'AI-powered adaptive learning platform with Virtual Brain tutors that personalize education for neurodiverse K-12 students including those with ADHD, autism, dyslexia, and other learning differences.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  } as unknown as Offer,
  featureList: [
    'AI-powered Virtual Brain tutors',
    'Real-time IEP goal tracking and progress monitoring',
    'Adaptive lessons for ADHD, autism, and dyslexia',
    'Multi-sensory learning content',
    'Executive function support tools',
    'Parent communication portal',
    'Google Classroom integration',
    'Canvas LMS integration',
    'FERPA and COPPA compliant',
    'WCAG 2.1 AA accessibility',
    '24/7 AI tutoring support',
    'Gamified learning experiences',
    'Text-to-speech and speech-to-text',
    'Visual schedules and timers',
    'Distraction-free focus mode',
  ],
  softwareVersion: '2.0',
  releaseNotes:
    'Enhanced AI personalization, improved accessibility features, expanded curriculum coverage',
  screenshot: `${BASE_URL}/screenshots/platform-overview.png`,
  video: {
    '@type': 'VideoObject',
    name: 'AIVO Platform Demo',
    contentUrl: `${BASE_URL}/videos/platform-demo.mp4`,
    thumbnailUrl: `${BASE_URL}/screenshots/platform-overview.png`,
    description: 'A demo of the AIVO adaptive learning platform',
    uploadDate: '2026-01-01',
  },
  accessibilityAPI: ['ARIA'],
  accessibilityControl: ['fullKeyboardControl', 'fullMouseControl', 'fullTouchControl'],
  accessibilityFeature: [
    'alternativeText',
    'audioDescription',
    'captions',
    'highContrastDisplay',
    'largePrint',
    'readingOrder',
    'structuralNavigation',
    'tableOfContents',
    'transcript',
  ],
  accessibilityHazard: ['noFlashingHazard', 'noSoundHazard', 'noMotionSimulationHazard'],
};

/**
 * AIVO Pad - Product Schema
 */
export const aivoPadSchema: WithContext<Product> = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  '@id': `${BASE_URL}/aivo-pad#product`,
  name: 'AIVO Pad',
  description:
    'Purpose-built learning tablet designed specifically for neurodiverse K-12 learners with AI-powered personalization, focus mode, and distraction-free learning environment.',
  brand: {
    '@type': 'Brand',
    name: 'AIVO Learning',
  },
  category: 'Educational Technology',
  image: `${BASE_URL}/images/aivo-pad.png`,
  offers: {
    '@type': 'Offer',
    price: '299',
    priceCurrency: 'USD',
    availability: 'https://schema.org/PreOrder',
    seller: {
      '@type': 'Organization',
      name: 'AIVO Learning',
    },
  },
  audience: {
    '@type': 'EducationalAudience',
    educationalRole: 'student',
    audienceType: 'K-12 students with learning differences',
  },
};

/**
 * FAQ Schema Generator
 */
export function generateFAQSchema(
  faqs: { question: string; answer: string }[]
): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Educational Material Schema
 */
export function generateEducationalMaterialSchema(material: {
  name: string;
  description: string;
  educationalLevel: string;
  learningResourceType: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: material.name,
    description: material.description,
    educationalLevel: material.educationalLevel,
    learningResourceType: material.learningResourceType,
    teaches: material.description,
    accessibilityFeature: [
      'alternativeText',
      'audioDescription',
      'captions',
      'highContrastDisplay',
      'largePrint',
    ],
  };
}

/**
 * HowTo Schema for Implementation Guides
 */
export function generateHowToSchema(guide: {
  name: string;
  description: string;
  steps: { name: string; text: string; image?: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: guide.name,
    description: guide.description,
    step: guide.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      image: step.image,
    })),
  };
}

/**
 * SchemaScript - Renders structured data as a JSON-LD script tag
 */
export function SchemaScript({ schema }: { schema: object }) {
  return React.createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(schema) },
  });
}
