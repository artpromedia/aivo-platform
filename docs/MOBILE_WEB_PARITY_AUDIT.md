# Mobile-Web Feature Parity Audit

## Executive Summary

This document presents a comprehensive audit comparing web and mobile applications across the AIVO platform to identify feature gaps in mobile apps that need to be addressed to achieve parity with their web counterparts.

### Apps Audited

| Role | Web App | Mobile App | Gap Severity |
|------|---------|------------|--------------|
| Learner | web-learner | mobile-learner | **LOW** |
| Teacher | web-teacher | mobile-teacher | **HIGH** |
| Parent | web-parent | mobile-parent | **MEDIUM** |

---

## 1. LEARNER APPS COMPARISON

### Overview
The mobile-learner app is actually **more feature-rich** than web-learner in many areas, particularly for neurodivergent learner support. The web-learner is still in early development with many routes marked "coming soon."

### Web-Learner Features (Current State)
- ✅ Landing page with class code entry
- ✅ SSO authentication (Google, Microsoft)
- ✅ Basic lesson player (referenced in tests)
- ✅ Gamification display (XP, levels, streaks, achievements)
- ✅ Dashboard with today's plan
- ✅ Course catalog and enrollment
- ✅ Search functionality
- ✅ COPPA parental controls
- ✅ Service worker offline support
- ✅ Performance monitoring
- ✅ Accessibility (WCAG A compliance)

### Mobile-Learner Features
- ✅ SSO + PIN authentication (Clever, ClassLink, Google, Microsoft)
- ✅ Today's plan with AI-powered generation
- ✅ Activity/lesson player with multiple question types
- ✅ Gamification (XP, levels, streaks, badges, leaderboards, daily goals)
- ✅ Baseline assessments
- ✅ Homework helper with AI-powered scaffolding
- ✅ Focus games and adaptive games
- ✅ **Social stories** (ND-specific)
- ✅ **Motor accessibility accommodations** (ND-specific)
- ✅ **Emotional support & regulation tools** (ND-specific)
- ✅ **Visual schedule & predictability** (ND-specific)
- ✅ **Sensory profile matching** (ND-specific)
- ✅ **Scratch pad for math** (handwriting recognition)
- ✅ Teams/collaboration features
- ✅ Comprehensive offline support with sync engine
- ✅ Transitions and animations

### Feature Gaps in Mobile-Learner (vs Web)
| Gap | Priority | Notes |
|-----|----------|-------|
| Full course catalog browsing | Low | Mobile focuses on today's plan |
| Search across content | Medium | Mobile has activity-based navigation |
| MFA/2FA support | Low | Web has TOTP, mobile uses PIN |

### Feature Gaps in Web-Learner (vs Mobile) - **Web needs to catch up**
| Gap | Priority | Notes |
|-----|----------|-------|
| Baseline assessment flow | High | Critical for personalization |
| Homework helper | High | Key engagement feature |
| Focus/adaptive games | High | Gamification core |
| Social stories | Medium | ND support |
| Motor accessibility | Medium | ND support |
| Emotional support/regulation | Medium | ND support |
| Visual schedule | Medium | ND support |
| Sensory profile | Medium | ND support |
| Scratch pad (math) | Medium | Learning aid |
| Teams features | Low | Collaboration |

### Recommendation for Learner Apps
**The web-learner needs significant development to catch up with mobile-learner.** Mobile is the reference implementation. No immediate mobile work needed for parity.

---

## 2. TEACHER APPS COMPARISON

### Overview
The web-teacher app is significantly more feature-rich than mobile-teacher. Mobile-teacher serves as a "field companion" while web is the full classroom management system.

### Web-Teacher Features
#### Classroom & Student Management
- ✅ Full classroom management dashboard
- ✅ Student roster with detailed profiles
- ✅ Real-time classroom monitoring with heatmaps
- ✅ Live activity feed with WebSocket updates
- ✅ Student focus state tracking
- ✅ Presence tracking

#### Analytics & Reporting
- ✅ **Comprehensive analytics dashboard**
- ✅ **Engagement analytics**
- ✅ **Skill mastery matrix**
- ✅ **At-risk students panel**
- ✅ **Student detail views with charts**
- ✅ Class overview dashboards

