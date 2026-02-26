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
