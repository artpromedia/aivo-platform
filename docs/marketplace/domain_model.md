# Marketplace Domain Model

> **Version:** 1.0.0  
> **Last Updated:** 2024-12-12  
> **Service:** `marketplace-svc`

## Overview

The Marketplace is Aivo's catalog system for discovering and installing content packs and third-party tools. It enables:

- **Districts & Teachers** to discover and install educational content and tools
- **Aivo** to publish first-party content packs
- **Third-Party Vendors** to distribute their tools and content through the platform
- **Administrators** to control what's available and approved for their organization

## Core Concepts

### Entity Hierarchy

```
┌─────────────┐
│   Vendor    │  Publisher/developer (Aivo or third-party)
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────────────┐
│  MarketplaceItem    │  Catalog listing (content pack or embedded tool)
└──────────┬──────────┘
           │ 1:N
           ▼
┌─────────────────────────┐
│  MarketplaceItemVersion │  Versioned release with review workflow
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌────────────┐  ┌────────────────────┐
│ContentPack │  │ EmbeddedToolConfig │
│   Items    │  │                    │
└────────────┘  └────────────────────┘
    (1:N)             (1:1)

           ┌─────────────────────────┐
           │ MarketplaceInstallation │  Tenant/school/classroom enablement
           └─────────────────────────┘
```

## Entities

### 1. Vendor

Publishers and developers who provide content or tools in the marketplace.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `slug` | string | URL-friendly identifier (e.g., "aivo", "math-blasters-inc") |
| `name` | string | Display name |
| `type` | enum | `AIVO` or `THIRD_PARTY` |
| `contactEmail` | string | Primary contact |
| `websiteUrl` | string? | Public website |
| `logoUrl` | string? | Logo image |
| `isVerified` | boolean | Verified by Aivo |
| `isActive` | boolean | Can publish items |

**Vendor Types:**
- `AIVO`: First-party content from the Aivo team
- `THIRD_PARTY`: External publishers/developers

### 2. MarketplaceItem

The discoverable catalog listing for a content pack or embedded tool.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `vendorId` | UUID | FK to vendor |
| `slug` | string | Unique URL-friendly identifier |
| `itemType` | enum | `CONTENT_PACK` or `EMBEDDED_TOOL` |
| `title` | string | Display title |
| `shortDescription` | string | Card/list summary |
| `longDescription` | string | Full marketing description (markdown) |
| `subjects` | array | `["ELA", "MATH", "SEL", ...]` |
| `gradeBands` | array | `["K_2", "G3_5", "G6_8", ...]` |
| `modalities` | array | `["GAME", "DRILL", "PROJECT", ...]` |
| `iconUrl` | string? | Thumbnail/icon |
| `screenshotsJson` | JSON | Gallery images |
| `isActive` | boolean | Visible in marketplace |
| `isFeatured` | boolean | Promoted/highlighted |
| `pricingModel` | enum | How item is priced |
| `priceCents` | int? | Price in cents (if simple pricing) |
| `safetyCert` | enum | Safety certification level |
| `avgRating` | decimal? | Average user rating (0-5) |
| `totalInstalls` | int | Installation count |

**Item Types:**

| Type | Description | Version-Specific Data |
|------|-------------|----------------------|
| `CONTENT_PACK` | Set of Learning Objects (LOs) or LO families | `ContentPackItems` - references to LO versions |
| `EMBEDDED_TOOL` | Third-party app/tool integration | `EmbeddedToolConfig` - launch URL, scopes, config |

**Pricing Models:**

| Model | Description |
|-------|-------------|
| `FREE` | Completely free |
| `FREE_TRIAL` | Free trial period, then paid |
| `PAID_PER_SEAT` | Per-student pricing |
| `PAID_FLAT_RATE` | Flat rate per tenant/school |
| `FREEMIUM` | Free with premium features |
| `CUSTOM` | Contact for pricing |

**Safety Certifications:**

| Level | Description |
|-------|-------------|
| `AIVO_CERTIFIED` | Fully vetted by Aivo safety team |
| `VENDOR_ATTESTED` | Vendor self-certification |
| `PENDING_REVIEW` | Under safety review |
| `NOT_REVIEWED` | Not yet reviewed |

### 3. MarketplaceItemVersion

