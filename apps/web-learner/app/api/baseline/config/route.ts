import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Assessment Type from parent assessment
 */
type AssessmentType = 'STANDARD' | 'STANDARD_WITH_ACCOMMODATIONS' | 'MODIFIED' | 'ALTERNATE';
type GradeBand = 'PRE_K' | 'K_2' | 'GRADE_3_5' | 'GRADE_6_8' | 'GRADE_9_12';

/**
 * Domain configuration
 */
interface DomainConfig {
  domain: string;
  name: string;
  icon: string;
  questionsPerDomain: number;
  enabled: boolean;
  order: number;
}

/**
 * Assessment configuration based on learner profile
 */
interface AssessmentConfig {
  assessmentType: AssessmentType;
  gradeBand: GradeBand;
  gradeLevel: string;
  
  // Domains to assess
  domains: DomainConfig[];
  
  // Timing configuration
  estimatedDurationMinutes: number;
  questionsPerDomain: number;
  totalQuestions: number;
  
  // Accommodations
  accommodations: {
    extendedTime: boolean;
    frequentBreaks: boolean;
    simplifiedLanguage: boolean;
    visualSupports: boolean;
    audioNarration: boolean;
    reducedOptions: boolean;
    largerText: boolean;
    caregiverAssisted: boolean;
  };
  
  // UI configuration
  uiConfig: {
    showTimer: boolean;
    allowSkip: boolean;
    showProgress: boolean;
    breakFrequency: number; // questions between breaks
    optionCount: number; // 2, 3, or 4 options
    fontSizeMultiplier: number;
    highContrast: boolean;
    animationsEnabled: boolean;
  };
  
  // Messages
  introMessage: string;
  completionMessage: string;
}

/**
 * Default domain configurations by assessment type
 */
const DOMAIN_CONFIGS: Record<AssessmentType, DomainConfig[]> = {
  STANDARD: [
    { domain: 'MATH', name: 'Math', icon: '🔢', questionsPerDomain: 5, enabled: true, order: 1 },
    { domain: 'ELA', name: 'Reading & Language', icon: '📚', questionsPerDomain: 5, enabled: true, order: 2 },
    { domain: 'SPELLING', name: 'Spelling', icon: '✏️', questionsPerDomain: 5, enabled: true, order: 3 },
    { domain: 'SPEECH', name: 'Speech & Language', icon: '🗣️', questionsPerDomain: 5, enabled: true, order: 4 },
    { domain: 'CREATIVE_WRITING', name: 'Creative Writing', icon: '✨', questionsPerDomain: 5, enabled: true, order: 5 },
    { domain: 'SEL', name: 'Social-Emotional', icon: '💚', questionsPerDomain: 5, enabled: true, order: 6 },
    { domain: 'LIFE_SKILLS', name: 'Life Skills', icon: '🌟', questionsPerDomain: 5, enabled: true, order: 7 },
  ],
  STANDARD_WITH_ACCOMMODATIONS: [
    { domain: 'MATH', name: 'Math', icon: '🔢', questionsPerDomain: 5, enabled: true, order: 1 },
    { domain: 'ELA', name: 'Reading & Language', icon: '📚', questionsPerDomain: 5, enabled: true, order: 2 },
    { domain: 'SPELLING', name: 'Spelling', icon: '✏️', questionsPerDomain: 5, enabled: true, order: 3 },
    { domain: 'SPEECH', name: 'Speech & Language', icon: '🗣️', questionsPerDomain: 5, enabled: true, order: 4 },
    { domain: 'CREATIVE_WRITING', name: 'Creative Writing', icon: '✨', questionsPerDomain: 5, enabled: true, order: 5 },
    { domain: 'SEL', name: 'Social-Emotional', icon: '💚', questionsPerDomain: 5, enabled: true, order: 6 },
    { domain: 'LIFE_SKILLS', name: 'Life Skills', icon: '🌟', questionsPerDomain: 5, enabled: true, order: 7 },
  ],
  MODIFIED: [
    { domain: 'MATH', name: 'Numbers', icon: '🔢', questionsPerDomain: 4, enabled: true, order: 1 },
    { domain: 'ELA', name: 'Reading', icon: '📚', questionsPerDomain: 4, enabled: true, order: 2 },
    { domain: 'LIFE_SKILLS', name: 'Daily Skills', icon: '🌟', questionsPerDomain: 4, enabled: true, order: 3 },
    { domain: 'SEL', name: 'Feelings', icon: '💚', questionsPerDomain: 4, enabled: true, order: 4 },
    { domain: 'SPEECH', name: 'Talking', icon: '🗣️', questionsPerDomain: 3, enabled: true, order: 5 },
    { domain: 'SPELLING', name: 'Spelling', icon: '✏️', questionsPerDomain: 3, enabled: false, order: 6 },
    { domain: 'CREATIVE_WRITING', name: 'Stories', icon: '✨', questionsPerDomain: 3, enabled: false, order: 7 },
  ],
  ALTERNATE: [
    { domain: 'LIFE_SKILLS', name: 'Daily Living', icon: '🌟', questionsPerDomain: 3, enabled: true, order: 1 },
    { domain: 'SEL', name: 'Feelings & Friends', icon: '💚', questionsPerDomain: 3, enabled: true, order: 2 },
    { domain: 'SPEECH', name: 'Communication', icon: '🗣️', questionsPerDomain: 3, enabled: true, order: 3 },
    { domain: 'MATH', name: 'Numbers', icon: '🔢', questionsPerDomain: 2, enabled: true, order: 4 },
    { domain: 'ELA', name: 'Reading', icon: '📚', questionsPerDomain: 2, enabled: true, order: 5 },
    { domain: 'SPELLING', name: 'Letters', icon: '✏️', questionsPerDomain: 2, enabled: false, order: 6 },
    { domain: 'CREATIVE_WRITING', name: 'Stories', icon: '✨', questionsPerDomain: 2, enabled: false, order: 7 },
  ],
};

