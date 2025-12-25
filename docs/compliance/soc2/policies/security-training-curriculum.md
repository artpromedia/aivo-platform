# Employee Security Training Curriculum

**Document ID:** POL-SEC-010  
**Version:** 1.0  
**Last Updated:** January 15, 2024  
**Owner:** Chief Information Security Officer  
**Classification:** Internal

---

## 1. Overview

This document outlines the security awareness training curriculum for AIVO Platform employees, contractors, and third-party personnel with access to AIVO systems or data. Security training is mandatory for SOC 2 Type II compliance and regulatory requirements (FERPA, COPPA).

---

## 2. Training Requirements

### 2.1 Mandatory Training by Role

| Role             | Onboarding      | Annual             | Role-Specific           |
| ---------------- | --------------- | ------------------ | ----------------------- |
| All Employees    | Security Basics | Security Refresher | -                       |
| Engineering      | Security Basics | Security Refresher | Secure Development      |
| DevOps/SRE       | Security Basics | Security Refresher | Infrastructure Security |
| Data/Analytics   | Security Basics | Security Refresher | Data Handling           |
| Customer Support | Security Basics | Security Refresher | Privacy & Data Access   |
| Management       | Security Basics | Security Refresher | Security Leadership     |
| Executives       | Security Basics | Security Refresher | Executive Briefing      |
| Contractors      | Security Basics | Annual Renewal     | Role-based              |

### 2.2 Training Timeline

| Training             | When                  | Duration | Pass Score |
| -------------------- | --------------------- | -------- | ---------- |
| Security Basics      | Within 7 days of hire | 60 min   | 80%        |
| Privacy Fundamentals | Within 7 days of hire | 30 min   | 80%        |
| Role-Specific        | Within 30 days        | Varies   | 80%        |
| Annual Refresher     | Annually              | 45 min   | 80%        |
| Phishing Simulation  | Quarterly             | N/A      | N/A        |

---

## 3. Course Catalog

### 3.1 SEC-101: Security Awareness Basics

**Duration:** 60 minutes  
**Target Audience:** All personnel  
**Frequency:** Onboarding, Annual

#### Learning Objectives

- Understand the importance of information security
- Recognize common security threats
- Apply security best practices in daily work
- Know how to report security incidents

#### Module 1: Introduction to Security (15 min)

1. Why security matters
   - Protecting student data and privacy
   - Business impact of breaches
   - Personal responsibility
2. Security at AIVO
   - Our security program
   - Compliance requirements (SOC 2, FERPA, COPPA)
   - Security team and resources

#### Module 2: Password and Authentication (10 min)

1. Creating strong passwords
   - Length and complexity requirements
   - Using passphrases
   - Avoiding common mistakes
2. Multi-factor authentication
   - Why MFA is required
   - Setting up authenticator apps
   - Hardware keys
3. Password managers
   - Approved password managers
   - Best practices

#### Module 3: Phishing and Social Engineering (15 min)

1. What is phishing?
   - Email phishing
   - Spear phishing
   - Voice phishing (vishing)
   - SMS phishing (smishing)
2. Recognizing phishing attempts
   - Red flags to watch for
   - Verifying sender identity
   - Hovering over links
3. What to do if you suspect phishing
   - Don't click, don't reply
   - Report to security team
   - Forward suspicious emails

#### Module 4: Safe Computing (10 min)

1. Device security
   - Screen locking
   - Full disk encryption
   - Software updates
2. Working remotely
   - VPN usage
   - Secure Wi-Fi
   - Public location awareness
3. Physical security
   - Clean desk policy
   - Visitor handling
   - Badge security

#### Module 5: Data Protection (10 min)

1. Data classification
   - Understanding classification levels
   - Handling requirements
2. Protecting sensitive data
   - Encryption
   - Access controls
   - Secure sharing
3. Data disposal
   - Secure deletion
   - Document destruction

#### Assessment

- 20 multiple-choice questions
- Pass score: 80%
- 2 attempts allowed

---

