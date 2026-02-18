import type { Role } from '@aivo/ts-rbac';

import { NotPermitted } from '../../../../../../components/not-permitted';
import { getAuthSession } from '../../../../../../lib/auth';
import {
  ALLOWED_VIEWER_ROLES,
  fetchVirtualBrainSummary,
  hasInsightsAccess,
} from '../../../../../../lib/learner-insights';

import { VirtualBrainClient } from './view-client';

export default async function VirtualBrainPage({
  params,
}: {
  params: Promise<{ classroomId: string; learnerId: string }>;
}) {
  const { classroomId, learnerId } = await params;
  const session = await getAuthSession();

  if (!session || !hasInsightsAccess(session.roles as Role[])) {
    return (
      <NotPermitted
        title="Not permitted to view this learner's Virtual Brain"
        allowedRoles={ALLOWED_VIEWER_ROLES as Role[]}
        retryHref="/login"
      />
    );
  }

  const brain = await fetchVirtualBrainSummary(learnerId, session);

  return (
    <VirtualBrainClient
      classroomId={classroomId}
      learnerId={learnerId}
      brain={brain}
    />
  );
}