#### Risk Prediction & Early Warning
- ✅ **Student risk prediction system** (14K+ lines)
- ✅ Risk levels (low, moderate, high, critical)
- ✅ Risk categories (academic, engagement, behavioral, temporal)
- ✅ **Intervention recommendations**
- ✅ Intervention plan management
- ✅ Early warning reports

#### Assignments & Grading
- ✅ Full assignment builder
- ✅ **Rubric builder**
- ✅ **Assessment builder** with multiple question types
- ✅ **Grading queue**
- ✅ Bulk grading operations
- ✅ Standards-based grading
- ✅ Grade import/export

#### Lesson Planning & Content
- ✅ **Content marketplace/library**
- ✅ **Lesson builder** with drag-and-drop
- ✅ Content browser
- ✅ **Lesson preview**
- ✅ Content sharing

#### Gamification Controls
- ✅ **Teacher gamification controls**
- ✅ **Class challenge creator**
- ✅ Leaderboard management
- ✅ XP multiplier settings
- ✅ Rewards shop configuration
- ✅ Achievement grid management
- ✅ Feature toggles for gamification

#### IEP Support
- ✅ **IEP progress dashboard**
- ✅ IEP goal tracker
- ✅ Objectives management
- ✅ Progress entry logging
- ✅ Services tracking
- ✅ Accommodation badges

#### SEL (Social-Emotional Learning)
- ✅ **SEL observation form**
- ✅ SEL overview dashboard
- ✅ Student SEL cards

#### Integrations
- ✅ **Google Classroom OAuth integration**
- ✅ **Grade passback to LMS**
- ✅ **Assignment posting to LMS**
- ✅ Sync history viewer
- ✅ **LTI 1.3 support**

#### Communication
- ✅ Teacher messaging system
- ✅ Message templates
- ✅ Attachments

#### Calendar & Scheduling
- ✅ Calendar/event management
- ✅ Recurrence rules

### Mobile-Teacher Features
#### Classroom & Student Management
- ✅ Class listing and roster
- ✅ Student list with search/filter
- ✅ Student detail view
- ✅ Students needing attention flags
- ✅ Basic classroom monitoring

#### Session Management
- ✅ Session planning and execution
- ✅ Live session with notes
- ✅ Session log

#### Assignments & Grading
- ✅ Assignment list and detail
- ✅ Basic gradebook
- ✅ Grade submission
- ⚠️ No rubric builder
- ⚠️ No assessment builder

#### IEP Support
- ✅ IEP goal tracking
- ✅ IEP reports
- ⚠️ Limited compared to web

#### Reporting
- ✅ Basic class analytics
- ✅ IEP progress reports
- ⚠️ Limited analytics depth

#### Communication
- ✅ Parent messaging
- ✅ Conversation threads

#### Care Team Collaboration
- ✅ Care team management
- ✅ Action plans
- ✅ Care notes
- ✅ Meeting coordination

#### Offline Support
- ✅ Comprehensive offline-first architecture
- ✅ Background sync

### Feature Gaps in Mobile-Teacher

| Gap ID | Feature | Priority | Complexity | Notes |
|--------|---------|----------|------------|-------|
| MT-001 | **Risk Prediction System** | HIGH | High | Critical for early intervention |
| MT-002 | **Intervention Recommendations** | HIGH | High | Part of risk system |
| MT-003 | **Analytics Dashboard** | HIGH | Medium | Comprehensive class insights |
| MT-004 | **Skill Mastery Matrix** | HIGH | Medium | Visual skill tracking |
| MT-005 | **Engagement Analytics** | HIGH | Medium | Engagement trends |
| MT-006 | **Assessment Builder** | HIGH | High | Create assessments on mobile |
| MT-007 | **Rubric Builder** | MEDIUM | Medium | For consistent grading |
| MT-008 | **Grading Queue** | MEDIUM | Medium | Prioritized grading |
| MT-009 | **Content Marketplace/Library** | MEDIUM | Medium | Browse/assign content |
| MT-010 | **Lesson Builder** | LOW | High | Complex for mobile UX |
| MT-011 | **Gamification Controls** | MEDIUM | Medium | Manage class rewards |
| MT-012 | **Class Challenge Creator** | MEDIUM | Medium | Create challenges |
| MT-013 | **Leaderboard Management** | LOW | Low | Configure leaderboards |
| MT-014 | **Real-time Heatmap View** | MEDIUM | Medium | Visual monitoring |
| MT-015 | **SEL Observation Tools** | MEDIUM | Medium | SEL data collection |
| MT-016 | **LMS Integration** | HIGH | High | Google Classroom sync |
| MT-017 | **Grade Passback** | HIGH | Medium | Sync grades to LMS |
| MT-018 | **Calendar Integration** | LOW | Medium | Event management |
| MT-019 | **At-Risk Alerts Dashboard** | HIGH | Medium | Visual risk alerts |
| MT-020 | **Student Progress Charts** | MEDIUM | Medium | Visual progress |

