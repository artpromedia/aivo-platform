import { notFound } from 'next/navigation';

import { getIncident, getIncidentAiCalls } from '../../../../lib/api';
import { requirePlatformAdmin } from '../../../../lib/auth';
import type { AiCallLogWithLinkReason, AiIncident } from '../../../../lib/types';

import { IncidentDetailClient } from './incident-detail-client';

// Mock data for development
const MOCK_INCIDENT: AiIncident = {
  id: 'inc-1',
  tenantId: 'tenant-1',
  tenantName: 'North Valley District',
  severity: 'HIGH',
  category: 'SAFETY',
  status: 'OPEN',
  title: 'High safety score on homework help response',
  description:
    'The AI homework helper returned a response with a HIGH safety classification. The response may have contained inappropriate content or guidance.',
  firstSeenAt: '2024-06-10T14:30:00Z',
  lastSeenAt: '2024-06-11T09:15:00Z',
  occurrenceCount: 3,
  createdBySystem: true,
  createdByUserId: null,
  assignedToUserId: null,
  assignedToUserName: null,
  resolvedAt: null,
  resolvedByUserId: null,
  resolutionNotes: null,
  metadataJson: {
    triggeredBy: 'safety_high_rule',
    safetyScore: 0.85,
  },
  createdAt: '2024-06-10T14:30:00Z',
  updatedAt: '2024-06-11T09:15:00Z',
};

const MOCK_CALLS: AiCallLogWithLinkReason[] = [
  {
    id: 'call-1',
    tenantId: 'tenant-1',
    userId: 'user-123',
    learnerId: 'learner-456',
    sessionId: 'session-789',
    agentType: 'HOMEWORK_HELPER',
    useCase: 'homework_help',
    modelName: 'gpt-4o',
    provider: 'OPENAI',
    version: '1.0.0',
    requestId: 'req-abc123',
    startedAt: '2024-06-11T09:15:00Z',
    completedAt: '2024-06-11T09:15:02Z',
    latencyMs: 2100,
    inputTokens: 450,
    outputTokens: 320,
    promptSummary: 'Student asking about chemistry experiment safety procedures',
    responseSummary: 'Response included discussion of chemical handling [FLAGGED]',
    safetyLabel: 'HIGH',
    safetyMetadata: { category: 'potentially_dangerous', score: 0.85 },
    costCentsEstimate: 12,
    status: 'SUCCESS',
    errorCode: null,
    errorMessage: null,
    createdAt: '2024-06-11T09:15:02Z',
    linkReason: 'TRIGGER',
  },
  {
    id: 'call-2',
    tenantId: 'tenant-1',
    userId: 'user-123',
    learnerId: 'learner-456',
    sessionId: 'session-789',
    agentType: 'HOMEWORK_HELPER',
    useCase: 'homework_help',
    modelName: 'gpt-4o',
    provider: 'OPENAI',
    version: '1.0.0',
    requestId: 'req-def456',
    startedAt: '2024-06-10T14:30:00Z',
    completedAt: '2024-06-10T14:30:01Z',
    latencyMs: 1800,
    inputTokens: 380,
    outputTokens: 290,
    promptSummary: 'Follow-up question on chemistry topic',
    responseSummary: 'Response about lab safety',
    safetyLabel: 'HIGH',
    safetyMetadata: { category: 'potentially_dangerous', score: 0.78 },
    costCentsEstimate: 10,
    status: 'SUCCESS',
    errorCode: null,
    errorMessage: null,
    createdAt: '2024-06-10T14:30:01Z',
    linkReason: 'RELATED',
  },
  {
    id: 'call-3',
    tenantId: 'tenant-1',
    userId: 'user-123',
    learnerId: 'learner-456',
    sessionId: 'session-789',
    agentType: 'HOMEWORK_HELPER',
    useCase: 'homework_help',
    modelName: 'gpt-4o',
    provider: 'OPENAI',
    version: '1.0.0',
    requestId: 'req-ghi789',
    startedAt: '2024-06-10T14:25:00Z',
    completedAt: '2024-06-10T14:25:01Z',
    latencyMs: 950,
    inputTokens: 200,
    outputTokens: 150,
    promptSummary: 'Initial chemistry homework question',
    responseSummary: 'General chemistry explanation',
    safetyLabel: 'SAFE',
    safetyMetadata: null,
    costCentsEstimate: 5,
    status: 'SUCCESS',
    errorCode: null,
    errorMessage: null,
    createdAt: '2024-06-10T14:25:01Z',
    linkReason: 'CONTEXT',
  },
];

interface PageProps {
  params: Promise<{ incidentId: string }>;
}

export default async function IncidentDetailPage({ params }: PageProps) {
  const { incidentId } = await params;
  const auth = await requirePlatformAdmin();
  if (auth === 'forbidden') {
    return null; // Layout handles forbidden
  }

  let incident: AiIncident;
  let linkedCalls: AiCallLogWithLinkReason[];

  try {
    [incident, linkedCalls] = await Promise.all([
      getIncident(auth.accessToken, incidentId),
      getIncidentAiCalls(auth.accessToken, incidentId),
    ]);
  } catch {
    // Use mock data for known incident IDs
    if (
      incidentId === 'inc-1' ||
      incidentId === 'inc-2' ||
      incidentId === 'inc-3' ||
      incidentId === 'inc-4' ||
      incidentId === 'inc-5'
    ) {
      incident = { ...MOCK_INCIDENT, id: incidentId };
      linkedCalls = MOCK_CALLS.map((c) => ({ ...c, id: `${c.id}-${incidentId}` }));
    } else {
      notFound();
    }
  }

  return <IncidentDetailClient incident={incident} linkedCalls={linkedCalls} />;
}
