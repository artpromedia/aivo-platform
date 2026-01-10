import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock Registration API Route
 * 
 * In development, this handles registration locally.
 * In production, this would proxy to the auth-svc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, role } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // In development mode, simulate successful registration
    // In production, this would call the actual auth service
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // Simulate user creation
      const mockUser = {
        id: `user_${Date.now()}`,
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        role: role || 'PARENT',
        createdAt: new Date().toISOString(),
      };

      // Generate mock tokens
      const mockAccessToken = `mock_access_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const mockRefreshToken = `mock_refresh_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      console.log('[DEV] Mock registration successful:', { email, role });

      return NextResponse.json({
        user: mockUser,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        message: 'Account created successfully',
      });
    }

    // Production: Proxy to auth service
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-svc:4001';
    const response = await fetch(`${authServiceUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
