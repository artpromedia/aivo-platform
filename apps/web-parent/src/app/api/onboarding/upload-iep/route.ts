import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * IEP Upload API
 * 
 * Handles the upload of existing IEP documents during parent assessment.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const learnerId = formData.get('learnerId') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    if (!learnerId) {
      return NextResponse.json(
        { success: false, message: 'Learner ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Please upload a PDF or image file.' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // In development, simulate successful upload
      console.log('[IEP Upload] Received file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        learnerId,
      });

      return NextResponse.json({
        success: true,
        documentId: `iep_${Date.now()}`,
        filename: file.name,
        message: 'IEP document uploaded successfully',
        processingStatus: 'PENDING',
      });
    }

    // Production: Upload to file service and register with profile service
    const fileServiceUrl = process.env.FILE_SERVICE_URL || 'http://file-svc:4050';
    const profileServiceUrl = process.env.PROFILE_SERVICE_URL || 'http://profile-svc:3420';
    const token = request.headers.get('Authorization');

    // Step 1: Get presigned upload URL
    const presignResponse = await fetch(`${fileServiceUrl}/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        size: file.size,
        category: 'iep-documents',
      }),
    });

    if (!presignResponse.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to initiate upload' },
        { status: 500 }
      );
    }

    const { uploadUrl, s3Key, fileId } = await presignResponse.json();

    // Step 2: Upload file to S3
    const arrayBuffer = await file.arrayBuffer();
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: arrayBuffer,
    });

    if (!uploadResponse.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Step 3: Register IEP document with profile service
    const registerResponse = await fetch(`${profileServiceUrl}/profiles/${learnerId}/iep-documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify({
        fileId,
        filename: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
        s3Key,
        uploadSource: 'PARENT_ONBOARDING',
      }),
    });

    if (!registerResponse.ok) {
      const errorData = await registerResponse.json();
      return NextResponse.json(
        { success: false, message: errorData.message || 'Failed to register IEP document' },
        { status: registerResponse.status }
      );
    }

    const documentData = await registerResponse.json();

    return NextResponse.json({
      success: true,
      documentId: documentData.id,
      filename: file.name,
      message: 'IEP document uploaded successfully',
      processingStatus: 'PENDING',
    });
  } catch (error) {
    console.error('IEP upload error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during upload' },
      { status: 500 }
    );
  }
}
