# AIVO Platform — Pilot District Onboarding Checklist

> **Sprint 8 Deliverable** — Weeks 13-14  
> **PRD Reference**: Section 11 — Pilot Program  
> **Target**: Single district, 500-1000 students, ~50 teachers, ~400 parents

---

## Overview

This checklist tracks every step required to bring the first pilot district live on the AIVO platform. It is organized into three phases:

1. **Pre-Launch** (T-14 days → T-1 day)
2. **Launch Day** (T+0)
3. **Post-Launch / 30-Day Monitoring** (T+1 → T+30)

Each item has an owner role (**Eng** = Engineering, **Ops** = DevOps/SRE, **PM** = Product Manager, **CS** = Customer Success, **DA** = District Admin, **Legal** = Legal/Compliance).

---

## Phase 1: Pre-Launch (T-14 → T-1)

### 1.1 Infrastructure Readiness

| #      | Task                                                 | Owner | Status | Date | Notes                    |
| ------ | ---------------------------------------------------- | ----- | ------ | ---- | ------------------------ |
| 1.1.1  | Hetzner production cluster provisioned (4 servers)   | Ops   | ☐      |      | Use `infra/terraform/`   |
| 1.1.2  | K3s cluster initialized & healthy (3+ nodes Ready)   | Ops   | ☐      |      | `kubectl get nodes`      |
| 1.1.3  | PostgreSQL 15 deployed with PgBouncer                | Ops   | ☐      |      | Verify pool limits       |
| 1.1.4  | Redis 7 deployed with AOF+RDB persistence            | Ops   | ☐      |      | Test failover            |
| 1.1.5  | All 20 databases created and migrated                | Eng   | ☐      |      | Run `migrate:prod`       |
| 1.1.6  | MinIO (IEP document storage) deployed with AES-256   | Ops   | ☐      |      | Verify bucket encryption |
| 1.1.7  | Cloudflare DNS records active (api, app, grafana)    | Ops   | ☐      |      | SSL cert valid           |
| 1.1.8  | Cloudflare WAF rules enabled (FERPA geo-restriction) | Ops   | ☐      |      | US/CA only               |
| 1.1.9  | SSL certificates valid for all domains               | Ops   | ☐      |      | 90+ days remaining       |
| 1.1.10 | Backup system verified (hourly WAL + daily full)     | Ops   | ☐      |      | Test restore             |
| 1.1.11 | Backup encryption key stored in secure vault         | Ops   | ☐      |      | Never in Git             |
| 1.1.12 | Disaster recovery tested (RTO < 4h, RPO < 1h)        | Ops   | ☐      |      | Document results         |

### 1.2 Application Deployment

| #      | Task                                                  | Owner | Status | Date | Notes                |
| ------ | ----------------------------------------------------- | ----- | ------ | ---- | -------------------- |
| 1.2.1  | All 18 TypeScript services deployed and healthy       | Eng   | ☐      |      | Check pod status     |
| 1.2.2  | All 20 Python AI/ML services deployed                 | Eng   | ☐      |      | Verify model loading |
| 1.2.3  | API Gateway (Kong/ingress-nginx) routing verified     | Eng   | ☐      |      | Test all routes      |
| 1.2.4  | Web apps deployed (teacher, parent, admin, district)  | Eng   | ☐      |      | Smoke test each      |
| 1.2.5  | Mobile apps published to TestFlight / Play Store beta | Eng   | ☐      |      | Version approved     |
| 1.2.6  | Feature flags configured for pilot district           | Eng   | ☐      |      | Disable non-Phase-1  |
| 1.2.7  | Rate limiting configured (per-tenant)                 | Eng   | ☐      |      | 1000 req/min/user    |
| 1.2.8  | CORS and CSP headers verified                         | Eng   | ☐      |      | Security audit       |
| 1.2.9  | Health check endpoints responding for all services    | Eng   | ☐      |      | `/health` → 200      |
| 1.2.10 | Canary deployment pipeline tested end-to-end          | Eng   | ☐      |      | GitHub Actions run   |

