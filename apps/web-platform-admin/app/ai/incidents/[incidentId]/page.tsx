import { notFound } from 'next/navigation';

import { getIncident, getIncidentAiCalls } from '../../../../lib/api';
import { requirePlatformAdmin } from '../../../../lib/auth';

import { IncidentDetailClient } from './incident-detail-client';

interface PageProps {
  params: Promise<{ incidentId: string }>;
}

export default async function IncidentDetailPage({ params }: PageProps) {
  const { incidentId } = await params;
  const auth = await requirePlatformAdmin();
  if (auth === 'forbidden') {
    return null; // Layout handles forbidden
  }

  try {
    const [incident, linkedCalls] = await Promise.all([
      getIncident(auth.accessToken, incidentId),
      getIncidentAiCalls(auth.accessToken, incidentId),
    ]);

    return <IncidentDetailClient incident={incident} linkedCalls={linkedCalls} />;
  } catch {
    notFound();
  }
}
