import { prisma, TutorSubject } from '../prisma.js';

export class PersonaService {
  async listAll(subject?: string) {
    return prisma.tutorPersona.findMany({
      where: {
        isActive: true,
        ...(subject ? { subject: subject as TutorSubject } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getBySlug(slug: string) {
    return prisma.tutorPersona.findUnique({
      where: { slug },
    });
  }

  async getById(id: string) {
    return prisma.tutorPersona.findUnique({
      where: { id },
    });
  }
}

export const personaService = new PersonaService();
