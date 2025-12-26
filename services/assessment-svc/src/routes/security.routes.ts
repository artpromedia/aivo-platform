/**
 * Security Routes
 * 
 * API endpoints for assessment security:
 * - Security token validation
 * - Violation reporting
 * - Session management
 * - Accommodations
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

import { securityService } from '../services/security.service.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ValidateTokenSchema = z.object({
  token: z.string(),
  fingerprint: z.string(),
});

const ReportViolationSchema = z.object({
  type: z.enum([
    'TAB_SWITCH',
    'WINDOW_BLUR',
    'COPY_PASTE',
    'RIGHT_CLICK',
    'KEYBOARD_SHORTCUT',
    'SCREEN_CAPTURE',
    'BROWSER_RESIZE',
    'MULTIPLE_MONITORS',
    'OTHER',
  ]),
  details: z.record(z.any()).optional(),
  clientInfo: z.object({
    userAgent: z.string().optional(),
    screenSize: z.string().optional(),
    windowSize: z.string().optional(),
    focusLost: z.boolean().optional(),
  }).optional(),
});

const AddAccommodationSchema = z.object({
  type: z.enum([
    'TIME_EXTENSION',
    'EXTRA_BREAKS',
    'SCREEN_READER',
    'LARGE_TEXT',
    'HIGH_CONTRAST',
    'REDUCED_DISTRACTIONS',
    'OTHER',
  ]),
  value: z.union([z.number(), z.string(), z.boolean()]),
  reason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function handleError(error: unknown, res: Response): void {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: error.errors });
    return;
  }

  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
  }

  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
}

function getContext(req: Request): { tenantId: string; userId: string } {
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = req.headers['x-user-id'] as string;

  if (!tenantId || !userId) {
    throw new Error('Missing tenant or user context');
  }

  return { tenantId, userId };
}

// ============================================================================
// TOKEN ROUTES
// ============================================================================

/**
 * @openapi
 * /api/security/attempts/{attemptId}/token:
 *   post:
 *     summary: Generate security token for attempt
 *     tags: [Security]
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fingerprint
 *             properties:
 *               fingerprint:
 *                 type: string
 *     responses:
 *       200:
 *         description: Security token
 */
