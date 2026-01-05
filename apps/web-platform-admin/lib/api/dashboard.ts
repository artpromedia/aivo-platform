/**
 * Dashboard API Functions
 *
 * Server-side data fetching for admin dashboard components.
 */

const API_BASE_URL = process.env.API_GATEWAY_URL ?? 'http://localhost:3000';

interface FetchOptions {
  cache?: RequestCache;
  revalidate?: number;
}

/**
 * Platform metrics data
 */
export interface PlatformMetrics {
  activeTenants: { value: number; change: number };
  totalLearners: { value: number; change: number };
  activeSessions: { value: number; change: number };
  apiRequests: { value: number; change: number };
}

/**
 * Service health status
 */
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  uptime: string;
  lastCheck: string;
}

/**
 * Integration status
 */
export interface IntegrationStatus {
  id: string;
  name: string;
  type: 'edfi' | 'scim' | 'lms' | 'sis';
  status: 'active' | 'syncing' | 'error' | 'inactive';
  lastSync?: string;
  tenantsUsing: number;
  errorCount?: number;
}

/**
 * Activity event
 */
export interface ActivityEvent {
  id: string;
  type: 'tenant' | 'user' | 'integration' | 'billing' | 'security' | 'system';
  title: string;
  description: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, unknown>;
}

/**
 * Fetch platform metrics
 */
export async function fetchPlatformMetrics(options: FetchOptions = {}): Promise<PlatformMetrics> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/v1/metrics/platform`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: options.cache ?? 'no-store',
      next: options.revalidate ? { revalidate: options.revalidate } : undefined,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.status}`);
    }

    return (await response.json()) as PlatformMetrics;
  } catch (error) {
    console.error('Error fetching platform metrics:', error);
    // Return default values on error
    return {
      activeTenants: { value: 0, change: 0 },
      totalLearners: { value: 0, change: 0 },
      activeSessions: { value: 0, change: 0 },
      apiRequests: { value: 0, change: 0 },
    };
  }
}

/**
 * Fetch service health status
 */
export async function fetchServiceHealth(options: FetchOptions = {}): Promise<ServiceHealth[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/v1/health/services`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: options.cache ?? 'no-store',
      next: options.revalidate ? { revalidate: options.revalidate } : undefined,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch service health: ${response.status}`);
    }

    return (await response.json()) as ServiceHealth[];
  } catch (error) {
    console.error('Error fetching service health:', error);
    return [];
  }
}

/**
 * Fetch integration status
 */
export async function fetchIntegrationStatus(
  options: FetchOptions = {}
): Promise<IntegrationStatus[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/v1/integrations/status`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: options.cache ?? 'no-store',
      next: options.revalidate ? { revalidate: options.revalidate } : undefined,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch integration status: ${response.status}`);
    }

    return (await response.json()) as IntegrationStatus[];
  } catch (error) {
    console.error('Error fetching integration status:', error);
    return [];
  }
}

/**
 * Fetch recent activity
 */
export async function fetchRecentActivity(
  limit = 20,
  options: FetchOptions = {}
): Promise<ActivityEvent[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/v1/activity?limit=${limit}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: options.cache ?? 'no-store',
      next: options.revalidate ? { revalidate: options.revalidate } : undefined,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activity: ${response.status}`);
    }

    return (await response.json()) as ActivityEvent[];
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}
