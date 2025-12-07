# Aivo Data Classification & Governance

## Classification Model

| Level        | Meaning in Aivo                                                                                                                                                                                                                               | Examples                                                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PUBLIC       | Safe to disclose externally; no PII/FERPA/PCI/PHI risk.                                                                                                                                                                                       | Marketing copy, public docs, open APIs intentionally exposed.                                                                                                  |
| INTERNAL     | Operational data with low privacy risk; limited to Aivo staff and service accounts; still protected.                                                                                                                                          | System IDs, feature flags, non-user-specific logs without payloads.                                                                                            |
| CONFIDENTIAL | Personally identifiable or business-sensitive data; disclosure could harm a person or institution. Requires least-privilege, authN/Z, TLS in transit, encrypted at rest.                                                                      | Names, emails, phone, addresses, tenant/org profile, billing profile, tokens/opaque IDs, partial payment data (last4/brand), usage metrics tied to an account. |
| SENSITIVE    | High-risk data: minor education records (FERPA), health/diagnosis/therapy context, behavioral signals, free-text that may contain PII/PHI, model features/outputs about individuals, auth secrets. Strongest controls, masking in lower envs. | Learner diagnoses, sensory profiles, assessment responses, model features/scores, session/content of messages, MFA secrets, refresh tokens.                    |

### Policies by Classification

- **Access**
  - PUBLIC: unrestricted; avoid mixing with higher classes.
  - INTERNAL: staff/service accounts with business need; role-based access; avoid sharing externally.
  - CONFIDENTIAL: only authorized roles (support, compliance, engineering on-call) with audited access; least-privilege RBAC/ABAC; tenants see only their own data.
  - SENSITIVE: strictly need-to-know; default-deny; break-glass flows for support; tenant-level scoping; strong auth (MFA) for operators; no exposure to third parties without DPA/FERPA clauses.

- **Storage & Processing**
  - INTERNAL: TLS in transit, encrypted at rest.
  - CONFIDENTIAL: Encryption at rest + TLS; config-driven field-level encryption where available (e.g., tokens/secrets); avoid in logs; mask in analytics.
  - SENSITIVE: Encryption at rest + TLS; prefer application-layer encryption or KMS-wrapped fields; tokenization for secrets; masking/redaction in logs, traces, analytics, and lower environments.

- **Logging & Audit**
  - PUBLIC: log freely, but avoid mixing with higher classes.
  - INTERNAL: log with minimal payloads.
  - CONFIDENTIAL: avoid values; log identifiers only (ids, hashed ids). Accesses are audited.
  - SENSITIVE: no payload logging; only event ids and coarse outcomes. All reads/writes audited with actor, purpose, tenant, and timestamp.

- **Retention (hints)**
  - PUBLIC/INTERNAL: per operational need.
  - CONFIDENTIAL: align to tenant contract; default 1–3 years after account closure unless legally required.
  - SENSITIVE: shortest feasible; default to remove/anonymize when no longer necessary for learning support or legal obligations; ensure FERPA-compliant deletion on request.

## Entity Classifications

> Note: Only existing entities/fields are listed. Any **planned** fields are marked explicitly.

### tenants

| field_name                      | classification | rationale                                      |
| ------------------------------- | -------------- | ---------------------------------------------- |
| id                              | INTERNAL       | System identifier; low intrinsic risk.         |
| name                            | CONFIDENTIAL   | Identifies an institution.                     |
| primary_domain                  | CONFIDENTIAL   | Links tenant to org; could expose affiliation. |
| settings_json                   | CONFIDENTIAL   | Org configuration may include URLs/emails.     |
| billing_contact_email (planned) | CONFIDENTIAL   | Contact PII.                                   |
| created_at, updated_at          | INTERNAL       | Timestamps only.                               |

### users

| field_name                            | classification | rationale                  |
| ------------------------------------- | -------------- | -------------------------- |
| id                                    | INTERNAL       | System id.                 |
| email                                 | CONFIDENTIAL   | Direct PII.                |
| password_hash                         | SENSITIVE      | Auth secret (even hashed). |
| mfa_secret / recovery_codes (planned) | SENSITIVE      | Strong auth secrets.       |
| name                                  | CONFIDENTIAL   | PII.                       |
| tenant_id                             | INTERNAL       | Scoped id.                 |
| status / last_login_at                | INTERNAL       | Operational metadata.      |
| profile_avatar_url (planned)          | CONFIDENTIAL   | PII linkable.              |