/**
 * Intro messages by assessment type
 */
const INTRO_MESSAGES: Record<AssessmentType, string> = {
  STANDARD: "Let's find out what you already know! Answer each question the best you can. There are no wrong answers - this helps us create the perfect learning path just for you! 🚀",
  STANDARD_WITH_ACCOMMODATIONS: "Let's find out what you already know! Take your time with each question - you can take breaks whenever you need. This helps us create the perfect learning path just for you! 🚀",
  MODIFIED: "Hi! Let's play some learning games! 🎮 Look at each question and pick the answer you think is right. Take your time - there's no rush! 🌈",
  ALTERNATE: "Hello, friend! 👋 We're going to do some fun activities together. Your helper can read the questions to you. Just show us what you can do! 🌟",
};

/**
 * Completion messages by assessment type
 */
const COMPLETION_MESSAGES: Record<AssessmentType, string> = {
  STANDARD: "Amazing job! 🎉 You completed the assessment! Your personalized learning journey is being created right now. Get ready for an adventure! 🚀",
  STANDARD_WITH_ACCOMMODATIONS: "Wonderful job! 🎉 You did it! Your personalized learning journey is being created just for you. Time for a well-deserved break! 🌟",
  MODIFIED: "Yay! You did it! 🎊 Great job finishing all the activities! We're making a special learning plan just for you! 🌈",
  ALTERNATE: "Hooray! 🎈 You're all done! That was so much fun! Now we know how to help you learn best! Great work! 🌟",
};

