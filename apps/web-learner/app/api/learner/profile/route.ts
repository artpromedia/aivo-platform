import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PROFILE_SVC_URL = process.env.PROFILE_SVC_URL || 'http://localhost:3420';
const BASELINE_SVC_URL = process.env.BASELINE_SVC_URL || 'http://localhost:4030';

/**
 * Assessment Type determined by parent assessment
 */
type AssessmentType = 'STANDARD' | 'STANDARD_WITH_ACCOMMODATIONS' | 'MODIFIED' | 'ALTERNATE';

/**
 * Learner Profile Response
 */
interface LearnerProfile {
  id: string;
  firstName: string;
  lastName?: string;
  gradeLevel: string;
  gradeBand: 'PRE_K' | 'K_2' | 'GRADE_3_5' | 'GRADE_6_8' | 'GRADE_9_12';
  dateOfBirth?: string;
  avatarUrl?: string;
  
  // Parent Assessment Results
  parentAssessment?: {
    assessmentType: AssessmentType;
    supportLevel: number;
    accommodations: string[];
    domainsToAssess: string[];
    areasOfConcern: string[];
    hasIep: boolean;
    has504: boolean;
    disabilityCategories: string[];
    assistiveTechnology: string[];
    completedAt: string;
  };
  
  // Baseline Status
  baselineStatus: 'not_started' | 'in_progress' | 'completed';
  baselineCompletedAt?: string;
}

/**
 * Parse JWT token to extract learner ID and tenant ID
 */
function parseToken(token: string): { sub: string; firstName?: string; tenantId?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return {
      sub: payload.sub,
      firstName: payload.firstName || payload.given_name,
      tenantId: payload.tenantId || payload.tenant_id,
    };
  } catch {
    return null;
  }
}

/**
 * Map grade level to grade band
 */
function getGradeBand(gradeLevel: string): LearnerProfile['gradeBand'] {
  const grade = gradeLevel.toUpperCase();
  if (grade === 'PRE_K' || grade === 'PREK') return 'PRE_K';
  if (grade === 'K' || grade === '1' || grade === '2') return 'K_2';
  if (['3', '4', '5'].includes(grade)) return 'GRADE_3_5';
  if (['6', '7', '8'].includes(grade)) return 'GRADE_6_8';
  if (['9', '10', '11', '12'].includes(grade)) return 'GRADE_9_12';
  return 'K_2'; // Default
}

/**
 * Fetch functioning profile from profile-svc (includes assessment type from parent assessment)
 */
