# Phase 1: Quick Wins - Technical Specification

## Overview

This document provides detailed technical specifications for Phase 1 (Quick Wins) features from the legacy repository analysis.

**Timeline**: Weeks 1-2  
**Priority**: HIGH  
**Business Value**: Immediate UX improvements and reduced onboarding friction

---

## Summary

After comprehensive analysis of the aivo-platform repository:

### ✅ Already Implemented - Backend Complete
- **Sensory Profiles**: Full Prisma schema, API endpoints, validation (Missing: UI components)
- **Grade-Based Theming**: Complete 3-theme system (explorer/navigator/scholar)
- **Parent/Caregiver Management**: Backend with invite system (Missing: self-service flow)

### 🎯 Implementation Needed
- **Sensory Profile UI**: Wizard and editor components
- **Self-Service Parent Registration**: Registration flow without teacher invite
- **Theme Customization**: District-level theme configuration (optional enhancement)

---

## 1. Sensory Profile UI Components

### Backend Status
✅ **COMPLETE** - No backend changes needed

**Existing API Endpoints**:
- `GET /learners/:learnerId/sensory-profile`
- `POST /learners/:learnerId/sensory-profile`
- `PATCH /learners/:learnerId/sensory-profile`
- `GET/POST/PATCH/DELETE /learners/:learnerId/accommodations`

**Existing Schema**: `LearnerSensoryProfile` model with comprehensive fields

### Frontend Implementation

**Location**: `libs/ui-web/src/components/profile/`

**Components to Create**:
1. `SensoryProfileWizard` - Multi-step onboarding wizard
2. `SensoryProfileEditor` - Full profile management
3. `VisualPanel` - Visual accommodation settings
4. `AuditoryPanel` - Audio accommodation settings
5. `MotorPanel` - Motor/input accommodation settings
6. `CognitivePanel` - Cognitive accommodation settings

**Implementation Priority**: HIGH  
**Estimated Effort**: 3-4 days

---

## 2. Self-Service Parent Registration

### Backend Implementation Needed

**New Routes** (`services/parent-svc/src/routes/registration.ts`):
```
POST /registration/self-register        # Parent signup without invite
POST /registration/verify-learner       # Verify learner using PIN
POST /registration/link-learner         # Link verified learner
GET  /registration/verify-email/:token  # Email verification
```

**Database Changes**: None (existing schema supports this)

**New Feature**: Learner enrollment PIN system
- Generate 6-digit PIN for each learner
- Store in `learner.enrollmentPin` field (add if needed)
- Use for parent-initiated linking

### Frontend Implementation

**New Pages** (`apps/web-parent/src/pages/`):
1. `/register` - Parent registration form
2. `/verify-email` - Email verification page
3. `/link-learner` - Learner linking wizard
4. `/family` - Family dashboard

**Implementation Priority**: HIGH  
**Estimated Effort**: 2-3 days

---

## 3. Grade Theme Enhancements (Optional)

### Current State
✅ Three themes fully implemented (explorer, navigator, scholar)

### Enhancement Opportunities
1. **District Theme Customization**: Allow districts to customize colors/fonts
2. **Theme Preview**: Real-time theme switcher
3. **Additional Tokens**: More granular theme customization

**Implementation Priority**: MEDIUM  
**Estimated Effort**: 2-3 days

---

## Implementation Timeline

| Task | Duration | Priority |
|------|----------|----------|
| Sensory Profile UI Components | 3-4 days | HIGH |
| Self-Service Parent Registration API | 2 days | HIGH |
| Parent Registration Frontend | 2 days | HIGH |
| Testing & QA | 2 days | HIGH |
| Documentation | 1 day | MEDIUM |
| **Total** | **10-12 days** | |

---

## Success Metrics

### User Experience
- ✅ Sensory profile wizard completion rate >80%
- ✅ Parent self-registration success rate >90%
- ✅ Learner linking success rate >85%

### Technical
- ✅ Unit test coverage >80%
- ✅ WCAG 2.1 AA compliance
- ✅ API response time <500ms p95

### Business
- ✅ Reduced support tickets for parent onboarding (-30%)
- ✅ Increased profile completion rate (+40%)

---

## Next Steps

1. **Review and approve this specification**
2. **Create feature branches for each component**
3. **Implement UI components**
4. **Implement backend registration endpoints**
5. **Test and validate**
6. **Deploy to staging**
7. **Pilot with select districts**
8. **Production rollout**
