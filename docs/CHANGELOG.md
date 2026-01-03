# Changelog

All notable changes to the AIVO API and SDKs will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Batch operations for user management
- Custom metadata search across resources
- Webhook retry configuration per endpoint

### Changed

- Improved error messages for validation failures
- Enhanced rate limit headers with more detail

### Deprecated

- `GET /v1/lessons/{id}/content` - Use `expand=content` parameter instead

## [2024.1.0] - 2024-01-15

### Added

- **Gamification API** - New endpoints for achievements, badges, leaderboards, and streaks
  - `GET /v1/gamification/achievements` - List available achievements
  - `GET /v1/gamification/users/{id}/badges` - Get user's earned badges
  - `GET /v1/gamification/leaderboards` - Access leaderboards
  - `POST /v1/gamification/streaks/check-in` - Record daily check-in

- **Enhanced Analytics** - New analytics dimensions and metrics
  - Time-on-task tracking per content block
  - Engagement scoring algorithm
  - Comparative analytics across cohorts
  - Custom date range support

- **COPPA Compliance Tools** - Parental consent management
  - `POST /v1/parental/consent-request` - Send consent request to parent
  - `GET /v1/parental/consent-status` - Check consent status
  - `DELETE /v1/parental/child-data` - Process data deletion request

- **Webhook Improvements**
  - New event types: `streak.updated`, `badge.earned`, `leaderboard.position_changed`
  - Webhook payload filtering
  - Custom headers support

### Changed

- **Breaking**: Assessment `questions` array now requires `id` field
- Progress tracking now includes time-on-task metrics
- User search now supports fuzzy matching with `fuzzy=true` parameter
- Increased max page size from 100 to 250 for list endpoints

### Fixed

- Fixed pagination cursor encoding for special characters
- Fixed race condition in concurrent progress updates
- Fixed timezone handling in analytics date filters

### Security

- Added support for Ed25519 webhook signatures
- Implemented request signing for sensitive operations
- Enhanced audit logging for admin actions

## [2023.4.0] - 2023-10-01

### Added

- **Course Bundles** - Group courses into purchasable bundles
  - `POST /v1/bundles` - Create course bundle
  - `GET /v1/bundles/{id}` - Get bundle details
  - Automatic enrollment for bundle purchases

- **Learning Paths** - Guided course sequences
  - `POST /v1/learning-paths` - Create learning path
  - Prerequisites and unlock conditions
  - Progress tracking across path

- **Content Versioning** - Track lesson content changes
  - `GET /v1/lessons/{id}/versions` - List content versions
  - `POST /v1/lessons/{id}/restore` - Restore previous version
  - Diff view between versions

- **Bulk Operations**
  - `POST /v1/users/bulk` - Create multiple users
  - `POST /v1/enrollments/bulk` - Bulk enrollment
  - Async processing with job status tracking

### Changed

- Improved lesson content block rendering performance
- Enhanced search with stemming and synonym support
- Updated rate limits for enterprise tier

### Deprecated

- `POST /v1/lessons/{id}/publish` - Use `PATCH /v1/lessons/{id}` with `status: published`

### Fixed

- Fixed memory leak in long-running webhook deliveries
- Fixed incorrect progress percentage calculation
- Fixed duplicate webhook deliveries during retry

## [2023.3.0] - 2023-07-01

### Added

- **Interactive Content Blocks**
  - Code playground with execution
  - Interactive diagrams
  - Embedded simulations

- **Assessment Enhancements**
  - Question pools with random selection
  - Adaptive difficulty adjustment
  - Detailed attempt analytics

- **Organization Management**
  - Sub-organization support
  - Cross-org user sharing
  - Organization-level settings

### Changed

- Migrated to OpenAPI 3.1 specification
- Improved API response times by 40%
- Enhanced webhook delivery reliability

### Removed

- Removed deprecated v0 endpoints
- Removed legacy authentication method

## [2023.2.0] - 2023-04-01

### Added

- **SSO Integration**
  - SAML 2.0 support
  - OpenID Connect support
  - Just-in-time user provisioning

- **LMS Integration**
  - LTI 1.3 support
  - Canvas integration
  - Grade passback (AGS)
  - Roster sync (NRPS)

- **Webhooks v2**
  - HMAC-SHA256 signatures
  - Retry with exponential backoff
  - Event filtering

### Changed

- Standardized error response format
- Improved rate limiting algorithm

## [2023.1.0] - 2023-01-15

### Added

- Initial public API release
- Core resources: Users, Lessons, Courses, Assessments
- Basic analytics endpoints
- Webhook support
- JavaScript and Python SDKs

---

## SDK Changelogs

Individual SDK changelogs:

- [JavaScript SDK](https://github.com/aivo-edu/aivo-js/blob/main/CHANGELOG.md)
- [Python SDK](https://github.com/aivo-edu/aivo-python/blob/main/CHANGELOG.md)
- [Ruby SDK](https://github.com/aivo-edu/aivo-ruby/blob/main/CHANGELOG.md)
- [PHP SDK](https://github.com/aivo-edu/aivo-php/blob/main/CHANGELOG.md)
- [Java SDK](https://github.com/aivo-edu/aivo-java/blob/main/CHANGELOG.md)
- [.NET SDK](https://github.com/aivo-edu/aivo-dotnet/blob/main/CHANGELOG.md)

## API Versioning

AIVO uses date-based versioning (YYYY.Q.patch) for the API:

- Major versions are released quarterly
- Breaking changes are communicated 90 days in advance
- Deprecated features remain available for at least 6 months

## Upgrade Guide

For detailed upgrade instructions between versions, see our [Migration Guides](/guides/migration).
