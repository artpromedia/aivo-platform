# Cross-Domain Authentication Setup

This document describes how authentication is shared between the marketing site and the main AIVO app.

## Domain Architecture

### Development Environment

| Application  | URL                   | Port |
| ------------ | --------------------- | ---- |
| Marketing    | http://localhost:3001 | 3001 |
| Main App     | http://localhost:3000 | 3000 |
| Auth Service | http://localhost:4001 | 4001 |
| Billing API  | http://localhost:4060 | 4060 |

### Production Environment

| Application  | URL                          |
| ------------ | ---------------------------- |
| Marketing    | https://www.aivolearning.com |
| Main App     | https://app.aivolearning.com |
| Auth Service | https://api.aivolearning.com |

## Authentication Flow

### Development (Proxy Mode)

In development, the marketing site uses Next.js rewrites to proxy API requests to the main app:

```
Marketing (3001) → Next.js Rewrite → Main App (3000) → Auth Service (4001)
```

This avoids CORS issues since the browser sees all requests as same-origin.

**Configuration:** `apps/web-marketing/next.config.js`

```javascript
async rewrites() {
  return [
    {
      source: '/api/auth/:path*',
      destination: 'http://localhost:3000/api/auth/:path*',
    },
    // ... other rewrites
  ];
}
```

### Production (CORS Mode)

In production, the marketing site makes direct cross-origin requests to the main app:

```
Marketing (www.aivolearning.com) → CORS → Main App (app.aivolearning.com)
```

This requires:

1. CORS headers on the main app
2. Shared cookie domain (`.aivolearning.com`)

## Cookie Configuration

### Cookie Settings

```typescript
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  domain:
    process.env.NODE_ENV === 'production'
      ? '.aivolearning.com' // Shared parent domain
      : undefined, // Localhost (no domain needed)
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};
```

### Cookie Names

| Cookie               | Purpose                  | HttpOnly |
| -------------------- | ------------------------ | -------- |
| `aivo_access_token`  | JWT access token         | Yes      |
| `aivo_refresh_token` | JWT refresh token        | Yes      |
| `aivo_session`       | Session ID (alternative) | Yes      |

## CORS Configuration

### Main App Headers

The main app needs to allow requests from the marketing site:

```javascript
// apps/web-app/next.config.js
async headers() {
  const marketingUrl = process.env.MARKETING_URL || 'http://localhost:3001';

  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: marketingUrl },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
      ],
    },
  ];
}
```

## Environment Variables

### Marketing Site (`.env.local`)

```env
# Main app URL (for redirects and direct requests)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Marketing site URL (for callbacks)
NEXT_PUBLIC_MARKETING_URL=http://localhost:3001
```

### Main App (`.env.local`)

```env
# Marketing site URL (for CORS)
MARKETING_URL=http://localhost:3001

# Cookie domain (production only)
COOKIE_DOMAIN=.aivolearning.com
```

## API Client Behavior

The marketing site's API client automatically switches between modes:

```typescript
// Development: Uses proxy (same-origin requests)
const USE_PROXY = process.env.NODE_ENV === 'development';

function getApiUrl(endpoint: string): string {
  if (USE_PROXY) {
    return endpoint; // e.g., '/api/auth/me'
  }
  return `${APP_URL}${endpoint}`; // e.g., 'https://app.aivolearning.com/api/auth/me'
}
```

## Testing Authentication

### Check if auth is working:

1. Start the main app on port 3000
2. Start the marketing site on port 3001
3. Open http://localhost:3001
4. Open browser DevTools → Network tab
5. Click any CTA button
6. Verify the API request goes through the proxy

### Debug auth state:

```javascript
// In browser console on marketing site
fetch('/api/auth/me', { credentials: 'include' })
  .then((r) => r.json())
  .then(console.log);
```

## Production Deployment Checklist

- [ ] Configure DNS for `www.aivolearning.com` → Marketing CDN
- [ ] Configure DNS for `app.aivolearning.com` → Main App
- [ ] Set `MARKETING_URL` env var on main app
- [ ] Set `COOKIE_DOMAIN=.aivolearning.com` on auth service
- [ ] Enable HTTPS on both domains
- [ ] Test cookie sharing across domains
- [ ] Test CORS preflight requests
- [ ] Verify `sameSite: 'none'` works with `secure: true`

## Troubleshooting

### Cookies not being sent

1. Check `credentials: 'include'` is set on fetch requests
2. Verify `Access-Control-Allow-Credentials: true` header
3. Ensure cookies have `SameSite=None; Secure` in production
4. Check cookie domain matches both sites

### CORS errors

1. Verify `Access-Control-Allow-Origin` matches marketing URL exactly
2. Check preflight (OPTIONS) requests are handled
3. Ensure no trailing slash in origin URL

### Auth state not syncing

1. Check browser cookies for both domains
2. Verify JWT token is valid
3. Check API response for errors
4. Ensure both sites use same cookie names
