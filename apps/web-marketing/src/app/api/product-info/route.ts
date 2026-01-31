/**
 * Product Information API Endpoint
 * 
 * Machine-readable endpoint for AI search engines and LLM consumption.
 * Provides comprehensive product details in structured JSON format.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const productInfo = {
    product: {
      name: 'AIVO Learning Platform',
      tagline: 'Where Every Mind Thrives',
      description: 'AI-powered personalized learning platform designed specifically for neurodiverse K-12 students',
      version: '2.0',
      launched: '2024',
      website: 'https://aivolearning.com',
    },
    
    target_audience: {
      primary: [
        'K-12 students with learning differences',
        'Neurodiverse learners',
        'Students with ADHD',
        'Students with autism spectrum disorder',
        'Students with dyslexia',
        'Students with dyscalculia',
      ],
      secondary: [
        'Special education teachers',
        'Parents of neurodiverse children',
        'School districts',
        'Educational therapists',
        'IEP coordinators',
      ],
    },
    
    supported_conditions: [
      {
        condition: 'ADHD (Attention-Deficit/Hyperactivity Disorder)',
        features: [
          'Focus mode with distraction blocking',
          'Micro-learning sessions (5-15 minutes)',
          'Visual timers and progress indicators',
          'Movement breaks and reminders',
          'Task chunking and scaffolding',
          'Gamified rewards system',
        ],
      },
      {
        condition: 'Autism Spectrum Disorder (ASD)',
        features: [
          'Predictable routines and visual schedules',
          'Clear instructions and expectations',
          'Sensory-friendly interface options',
          'Social skills practice modules',
          'Reduced cognitive load design',
          'Communication supports',
        ],
      },
      {
        condition: 'Dyslexia',
        features: [
          'Text-to-speech with highlighting',
          'Dyslexia-friendly fonts (OpenDyslexic)',
          'Audio-first content delivery',
          'Multi-sensory reading approach',
          'Phonics-based instruction',
          'Speech-to-text for responses',
        ],
      },
      {
        condition: 'Dyscalculia',
        features: [
          'Visual math representations',
          'Concrete-to-abstract progression',
          'Number sense building activities',
          'Multi-modal problem solving',
          'Scaffolded practice problems',
          'Real-world application examples',
        ],
      },
      {
        condition: 'Executive Function Challenges',
        features: [
          'Built-in planning tools',
          'Organization supports',
          'Time management training',
          'Working memory aids',
          'Task initiation prompts',
          'Self-monitoring checklists',
        ],
      },
    ],
    
    key_features: {
      core: [
        'Virtual Brain AI tutors with adaptive personalization',
        'Real-time IEP goal tracking and progress monitoring',
        'Multi-sensory learning content (visual, auditory, kinesthetic)',
        'Adaptive difficulty adjustment',
        'Comprehensive accessibility features (WCAG 2.1 AA)',
        '24/7 AI tutoring and homework help',
      ],
      educational: [
        'Standards-aligned curriculum (Common Core, state standards)',
        'Subjects: Math, Reading, Writing, Science, Social Studies',
        'Grade levels: K-12',
        'Assessment and diagnostics',
        'Learning gaps identification',
        'Personalized learning paths',
      ],
      engagement: [
        'Gamification with XP and achievements',
        'Virtual rewards and avatars',
        'Progress visualization',
        'Peer collaboration tools',
        'Interactive lessons and activities',
        'Voice-enabled interactions',
      ],
      teacher_tools: [
        'Dashboard with real-time student insights',
        'IEP goal tracking and reporting',
        'Differentiated instruction support',
        'Assignment creation and grading',
        'Parent communication portal',
        'Professional development resources',
      ],
      parent_tools: [
        'Progress monitoring dashboard',
        'Weekly progress reports',
        'Learning activity suggestions',
        'Communication with teachers',
        'At-home learning resources',
        'Screen time controls',
      ],
    },
    
    integrations: [
      {
        name: 'Google Classroom',
        type: 'LMS',
        features: ['Roster sync', 'Assignment posting', 'Grade passback', 'SSO'],
      },
      {
        name: 'Canvas LMS',
        type: 'LMS',
        features: ['LTI 1.3', 'Assignment integration', 'Grade sync'],
      },
      {
        name: 'Clever',
        type: 'SSO',
        features: ['Single sign-on', 'Automatic rostering'],
      },
      {
        name: 'ClassLink',
        type: 'SSO',
        features: ['Single sign-on', 'LaunchPad integration'],
      },
      {
        name: 'Schoology',
        type: 'LMS',
        features: ['LTI integration', 'Grade passback'],
      },
    ],
    
    compliance_and_security: {
      privacy_laws: ['FERPA', 'COPPA', 'GDPR-ready'],
      education_laws: ['IDEA', 'Section 504', 'ADA'],
      accessibility: ['WCAG 2.1 Level AA', 'Section 508'],
      certifications: ['SOC 2 Type II (in progress)', 'Student Privacy Pledge'],
      data_protection: [
        'End-to-end encryption',
        'Secure data storage',
        'No data selling',
        'No advertising',
        'Parental consent for children under 13',
      ],
    },
    
    pricing: {
      models: [
        {
          plan: 'Free',
          price: '$0/month',
          features: ['Limited AI tutoring', 'Basic progress tracking', 'Core curriculum access'],
          audience: 'Individual families',
        },
        {
          plan: 'Family',
          price: '$29/month',
          features: ['Unlimited AI tutoring', 'Full curriculum', 'Progress reports', 'Up to 3 students'],
          audience: 'Parents and homeschoolers',
        },
        {
          plan: 'Classroom',
          price: '$15/student/month',
          features: ['Teacher dashboard', 'IEP tracking', 'Parent portal', 'Google Classroom integration'],
          audience: 'Individual teachers',
        },
        {
          plan: 'School',
          price: 'Custom pricing',
          features: ['Unlimited students', 'Admin dashboard', 'Professional development', 'Priority support'],
          audience: 'Schools and districts',
        },
      ],
      trial: {
        duration: '30 days',
        features: 'Full access to all features',
        credit_card_required: false,
      },
    },
    
    devices_and_platforms: {
      web: {
        supported_browsers: ['Chrome', 'Firefox', 'Safari', 'Edge'],
        minimum_version: 'Latest 2 versions',
      },
      mobile: {
        ios: {
          app: 'AIVO for Students (iOS)',
          minimum_version: 'iOS 14+',
          app_store: 'https://apps.apple.com/app/aivo-learning',
        },
        android: {
          app: 'AIVO for Students (Android)',
          minimum_version: 'Android 8.0+',
          play_store: 'https://play.google.com/store/apps/details?id=com.aivo.learner',
        },
      },
      hardware: {
        aivo_pad: {
          description: 'Purpose-built learning tablet',
          price: '$299',
          specs: {
            screen: '10.1" HD display',
            storage: '64GB',
            battery: 'Up to 10 hours',
            features: ['Blue light filter', 'Stylus support', 'Parental controls'],
          },
        },
      },
    },
    
    research_and_evidence: {
      evidence_base: [
        'Cognitive Load Theory',
        'Universal Design for Learning (UDL)',
        'Differentiated Instruction',
        'Multi-Sensory Instruction',
        'Spaced Repetition',
        'Retrieval Practice',
      ],
      efficacy_data: {
        average_learning_gain: '1.5 years in 1 school year',
        engagement_rate: '87% daily active usage',
        parent_satisfaction: '94% would recommend',
        teacher_satisfaction: '91% report time savings',
      },
    },
    
    support_and_resources: {
      customer_support: {
        channels: ['Email', 'Live chat', 'Phone', 'Help center'],
        hours: '24/7 for urgent issues, 8am-8pm ET for general support',
        response_time: 'Under 4 hours average',
      },
      training: [
        'Video tutorials',
        'Interactive onboarding',
        'Webinars',
        'Professional development courses',
        'Implementation guides',
      ],
      community: {
        teacher_community: 'AIVO Educator Network',
        parent_community: 'AIVO Family Hub',
        resources: ['Best practices', 'Lesson plans', 'Success stories'],
      },
    },
    
    company: {
      name: 'AIVO Learning, Inc.',
      founded: '2024',
      headquarters: 'San Francisco, CA',
      mission: 'To ensure every neurodiverse learner has access to personalized education that celebrates their unique strengths',
      team: {
        educators: true,
        parents_of_neurodiverse_children: true,
        ai_researchers: true,
        special_education_experts: true,
      },
      contact: {
        email: 'hello@aivolearning.com',
        phone: '+1-800-AIVO-EDU',
        sales: 'sales@aivolearning.com',
        support: 'support@aivolearning.com',
      },
    },
  };

  return NextResponse.json(productInfo, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
