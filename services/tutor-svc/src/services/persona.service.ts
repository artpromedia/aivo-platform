import { prisma } from '../prisma.js';

export class PersonaService {
  async listAll(subject?: string) {
    return prisma.tutorPersona.findMany({
      where: {
        isActive: true,
        ...(subject ? { subject } : {}),
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

  async getVoicesBySlug(slug: string) {
    const persona = await prisma.tutorPersona.findUnique({
      where: { slug },
      include: { voiceConfigs: true },
    });

    if (!persona) {
      return null;
    }

    return persona.voiceConfigs.map((vc) => ({
      id: vc.id,
      locale: vc.locale,
      ttsProvider: vc.ttsProvider,
      ttsVoiceId: vc.ttsVoiceId,
      speakingRate: vc.speakingRate,
      pitch: vc.pitch,
      emotion: vc.emotion,
      isDefault: vc.isDefault,
    }));
  }
}

export const personaService = new PersonaService();
