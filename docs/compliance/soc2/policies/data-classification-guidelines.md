# Data Classification Guidelines

**Document ID:** POL-SEC-009  
**Version:** 1.0  
**Last Updated:** January 15, 2024  
**Owner:** Chief Information Security Officer  
**Classification:** Internal

---

## 1. Purpose

This document establishes data classification guidelines for the AIVO Platform, ensuring appropriate protection of information assets based on sensitivity, regulatory requirements, and business value. These guidelines support SOC 2 compliance and regulatory obligations including FERPA, COPPA, GDPR, and CCPA.

---

## 2. Scope

This policy applies to:

- All data created, collected, processed, stored, or transmitted by AIVO
- All AIVO employees, contractors, and third parties with data access
- All systems, applications, and infrastructure handling AIVO data
- All data formats (digital, physical, verbal)

---

## 3. Classification Levels

### 3.1 Classification Overview

| Level | Label            | Color Code | Description                                     |
| ----- | ---------------- | ---------- | ----------------------------------------------- |
| 1     | **Restricted**   | 🔴 Red     | Highest sensitivity, severe impact if disclosed |
| 2     | **Confidential** | 🟠 Orange  | High sensitivity, significant business impact   |
| 3     | **Internal**     | 🟡 Yellow  | Internal use only, moderate impact              |
| 4     | **Public**       | 🟢 Green   | Approved for public release                     |

### 3.2 Level 1: Restricted 🔴

**Definition:** Data that is extremely sensitive and subject to strict regulatory controls. Unauthorized disclosure would cause severe harm to individuals or the organization.

**Examples:**

- Student education records (FERPA-protected)
- Children's personal information under 13 (COPPA-protected)
- Student assessment scores and learning data
- Health information (if collected)
- Social Security Numbers
- Financial account numbers
- Authentication credentials and secrets
- Encryption keys
- Security vulnerability reports
- Penetration test results
- Incident response details

**Handling Requirements:**

| Requirement           | Standard                             |
| --------------------- | ------------------------------------ |
| Encryption at Rest    | AES-256 required                     |
| Encryption in Transit | TLS 1.2+ required                    |
| Access Control        | Need-to-know, role-based             |
| Authentication        | MFA required                         |
| Logging               | Full audit trail required            |
| Retention             | Per regulatory requirements          |
| Disposal              | Secure destruction with certificate  |
| Sharing               | Prohibited without explicit approval |
| Location              | US data centers only (if applicable) |

### 3.3 Level 2: Confidential 🟠

**Definition:** Sensitive business or personal data whose disclosure would cause significant harm to individuals or material business impact.

**Examples:**

- Employee personal information
- Customer contact information
- Business contracts and agreements
- Vendor information
- Financial reports
- Strategic plans
- Intellectual property
- Source code
- Internal security policies
- System architecture documents
- API keys and tokens

**Handling Requirements:**

| Requirement           | Standard                        |
| --------------------- | ------------------------------- |
| Encryption at Rest    | AES-256 recommended             |
| Encryption in Transit | TLS 1.2+ required               |
| Access Control        | Role-based access               |
| Authentication        | SSO required, MFA recommended   |
| Logging               | Access logging required         |
| Retention             | 7 years or per contract         |
| Disposal              | Secure deletion                 |
| Sharing               | Internal only, NDA for external |

### 3.4 Level 3: Internal 🟡

**Definition:** Information intended for internal use that is not sensitive but should not be disclosed publicly.

**Examples:**

- Internal communications
- Meeting notes
- Project documentation
- Training materials
- Internal policies and procedures
- Organization charts
- Process documentation
- Non-sensitive operational data

**Handling Requirements:**

| Requirement           | Standard                 |
| --------------------- | ------------------------ |
| Encryption at Rest    | Recommended              |
| Encryption in Transit | TLS 1.2+ required        |
| Access Control        | Standard access controls |
| Authentication        | SSO required             |
| Logging               | Standard logging         |
| Retention             | 3 years                  |
| Disposal              | Standard deletion        |
| Sharing               | Internal only            |

