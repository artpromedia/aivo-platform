# AIVO Platform - TODO Remediation Plan

**Generated:** January 20, 2026  
**Scope:** Production code in services/_, apps/mobile-_, apps/web-_, libs/_, packages/\*

---

## Executive Summary

| Metric                     | Count            |
| -------------------------- | ---------------- |
| **Total TODOs Found**      | 89               |
| **P0 (Security/Data)**     | 8                |
| **P1 (Functionality)**     | 34               |
| **P2 (UX/Navigation)**     | 38               |
| **P3 (Tech Debt)**         | 9                |
| **Estimated Total Effort** | 147 Story Points |

---

## 📊 Summary by Area

| Area                 | Count | Effort (SP) |
| -------------------- | ----- | ----------- |
| **Backend Services** | 25    | 58          |
| **Mobile (Teacher)** | 26    | 36          |
| **Mobile (Parent)**  | 12    | 15          |
| **Mobile (Learner)** | 5     | 8           |
| **Web (District)**   | 8     | 16          |
| **Web (Learner)**    | 4     | 6           |
| **Web (Teacher)**    | 3     | 4           |
| **Web (Other)**      | 6     | 8           |

---

## 🚨 Priority Breakdown

### P0 - Security/Data Integrity (8 items)

| #   | File                                                                                                                                              | Line   | TODO                                                        | Effort | Sprint   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------- | ------ | -------- |
| 1   | [services/lti-svc/src/launch-service.ts](services/lti-svc/src/launch-service.ts#L35)                                                              | 35     | Create dedicated system service account in auth-svc         | M (2d) | Sprint 1 |
| 2   | [services/research-svc/src/routes/audit.ts](services/research-svc/src/routes/audit.ts#L77)                                                        | 77     | Also check if user is project member (authorization gap)    | S (4h) | Sprint 1 |
| 3   | [services/marketplace-svc/src/routes/creator.routes.ts](services/marketplace-svc/src/routes/creator.routes.ts#L154)                               | 154    | Check user is associated with this vendor via auth claims   | S (4h) | Sprint 1 |
| 4   | [services/marketplace-svc/src/routes/installation.routes.ts](services/marketplace-svc/src/routes/installation.routes.ts#L224)                     | 224    | Check tenant policies for auto-approval                     | M (1d) | Sprint 1 |
| 5   | [services/api-gateway/src/security/services/consent.service.ts](services/api-gateway/src/security/services/consent.service.ts#L341)               | 341    | Send renewal reminders (FERPA/COPPA compliance)             | M (2d) | Sprint 1 |
| 6   | [services/billing-svc/src/repositories/coverage-profile.repository.ts](services/billing-svc/src/repositories/coverage-profile.repository.ts#L241) | 241    | Filter by tenantId when learner-tenant mapping is available | M (1d) | Sprint 1 |
| 7   | [apps/web-district/app/billing/quotes/page.tsx](apps/web-district/app/billing/quotes/page.tsx#L39)                                                | 39     | Replace with actual tenant ID from auth context             | S (2h) | Sprint 1 |
| 8   | [apps/web-creator/app/providers.tsx](apps/web-creator/app/providers.tsx#L54-L71)                                                                  | 54, 71 | Call auth API to validate session; Implement real auth      | M (2d) | Sprint 1 |

**P0 Total: 21 Story Points**

---

### P1 - Core Functionality (34 items)

| #   | File                                                                                                                                                                           | Line    | TODO                                                            | Effort | Sprint   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | --------------------------------------------------------------- | ------ | -------- |
| 1   | [services/parent-svc/src/onboarding/onboarding.service.ts](services/parent-svc/src/onboarding/onboarding.service.ts#L358)                                                      | 358     | Call learner-model-svc to update Virtual Brain curriculum       | L (3d) | Sprint 1 |
| 2   | [services/realtime-svc/src/services/room.service.ts](services/realtime-svc/src/services/room.service.ts#L616)                                                                  | 616     | Integrate with analytics-svc via event bus                      | M (2d) | Sprint 2 |
| 3   | [services/marketplace-svc/src/services/validation.service.ts](services/marketplace-svc/src/services/validation.service.ts#L387)                                                | 387     | Implement cross-service LO metadata validation                  | L (3d) | Sprint 2 |
| 4   | [services/import-export-svc/src/export/export.service.ts](services/import-export-svc/src/export/export.service.ts#L227)                                                        | 227     | Add metrics service                                             | S (4h) | Sprint 2 |
| 5   | [services/import-export-svc/src/export/export.service.ts](services/import-export-svc/src/export/export.service.ts#L254)                                                        | 254     | Add metrics service                                             | S (4h) | Sprint 2 |
| 6   | [services/import-export-svc/src/lti/lti-provider.service.ts](services/import-export-svc/src/lti/lti-provider.service.ts#L163)                                                  | 163     | Add metrics tracking when metrics service is available          | S (4h) | Sprint 2 |
| 7   | [services/import-export-svc/src/lti/lti-platform.service.ts](services/import-export-svc/src/lti/lti-platform.service.ts#L277)                                                  | 277     | Add metrics service                                             | S (4h) | Sprint 2 |
| 8   | [services/goal-svc/src/routes/goals.ts](services/goal-svc/src/routes/goals.ts#L14)                                                                                             | 14      | Implement filtering when needed                                 | S (4h) | Sprint 2 |
| 9   | [services/focus-svc/src/engine/regulationCatalog.ts](services/focus-svc/src/engine/regulationCatalog.ts#L365)                                                                  | 365     | Implement AI integration                                        | L (5d) | Sprint 3 |
| 10  | [services/embedded-tools-svc/src/routes/events.routes.ts](services/embedded-tools-svc/src/routes/events.routes.ts#L224)                                                        | 224     | Forward to analytics pipeline                                   | M (2d) | Sprint 2 |
| 11  | [services/embedded-tools-svc/src/routes/session.routes.ts](services/embedded-tools-svc/src/routes/session.routes.ts#L580)                                                      | 580     | Get audience from tool config                                   | S (2h) | Sprint 2 |
| 12  | [services/content-svc/src/search.ts](services/content-svc/src/search.ts#L244)                                                                                                  | 244     | Query session-svc for ACTIVITY_COMPLETED events                 | M (2d) | Sprint 2 |
| 13  | [services/content-svc/src/routes/ingestion.ts](services/content-svc/src/routes/ingestion.ts#L339)                                                                              | 339     | Trigger background job via NATS or job queue                    | M (2d) | Sprint 2 |
| 14  | [services/content-svc/src/routes/ingestion.ts](services/content-svc/src/routes/ingestion.ts#L407)                                                                              | 407     | Call the AI orchestrator in production                          | M (2d) | Sprint 2 |
| 15  | [services/billing-svc/src/services/billing-reconciliation.job.ts](services/billing-svc/src/services/billing-reconciliation.job.ts#L11)                                         | 11      | Implement credit processing                                     | M (2d) | Sprint 2 |
| 16  | [services/audit-svc/src/consumers/eventConsumer.ts](services/audit-svc/src/consumers/eventConsumer.ts#L313)                                                                    | 313     | Send webhook notification if configured                         | M (1d) | Sprint 3 |
| 17  | [services/analytics-svc/src/routes/collaborationAnalytics.ts](services/analytics-svc/src/routes/collaborationAnalytics.ts#L85)                                                 | 85      | Query from fact tables when available                           | M (2d) | Sprint 3 |
| 18  | [services/analytics-svc/src/routes/collaborationAnalytics.ts](services/analytics-svc/src/routes/collaborationAnalytics.ts#L129)                                                | 129     | Query from fact tables when available                           | M (2d) | Sprint 3 |
| 19  | [services/ai-orchestrator/src/explainability/builder.ts](services/ai-orchestrator/src/explainability/builder.ts#L251)                                                          | 251     | Enable AI summaries when config.enableAiSummaries is true       | L (3d) | Sprint 3 |
| 20  | [apps/web-teacher/src/app/(dashboard)/students/[studentId]/page.tsx](<apps/web-teacher/src/app/(dashboard)/students/[studentId]/page.tsx#L23>)                                 | 23, 42  | Replace with real API call                                      | S (4h) | Sprint 2 |
| 21  | [apps/web-teacher/src/app/(dashboard)/assignments/new/page.tsx](<apps/web-teacher/src/app/(dashboard)/assignments/new/page.tsx#L21>)                                           | 21      | Replace with actual API call when backend is ready              | S (4h) | Sprint 2 |
| 22  | [apps/web-marketing/src/components/shared/footer.tsx](apps/web-marketing/src/components/shared/footer.tsx#L234)                                                                | 234     | Replace with actual newsletter API                              | S (2h) | Sprint 3 |
| 23  | [apps/web-learner/app/(learning)/self-regulation/components/RegulationContainer.tsx](<apps/web-learner/app/(learning)/self-regulation/components/RegulationContainer.tsx#L59>) | 59, 67  | Integrate with gamification service for XP                      | M (2d) | Sprint 2 |
| 24  | [apps/web-district/app/marketplace/installations/list.tsx](apps/web-district/app/marketplace/installations/list.tsx#L264)                                                      | 264     | Implement approve action                                        | S (4h) | Sprint 2 |
| 25  | [apps/web-district/app/marketplace/installations/list.tsx](apps/web-district/app/marketplace/installations/list.tsx#L335)                                                      | 335     | Implement revoke action with confirmation                       | S (4h) | Sprint 2 |
| 26  | [apps/web-district/app/marketplace/items/[slug]/install-modal.tsx](apps/web-district/app/marketplace/items/[slug]/install-modal.tsx#L52)                                       | 52      | Replace with actual API call                                    | S (4h) | Sprint 2 |
| 27  | [apps/web-district/app/research/projects/[id]/exports/new/page.tsx](apps/web-district/app/research/projects/[id]/exports/new/page.tsx#L233)                                    | 233     | Create dataset from template                                    | M (1d) | Sprint 3 |
| 28  | [apps/web-district/app/audit/learner/[learnerId]/learner-audit-timeline.tsx](apps/web-district/app/audit/learner/[learnerId]/learner-audit-timeline.tsx#L338)                  | 338     | Implement pagination                                            | S (4h) | Sprint 2 |
| 29  | [apps/web-district/app/audit/learner/[learnerId]/page.tsx](apps/web-district/app/audit/learner/[learnerId]/page.tsx#L42)                                                       | 42      | Fetch learner name from learner service                         | S (2h) | Sprint 2 |
| 30  | [apps/web-district/app/billing/page.tsx](apps/web-district/app/billing/page.tsx#L58)                                                                                           | 58      | Determine renewal status from renewal tasks                     | S (4h) | Sprint 2 |
| 31  | [apps/web-creator/app/items/[itemId]/content-pack-editor.tsx](apps/web-creator/app/items/[itemId]/content-pack-editor.tsx#L234)                                                | 234     | Implement LO search via content-svc API                         | M (1d) | Sprint 2 |
| 32  | [apps/web-platform-admin/lib/billing-api.ts](apps/web-platform-admin/lib/billing-api.ts#L141-L194)                                                                             | 141-194 | Replace with real API call when endpoint is ready (5 instances) | M (2d) | Sprint 2 |
| 33  | [apps/mobile-teacher/lib/screens/risk/intervention_screen.dart](apps/mobile-teacher/lib/screens/risk/intervention_screen.dart#L217)                                            | 217     | Get score from prediction                                       | S (2h) | Sprint 2 |
| 34  | [apps/mobile-teacher/lib/screens/learner_detail_screen.dart](apps/mobile-teacher/lib/screens/learner_detail_screen.dart#L383)                                                  | 383     | Save observation via API                                        | S (4h) | Sprint 2 |

**P1 Total: 72 Story Points**

---

### P2 - User Experience / Navigation (38 items)

| #   | File                                                                                                                                                        | Line | TODO                                             | Effort   | Sprint   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------ | -------- | -------- |
| 1   | [apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart](apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart#L67)              | 67   | Navigate to all meetings                         | XS (<1h) | Sprint 2 |
| 2   | [apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart](apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart#L264)             | 264  | Open video link                                  | XS (<1h) | Sprint 2 |
| 3   | [apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart](apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart#L269)             | 269  | Navigate to meeting detail                       | XS (<1h) | Sprint 2 |
| 4   | [apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart](apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart#L361)             | 361  | Navigate to learner collaboration detail         | XS (<1h) | Sprint 2 |
| 5   | [apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart](apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart#L426)             | 426  | Navigate to learner collaboration detail         | XS (<1h) | Sprint 2 |
| 6   | [apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart](apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart#L321)                 | 321  | Record completion                                | S (2h)   | Sprint 2 |
| 7   | [apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart](apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart#L326)                 | 326  | Show task detail                                 | XS (<1h) | Sprint 2 |
| 8   | [apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart](apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart#L344)                 | 344  | Navigate to plan detail                          | XS (<1h) | Sprint 2 |
| 9   | [apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart](apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart#L970)                 | 970  | Open video link                                  | XS (<1h) | Sprint 2 |
| 10  | [apps/mobile-teacher/lib/screens/gradebook/grade_submission_screen.dart](apps/mobile-teacher/lib/screens/gradebook/grade_submission_screen.dart#L368)       | 368  | Open attachment URL                              | XS (<1h) | Sprint 2 |
| 11  | [apps/mobile-teacher/lib/screens/gradebook/grade_submission_screen.dart](apps/mobile-teacher/lib/screens/gradebook/grade_submission_screen.dart#L409)       | 409  | Navigate to next ungraded submission             | S (2h)   | Sprint 2 |
| 12  | [apps/mobile-teacher/lib/screens/assignments/assignment_detail_screen.dart](apps/mobile-teacher/lib/screens/assignments/assignment_detail_screen.dart#L486) | 486  | Implement close assignment                       | S (2h)   | Sprint 2 |
| 13  | [apps/mobile-teacher/lib/screens/risk/risk_dashboard_screen.dart](apps/mobile-teacher/lib/screens/risk/risk_dashboard_screen.dart#L482)                     | 482  | Implement scroll to section                      | S (2h)   | Sprint 3 |
| 14  | [apps/mobile-teacher/lib/screens/messages/conversation_screen.dart](apps/mobile-teacher/lib/screens/messages/conversation_screen.dart#L220)                 | 220  | Implement photo picker                           | S (4h)   | Sprint 3 |
| 15  | [apps/mobile-teacher/lib/screens/messages/conversation_screen.dart](apps/mobile-teacher/lib/screens/messages/conversation_screen.dart#L228)                 | 228  | Implement camera capture                         | S (4h)   | Sprint 3 |
| 16  | [apps/mobile-teacher/lib/screens/messages/conversation_screen.dart](apps/mobile-teacher/lib/screens/messages/conversation_screen.dart#L236)                 | 236  | Implement document picker                        | S (4h)   | Sprint 3 |
| 17  | [apps/mobile-parent/lib/screens/care_team_screen.dart](apps/mobile-parent/lib/screens/care_team_screen.dart#L194)                                           | 194  | Launch phone dialer                              | XS (<1h) | Sprint 2 |
| 18  | [apps/mobile-parent/lib/screens/care_team_screen.dart](apps/mobile-parent/lib/screens/care_team_screen.dart#L298)                                           | 298  | Launch email                                     | XS (<1h) | Sprint 2 |
| 19  | [apps/mobile-parent/lib/screens/care_team_screen.dart](apps/mobile-parent/lib/screens/care_team_screen.dart#L311)                                           | 311  | Navigate to messaging                            | XS (<1h) | Sprint 2 |
| 20  | [apps/mobile-parent/lib/screens/care_notes_screen.dart](apps/mobile-parent/lib/screens/care_notes_screen.dart#L515)                                         | 515  | Reply to note                                    | S (2h)   | Sprint 3 |
| 21  | [apps/mobile-parent/lib/screens/care_notes_screen.dart](apps/mobile-parent/lib/screens/care_notes_screen.dart#L526)                                         | 526  | Share note                                       | S (2h)   | Sprint 3 |
| 22  | [apps/mobile-parent/lib/screens/meetings_screen.dart](apps/mobile-parent/lib/screens/meetings_screen.dart#L367)                                             | 367  | Open video link                                  | XS (<1h) | Sprint 2 |
| 23  | [apps/mobile-parent/lib/screens/meetings_screen.dart](apps/mobile-parent/lib/screens/meetings_screen.dart#L378)                                             | 378  | Add to calendar                                  | S (2h)   | Sprint 3 |
| 24  | [apps/mobile-parent/lib/screens/meetings_screen.dart](apps/mobile-parent/lib/screens/meetings_screen.dart#L527)                                             | 527  | Open link                                        | XS (<1h) | Sprint 2 |
| 25  | [apps/mobile-parent/lib/screens/threads_screen.dart](apps/mobile-parent/lib/screens/threads_screen.dart#L70)                                                | 70   | Implement search                                 | S (4h)   | Sprint 3 |
| 26  | [apps/mobile-parent/lib/screens/threads_screen.dart](apps/mobile-parent/lib/screens/threads_screen.dart#L635)                                               | 635  | Navigate to context (action plan, meeting, etc.) | S (2h)   | Sprint 3 |
| 27  | [apps/mobile-parent/lib/screens/threads_screen.dart](apps/mobile-parent/lib/screens/threads_screen.dart#L807)                                               | 807  | Implement attachment                             | S (4h)   | Sprint 3 |
| 28  | [apps/mobile-learner/lib/screens/adaptive_games_screen.dart](apps/mobile-learner/lib/screens/adaptive_games_screen.dart#L302)                               | 302  | Navigate to game player screen                   | S (2h)   | Sprint 3 |
| 29  | [apps/mobile-learner/lib/screens/focus_games_screen.dart](apps/mobile-learner/lib/screens/focus_games_screen.dart#L294)                                     | 294  | Navigate to focus activity player                | S (2h)   | Sprint 3 |
| 30  | [apps/mobile-learner/lib/screens/homework_helper_intro_screen.dart](apps/mobile-learner/lib/screens/homework_helper_intro_screen.dart#L108)                 | 108  | Implement camera/image flow                      | M (1d)   | Sprint 3 |
| 31  | [apps/mobile-learner/lib/predictability/predictability_widgets.dart](apps/mobile-learner/lib/predictability/predictability_widgets.dart#L1231)              | 1231 | Navigate to calming routine                      | XS (<1h) | Sprint 3 |

**P2 Total: 42 Story Points**

---

### P3 - Technical Debt (9 items)

| #   | File                                                                                                                                         | Line   | TODO                                                            | Effort | Sprint   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------- | ------ | -------- |
| 1   | [apps/mobile-teacher/lib/screens/settings_screen.dart](apps/mobile-teacher/lib/screens/settings_screen.dart#L86-L123)                        | 86-123 | Connect to actual preferences (6 instances)                     | S (4h) | Sprint 3 |
| 2   | [apps/mobile-teacher/lib/main.dart](apps/mobile-teacher/lib/main.dart#L461)                                                                  | 461    | Add dark theme support                                          | M (2d) | Sprint 3 |
| 3   | [apps/mobile-parent/lib/engagement/providers.dart](apps/mobile-parent/lib/engagement/providers.dart#L9)                                      | 9      | Inject properly configured Dio instance from auth/network layer | S (2h) | Sprint 3 |
| 4   | [apps/mobile-learner/lib/predictability/predictability_widgets.dart](apps/mobile-learner/lib/predictability/predictability_widgets.dart#L99) | 99     | Wire up \_updateProgress to schedule item interactions          | S (2h) | Sprint 3 |

**P3 Total: 12 Story Points**

---

## 🏃 Sprint Allocation Plan

### Sprint 1: Security & Critical Foundation (Focus: P0)

**Duration:** 2 weeks  
**Story Points:** 30  
**Theme:** Address all security gaps and authorization issues

| Task                                                   | Points | Owner Suggestion  |
| ------------------------------------------------------ | ------ | ----------------- |
| Create LTI system service account                      | 5      | Backend/Auth Team |
| Fix authorization gaps (research-svc, marketplace-svc) | 5      | Backend Team      |
| Implement tenant policy checks                         | 3      | Backend Team      |
| Consent renewal reminders (FERPA/COPPA)                | 5      | Backend Team      |
| Fix billing tenant filtering                           | 3      | Backend Team      |
| Auth fixes for web-creator & web-district              | 5      | Frontend Team     |
| Virtual Brain curriculum integration                   | 4      | AI Team           |

---

### Sprint 2: Core Functionality & API Integration (Focus: P1 + P2)

**Duration:** 2 weeks  
**Story Points:** 60  
**Theme:** Complete backend integrations and mobile navigation

| Task                                                              | Points | Owner Suggestion |
| ----------------------------------------------------------------- | ------ | ---------------- |
| Analytics service integration (realtime, content, embedded-tools) | 10     | Backend Team     |
| Metrics service integration (import-export, billing)              | 8      | Backend Team     |
| Background job infrastructure (NATS, job queue)                   | 5      | Platform Team    |
| Web teacher/district API integrations                             | 8      | Frontend Team    |
| Marketplace actions (approve, revoke, install)                    | 8      | Frontend Team    |
| Platform admin billing API endpoints                              | 5      | Backend/Frontend |
| Mobile Teacher navigation completion                              | 8      | Mobile Team      |
| Mobile Parent quick actions (phone, email, video links)           | 4      | Mobile Team      |
| Audit pagination and data fetching                                | 4      | Frontend Team    |

---

### Sprint 3: UX Polish & Tech Debt (Focus: P2 + P3)

**Duration:** 2 weeks  
**Story Points:** 57  
**Theme:** Complete UX features and address technical debt

| Task                                                   | Points | Owner Suggestion |
| ------------------------------------------------------ | ------ | ---------------- |
| AI integration (focus-svc, explainability)             | 10     | AI Team          |
| Collaboration analytics fact tables                    | 8      | Analytics Team   |
| Webhook notifications                                  | 3      | Backend Team     |
| Mobile Teacher media pickers (photo, camera, document) | 6      | Mobile Team      |
| Mobile Parent messaging features                       | 6      | Mobile Team      |
| Mobile Learner game navigation                         | 6      | Mobile Team      |
| Settings preferences persistence                       | 4      | Mobile Team      |
| Dark theme support                                     | 5      | Mobile Team      |
| Dependency injection cleanup                           | 3      | Mobile Team      |
| Research dataset templates                             | 3      | Frontend Team    |
| Newsletter API                                         | 2      | Marketing Team   |

---

## 📈 Effort Distribution

```
Backend Services:  ████████████████████ 58 SP (39%)
Mobile Apps:       ██████████████████   59 SP (40%)
Web Apps:          ██████████           30 SP (20%)
```

## 🎯 Recommendations

### Immediate Actions (This Week)

1. **P0-1:** Create system service account for LTI - blocks external integrations
2. **P0-2:** Fix authorization in research-svc - potential data leak
3. **P0-5:** Consent renewal reminders - compliance risk

### Quick Wins (< 4 hours each)

- 15 navigation TODOs in mobile apps are simple `Navigator.push()` additions
- 5 URL launcher TODOs (phone, email, video links) can use `url_launcher` package
- Goal filtering is a trivial query addition

### Blocking Dependencies

- Virtual Brain curriculum update (P1-1) blocks learner personalization
- Analytics fact tables (P1-17, P1-18) block collaboration dashboards
- Metrics service integration (P1-4 through P1-7) can be batched

### Consider Deprioritizing

- Dark theme (P3-2) - nice to have, not user-impacting
- Newsletter API (P1-22) - marketing, not core product

---

## ✅ Tracking

| Sprint    | Planned SP | Status      |
| --------- | ---------- | ----------- |
| Sprint 1  | 30         | Not Started |
| Sprint 2  | 60         | Not Started |
| Sprint 3  | 57         | Not Started |
| **Total** | **147**    | -           |

---

_Report generated by analyzing TODO/FIXME/HACK comments in production code._
_Excludes: node_modules, .next, build, dist, coverage, test files where noted._
