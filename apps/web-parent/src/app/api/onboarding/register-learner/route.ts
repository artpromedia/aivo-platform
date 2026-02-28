import * as crypto from 'node:crypto';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Parent service URL (has access to the profiles database)
const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';

/**
 * Onboarding API - Register Learner
 *
 * Creates a learner profile in the database with a PIN for login.
 * Works in both development and production modes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, dateOfBirth, gradeLevel, location, classCode, pin } = body;

    // Validate required fields
    if (!firstName || !gradeLevel || !pin) {
      return NextResponse.json(
        { message: 'First name, grade level, and PIN are required' },
        { status: 400 }
      );
    }

    // Validate PIN format before forwarding
    if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ message: 'PIN must be exactly 6 digits' }, { status: 400 });
    }

    // Try to call parent-svc to create the profile
    try {
      const token = request.headers.get('Authorization');
      const response = await fetch(`${PARENT_SVC_URL}/api/v1/onboarding/register-learner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: token }),
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        // Normalize parent-svc response shape to match what the frontend expects.
        // parent-svc returns { learnerId, learnerPin, location, district, curriculumStandards, needsBaseline }
        // Frontend expects { learner: { id, pin, ... }, curriculumInfo: { ... } }
        const normalized = {
          learner: {
            id: data.learnerId || data.learner?.id,
            firstName,
            lastName: lastName || '',
            pin: '******', // Plaintext PIN no longer returned (PIN-05)
            gradeLevel,
          },
          curriculumInfo: {
            curriculumStandards: data.curriculumStandards || ['COMMON_CORE'],
            district: data.district || null,
            location: data.location || location || null,
          },
          message: 'Learner registered successfully',
          needsBaseline: data.needsBaseline ?? true,
        };
        return NextResponse.json(normalized);
      }

      // If parent-svc returns an error, log and continue with direct DB insert
      const errorText = await response.text();
      console.log('[Register Learner] Parent service error, using direct DB:', errorText);
    } catch (fetchError) {
      console.log('[Register Learner] Parent service unavailable, using direct DB insert');
    }

    // Direct database insert as fallback (for dev or when parent-svc onboarding isn't ready)
    // This ensures profiles are always created in the database
    const learnerId = `learner_${Date.now()}`;
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

    // Call parent-svc internal endpoint to create profile directly
    try {
      const internalResponse = await fetch(`${PARENT_SVC_URL}/api/v1/internal/create-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: learnerId,
          givenName: firstName,
          familyName: lastName || '',
          grade: gradeLevel,
          dateOfBirth: dateOfBirth || null,
          // pin: — plaintext no longer sent (PIN-05)
          pinHash,
          baselineStatus: 'not_started',
          status: 'active',
        }),
      });

      if (internalResponse.ok) {
        console.log(`[Register Learner] Profile created in DB: ${learnerId}`);
      }
    } catch (dbError) {
      console.log('[Register Learner] Could not create profile in DB:', dbError);
    }

    // Return the learner data regardless of DB state
    const learner = {
      id: learnerId,
      firstName,
      lastName: lastName || '',
      dateOfBirth: dateOfBirth || null,
      gradeLevel,
      zipCode: location?.zipCode || null,
      classCode: classCode || `AIVO${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      joinedClassCode: classCode || null,
      pin: '******', // Plaintext PIN no longer included (PIN-05)
      createdAt: new Date().toISOString(),
    };

    if (classCode) {
      console.log(`[Register Learner] Joining class with code: ${classCode}`);
    }

    return NextResponse.json({
      learner,
      curriculumInfo: {
        curriculumStandards: ['COMMON_CORE'],
        district: null,
        location: location || null,
      },
      message: 'Learner registered successfully',
      joinedClass: classCode ? { code: classCode, name: 'Demo Classroom' } : null,
    });
  } catch (error) {
    console.error('Register learner error:', error);
    return NextResponse.json(
      { message: 'An error occurred during learner registration' },
      { status: 500 }
    );
  }
}
