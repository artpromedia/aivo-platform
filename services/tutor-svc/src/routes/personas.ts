import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { personaService } from '../services/persona.service.js';

const ListPersonasSchema = z.object({
  subject: z.enum(['MATH', 'ELA', 'SCIENCE', 'HISTORY', 'CODING']).optional(),
});

export async function personaRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/tutor/personas
   * List all active personas (filterable by subject)
   */
  fastify.get(
    '/',
    async (request: FastifyRequest<{ Querystring: z.infer<typeof ListPersonasSchema> }>) => {
      const query = ListPersonasSchema.parse(request.query);
      const personas = await personaService.listAll(query.subject);

      return {
        personas: personas.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          subject: p.subject,
          personality: p.personality,
          teachingApproach: p.teachingApproach,
          encouragementStyle: p.encouragementStyle,
          voiceTone: p.voiceTone,
          avatarRivAsset: p.avatarRivAsset,
          avatarStaticImage: p.avatarStaticImage,
          specialties: p.specialties,
          gradeRange: p.gradeRange,
          sortOrder: p.sortOrder,
        })),
      };
    },
  );

  /**
   * GET /api/v1/tutor/personas/:slug
   * Get single persona details
   */
  fastify.get(
    '/:slug',
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
        personality: persona.personality,
        teachingApproach: persona.teachingApproach,
        encouragementStyle: persona.encouragementStyle,
        voiceTone: persona.voiceTone,
        avatarRivAsset: persona.avatarRivAsset,
        avatarStaticImage: persona.avatarStaticImage,
        systemPromptTemplate: persona.systemPromptTemplate,
        specialties: persona.specialties,
        gradeRange: persona.gradeRange,
        sortOrder: persona.sortOrder,
        metadataJson: persona.metadataJson,
      };
    },
  );

  /**
   * GET /api/v1/tutor/personas/:slug/voices
   * List available voices/locales for a persona
   */
  fastify.get(
    '/:slug/voices',
    async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
      const { slug } = request.params;
      const voices = await personaService.getVoicesBySlug(slug);

      if (!voices) {
        return reply.status(404).send({ error: 'Persona not found' });
      }

      return { voices };
    },
  );
}