/**
 * GET /api/baseline/config
 * 
 * Returns the assessment configuration based on learner profile.
 * Fetches learner profile first to determine assessment type.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      // Return default config for demo
      const config = buildConfig('STANDARD', 'K_2', '1');
      return NextResponse.json({ success: true, config, devMode: true });
    }

    // Try to fetch learner profile
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    try {
      const profileResponse = await fetch(`${baseUrl}/api/learner/profile`, {
        headers: {
          Cookie: `auth-token=${authToken}`,
        },
      });

      if (profileResponse.ok) {
        const { profile } = await profileResponse.json();
        const assessmentType = profile.parentAssessment?.assessmentType || 'STANDARD';
        const gradeBand = profile.gradeBand || 'K_2';
        const gradeLevel = profile.gradeLevel || '1';
        
        const config = buildConfig(assessmentType, gradeBand, gradeLevel, profile.parentAssessment?.accommodations);
        
        return NextResponse.json({
          success: true,
          config,
          learnerId: profile.id,
          learnerName: profile.firstName,
        });
      }
    } catch (error) {
      console.log('[Config] Could not fetch profile:', error);
    }

    // Default config
    const config = buildConfig('STANDARD', 'K_2', '1');
    return NextResponse.json({ success: true, config, devMode: true });

  } catch (error) {
    console.error('Config fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to get assessment configuration' },
      { status: 500 }
    );
  }
}

/**
 * Build assessment configuration
 */
function buildConfig(
  assessmentType: AssessmentType,
  gradeBand: GradeBand,
  gradeLevel: string,
  customAccommodations?: string[]
): AssessmentConfig {
  const domains = DOMAIN_CONFIGS[assessmentType] || DOMAIN_CONFIGS['STANDARD'];
  const enabledDomains = domains.filter(d => d.enabled);
  const totalQuestions = enabledDomains.reduce((sum, d) => sum + d.questionsPerDomain, 0);
  
  // Base accommodations by assessment type
  const accommodations = {
    extendedTime: assessmentType !== 'STANDARD',
    frequentBreaks: assessmentType !== 'STANDARD',
    simplifiedLanguage: assessmentType === 'MODIFIED' || assessmentType === 'ALTERNATE',
    visualSupports: assessmentType === 'MODIFIED' || assessmentType === 'ALTERNATE',
    audioNarration: assessmentType === 'MODIFIED' || assessmentType === 'ALTERNATE',
    reducedOptions: assessmentType === 'MODIFIED' || assessmentType === 'ALTERNATE',
    largerText: assessmentType !== 'STANDARD',
    caregiverAssisted: assessmentType === 'ALTERNATE',
  };

  // Apply custom accommodations
  if (customAccommodations) {
    customAccommodations.forEach(acc => {
      const lowerAcc = acc.toLowerCase();
      if (lowerAcc.includes('extended time')) accommodations.extendedTime = true;
      if (lowerAcc.includes('break')) accommodations.frequentBreaks = true;
      if (lowerAcc.includes('simplified')) accommodations.simplifiedLanguage = true;
      if (lowerAcc.includes('visual')) accommodations.visualSupports = true;
      if (lowerAcc.includes('audio')) accommodations.audioNarration = true;
      if (lowerAcc.includes('larger') || lowerAcc.includes('text')) accommodations.largerText = true;
    });
  }

  // UI configuration
  const uiConfig = {
    showTimer: assessmentType === 'STANDARD',
    allowSkip: assessmentType !== 'STANDARD',
    showProgress: true,
    breakFrequency: assessmentType === 'ALTERNATE' ? 3 : assessmentType === 'MODIFIED' ? 5 : 10,
    optionCount: assessmentType === 'ALTERNATE' ? 2 : assessmentType === 'MODIFIED' ? 3 : 4,
    fontSizeMultiplier: accommodations.largerText ? 1.25 : 1.0,
    highContrast: assessmentType === 'MODIFIED' || assessmentType === 'ALTERNATE',
    animationsEnabled: true,
  };

  // Estimate duration
  const minutesPerQuestion = assessmentType === 'ALTERNATE' ? 2 : assessmentType === 'MODIFIED' ? 1.5 : 1;
  const breakTime = Math.floor(totalQuestions / uiConfig.breakFrequency) * 2;
  const estimatedDurationMinutes = Math.ceil(totalQuestions * minutesPerQuestion + breakTime);

  return {
    assessmentType,
    gradeBand,
    gradeLevel,
    domains: enabledDomains,
    estimatedDurationMinutes,
    questionsPerDomain: enabledDomains[0]?.questionsPerDomain || 5,
    totalQuestions,
    accommodations,
    uiConfig,
    introMessage: INTRO_MESSAGES[assessmentType],
    completionMessage: COMPLETION_MESSAGES[assessmentType],
  };
}