### 1.3 Data Preparation

| #      | Task                                                   | Owner | Status | Date | Notes                     |
| ------ | ------------------------------------------------------ | ----- | ------ | ---- | ------------------------- |
| 1.3.1  | District tenant record created                         | Eng   | ☐      |      | Anoka-Hennepin ISD 11     |
| 1.3.2  | Schools configured (4 pilot schools)                   | CS/DA | ☐      |      | Names, addresses          |
| 1.3.3  | District admin account created                         | CS    | ☐      |      | MFA enabled               |
| 1.3.4  | Teacher accounts provisioned (50 teachers)             | CS    | ☐      |      | CSV import or SSO         |
| 1.3.5  | Parent accounts provisioned (400 parents)              | CS    | ☐      |      | Welcome email draft ready |
| 1.3.6  | Student profiles imported (500 students)               | CS/DA | ☐      |      | FERPA-compliant transfer  |
| 1.3.7  | Test IEPs verified with realistic goals/accommodations | CS    | ☐      |      | Spot-check 10 IEPs        |
| 1.3.8  | Assessment rubrics configured                          | CS    | ☐      |      | All grade levels          |
| 1.3.9  | Content library seeded (lesson plans, resources)       | CS    | ☐      |      | Grade-appropriate         |
| 1.3.10 | Pilot seed data loaded (`seed-pilot.ts`)               | Eng   | ☐      |      | Verify record counts      |

### 1.4 Security & Compliance

| #      | Task                                                   | Owner     | Status | Date | Notes                              |
| ------ | ------------------------------------------------------ | --------- | ------ | ---- | ---------------------------------- |
| 1.4.1  | FERPA compliance audit completed                       | Legal     | ☐      |      | Document findings                  |
| 1.4.2  | Data Processing Agreement (DPA) signed with district   | Legal     | ☐      |      | Filed securely                     |
| 1.4.3  | Privacy policy published and accepted by district      | Legal     | ☐      |      | URL: /privacy                      |
| 1.4.4  | Terms of service agreed by district admin              | Legal     | ☐      |      | Signed copy stored                 |
| 1.4.5  | Penetration test completed (no critical/high findings) | Eng       | ☐      |      | Use external vendor                |
| 1.4.6  | Audit logging verified for all PII access              | Eng       | ☐      |      | Sample 24h of logs                 |
| 1.4.7  | Data encryption at rest verified (PostgreSQL + MinIO)  | Ops       | ☐      |      | AES-256                            |
| 1.4.8  | Data encryption in transit verified (TLS 1.2+)         | Ops       | ☐      |      | `nmap --script ssl-enum-ciphers`   |
| 1.4.9  | Role-based access control (RBAC) tested per role       | Eng       | ☐      |      | Teacher can't see other's students |
| 1.4.10 | Session timeout configured (30 min idle, 8h absolute)  | Eng       | ☐      |      |                                    |
| 1.4.11 | Password policy enforced (min 12 chars, complexity)    | Eng       | ☐      |      |                                    |
| 1.4.12 | MFA enabled for admin and district admin roles         | Eng       | ☐      |      | TOTP or SMS                        |
| 1.4.13 | Data retention policy configured (7-year FERPA)        | Ops       | ☐      |      | MinIO lifecycle                    |
| 1.4.14 | Incident response plan documented and shared           | Legal/Eng | ☐      |      | 72h breach notification            |

### 1.5 Monitoring & Alerting

