import { importSPKI, jwtVerify } from 'jose';
import { isRole } from './roles';
function normalizeRoles(input) {
    if (!Array.isArray(input))
        return [];
    return input.filter((r) => isRole(r));
}
function toAuthContext(payload) {
    if (typeof payload.sub !== 'string' || typeof payload.tenant_id !== 'string') {
        throw new Error('Invalid token payload');
    }
    const roles = normalizeRoles(payload.roles);
    return {
        userId: payload.sub,
        tenantId: payload.tenant_id,
        roles,
    };
}
function sendUnauthorized(target, next) {
    if (target &&
        typeof target.status === 'function' &&
        typeof target.send === 'function') {
        target.status(401).send({ error: 'Unauthorized' });
        return;
    }
    if (target &&
        typeof target.code === 'function' &&
        typeof target.send === 'function') {
        target.code(401).send({ error: 'Unauthorized' });
        return;
    }
    if (next)
        next(Object.assign(new Error('Unauthorized'), { statusCode: 401 }));
}
function sendForbidden(target, next) {
    if (target &&
        typeof target.status === 'function' &&
        typeof target.send === 'function') {
        target.status(403).send({ error: 'Forbidden' });
        return;
    }
    if (target &&
        typeof target.code === 'function' &&
        typeof target.send === 'function') {
        target.code(403).send({ error: 'Forbidden' });
        return;
    }
    if (next)
        next(Object.assign(new Error('Forbidden'), { statusCode: 403 }));
}
export function hasRole(userRoles, required) {
    if (!userRoles || userRoles.length === 0)
        return false;
    const requiredList = Array.isArray(required) ? required : [required];
    return requiredList.some((role) => userRoles.includes(role));
}
export function authMiddleware(options) {
    const { publicKey, audience, issuer } = options;
    let keyPromise = null;
    const getKey = () => {
        if (!keyPromise) {
            keyPromise = importSPKI(publicKey, 'RS256');
        }
        return keyPromise;
    };
    return async function middleware(req, resOrReply, next) {
        const header = req.headers?.authorization || req?.headers?.Authorization;
        if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
            sendUnauthorized(resOrReply, next);
            return;
        }
        const token = header.slice('Bearer '.length);
        try {
            const verifyOptions = {};
            if (audience !== undefined)
                verifyOptions.audience = audience;
            if (issuer !== undefined)
                verifyOptions.issuer = issuer;
            const { payload } = await jwtVerify(token, await getKey(), verifyOptions);
            const auth = toAuthContext(payload);
            req.auth = auth;
            req.user = auth;
            if (next) {
                next();
                return;
            }
            return;
        }
        catch (err) {
            sendUnauthorized(resOrReply, next);
            return;
        }
    };
}
export function requireRole(requiredRoles) {
    return async function middleware(req, resOrReply, next) {
        const roles = req.auth?.roles || req.user?.roles;
        if (!hasRole(roles, requiredRoles)) {
            sendForbidden(resOrReply, next);
            return;
        }
        if (next) {
            next();
            return;
        }
    };
}
//# sourceMappingURL=auth.js.map