Versioned releases with a review workflow before publishing.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `marketplaceItemId` | UUID | FK to item |
| `version` | string | Semantic version (e.g., "1.0.0") |
| `status` | enum | Review workflow status |
| `changelog` | string? | Release notes |
| `reviewNotes` | string? | Internal reviewer notes |
| `submittedByUserId` | UUID? | Who submitted |
| `reviewedByUserId` | UUID? | Who reviewed |
| `approvedByUserId` | UUID? | Who approved |
| `publishedAt` | datetime? | When published |

**Version Status Workflow:**

```
┌───────┐    submit    ┌────────────────┐   assign   ┌───────────┐
│ DRAFT │ ──────────▶  │ PENDING_REVIEW │ ─────────▶ │ IN_REVIEW │
└───────┘              └────────────────┘            └─────┬─────┘
                                                          │
                              ┌────────────────────┬──────┴──────┐
                              │                    │             │
                              ▼                    ▼             ▼
                        ┌──────────┐         ┌──────────┐  ┌───────────┐
                        │ APPROVED │         │ REJECTED │  │           │
                        └────┬─────┘         └──────────┘  │   (back   │
                             │                             │ to DRAFT) │
                             ▼ publish                     └───────────┘
                        ┌───────────┐
                        │ PUBLISHED │
                        └─────┬─────┘
                              │ deprecate
                              ▼
                        ┌────────────┐
                        │ DEPRECATED │
                        └────────────┘
```

### 4. ContentPackItem (for CONTENT_PACK type)

References to Learning Object versions included in a content pack.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `marketplaceItemVersionId` | UUID | FK to version |
| `loVersionId` | UUID | FK to LO version (cross-service) |
| `loId` | UUID? | FK to LO family |
| `position` | int | Display order |
| `isHighlight` | boolean | Featured within pack |

### 5. EmbeddedToolConfig (for EMBEDDED_TOOL type)

Configuration for launching and integrating third-party tools.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `marketplaceItemVersionId` | UUID | FK to version (1:1) |
| `launchUrl` | string | URL template for launching |
| `launchType` | enum | How tool is launched |
| `requiredScopes` | array | Required data access scopes |
| `optionalScopes` | array | Optional scopes |
| `configSchemaJson` | JSON | JSON Schema for customization |
| `defaultConfigJson` | JSON | Default config values |
| `webhookUrl` | string? | Webhook endpoint |
| `oauthClientId` | string? | OAuth client ID |

**Launch Types:**

| Type | Description |
|------|-------------|
| `IFRAME_WEB` | Web iframe embed in Aivo UI |
| `NATIVE_DEEPLINK` | Mobile deep link |
| `LTI_LIKE` | LTI-style launch with signed params |

**Data Scopes:**

| Scope | Description |
|-------|-------------|
| `LEARNER_PROFILE_MIN` | Basic learner info (id, display name) |
| `LEARNER_PROFILE_FULL` | Extended learner profile |
| `LEARNER_PROGRESS_READ` | Read learner progress data |
| `LEARNER_PROGRESS_WRITE` | Write learner progress data |
| `SESSION_EVENTS_READ` | Read session event data |
| `SESSION_EVENTS_WRITE` | Write session events |
| `ASSIGNMENT_READ` | Read assignments |
| `ASSIGNMENT_WRITE` | Create/update assignments |
| `CLASSROOM_READ` | Read classroom info |
| `TENANT_CONFIG_READ` | Read tenant configuration |

### 6. MarketplaceInstallation

Records of items installed at tenant, school, or classroom level.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `marketplaceItemId` | UUID | FK to item |
| `marketplaceItemVersionId` | UUID | FK to specific version |
| `tenantId` | UUID | Always required |
| `schoolId` | UUID? | If school-scoped |
| `classroomId` | UUID? | If classroom-scoped |
| `installedByUserId` | UUID | Who initiated |
| `approvedByUserId` | UUID? | Who approved |
| `status` | enum | Installation status |
| `configJson` | JSON | Tenant/scope-specific config |

**Scope Hierarchy:**

