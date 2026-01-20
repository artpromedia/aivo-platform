/**
 * IEP Upload Card Component
 *
 * Allows parents to upload an existing IEP document during the baseline
 * assessment process. The uploaded IEP will be compared with the system's
 * assessment to help create a personalized learning plan.
 */

'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Info } from 'lucide-react';
import type { IepDocumentStatus } from '@/lib/types/iep-upload';
import {
  useUploadIep,
  useDeleteIep,
  getPresignedUploadUrl,
  uploadToPresignedUrl,
  finalizeUpload,
} from '@/lib/hooks/useIepUpload';

interface IepUploadCardProps {
  profileId: string;
  existingDocument?: {
    id: string;
    filename: string;
    status: IepDocumentStatus;
    processingError: string | null;
    uploadedAt: string;
  } | null;
  hasCompletedAssessment?: boolean;
  onUploadComplete?: () => void;
  onDocumentDeleted?: () => void;
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

export function IepUploadCard({
  profileId,
  existingDocument,
  hasCompletedAssessment,
  onUploadComplete,
  onDocumentDeleted,
}: IepUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const uploadIep = useUploadIep();
  const deleteIep = useDeleteIep();

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

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }

      try {
        setUploadProgress('uploading');

        // Step 1: Get presigned URL
        const { uploadUrl, s3Key } = await getPresignedUploadUrl(
          file.name,
          file.type,
          file.size
        );

        // Step 2: Upload to S3
        await uploadToPresignedUrl(uploadUrl, file);

        // Step 3: Finalize upload
        setUploadProgress('processing');
        const { file: uploadedFile } = await finalizeUpload(s3Key, file.name, file.type);

        // Step 4: Register with baseline service
        await uploadIep.mutateAsync({
          profileId,
          fileId: uploadedFile.id,
          filename: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
          s3Key,
          notes: notes || undefined,
        });

        setUploadProgress('idle');
        setNotes('');
        onUploadComplete?.();
      } catch (error) {
        setUploadProgress('idle');
        setUploadError(error instanceof Error ? error.message : 'Upload failed');
      }
    },
    [profileId, notes, uploadIep, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
      // Reset input
      e.target.value = '';
    },
    [handleUpload]
  );

  const handleDelete = async () => {
    if (!existingDocument) return;

    try {
      await deleteIep.mutateAsync({
        documentId: existingDocument.id,
        profileId,
      });
      onDocumentDeleted?.();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  // Render existing document status
  if (existingDocument) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                existingDocument.status === 'ERROR'
                  ? 'bg-red-100'
                  : existingDocument.status === 'PROCESSED' ||
                    existingDocument.status === 'COMPARISON_READY' ||
                    existingDocument.status === 'APPROVED'
                  ? 'bg-green-100'
                  : 'bg-blue-100'
              }`}
            >
              {existingDocument.status === 'PENDING' ||
              existingDocument.status === 'PROCESSING' ? (
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              ) : existingDocument.status === 'ERROR' ? (
                <AlertCircle className="h-6 w-6 text-red-600" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-600" />
              )}
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">IEP Document Uploaded</h3>
              <p className="mt-1 text-sm text-gray-600">{existingDocument.filename}</p>
              <p className="mt-1 text-xs text-gray-500">
                Uploaded {new Date(existingDocument.uploadedAt).toLocaleDateString()}
              </p>

              {existingDocument.status === 'PENDING' && (
                <p className="mt-2 text-sm text-blue-600">Waiting to process...</p>
              )}
              {existingDocument.status === 'PROCESSING' && (
                <p className="mt-2 text-sm text-blue-600">
                  Extracting IEP content... This may take a minute.
                </p>
              )}
              {existingDocument.status === 'PROCESSED' && !hasCompletedAssessment && (
                <p className="mt-2 text-sm text-amber-600">
                  Ready! Complete the baseline assessment to compare with your IEP.
                </p>
              )}
              {existingDocument.status === 'PROCESSED' && hasCompletedAssessment && (
                <p className="mt-2 text-sm text-green-600">
                  Ready to compare with assessment results!
                </p>
              )}
              {existingDocument.status === 'COMPARISON_READY' && (
                <p className="mt-2 text-sm text-green-600">
                  Comparison complete! Review the results below.
                </p>
              )}
              {existingDocument.status === 'ERROR' && (
                <p className="mt-2 text-sm text-red-600">
                  {existingDocument.processingError || 'Processing failed'}
                </p>
              )}
            </div>
          </div>

          {/* Delete button - only show if not approved */}
          {existingDocument.status !== 'APPROVED' && (
            <button
              onClick={handleDelete}
              disabled={deleteIep.isPending}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
              title="Remove document"
            >
              {deleteIep.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <X className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render upload form
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
          <FileText className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Upload Existing IEP (Optional)</h3>
          <p className="mt-1 text-sm text-gray-600">
            If your child has an existing IEP, upload it here. We'll compare it with our
            assessment to create the best learning plan.
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
        <p className="text-sm text-blue-700">
          This is optional. If you don't have an existing IEP or prefer to start fresh,
          the system will create one based on the assessment results.
        </p>
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
        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-violet-500 bg-violet-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${uploadProgress !== 'idle' ? 'pointer-events-none opacity-50' : ''}`}
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
            <Upload className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-700">
              {isDragging ? 'Drop file here' : 'Drag and drop your IEP document'}
            </p>
            <p className="mt-1 text-xs text-gray-500">or click to browse</p>
            <p className="mt-2 text-xs text-gray-400">
              PDF or image files (JPEG, PNG) up to 50MB
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600" />
            <p className="mt-2 text-sm font-medium text-violet-700">
              {uploadProgress === 'uploading' ? 'Uploading...' : 'Processing...'}
            </p>
          </>
        )}
      </div>

      {/* Notes input */}
      <div className="mt-4">
        <label htmlFor="iep-notes" className="block text-sm font-medium text-gray-700">
          Notes (optional)
        </label>
        <textarea
          id="iep-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this IEP (e.g., 'Annual review from March 2024')"
          rows={2}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Error message */}
      {uploadError && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  );
}
