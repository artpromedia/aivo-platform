// ══════════════════════════════════════════════════════════════════════════════
// AUTH DECORATORS - Custom decorators for authentication
// ══════════════════════════════════════════════════════════════════════════════

import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

/**
 * Get current user from request
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

/**
 * Get user ID from request
 */
export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id || request.user?.sub;
  },
);

/**
 * Mark route as public (no authentication required)
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Get tenant ID from request
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId || request.headers['x-tenant-id'];
  },
);
