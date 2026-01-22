import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Assessment Type Descriptions aligned with IDEA/Section 504
 */
const ASSESSMENT_TYPE_DESCRIPTIONS = {
  STANDARD: {
    name: 'Standard Assessment',
    description: 'A comprehensive baseline assessment to determine current skill levels across all academic and developmental domains.',
    accommodations: [],
  },
  STANDARD_WITH_ACCOMMODATIONS: {
    name: 'Standard Assessment with Accommodations',
    description: 'The standard assessment with built-in supports such as extended time, breaks, and simplified navigation.',
    accommodations: ['Extended time', 'Frequent breaks', 'Simplified interface'],
  },
  MODIFIED: {
    name: 'Modified Assessment',
    description: 'An adapted assessment with simplified language, visual supports, and alternative response methods to accurately measure skills.',
    accommodations: ['Simplified language', 'Visual supports', 'Alternative response options', 'Shorter sessions', 'Audio support'],
  },
  ALTERNATE: {
    name: 'Alternate Assessment',
    description: 'A performance-based assessment designed for learners with significant cognitive disabilities, aligned with alternate achievement standards per IDEA requirements.',
    accommodations: ['1:1 support', 'Performance-based tasks', 'Adaptive interface', 'Communication supports', 'Physical assistance as needed'],
  },
};

/**
 * Parent Assessment API - IDEA/Section 504 Compliant
 * 
 * Receives comprehensive parent assessment responses to determine
 * the appropriate assessment type and accommodations for the child.
 * 
 * Supports the 13 IDEA disability categories and Section 504 accommodations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      learnerId,
      responses,
      assessmentType,
      supportLevel,
      recommendations,
      hasExistingIep,
      hasExisting504,
      disabilityCategories,
      currentServices,
      assistiveTechnology,
      additionalNotes,
      completedAt,
      ideaCompliant,
      section504Compliant,
    } = body;

    if (!learnerId) {
      return NextResponse.json(
        { success: false, message: 'Learner ID is required' },
        { status: 400 }
      );
    }

    if (!responses || typeof responses !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Assessment responses are required' },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';

    // Generate comprehensive assessment summary
    const assessmentSummary = generateAssessmentSummary(responses, disabilityCategories);

    if (isDev) {
      // In development, log the comprehensive assessment data
      console.log('[Parent Assessment - IDEA/504 Compliant] Received:', {
        learnerId,
        assessmentType,
        supportLevel,
        hasExistingIep,
        hasExisting504,
        disabilityCategories,
        currentServices: currentServices?.length || 0,
        assistiveTechnology: assistiveTechnology?.length || 0,
        responsesCount: Object.keys(responses).length,
        completedAt,
      });

      const typeInfo = ASSESSMENT_TYPE_DESCRIPTIONS[assessmentType as keyof typeof ASSESSMENT_TYPE_DESCRIPTIONS] 
        || ASSESSMENT_TYPE_DESCRIPTIONS.STANDARD;

      return NextResponse.json({
        success: true,
        assessmentId: `assessment_${Date.now()}`,
        assessmentType: assessmentType || 'STANDARD',
        message: 'Parent assessment saved successfully (IDEA/504 compliant)',
        summary: {
          type: assessmentType || 'STANDARD',
          typeName: typeInfo.name,
          typeDescription: typeInfo.description,
          standardAccommodations: typeInfo.accommodations,
          recommendations: recommendations || [],
          supportLevel: supportLevel || 100,
          areasOfConcern: assessmentSummary.areasOfConcern,
          strengths: assessmentSummary.strengths,
          hasExistingIep,
          hasExisting504,
          disabilityCategories: disabilityCategories || [],
          currentServices: currentServices || [],
          assistiveTechnology: assistiveTechnology || [],
          ideaCompliant: ideaCompliant !== false,
          section504Compliant: section504Compliant !== false,
        },
      });
    }

    // Production: Send to baseline/assessment service
    const baselineServiceUrl = process.env.BASELINE_SERVICE_URL || 'http://baseline-svc:4030';
    const token = request.headers.get('Authorization');

    const response = await fetch(`${baselineServiceUrl}/parent-assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify({
        learnerId,
        responses,
        assessmentType: assessmentType || 'STANDARD',
        supportLevel,
        recommendations,
        hasExistingIep,
        hasExisting504,
        disabilityCategories: disabilityCategories || [],
        currentServices: currentServices || [],
        assistiveTechnology: assistiveTechnology || [],
        additionalNotes,
        assessmentSummary,
        ideaCompliant: ideaCompliant !== false,
        section504Compliant: section504Compliant !== false,
        submittedAt: completedAt || new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to save assessment' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error('Parent assessment error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while saving the assessment' },
      { status: 500 }
    );
  }
}

/**
 * Generate a summary of areas of concern and strengths from responses
 */
