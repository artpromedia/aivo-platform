export interface JwtUser {
  sub: string;
  tenantId?: string | undefined;
  tenant_id?: string | undefined;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtUser | undefined;
  }
}

export interface TutorPersonaResponse {
  id: string;
  slug: string;
  name: string;
  subject: string;
  description: string;
  avatarAssetKey: string;
  personality: Record<string, unknown>;
  sortOrder: number;
}

export interface TutorSessionResponse {
  id: string;
  learnerId: string;
  personaId: string;
  status: string;
  subject: string;
  topic: string | null;
  startedAt: string;
  endedAt: string | null;
  persona: TutorPersonaResponse;
}

export interface TutorMessageResponse {
  id: string;
  role: string;
  content: string;
  emotion: string;
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
  sessionId: string;
}

export interface CreateSessionRequest {
  personaId: string;
  subject: string;
  topic?: string;
}