---

## 3. PARENT APPS COMPARISON

### Overview
Both apps have strong feature sets. Web-parent has more sophisticated AI/cognitive visualizations while mobile-parent has better care team collaboration features.

### Web-Parent Features
#### Progress Monitoring
- ✅ Dashboard with key metrics
- ✅ Subject-by-subject progress
- ✅ Activity feed/timeline
- ✅ Weekly progress summaries
- ✅ PDF progress report download

#### Gamification Views
- ✅ **Streak widget** with calendar
- ✅ **Achievement badges** display
- ✅ Daily usage tracker
- ✅ Goal setting

#### Homework Monitoring
- ✅ Homework helper sessions view
- ✅ Session transcripts
- ✅ Progress tracking

#### AI/Cognitive Features
- ✅ **AI Brain Dashboard**
  - Learning goals tracking
  - Proactive intervention history
  - AI autonomy level control
  - Reasoning traces
- ✅ **Virtual Brain visualization**
  - Interactive skill network
  - Skill connections
  - Categories (cognitive, academic, social)
- ✅ **Difficulty recommendations**
  - AI recommendations
  - Approve/modify/deny actions

#### Communication
- ✅ Teacher messaging
- ✅ Teacher notes display
- ✅ Message status tracking

#### Settings
- ✅ Notification settings
- ✅ Screen time settings
- ✅ Privacy controls

#### Consent
- ✅ COPPA/FERPA consent management

#### Multi-Child
- ✅ Child selector dropdown
- ✅ Per-child views

### Mobile-Parent Features
#### Progress Monitoring
- ✅ Child progress screen
- ✅ Subject progress charts
- ✅ Homework focus analytics
- ✅ Progress reports (sharable)

#### Gamification Views
- ✅ Child engagement view
- ✅ Badges display
- ✅ Activity timeline
- ✅ Send kudos feature

#### AI/Cognitive Features
- ✅ **Virtual Brain screen**
- ✅ **Difficulty management**
  - Pending recommendations
  - Current levels
  - History

#### Baseline Assessment
- ✅ Baseline results view
- ✅ Accept/retest functionality

#### Subscription & Billing
- ✅ **Subscription management**
- ✅ **Module selection**
- ✅ **Payment setup**
- ⚠️ Not in web-parent

#### Care Team Collaboration
- ✅ **Care team management**
- ✅ **Action plans**
- ✅ **Care notes**
- ✅ **Meeting scheduling**
- ⚠️ Not in web-parent

#### Communication
- ✅ Parent-teacher messaging
- ✅ Threads screen

#### Settings
- ✅ Notification settings (parent + child)
- ✅ Accessibility settings

#### Consent
- ✅ Consent management

### Feature Gaps in Mobile-Parent

| Gap ID | Feature | Priority | Complexity | Notes |
|--------|---------|----------|------------|-------|
| MP-001 | **AI Brain Dashboard** | HIGH | High | Learning goals + interventions |
| MP-002 | **Intervention History View** | HIGH | Medium | See AI interventions |
| MP-003 | **AI Autonomy Controls** | MEDIUM | Medium | Parent control over AI |
| MP-004 | **Streak Widget with Calendar** | MEDIUM | Low | Visual streak calendar |
| MP-005 | **Daily Usage Tracker** | MEDIUM | Low | Usage breakdown |
| MP-006 | **Screen Time Settings** | MEDIUM | Medium | Limits configuration |
| MP-007 | **Homework Session Transcripts** | MEDIUM | Medium | View AI conversations |
| MP-008 | **Teacher Notes View** | LOW | Low | Notes from teachers |
| MP-009 | **PDF Report Download** | LOW | Low | Download progress PDFs |

