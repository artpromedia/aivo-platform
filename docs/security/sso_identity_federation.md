# SSO & Identity Federation

This document describes the Single Sign-On (SSO) and Identity Federation implementation for the Aivo platform.

## Overview

Aivo supports enterprise SSO through two industry-standard protocols:

- **SAML 2.0** - For traditional enterprise identity providers (AD FS, Shibboleth, etc.)
- **OIDC (OpenID Connect)** - For modern identity providers (Azure AD, Okta, Google Workspace, etc.)

Each tenant can configure their own Identity Provider (IdP), enabling seamless authentication for their users while maintaining security and compliance requirements.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │     │   Auth Service  │     │    IdP          │
│  (web-district) │     │   (auth-svc)    │     │  (SAML/OIDC)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. SSO Request       │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  2. Redirect to IdP   │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  3. IdP Login         │                       │
         │───────────────────────────────────────────────>
         │                       │                       │
         │  4. IdP Response      │                       │
         │<───────────────────────────────────────────────
         │                       │                       │
         │  5. Process Response  │                       │
         │──────────────────────>│                       │
         │                       │  6. Validate Token    │
         │                       │───────────────────────>
         │                       │                       │
         │  7. JWT Token         │                       │
         │<──────────────────────│                       │
         │                       │                       │
```

## Configuration

### Database Schema

SSO configuration is stored in three main tables:

#### `IdpConfig`

Stores the Identity Provider configuration for each tenant:

```prisma
model IdpConfig {
  id                    String        @id @default(cuid())
  tenantId              String
  protocol              IdpProtocol   // SAML or OIDC
  name                  String
  issuer                String
  enabled               Boolean       @default(true)
  
  // SAML-specific
  ssoUrl                String?
  sloUrl                String?
  x509Certificate       String?
  metadataXml           String?
  
  // OIDC-specific
  clientId              String?
  clientSecret          String?       // Encrypted at rest
  jwksUri               String?
  authorizationEndpoint String?
  tokenEndpoint         String?
  userInfoEndpoint      String?
  
  // Claim mappings
  emailClaim            String        @default("email")
  nameClaim             String?
  firstNameClaim        String?
  lastNameClaim         String?
  roleClaim             String?
  externalIdClaim       String?
  
  // Provisioning
  autoProvisionUsers    Boolean       @default(true)
  defaultRole           String        @default("TEACHER")
  allowedUserTypes      String[]
}
```

#### `IdpRoleMapping`

Maps IdP roles/groups to Aivo roles:

```prisma
model IdpRoleMapping {
  id        String    @id @default(cuid())
  idpId     String
  idpRole   String    // Role from IdP (e.g., "Teachers")
  aivoRole  String    // Aivo role (e.g., "TEACHER")
}
```

#### `SsoAuditLog`

Audit trail for SSO events:

```prisma
model SsoAuditLog {
  id          String    @id @default(cuid())
  tenantId    String
  idpConfigId String?
  action      String    // SSO_LOGIN, SSO_LOGOUT, CONFIG_CHANGE
  userId      String?
  success     Boolean
  errorCode   String?
  errorMessage String?
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime  @default(now())
}
```

### Environment Variables

```env
# SSO State Encryption (HMAC-SHA256)
SSO_STATE_SECRET=your-32-character-secret-key

# SAML Service Provider
SAML_SP_ENTITY_ID=https://aivo.education/sp
SAML_SP_ACS_BASE_URL=https://auth.aivo.education/auth/saml/acs

