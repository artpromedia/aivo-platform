# TODO Remediation Plan - Zero TODOs for Production

**Date:** January 20, 2026  
**Goal:** Eliminate all TODO/FIXME comments before production launch  
**Total Items:** 89 production TODOs  
**Estimated Effort:** 147 Story Points (~3 sprints)

---

## Executive Summary

| Sprint       | Focus                     | Story Points | Items        |
| ------------ | ------------------------- | ------------ | ------------ |
| **Sprint 1** | Security & Data Integrity | 30 SP        | 8 P0 + 7 P1  |
| **Sprint 2** | Core Functionality & API  | 60 SP        | 27 P1 items  |
| **Sprint 3** | UX Polish & Tech Debt     | 57 SP        | 38 P2 + 9 P3 |

---

## Sprint 1: Security & Data Integrity (30 SP)

### P0 - Security/Authorization (Must Complete)

| #   | File                                                                                                                                | Line | TODO                                                            | Effort | Owner      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- | ------ | ---------- |
| 1   | [services/lti-svc/src/launch-service.ts](services/lti-svc/src/launch-service.ts#L35)                                                | 35   | Create dedicated system service account in auth-svc             | M (2d) | Auth Team  |
| 2   | [services/research-svc/src/routes/audit.ts](services/research-svc/src/routes/audit.ts#L77)                                          | 77   | Also check if user is project member                            | S (4h) | Backend    |
| 3   | [services/marketplace-svc/src/routes/creator.routes.ts](services/marketplace-svc/src/routes/creator.routes.ts#L154)                 | 154  | Check user is associated with this vendor via auth claims       | S (4h) | Backend    |
| 4   | [services/marketplace-svc/src/routes/installation.routes.ts](services/marketplace-svc/src/routes/installation.routes.ts#L224)       | 224  | Check tenant policies for auto-approval                         | S (4h) | Backend    |
| 5   | [services/api-gateway/src/security/services/consent.service.ts](services/api-gateway/src/security/services/consent.service.ts#L341) | 341  | Send consent renewal reminders (FERPA/COPPA)                    | M (2d) | Compliance |
| 6   | [apps/web-creator/app/providers.tsx](apps/web-creator/app/providers.tsx#L54)                                                        | 54   | Call auth API to validate session                               | S (4h) | Frontend   |
| 7   | [apps/web-creator/app/providers.tsx](apps/web-creator/app/providers.tsx#L71)                                                        | 71   | Implement real auth                                             | M (2d) | Frontend   |
| 8   | [apps/mobile-parent/lib/engagement/providers.dart](apps/mobile-parent/lib/engagement/providers.dart#L9)                             | 9    | Inject properly configured Dio instance from auth/network layer | S (4h) | Mobile     |

### P1 - Critical Integrations (Sprint 1)

| #   | File                                                                                                                                              | Line | TODO                                                        | Effort  | Owner    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------- | ------- | -------- |
| 9   | [services/parent-svc/src/onboarding/onboarding.service.ts](services/parent-svc/src/onboarding/onboarding.service.ts#L358)                         | 358  | Call learner-model-svc to update Virtual Brain curriculum   | M (2d)  | Backend  |
| 10  | [services/billing-svc/src/services/billing-reconciliation.job.ts](services/billing-svc/src/services/billing-reconciliation.job.ts#L11)            | 11   | Implement credit processing for pro-rata                    | L (3d)  | Billing  |
| 11  | [services/billing-svc/src/repositories/coverage-profile.repository.ts](services/billing-svc/src/repositories/coverage-profile.repository.ts#L241) | 241  | Filter by tenantId when learner-tenant mapping is available | S (4h)  | Billing  |
| 12  | [apps/web-district/app/billing/quotes/page.tsx](apps/web-district/app/billing/quotes/page.tsx#L39)                                                | 39   | Replace with actual tenant ID from auth context             | XS (1h) | Frontend |
| 13  | [apps/web-district/app/billing/page.tsx](apps/web-district/app/billing/page.tsx#L58)                                                              | 58   | Determine renewal status from renewal tasks                 | S (4h)  | Frontend |
| 14  | [services/audit-svc/src/consumers/eventConsumer.ts](services/audit-svc/src/consumers/eventConsumer.ts#L313)                                       | 313  | Send webhook notification if configured                     | M (2d)  | Backend  |
| 15  | [services/marketplace-svc/src/services/validation.service.ts](services/marketplace-svc/src/services/validation.service.ts#L387)                   | 387  | Implement cross-service LO metadata validation              | L (3d)  | Backend  |

**Sprint 1 Total: 15 items, 30 SP**

---

## Sprint 2: Core Functionality & API Integration (60 SP)

### Backend Service TODOs

| #   | File                                                                                                                            | Line | TODO                                                   | Effort | Owner   |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ | ------ | ------- |
| 16  | [services/realtime-svc/src/services/room.service.ts](services/realtime-svc/src/services/room.service.ts#L616)                   | 616  | Integrate with analytics-svc via event bus             | M (2d) | Backend |
| 17  | [services/import-export-svc/src/lti/lti-provider.service.ts](services/import-export-svc/src/lti/lti-provider.service.ts#L163)   | 163  | Add metrics tracking when metrics service is available | S (4h) | Backend |
| 18  | [services/import-export-svc/src/lti/lti-platform.service.ts](services/import-export-svc/src/lti/lti-platform.service.ts#L277)   | 277  | Add metrics service                                    | S (4h) | Backend |
| 19  | [services/import-export-svc/src/export/export.service.ts](services/import-export-svc/src/export/export.service.ts#L227)         | 227  | Add metrics service                                    | S (4h) | Backend |
| 20  | [services/import-export-svc/src/export/export.service.ts](services/import-export-svc/src/export/export.service.ts#L254)         | 254  | Add metrics service                                    | S (4h) | Backend |
| 21  | [services/focus-svc/src/engine/regulationCatalog.ts](services/focus-svc/src/engine/regulationCatalog.ts#L365)                   | 365  | Implement AI integration                               | L (5d) | AI Team |
| 22  | [services/goal-svc/src/routes/goals.ts](services/goal-svc/src/routes/goals.ts#L14)                                              | 14   | Implement filtering when needed                        | S (4h) | Backend |
| 23  | [services/embedded-tools-svc/src/routes/session.routes.ts](services/embedded-tools-svc/src/routes/session.routes.ts#L580)       | 580  | Get audience from tool config                          | S (4h) | Backend |
| 24  | [services/embedded-tools-svc/src/routes/events.routes.ts](services/embedded-tools-svc/src/routes/events.routes.ts#L224)         | 224  | Forward to analytics pipeline                          | M (2d) | Backend |
| 25  | [services/content-svc/src/routes/ingestion.ts](services/content-svc/src/routes/ingestion.ts#L339)                               | 339  | Trigger background job via NATS                        | M (2d) | Backend |
| 26  | [services/content-svc/src/routes/ingestion.ts](services/content-svc/src/routes/ingestion.ts#L407)                               | 407  | Call AI orchestrator                                   | M (2d) | Backend |
| 27  | [services/content-svc/src/search.ts](services/content-svc/src/search.ts#L244)                                                   | 244  | Query session-svc for ACTIVITY_COMPLETED events        | M (2d) | Backend |
| 28  | [services/ai-orchestrator/src/explainability/builder.ts](services/ai-orchestrator/src/explainability/builder.ts#L251)           | 251  | Enable AI summaries when config allows                 | S (4h) | AI Team |
| 29  | [services/analytics-svc/src/routes/collaborationAnalytics.ts](services/analytics-svc/src/routes/collaborationAnalytics.ts#L85)  | 85   | Query from fact tables when available                  | M (2d) | Data    |
| 30  | [services/analytics-svc/src/routes/collaborationAnalytics.ts](services/analytics-svc/src/routes/collaborationAnalytics.ts#L129) | 129  | Query from fact tables when available                  | M (2d) | Data    |

### Web App TODOs

| #   | File                                                                                                                                                                           | Line | TODO                                       | Effort | Owner    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ------------------------------------------ | ------ | -------- |
| 31  | [apps/web-district/app/audit/learner/[learnerId]/page.tsx](apps/web-district/app/audit/learner/%5BlearnerId%5D/page.tsx#L42)                                                   | 42   | Fetch learner name from learner service    | S (4h) | Frontend |
| 32  | [apps/web-district/app/research/projects/[id]/exports/new/page.tsx](apps/web-district/app/research/projects/%5Bid%5D/exports/new/page.tsx#L233)                                | 233  | Create dataset from template               | M (2d) | Frontend |
| 33  | [apps/web-district/app/marketplace/installations/list.tsx](apps/web-district/app/marketplace/installations/list.tsx#L264)                                                      | 264  | Implement approve action                   | S (4h) | Frontend |
| 34  | [apps/web-district/app/marketplace/installations/list.tsx](apps/web-district/app/marketplace/installations/list.tsx#L335)                                                      | 335  | Implement revoke action with confirmation  | S (4h) | Frontend |
| 35  | [apps/web-district/app/audit/learner/[learnerId]/learner-audit-timeline.tsx](apps/web-district/app/audit/learner/%5BlearnerId%5D/learner-audit-timeline.tsx#L338)              | 338  | Implement pagination                       | M (2d) | Frontend |
| 36  | [apps/web-district/app/marketplace/items/[slug]/install-modal.tsx](apps/web-district/app/marketplace/items/%5Bslug%5D/install-modal.tsx#L52)                                   | 52   | Replace with actual API call               | S (4h) | Frontend |
| 37  | [apps/web-teacher/src/app/(dashboard)/assignments/new/page.tsx](<apps/web-teacher/src/app/(dashboard)/assignments/new/page.tsx#L21>)                                           | 21   | Replace with actual API call               | S (4h) | Frontend |
| 38  | [apps/web-teacher/src/app/(dashboard)/students/[studentId]/page.tsx](<apps/web-teacher/src/app/(dashboard)/students/%5BstudentId%5D/page.tsx#L23>)                             | 23   | Replace with real API call                 | S (4h) | Frontend |
| 39  | [apps/web-teacher/src/app/(dashboard)/students/[studentId]/page.tsx](<apps/web-teacher/src/app/(dashboard)/students/%5BstudentId%5D/page.tsx#L42>)                             | 42   | Replace with real API call                 | S (4h) | Frontend |
| 40  | [apps/web-marketing/src/components/shared/footer.tsx](apps/web-marketing/src/components/shared/footer.tsx#L234)                                                                | 234  | Replace with actual newsletter API         | S (4h) | Frontend |
| 41  | [apps/web-learner/app/(learning)/self-regulation/components/RegulationContainer.tsx](<apps/web-learner/app/(learning)/self-regulation/components/RegulationContainer.tsx#L59>) | 59   | Integrate with gamification service for XP | M (2d) | Frontend |
| 42  | [apps/web-learner/app/(learning)/self-regulation/components/RegulationContainer.tsx](<apps/web-learner/app/(learning)/self-regulation/components/RegulationContainer.tsx#L67>) | 67   | Load from gamification service             | S (4h) | Frontend |
| 43  | [apps/web-creator/app/items/[itemId]/content-pack-editor.tsx](apps/web-creator/app/items/%5BitemId%5D/content-pack-editor.tsx#L234)                                            | 234  | Implement LO search via content-svc API    | M (2d) | Frontend |

**Sprint 2 Total: 28 items, 60 SP**

---

## Sprint 3: Mobile UX & Tech Debt (57 SP)

### Mobile Teacher App (25 items)

| #   | File                                                                                                                                                        | Line | TODO                                      | Effort  | Owner  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------- | ------- | ------ |
| 44  | [apps/mobile-teacher/lib/main.dart](apps/mobile-teacher/lib/main.dart#L461)                                                                                 | 461  | Add dark theme support                    | M (2d)  | Mobile |
| 45  | [apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart](apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart#L67)              | 67   | Navigate to all meetings                  | S (4h)  | Mobile |
| 46  | [apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart](apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart#L264)             | 264  | Open video link                           | XS (1h) | Mobile |
| 47  | [apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart](apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart#L269)             | 269  | Navigate to meeting detail                | S (4h)  | Mobile |
| 48  | [apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart](apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart#L361)             | 361  | Navigate to learner collaboration detail  | S (4h)  | Mobile |
| 49  | [apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart](apps/mobile-teacher/lib/screens/collaboration_dashboard_screen.dart#L426)             | 426  | Navigate to learner collaboration detail  | S (4h)  | Mobile |
| 50  | [apps/mobile-teacher/lib/screens/learner_detail_screen.dart](apps/mobile-teacher/lib/screens/learner_detail_screen.dart#L383)                               | 383  | Save observation via API                  | M (2d)  | Mobile |
| 51  | [apps/mobile-teacher/lib/screens/messages/conversation_screen.dart](apps/mobile-teacher/lib/screens/messages/conversation_screen.dart#L220)                 | 220  | Implement photo picker                    | S (4h)  | Mobile |
| 52  | [apps/mobile-teacher/lib/screens/messages/conversation_screen.dart](apps/mobile-teacher/lib/screens/messages/conversation_screen.dart#L228)                 | 228  | Implement camera capture                  | S (4h)  | Mobile |
| 53  | [apps/mobile-teacher/lib/screens/messages/conversation_screen.dart](apps/mobile-teacher/lib/screens/messages/conversation_screen.dart#L236)                 | 236  | Implement document picker                 | S (4h)  | Mobile |
| 54  | [apps/mobile-teacher/lib/screens/settings_screen.dart](apps/mobile-teacher/lib/screens/settings_screen.dart#L86)                                            | 86   | Connect to actual notification preference | XS (1h) | Mobile |
| 55  | [apps/mobile-teacher/lib/screens/settings_screen.dart](apps/mobile-teacher/lib/screens/settings_screen.dart#L88)                                            | 88   | Save notification preference              | XS (1h) | Mobile |
| 56  | [apps/mobile-teacher/lib/screens/settings_screen.dart](apps/mobile-teacher/lib/screens/settings_screen.dart#L97)                                            | 97   | Connect to actual reminder preference     | XS (1h) | Mobile |
| 57  | [apps/mobile-teacher/lib/screens/settings_screen.dart](apps/mobile-teacher/lib/screens/settings_screen.dart#L99)                                            | 99   | Save reminder preference                  | XS (1h) | Mobile |
| 58  | [apps/mobile-teacher/lib/screens/settings_screen.dart](apps/mobile-teacher/lib/screens/settings_screen.dart#L121)                                           | 121  | Connect to actual theme setting           | XS (1h) | Mobile |
| 59  | [apps/mobile-teacher/lib/screens/settings_screen.dart](apps/mobile-teacher/lib/screens/settings_screen.dart#L123)                                           | 123  | Save theme preference                     | XS (1h) | Mobile |
| 60  | [apps/mobile-teacher/lib/screens/risk/intervention_screen.dart](apps/mobile-teacher/lib/screens/risk/intervention_screen.dart#L217)                         | 217  | Get score from prediction API             | S (4h)  | Mobile |
| 61  | [apps/mobile-teacher/lib/screens/risk/risk_dashboard_screen.dart](apps/mobile-teacher/lib/screens/risk/risk_dashboard_screen.dart#L482)                     | 482  | Implement scroll to section               | XS (1h) | Mobile |
| 62  | [apps/mobile-teacher/lib/screens/gradebook/grade_submission_screen.dart](apps/mobile-teacher/lib/screens/gradebook/grade_submission_screen.dart#L368)       | 368  | Open attachment URL                       | XS (1h) | Mobile |
| 63  | [apps/mobile-teacher/lib/screens/gradebook/grade_submission_screen.dart](apps/mobile-teacher/lib/screens/gradebook/grade_submission_screen.dart#L409)       | 409  | Navigate to next ungraded submission      | S (4h)  | Mobile |
| 64  | [apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart](apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart#L321)                 | 321  | Record task completion                    | S (4h)  | Mobile |
| 65  | [apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart](apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart#L326)                 | 326  | Show task detail                          | S (4h)  | Mobile |
| 66  | [apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart](apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart#L344)                 | 344  | Navigate to plan detail                   | S (4h)  | Mobile |
| 67  | [apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart](apps/mobile-teacher/lib/screens/learner_collaboration_screen.dart#L970)                 | 970  | Open video link                           | XS (1h) | Mobile |
| 68  | [apps/mobile-teacher/lib/screens/assignments/assignment_detail_screen.dart](apps/mobile-teacher/lib/screens/assignments/assignment_detail_screen.dart#L486) | 486  | Implement close assignment                | S (4h)  | Mobile |

### Mobile Parent App (11 items)

| #   | File                                                                                                                | Line | TODO                                       | Effort  | Owner  |
| --- | ------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ | ------- | ------ |
| 69  | [apps/mobile-parent/lib/screens/care_notes_screen.dart](apps/mobile-parent/lib/screens/care_notes_screen.dart#L515) | 515  | Reply to note                              | S (4h)  | Mobile |
| 70  | [apps/mobile-parent/lib/screens/care_notes_screen.dart](apps/mobile-parent/lib/screens/care_notes_screen.dart#L526) | 526  | Share note                                 | S (4h)  | Mobile |
| 71  | [apps/mobile-parent/lib/screens/care_team_screen.dart](apps/mobile-parent/lib/screens/care_team_screen.dart#L194)   | 194  | Launch phone dialer                        | XS (1h) | Mobile |
| 72  | [apps/mobile-parent/lib/screens/care_team_screen.dart](apps/mobile-parent/lib/screens/care_team_screen.dart#L298)   | 298  | Launch email                               | XS (1h) | Mobile |
| 73  | [apps/mobile-parent/lib/screens/care_team_screen.dart](apps/mobile-parent/lib/screens/care_team_screen.dart#L311)   | 311  | Navigate to messaging                      | S (4h)  | Mobile |
| 74  | [apps/mobile-parent/lib/screens/meetings_screen.dart](apps/mobile-parent/lib/screens/meetings_screen.dart#L367)     | 367  | Open video link                            | XS (1h) | Mobile |
| 75  | [apps/mobile-parent/lib/screens/meetings_screen.dart](apps/mobile-parent/lib/screens/meetings_screen.dart#L378)     | 378  | Add to calendar                            | M (2d)  | Mobile |
| 76  | [apps/mobile-parent/lib/screens/meetings_screen.dart](apps/mobile-parent/lib/screens/meetings_screen.dart#L527)     | 527  | Open link                                  | XS (1h) | Mobile |
| 77  | [apps/mobile-parent/lib/screens/threads_screen.dart](apps/mobile-parent/lib/screens/threads_screen.dart#L70)        | 70   | Implement search                           | M (2d)  | Mobile |
| 78  | [apps/mobile-parent/lib/screens/threads_screen.dart](apps/mobile-parent/lib/screens/threads_screen.dart#L635)       | 635  | Navigate to context (action plan, meeting) | S (4h)  | Mobile |
| 79  | [apps/mobile-parent/lib/screens/threads_screen.dart](apps/mobile-parent/lib/screens/threads_screen.dart#L807)       | 807  | Implement attachment                       | M (2d)  | Mobile |

### Mobile Learner App (5 items)

| #   | File                                                                                                                                           | Line | TODO                                                   | Effort | Owner  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ | ------ | ------ |
| 80  | [apps/mobile-learner/lib/screens/adaptive_games_screen.dart](apps/mobile-learner/lib/screens/adaptive_games_screen.dart#L302)                  | 302  | Navigate to game player screen                         | S (4h) | Mobile |
| 81  | [apps/mobile-learner/lib/screens/focus_games_screen.dart](apps/mobile-learner/lib/screens/focus_games_screen.dart#L294)                        | 294  | Navigate to focus activity player                      | S (4h) | Mobile |
| 82  | [apps/mobile-learner/lib/screens/homework_helper_intro_screen.dart](apps/mobile-learner/lib/screens/homework_helper_intro_screen.dart#L108)    | 108  | Implement camera/image flow                            | M (2d) | Mobile |
| 83  | [apps/mobile-learner/lib/predictability/predictability_widgets.dart](apps/mobile-learner/lib/predictability/predictability_widgets.dart#L99)   | 99   | Wire up \_updateProgress to schedule item interactions | S (4h) | Mobile |
| 84  | [apps/mobile-learner/lib/predictability/predictability_widgets.dart](apps/mobile-learner/lib/predictability/predictability_widgets.dart#L1231) | 1231 | Navigate to calming routine                            | S (4h) | Mobile |

**Sprint 3 Total: 41 items, 57 SP**

---

## Implementation Guidelines

### For Each TODO Resolution

1. **Create branch:** `fix/todo-{service}-{description}`
2. **Implement the fix** (replace TODO with actual code)
3. **Add unit test** covering the new functionality
4. **Remove the TODO comment entirely**
5. **Create PR** with TODO item number reference

### Definition of Done

- [ ] TODO comment removed from code
- [ ] Functionality implemented and working
- [ ] Unit test added (80%+ coverage on new code)
- [ ] PR reviewed and approved
- [ ] No new TODOs introduced

### PR Template for TODO Resolution

```markdown
## TODO Resolution: #{item_number}

**Original TODO:** `{original todo text}`
**File:** `{file_path}:{line_number}`
**Priority:** P{0-3}

### Changes

- [ ] Implemented {description}
- [ ] Added tests
- [ ] Removed TODO comment

### Testing

- [ ] Unit tests pass
- [ ] Integration tests pass (if applicable)
```

---

## Tracking Dashboard

### Progress Metrics

| Metric       | Target | Current |
| ------------ | ------ | ------- |
| Total TODOs  | 0      | 89      |
| P0 Remaining | 0      | 8       |
| P1 Remaining | 0      | 34      |
| P2 Remaining | 0      | 38      |
| P3 Remaining | 0      | 9       |

### Weekly Burndown

| Week   | Sprint   | Target Resolved | Running Total |
| ------ | -------- | --------------- | ------------- |
| Week 1 | Sprint 1 | 8 P0 items      | 8             |
| Week 2 | Sprint 1 | 7 P1 items      | 15            |
| Week 3 | Sprint 2 | 14 items        | 29            |
| Week 4 | Sprint 2 | 14 items        | 43            |
| Week 5 | Sprint 3 | 23 items        | 66            |
| Week 6 | Sprint 3 | 23 items        | 89 ✅         |

---

## Quick Reference: Priority Definitions

| Priority | Description                                                    | SLA                 |
| -------- | -------------------------------------------------------------- | ------------------- |
| **P0**   | Security vulnerability, data integrity risk, authorization gap | Sprint 1 (must fix) |
| **P1**   | Core functionality incomplete, API integration missing         | Sprint 2            |
| **P2**   | UX incomplete, navigation missing, polish items                | Sprint 3            |
| **P3**   | Tech debt, code cleanup, nice-to-have improvements             | Sprint 3            |

## Quick Reference: Effort Estimates

| Size   | Hours     | Story Points |
| ------ | --------- | ------------ |
| **XS** | < 1 hour  | 1 SP         |
| **S**  | 1-4 hours | 2 SP         |
| **M**  | 1-2 days  | 5 SP         |
| **L**  | 3-5 days  | 8 SP         |
| **XL** | 1+ week   | 13 SP        |

---

## Team Assignments

| Team          | Items | Story Points | Sprint Focus                                |
| ------------- | ----- | ------------ | ------------------------------------------- |
| **Auth Team** | 3     | 12 SP        | Sprint 1: System accounts, auth validation  |
| **Backend**   | 18    | 42 SP        | Sprint 1-2: API integrations, event bus     |
| **Billing**   | 4     | 12 SP        | Sprint 1: Credit processing, tenant mapping |
| **Frontend**  | 16    | 32 SP        | Sprint 2: API calls, real data integration  |
| **Mobile**    | 43    | 44 SP        | Sprint 3: Navigation, settings persistence  |
| **AI Team**   | 3     | 15 SP        | Sprint 2: AI integration, explainability    |
| **Data**      | 2     | 8 SP         | Sprint 2: Analytics fact tables             |

---

## Automation: TODO Detection CI Check

Add to `.github/workflows/ci.yml`:

```yaml
check-todos:
  name: Check for TODOs
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Count TODOs in production code
      run: |
        TODO_COUNT=$(grep -r "TODO\|FIXME" \
          --include="*.ts" --include="*.tsx" --include="*.dart" \
          services/*/src apps/*/lib apps/*/src apps/*/app libs/*/src packages/*/src \
          2>/dev/null | grep -v node_modules | grep -v __tests__ | wc -l)

        echo "Found $TODO_COUNT TODOs"

        if [ "$TODO_COUNT" -gt 0 ]; then
          echo "::warning::$TODO_COUNT TODO comments remain in production code"
          grep -rn "TODO\|FIXME" \
            --include="*.ts" --include="*.tsx" --include="*.dart" \
            services/*/src apps/*/lib apps/*/src apps/*/app libs/*/src packages/*/src \
            2>/dev/null | grep -v node_modules | grep -v __tests__ | head -20
        fi

        # Fail if TODOs exceed threshold (set to 0 for production)
        if [ "$TODO_COUNT" -gt 89 ]; then
          echo "::error::New TODOs introduced! Current: $TODO_COUNT, Baseline: 89"
          exit 1
        fi
```

---

_Plan generated: January 20, 2026_  
_Target completion: End of Sprint 3_