### Feature Gaps in Web-Parent (Mobile has, Web doesn't)

| Gap ID | Feature | Priority | Notes |
|--------|---------|----------|-------|
| WP-001 | Subscription Management | HIGH | Billing in web |
| WP-002 | Care Team Collaboration | HIGH | Team management |
| WP-003 | Action Plans | HIGH | Collaborative planning |
| WP-004 | Care Notes | MEDIUM | Team notes |
| WP-005 | Meeting Scheduling | MEDIUM | Team meetings |
| WP-006 | Baseline Results View | MEDIUM | Assessment results |
| WP-007 | Send Kudos Feature | LOW | Parent recognition |

---

## 4. MISSING MOBILE APPS

The following web apps have **NO mobile equivalent**:

| Web App | Purpose | Mobile Need |
|---------|---------|-------------|
| web-author | Content/lesson authoring | LOW - Desktop workflow |
| web-creator | Content creation | LOW - Desktop workflow |
| web-district | District administration | MEDIUM - Admin on-the-go |
| web-platform-admin | Platform administration | LOW - Desktop workflow |
| web-dev-portal | Developer portal | NONE - Developer tool |
| web-marketing | Marketing website | NONE - Public site |

### Recommendation
- Consider a **mobile-admin** app for district administrators who need mobile access
- Content authoring tools are desktop-centric by nature

---

## 5. PRIORITY GAP SUMMARY

### Critical Priority (P0) - Must Fix
| App | Gap | Impact |
|-----|-----|--------|
| mobile-teacher | MT-001: Risk Prediction | Safety/intervention |
| mobile-teacher | MT-002: Intervention Recommendations | Safety/intervention |
| mobile-teacher | MT-016: LMS Integration | Core workflow |
| mobile-teacher | MT-017: Grade Passback | Core workflow |

### High Priority (P1) - Should Fix Soon
| App | Gap | Impact |
|-----|-----|--------|
| mobile-teacher | MT-003: Analytics Dashboard | Teacher insights |
| mobile-teacher | MT-004: Skill Mastery Matrix | Learning tracking |
| mobile-teacher | MT-005: Engagement Analytics | Engagement tracking |
| mobile-teacher | MT-006: Assessment Builder | Assessment workflow |
| mobile-teacher | MT-019: At-Risk Alerts | Safety visibility |
| mobile-parent | MP-001: AI Brain Dashboard | Parent transparency |
| mobile-parent | MP-002: Intervention History | AI visibility |

### Medium Priority (P2) - Plan for Future
| App | Gap | Impact |
|-----|-----|--------|
| mobile-teacher | MT-007: Rubric Builder | Grading quality |
| mobile-teacher | MT-008: Grading Queue | Grading efficiency |
| mobile-teacher | MT-009: Content Marketplace | Content access |
| mobile-teacher | MT-011: Gamification Controls | Engagement management |
| mobile-teacher | MT-012: Class Challenge Creator | Gamification |
| mobile-teacher | MT-014: Real-time Heatmap | Visual monitoring |
| mobile-teacher | MT-015: SEL Observation | SEL support |
| mobile-parent | MP-003: AI Autonomy Controls | Parent control |
| mobile-parent | MP-004: Streak Calendar | Engagement view |
| mobile-parent | MP-005: Usage Tracker | Usage visibility |
| mobile-parent | MP-006: Screen Time Settings | Parent control |
| mobile-parent | MP-007: Homework Transcripts | Homework visibility |

