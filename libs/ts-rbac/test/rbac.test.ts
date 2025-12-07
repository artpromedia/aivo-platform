import { describe, expect, it, vi } from 'vitest';
import { hasRole, requireRole, Role } from '../src/index.js';

const makeFastifyReply = () => {
  const reply = {
    statusCode: undefined as number | undefined,
    payload: undefined as unknown,
    code: vi.fn(function (this: any, status: number) {
      this.statusCode = status;
      return this;
    }),
    send: vi.fn(function (this: any, payload: unknown) {
      this.payload = payload;
      return this;
    }),
  } as any;
  return reply;
};

const makeExpressResponse = () => {
  const res = {
    statusCode: undefined as number | undefined,
    payload: undefined as unknown,
    status: vi.fn(function (this: any, status: number) {
      this.statusCode = status;
      return this;
    }),
    send: vi.fn(function (this: any, payload: unknown) {
      this.payload = payload;
      return this;
    }),
  } as any;
  return res;
};

describe('hasRole', () => {
  it('returns true when role exists', () => {
    expect(hasRole([Role.PLATFORM_ADMIN], Role.PLATFORM_ADMIN)).toBe(true);
  });

  it('returns false when role missing', () => {
    expect(hasRole([Role.PARENT], Role.PLATFORM_ADMIN)).toBe(false);
  });

  it('returns true when any required role matches', () => {
    expect(hasRole([Role.TEACHER], [Role.PARENT, Role.TEACHER])).toBe(true);
  });
});

describe('requireRole middleware', () => {
  it('allows request when role present (fastify style)', async () => {
    const req: any = { auth: { roles: [Role.PLATFORM_ADMIN] } };
    const reply = makeFastifyReply();
    const next = vi.fn();

    await requireRole([Role.PLATFORM_ADMIN])(req, reply, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(reply.statusCode).toBeUndefined();
  });

  it('returns 403 when role missing (fastify style)', async () => {
    const req: any = { auth: { roles: [Role.PARENT] } };
    const reply = makeFastifyReply();

    await requireRole([Role.PLATFORM_ADMIN])(req, reply);

    expect(reply.statusCode).toBe(403);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Forbidden' });
  });

  it('returns 403 when role missing (express style)', async () => {
    const req: any = { auth: { roles: [Role.PARENT] } };
    const res = makeExpressResponse();
    const next = vi.fn();

    await requireRole([Role.PLATFORM_ADMIN])(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.send).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });
});