# OIDC Redirect URI Base
OIDC_REDIRECT_URI_BASE=https://auth.aivo.education/auth/oidc/callback
```

## API Endpoints

### Initiate SSO

```
GET /auth/sso/:tenantSlug
```

Query parameters:
- `email` (optional) - Login hint for the IdP
- `redirect` (optional) - Post-login redirect URL

Response: Redirect to IdP

### SAML Assertion Consumer Service (ACS)

```
POST /auth/saml/acs/:tenantSlug
```

Form data:
- `SAMLResponse` - Base64-encoded SAML response
- `RelayState` - SSO state token

Response: Redirect to app with JWT token

### OIDC Callback

```
GET /auth/oidc/callback/:tenantSlug
```

Query parameters:
- `code` - Authorization code
- `state` - SSO state token

Response: Redirect to app with JWT token

### Mobile SSO

```
GET /auth/sso/mobile/:tenantSlug
```

Query parameters:
- `email` (optional) - Login hint

Returns JSON with redirect URL for deep linking.

### Admin Endpoints

```
GET /auth/admin/sso/config/:tenantId
PUT /auth/admin/sso/config/:tenantId
POST /auth/admin/sso/test/:tenantId
GET /auth/admin/sso/metadata/:tenantId
GET /auth/admin/sso/role-mappings/:idpId
PUT /auth/admin/sso/role-mappings/:idpId
```

## SAML Implementation

### AuthnRequest Generation

The service generates SAML 2.0 AuthnRequest with:

- Unique request ID (`_[random-hex]`)
- Issue instant (ISO 8601)
- Assertion Consumer Service URL
- Service Provider entity ID
- NameID policy (email format)

### Response Validation

SAML responses are validated for:

1. **Signature verification** - XML signature using IdP's X.509 certificate
2. **Issuer validation** - Must match configured IdP entity ID
3. **Audience restriction** - Must include SP entity ID
4. **Conditions** - NotBefore and NotOnOrAfter timestamps
5. **Subject confirmation** - InResponseTo matches request ID

### User Info Extraction

User attributes are extracted from SAML assertions using configured claim mappings:

```typescript
{
  email: assertion.Attribute['email'],
  name: assertion.Attribute['displayName'],
  firstName: assertion.Attribute['givenName'],
  lastName: assertion.Attribute['sn'],
  roles: assertion.Attribute['memberOf'],
  externalId: assertion.NameID
}
```

## OIDC Implementation

### Authorization URL Generation

OIDC flow starts with an authorization URL containing:

- `client_id` - Registered client ID
- `redirect_uri` - Callback URL
- `response_type=code` - Authorization code flow
- `scope=openid email profile` - Requested scopes
- `state` - Encrypted state token
- `code_challenge` - PKCE challenge (SHA256)
- `code_challenge_method=S256`
- `login_hint` (optional) - Pre-filled email

### Token Exchange

Authorization code is exchanged for tokens:

```typescript
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
code=<authorization_code>
redirect_uri=<callback_url>
client_id=<client_id>
client_secret=<client_secret>
code_verifier=<pkce_verifier>
```

### ID Token Validation

ID tokens are validated for:

1. **Signature verification** - Using JWKS endpoint
2. **Issuer (`iss`)** - Must match configured issuer
3. **Audience (`aud`)** - Must include client ID
4. **Expiration (`exp`)** - Must be in the future
5. **Issued at (`iat`)** - Must be in the past
6. **Nonce** - Must match state nonce (if present)

## State Management

SSO state is used to prevent CSRF attacks and maintain session context across redirects.

### State Token Structure

```typescript
interface SsoStatePayload {
  tenantId: string;
  idpId: string;
  redirectUrl?: string;
  codeVerifier?: string;  // PKCE
  requestId?: string;     // SAML
  timestamp: number;
  nonce: string;
}
```

### Encryption

State is encrypted using HMAC-SHA256:

```
state = base64url(payload) + "." + hmac-sha256(payload, secret)
```

### Expiration

State tokens expire after 5 minutes to limit replay attacks.

## Role Mapping

### Configuration

Each IdP can have multiple role mappings:

| IdP Role | Aivo Role |
|----------|-----------|
| Teachers | TEACHER |
| Principals | SCHOOL_ADMIN |
| District_Admins | DISTRICT_ADMIN |
| Support_Staff | TEACHER |

### Resolution Order

1. Check IdP role mappings for matches
2. Apply first matching Aivo role
3. If no match, use default role
4. Validate against allowed user types

## User Provisioning

### Just-In-Time (JIT) Provisioning

When `autoProvisionUsers` is enabled:

1. User authenticates with IdP
2. System checks for existing user by email or external ID
3. If not found, creates new user with:
   - Email from IdP
   - Name from IdP
   - External ID (IdP subject)
   - Mapped role
   - Tenant association
4. If found, updates external ID linkage

### Disabled Provisioning

When `autoProvisionUsers` is disabled:

1. User must pre-exist in Aivo
2. User is matched by email
3. External ID is linked for future logins
4. Login fails if user not found

## Security Considerations

### Certificate Management

- Store X.509 certificates securely
- Rotate certificates when IdP rotates keys
- Validate certificate expiration

### Secret Encryption

- OIDC client secrets encrypted at rest
- Use environment variables for encryption keys
- Never log secrets

### Rate Limiting

- Limit SSO initiation requests
- Limit callback processing
- Block after repeated failures

### Audit Logging

All SSO events are logged:

- Successful logins
- Failed logins (with error codes)
- Configuration changes
- Certificate rotations

## Mobile Implementation

### Deep Link Flow

Mobile apps use browser-based authentication:

1. App opens system browser with SSO URL
2. User authenticates with IdP
3. Browser redirects to deep link: `aivo://sso/callback?token=...`
4. App intercepts deep link
5. App extracts and stores JWT