### 3.2 SEC-102: Privacy Fundamentals

**Duration:** 30 minutes  
**Target Audience:** All personnel  
**Frequency:** Onboarding, Annual

#### Learning Objectives

- Understand privacy regulations affecting AIVO
- Handle personal data appropriately
- Recognize and respond to privacy requests

#### Module 1: Privacy Regulations (10 min)

1. FERPA - Student Privacy
   - What is an education record
   - Directory information
   - Parental rights
   - Legitimate educational interest
2. COPPA - Children's Privacy
   - Applicable age groups
   - Verifiable parental consent
   - Data minimization
3. GDPR and CCPA Overview
   - Data subject rights
   - Consent requirements
   - Cross-border transfers

#### Module 2: Handling Personal Data (10 min)

1. What is PII?
   - Types of personal information
   - Sensitive vs. non-sensitive
2. Data minimization
   - Collect only what's needed
   - Purpose limitation
3. Storage and access
   - Need-to-know principle
   - Time limits on access

#### Module 3: Privacy Rights and Requests (10 min)

1. Access requests
   - How to handle data requests
   - Escalation procedures
2. Deletion requests
   - Right to deletion
   - Processing timeline
3. Reporting concerns
   - Privacy incident reporting
   - Contacting the DPO

#### Assessment

- 15 multiple-choice questions
- Pass score: 80%

---

### 3.3 SEC-201: Secure Development Training

**Duration:** 120 minutes  
**Target Audience:** Engineering (Development, QA)  
**Frequency:** Onboarding, Annual

#### Learning Objectives

- Apply secure coding practices
- Identify and prevent OWASP Top 10 vulnerabilities
- Use security testing tools effectively
- Handle security vulnerabilities appropriately

#### Module 1: Secure SDLC (20 min)

1. Security in the development lifecycle
   - Design reviews
   - Code reviews
   - Security testing
2. Threat modeling
   - STRIDE methodology
   - Data flow diagrams
   - Trust boundaries

#### Module 2: OWASP Top 10 (40 min)

1. A01: Broken Access Control
   - Horizontal privilege escalation
   - Vertical privilege escalation
   - Prevention techniques
2. A02: Cryptographic Failures
   - Data in transit
   - Data at rest
   - Key management
3. A03: Injection
   - SQL injection
   - Command injection
   - Prevention with parameterized queries
4. A04: Insecure Design
   - Security by design
   - Defense in depth
5. A05: Security Misconfiguration
   - Default credentials
   - Unnecessary features
   - Error handling
6. A06: Vulnerable Components
   - Dependency scanning
   - Update policies
7. A07: Authentication Failures
   - Session management
   - Credential storage
   - MFA implementation
8. A08: Software and Data Integrity
   - CI/CD security
   - Dependency verification
9. A09: Security Logging and Monitoring
   - What to log
   - Log protection
   - Alerting
10. A10: Server-Side Request Forgery
    - SSRF attacks
    - Prevention techniques

#### Module 3: Secure Coding in TypeScript/Node.js (30 min)

1. Input validation
   - Validation libraries (Zod, Joi)
   - Sanitization
2. Output encoding
   - XSS prevention
   - Content Security Policy
3. Authentication and session management
   - JWT best practices
   - Session security
4. Error handling
   - Information leakage
   - Generic error messages

#### Module 4: Security Testing (20 min)

1. Static analysis (SAST)
   - SonarQube usage
   - Resolving findings
2. Dependency scanning
   - npm audit
   - Snyk/Dependabot
3. Dynamic testing (DAST)
   - Understanding DAST results
   - API testing
4. Code review for security
   - Security checklist
   - Common issues to look for

#### Module 5: Handling Vulnerabilities (10 min)

1. Security bug process
   - Reporting vulnerabilities
   - Severity classification
   - Remediation SLAs
2. Security debt
   - Tracking security issues
   - Prioritization

#### Hands-on Labs

- Lab 1: Identifying SQL injection vulnerabilities
- Lab 2: Implementing proper authentication
- Lab 3: Using SAST tools
- Lab 4: Secure code review exercise

