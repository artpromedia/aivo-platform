import type { Role } from '@aivo/ts-rbac';

import { NotPermitted } from '../../../../../../components/not-permitted';
import { getAuthSession } from '../../../../../../lib/auth';
import { gradeToBand } from '../../../../../../lib/grade-band';
import {
  ALLOWED_VIEWER_ROLES,
  fetchVirtualBrainSummary,
  hasInsightsAccess,
} from '../../../../../../lib/learner-insights';

import { VirtualBrainClient } from './view-client';

export default async function VirtualBrainPage({
  params,
}: {
  params: { classroomId: string; learnerId: string };
}) {
  const session = await getAuthSession();

  if (!session || !hasInsightsAccess(session.roles)) {
    return (
      <NotPermitted
        title="Not permitted to view this learner's Virtual Brain"
        allowedRoles={ALLOWED_VIEWER_ROLES as Role[]}
        retryHref="/login"
      />
    );
  }

  const brain = await fetchVirtualBrainSummary(params.learnerId, session);

  return (
    <VirtualBrainClient
      classroomId={params.classroomId}
      learnerId={params.learnerId}
      brain={brain}
      gradeBand={brain.gradeBand ?? gradeToBand(null)}
    />
  );
}
