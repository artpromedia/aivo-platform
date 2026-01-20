/**
 * IEP Upload Hooks
 *
 * React Query hooks for IEP document upload and comparison functionality.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  IepDocumentsResponse,
  IepStatusResponse,
  IepComparisonResult,
  IepUploadResponse,
  IepDecisionResponse,
  IepComparisonDecision,
} from '../types/iep-upload';

const BASELINE_SVC_URL = process.env.NEXT_PUBLIC_BASELINE_SVC_URL || '/api/baseline';

// ── Helper Functions ────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// ── Query Keys ──────────────────────────────────────────────────────────────

export const iepUploadKeys = {
  all: ['iep-upload'] as const,
  documents: (profileId: string) => [...iepUploadKeys.all, 'documents', profileId] as const,
  status: (profileId: string) => [...iepUploadKeys.all, 'status', profileId] as const,
  comparison: (comparisonId: string) => [...iepUploadKeys.all, 'comparison', comparisonId] as const,
};

// ── Queries ─────────────────────────────────────────────────────────────────

/**
 * Get IEP documents for a baseline profile.
 */
export function useIepDocuments(profileId: string | null | undefined) {
  return useQuery({
    queryKey: iepUploadKeys.documents(profileId ?? ''),
    queryFn: async (): Promise<IepDocumentsResponse> => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${BASELINE_SVC_URL}/baseline/profiles/${profileId}/iep`,
        { headers }
      );
      return handleResponse<IepDocumentsResponse>(response);
    },
    enabled: !!profileId,
    staleTime: 30000, // 30 seconds
    refetchInterval: (data) => {
      // Poll more frequently if document is processing
      const doc = data?.state.data?.documents[0];
      if (doc && ['PENDING', 'PROCESSING'].includes(doc.status)) {
        return 5000; // 5 seconds
      }
      return false;
    },
  });
}

/**
 * Get IEP upload status summary for a baseline profile.
 */
export function useIepStatus(profileId: string | null | undefined) {
  return useQuery({
    queryKey: iepUploadKeys.status(profileId ?? ''),
    queryFn: async (): Promise<IepStatusResponse> => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${BASELINE_SVC_URL}/baseline/profiles/${profileId}/iep/status`,
        { headers }
      );
      return handleResponse<IepStatusResponse>(response);
    },
    enabled: !!profileId,
    staleTime: 30000,
    refetchInterval: (data) => {
      // Poll more frequently during processing
      const status = data?.state.data?.overallStatus;
      if (status && ['IEP_UPLOADING', 'IEP_PROCESSING'].includes(status)) {
        return 5000;
      }
      return false;
    },
  });
}

/**
 * Get detailed comparison results.
 */
export function useIepComparison(comparisonId: string | null | undefined) {
  return useQuery({
    queryKey: iepUploadKeys.comparison(comparisonId ?? ''),
    queryFn: async (): Promise<IepComparisonResult> => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${BASELINE_SVC_URL}/baseline/comparisons/${comparisonId}`,
        { headers }
      );
      return handleResponse<IepComparisonResult>(response);
    },
    enabled: !!comparisonId,
    staleTime: 60000, // 1 minute
  });
}

// ── Mutations ───────────────────────────────────────────────────────────────

interface UploadIepParams {
  profileId: string;
  fileId: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  s3Key: string;
  notes?: string;
}

/**
 * Upload an IEP document.
 */
export function useUploadIep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UploadIepParams): Promise<IepUploadResponse> => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${BASELINE_SVC_URL}/baseline/profiles/${params.profileId}/iep`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fileId: params.fileId,
            filename: params.filename,
            mimeType: params.mimeType,
            fileSizeBytes: params.fileSizeBytes,
            s3Key: params.s3Key,
            notes: params.notes,
          }),
        }
      );
      return handleResponse<IepUploadResponse>(response);
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: iepUploadKeys.documents(variables.profileId),
      });
      queryClient.invalidateQueries({
        queryKey: iepUploadKeys.status(variables.profileId),
      });
    },
  });
}

interface DeleteIepParams {
  documentId: string;
  profileId: string;
}

/**
 * Delete an IEP document.
 */
export function useDeleteIep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DeleteIepParams): Promise<void> => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${BASELINE_SVC_URL}/baseline/iep-documents/${params.documentId}`,
        {
          method: 'DELETE',
          headers,
        }
      );
      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: iepUploadKeys.documents(variables.profileId),
      });
      queryClient.invalidateQueries({
        queryKey: iepUploadKeys.status(variables.profileId),
      });
    },
  });
}

interface TriggerComparisonParams {
  profileId: string;
}

/**
 * Trigger IEP comparison with assessment results.
 */
export function useTriggerComparison() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: TriggerComparisonParams): Promise<IepComparisonResult> => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${BASELINE_SVC_URL}/baseline/profiles/${params.profileId}/iep/compare`,
        {
          method: 'POST',
          headers,
        }
      );
      return handleResponse<IepComparisonResult>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: iepUploadKeys.documents(variables.profileId),
      });
      queryClient.invalidateQueries({
        queryKey: iepUploadKeys.status(variables.profileId),
      });
    },
  });
}

interface SubmitDecisionParams {
  comparisonId: string;
  decision: Exclude<IepComparisonDecision, 'PENDING'>;
  notes?: string;
  profileId: string; // For cache invalidation
}

/**
 * Submit decision on IEP comparison.
 */
export function useSubmitDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SubmitDecisionParams): Promise<IepDecisionResponse> => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${BASELINE_SVC_URL}/baseline/comparisons/${params.comparisonId}/decision`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            decision: params.decision,
            notes: params.notes,
          }),
        }
      );
      return handleResponse<IepDecisionResponse>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: iepUploadKeys.comparison(variables.comparisonId),
      });
      queryClient.invalidateQueries({
        queryKey: iepUploadKeys.documents(variables.profileId),
      });
      queryClient.invalidateQueries({
        queryKey: iepUploadKeys.status(variables.profileId),
      });
    },
  });
}

// ── File Upload Helper ──────────────────────────────────────────────────────

interface PresignedUploadResult {
  uploadUrl: string;
  s3Key: string;
  expiresAt: string;
}

interface FinalizeUploadResult {
  file: {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    category: string;
    virusScanStatus: string;
    createdAt: string;
  };
}

const CONTENT_SVC_URL = process.env.NEXT_PUBLIC_CONTENT_SVC_URL || '/api/content';

/**
 * Get presigned URL for uploading a file.
 */
export async function getPresignedUploadUrl(
  filename: string,
  mimeType: string,
  contentLength: number
): Promise<PresignedUploadResult> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${CONTENT_SVC_URL}/files/presigned-upload`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filename,
      mimeType,
      category: 'IEP_DOCUMENT',
      contentLength,
    }),
  });
  return handleResponse<PresignedUploadResult>(response);
}

/**
 * Upload file to presigned URL.
 */
export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
}

/**
 * Finalize upload after uploading to S3.
 */
export async function finalizeUpload(
  s3Key: string,
  filename: string,
  mimeType: string
): Promise<FinalizeUploadResult> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${CONTENT_SVC_URL}/files/finalize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      s3Key,
      filename,
      mimeType,
      category: 'IEP_DOCUMENT',
    }),
  });
  return handleResponse<FinalizeUploadResult>(response);
}
