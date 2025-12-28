// ══════════════════════════════════════════════════════════════════════════════
// USE EXPORT HOOK
// React hook for managing export operations with progress tracking
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { ExportFormat } from '../components/export/ExportFormatSelector';
import { ExportOptions } from '../components/export/ExportOptionsPanel';

export type ExportStatus = 
  | 'idle' 
  | 'preparing' 
  | 'exporting' 
  | 'uploading' 
  | 'completed' 
  | 'error';

export interface ExportJob {
  id: string;
  status: ExportStatus;
  progress: number;
  format: ExportFormat;
  contentId: string;
  downloadUrl?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  fileSize?: number;
  fileName?: string;
}

export interface ExportRequest {
  contentId: string;
  format: ExportFormat;
  options: ExportOptions;
}

interface UseExportOptions {
  baseUrl?: string;
  pollingInterval?: number;
  onProgress?: (job: ExportJob) => void;
  onComplete?: (job: ExportJob) => void;
  onError?: (error: Error, job?: ExportJob) => void;
}

interface UseExportReturn {
  jobs: ExportJob[];
  activeJob: ExportJob | null;
  startExport: (request: ExportRequest) => Promise<string>;
  cancelExport: (jobId: string) => Promise<void>;
  downloadExport: (jobId: string) => void;
  clearJobs: () => void;
  isExporting: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_IMPORT_EXPORT_API || '/api/import-export';

export function useExport(options: UseExportOptions = {}): UseExportReturn {
  const {
    baseUrl = API_BASE,
    pollingInterval = 1000,
    onProgress,
    onComplete,
    onError,
  } = options;

  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const pollingRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingRef.current).forEach(clearInterval);
    };
  }, []);

  const activeJob = jobs.find(
    (j) => j.status === 'preparing' || j.status === 'exporting' || j.status === 'uploading'
  ) || null;

  const isExporting = activeJob !== null;

  // Fetch job status
  const fetchJobStatus = useCallback(async (jobId: string): Promise<ExportJob | null> => {
    try {
      const response = await fetch(`${baseUrl}/export/jobs/${jobId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch job status: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        id: data.id,
        status: mapBackendStatus(data.status),
        progress: data.progress || 0,
        format: data.format,
        contentId: data.contentId,
        downloadUrl: data.downloadUrl,
        error: data.errorMessage,
        startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
        fileSize: data.fileSize,
        fileName: data.fileName,
      };
    } catch (error) {
      console.error('Failed to fetch job status:', error);
      return null;
    }
  }, [baseUrl]);

  // Poll job status
  const startPolling = useCallback((jobId: string) => {
    if (pollingRef.current[jobId]) return;

    pollingRef.current[jobId] = setInterval(async () => {
      const job = await fetchJobStatus(jobId);
      
      if (!job) return;

      setJobs((prev) => prev.map((j) => (j.id === jobId ? job : j)));
      onProgress?.(job);

      if (job.status === 'completed') {
        clearInterval(pollingRef.current[jobId]);
        delete pollingRef.current[jobId];
        onComplete?.(job);
      } else if (job.status === 'error') {
        clearInterval(pollingRef.current[jobId]);
        delete pollingRef.current[jobId];
        onError?.(new Error(job.error || 'Export failed'), job);
      }
    }, pollingInterval);
  }, [fetchJobStatus, pollingInterval, onProgress, onComplete, onError]);

  // Start export
  const startExport = useCallback(async (request: ExportRequest): Promise<string> => {
    const newJob: ExportJob = {
      id: `temp-${Date.now()}`,
      status: 'preparing',
      progress: 0,
      format: request.format,
      contentId: request.contentId,
      startedAt: new Date(),
    };

    setJobs((prev) => [...prev, newJob]);

    try {
      const response = await fetch(`${baseUrl}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contentId: request.contentId,
          format: request.format,
          options: request.options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed: ${response.statusText}`);
      }

      const data = await response.json();
      const jobId = data.jobId;

      // Update with real job ID
      setJobs((prev) =>
        prev.map((j) =>
          j.id === newJob.id
            ? { ...j, id: jobId, status: 'exporting' }
            : j
        )
      );

      startPolling(jobId);
      return jobId;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Export failed');
      
      setJobs((prev) =>
        prev.map((j) =>
          j.id === newJob.id
            ? { ...j, status: 'error', error: err.message }
            : j
        )
      );

      onError?.(err);
      throw err;
    }
  }, [baseUrl, startPolling, onError]);

  // Cancel export
  const cancelExport = useCallback(async (jobId: string): Promise<void> => {
    // Stop polling
    if (pollingRef.current[jobId]) {
      clearInterval(pollingRef.current[jobId]);
      delete pollingRef.current[jobId];
    }

    try {
      await fetch(`${baseUrl}/export/jobs/${jobId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });

      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, status: 'error', error: 'Cancelled by user' } : j
        )
      );
    } catch (error) {
      console.error('Failed to cancel export:', error);
    }
  }, [baseUrl]);

  // Download export
  const downloadExport = useCallback((jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job?.downloadUrl) return;

    // Create a link and trigger download
    const link = document.createElement('a');
    link.href = job.downloadUrl;
    link.download = job.fileName || `export-${job.format}-${jobId}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [jobs]);

  // Clear completed/errored jobs
  const clearJobs = useCallback(() => {
    setJobs((prev) =>
      prev.filter(
        (j) => j.status === 'preparing' || j.status === 'exporting' || j.status === 'uploading'
      )
    );
  }, []);

  return {
    jobs,
    activeJob,
    startExport,
    cancelExport,
    downloadExport,
    clearJobs,
    isExporting,
  };
}

// Map backend status to frontend status
function mapBackendStatus(status: string): ExportStatus {
  switch (status) {
    case 'PENDING':
      return 'preparing';
    case 'PROCESSING':
      return 'exporting';
    case 'UPLOADING':
      return 'uploading';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
    case 'CANCELLED':
      return 'error';
    default:
      return 'idle';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT HISTORY HOOK
// Fetch and manage export history
// ══════════════════════════════════════════════════════════════════════════════

export interface ExportHistoryItem {
  id: string;
  format: ExportFormat;
  contentId: string;
  contentTitle: string;
  status: ExportStatus;
  createdAt: Date;
  completedAt?: Date;
  fileSize?: number;
  downloadUrl?: string;
  expiresAt?: Date;
}

interface UseExportHistoryOptions {
  baseUrl?: string;
  pageSize?: number;
}

interface UseExportHistoryReturn {
  history: ExportHistoryItem[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useExportHistory(
  options: UseExportHistoryOptions = {}
): UseExportHistoryReturn {
  const { baseUrl = API_BASE, pageSize = 20 } = options;

  const [history, setHistory] = useState<ExportHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = useCallback(async (pageNum: number, append: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${baseUrl}/export/history?page=${pageNum}&limit=${pageSize}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch export history');
      }

      const data = await response.json();
      
      const items: ExportHistoryItem[] = data.items.map((item: any) => ({
        id: item.id,
        format: item.format,
        contentId: item.contentId,
        contentTitle: item.contentTitle || 'Untitled',
        status: mapBackendStatus(item.status),
        createdAt: new Date(item.createdAt),
        completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
        fileSize: item.fileSize,
        downloadUrl: item.downloadUrl,
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
      }));

      setHistory((prev) => (append ? [...prev, ...items] : items));
      setHasMore(items.length === pageSize);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, pageSize]);

  // Initial load
  useEffect(() => {
    fetchHistory(0);
  }, [fetchHistory]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchHistory(nextPage, true);
  }, [isLoading, hasMore, page, fetchHistory]);

  const refresh = useCallback(async () => {
    setPage(0);
    await fetchHistory(0, false);
  }, [fetchHistory]);

  return {
    history,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