| #      | Task                                                  | Owner | Status | Date | Notes                 |
| ------ | ----------------------------------------------------- | ----- | ------ | ---- | --------------------- |
| 1.5.1  | Prometheus scraping all service metrics               | Ops   | ☐      |      | 15s interval          |
| 1.5.2  | Grafana dashboards deployed (5 core + pilot overview) | Ops   | ☐      |      | Test data visible     |
| 1.5.3  | Alertmanager rules active (6 critical + 10 warnings)  | Ops   | ☐      |      | Test alert routing    |
| 1.5.4  | PagerDuty integration configured & tested             | Ops   | ☐      |      | Escalation policy set |
| 1.5.5  | On-call rotation established (24/7 for first 2 weeks) | Eng   | ☐      |      | Min 2 engineers       |
| 1.5.6  | Error tracking (Sentry/Datadog) receiving events      | Eng   | ☐      |      | Source maps uploaded  |
| 1.5.7  | Uptime monitoring from external probe                 | Ops   | ☐      |      | 1-min interval        |
| 1.5.8  | Log aggregation verified (structured JSON logs)       | Ops   | ☐      |      | 30-day retention      |
| 1.5.9  | SLO burn-rate alerts tested                           | Ops   | ☐      |      | 99.9% target          |
| 1.5.10 | FERPA audit log daily verification cron active        | Ops   | ☐      |      | Gap detection         |

### 1.6 Performance Validation

| #      | Task                                                  | Owner | Status | Date | Notes                |
| ------ | ----------------------------------------------------- | ----- | ------ | ---- | -------------------- |
| 1.6.1  | k6 pilot load test passed (50 teachers + 200 parents) | Eng   | ☐      |      | All thresholds green |
| 1.6.2  | API P95 < 500ms under pilot load                      | Eng   | ☐      |      | k6 result            |
| 1.6.3  | Dashboard load P95 < 2s                               | Eng   | ☐      |      | k6 result            |
| 1.6.4  | Compliance report generation P95 < 5s                 | Eng   | ☐      |      | k6 result            |
| 1.6.5  | Login burst (50 simultaneous) P95 < 1s                | Eng   | ☐      |      | k6 morning_rush      |
| 1.6.6  | AI tutor response P95 < 3s                            | Eng   | ☐      |      | k6 ai_tutor_load     |
| 1.6.7  | Database connection pool stable under load            | Ops   | ☐      |      | No pool exhaustion   |
| 1.6.8  | Memory usage stable (no leaks over 4h soak)           | Eng   | ☐      |      | k6 soak or custom    |
| 1.6.9  | CDN cache hit rate > 80% for static assets            | Ops   | ☐      |      | Cloudflare analytics |
| 1.6.10 | Mobile app cold start < 3s (iOS + Android)            | Eng   | ☐      |      | Device testing       |

### 1.7 Training & Documentation

| #      | Task                                                | Owner | Status | Date | Notes                |
| ------ | --------------------------------------------------- | ----- | ------ | ---- | -------------------- |
| 1.7.1  | District admin quickstart guide delivered           | CS    | ☐      |      | `docs/pilot/`        |
| 1.7.2  | Teacher quickstart guide delivered                  | CS    | ☐      |      | `docs/pilot/`        |
| 1.7.3  | Parent welcome email template ready                 | CS    | ☐      |      | `docs/pilot/`        |
| 1.7.4  | FAQ document published                              | CS    | ☐      |      | `docs/pilot/`        |
| 1.7.5  | Video walkthrough recorded (5-min teacher overview) | CS    | ☐      |      | Link ready           |
| 1.7.6  | In-app tutorial / onboarding flow enabled           | Eng   | ☐      |      | Feature flag         |
| 1.7.7  | Support contact card distributed                    | CS    | ☐      |      | Phone + email + chat |
| 1.7.8  | Known limitations document shared with district     | CS/PM | ☐      |      | `docs/pilot/`        |
| 1.7.9  | Training session scheduled with district admin      | CS    | ☐      |      | Calendar invite sent |
| 1.7.10 | Training session scheduled with teacher leads       | CS    | ☐      |      | Calendar invite sent |

---

## Phase 2: Launch Day (T+0)