### user_roles

| field_name         | classification | rationale               |
| ------------------ | -------------- | ----------------------- |
| user_id, tenant_id | INTERNAL       | Linking identifiers.    |
| role               | INTERNAL       | Authorization metadata. |
| created_at         | INTERNAL       | Operational.            |

### parents / teachers / therapists

| field_name                                | classification | rationale                            |
| ----------------------------------------- | -------------- | ------------------------------------ |
| id, tenant_id, user_id                    | INTERNAL       | Linking ids.                         |
| name                                      | CONFIDENTIAL   | PII.                                 |
| email, phone                              | CONFIDENTIAL   | Contact PII.                         |
| relationship_to_learner (parents)         | CONFIDENTIAL   | Family relationship.                 |
| license_number / credentials (therapists) | CONFIDENTIAL   | Professional info.                   |
| notes                                     | SENSITIVE      | May include health/behavior context. |
| created_at, updated_at                    | INTERNAL       | Operational.                         |

### learners

| field_name              | classification | rationale                    |
| ----------------------- | -------------- | ---------------------------- |
| id, tenant_id           | INTERNAL       | Identifiers.                 |
| first_name, last_name   | SENSITIVE      | Minor PII; education record. |
| date_of_birth           | SENSITIVE      | Minor + age.                 |
| grade                   | CONFIDENTIAL   | Education detail.            |
| guardian_contact_id     | CONFIDENTIAL   | Links to parent.             |
| diagnosis_flags_json    | SENSITIVE      | Health/diagnosis indicators. |
| sensory_profile_json    | SENSITIVE      | Neurodiversity/sensory data. |
| iep_plan_json (planned) | SENSITIVE      | Education plan content.      |
| preferences_json        | CONFIDENTIAL   | Non-clinical prefs.          |
| created_at, updated_at  | INTERNAL       | Operational.                 |

### assessments

| field_name          | classification | rationale                                        |
| ------------------- | -------------- | ------------------------------------------------ |
| id, tenant_id       | INTERNAL       | Identifiers.                                     |
| title, description  | INTERNAL       | Content metadata.                                |
| items_json / config | INTERNAL       | Instructional content definition (non-personal). |
| created_by          | INTERNAL       | Author id.                                       |

### assessment_items

| field_name                    | classification | rationale              |
| ----------------------------- | -------------- | ---------------------- |
| id, assessment_id             | INTERNAL       | Identifiers.           |
| stem, choices, correct_answer | INTERNAL       | Content only.          |
| hints                         | INTERNAL       | Instructional content. |

### assessment_attempts

| field_name                            | classification | rationale               |
| ------------------------------------- | -------------- | ----------------------- |
| id                                    | INTERNAL       | Identifier.             |
| assessment_id                         | INTERNAL       | Content link.           |
| learner_id                            | SENSITIVE      | Ties attempt to minor.  |
| started_at, completed_at, duration_ms | INTERNAL       | Timing.                 |
| score                                 | CONFIDENTIAL   | Performance metric.     |
| delivery_context (device, locale)     | CONFIDENTIAL   | Could fingerprint user. |

### assessment_responses

| field_name                         | classification | rationale                                              |
| ---------------------------------- | -------------- | ------------------------------------------------------ |
| id, attempt_id, assessment_item_id | INTERNAL       | Linking ids.                                           |
| learner_id                         | SENSITIVE      | Minor linkage.                                         |
| response_payload                   | SENSITIVE      | Free-text/selections may contain PII/behavior signals. |
| is_correct                         | CONFIDENTIAL   | Performance metric.                                    |
| latency_ms                         | INTERNAL       | Operational metric.                                    |
| feedback                           | SENSITIVE      | May contain educator notes about learner.              |

### learner_models

| field_name                | classification | rationale                           |
| ------------------------- | -------------- | ----------------------------------- |
| id, learner_id            | SENSITIVE      | Model tied to minor.                |
| features_json             | SENSITIVE      | Derived behavioral/ability signals. |
| model_version             | INTERNAL       | System info.                        |
| predicted_levels / scores | SENSITIVE      | Inferred attributes.                |
| updated_at                | INTERNAL       | Operational.                        |

### learner_model_events

| field_name | classification | rationale                                  |
| ---------- | -------------- | ------------------------------------------ |
| id         | INTERNAL       | Identifier.                                |
| learner_id | SENSITIVE      | Minor linkage.                             |
| event_type | INTERNAL       | Model update type.                         |
| payload    | SENSITIVE      | May contain raw or derived sensitive data. |
| created_at | INTERNAL       | Timestamp.                                 |

