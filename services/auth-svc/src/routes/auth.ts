import { Role } from '@aivo/ts-rbac';
import bcrypt from 'bcryptjs';
import { type FastifyInstance } from 'fastify';
import { z } from 'zod';

import { config } from '../config.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt.js';
import { prisma } from '../prisma.js';

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshBody = z.object({
  refreshToken: z.string(),
});

function userResponse(user: { id: string; email: string; tenantId: string }, roles: Role[]) {
  return {
    id: user.id,
    email: user.email,
    tenantId: user.tenantId,
    roles,
  };
}

export async function registerAuthRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const parsed = registerBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload' });
    }
    const { email, password, phone } = parsed.data;
    const tenantId = config.consumerTenantId;

    const existing = await prisma.user.findFirst({ where: { tenantId, email } });
    if (existing) {
      return reply.status(409).send({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        phone: phone ?? null,
        passwordHash,
        tenantId,
        status: 'ACTIVE',
        roles: {
          create: [{ role: Role.PARENT }],
        },
      },
      include: { roles: true },
    });

    const roles = user.roles.map((r) => r.role as Role);
    const accessToken = await signAccessToken({ sub: user.id, tenant_id: user.tenantId, roles });
    const refreshToken = await signRefreshToken({ sub: user.id, tenant_id: user.tenantId, roles });

    return reply.status(201).send({
      user: userResponse(user, roles),
      accessToken,
      refreshToken,
    });
  });

  fastify.post('/login', async (request, reply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload' });
    }
    const { email, password } = parsed.data;
    const tenantId = config.consumerTenantId;

    const user = await prisma.user.findFirst({
      where: { tenantId, email },
      include: { roles: true },
    });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    if (user.status === 'DISABLED') {
      return reply.status(403).send({ error: 'Account disabled' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const roles = user.roles.map((r: { role: string }) => r.role as Role);
    const accessToken = await signAccessToken({ sub: user.id, tenant_id: user.tenantId, roles });
    const refreshToken = await signRefreshToken({ sub: user.id, tenant_id: user.tenantId, roles });

    return reply.status(200).send({
      user: userResponse(user, roles),
      accessToken,
      refreshToken,
    });
  });

  fastify.post('/refresh', async (request, reply) => {
    const parsed = refreshBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload' });
    }

    try {
      const payload = await verifyToken(parsed.data.refreshToken);
      const accessToken = await signAccessToken({
        sub: payload.sub,
        tenant_id: payload.tenant_id,
        roles: payload.roles,
      });
      const refreshToken = await signRefreshToken({
        sub: payload.sub,
        tenant_id: payload.tenant_id,
        roles: payload.roles,
      });
      return reply.status(200).send({ accessToken, refreshToken });
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  fastify.post('/logout', async (_request, reply) => {
    return reply.status(204).send();
  });
}