### 2.1 Go / No-Go Decision

| #     | Task                                    | Owner   | Status | Date | Notes                |
| ----- | --------------------------------------- | ------- | ------ | ---- | -------------------- |
| 2.1.1 | All Phase 1 items completed (100%)      | PM      | ☐      |      | Checklist audit      |
| 2.1.2 | Go/No-Go meeting held with stakeholders | PM      | ☐      |      | Attendees signed off |
| 2.1.3 | Rollback plan documented and rehearsed  | Eng/Ops | ☐      |      | < 30 min rollback    |

### 2.2 Launch Execution

| #     | Task                                           | Owner | Status | Date | Notes              |
| ----- | ---------------------------------------------- | ----- | ------ | ---- | ------------------ |
| 2.2.1 | Production deployment executed (canary → full) | Eng   | ☐      |      | GitHub Actions     |
| 2.2.2 | Smoke tests passed post-deploy                 | Eng   | ☐      |      | Playwright suite   |
| 2.2.3 | District admin logs in and verifies setup      | CS/DA | ☐      |      | Screenshare call   |
| 2.2.4 | Teacher welcome emails sent                    | CS    | ☐      |      | 50 recipients      |
| 2.2.5 | Parent welcome emails sent                     | CS    | ☐      |      | 400 recipients     |
| 2.2.6 | Monitoring dashboard visible in war-room mode  | Ops   | ☐      |      | Grafana TV display |
| 2.2.7 | Support channel open (Slack/Teams/phone)       | CS    | ☐      |      | Staffed 8am-6pm    |

### 2.3 Launch Day Monitoring

| #     | Task                                          | Owner | Status | Date | Notes               |
| ----- | --------------------------------------------- | ----- | ------ | ---- | ------------------- |
| 2.3.1 | Error rate < 0.5% during first 2 hours        | Ops   | ☐      |      | Grafana check       |
| 2.3.2 | P95 latency < 500ms during first 2 hours      | Ops   | ☐      |      | Grafana check       |
| 2.3.3 | Login success rate > 99%                      | Ops   | ☐      |      | Auth metrics        |
| 2.3.4 | No critical alerts fired                      | Ops   | ☐      |      | PagerDuty quiet     |
| 2.3.5 | Database connection pool utilization < 70%    | Ops   | ☐      |      | PgBouncer stats     |
| 2.3.6 | 5 teachers confirmed successful first session | CS    | ☐      |      | Verbal confirmation |
| 2.3.7 | 2 parents confirmed successful first login    | CS    | ☐      |      | Verbal confirmation |
| 2.3.8 | End-of-day status email sent to stakeholders  | PM    | ☐      |      | Metrics + feedback  |

---

## Phase 3: Post-Launch (T+1 → T+30)

### 3.1 Daily Checks (First 7 Days)

| #     | Task                                   | Owner | Frequency | Notes                        |
| ----- | -------------------------------------- | ----- | --------- | ---------------------------- |
| 3.1.1 | Review Grafana pilot dashboard         | Ops   | Daily     | Error rate, latency, uptime  |
| 3.1.2 | Check FERPA audit log completeness     | Ops   | Daily     | Automated cron + manual spot |
| 3.1.3 | Review support ticket queue            | CS    | Daily     | Response SLA < 4h            |
| 3.1.4 | Check backup completion status         | Ops   | Daily     | Hourly WAL + nightly full    |
| 3.1.5 | Review error tracking (Sentry/Datadog) | Eng   | Daily     | Triage new errors            |
| 3.1.6 | Review user adoption metrics           | PM    | Daily     | DAU/WAU/MAU trend            |

### 3.2 Weekly Reviews (Weeks 1-4)

