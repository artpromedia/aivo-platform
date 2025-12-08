import type { Role } from '@aivo/ts-rbac';

import { NotPermitted } from '../../../../../../components/not-permitted';
import { getAuthSession } from '../../../../../../lib/auth';
import { gradeToBand } from '../../../../../../lib/grade-band';
import {
  ALLOWED_VIEWER_ROLES,
  fetchBaselineProfile,
  hasInsightsAccess,
} from '../../../../../../lib/learner-insights';

import { BaselineInsightsClient } from './view-client';

export default async function BaselinePage({
  params,
}: {
  params: { classroomId: string; learnerId: string };
}) {
  const session = await getAuthSession();

  if (!session || !hasInsightsAccess(session.roles)) {
    return (
      <NotPermitted
        title="Not permitted to view this learner"
        allowedRoles={ALLOWED_VIEWER_ROLES as Role[]}
        retryHref="/login"
      />
    );
  }

  const baseline = await fetchBaselineProfile(params.learnerId, session);

  return (
    <BaselineInsightsClient
      classroomId={params.classroomId}
      learnerId={params.learnerId}
      baseline={baseline}
      gradeBand={baseline.gradeBand ?? gradeToBand(baseline.grade)}
    />
  );
}
