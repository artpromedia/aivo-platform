/**
 * Authentication Middleware for Express/Fastify
 * @module @aivo/ts-shared/auth/middleware
 */
/**
 * Error response helper for Express
 */
function sendErrorExpress(res, status, error, message, code) {
    res.status(status).json({
        error,
        message,
        ...(code && { code }),
    });
}
/**
 * Error response helper for Fastify
 */
function sendErrorFastify(reply, status, error, message, code) {
    reply.status(status).send({
        error,
        message,
        ...(code && { code }),
    });
}
/**
 * Create Express authentication middleware
 */
export function createAuthMiddleware(config) {
    const { jwtService, redis, skipPaths = [], requireTenant = true } = config;
    return async function authMiddleware(req, res, next) {
        // Skip authentication for certain paths
        if (skipPaths.some((path) => req.path.startsWith(path))) {
            return next();
        }
        try {
            // Extract token from header
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                sendErrorExpress(res, 401, 'Unauthorized', 'Missing or invalid authorization header');
                return;
            }
            const token = authHeader.substring(7);
            // Verify token
            const payload = await jwtService.verifyAccessToken(token);
            // Check if token is blacklisted (logout)
            if (redis && payload.sessionId) {
                const isBlacklisted = await redis.get(`blacklist:token:${payload.sessionId}`);
                if (isBlacklisted) {
                    sendErrorExpress(res, 401, 'Unauthorized', 'Token has been revoked', 'TOKEN_REVOKED');
                    return;
                }
            }
            // Verify tenant if required
            if (requireTenant && !payload.tenantId) {
                sendErrorExpress(res, 403, 'Forbidden', 'Tenant context required');
                return;
            }
            // Attach user info to request
            req.user = payload;
            req.token = token;
            // Set headers for downstream services
            req.headers['x-tenant-id'] = payload.tenantId;
            req.headers['x-user-id'] = payload.sub;
            req.headers['x-session-id'] = payload.sessionId;
            next();
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('expired') || error.name === 'JWTExpired') {
                    sendErrorExpress(res, 401, 'Unauthorized', 'Token has expired', 'TOKEN_EXPIRED');
                    return;
                }
                if (error.message.includes('invalid') || error.name === 'JWTInvalid') {
                    sendErrorExpress(res, 401, 'Unauthorized', 'Invalid token', 'INVALID_TOKEN');
                    return;
                }
            }
            sendErrorExpress(res, 500, 'Internal Server Error', 'Authentication failed');
        }
    };
}
/**
 * Create Fastify authentication hook
 */
export function createFastifyAuthHook(config) {
    const { jwtService, redis, skipPaths = [], requireTenant = true } = config;
    return async function authHook(request, reply) {
        // Skip authentication for certain paths
        if (skipPaths.some((path) => request.url.startsWith(path))) {
            return;
        }
        try {
            // Extract token from header
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                sendErrorFastify(reply, 401, 'Unauthorized', 'Missing or invalid authorization header');
                return;
            }
            const token = authHeader.substring(7);
            // Verify token
            const payload = await jwtService.verifyAccessToken(token);
            // Check if token is blacklisted
            if (redis && payload.sessionId) {
                const isBlacklisted = await redis.get(`blacklist:token:${payload.sessionId}`);
                if (isBlacklisted) {
                    sendErrorFastify(reply, 401, 'Unauthorized', 'Token has been revoked', 'TOKEN_REVOKED');
                    return;
                }
            }
            // Verify tenant if required
            if (requireTenant && !payload.tenantId) {
                sendErrorFastify(reply, 403, 'Forbidden', 'Tenant context required');
                return;
            }
            // Attach user info to request
            request.user = payload;
            request.token = token;
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('expired') || error.name === 'JWTExpired') {
                    sendErrorFastify(reply, 401, 'Unauthorized', 'Token has expired', 'TOKEN_EXPIRED');
                    return;
                }
                if (error.message.includes('invalid') || error.name === 'JWTInvalid') {
                    sendErrorFastify(reply, 401, 'Unauthorized', 'Invalid token', 'INVALID_TOKEN');
                    return;
                }
            }
            sendErrorFastify(reply, 500, 'Internal Server Error', 'Authentication failed');
        }
    };
}
/**
 * Permission checking middleware for Express
 */
export function requirePermission(...permissions) {
    return function permissionMiddleware(req, res, next) {
        const authReq = req;
        if (!authReq.user) {
            sendErrorExpress(res, 401, 'Unauthorized', 'Authentication required');
            return;
        }
        const userPermissions = authReq.user.permissions || [];
        // Check for wildcard permission
        if (userPermissions.includes('*')) {
            return next();
        }
        // Check if user has any of the required permissions
        const hasPermission = permissions.some((perm) => {
            // Direct match
            if (userPermissions.includes(perm))
                return true;
            // Wildcard match (e.g., 'content:*' matches 'content:read')
            const [resource] = perm.split(':');
            if (userPermissions.includes(`${resource}:*`))
                return true;
            return false;
        });
        if (!hasPermission) {
            sendErrorExpress(res, 403, 'Forbidden', `Missing required permission: ${permissions.join(' or ')}`);
            return;
        }
        next();
    };
}
/**
 * Role checking middleware for Express
 */
export function requireRole(...roles) {
    return function roleMiddleware(req, res, next) {
        const authReq = req;
        if (!authReq.user) {
            sendErrorExpress(res, 401, 'Unauthorized', 'Authentication required');
            return;
        }
        const userRoles = authReq.user.roles || [];
        const hasRole = roles.some((role) => userRoles.includes(role));
        if (!hasRole) {
            sendErrorExpress(res, 403, 'Forbidden', `Required role: ${roles.join(' or ')}`);
            return;
        }
        next();
    };
}
/**
 * Tenant isolation middleware for Express
 */
export function requireTenantMatch(tenantIdParam = 'tenantId') {
    return function tenantMiddleware(req, res, next) {
        const authReq = req;
        const requestedTenantId = req.params[tenantIdParam] || req.body?.tenantId;
        if (!authReq.user) {
            sendErrorExpress(res, 401, 'Unauthorized', 'Authentication required');
            return;
        }
        // Super admins can access any tenant
        if (authReq.user.roles?.includes('PLATFORM_ADMIN')) {
            return next();
        }
        if (requestedTenantId && requestedTenantId !== authReq.user.tenantId) {
            sendErrorExpress(res, 403, 'Forbidden', 'Cannot access resources from another tenant');
            return;
        }
        next();
    };
}
/**
 * Service-to-service authentication middleware for Express
 */
export function createServiceAuthMiddleware(jwtService, serviceName) {
    return async function serviceAuthMiddleware(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                sendErrorExpress(res, 401, 'Unauthorized', 'Missing service token');
                return;
            }
            const token = authHeader.substring(7);
            const payload = await jwtService.verifyServiceToken(token, serviceName);
            // Attach service context
            req.service = {
                name: payload.service,
                target: payload.target,
            };
            // Set service headers
            req.headers['x-service-name'] = payload.service;
            next();
        }
        catch (error) {
            sendErrorExpress(res, 401, 'Unauthorized', 'Invalid service token');
        }
    };
}
//# sourceMappingURL=middleware.js.map