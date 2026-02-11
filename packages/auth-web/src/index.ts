/**
 * @aivo/auth-web — Public API
 *
 * Server-side entry point. For client components use '@aivo/auth-web/client'.
 * For middleware use '@aivo/auth-web/middleware'.
 */

export {
  getServerSession,
  requireSession,
  verifyToken,
  setAuthCookies,
  clearAuthCookies,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  type AuthSession,
} from './session';