#### Assessment

- 30 questions (multiple choice and scenario-based)
- Pass score: 80%

---

### 3.4 SEC-202: Infrastructure Security Training

**Duration:** 90 minutes  
**Target Audience:** DevOps, SRE, Platform Engineering  
**Frequency:** Onboarding, Annual

#### Learning Objectives

- Implement secure infrastructure configurations
- Apply cloud security best practices
- Monitor and respond to security events

#### Module 1: Cloud Security Fundamentals (20 min)

1. AWS security model
   - Shared responsibility
   - AWS security services
2. Identity and access management
   - IAM best practices
   - Role-based access
   - Service accounts
3. Network security
   - VPCs and subnets
   - Security groups
   - Network ACLs

#### Module 2: Container and Kubernetes Security (25 min)

1. Container security
   - Image security
   - Runtime security
   - Secrets management
2. Kubernetes security
   - RBAC
   - Pod security standards
   - Network policies
3. Supply chain security
   - Image signing
   - Registry security

#### Module 3: Infrastructure as Code Security (20 min)

1. Terraform security
   - State file protection
   - Secret handling
   - Security scanning
2. Configuration management
   - Drift detection
   - Compliance as code

#### Module 4: Monitoring and Incident Response (25 min)

1. Security monitoring
   - Log aggregation
   - SIEM integration
   - Alert configuration
2. Incident detection
   - Indicators of compromise
   - Alert triage
3. Incident response
   - Containment procedures
   - Evidence preservation
   - Communication protocols

#### Assessment

- 25 questions
- Pass score: 80%

---

### 3.5 SEC-203: Data Handling Training

**Duration:** 60 minutes  
**Target Audience:** Data/Analytics, BI, Data Engineering  
**Frequency:** Onboarding, Annual

#### Learning Objectives

- Apply data classification requirements
- Handle student data in compliance with FERPA
- Implement data minimization and anonymization

#### Module 1: Data Classification in Practice (15 min)

1. Classification levels
   - Restricted data handling
   - Confidential data handling
   - Internal data handling
2. Data inventory
   - Understanding data assets
   - Data lineage

#### Module 2: Student Data Protection (20 min)

1. FERPA deep dive
   - Educational records definition
   - Legitimate educational interest
   - Disclosure requirements
2. COPPA compliance
   - Children's data restrictions
   - Parental consent
3. Data minimization
   - Collecting only necessary data
   - Retention limits

#### Module 3: Data Anonymization and Aggregation (15 min)

1. Anonymization techniques
   - De-identification
   - K-anonymity
   - Differential privacy basics
2. Aggregation rules
   - Minimum group sizes
   - Re-identification risks

#### Module 4: Secure Data Practices (10 min)

1. Query security
   - Parameterized queries
   - Access controls
2. Export controls
   - Approved export methods
   - Encryption requirements
3. Third-party data sharing
   - DPA requirements
   - Approval process

#### Assessment

- 20 questions
- Pass score: 80%

---

### 3.6 SEC-301: Security Leadership

**Duration:** 45 minutes  
**Target Audience:** Managers, Directors  
**Frequency:** Annual

#### Learning Objectives

- Promote security culture in teams
- Manage security risks effectively
- Support compliance requirements

#### Modules

1. Building security culture (15 min)
2. Risk management for leaders (15 min)
3. Incident response leadership (10 min)
4. Compliance and audit support (5 min)

---

### 3.7 SEC-302: Executive Security Briefing

**Duration:** 30 minutes  
**Target Audience:** Executives, Board Members  
**Frequency:** Annual

#### Modules

1. Threat landscape overview (10 min)
2. AIVO security program summary (10 min)
3. Compliance status and roadmap (5 min)
4. Risk register review (5 min)

---

## 4. Phishing Simulation Program

### 4.1 Program Overview

