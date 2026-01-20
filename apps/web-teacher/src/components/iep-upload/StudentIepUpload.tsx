/**
 * Student IEP Upload Component for Teachers
 *
 * Allows teachers to upload existing IEP documents for students during
 * the baseline assessment process. Similar to parent component but with
 * teacher-specific features and styling.
 */

'use client';

import { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Info,
  Eye,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types (same as parent portal)
type IepDocumentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'COMPARISON_READY'
  | 'APPROVED'
  | 'REJECTED'
  | 'ERROR';

interface IepDocument {
  id: string;
  filename: string;
  status: IepDocumentStatus;
  processingError: string | null;
  uploadedAt: string;
  uploadedByRole: string;
}

interface StudentIepUploadProps {
  studentId: string;
  studentName: string;
  profileId: string;
  existingDocument?: IepDocument | null;
  hasCompletedAssessment?: boolean;
  className?: string;
  onUploadComplete?: () => void;
  onDocumentDeleted?: () => void;
  onViewDocument?: (documentId: string) => void;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const BASELINE_SVC_URL = process.env.NEXT_PUBLIC_BASELINE_SVC_URL || '/api/baseline';
const CONTENT_SVC_URL = process.env.NEXT_PUBLIC_CONTENT_SVC_URL || '/api/content';

export function StudentIepUpload({
  studentId,
  studentName,
  profileId,
  existingDocument,
  hasCompletedAssessment,
  className,
  onUploadComplete,
  onDocumentDeleted,
  onViewDocument,
}: StudentIepUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a PDF or image file (JPEG, PNG, GIF, WebP, HEIC)';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 50MB';
    }
    return null;
  };

  const handleUpload = useCallback(
    async (file: File) => {
      setUploadError(null);

      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }

      try {
        setUploadProgress('uploading');
        const headers = await getAuthHeaders();

        // Step 1: Get presigned URL
        const presignedResponse = await fetch(`${CONTENT_SVC_URL}/files/presigned-upload`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            category: 'IEP_DOCUMENT',
            contentLength: file.size,
          }),
        });

        if (!presignedResponse.ok) {
          throw new Error('Failed to get upload URL');
        }

        const { uploadUrl, s3Key } = await presignedResponse.json();

        // Step 2: Upload to S3
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }

        // Step 3: Finalize upload
        setUploadProgress('processing');
        const finalizeResponse = await fetch(`${CONTENT_SVC_URL}/files/finalize`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            s3Key,
            filename: file.name,
            mimeType: file.type,
            category: 'IEP_DOCUMENT',
          }),
        });

        if (!finalizeResponse.ok) {
          throw new Error('Failed to finalize upload');
        }

        const { file: uploadedFile } = await finalizeResponse.json();

        // Step 4: Register with baseline service
        const registerResponse = await fetch(
          `${BASELINE_SVC_URL}/baseline/profiles/${profileId}/iep`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              fileId: uploadedFile.id,
              filename: file.name,
              mimeType: file.type,
              fileSizeBytes: file.size,
              s3Key,
              notes: notes || undefined,
            }),
          }
        );

        if (!registerResponse.ok) {
          const error = await registerResponse.json();
          throw new Error(error.error || 'Failed to register document');
        }

        setUploadProgress('idle');
        setNotes('');
        onUploadComplete?.();
      } catch (error) {
        setUploadProgress('idle');
        setUploadError(error instanceof Error ? error.message : 'Upload failed');
      }
    },
    [profileId, notes, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      e.target.value = '';
    },
    [handleUpload]
  );

  const handleDelete = async () => {
    if (!existingDocument) return;

    try {
      setIsDeleting(true);
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${BASELINE_SVC_URL}/baseline/iep-documents/${existingDocument.id}`,
        { method: 'DELETE', headers }
      );

      if (!response.ok && response.status !== 204) {
        throw new Error('Delete failed');
      }

      onDocumentDeleted?.();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Existing document view
  if (existingDocument) {
    return (
      <div className={cn('rounded-lg border bg-white p-4', className)}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                existingDocument.status === 'ERROR'
                  ? 'bg-red-100'
                  : existingDocument.status === 'PROCESSED' ||
                    existingDocument.status === 'COMPARISON_READY' ||
                    existingDocument.status === 'APPROVED'
                  ? 'bg-green-100'
                  : 'bg-blue-100'
              )}
            >
              {existingDocument.status === 'PENDING' ||
              existingDocument.status === 'PROCESSING' ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              ) : existingDocument.status === 'ERROR' ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>

            <div>
              <h4 className="font-medium text-gray-900">{studentName}'s IEP</h4>
              <p className="mt-0.5 text-sm text-gray-600">{existingDocument.filename}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                <span>
                  Uploaded {new Date(existingDocument.uploadedAt).toLocaleDateString()}
                </span>
                <span>by {existingDocument.uploadedByRole}</span>
              </div>

              {/* Status messages */}
              {existingDocument.status === 'PENDING' && (
                <p className="mt-2 text-sm text-blue-600">Waiting to process...</p>
              )}
              {existingDocument.status === 'PROCESSING' && (
                <p className="mt-2 text-sm text-blue-600">Extracting IEP content...</p>
              )}
              {existingDocument.status === 'PROCESSED' && !hasCompletedAssessment && (
                <p className="mt-2 text-sm text-amber-600">
                  Awaiting baseline assessment completion
                </p>
              )}
              {existingDocument.status === 'PROCESSED' && hasCompletedAssessment && (
                <p className="mt-2 text-sm text-green-600">Ready for comparison</p>
              )}
              {existingDocument.status === 'COMPARISON_READY' && (
                <p className="mt-2 text-sm text-green-600">Comparison ready for review</p>
              )}
              {existingDocument.status === 'ERROR' && (
                <p className="mt-2 text-sm text-red-600">
                  {existingDocument.processingError || 'Processing failed'}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onViewDocument && (
              <button
                onClick={() => onViewDocument(existingDocument.id)}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="View document"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {existingDocument.status !== 'APPROVED' && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="Remove document"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Upload form
  return (
    <div className={cn('rounded-lg border bg-white p-4', className)}>
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
          <FileText className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900">Upload {studentName}'s IEP</h4>
          <p className="mt-0.5 text-sm text-gray-600">
            Upload an existing IEP to compare with assessment results
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="mb-3 flex items-start gap-2 rounded-md bg-blue-50 p-2 text-xs text-blue-700">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>Optional: The IEP will be compared with assessment results when available.</span>
      </div>

      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        className={cn(
          'relative cursor-pointer rounded-md border-2 border-dashed p-4 text-center transition-colors',
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400',
          uploadProgress !== 'idle' && 'pointer-events-none opacity-50'
        )}
      >
        <input
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileSelect}
          disabled={uploadProgress !== 'idle'}
          className="absolute inset-0 cursor-pointer opacity-0"
        />

        {uploadProgress === 'idle' ? (
          <>
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-1 text-sm font-medium text-gray-700">
              {isDragging ? 'Drop file here' : 'Drop IEP document or click to browse'}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">PDF or images up to 50MB</p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-1 text-sm font-medium text-indigo-700">
              {uploadProgress === 'uploading' ? 'Uploading...' : 'Processing...'}
            </p>
          </>
        )}
      </div>

      {/* Notes */}
      <div className="mt-3">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes (optional)"
          className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Error */}
      {uploadError && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-red-50 p-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  );
}
