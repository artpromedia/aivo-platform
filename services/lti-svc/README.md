# LTI Service

Learning Tools Interoperability (LTI) 1.3 integration service for Aivo. Enables Aivo to appear as an external tool in Learning Management Systems (LMS) like Canvas, Schoology, Google Classroom, and Moodle.

## Overview

The LTI service implements the [LTI 1.3 / LTI Advantage](https://www.imsglobal.org/spec/lti/v1p3/) specification, allowing:

- **LTI Launch**: Teachers and students can launch Aivo activities directly from their LMS
- **Deep Linking**: Teachers can select specific Aivo content when creating assignments
- **Grade Passback**: Activity completion and scores sync back to the LMS gradebook via Assignment and Grade Services (AGS)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      LMS        │     │    LTI Service  │     │   Aivo Core     │
│  (Canvas, etc)  │     │                 │     │   Services      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ 1. User clicks  │────▶│ 2. OIDC Login   │     │                 │
│    "Launch"     │     │    Redirect     │     │                 │
│                 │◀────│                 │     │                 │
│ 3. Auth redirect│     │                 │     │                 │
│    with state   │────▶│ 4. Validate JWT │     │                 │
│                 │     │    ID Token     │     │                 │
│                 │     │                 │────▶│ 5. Create/Get   │
│                 │     │                 │◀────│    Session      │
│                 │◀────│ 6. Redirect to  │     │                 │
│                 │     │    Activity     │     │                 │
│                 │     │                 │     │                 │
│ Grade Sync      │◀────│ 7. AGS Grade    │◀────│ Activity        │
│                 │     │    Passback     │     │ Completion      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Data Models

### LtiTool

Represents a registered LMS platform (e.g., a school's Canvas instance).

| Field          | Type    | Description                                                                 |
| -------------- | ------- | --------------------------------------------------------------------------- |
| id             | UUID    | Primary key                                                                 |
| platform_type  | Enum    | CANVAS, SCHOOLOGY, GOOGLE_CLASSROOM, MOODLE, BRIGHTSPACE, BLACKBOARD, OTHER |
| name           | String  | Display name (e.g., "Springfield School District Canvas")                   |
| issuer         | String  | Platform issuer URL                                                         |
| client_id      | String  | OAuth2 client ID                                                            |
| deployment_id  | String  | LTI deployment identifier                                                   |
| auth_login_url | String  | OIDC login initiation URL                                                   |
| auth_token_url | String  | OAuth2 token endpoint                                                       |
| jwks_url       | String  | Platform's public key endpoint                                              |
| private_key    | String  | Tool's RSA private key for signing                                          |
| is_active      | Boolean | Enable/disable the integration                                              |
| tenant_id      | String  | Aivo tenant (district/school)                                               |

### LtiLink

Links an LMS resource to an Aivo activity.

| Field            | Type    | Description                        |
| ---------------- | ------- | ---------------------------------- |
| id               | UUID    | Primary key                        |
| tool_id          | UUID    | Reference to LtiTool               |
| resource_link_id | String  | LMS-provided resource identifier   |
| activity_id      | String  | Aivo activity UUID                 |
| activity_type    | Enum    | LESSON, ASSESSMENT, PRACTICE, etc. |
| title            | String  | Display title                      |
| grading_enabled  | Boolean | Send grades to LMS                 |
| max_points       | Float   | Maximum points for grading         |

### LtiLaunch

Records each LTI launch for auditing and grade sync.

| Field           | Type   | Description                             |
| --------------- | ------ | --------------------------------------- |
| id              | UUID   | Primary key                             |
| tool_id         | UUID   | Reference to LtiTool                    |
| link_id         | UUID   | Reference to LtiLink (optional)         |
| lti_user_id     | String | User ID from LMS                        |
| user_role       | Enum   | INSTRUCTOR, LEARNER, ADMIN, etc.        |
| aivo_session_id | String | Resulting Aivo session                  |
| lineitem_url    | String | AGS line item for grade sync            |
| grade_status    | Enum   | PENDING, SYNCED, FAILED, NOT_APPLICABLE |

## API Endpoints

### OIDC Flow

#### `POST /lti/login`

Initiates OIDC login flow from LMS.

**Request (form-encoded):**

```
iss=https://canvas.instructure.com
login_hint=user123
target_link_uri=https://aivo.app/lti/launch
lti_message_hint=abc123
client_id=10000000000001
lti_deployment_id=deployment-1
```

**Response:** 302 redirect to LMS auth endpoint

#### `POST /lti/launch`

Handles the LTI launch callback with JWT ID token.

**Request (form-encoded):**

```
state=<state-token>
id_token=<jwt-id-token>
```

**Response:** 302 redirect to Aivo session

### Session Management

#### `GET /lti/session/:id`

Retrieves launch session data.

**Response:**

```json
{
  "launch": {
    "id": "launch-uuid",
    "user_role": "LEARNER",
    "context_label": "MATH101",
    "message_type": "LtiResourceLinkRequest"
  },
  "link": {
    "activity_id": "activity-uuid",
    "activity_type": "LESSON",
    "title": "Fractions Introduction"
  },
  "aivo_session_id": "session-uuid"
}
```

### Grade Passback

#### `POST /lti/grade`

Submits a grade to the LMS.

**Request:**

```json
{
  "launch_id": "launch-uuid",
  "score": 85,
  "max_score": 100,
  "completed": true,
  "comment": "Great work!"
}
```

**Response:**

```json
{
  "success": true,
  "grade_status": "SYNCED"
}
```

### Tool Management

#### `GET /lti/tools`

Lists registered LTI platforms.

#### `POST /lti/tools`

Registers a new LTI platform.

#### `GET /lti/tools/:id`

Gets platform details.

#### `PUT /lti/tools/:id`

Updates platform configuration.

#### `DELETE /lti/tools/:id`

Removes a platform registration.

### Link Management

#### `GET /lti/links`

Lists activity links (filterable by tool_id, activity_id).

#### `POST /lti/links`

Creates a new activity link.

#### `GET /lti/links/:id`

Gets link details.

#### `PUT /lti/links/:id`

Updates link configuration.

### JWKS

#### `GET /lti/jwks`

Returns the tool's public keys for JWT verification.

**Response:**

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "key-1",
      "use": "sig",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

## LMS Configuration

### Canvas

1. Navigate to **Admin > Developer Keys**
2. Create new **LTI Key**
3. Configure:
   - **Key Name:** Aivo
   - **Redirect URIs:** `https://your-domain/lti/launch`
   - **Target Link URI:** `https://your-domain/lti/launch`
   - **OpenID Connect Initiation URL:** `https://your-domain/lti/login`
   - **JWK Method:** Public JWK URL
   - **Public JWK URL:** `https://your-domain/lti/jwks`
4. Enable **LTI Advantage Services:**
   - Assignment and Grade Services
   - Deep Linking
5. Copy the **Client ID** and configure in Aivo admin

### Schoology

1. Go to **System Settings > Integration > External Tools**
2. Add **LTI 1.3 App**
3. Configure:
   - **Launch URL:** `https://your-domain/lti/launch`
   - **Login URL:** `https://your-domain/lti/login`
   - **Redirect URL:** `https://your-domain/lti/launch`
   - **JWKS URL:** `https://your-domain/lti/jwks`
4. Enable grade passback in app settings

### Google Classroom

1. Access [Google Workspace Admin Console](https://admin.google.com)
2. Navigate to **Apps > Web and mobile apps**
3. Add **Add-on** type application
4. Configure OAuth consent and LTI settings

## Environment Variables

```bash
# Service Configuration
PORT=3008
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/lti_svc

# Security
JWT_PRIVATE_KEY_PATH=/secrets/private.pem
JWT_PUBLIC_KEY_PATH=/secrets/public.pem

# External Services
AIVO_API_URL=http://api-gateway:3000
SESSION_SERVICE_URL=http://session-svc:3005

# Redis (for state/nonce storage in production)
REDIS_URL=redis://redis:6379
```

## Security Considerations

### JWT Validation

- All ID tokens are validated against the platform's JWKS
- Nonces are tracked to prevent replay attacks
- State tokens expire after 10 minutes

### Grade Passback

- OAuth2 client credentials flow with signed JWT assertions
- Access tokens are cached with automatic refresh
- All grade submissions are logged for audit

### Data Privacy

- User mappings are scoped to tenant
- PII from LMS is minimized (only what's needed for session)
- Launch records are retained per data retention policy

## Development

### Running Locally

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Start development server
pnpm dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test tests/launch.test.ts
```

### Generating Keys

```bash
# Generate RSA key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

## Troubleshooting

### Common Issues

**"Unknown LTI platform" error**

- Verify the issuer URL matches exactly (including https://)
- Check that the tool is registered and active

**"Invalid signature" error**

- Ensure JWKS URL is accessible and returns valid keys
- Verify the client_id matches the platform configuration

**"Nonce already used" error**

- This is a security feature preventing replay attacks
- User needs to launch again from the LMS

**Grades not syncing**

- Check AGS scopes are enabled on the platform
- Verify lineitem_url is present in the launch
- Check grading_enabled is true on the link

## Related Documentation

- [LTI 1.3 Specification](https://www.imsglobal.org/spec/lti/v1p3/)
- [LTI Advantage](https://www.imsglobal.org/lti-advantage-overview)
- [Assignment and Grade Services](https://www.imsglobal.org/spec/lti-ags/v2p0/)
- [Deep Linking](https://www.imsglobal.org/spec/lti-dl/v2p0/)
