# AIVO Platform — District Administrator Quickstart Guide

> **Audience**: District administrators and IT coordinators  
> **Time to read**: 10 minutes  
> **Prerequisites**: District admin credentials (provided by AIVO Customer Success)

---

## Welcome to AIVO

AIVO is a comprehensive special education platform that helps your district manage IEPs, track student progress, support teachers with AI-powered tools, and keep parents informed — all while maintaining full FERPA compliance.

This guide covers everything you need to get started as a district administrator.

---

## 1. First Login

1. Open your browser and navigate to: **https://admin.aivo.example**
2. Enter the email and temporary password provided by your AIVO Customer Success representative
3. You will be prompted to:
   - Set a new password (minimum 12 characters, with upper/lowercase, number, and symbol)
   - Enable Multi-Factor Authentication (MFA) via authenticator app (required for admin accounts)
4. After completing setup, you'll land on the **District Dashboard**

> **⚠️ Security Note**: Admin accounts require MFA. Keep your authenticator app backup codes in a secure location.

---

## 2. District Dashboard Overview

Your dashboard shows real-time metrics for your pilot schools:

| Section               | What It Shows                                            |
| --------------------- | -------------------------------------------------------- |
| **Active IEPs**       | Total IEPs being managed across pilot schools            |
| **Compliance Status** | Green/yellow/red indicators for IEP compliance timelines |
| **Teacher Activity**  | Number of teachers actively using the platform this week |
| **Parent Engagement** | Parent login and engagement metrics                      |
| **Recent Alerts**     | Upcoming IEP review dates, missing documentation         |

---

## 3. Managing Schools

### View Schools

Navigate to **Schools** in the left sidebar to see all pilot schools.

### School Details

Click a school to view:

- Student roster (with IEP status)
- Assigned teachers and their caseloads
- Compliance summary for that school

---

## 4. Managing Users

### Teacher Accounts

- Navigate to **Users → Teachers**
- Teachers are pre-provisioned for the pilot
- To add a new teacher: Click **+ Add Teacher** → Enter name, email, school assignment
- Teachers receive a welcome email with login instructions

### Parent Accounts

- Navigate to **Users → Parents**
- Parents are linked to their child(ren's) records
- To add a parent: Click **+ Add Parent** → Enter name, email, linked student(s)

### Roles & Permissions

| Role           | Can View              | Can Edit          | Can Admin                 |
| -------------- | --------------------- | ----------------- | ------------------------- |
| District Admin | All district data     | All district data | User management, settings |
| Teacher        | Own caseload students | Own caseload IEPs | —                         |
| Parent         | Own child's data      | —                 | —                         |

---

## 5. IEP Management Overview

### Compliance Dashboard

Navigate to **Compliance** to see:

- IEPs approaching annual review deadline
- Missing required documentation
- IEP goals without recent progress data
- Accommodation compliance percentage

### Generating Reports

1. Go to **Reports → Compliance**
2. Select scope: District, School, or Individual Student
3. Choose format: PDF or CSV
4. Click **Generate** — reports are available within 5 seconds

---

## 6. Data & Privacy (FERPA)

AIVO is built with FERPA compliance at its core:

| Feature                    | Implementation                                                 |
| -------------------------- | -------------------------------------------------------------- |
| **Data encryption**        | AES-256 at rest, TLS 1.2+ in transit                           |
| **Access logging**         | Every PII access is logged with user, timestamp, and resource  |
| **Geographic restriction** | Data served only from US/Canada (Cloudflare WAF)               |
| **Data retention**         | 7-year retention per FERPA requirements                        |
| **Audit trail**            | Daily automated verification with gap detection                |
| **Role-based access**      | Teachers see only their caseload; parents see only their child |

### Audit Logs

Navigate to **Settings → Audit Log** to review:

- Who accessed what student data
- When IEPs were viewed or modified
- Any unauthorized access attempts

---

## 7. Settings

### District Settings

- **District name & contact info**: Settings → General
- **School year dates**: Settings → Calendar (affects IEP timeline calculations)
- **Notification preferences**: Settings → Notifications
- **Data export**: Settings → Export (for SIS integration)

### Integration

- AIVO supports CSV import/export for student rosters
- SSO integration (SAML 2.0) available for Phase 2

---

## 8. Getting Help

| Channel            | Details                                         |
| ------------------ | ----------------------------------------------- |
| **Email**          | support@aivo.com (response within 4 hours)      |
| **Phone**          | (555) 123-4567 (Mon-Fri 7am-6pm CT)             |
| **In-app**         | Click the **?** icon in the bottom-right corner |
| **Knowledge base** | https://help.aivo.example                       |

### Escalation

For urgent issues affecting multiple users:

1. Call the support phone number
2. Reference your district: **Anoka-Hennepin ISD 11**
3. Our on-call engineer will respond within 30 minutes

---

## 9. Quick Reference

### Key URLs

| Resource              | URL                                        |
| --------------------- | ------------------------------------------ |
| District Admin Portal | https://admin.aivo.example                 |
| Teacher Portal        | https://teacher.aivo.example               |
| Parent Portal         | https://parent.aivo.example                |
| Mobile App (iOS)      | TestFlight link (provided separately)      |
| Mobile App (Android)  | Play Store beta link (provided separately) |

### Key Contacts

| Role                     | Name         | Email            |
| ------------------------ | ------------ | ---------------- |
| Customer Success Manager | TBD          | csm@aivo.com     |
| Technical Support        | AIVO Support | support@aivo.com |
| Your District IT         | TBD          | TBD              |

---

_Last updated: Sprint 8 — Pilot District Preparation_