```
┌─────────────────────────────────────────────────────────────────┐
│ TENANT (district-wide)                                          │
│   schoolId = NULL, classroomId = NULL                          │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ SCHOOL (school-wide)                                     │  │
│   │   schoolId = set, classroomId = NULL                    │  │
│   │                                                          │  │
│   │   ┌─────────────────────────────────────────────────┐   │  │
│   │   │ CLASSROOM (class-specific)                       │   │  │
│   │   │   schoolId = set, classroomId = set             │   │  │
│   │   └─────────────────────────────────────────────────┘   │  │
│   └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Installation Status:**

| Status | Description |
|--------|-------------|
| `PENDING_APPROVAL` | Awaiting admin approval |
| `ACTIVE` | Installed and enabled |
| `DISABLED` | Temporarily disabled by admin |
| `REVOKED` | Permanently removed |

**Installation Workflow:**

```
User requests ──▶ PENDING_APPROVAL ──▶ Admin approves ──▶ ACTIVE
        install                                              │
                                                             │
                                     ┌───────────────────────┴───────┐
                                     │                               │
                                     ▼                               ▼
                                 DISABLED                        REVOKED
                               (reversible)                   (permanent)
```

## Governance & Approvals

### Two-Level Approval System

1. **Aivo Review (Item Versions)**
   - All new versions must be reviewed before publishing
   - Aivo reviewers check for quality, safety, compliance
   - Uses `MarketplaceItemVersion.status` workflow

2. **Tenant Admin Approval (Installations)**
   - District admins approve items before they're available
   - Can configure item settings per their requirements
   - Uses `MarketplaceInstallation.status` workflow

### Audit Trails

- `VersionStatusTransition`: Tracks all version review state changes
- `InstallationStatusTransition`: Tracks all installation state changes

Both include:
- Who made the change
- When it happened
- Previous and new states
- Optional reason/notes

## Database Indexes

### Key Query Patterns

| Query | Indexes |
|-------|---------|
| Browse catalog with filters | `marketplace_items(is_active, subjects, grade_bands)` |
| Search by text | `marketplace_items USING GIN(search_keywords)` |
| Featured items | `marketplace_items(is_active, is_featured)` |
| Tenant installations | `marketplace_installations(tenant_id, status)` |
| School installations | `marketplace_installations(school_id, status)` |
| Version by status | `marketplace_item_versions(marketplace_item_id, status)` |

## Example Scenarios

### Scenario 1: Publishing a Content Pack

1. Aivo creates a vendor record (if not exists)
2. Create `MarketplaceItem` with `itemType = CONTENT_PACK`
3. Create `MarketplaceItemVersion` with `version = "1.0.0"`, `status = DRAFT`
4. Add `ContentPackItem` records for each LO version
5. Submit for review → status becomes `PENDING_REVIEW`
6. Reviewer approves → status becomes `APPROVED`
7. Publish → status becomes `PUBLISHED`

### Scenario 2: Installing an Embedded Tool

1. Teacher discovers tool in marketplace
2. Clicks "Install for My Classroom"
3. System creates `MarketplaceInstallation` with:
   - `tenantId = teacher's tenant`
   - `schoolId = teacher's school`
   - `classroomId = teacher's classroom`
   - `status = PENDING_APPROVAL`
4. District admin reviews request
5. Admin approves → status becomes `ACTIVE`
6. Tool now available in teacher's classroom

### Scenario 3: Third-Party Tool Integration

1. Vendor registers and gets verified
2. Vendor creates `MarketplaceItem` with `itemType = EMBEDDED_TOOL`
3. Vendor creates version with `EmbeddedToolConfig`:
   ```json
   {
     "launchUrl": "https://tool.example.com/launch?user={userId}",
     "launchType": "IFRAME_WEB",
     "requiredScopes": ["LEARNER_PROFILE_MIN", "SESSION_EVENTS_WRITE"],
     "configSchemaJson": {
       "type": "object",
       "properties": {
         "difficulty": { "type": "string", "enum": ["easy", "medium", "hard"] }
       }
     }
   }
   ```
4. Aivo reviews security, compliance, scopes
5. Once published, districts can install with custom config

## Related Documentation

- [Content Service - Learning Objects](../content/learning_objects.md)
- [Tenant Service - Organizations](../platform/tenant_model.md)
- [Billing Service - Subscriptions](../billing/subscriptions.md)
- [Safety & Compliance](../safety/content_review.md)