### 3.5 Level 4: Public 🟢

**Definition:** Information approved for public release that poses no risk if disclosed.

**Examples:**

- Marketing materials
- Press releases
- Public website content
- Published documentation
- Job postings
- Public API documentation
- Open-source code

**Handling Requirements:**

| Requirement           | Standard          |
| --------------------- | ----------------- |
| Encryption at Rest    | Not required      |
| Encryption in Transit | Recommended       |
| Access Control        | Open access       |
| Authentication        | Not required      |
| Logging               | Standard logging  |
| Retention             | As needed         |
| Disposal              | Standard deletion |
| Sharing               | Unrestricted      |

---

## 4. Classification Decision Tree

```
START: Is this data subject to regulatory requirements?
│
├── YES (FERPA, COPPA, HIPAA, PCI) → RESTRICTED 🔴
│
└── NO → Does it contain PII?
    │
    ├── YES → Is it sensitive PII (SSN, financial, health)?
    │   │
    │   ├── YES → RESTRICTED 🔴
    │   │
    │   └── NO → CONFIDENTIAL 🟠
    │
    └── NO → Is it intended for external disclosure?
        │
        ├── YES → Has it been approved for release?
        │   │
        │   ├── YES → PUBLIC 🟢
        │   │
        │   └── NO → INTERNAL 🟡
        │
        └── NO → Is it sensitive business information?
            │
            ├── YES → CONFIDENTIAL 🟠
            │
            └── NO → INTERNAL 🟡
```

---

## 5. Data Categories

### 5.1 Student Data (Educational Records)

| Data Element        | Classification | Regulation  |
| ------------------- | -------------- | ----------- |
| Name                | Restricted 🔴  | FERPA       |
| Student ID          | Restricted 🔴  | FERPA       |
| Date of Birth       | Restricted 🔴  | FERPA/COPPA |
| Email Address       | Restricted 🔴  | FERPA/COPPA |
| Grade Level         | Restricted 🔴  | FERPA       |
| Assessment Scores   | Restricted 🔴  | FERPA       |
| Learning Progress   | Restricted 🔴  | FERPA       |
| Behavioral Data     | Restricted 🔴  | FERPA       |
| IEP/504 Information | Restricted 🔴  | FERPA       |
| Parent Contact Info | Restricted 🔴  | FERPA/COPPA |

### 5.2 Employee Data

| Data Element             | Classification  | Notes           |
| ------------------------ | --------------- | --------------- |
| Full Name                | Confidential 🟠 |                 |
| SSN                      | Restricted 🔴   | HR only         |
| Date of Birth            | Confidential 🟠 |                 |
| Address                  | Confidential 🟠 |                 |
| Phone Number             | Confidential 🟠 |                 |
| Salary Information       | Restricted 🔴   | HR/Finance only |
| Performance Reviews      | Confidential 🟠 |                 |
| Background Check Results | Restricted 🔴   | HR only         |
| Work Email               | Internal 🟡     |                 |
| Job Title                | Internal 🟡     |                 |

### 5.3 Business Data

| Data Element         | Classification  | Notes        |
| -------------------- | --------------- | ------------ |
| Revenue Data         | Confidential 🟠 | Finance only |
| Customer Contracts   | Confidential 🟠 |              |
| Pricing Information  | Confidential 🟠 |              |
| Strategic Plans      | Confidential 🟠 |              |
| Board Materials      | Restricted 🔴   |              |
| Investor Information | Restricted 🔴   |              |
| Legal Documents      | Confidential 🟠 |              |
| Audit Reports        | Confidential 🟠 |              |

### 5.4 Technical Data