### Platform Specifics

**iOS**: Uses `ASWebAuthenticationSession`
**Android**: Uses Chrome Custom Tabs with `CustomTabsIntent`

### Security

- Uses ephemeral browser session
- No cookies persisted
- Tokens stored in secure keychain/keystore

## Tenant Admin UI

District administrators can configure SSO through the web-district app:

### Settings Page

`/settings/sso`

Features:
- Protocol selection (SAML/OIDC)
- IdP configuration
- Metadata XML upload (SAML)
- Role mapping management
- Test connection
- Enable/disable toggle

### Configuration Workflow

1. Select protocol (SAML or OIDC)
2. Enter IdP details:
   - SAML: Entity ID, SSO URL, Certificate
   - OIDC: Issuer, Client ID, Client Secret
3. Configure claim mappings
4. Set up role mappings
5. Test connection
6. Enable SSO

## Testing

### Unit Tests

Tests cover:
- State generation and validation
- SAML AuthnRequest generation
- SAML response parsing
- OIDC authorization URL generation
- OIDC token exchange
- ID token validation
- Role mapping
- User provisioning

### Integration Testing

For integration testing, use:
- [samltest.id](https://samltest.id) - Free SAML testing IdP
- Local Keycloak instance
- Azure AD test tenant

## Troubleshooting

### Common Issues

**"Invalid issuer" error**
- Verify IdP entity ID matches configuration
- Check for trailing slashes

**"Signature verification failed"**
- Certificate may have rotated
- Download fresh certificate from IdP
- Check certificate format (PEM vs DER)

**"State validation failed"**
- State may have expired (>5 minutes)
- User may have opened multiple SSO tabs
- Check clock synchronization

**"User not found"**
- Enable auto-provisioning
- Check email claim mapping
- Verify user exists in system

### Debug Mode

Enable debug logging:

```env
SSO_DEBUG=true
```

This logs:
- Full SAML requests/responses (redacted)
- OIDC token contents (redacted)
- State encryption/decryption
- Role mapping decisions

## Future Enhancements

- [ ] SCIM 2.0 for user provisioning
- [ ] Multi-IdP support per tenant
- [ ] IdP-initiated SSO
- [ ] Single Logout (SLO) support
- [ ] MFA policy enforcement
- [ ] Session management API