router.post('/security/attempts/:attemptId/token', async (req: Request, res: Response) => {
  try {
    const { fingerprint } = req.body;
    const token = securityService.generateSecurityToken(req.params.attemptId, fingerprint);
    
    // Store token
    await securityService.storeSecurityToken(req.params.attemptId, token.token);
    
    res.json({
      token: token.token,
      expiresAt: token.expiresAt,
    });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/security/attempts/{attemptId}/token/validate:
 *   post:
 *     summary: Validate security token
 *     tags: [Security]
 */
router.post(
  '/security/attempts/:attemptId/token/validate',
  validateBody(ValidateTokenSchema),
  async (req: Request, res: Response) => {
    try {
      const { token, fingerprint } = req.body;
      const result = await securityService.validateSecurityToken(
        token,
        req.params.attemptId,
        fingerprint
      );
      res.json(result);
    } catch (error) {
      handleError(error, res);
    }
  }
);

// ============================================================================
// VIOLATION ROUTES
// ============================================================================

/**
 * @openapi
 * /api/security/attempts/{attemptId}/violations:
 *   post:
 *     summary: Report a security violation
 *     tags: [Security]
 */
router.post(
  '/security/attempts/:attemptId/violations',
  validateBody(ReportViolationSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await securityService.recordViolation(req.params.attemptId, {
        type: req.body.type,
        timestamp: new Date(),
        details: req.body.details,
        clientInfo: req.body.clientInfo,
      });
      res.json(result);
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * @openapi
 * /api/security/attempts/{attemptId}/violations:
 *   get:
 *     summary: Get violation history for attempt
 *     tags: [Security]
 */
router.get('/security/attempts/:attemptId/violations', async (req: Request, res: Response) => {
  try {
    const violations = await securityService.getViolationHistory(req.params.attemptId);
    res.json({ violations });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================================================
// SESSION ROUTES
// ============================================================================

/**
 * @openapi
 * /api/security/attempts/{attemptId}/sessions:
 *   post:
 *     summary: Start a new session
 *     tags: [Security]
 */
router.post('/security/attempts/:attemptId/sessions', async (req: Request, res: Response) => {
  try {
    const ipAddress = req.ip ?? req.headers['x-forwarded-for'] as string ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    const session = await securityService.startSession(
      req.params.attemptId,
      ipAddress,
      userAgent
    );
    res.json(session);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/security/sessions/{sessionId}/end:
 *   post:
 *     summary: End a session
 *     tags: [Security]
 */
router.post('/security/sessions/:sessionId/end', async (req: Request, res: Response) => {
  try {
    await securityService.endSession(req.params.sessionId);
    res.json({ success: true });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/security/attempts/{attemptId}/sessions:
 *   get:
 *     summary: Get active sessions for attempt
 *     tags: [Security]
 */
router.get('/security/attempts/:attemptId/sessions', async (req: Request, res: Response) => {
  try {
    const sessions = await securityService.getActiveSessions(req.params.attemptId);
    res.json({ sessions });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================================================
// ACCOMMODATION ROUTES
// ============================================================================

/**
 * @openapi
 * /api/security/attempts/{attemptId}/accommodations:
 *   post:
 *     summary: Add accommodation for attempt
 *     tags: [Security]
 */
router.post(
  '/security/attempts/:attemptId/accommodations',
  validateBody(AddAccommodationSchema),
  async (req: Request, res: Response) => {
    try {
      const { userId } = getContext(req);
      await securityService.addAccommodation(req.params.attemptId, {
        ...req.body,
        approvedBy: userId,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      });
      res.json({ success: true });
    } catch (error) {
      handleError(error, res);
    }
  }
);

/**
 * @openapi
 * /api/security/attempts/{attemptId}/accommodations:
 *   get:
 *     summary: Get accommodations for attempt
 *     tags: [Security]
 */
router.get('/security/attempts/:attemptId/accommodations', async (req: Request, res: Response) => {
  try {
    const accommodations = await securityService.getAccommodations(req.params.attemptId);
    res.json({ accommodations });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================================================
// VALIDATION ROUTES
// ============================================================================

/**
 * @openapi
 * /api/security/attempts/{attemptId}/validate:
 *   get:
 *     summary: Validate if attempt can continue
 *     tags: [Security]
 */
router.get('/security/attempts/:attemptId/validate', async (req: Request, res: Response) => {
  try {
    const result = await securityService.validateAttemptContinuation(req.params.attemptId);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/security/attempts/{attemptId}/heartbeat:
 *   post:
 *     summary: Heartbeat to keep session alive
 *     tags: [Security]
 */
router.post('/security/attempts/:attemptId/heartbeat', async (req: Request, res: Response) => {
  try {
    const result = await securityService.validateAttemptContinuation(req.params.attemptId);
    res.json({
      canContinue: result.canContinue,
      reason: result.reason,
      timestamp: new Date(),
    });
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/security/config:
 *   get:
 *     summary: Get client security configuration
 *     tags: [Security]
 */
router.get('/security/config', async (req: Request, res: Response) => {
  try {
    // In real app, fetch from assessment settings
    const config = securityService.getClientSecurityConfig({
      preventCopyPaste: true,
      detectTabSwitch: true,
    });
    res.json(config);
  } catch (error) {
    handleError(error, res);
  }
});

/**
 * @openapi
 * /api/security/detect-lockdown:
 *   post:
 *     summary: Detect if using lockdown browser
 *     tags: [Security]
 */
router.post('/security/detect-lockdown', async (req: Request, res: Response) => {
  try {
    const userAgent = req.headers['user-agent'] ?? '';
    const result = securityService.detectLockdownBrowser(userAgent);
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
});

export default router;