async function fetchFunctioningProfile(learnerId: string, tenantId: string): Promise<{
  assessmentType: AssessmentType;
  supportLevel?: number;
  hasIep: boolean;
} | null> {
  try {
    const response = await fetch(
      `${PROFILE_SVC_URL}/internal/learner-functioning-profile/${learnerId}?tenantId=${tenantId}`,
      {
        headers: {
          'X-Internal-Service': 'web-learner',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        assessmentType: data.assessmentType || 'STANDARD',
        supportLevel: data.parentAssessmentScore,
        hasIep: data.hasIepDocumentation || false,
      };
    }
    return null;
  } catch (error) {
    console.log('[fetchFunctioningProfile] Error:', error);
    return null;
  }
}

/**
 * Fetch parent assessment from baseline-svc
 */
async function fetchParentAssessment(learnerId: string, authToken: string): Promise<{
  assessmentType: AssessmentType;
  supportLevel: number;
  hasIep: boolean;
  has504: boolean;
  disabilityCategories: string[];
  assistiveTechnology: string[];
  completedAt: string;
} | null> {
  try {
    const response = await fetch(
      `${BASELINE_SVC_URL}/parent-assessments/learner/${learnerId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        assessmentType: data.assessmentType || 'STANDARD',
        supportLevel: data.supportLevel || 85,
        hasIep: data.hasExistingIep || false,
        has504: data.hasExisting504 || false,
        disabilityCategories: data.disabilityCategories || [],
        assistiveTechnology: data.assistiveTechnology || [],
        completedAt: data.completedAt || new Date().toISOString(),
      };
    }
    return null;
  } catch (error) {
    console.log('[fetchParentAssessment] Error:', error);
    return null;
  }
}

/**
 * GET /api/learner/profile
 * 
 * Fetches the current learner's profile including parent assessment results.
 * This is used by the baseline assessment to determine what type of assessment to present.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse token to get learner ID
    const tokenData = parseToken(authToken);
    if (!tokenData?.sub) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const learnerId = tokenData.sub;
    const tenantId = tokenData.tenantId || 'default-tenant';
    const isDev = process.env.NODE_ENV !== 'production';

    // Check for test override in query params first (for development testing)
    const url = new URL(request.url);
    const testType = url.searchParams.get('testAssessmentType');
    const testGrade = url.searchParams.get('testGrade');

    // Try to fetch real data from services
    let functioningProfile = null;
    let parentAssessment = null;
    let basicProfile = null;

    try {
      // Fetch functioning profile (has assessment type from parent assessment)
      functioningProfile = await fetchFunctioningProfile(learnerId, tenantId);
      
      // Fetch parent assessment details from baseline-svc
      parentAssessment = await fetchParentAssessment(learnerId, authToken);

      // Try to fetch basic profile from profile service
      const profileResponse = await fetch(`${PROFILE_SVC_URL}/api/v1/profiles/${learnerId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (profileResponse.ok) {
        basicProfile = await profileResponse.json();
      }
    } catch (fetchError) {
      console.log('[Profile API] Service fetch error:', fetchError);
    }

    // Build profile response
    const assessmentType = testType as AssessmentType || 
      functioningProfile?.assessmentType || 
      parentAssessment?.assessmentType || 
      'STANDARD';

    const gradeLevel = testGrade || basicProfile?.gradeLevel || '3';
    const gradeBand = getGradeBand(gradeLevel);

    // Build accommodations list based on assessment type
    const accommodations = getAccommodationsForType(assessmentType);
    const domainsToAssess = getDomainsForType(assessmentType);

    const profile: LearnerProfile = {
      id: learnerId,
      firstName: tokenData.firstName || basicProfile?.givenName || 'Learner',
      lastName: basicProfile?.familyName,
      gradeLevel,
      gradeBand,
      dateOfBirth: basicProfile?.dateOfBirth,
      avatarUrl: basicProfile?.photoUrl || basicProfile?.avatarUrl,
      baselineStatus: basicProfile?.baselineStatus || 'not_started',
      baselineCompletedAt: basicProfile?.baselineCompletedAt,
      parentAssessment: {
        assessmentType,
        supportLevel: parentAssessment?.supportLevel || functioningProfile?.supportLevel || 85,
        accommodations,
        domainsToAssess,
        areasOfConcern: [],
        hasIep: parentAssessment?.hasIep || functioningProfile?.hasIep || false,
        has504: parentAssessment?.has504 || false,
        disabilityCategories: parentAssessment?.disabilityCategories || [],
        assistiveTechnology: parentAssessment?.assistiveTechnology || [],
        completedAt: parentAssessment?.completedAt || new Date().toISOString(),
      },
    };

    // Log in dev mode
    if (isDev) {
      console.log('[Profile API] Response:', {
        learnerId,
        assessmentType: profile.parentAssessment?.assessmentType,
        hasRealData: !!functioningProfile || !!parentAssessment,
        testOverride: !!testType,
      });
    }

    return NextResponse.json({
      success: true,
      profile,
      dataSource: functioningProfile || parentAssessment ? 'service' : 'default',
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Get accommodations list for assessment type
 */
function getAccommodationsForType(assessmentType: AssessmentType): string[] {
  switch (assessmentType) {
    case 'STANDARD':
      return [];
    case 'STANDARD_WITH_ACCOMMODATIONS':
      return ['Extended time', 'Frequent breaks', 'Simplified navigation'];
    case 'MODIFIED':
      return ['Simplified language', 'Visual supports', 'Audio narration', 'Shorter sessions'];
    case 'ALTERNATE':
      return ['1:1 support', 'Performance-based tasks', 'Unlimited time', 'Communication supports'];
    default:
      return [];
  }
}

/**
 * Get domains to assess for assessment type
 */
function getDomainsForType(assessmentType: AssessmentType): string[] {
  switch (assessmentType) {
    case 'STANDARD':
    case 'STANDARD_WITH_ACCOMMODATIONS':
      return ['MATH', 'ELA', 'SPEECH', 'SEL', 'SPELLING', 'CREATIVE_WRITING', 'LIFE_SKILLS'];
    case 'MODIFIED':
      return ['MATH', 'ELA', 'SEL', 'LIFE_SKILLS', 'SPEECH'];
    case 'ALTERNATE':
      return ['LIFE_SKILLS', 'SEL', 'SPEECH'];
    default:
      return ['MATH', 'ELA', 'SPEECH', 'SEL'];
  }
}
