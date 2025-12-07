/* eslint-disable import/no-unresolved */

import {
  filterLearnerPayloadForCaller,
  type AuthContext as AccessAuthContext,
} from '@aivo/ts-data-access';
import { Role } from '@aivo/ts-rbac';
import { type FastifyInstance, type FastifyRequest } from 'fastify';
import { z } from 'zod';

// Demo in-memory learner record; in production this would come from a DB.
interface DemoLearner extends Record<string, unknown> {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  grade: string;
  diagnosisFlagsJson: Record<string, unknown>;
  sensoryProfileJson: Record<string, unknown>;
  preferencesJson: Record<string, unknown>;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const demoLearners: Record<string, DemoLearner> = {
  'learner-1': {
    id: 'learner-1',
    tenantId: 'tenant-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    dateOfBirth: '2012-05-01',
    grade: '5',
    diagnosisFlagsJson: { dyslexia: true },
    sensoryProfileJson: { auditory: 'low' },
    preferencesJson: { theme: 'dark' },
    notes: 'Free-text notes with sensitive details',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

type AuthedRequest = FastifyRequest & { auth?: AccessAuthContext };

export async function registerDemoRoutes(app: FastifyInstance) {
  app.get('/demo/learners/:id', async (request: AuthedRequest, reply) => {
    const params = z.object({ id: z.string() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid learner id' });

    const learner = demoLearners[params.data.id];
    if (!learner) return reply.status(404).send({ error: 'Not found' });

    const auth = request.auth;
    if (!auth) return reply.status(401).send({ error: 'Unauthorized' });

    // For demo purposes, assume parent/teacher/therapist relate to this learner; real services should populate from DB.
    const relatedLearnerIds = auth.roles.some((role: Role) =>
      [Role.PARENT, Role.TEACHER, Role.THERAPIST].includes(role)
    )
      ? [params.data.id]
      : undefined;

    const authWithRelations: AccessAuthContext = relatedLearnerIds
      ? { ...auth, relatedLearnerIds }
      : auth;

    const filtered = filterLearnerPayloadForCaller(authWithRelations, params.data.id, learner);

    return reply.send(filtered);
  });
}