| Data Element             | Classification  | Notes |
| ------------------------ | --------------- | ----- |
| Source Code              | Confidential 🟠 |       |
| API Keys                 | Restricted 🔴   |       |
| Database Credentials     | Restricted 🔴   |       |
| Encryption Keys          | Restricted 🔴   |       |
| System Architecture      | Confidential 🟠 |       |
| Security Configurations  | Restricted 🔴   |       |
| Vulnerability Reports    | Restricted 🔴   |       |
| Penetration Test Results | Restricted 🔴   |       |
| Incident Details         | Restricted 🔴   |       |
| Audit Logs               | Confidential 🟠 |       |

---

## 6. Labeling Requirements

### 6.1 Digital Documents

All digital documents must include classification labels:

**Header Format:**

```
Classification: [RESTRICTED | CONFIDENTIAL | INTERNAL | PUBLIC]
```

**Footer Format:**

```
[COMPANY NAME] - [CLASSIFICATION LEVEL] - Do not distribute without authorization
```

### 6.2 Email

- Subject line prefix: `[RESTRICTED]`, `[CONFIDENTIAL]`, `[INTERNAL]`
- Email footer must include classification
- Encrypted email required for Restricted data

### 6.3 Code and Configuration

```typescript
/**
 * Classification: CONFIDENTIAL
 * Description: Contains business logic for assessment scoring
 * Data Handling: No PII should be logged
 */
```

### 6.4 Database Fields

```sql
-- Column comment indicating classification
COMMENT ON COLUMN students.ssn IS 'Classification: RESTRICTED - FERPA';
COMMENT ON COLUMN students.email IS 'Classification: RESTRICTED - FERPA/COPPA';
```

### 6.5 API Responses

```json
{
  "_metadata": {
    "classification": "RESTRICTED",
    "dataType": "student_record"
  },
  "data": {}
}
```

---

## 7. Handling Procedures

### 7.1 Storage Requirements

| Classification  | Cloud Storage                    | Local Storage        | Database                               |
| --------------- | -------------------------------- | -------------------- | -------------------------------------- |
| Restricted 🔴   | Encrypted S3 with restricted IAM | Not allowed          | Encrypted RDS, column-level encryption |
| Confidential 🟠 | Encrypted S3                     | Encrypted disk       | Encrypted RDS                          |
| Internal 🟡     | S3 with access controls          | Company devices only | Standard RDS                           |
| Public 🟢       | Public S3/CDN                    | Any                  | Any                                    |

### 7.2 Transmission Requirements

| Classification  | Email          | API                     | File Transfer   |
| --------------- | -------------- | ----------------------- | --------------- |
| Restricted 🔴   | Encrypted only | TLS 1.3, mTLS preferred | SFTP, encrypted |
| Confidential 🟠 | TLS required   | TLS 1.2+                | SFTP preferred  |
| Internal 🟡     | TLS required   | TLS 1.2+                | HTTPS           |
| Public 🟢       | Any            | HTTPS                   | Any             |

### 7.3 Access Requirements

| Classification  | Access Request | Approval                        | Review Frequency |
| --------------- | -------------- | ------------------------------- | ---------------- |
| Restricted 🔴   | Formal request | Manager + Data Owner + Security | Quarterly        |
| Confidential 🟠 | Ticket         | Manager + Data Owner            | Semi-annually    |
| Internal 🟡     | Role-based     | Manager                         | Annually         |
| Public 🟢       | Open           | None                            | None             |

### 7.4 Retention and Disposal

| Classification  | Default Retention | Disposal Method       | Certificate Required |
| --------------- | ----------------- | --------------------- | -------------------- |
| Restricted 🔴   | Per regulation    | Cryptographic erasure | Yes                  |
| Confidential 🟠 | 7 years           | Secure deletion       | Recommended          |
| Internal 🟡     | 3 years           | Standard deletion     | No                   |
| Public 🟢       | As needed         | Standard deletion     | No                   |

---

## 8. Roles and Responsibilities

