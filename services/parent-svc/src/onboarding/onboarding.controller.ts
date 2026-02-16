/**
 * Onboarding Routes
 *
 * REST API endpoints for family/learner onboarding with district detection.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import type { LocationInput, RegisterLearnerInput } from './onboarding.types.js';

export async function onboardingRoutes(app: FastifyInstance) {
  const onboardingService = app.services.onboarding;

  /**
   * Look up district and curriculum from ZIP code
   */
  app.post('/lookup-location', async (request: FastifyRequest) => {
    const location = request.body as LocationInput;
    return onboardingService.lookupLocation(location);
  });

  /**
   * Get districts for a state (for manual selection)
   */
  app.get('/districts/state/:stateCode', async (request: FastifyRequest) => {
    const { stateCode } = request.params as { stateCode: string };
    const { search, limit, offset } = request.query as {
      search?: string;
      limit?: string;
      offset?: string;
    };
    return onboardingService.getDistrictsByState(stateCode, {
      search,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  });

  /**
   * Get current onboarding status
   */
  app.get('/status', async (request: FastifyRequest) => {
    return onboardingService.getOnboardingStatus(request.parent!.id);
  });

  /**
   * Register a new learner with location
   */
  app.post('/register-learner', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = request.body as RegisterLearnerInput;
    reply.status(201);
    return onboardingService.registerLearner(request.parent!.id, input);
  });

  /**
   * Update learner location (changes curriculum alignment)
   */
  app.put('/learners/:learnerId/location', async (request: FastifyRequest) => {
    const { learnerId } = request.params as { learnerId: string };
    const location = request.body as LocationInput;
    return onboardingService.updateLearnerLocation(request.parent!.id, learnerId, location);
  });
}
