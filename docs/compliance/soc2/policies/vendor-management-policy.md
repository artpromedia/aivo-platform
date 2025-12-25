# Vendor Management Policy

**Document ID:** POL-SEC-006  
**Version:** 2.0  
**Effective Date:** January 1, 2024  
**Last Review Date:** January 15, 2024  
**Next Review Date:** January 15, 2025  
**Document Owner:** Chief Information Security Officer (CISO)  
**Classification:** Internal

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Scope](#2-scope)
3. [Vendor Classification](#3-vendor-classification)
4. [Vendor Assessment](#4-vendor-assessment)
5. [Contractual Requirements](#5-contractual-requirements)
6. [Ongoing Monitoring](#6-ongoing-monitoring)
7. [Vendor Offboarding](#7-vendor-offboarding)
8. [Roles and Responsibilities](#8-roles-and-responsibilities)
9. [Related Documents](#9-related-documents)
10. [Revision History](#10-revision-history)

---

## 1. Purpose

This Vendor Management Policy establishes the requirements for assessing, engaging, and monitoring third-party vendors to ensure they meet AIVO's security and compliance standards. The policy ensures:

- Vendor risks are identified and managed
- Appropriate security controls are required contractually
- Vendor performance and security is monitored
- Compliance with SOC 2, FERPA, COPPA, and other regulations

---

## 2. Scope

### 2.1 Covered Vendors

This policy applies to all third-party relationships including:

- Software as a Service (SaaS) providers
- Infrastructure providers (IaaS, PaaS)
- Professional services firms
- Data processors and subprocessors
- Contractors and consultants
- Resellers and partners

### 2.2 Exclusions

- Utility services (electricity, water)
- Office supplies (unless handling data)
- Standard banking services

---

## 3. Vendor Classification

### 3.1 Risk Tiers

| Tier       | Risk Level | Criteria                                                                     | Assessment Frequency |
| ---------- | ---------- | ---------------------------------------------------------------------------- | -------------------- |
| **Tier 1** | Critical   | Access to Restricted data, critical infrastructure, single points of failure | Annual + continuous  |
| **Tier 2** | High       | Access to Confidential data, significant business impact                     | Annual               |
| **Tier 3** | Medium     | Access to Internal data, moderate impact                                     | Every 2 years        |
| **Tier 4** | Low        | No data access, minimal impact                                               | Initial only         |

### 3.2 Classification Criteria

#### Tier 1 (Critical) Indicators

- Processes student PII or educational records
- Has privileged access to production systems
- Provides critical infrastructure (hosting, authentication)
- Cannot be replaced without significant disruption
- Regulatory compliance dependent on vendor

#### Tier 2 (High) Indicators

- Processes employee or customer data
- Has access to Confidential data
- Provides important business functions
- Moderate time to replace

#### Tier 3 (Medium) Indicators

- Limited data access (Internal only)
- Support functions
- Easily replaceable
- Limited system integration

#### Tier 4 (Low) Indicators

- No access to AIVO data
- No system integration
- Commodity services
- Many alternatives available

---

## 4. Vendor Assessment

### 4.1 Assessment Process

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  Initiate      │───▶│   Security     │───▶│   Review &     │
│  Assessment    │    │   Assessment   │    │   Decision     │
└────────────────┘    └────────────────┘    └────────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
  Business need         Questionnaire         Risk acceptance
  identified            Evidence review       or rejection
  Tier assigned         Technical review
```

### 4.2 Assessment Requirements by Tier

| Assessment Component      | Tier 1    | Tier 2    | Tier 3    | Tier 4 |
| ------------------------- | --------- | --------- | --------- | ------ |
| Security Questionnaire    | Extended  | Standard  | Basic     | N/A    |
| SOC 2 Report Review       | Required  | Required  | Preferred | N/A    |
| Penetration Test Results  | Required  | Preferred | N/A       | N/A    |
| On-site Assessment        | As needed | N/A       | N/A       | N/A    |
| Technical Security Review | Required  | Required  | N/A       | N/A    |
| Data Flow Analysis        | Required  | Required  | Preferred | N/A    |
| Subprocessor Review       | Required  | Required  | N/A       | N/A    |
| Insurance Verification    | Required  | Required  | Preferred | N/A    |
| Reference Checks          | Required  | Preferred | N/A       | N/A    |

### 4.3 Security Questionnaire Topics

#### Standard Security Questionnaire (SIG-based)

| Domain                   | Key Questions                                 |
| ------------------------ | --------------------------------------------- |
| **Governance**           | Security policies, organization, awareness    |
| **Access Control**       | Authentication, authorization, access reviews |
| **Data Protection**      | Encryption, classification, retention         |
| **Network Security**     | Segmentation, monitoring, intrusion detection |
| **Application Security** | SDLC, testing, vulnerability management       |
| **Incident Response**    | IR plan, notification, testing                |
| **Business Continuity**  | DR plan, backups, RTO/RPO                     |
| **Compliance**           | Certifications, audits, regulatory            |
| **Physical Security**    | Data center controls, environmental           |
| **Third Parties**        | Subprocessor management                       |

### 4.4 Evidence Requirements

| Evidence Type         | Description                                   | Validity      |
| --------------------- | --------------------------------------------- | ------------- |
| SOC 2 Type II         | Independent audit of controls                 | 1 year        |
| ISO 27001             | Information security management certification | 3 years       |
| Penetration Test      | Third-party security assessment               | 1 year        |
| Vulnerability Scan    | Automated security scan                       | 3 months      |
| Insurance Certificate | Cyber liability coverage                      | 1 year        |
| Privacy Policy        | Public privacy practices                      | Current       |
| DPA/Contract          | Data processing agreement                     | Contract term |

### 4.5 Risk Acceptance

#### Approval Authority

| Risk Level        | Approver         |
| ----------------- | ---------------- |
| Critical (Tier 1) | CISO + CEO       |
| High (Tier 2)     | CISO             |
| Medium (Tier 3)   | Security Manager |
| Low (Tier 4)      | Procurement      |

#### Risk Acceptance Criteria

- Documented business justification
- Compensating controls identified
- Remediation timeline (if gaps exist)
- Regular monitoring commitment
- Time-limited approval (if conditional)

---

## 5. Contractual Requirements

### 5.1 Required Contract Provisions

| Provision                 | Tier 1   | Tier 2   | Tier 3    | Tier 4   |
| ------------------------- | -------- | -------- | --------- | -------- |
| Data Processing Agreement | Required | Required | If data   | N/A      |
| Security Requirements     | Required | Required | Required  | N/A      |
| Breach Notification       | Required | Required | Required  | N/A      |
| Audit Rights              | Required | Required | Preferred | N/A      |
| Subprocessor Restrictions | Required | Required | N/A       | N/A      |
| Data Return/Deletion      | Required | Required | Required  | N/A      |
| Insurance Requirements    | Required | Required | Preferred | N/A      |
| SLA Requirements          | Required | Required | Preferred | N/A      |
| Indemnification           | Required | Required | Required  | Required |
| Termination Rights        | Required | Required | Required  | Required |

### 5.2 Data Processing Agreement Requirements

#### Required Clauses

1. **Purpose Limitation**
   - Data processed only for specified purposes
   - No use for vendor's own purposes

2. **Security Measures**
   - Technical and organizational measures
   - Encryption requirements
   - Access controls

3. **Personnel**
   - Confidentiality obligations
   - Training requirements
   - Background checks (for Tier 1)

4. **Subprocessors**
   - Prior approval required
   - Flow-down of obligations
   - Subprocessor list provided

5. **Data Subject Rights**
   - Assistance with requests
   - Response timeframes

6. **Breach Notification**
   - Notification within 24-72 hours
   - Content of notification
   - Cooperation with investigation

7. **Audit and Assessment**
   - Right to audit
   - Questionnaire response
   - Certifications provided

8. **Data Return/Deletion**
   - Secure return or deletion
   - Certification of deletion
   - Retention limitations

### 5.3 Security Requirements

#### Tier 1 Vendors

- SOC 2 Type II report required
- Data encrypted at rest (AES-256)
- Data encrypted in transit (TLS 1.2+)
- MFA for all access
- Annual penetration testing
- Vulnerability management program
- Incident response plan
- Business continuity/DR plan
- 24-hour breach notification
- $5M+ cyber insurance

#### Tier 2 Vendors

- SOC 2 Type II or equivalent
- Data encryption in transit
- Data encryption at rest (sensitive data)
- Access controls and logging
- Annual security assessment
- 48-hour breach notification
- $2M+ cyber insurance

### 5.4 Insurance Requirements

| Coverage Type      | Tier 1 | Tier 2 | Tier 3 |
| ------------------ | ------ | ------ | ------ |
| Cyber Liability    | $5M    | $2M    | $1M    |
| Errors & Omissions | $2M    | $1M    | $500K  |
| General Liability  | $1M    | $1M    | $1M    |

---

## 6. Ongoing Monitoring

### 6.1 Monitoring Activities

| Activity               | Tier 1       | Tier 2       | Tier 3        | Tier 4     |
| ---------------------- | ------------ | ------------ | ------------- | ---------- |
| SOC 2 Report Review    | Annual       | Annual       | N/A           | N/A        |
| Security Questionnaire | Annual       | Annual       | Every 2 years | N/A        |
| Performance Review     | Quarterly    | Semi-annual  | Annual        | Annual     |
| Incident Review        | Per incident | Per incident | Per incident  | N/A        |
| Continuous Monitoring  | Real-time    | Weekly       | Monthly       | N/A        |
| Contract Review        | Annual       | Annual       | At renewal    | At renewal |

### 6.2 Continuous Monitoring

For Tier 1 vendors:

- Security rating services (BitSight, SecurityScorecard)
- Breach notification monitoring
- News and threat intelligence
- Certificate and DNS monitoring
- Dark web monitoring

### 6.3 Performance Metrics

| Metric                 | Measurement            | Target             |
| ---------------------- | ---------------------- | ------------------ |
| SLA Compliance         | Uptime, response times | Per contract       |
| Security Incidents     | Number and severity    | Zero critical      |
| Questionnaire Response | Time to respond        | < 10 business days |
| Issue Remediation      | Time to fix findings   | Per severity       |
| Audit Findings         | Number and severity    | No critical        |

### 6.4 Issue Management

#### Finding Severity

| Severity | Definition                        | Remediation Timeline |
| -------- | --------------------------------- | -------------------- |
| Critical | Immediate risk to data or systems | 24 hours             |
| High     | Significant security gap          | 30 days              |
| Medium   | Moderate risk                     | 90 days              |
| Low      | Minor improvement needed          | 180 days             |

#### Escalation Path

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│  Finding       │───▶│  Vendor        │───▶│  Escalate      │
│  Identified    │    │  Remediation   │    │  if Overdue    │
└────────────────┘    └────────────────┘    └────────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
  Document in           Track in              Manager →
  risk register         GRC system            CISO →
                                             Terminate
```

---

## 7. Vendor Offboarding

### 7.1 Offboarding Triggers

- Contract expiration
- Contract termination
- Service no longer needed
- Security concerns
- Vendor acquisition/change

### 7.2 Offboarding Process

#### Pre-Termination (30+ days)

- [ ] Notify vendor of termination
- [ ] Identify all data held by vendor
- [ ] Plan data migration/return
- [ ] Identify replacement (if needed)
- [ ] Review contractual obligations

#### At Termination

- [ ] Revoke all vendor access
- [ ] Disable integrations and API keys
- [ ] Request data return
- [ ] Request deletion certification
- [ ] Remove from vendor inventory

#### Post-Termination (30 days)

- [ ] Verify data deletion
- [ ] Obtain deletion certificate
- [ ] Update documentation
- [ ] Archive vendor records
- [ ] Close vendor in GRC system

### 7.3 Data Return and Deletion

| Requirement     | Timeline                 | Verification          |
| --------------- | ------------------------ | --------------------- |
| Data return     | Within contract terms    | Delivery confirmation |
| Data deletion   | 30 days post-termination | Deletion certificate  |
| Backup deletion | 90 days                  | Written confirmation  |

---

## 8. Roles and Responsibilities

### 8.1 Vendor Owners (Business)

- Identify business need
- Initiate vendor assessment
- Manage day-to-day relationship
- Monitor service delivery
- Report issues to Security

### 8.2 Procurement

- Manage RFP process
- Negotiate contracts
- Maintain vendor inventory
- Track contract renewals
- Coordinate onboarding/offboarding

### 8.3 Security Team

- Conduct security assessments
- Review security evidence
- Set security requirements
- Monitor vendor security
- Approve high-risk vendors

### 8.4 Legal

- Review and negotiate contracts
- Ensure regulatory compliance
- Draft DPAs
- Handle disputes

### 8.5 Privacy

- Review data processing
- Ensure privacy compliance
- Review DPAs
- Handle DSAR coordination

---

## 9. Related Documents

| Document                                                        | Description                        |
| --------------------------------------------------------------- | ---------------------------------- |
| [Information Security Policy](./information-security-policy.md) | Overarching security policy        |
| [Data Protection Policy](./data-protection-policy.md)           | Data handling requirements         |
| Vendor Security Questionnaire                                   | Standard assessment questionnaire  |
| DPA Template                                                    | Standard data processing agreement |

---

## 10. Revision History

| Version | Date       | Author | Changes                         |
| ------- | ---------- | ------ | ------------------------------- |
| 1.0     | 2023-01-01 | CISO   | Initial release                 |
| 1.1     | 2023-07-01 | CISO   | Added continuous monitoring     |
| 2.0     | 2024-01-01 | CISO   | Annual review, enhanced tiering |

---

## Approval

| Role           | Name            | Signature  | Date       |
| -------------- | --------------- | ---------- | ---------- |
| Document Owner | CISO            | ****\_**** | 2024-01-15 |
| Reviewer       | General Counsel | ****\_**** | 2024-01-15 |
| Approver       | CEO             | ****\_**** | 2024-01-15 |