### learning_objects

| field_name             | classification | rationale              |
| ---------------------- | -------------- | ---------------------- |
| id                     | INTERNAL       | Identifier.            |
| title, description     | INTERNAL       | Content metadata.      |
| subject, grade_band    | INTERNAL       | Non-personal metadata. |
| body/rich_content      | INTERNAL       | Instructional content. |
| author_id              | INTERNAL       | Internal user id.      |
| created_at, updated_at | INTERNAL       | Operational.           |

### learning_object_mappings (learner/content assignments)

| field_name                        | classification | rationale                    |
| --------------------------------- | -------------- | ---------------------------- |
| learner_id                        | SENSITIVE      | Minor linkage.               |
| learning_object_id                | INTERNAL       | Content id.                  |
| assignment_context (plan/session) | CONFIDENTIAL   | Reveals individualized plan. |
| due_at, completed_at              | CONFIDENTIAL   | Progress info.               |

### sessions

| field_name                                | classification | rationale                 |
| ----------------------------------------- | -------------- | ------------------------- |
| id                                        | INTERNAL       | Identifier.               |
| learner_id                                | SENSITIVE      | Minor linkage.            |
| started_at, ended_at                      | INTERNAL       | Timing.                   |
| device_fingerprint / user_agent           | CONFIDENTIAL   | Can identify user/device. |
| session_token / refresh_token (if stored) | SENSITIVE      | Auth secrets.             |

### events (activity/telemetry)

| field_name           | classification | rationale                                                             |
| -------------------- | -------------- | --------------------------------------------------------------------- |
| id                   | INTERNAL       | Identifier.                                                           |
| tenant_id            | INTERNAL       | Scope.                                                                |
| actor_type, actor_id | CONFIDENTIAL   | Links to user/learner.                                                |
| event_type           | INTERNAL       | Operational.                                                          |
| payload              | SENSITIVE      | May contain content/PII depending on event; must be minimized/masked. |
| created_at           | INTERNAL       | Timestamp.                                                            |

### recommendations

| field_name        | classification | rationale                               |
| ----------------- | -------------- | --------------------------------------- |
| id                | INTERNAL       | Identifier.                             |
| learner_id        | SENSITIVE      | Individual linkage.                     |
| recommended_items | SENSITIVE      | Derived from sensitive features.        |
| rationale         | SENSITIVE      | Often references performance/diagnosis. |
| created_at        | INTERNAL       | Timestamp.                              |

### guardrails

| field_name        | classification | rationale                   |
| ----------------- | -------------- | --------------------------- |
| id                | INTERNAL       | Identifier.                 |
| name, description | INTERNAL       | Configuration metadata.     |
| rules_json        | INTERNAL       | Policy definitions; no PII. |
| created_by        | INTERNAL       | Author id.                  |

### messages

| field_name              | classification | rationale                                         |
| ----------------------- | -------------- | ------------------------------------------------- |
| id                      | INTERNAL       | Identifier.                                       |
| thread_id               | INTERNAL       | Link.                                             |
| sender_id, recipient_id | CONFIDENTIAL   | Participant PII linkage.                          |
| body                    | SENSITIVE      | Free-text; may contain PII/PHI/education records. |
| attachments             | SENSITIVE      | Could include documents with PII.                 |
| created_at              | INTERNAL       | Timestamp.                                        |

### threads

| field_name             | classification | rationale           |
| ---------------------- | -------------- | ------------------- |
| id                     | INTERNAL       | Identifier.         |
| subject                | CONFIDENTIAL   | May reveal context. |
| participant_ids        | CONFIDENTIAL   | PII linkage.        |
| created_at, updated_at | INTERNAL       | Operational.        |

### goals

| field_name                  | classification | rationale                      |
| --------------------------- | -------------- | ------------------------------ |
| id                          | INTERNAL       | Identifier.                    |
| learner_id                  | SENSITIVE      | Tied to minor.                 |
| description                 | SENSITIVE      | Educational/therapy objective. |
| target_date, progress_state | CONFIDENTIAL   | Progress info.                 |
| created_by                  | INTERNAL       | Staff id.                      |

### policies (product/feature policies)

