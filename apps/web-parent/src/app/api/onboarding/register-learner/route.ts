import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Mock Onboarding API - Register Learner
 * 
 * In development, this handles learner registration locally.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, dateOfBirth, gradeLevel, zipCode } = body;

    // Validate required fields
    if (!firstName || !gradeLevel) {
      return NextResponse.json(
        { message: 'First name and grade level are required' },
        { status: 400 }
      );
    }

    // In development, simulate learner creation
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // Generate 6-digit PIN for web learner login
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      
      const mockLearner = {
        id: `learner_${Date.now()}`,
        firstName,
        lastName: lastName || '',
        dateOfBirth: dateOfBirth || null,
        gradeLevel,
        zipCode: zipCode || null,
        classCode: `AIVO${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        pin, // 6-digit PIN for web/mobile login
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({
        learner: mockLearner,
        message: 'Learner registered successfully',
      });
    }

    // Production: Proxy to parent service
    const parentServiceUrl = process.env.PARENT_SERVICE_URL || 'http://parent-svc:4009';
    const token = request.headers.get('Authorization');
    
    const response = await fetch(`${parentServiceUrl}/onboarding/register-learner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { message: 'An error occurred during learner registration' },
      { status: 500 }
    );
  }
}