### Low Priority (P3) - Nice to Have
| App | Gap | Impact |
|-----|-----|--------|
| mobile-teacher | MT-010: Lesson Builder | Content creation |
| mobile-teacher | MT-013: Leaderboard Management | Gamification |
| mobile-teacher | MT-018: Calendar Integration | Scheduling |
| mobile-teacher | MT-020: Progress Charts | Visualization |
| mobile-parent | MP-008: Teacher Notes | Communication |
| mobile-parent | MP-009: PDF Download | Report access |

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Safety & Core Workflows (8-12 weeks)
**Focus: Student safety and teacher core workflows**

#### Sprint 1-2: Risk Prediction Foundation
- [ ] MT-001: Implement risk prediction models in mobile-teacher
- [ ] MT-002: Add intervention recommendation UI
- [ ] MT-019: Create at-risk alerts dashboard

#### Sprint 3-4: LMS Integration
- [ ] MT-016: Google Classroom OAuth for mobile
- [ ] MT-017: Grade passback functionality

#### Sprint 5-6: Assessment Builder
- [ ] MT-006: Build mobile assessment creator
- [ ] Create question type components

### Phase 2: Analytics & Insights (6-8 weeks)
**Focus: Data visibility and decision support**

#### Sprint 7-8: Teacher Analytics
- [ ] MT-003: Implement analytics dashboard
- [ ] MT-004: Add skill mastery matrix
- [ ] MT-005: Build engagement analytics view

#### Sprint 9-10: Parent AI Visibility
- [ ] MP-001: Create AI Brain Dashboard
- [ ] MP-002: Add intervention history timeline
- [ ] MP-003: Implement AI autonomy controls

### Phase 3: Enhanced Features (6-8 weeks)
**Focus: Quality of life improvements**

#### Sprint 11-12: Grading & Content
- [ ] MT-007: Add rubric builder
- [ ] MT-008: Create grading queue
- [ ] MT-009: Content marketplace access

#### Sprint 13-14: Gamification & Monitoring
- [ ] MT-011: Gamification control panel
- [ ] MT-012: Class challenge creator
- [ ] MT-014: Real-time heatmap view
- [ ] MT-015: SEL observation tools

#### Sprint 15-16: Parent Engagement
- [ ] MP-004: Streak calendar widget
- [ ] MP-005: Daily usage tracker
- [ ] MP-006: Screen time settings
- [ ] MP-007: Homework session transcripts

### Phase 4: Polish & Parity (4 weeks)
**Focus: Complete parity and refinement**

#### Sprint 17-18: Final Gaps
- [ ] MT-010: Lesson builder (simplified mobile version)
- [ ] MT-013: Leaderboard management
- [ ] MT-018: Calendar integration
- [ ] MT-020: Progress charts
- [ ] MP-008: Teacher notes view
- [ ] MP-009: PDF report download

---

## 7. TECHNICAL CONSIDERATIONS

### Shared Code Strategy
1. **API Contracts**: Ensure mobile apps use same API endpoints as web
2. **Type Sharing**: Leverage `@aivo/ts-types` patterns for Dart models
3. **Business Logic**: Consider shared Dart packages for mobile apps

### Mobile-Specific Challenges
1. **Risk Prediction**: Large model (14K lines) - consider server-side processing
2. **Analytics Charts**: Use `fl_chart` package for Flutter visualizations
3. **WebSocket**: Use `web_socket_channel` for real-time features
4. **OAuth**: Use `flutter_appauth` for Google Classroom integration

### Testing Strategy
1. Add E2E tests for new features matching web test coverage
2. Widget tests for all new UI components
3. Integration tests for API interactions

---

## 8. METRICS FOR SUCCESS

### Parity Metrics
- Feature coverage: Target 95% parity for P0-P2 features
- API endpoint coverage: 100% of teacher/parent endpoints used by mobile
- User workflow coverage: All critical workflows available on mobile

### Quality Metrics
- Test coverage: >80% for new mobile code
- Performance: <2s load time for dashboard screens
- Offline support: All new features work offline where applicable

---

## Appendix A: Detailed Feature Matrix

See accompanying spreadsheet: `MOBILE_WEB_PARITY_MATRIX.xlsx`

## Appendix B: API Endpoint Audit

See accompanying document: `API_ENDPOINT_AUDIT.md`

---

*Document Version: 1.0*
*Last Updated: 2026-01-11*
*Author: Claude Code Audit*
