/**
 * Family Dashboard Routes
 *
 * REST API endpoints for the family dashboard,
 * allowing caregivers to view and manage their linked learners.
 * NOTE: These routes are registered under /api/v1/family prefix in app.ts
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';

import { caregiverAuthHook } from './guards/caregiver-auth.guard.js';

export async function familyRoutes(app: FastifyInstance) {
  const familyService = app.services.family;

  // All routes require caregiver auth
  app.addHook('preHandler', caregiverAuthHook);

  /**
   * Get family dashboard overview
   * GET /api/v1/family/dashboard
   */
  app.get('/dashboard', async (request: FastifyRequest) => {
    return familyService.getFamilyDashboard(request.caregiver!.id);
  });

  /**
   * Switch active learner context
   * POST /api/v1/family/active-learner
   */
  app.post('/active-learner', async (request: FastifyRequest) => {
    const body = request.body as { learnerId: string };
    return familyService.setActiveLearner(request.caregiver!.id, body.learnerId);
  });

  /**
   * Get learner details
   * GET /api/v1/family/learners/:learnerId
   */
  app.get('/learners/:learnerId', async (request: FastifyRequest) => {
    const { learnerId } = request.params as { learnerId: string };
    return familyService.getLearnerDetails(request.caregiver!.id, learnerId);
  });
}
