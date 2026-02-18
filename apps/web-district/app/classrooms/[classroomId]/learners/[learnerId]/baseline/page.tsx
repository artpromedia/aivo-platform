import type { Role } from '@aivo/ts-rbac';

import { NotPermitted } from '../../../../../../components/not-permitted';
import { getAuthSession } from '../../../../../../lib/auth';
import {
  ALLOWED_VIEWER_ROLES,
  fetchBaselineProfile,
  hasInsightsAccess,
} from '../../../../../../lib/learner-insights';

import { BaselineInsightsClient } from './view-client';

export default async function BaselinePage({
  params,
}: {
  params: Promise<{ classroomId: string; learnerId: string }>;
}) {
  const { classroomId, learnerId } = await params;
  const session = await getAuthSession();

  if (!session || !hasInsightsAccess(session.roles as Role[])) {
    return (
      <NotPermitted
        title="Not permitted to view this learner"
        allowedRoles={ALLOWED_VIEWER_ROLES as Role[]}
        retryHref="/login"
      />
    );
  }

  const baseline = await fetchBaselineProfile(learnerId, session);

  return (
    <BaselineInsightsClient
      classroomId={classroomId}
      learnerId={learnerId}
      baseline={baseline}
      {...(baseline.grade !== undefined ? { grade: baseline.grade } : {})}
    />
  );
}
