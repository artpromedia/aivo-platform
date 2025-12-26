# Parent Service API Documentation

## Overview

The Parent Service (`parent-svc`) provides a comprehensive parent engagement platform for the Aivo learning platform. It enables parents to monitor their children's progress, communicate with teachers, manage privacy consents, and receive personalized weekly digests.

## Base URL

```
/api/v1/parent
```

## Authentication

All endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new parent account (via invite code).

**Request Body:**
```json
{
  "inviteCode": "string",
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "locale": "en"
}
```

**Response:** `201 Created`
```json
{
  "id": "string",
  "email": "string",
  "accessToken": "string",
  "refreshToken": "string"
}
```

#### POST /auth/login
Authenticate parent and receive tokens.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": 3600
}
```

#### POST /auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

#### POST /auth/logout
Invalidate current session.

---

### Profile

#### GET /profile
Get current parent profile with linked students.

**Response:** `200 OK`
```json
{
  "id": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "locale": "string",
  "students": [
    {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "grade": "string",
      "avatarUrl": "string"
    }
  ]
}
```

#### PATCH /profile
Update parent profile.

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "locale": "string"
}
```

---

### Students

#### GET /students
Get all linked students.

#### GET /students/:studentId/summary
Get student learning summary.

**Query Parameters:**
- `period`: `week` | `month` | `semester`

**Response:** `200 OK`
```json
{
  "weeklyTimeSpent": 120,
  "activeDays": 5,
  "averageScore": 85,
  "timeTrend": "up",
  "scoreTrend": "stable",
  "subjectProgress": [
    {
      "subject": "Math",
      "average": 88,
      "timeSpent": 45,
      "trend": "up"
    }
  ],
  "recentActivity": [
    {
      "id": "string",
      "type": "lesson",
      "title": "Fractions",
      "subject": "Math",
      "score": 92,
      "completedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### GET /students/:studentId/report
Get detailed progress report.

#### GET /students/:studentId/report/pdf
Download PDF progress report.

---

### Messaging

#### GET /conversations
List all conversations.

**Response:** `200 OK`
```json
[
  {
    "id": "string",
    "teacherId": "string",
    "teacherName": "Mr. Smith",
    "studentId": "string",
    "studentName": "Jane Doe",
    "subject": "Math Progress",
    "lastMessage": "Thank you for...",
    "lastMessageAt": "2024-01-15T14:30:00Z",
    "unreadCount": 2
  }
]
```

#### GET /conversations/:conversationId
Get conversation with messages.

#### POST /conversations
Create new conversation.

**Request Body:**
```json
{
  "teacherId": "string",
  "studentId": "string",
  "subject": "string",
  "message": "string"
}
```

#### POST /conversations/:conversationId/messages
Send message in conversation.

**Request Body:**
```json
{
  "content": "string"
}
```

#### POST /messages/:messageId/report
Report inappropriate message.

**Request Body:**
```json
{
  "reason": "string"
}
```

---

### Consent Management

#### GET /consent
Get all consent records.

**Response:** `200 OK`
```json
[
  {
    "id": "string",
    "type": "learning_analytics",
    "title": "Learning Analytics",
    "description": "Track progress and personalize learning",
    "granted": true,
    "required": true,
    "grantedAt": "2024-01-01T00:00:00Z"
  }
]
```

#### PUT /consent/:type
Update consent preference.

**Request Body:**
```json
{
  "granted": true
}
```

**Consent Types:**
- `learning_analytics` (required)
- `progress_sharing`
- `email_notifications`
- `push_notifications`
- `weekly_digest`
- `ai_personalization`
- `voice_input`

---

### Settings

#### GET /settings
Get parent settings.

#### PATCH /settings
Update settings.

**Request Body:**
```json
{
  "locale": "en",
  "themeMode": "system",
  "pushEnabled": true,
  "emailEnabled": true,
  "weeklyDigestEnabled": true
}
```

---

### Data Rights (GDPR/CCPA)

#### POST /data/export
Request data export (delivered via email within 30 days).

#### POST /data/deletion
Request account and data deletion.

---

## Rate Limits

| Endpoint Category | Rate Limit |
|-------------------|------------|
| Authentication | 5 requests/minute |
| General API | 100 requests/minute |
| Report Downloads | 10 requests/hour |

## Error Responses

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Supported Languages

The API supports localization via the `Accept-Language` header or user's `locale` setting:

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Portuguese (pt)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
- Arabic (ar)
- Hindi (hi)

## Compliance

This service is designed to comply with:
- **COPPA** (Children's Online Privacy Protection Act)
- **FERPA** (Family Educational Rights and Privacy Act)
- **GDPR** (General Data Protection Regulation)
- **CCPA** (California Consumer Privacy Act)
