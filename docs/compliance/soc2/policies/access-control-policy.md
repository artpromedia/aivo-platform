# Access Control Policy

**Document ID:** POL-SEC-002  
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
3. [Policy Statements](#3-policy-statements)
4. [Account Management](#4-account-management)
5. [Authentication](#5-authentication)
6. [Authorization](#6-authorization)
7. [Access Reviews](#7-access-reviews)
8. [Privileged Access Management](#8-privileged-access-management)
9. [Remote Access](#9-remote-access)
10. [Third-Party Access](#10-third-party-access)
11. [Physical Access](#11-physical-access)
12. [Roles and Responsibilities](#12-roles-and-responsibilities)
13. [Compliance](#13-compliance)
14. [Related Documents](#14-related-documents)
15. [Revision History](#15-revision-history)

---

## 1. Purpose

This Access Control Policy establishes the requirements for managing access to AIVO Platform's information systems, applications, and data. The policy ensures that:

- Access is granted based on business need and least privilege
- Access is properly authenticated and authorized
- Access is regularly reviewed and revoked when no longer needed
- Privileged access is appropriately controlled and monitored

---

## 2. Scope

### 2.1 Covered Systems

This policy applies to all AIVO information systems including:

- Production applications and databases
- Development and staging environments
- Cloud infrastructure (AWS)
- Internal tools and systems
- Network devices and security systems
- Physical facilities and data centers

### 2.2 Covered Personnel

This policy applies to:

- All employees (full-time, part-time, temporary)
- Contractors and consultants
- Third-party vendors with system access
- Automated systems and service accounts

---

## 3. Policy Statements

### 3.1 Core Principles

| Principle                | Description                                     |
| ------------------------ | ----------------------------------------------- |
| **Identification**       | All users must be uniquely identified           |
| **Authentication**       | Users must prove their identity before access   |
| **Authorization**        | Access is limited to what is necessary          |
| **Accountability**       | All access is logged and auditable              |
| **Least Privilege**      | Minimum access necessary for job functions      |
| **Separation of Duties** | Critical functions require multiple individuals |
| **Need-to-Know**         | Access based on business requirement            |

### 3.2 Access Requirements

1. All access to AIVO systems requires explicit authorization
2. Access requests must have documented business justification
3. Access is granted through formal request and approval process
4. Access is reviewed periodically and upon role changes
5. Access is revoked immediately upon termination

---

## 4. Account Management

### 4.1 Account Types

| Account Type          | Purpose                   | Approval                     | Review Frequency |
| --------------------- | ------------------------- | ---------------------------- | ---------------- |
| **Standard User**     | Regular employee access   | Manager                      | Quarterly        |
| **Privileged User**   | Administrative access     | Security + Manager           | Monthly          |
| **Service Account**   | Application/system access | Application Owner + Security | Quarterly        |
| **Guest Account**     | Temporary external access | Sponsor + Security           | Per engagement   |
| **Emergency Account** | Break-glass access        | CISO                         | Per use          |

### 4.2 Account Creation

#### Process

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  Request   │───▶│  Approval  │───▶│ Provision  │───▶│  Confirm   │
│  Submitted │    │            │    │            │    │            │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
      │                 │                 │                 │
      ▼                 ▼                 ▼                 ▼
  IT Ticket        Manager +          Identity          User
  Created       Role-based          Provider         Notified
               Approval Matrix       Updated
```

#### Requirements

- Employment verified by HR before account creation
- Unique user ID assigned (email format: first.last@aivo.com)
- Initial password follows complexity requirements
- Password change required on first login
- Security training assigned within 24 hours

#### Account Naming Convention

| Account Type    | Format                  | Example               |
| --------------- | ----------------------- | --------------------- |
| Employee        | first.last@aivo.com     | john.doe@aivo.com     |
| Contractor      | c-first.last@aivo.com   | c-jane.smith@aivo.com |
| Service Account | svc-application-env     | svc-auth-prod         |
| Admin Account   | adm-first.last@aivo.com | adm-john.doe@aivo.com |

### 4.3 Account Modification

#### Triggers for Access Review

- Job transfer or promotion
- Organizational restructuring
- Project completion
- Leave of absence (>30 days)
- Return from leave
- Manager request

#### Process

1. Change request submitted via IT ticketing system
2. Current manager approves removal of existing access
3. New manager approves addition of new access
4. Security reviews for policy compliance
5. Changes implemented within SLA
6. User notified of changes

### 4.4 Account Deprovisioning

#### Termination Types and Response

| Termination Type            | Access Revocation | Device Collection |
| --------------------------- | ----------------- | ----------------- |
| Involuntary - Immediate     | Within 1 hour     | Same day          |
| Involuntary - Notice Period | End of notice     | Last day          |
| Voluntary                   | Last working day  | Last day          |
| Contractor End              | Contract end date | Contract end date |
| Death/Incapacitation        | Immediate         | As applicable     |

#### Deprovisioning Checklist

- [ ] Disable all user accounts (do not delete)
- [ ] Revoke VPN access
- [ ] Revoke cloud console access
- [ ] Revoke application access
- [ ] Remove from distribution lists
- [ ] Disable building/badge access
- [ ] Collect company devices
- [ ] Transfer ownership of files/resources
- [ ] Revoke API keys and tokens
- [ ] Update emergency contact lists
- [ ] Archive mailbox per retention policy

### 4.5 Shared and Generic Accounts

**Policy**: Shared and generic accounts are prohibited except for:

- Service accounts for applications
- Emergency/break-glass accounts
- Legacy systems with documented exception

**Requirements for Exceptions**:

- Documented business justification
- CISO approval
- Enhanced logging enabled
- Password stored in approved vault
- Password changed after each use (emergency) or quarterly (service)
- Activity attributed to individual when possible

---

## 5. Authentication

### 5.1 Password Policy

#### Requirements

| Parameter           | Requirement                                     |
| ------------------- | ----------------------------------------------- |
| Minimum Length      | 12 characters                                   |
| Maximum Length      | 128 characters                                  |
| Complexity          | Uppercase, lowercase, number, special character |
| Prohibited Patterns | Username, company name, common words            |
| Password History    | 12 previous passwords                           |
| Maximum Age         | 90 days (without MFA), No expiry (with MFA)     |
| Minimum Age         | 1 day                                           |
| Lockout Threshold   | 5 failed attempts                               |
| Lockout Duration    | 30 minutes (auto-unlock)                        |

#### Password Guidance

Users should:

- Use passphrases when possible (e.g., "correct-horse-battery-staple")
- Use a password manager for unique passwords
- Never share passwords
- Never write passwords down
- Never use same password across systems
- Change passwords immediately if compromise suspected

### 5.2 Multi-Factor Authentication (MFA)

#### MFA Required For

| System                    | Requirement |
| ------------------------- | ----------- |
| All production systems    | Required    |
| Cloud console (AWS)       | Required    |
| VPN access                | Required    |
| Email (Office 365/Google) | Required    |
| SSO portal                | Required    |
| Admin/privileged accounts | Required    |
| Code repositories         | Required    |
| CI/CD pipelines           | Required    |

#### Approved MFA Methods

| Priority | Method                        | Use Case                         |
| -------- | ----------------------------- | -------------------------------- |
| 1        | Hardware Security Key (FIDO2) | Preferred for all users          |
| 2        | Authenticator App (TOTP)      | Standard method                  |
| 3        | Push Notification             | Mobile users                     |
| 4        | SMS                           | Backup only (not for privileged) |

#### MFA Exceptions

MFA exceptions require:

- Documented business justification
- Compensating controls identified
- Security team approval
- Time-limited approval (max 90 days)
- Quarterly review if ongoing

### 5.3 Single Sign-On (SSO)

- SSO required for all supported applications
- SAML 2.0 or OIDC protocols
- Session timeout: 8 hours idle, 12 hours absolute
- Re-authentication required for sensitive operations

### 5.4 Session Management

| Parameter              | Web Applications     | APIs              |
| ---------------------- | -------------------- | ----------------- |
| Idle Timeout           | 15 minutes           | N/A               |
| Absolute Timeout       | 8 hours              | 24 hours (token)  |
| Concurrent Sessions    | 3 maximum            | N/A               |
| Session Token Rotation | After authentication | Per request (JWT) |

---

## 6. Authorization

### 6.1 Role-Based Access Control (RBAC)

#### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    Super Administrator                       │
│              (Emergency use only, break-glass)              │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    System Administrators                     │
│                (Infrastructure and platform)                 │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Application   │    │   Database    │    │   Security    │
│ Administrators│    │ Administrators│    │ Administrators│
└───────────────┘    └───────────────┘    └───────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Power Users                             │
│              (Enhanced access for specific needs)            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Standard Users                           │
│                  (Day-to-day operations)                     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Read-Only Users                          │
│                    (View access only)                        │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Standard Roles

#### Engineering Roles

| Role                | Access                               | Systems                            |
| ------------------- | ------------------------------------ | ---------------------------------- |
| Software Engineer   | Read/write code, deploy to staging   | GitHub, staging environments       |
| Senior Engineer     | Deploy to production, review PRs     | GitHub, staging, production deploy |
| Tech Lead           | Approve releases, manage team access | GitHub admin, CI/CD                |
| Engineering Manager | Team access management               | HR systems, GitHub org             |

#### Operations Roles

| Role                | Access                           | Systems                       |
| ------------------- | -------------------------------- | ----------------------------- |
| Operations Analyst  | Read-only monitoring             | Grafana, Datadog              |
| Operations Engineer | Incident response, configuration | AWS (limited), Kubernetes     |
| Senior Operations   | Full infrastructure access       | AWS (broad), Kubernetes admin |
| Operations Manager  | Team access management           | All operations systems        |

#### Support Roles

| Role            | Access                        | Systems                     |
| --------------- | ----------------------------- | --------------------------- |
| Support Agent   | Customer data (read), tickets | Zendesk, limited app access |
| Support Lead    | Elevated customer data        | Zendesk admin, app access   |
| Support Manager | Team management               | HR systems, Zendesk         |

### 6.3 Separation of Duties

#### Required Separations

| Function 1             | Function 2            | Rationale                    |
| ---------------------- | --------------------- | ---------------------------- |
| Code development       | Production deployment | Prevent unauthorized changes |
| Access request         | Access approval       | Prevent self-approval        |
| Transaction initiation | Transaction approval  | Financial controls           |
| Security monitoring    | System administration | Detective control integrity  |
| Key management         | Encryption operations | Key security                 |

#### Implementation

- Different accounts for development and production
- Approval workflows require different individuals
- Audit logging for all privileged operations
- Regular review for policy violations

### 6.4 Data Access Authorization

#### By Data Classification

| Classification | Authorization Required          | Access Method                    |
| -------------- | ------------------------------- | -------------------------------- |
| Public         | None                            | Direct access                    |
| Internal       | Employee status                 | SSO authentication               |
| Confidential   | Manager + Data Owner            | Request workflow                 |
| Restricted     | Manager + Data Owner + Security | Request workflow + justification |

#### Student Data Access

Special requirements for student data (FERPA/COPPA):

- Explicit business need documentation
- Training completion verification
- Manager and compliance approval
- Time-limited access
- Enhanced audit logging
- No bulk export without CISO approval

---

## 7. Access Reviews

### 7.1 Review Schedule

| Review Type              | Frequency | Scope                | Owner              |
| ------------------------ | --------- | -------------------- | ------------------ |
| User Access Review       | Quarterly | All active users     | Managers           |
| Privileged Access Review | Monthly   | Admin accounts       | Security Team      |
| Service Account Review   | Quarterly | All service accounts | Application Owners |
| Dormant Account Review   | Monthly   | Inactive >60 days    | IT Operations      |
| External Access Review   | Monthly   | Vendors, contractors | Security Team      |
| Emergency Access Review  | Per use   | Break-glass accounts | CISO               |

### 7.2 Review Process

#### User Access Review

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  Generate  │───▶│  Manager   │───▶│  Remediate │───▶│  Document  │
│   Report   │    │   Review   │    │            │    │            │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
      │                 │                 │                 │
      ▼                 ▼                 ▼                 ▼
  Access list      Confirm or        Revoke          Audit trail
  per manager      flag excess      flagged           retained
                    access           access
```

#### Review Completion Requirements

- Review due within 10 business days of initiation
- Escalation to Director if not completed in 15 days
- Escalation to CISO if not completed in 20 days
- 100% completion required for SOC 2 compliance

### 7.3 Dormant Account Handling

| Inactivity Period | Action                                   |
| ----------------- | ---------------------------------------- |
| 30 days           | Warning notification to user and manager |
| 60 days           | Account disabled, user notified          |
| 90 days           | Account flagged for deletion review      |
| 180 days          | Account deleted (after approval)         |

Exceptions:

- Leave of absence (documented)
- Service accounts (reviewed separately)
- Emergency accounts (never auto-disabled)

---

## 8. Privileged Access Management

### 8.1 Privileged Access Definition

Privileged access includes:

- System administrator accounts
- Database administrator accounts
- Root/sudo access
- Cloud console administrative access
- Security system administration
- Network device administration
- Application administrative functions

### 8.2 Privileged Access Requirements

| Requirement             | Description                                        |
| ----------------------- | -------------------------------------------------- |
| Separate Account        | Privileged account separate from daily use account |
| Enhanced Authentication | Hardware MFA required                              |
| Just-in-Time Access     | Access granted only when needed                    |
| Time-Limited            | Session duration limited                           |
| Session Recording       | All sessions recorded                              |
| Approval                | Each use requires approval for sensitive systems   |
| Logging                 | All commands/actions logged                        |
| Review                  | Monthly review of all privileged access            |

### 8.3 Privileged Access Workstations (PAW)

For high-security administrative tasks:

- Dedicated workstation for administrative functions
- Hardened operating system
- No internet access (or highly restricted)
- No email or general productivity tools
- Enhanced monitoring and logging

### 8.4 Break-Glass Procedures

#### When to Use

- System emergency requiring immediate access
- Normal approval process unavailable
- Business-critical situation

#### Process

1. Retrieve credentials from secure vault
2. Document reason and business justification
3. Perform necessary actions
4. Change credentials immediately after use
5. Submit incident report within 24 hours
6. CISO review of all break-glass usage

---

## 9. Remote Access

### 9.1 VPN Requirements

| Requirement         | Implementation               |
| ------------------- | ---------------------------- |
| Protocol            | IKEv2 or WireGuard           |
| Encryption          | AES-256                      |
| Authentication      | Certificate + MFA            |
| Split Tunneling     | Prohibited                   |
| Session Duration    | 8 hours maximum              |
| Concurrent Sessions | 1 per user                   |
| Device Posture      | Required (corporate devices) |

### 9.2 Remote Work Security

Requirements for remote work:

- Company-managed device or approved BYOD
- VPN for accessing internal resources
- Secure home network (WPA2/WPA3)
- Physical security of workspace
- No work on public WiFi without VPN
- Screen privacy when in public spaces

### 9.3 Cloud Access

| Service     | Access Method         | Authentication         |
| ----------- | --------------------- | ---------------------- |
| AWS Console | SSO + MFA             | SAML + Hardware MFA    |
| AWS CLI     | Temporary credentials | STS assume-role        |
| Kubernetes  | kubectl via VPN       | OIDC + MFA             |
| Databases   | Bastion + SSL         | Certificate + password |

---

## 10. Third-Party Access

### 10.1 Vendor Access Requirements

Before granting access:

- [ ] Vendor security assessment completed
- [ ] NDA and DPA executed
- [ ] Business justification documented
- [ ] Access scope defined and limited
- [ ] Sponsor identified (AIVO employee)
- [ ] Security training completed
- [ ] Background check (if accessing sensitive data)

### 10.2 Vendor Account Management

| Aspect       | Requirement                      |
| ------------ | -------------------------------- |
| Account Type | Contractor account (c-prefix)    |
| Duration     | Time-limited, matches contract   |
| Access       | Minimum necessary for engagement |
| MFA          | Required                         |
| Review       | Monthly by sponsor               |
| Termination  | Same-day upon contract end       |

### 10.3 Vendor Access Monitoring

- All vendor access logged
- Anomaly detection enabled
- Quarterly access review with sponsor
- Annual vendor security reassessment

---

## 11. Physical Access

### 11.1 Facility Access Levels

| Level       | Description                   | Areas                     | Approval              |
| ----------- | ----------------------------- | ------------------------- | --------------------- |
| Public      | Lobby, reception              | Entry areas               | None                  |
| General     | Office space                  | Work areas                | Employee badge        |
| Restricted  | Server rooms, executive areas | Sensitive areas           | Manager + Security    |
| Data Center | Production infrastructure     | Cloud provider facilities | Security + Facilities |

### 11.2 Badge Access

| Aspect      | Requirement                                  |
| ----------- | -------------------------------------------- |
| Issuance    | HR verification + security orientation       |
| Photo       | Required, renewed every 3 years              |
| Sharing     | Prohibited                                   |
| Loss        | Report immediately, deactivate within 1 hour |
| Termination | Collected on last day                        |
| Tailgating  | Prohibited, report violations                |

### 11.3 Visitor Access

- All visitors must sign in at reception
- Visitor badge required and visible
- Escort required for restricted areas
- Access limited to business hours unless approved
- Visitor logs retained for 1 year

---

## 12. Roles and Responsibilities

### 12.1 Security Team

- Define and maintain access control policies
- Configure and manage identity systems
- Conduct access reviews
- Investigate access-related incidents
- Approve privileged access requests

### 12.2 IT Operations

- Provision and deprovision user accounts
- Implement access control configurations
- Manage identity provider systems
- Support access-related issues
- Execute access changes per approved requests

### 12.3 Managers

- Approve access requests for direct reports
- Conduct quarterly access reviews
- Report terminated employees promptly
- Ensure team compliance with policy
- Define job-appropriate access profiles

### 12.4 Data Owners

- Classify data and define access requirements
- Approve access to their data assets
- Review and certify data access quarterly
- Report unauthorized access attempts

### 12.5 Users

- Protect authentication credentials
- Report lost/stolen credentials immediately
- Request only necessary access
- Complete required security training
- Comply with access control policies

---

## 13. Compliance

### 13.1 Monitoring

- Daily review of access-related alerts
- Weekly review of privileged access logs
- Monthly access metrics reporting
- Quarterly policy compliance assessment

### 13.2 Audit

- Annual access control audit
- SOC 2 Type II attestation
- Internal audit of access reviews
- Penetration testing of access controls

### 13.3 Violations

Violations of this policy may result in:

- Access revocation
- Disciplinary action
- Termination
- Legal action

---

## 14. Related Documents

| Document                                                        | Description                  |
| --------------------------------------------------------------- | ---------------------------- |
| [Information Security Policy](./information-security-policy.md) | Overarching security policy  |
| [Data Protection Policy](./data-protection-policy.md)           | Data handling requirements   |
| [Acceptable Use Policy](./acceptable-use-policy.md)             | System usage guidelines      |
| [Incident Response Plan](./incident-response-plan.md)           | Security incident procedures |

---

## 15. Revision History

| Version | Date       | Author | Changes                           |
| ------- | ---------- | ------ | --------------------------------- |
| 1.0     | 2023-01-01 | CISO   | Initial release                   |
| 1.1     | 2023-04-01 | CISO   | Added MFA requirements            |
| 1.2     | 2023-08-01 | CISO   | Updated privileged access section |
| 2.0     | 2024-01-01 | CISO   | Annual review, enhanced RBAC      |

---

## Approval

| Role           | Name | Signature  | Date       |
| -------------- | ---- | ---------- | ---------- |
| Document Owner | CISO | ****\_**** | 2024-01-15 |
| Reviewer       | CTO  | ****\_**** | 2024-01-15 |
| Approver       | CEO  | ****\_**** | 2024-01-15 |