| field_name             | classification | rationale        |
| ---------------------- | -------------- | ---------------- |
| id                     | INTERNAL       | Identifier.      |
| name, description      | INTERNAL       | Policy metadata. |
| scope (tenant/feature) | INTERNAL       | Config.          |
| rules_json             | INTERNAL       | Non-PII config.  |
| created_at             | INTERNAL       | Operational.     |

### ai_incidents

| field_name              | classification | rationale                                  |
| ----------------------- | -------------- | ------------------------------------------ |
| id                      | INTERNAL       | Identifier.                                |
| tenant_id               | INTERNAL       | Scope.                                     |
| reporter_id             | CONFIDENTIAL   | PII linkage.                               |
| category, severity      | INTERNAL       | Classification data.                       |
| incident_payload        | SENSITIVE      | May include model inputs/outputs with PII. |
| remediation_actions     | CONFIDENTIAL   | Operational detail.                        |
| created_at, resolved_at | INTERNAL       | Timeline.                                  |

### subscriptions

| field_name                | classification | rationale         |
| ------------------------- | -------------- | ----------------- |
| id                        | INTERNAL       | Identifier.       |
| tenant_id                 | INTERNAL       | Scope.            |
| plan, status              | INTERNAL       | Billing metadata. |
| billing_email             | CONFIDENTIAL   | Contact PII.      |
| renewal_date, canceled_at | INTERNAL       | Operational.      |

### payment_methods

| field_name                        | classification | rationale                              |
| --------------------------------- | -------------- | -------------------------------------- |
| id                                | INTERNAL       | Identifier.                            |
| tenant_id                         | INTERNAL       | Scope.                                 |
| billing_name                      | CONFIDENTIAL   | PII.                                   |
| billing_address                   | CONFIDENTIAL   | PII.                                   |
| processor_token                   | CONFIDENTIAL   | Tokenized payment ref (no PAN stored). |
| brand, last4, exp_month, exp_year | CONFIDENTIAL   | Partial card data.                     |
| created_at                        | INTERNAL       | Operational.                           |

### invoices

| field_name                     | classification | rationale                   |
| ------------------------------ | -------------- | --------------------------- |
| id                             | INTERNAL       | Identifier.                 |
| tenant_id                      | INTERNAL       | Scope.                      |
| billing_email, billing_address | CONFIDENTIAL   | PII.                        |
| line_items                     | INTERNAL       | Non-PII billing detail.     |
| amount, currency, tax          | INTERNAL       | Financial amounts (no PII). |
| payment_status                 | INTERNAL       | Operational.                |
| pdf_url (from processor)       | CONFIDENTIAL   | Could expose PII if shared. |
| created_at, paid_at            | INTERNAL       | Timeline.                   |

## Developer Guidance

- **Choosing a classification**
  - Start from risk: Could this field identify a person, a minor, reveal health/education info, or authentication/financial secrets? If yes, it is at least CONFIDENTIAL; health/education/minor/performance details are SENSITIVE.
  - Derived/model outputs about a person are SENSITIVE.
  - Operational/system-only data with no PII is INTERNAL. Only mark PUBLIC if it is explicitly intended for external publication.

- **Patterns to follow**
  - Do not log SENSITIVE payloads; log ids and outcomes only. Add redaction hooks in services emitting events.
  - Use field-level encryption or tokenization for SENSITIVE secrets (tokens, MFA, refresh tokens).
  - Mask CONFIDENTIAL/SENSITIVE data in non-production environments; prefer synthetic data for tests and demos.
  - In APIs, default to denying access to SENSITIVE fields unless explicitly needed; favor view models that omit them.
  - Tag database columns in schema migration comments with the classification to aid tooling (planned).

- **Requesting / updating classifications**
  - Changes happen via PR: update this doc and the relevant schema/migration comments; include a short security note in the PR description.
  - Security & Privacy review is required when adding or downgrading a classification, introducing new SENSITIVE fields, or exposing SENSITIVE data to new processors/vendors.
  - Add telemetry to audit access to SENSITIVE fields when introduced; ensure RBAC/ABAC rules are updated.

- **Data handling in code**
  - Prefer typed DTOs that separate public vs. internal fields.
  - When emitting events, include only ids and coarse metadata; avoid embedding SENSITIVE payloads.
  - For search/indexing, avoid indexing SENSITIVE free-text; if unavoidable, use encrypted/searchable fields with strict access controls.
  - For backups, ensure encryption and retention policies align with classification; document restores of SENSITIVE data.

---

Last updated: Dec 6, 2025