| #     | Task                               | Owner | Frequency | Notes                 |
| ----- | ---------------------------------- | ----- | --------- | --------------------- |
| 3.2.1 | Pilot status meeting with district | PM/CS | Weekly    | Feedback + issues     |
| 3.2.2 | Performance trend analysis         | Eng   | Weekly    | Regressions?          |
| 3.2.3 | Feature usage analytics review     | PM    | Weekly    | Top/bottom features   |
| 3.2.4 | Teacher satisfaction pulse survey  | CS    | Weekly    | NPS or CSAT           |
| 3.2.5 | Parent engagement analysis         | PM    | Weekly    | DAU, session duration |
| 3.2.6 | Bug triage and hotfix deployment   | Eng   | Weekly    | Priority queue        |
| 3.2.7 | Infrastructure capacity review     | Ops   | Weekly    | CPU/mem/disk trends   |

### 3.3 Success Criteria (30-Day Milestones)

| #      | Criterion                      | Target               | Status | Actual | Notes              |
| ------ | ------------------------------ | -------------------- | ------ | ------ | ------------------ |
| 3.3.1  | Platform uptime                | ≥ 99.9%              | ☐      |        | SLO dashboard      |
| 3.3.2  | Teacher adoption rate          | ≥ 80% weekly active  | ☐      |        | 40/50 teachers     |
| 3.3.3  | Parent adoption rate           | ≥ 50% monthly active | ☐      |        | 200/400 parents    |
| 3.3.4  | IEPs created/managed           | ≥ 100 active         | ☐      |        | System count       |
| 3.3.5  | Average API P95 latency        | < 500ms              | ☐      |        | 30-day avg         |
| 3.3.6  | Error rate                     | < 0.5%               | ☐      |        | 30-day avg         |
| 3.3.7  | Support ticket resolution      | < 24h avg            | ☐      |        | Zendesk/Freshdesk  |
| 3.3.8  | Zero FERPA violations          | 0 incidents          | ☐      |        | Audit log review   |
| 3.3.9  | Teacher NPS score              | ≥ 30                 | ☐      |        | Survey results     |
| 3.3.10 | Data accuracy (IEP compliance) | ≥ 95%                | ☐      |        | Compliance checker |

---

## Appendix A: Emergency Contacts

| Role             | Name               | Phone | Email            |
| ---------------- | ------------------ | ----- | ---------------- |
| Engineering Lead | TBD                |       |                  |
| SRE On-Call      | PagerDuty rotation |       | oncall@aivo.com  |
| Customer Success | TBD                |       | support@aivo.com |
| District Admin   | TBD                |       |                  |
| Legal/Compliance | TBD                |       |                  |

## Appendix B: Rollback Procedure

1. **Identify issue** — Monitor Grafana for error rate > 5% or P95 > 5s
2. **Decision** — Engineering Lead + PM agree on rollback
3. **Execute** — Run `kubectl rollout undo deployment/<service> -n aivo-prod`
4. **Verify** — Confirm rollback via health checks
5. **Communicate** — Notify district admin + stakeholders within 30 min
6. **Post-mortem** — Schedule within 24h, document in `docs/incidents/`

## Appendix C: Feature Flags for Pilot

| Flag                               | Description                  | Default       |
| ---------------------------------- | ---------------------------- | ------------- |
| `pilot.ai_tutor.enabled`           | AI tutor conversations       | ON            |
| `pilot.progress_tracking.enabled`  | Student progress dashboards  | ON            |
| `pilot.iep_management.enabled`     | Full IEP CRUD workflows      | ON            |
| `pilot.compliance_reports.enabled` | Automated compliance reports | ON            |
| `pilot.parent_portal.enabled`      | Parent dashboard access      | ON            |
| `pilot.advanced_analytics.enabled` | District-level analytics     | ON            |
| `pilot.lesson_builder.enabled`     | AI lesson plan generation    | OFF (Phase 2) |
| `pilot.multi_district.enabled`     | Cross-district features      | OFF (Phase 2) |
| `pilot.billing.enabled`            | Billing/credit processing    | OFF (Phase 2) |