### 8.1 Data Owner

- Assign appropriate classification
- Approve access requests
- Review access periodically
- Ensure compliance with handling requirements

### 8.2 Data Custodian

- Implement technical controls
- Maintain security of storage systems
- Monitor access and usage
- Report security incidents

### 8.3 Data User

- Handle data according to classification
- Report misclassification
- Complete required training
- Report security incidents

### 8.4 Security Team

- Define classification standards
- Audit classification compliance
- Provide guidance and training
- Investigate incidents

---

## 9. Special Handling - Educational Records

### 9.1 FERPA Requirements

Under the Family Educational Rights and Privacy Act:

| Requirement                     | Implementation                                    |
| ------------------------------- | ------------------------------------------------- |
| Directory Information           | Must be designated and published                  |
| Opt-Out                         | Honor parental/student opt-out requests           |
| Legitimate Educational Interest | Document purpose for each access                  |
| Third-Party Disclosure          | Written consent required unless exception applies |
| Annual Notification             | Notify parents/students of FERPA rights annually  |
| Access Logs                     | Maintain record of disclosures for 3 years        |

### 9.2 COPPA Requirements

For children under 13:

| Requirement                 | Implementation                                         |
| --------------------------- | ------------------------------------------------------ |
| Verifiable Parental Consent | Required before collection                             |
| Data Minimization           | Collect only what's necessary for educational purposes |
| No Third-Party Disclosure   | Without parental consent                               |
| Access and Deletion         | Parents can review and request deletion                |
| Security                    | Reasonable security measures required                  |
| Retention Limits            | Delete when no longer needed                           |

---

## 10. Compliance and Audit

### 10.1 Classification Reviews

| Review Type           | Frequency                | Responsibility |
| --------------------- | ------------------------ | -------------- |
| New System Assessment | Before deployment        | Security Team  |
| Data Inventory Update | Quarterly                | Data Owners    |
| Access Review         | Per classification level | Data Owners    |
| Policy Review         | Annually                 | CISO           |

### 10.2 Audit Requirements

- Maintain data inventory with classifications
- Document classification decisions
- Log access to Restricted and Confidential data
- Retain audit logs per retention policy

### 10.3 Non-Compliance

| Violation                        | Consequence                           |
| -------------------------------- | ------------------------------------- |
| First occurrence (unintentional) | Training and counseling               |
| Repeated occurrence              | Formal warning                        |
| Intentional violation            | Disciplinary action up to termination |
| Regulatory breach                | Legal action may be required          |

---

## 11. Quick Reference Card

### Classification at a Glance

| Question                                 | Yes → Classification |
| ---------------------------------------- | -------------------- |
| Is it regulated student data?            | RESTRICTED 🔴        |
| Is it children's PII (under 13)?         | RESTRICTED 🔴        |
| Contains SSN, financial, or health data? | RESTRICTED 🔴        |
| Security credentials or keys?            | RESTRICTED 🔴        |
| Employee PII?                            | CONFIDENTIAL 🟠      |
| Business contracts/financials?           | CONFIDENTIAL 🟠      |
| Source code or architecture?             | CONFIDENTIAL 🟠      |
| Internal communications?                 | INTERNAL 🟡          |
| Approved for public release?             | PUBLIC 🟢            |

### When in Doubt

**When uncertain about classification:**

1. Classify at the higher level initially
2. Consult with Data Owner
3. Contact Security Team for guidance
4. Document the decision

---

## 12. Document Control

| Version | Date       | Author        | Changes          |
| ------- | ---------- | ------------- | ---------------- |
| 1.0     | 2024-01-15 | Security Team | Initial document |

**Next Review Date:** January 2025

**Approval:**

| Role            | Name | Signature | Date |
| --------------- | ---- | --------- | ---- |
| CISO            |      |           |      |
| DPO             |      |           |      |
| General Counsel |      |           |      |
