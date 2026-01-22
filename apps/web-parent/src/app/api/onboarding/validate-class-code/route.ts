import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Validate Class Code API
 * 
 * Checks if a class code is valid and returns class information.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classCode } = body;

    if (!classCode) {
      return NextResponse.json(
        { valid: false, message: 'Class code is required' },
        { status: 400 }
      );
    }

    // Normalize the class code (uppercase, trim whitespace)
    const normalizedCode = classCode.toUpperCase().trim();

    // Validate format: typically 6-12 alphanumeric characters
    const codeRegex = /^[A-Z0-9]{4,12}$/;
    if (!codeRegex.test(normalizedCode)) {
      return NextResponse.json(
        { valid: false, message: 'Invalid class code format' },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // In development, accept any well-formatted code that starts with "AIVO" or "CLASS"
      if (normalizedCode.startsWith('AIVO') || normalizedCode.startsWith('CLASS')) {
        return NextResponse.json({
          valid: true,
          classInfo: {
            id: `class_${Date.now()}`,
            name: 'Demo Classroom',
            teacherName: 'Teacher Demo',
            grade: 'Mixed Grades',
          },
        });
      }

      // For testing, also accept codes like TEST123, DEMO456
      if (normalizedCode.startsWith('TEST') || normalizedCode.startsWith('DEMO')) {
        return NextResponse.json({
          valid: true,
          classInfo: {
            id: `class_test_${Date.now()}`,
            name: 'Test Classroom',
            teacherName: 'Test Teacher',
            grade: 'Test Grade',
          },
        });
      }

      return NextResponse.json(
        { valid: false, message: 'Class code not found. Please check with your teacher.' },
        { status: 404 }
      );
    }

    // Production: Validate against teacher service
    const teacherServiceUrl = process.env.TEACHER_SERVICE_URL || 'http://teacher-svc:4008';
    const token = request.headers.get('Authorization');

    const response = await fetch(`${teacherServiceUrl}/classes/validate-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify({ classCode: normalizedCode }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { valid: false, message: 'Class code not found. Please check with your teacher.' },
          { status: 404 }
        );
      }
      const data = await response.json();
      return NextResponse.json(
        { valid: false, message: data.message || 'Unable to validate class code' },
        { status: response.status }
      );
    }

    const classData = await response.json();
    return NextResponse.json({
      valid: true,
      classInfo: classData,
    });
  } catch (error) {
    console.error('Class code validation error:', error);
    return NextResponse.json(
      { valid: false, message: 'Unable to validate class code' },
      { status: 500 }
    );
  }
}