| Aspect      | Details                                       |
| ----------- | --------------------------------------------- |
| Frequency   | Monthly (randomly scheduled)                  |
| Target      | All employees with email                      |
| Scenarios   | Credential harvesting, attachment, link-based |
| Difficulty  | Progressive (increases over time)             |
| Measurement | Click rate, report rate                       |

### 4.2 Response Protocol

| User Action         | Response                             |
| ------------------- | ------------------------------------ |
| Reported email      | Positive acknowledgment, recognition |
| No interaction      | No action required                   |
| Clicked link        | Immediate training redirect          |
| Entered credentials | Training + manager notification      |
| Multiple failures   | 1:1 coaching + mandatory training    |

### 4.3 Success Metrics

| Metric              | Target |
| ------------------- | ------ |
| Click rate          | < 5%   |
| Report rate         | > 70%  |
| Credentials entered | < 1%   |

---

## 5. Training Delivery

### 5.1 Training Platforms

| Platform                         | Use Case                    |
| -------------------------------- | --------------------------- |
| LMS (Learning Management System) | Online courses, tracking    |
| Live Sessions                    | Role-specific deep dives    |
| Simulations                      | Phishing, incident response |
| Documentation                    | Reference materials         |

### 5.2 Accessibility

- All training available in multiple formats
- Closed captioning for videos
- Screen reader compatible
- Self-paced options available

---

## 6. Compliance Tracking

### 6.1 Training Records

| Record                      | Retention                        |
| --------------------------- | -------------------------------- |
| Completion certificates     | 7 years                          |
| Quiz scores                 | 7 years                          |
| Training history            | Duration of employment + 3 years |
| Phishing simulation results | 3 years                          |

### 6.2 Reporting

| Report               | Frequency | Audience                  |
| -------------------- | --------- | ------------------------- |
| Training completion  | Weekly    | Managers                  |
| Compliance dashboard | Monthly   | Leadership                |
| Phishing results     | Monthly   | Security Team, Leadership |
| Audit report         | Quarterly | Compliance, Auditors      |

### 6.3 Non-Compliance

| Situation                              | Action                     |
| -------------------------------------- | -------------------------- |
| Training not completed within deadline | Manager notification       |
| 7 days overdue                         | Access restriction warning |
| 14 days overdue                        | System access suspended    |
| Continued non-compliance               | HR involvement             |

---

## 7. Training Calendar Template

### 7.1 Annual Training Schedule

| Month     | Activity                                 |
| --------- | ---------------------------------------- |
| January   | Security awareness launch                |
| February  | Role-specific training                   |
| March     | Phishing simulation                      |
| April     | Privacy refresher                        |
| May       | Secure development workshop              |
| June      | Phishing simulation                      |
| July      | Incident response tabletop               |
| August    | Data handling refresher                  |
| September | Phishing simulation                      |
| October   | Cybersecurity awareness month activities |
| November  | Year-end compliance push                 |
| December  | Phishing simulation                      |

---

## 8. Metrics and KPIs

### 8.1 Training Metrics

| Metric                               | Target   | Frequency |
| ------------------------------------ | -------- | --------- |
| Training completion rate             | 100%     | Monthly   |
| Average quiz score                   | > 85%    | Quarterly |
| Time to complete onboarding training | < 7 days | Monthly   |
| Role-specific completion             | 100%     | Quarterly |

### 8.2 Effectiveness Metrics

| Metric                         | Target       | Frequency |
| ------------------------------ | ------------ | --------- |
| Phishing click rate            | < 5%         | Quarterly |
| Security incident rate         | YoY decrease | Quarterly |
| Policy violation rate          | YoY decrease | Quarterly |
| Employee security survey score | > 4/5        | Annual    |

---

## 9. Document Control

| Version | Date       | Author        | Changes            |
| ------- | ---------- | ------------- | ------------------ |
| 1.0     | 2024-01-15 | Security Team | Initial curriculum |

**Next Review Date:** July 2024

**Approval:**

| Role        | Name | Signature | Date |
| ----------- | ---- | --------- | ---- |
| CISO        |      |           |      |
| HR Director |      |           |      |
