/**
 * Professional Development Hook
 *
 * React hook for fetching and managing PD data
 */

'use client';

import * as React from 'react';
import {
  pdProgramsApi,
  pdEnrollmentsApi,
  pdRequirementsApi,
  pdCertificatesApi,
  type PDProgram,
  type PDEnrollment,
  type PDRequirement,
  type PDCertificate,
  type PDProgress,
  type PDComplianceStatus,
} from '@/lib/api/professional-development';

interface UsePDProgramsReturn {
  programs: PDProgram[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePDPrograms(category?: string): UsePDProgramsReturn {
  const [programs, setPrograms] = React.useState<PDProgram[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchPrograms = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await pdProgramsApi.list({ category });
      setPrograms(result.programs);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch programs'));
    } finally {
      setLoading(false);
    }
  }, [category]);

  React.useEffect(() => {
    void fetchPrograms();
  }, [fetchPrograms]);

  return { programs, loading, error, refetch: fetchPrograms };
}

interface UsePDEnrollmentsReturn {
  enrollments: PDEnrollment[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  enroll: (programId: string) => Promise<void>;
  completeModule: (enrollmentId: string, moduleId: string) => Promise<void>;
}

export function usePDEnrollments(): UsePDEnrollmentsReturn {
  const [enrollments, setEnrollments] = React.useState<PDEnrollment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchEnrollments = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await pdEnrollmentsApi.list();
      setEnrollments(result.enrollments);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch enrollments'));
    } finally {
      setLoading(false);
    }
  }, []);

  const enroll = React.useCallback(async (programId: string) => {
    const result = await pdEnrollmentsApi.enroll(programId);
    setEnrollments((prev) => [...prev, result.enrollment]);
  }, []);

  const completeModule = React.useCallback(
    async (enrollmentId: string, moduleId: string) => {
      const result = await pdEnrollmentsApi.completeModule(enrollmentId, moduleId);
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? result.enrollment : e))
      );
    },
    []
  );

  React.useEffect(() => {
    void fetchEnrollments();
  }, [fetchEnrollments]);

  return {
    enrollments,
    loading,
    error,
    refetch: fetchEnrollments,
    enroll,
    completeModule,
  };
}

interface UsePDProgressReturn {
  progress: PDProgress | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePDProgress(): UsePDProgressReturn {
  const [progress, setProgress] = React.useState<PDProgress | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchProgress = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await pdEnrollmentsApi.getProgress();
      setProgress(result.progress);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch progress'));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchProgress();
  }, [fetchProgress]);

  return { progress, loading, error, refetch: fetchProgress };
}

interface UsePDComplianceReturn {
  compliance: PDComplianceStatus | null;
  requirements: PDRequirement[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePDCompliance(): UsePDComplianceReturn {
  const [compliance, setCompliance] = React.useState<PDComplianceStatus | null>(null);
  const [requirements, setRequirements] = React.useState<PDRequirement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchCompliance = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [complianceResult, requirementsResult] = await Promise.all([
        pdRequirementsApi.getCompliance(),
        pdRequirementsApi.list(),
      ]);
      setCompliance(complianceResult.compliance);
      setRequirements(requirementsResult.requirements);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch compliance'));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchCompliance();
  }, [fetchCompliance]);

  return { compliance, requirements, loading, error, refetch: fetchCompliance };
}

interface UsePDCertificatesReturn {
  certificates: PDCertificate[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  downloadCertificate: (id: string) => Promise<void>;
}

export function usePDCertificates(): UsePDCertificatesReturn {
  const [certificates, setCertificates] = React.useState<PDCertificate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchCertificates = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await pdCertificatesApi.list();
      setCertificates(result.certificates);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch certificates'));
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadCertificate = React.useCallback(async (id: string) => {
    const blob = await pdCertificatesApi.download(id);
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    globalThis.URL.revokeObjectURL(url);
  }, []);

  React.useEffect(() => {
    void fetchCertificates();
  }, [fetchCertificates]);

  return {
    certificates,
    loading,
    error,
    refetch: fetchCertificates,
    downloadCertificate,
  };
}
