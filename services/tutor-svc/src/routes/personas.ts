import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { personaService } from '../services/persona.service.js';

const ListPersonasSchema = z.object({
  subject: z.enum(['MATH', 'ELA', 'SCIENCE', 'HISTORY', 'CODING']).optional(),
});

export async function personaRoutes(fastify: FastifyInstance) {
  /**
   * GET /tutor/personas
   * List all active tutor personas
   */
  fastify.get(
    '/tutor/personas',
    async (request: FastifyRequest<{ Querystring: z.infer<typeof ListPersonasSchema> }>) => {
      const query = ListPersonasSchema.parse(request.query);
      const personas = await personaService.listAll(query.subject);

      return {
        personas: personas.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          subject: p.subject,
          description: p.description,
          avatarAssetKey: p.avatarAssetKey,
          personality: p.personalityJson,
          sortOrder: p.sortOrder,
        })),
      };
    },
  );

  /**
   * GET /tutor/personas/:slug
   * Get a specific persona by slug
   */
  fastify.get(
    '/tutor/personas/:slug',
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const { slug } = request.params;
      const persona = await personaService.getBySlug(slug);

      if (!persona) {
        return reply.status(404).send({ error: 'Persona not found' });
      }

      return {
        id: persona.id,
        slug: persona.slug,
        name: persona.name,
        subject: persona.subject,
        description: persona.description,
        avatarAssetKey: persona.avatarAssetKey,
        personality: persona.personalityJson,
        sortOrder: persona.sortOrder,
      };
    },
  );
}
