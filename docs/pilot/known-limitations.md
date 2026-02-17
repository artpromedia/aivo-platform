# AIVO Platform — Known Limitations (Pilot Release)

> **Audience**: District administrators, AIVO internal team  
> **Version**: Sprint 8 — Pilot Release  
> **Classification**: Share with district stakeholders

---

## Overview

This document lists known limitations of the AIVO platform at the time of the pilot district launch. These are not bugs — they are features that are planned for future phases but not yet implemented.

All items listed here are tracked in our product backlog with planned resolution dates.

---

## Feature Limitations

### 1. Single District Only

- **Current**: Only one district can be active at a time
- **Impact**: Multi-district features (cross-district reporting, district comparison) not available
- **Planned**: Phase 2 (multi-tenancy enhancements)

### 2. No SSO / SAML Integration

- **Current**: Users log in with email/password only
- **Impact**: Teachers and parents cannot use district SSO (e.g., Google Workspace, Azure AD)
- **Workaround**: Manual account provisioning with strong passwords
- **Planned**: Phase 2 (SAML 2.0 + OIDC support)

### 3. Limited SIS Integration

- **Current**: Student data is imported via CSV or manual entry
- **Impact**: No automatic sync with Student Information Systems (PowerSchool, Infinite Campus, etc.)
- **Workaround**: CSV export from SIS → CSV import to AIVO
- **Planned**: Phase 2 (SIS API integration)

### 4. Lesson Builder (AI) Disabled

- **Current**: AI-powered lesson plan generation is not enabled for the pilot
- **Impact**: Teachers cannot auto-generate lesson plans from IEP goals
- **Reason**: Feature is in beta testing; will be enabled after validation
- **Planned**: Phase 2

### 5. Billing & Credits Not Active

- **Current**: No billing or credit processing during the pilot
- **Impact**: N/A for pilot (free usage)
- **Planned**: Phase 2 (usage-based billing)

### 6. Limited Report Types

- **Current**: Compliance report and student progress report are available
- **Impact**: Advanced analytics reports (trend analysis, cohort comparison) not yet available
- **Planned**: Phase 2 (advanced analytics suite)

---

## Technical Limitations

### 7. Mobile App in Beta

- **Current**: iOS app distributed via TestFlight; Android app via Play Store beta
- **Impact**: Not available in the public App Store/Play Store
- **Limitation**: TestFlight links expire every 90 days (will be re-issued)
- **Planned**: Public release in Phase 2

### 8. Offline Mode Not Available

- **Current**: The platform requires an active internet connection
- **Impact**: No data entry or viewing when offline
- **Planned**: Phase 3 (offline-first mobile with sync)

### 9. File Upload Size Limit

- **Current**: Maximum file upload size is 25 MB
- **Impact**: Very large documents (scanned multi-page IEPs) may need to be split
- **Workaround**: Compress PDFs before upload, or split into sections
- **Planned**: Increase to 100 MB in Phase 2

### 10. Browser Support

- **Supported**: Chrome 90+, Firefox 90+, Edge 90+, Safari 15+
- **Not supported**: Internet Explorer (any version), older browser versions
- **Impact**: Users on older browsers may experience rendering issues

### 11. Concurrent Session Limit

- **Current**: Maximum 3 concurrent sessions per user account
- **Impact**: If a user is logged in on 3 devices, the oldest session will be invalidated
- **Workaround**: Log out of unused devices

---

## Performance Limitations

### 12. Report Generation Time

- **Current**: Compliance reports for the full district (~500 students) may take up to 30 seconds
- **Impact**: Brief wait time when generating district-wide reports
- **Planned**: Optimized batch processing in Sprint 10

### 13. AI Tutor Response Time

- **Current**: AI tutor responses may take 2-3 seconds during peak usage
- **Impact**: Slight delay in conversation flow
- **Planned**: Response caching and model optimization in Sprint 10

### 14. Dashboard Refresh

- **Current**: Dashboard data refreshes every 30 seconds (not real-time)
- **Impact**: Newly entered data may take up to 30 seconds to appear on dashboards
- **Workaround**: Click "Refresh" for immediate update

---

## Data Limitations

### 15. Historical Data Import

- **Current**: Only current-year IEPs can be imported during pilot
- **Impact**: Historical IEP trends and year-over-year comparison not available
- **Planned**: Historical data migration tool in Phase 2

### 16. Assessment Data

- **Current**: Limited to progress data entered manually by teachers
- **Impact**: Standardized test scores and external assessments must be entered manually
- **Planned**: Assessment platform integration in Phase 2

### 17. Parent Assessment Questionnaire

- **Current**: Available but limited to the initial intake questionnaire
- **Impact**: Ongoing parent assessments are manual/email-based
- **Planned**: Full parent assessment suite in Phase 2

---

## Accessibility Limitations

### 18. Screen Reader Support

- **Current**: Partial WCAG 2.1 AA compliance
- **Impact**: Some interactive elements may not be fully accessible with screen readers
- **Planned**: Full WCAG 2.1 AA compliance by Phase 2
- **Note**: Critical workflows (login, IEP viewing, progress checking) are fully accessible

### 19. Language Support

- **Current**: English only
- **Impact**: Non-English-speaking parents must use browser translation
- **Planned**: Spanish and Somali translations in Phase 2 (per district demographics)

---

## Resolution Timeline

| Phase             | Target Date | Key Additions                                                                   |
| ----------------- | ----------- | ------------------------------------------------------------------------------- |
| Phase 1 (Current) | Now         | Core IEP management, progress tracking, AI tutor, parent portal                 |
| Phase 2           | +3 months   | SSO, SIS integration, multi-district, lesson builder, mobile public release     |
| Phase 3           | +6 months   | Offline mode, advanced analytics, full accessibility, expanded language support |

---

## Reporting Issues

If you encounter a limitation not listed here, or if a listed limitation is blocking your work:

1. **Email**: support@aivo.com
2. **Include**: Description of the issue and impact on your workflow
3. **Response**: Our team will respond within 4 hours during business hours

---

_This document will be updated as limitations are resolved. Check back for the latest version._