function generateAssessmentSummary(
  responses: Record<string, string | string[] | number>,
  disabilityCategories: string[] = []
): { areasOfConcern: string[]; strengths: string[] } {
  const areasOfConcern: string[] = [];
  const strengths: string[] = [];

  // Communication & Language
  if (responses.receptive_language === 'significant_difficulty' || responses.receptive_language === 'minimal_understanding') {
    areasOfConcern.push('Receptive language (understanding spoken language)');
  }
  if (responses.expressive_language === 'nonverbal_limited' || responses.expressive_language === 'nonverbal_gestures') {
    areasOfConcern.push('Expressive communication');
  }
  if (responses.receptive_language === 'age_appropriate') {
    strengths.push('Age-appropriate receptive language skills');
  }

  // Cognitive & Academic
  if (responses.learning_pace === 'extensive_support' || responses.learning_pace === 'significantly_slower') {
    areasOfConcern.push('Learning pace and processing');
  }
  if (responses.reading_level === 'significantly_below') {
    areasOfConcern.push('Reading skills');
  }
  if (responses.math_level === 'significantly_below') {
    areasOfConcern.push('Math skills');
  }
  if (responses.memory_retention === 'poor' || responses.memory_retention === 'very_poor') {
    areasOfConcern.push('Memory and retention');
  }
  if (responses.learning_pace === 'advanced' || responses.learning_pace === 'on_pace') {
    strengths.push('Strong learning pace');
  }
  if (responses.reading_level === 'above_grade' || responses.reading_level === 'on_grade') {
    strengths.push('Reading skills at or above grade level');
  }

  // Motor Skills
  if (responses.fine_motor_writing === 'significant_difficulty' || responses.fine_motor_writing === 'unable') {
    areasOfConcern.push('Fine motor skills (writing)');
  }
  if (responses.fine_motor_touch === 'needs_assistance') {
    areasOfConcern.push('Fine motor skills (technology use)');
  }
  if (responses.gross_motor === 'significant_delays' || responses.gross_motor === 'wheelchair') {
    areasOfConcern.push('Gross motor skills and mobility');
  }
  if (responses.fine_motor_writing === 'age_appropriate') {
    strengths.push('Age-appropriate fine motor skills');
  }

  // Attention & Executive Function
  if (responses.sustained_attention === 'very_short' || responses.sustained_attention === 'minimal') {
    areasOfConcern.push('Sustained attention');
  }
  if (responses.distractibility === 'very_often' || responses.distractibility === 'constantly') {
    areasOfConcern.push('Distractibility');
  }
  if (responses.transitions === 'severe_difficulty' || responses.transitions === 'moderate_difficulty') {
    areasOfConcern.push('Transitions between activities');
  }
  if (responses.sustained_attention === 'age_appropriate') {
    strengths.push('Age-appropriate attention span');
  }

  // Social-Emotional
  if (responses.emotional_regulation === 'severe_difficulty' || responses.emotional_regulation === 'significant_difficulty') {
    areasOfConcern.push('Emotional regulation');
  }
  if (responses.peer_interaction === 'significant_difficulty' || responses.peer_interaction === 'no_interest') {
    areasOfConcern.push('Peer interactions');
  }
  if (responses.anxiety_level === 'severe' || responses.anxiety_level === 'significant') {
    areasOfConcern.push('Anxiety management');
  }
  if (responses.peer_interaction === 'typical') {
    strengths.push('Positive peer interactions');
  }

  // Sensory Processing
  if (responses.auditory_sensitivity === 'severe_sensitivity') {
    areasOfConcern.push('Auditory sensory processing');
  }
  if (responses.visual_sensitivity === 'severe_sensitivity') {
    areasOfConcern.push('Visual sensory processing');
  }
  if (responses.tactile_sensitivity === 'severe_sensitivity') {
    areasOfConcern.push('Tactile sensory processing');
  }

  // Adaptive & Daily Living
  if (responses.self_care === 'full_assistance' || responses.self_care === 'significant_help') {
    areasOfConcern.push('Self-care and daily living skills');
  }
  if (responses.safety_awareness === 'constant_supervision' || responses.safety_awareness === 'significant_concern') {
    areasOfConcern.push('Safety awareness');
  }
  if (responses.self_care === 'independent') {
    strengths.push('Independent self-care skills');
  }

  // Health & Medical
  if (responses.vision_hearing === 'deaf_hoh' || responses.vision_hearing === 'blind_low_vision' || responses.vision_hearing === 'both') {
    areasOfConcern.push('Vision and/or hearing needs');
  }

  // Add IDEA disability categories
  if (disabilityCategories.length > 0 && !disabilityCategories.includes('none')) {
    areasOfConcern.push(`IDEA-identified: ${disabilityCategories.join(', ')}`);
  }

  return {
    areasOfConcern: areasOfConcern.slice(0, 10), // Top 10 concerns
    strengths: strengths.slice(0, 5), // Top 5 strengths
  };
}

/**
 * Get Parent Assessment
 * 
 * Retrieves a parent's previous assessment for a learner.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const learnerId = searchParams.get('learnerId');

    if (!learnerId) {
      return NextResponse.json(
        { success: false, message: 'Learner ID is required' },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // In development, return empty assessment (not completed)
      return NextResponse.json({
        success: true,
        assessment: null,
        message: 'No previous assessment found',
      });
    }

    // Production: Get from baseline/assessment service
    const baselineServiceUrl = process.env.BASELINE_SERVICE_URL || 'http://baseline-svc:4030';
    const token = request.headers.get('Authorization');

    const response = await fetch(`${baselineServiceUrl}/parent-assessments/${learnerId}`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: token }),
      },
    });

    if (response.status === 404) {
      return NextResponse.json({
        success: true,
        assessment: null,
        message: 'No previous assessment found',
      });
    }

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to retrieve assessment' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      assessment: data,
    });
  } catch (error) {
    console.error('Get parent assessment error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while retrieving the assessment' },
      { status: 500 }
    );
  }
}
