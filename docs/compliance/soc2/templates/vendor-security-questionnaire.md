# Vendor Security Questionnaire

**Document ID:** TMPL-VSQ-001  
**Version:** 1.0  
**Last Updated:** January 15, 2024  
**Classification:** Confidential

---

## Instructions

This security questionnaire is designed to assess the security posture of vendors seeking to provide services to AIVO Platform. Please complete all sections relevant to your services. If a section is not applicable, please indicate "N/A" with a brief explanation.

**Response Guidelines:**

- Provide detailed responses with evidence where requested
- If a control is not in place, describe compensating controls or plans
- Attach relevant documentation (policies, certifications, reports)
- Contact security@aivo.com with questions

---

## Section 1: Vendor Information

### 1.1 Company Details

| Field               | Response |
| ------------------- | -------- |
| Company Legal Name  |          |
| DBA (if different)  |          |
| Address             |          |
| Website             |          |
| Year Established    |          |
| Number of Employees |          |
| Annual Revenue      |          |
| Primary Industry    |          |

### 1.2 Contacts

| Role              | Name | Email | Phone |
| ----------------- | ---- | ----- | ----- |
| Primary Contact   |      |       |       |
| Security Contact  |      |       |       |
| Privacy Contact   |      |       |       |
| Executive Sponsor |      |       |       |

### 1.3 Services Provided

| Question                                  | Response       |
| ----------------------------------------- | -------------- |
| Describe the services to be provided      |                |
| What AIVO data will you access/process?   |                |
| Where will AIVO data be stored?           |                |
| Will you use subprocessors for AIVO data? | [ ] Yes [ ] No |
| If yes, list subprocessors                |                |

---

## Section 2: Compliance and Certifications

### 2.1 Security Certifications

| Certification | Status                         | Expiration | Attach Certificate |
| ------------- | ------------------------------ | ---------- | ------------------ |
| SOC 2 Type II | [ ] Yes [ ] No [ ] In Progress |            |                    |
| SOC 1         | [ ] Yes [ ] No [ ] In Progress |            |                    |
| ISO 27001     | [ ] Yes [ ] No [ ] In Progress |            |                    |
| ISO 27701     | [ ] Yes [ ] No [ ] In Progress |            |                    |
| PCI DSS       | [ ] Yes [ ] No [ ] In Progress |            |                    |
| FedRAMP       | [ ] Yes [ ] No [ ] In Progress |            |                    |
| HIPAA         | [ ] Yes [ ] No [ ] In Progress |            |                    |
| Other         |                                |            |                    |

### 2.2 Regulatory Compliance

| Question                                                  | Response               |
| --------------------------------------------------------- | ---------------------- |
| Are you compliant with FERPA requirements?                | [ ] Yes [ ] No [ ] N/A |
| Are you compliant with COPPA requirements?                | [ ] Yes [ ] No [ ] N/A |
| Are you compliant with GDPR requirements?                 | [ ] Yes [ ] No [ ] N/A |
| Are you compliant with CCPA requirements?                 | [ ] Yes [ ] No [ ] N/A |
| Have you had any regulatory findings in the past 3 years? | [ ] Yes [ ] No         |
| If yes, please describe                                   |                        |

### 2.3 Third-Party Assessments

| Question                                                         | Response       |
| ---------------------------------------------------------------- | -------------- |
| Date of last penetration test                                    |                |
| Were critical/high findings identified?                          | [ ] Yes [ ] No |
| Are all findings remediated?                                     | [ ] Yes [ ] No |
| Date of last vulnerability assessment                            |                |
| Please provide executive summary of most recent penetration test |                |

---

## Section 3: Information Security Program

### 3.1 Governance

| Question                                              | Response       |
| ----------------------------------------------------- | -------------- |
| Do you have a documented Information Security Policy? | [ ] Yes [ ] No |
| How often is the policy reviewed?                     |                |
| Who is responsible for information security?          |                |
| Do you have a dedicated security team?                | [ ] Yes [ ] No |
| Number of security personnel                          |                |
| Do you have a security awareness training program?    | [ ] Yes [ ] No |
| How often is training conducted?                      |                |
| Is security awareness training mandatory?             | [ ] Yes [ ] No |

### 3.2 Risk Management

| Question                                         | Response       |
| ------------------------------------------------ | -------------- |
| Do you conduct regular risk assessments?         | [ ] Yes [ ] No |
| How often are risk assessments performed?        |                |
| Do you maintain a risk register?                 | [ ] Yes [ ] No |
| How are identified risks tracked and remediated? |                |

---

## Section 4: Access Control

### 4.1 Identity and Access Management

| Question                                          | Response       |
| ------------------------------------------------- | -------------- |
| Do you enforce unique user IDs for all users?     | [ ] Yes [ ] No |
| Do you require multi-factor authentication (MFA)? | [ ] Yes [ ] No |
| What MFA methods are supported?                   |                |
| Is MFA enforced for all access?                   | [ ] Yes [ ] No |
| Is MFA enforced for administrative access?        | [ ] Yes [ ] No |
| Do you use Single Sign-On (SSO)?                  | [ ] Yes [ ] No |
| What SSO protocols are supported?                 |                |

### 4.2 Password Policy

| Parameter                 | Your Policy |
| ------------------------- | ----------- |
| Minimum password length   |             |
| Complexity requirements   |             |
| Password expiration       |             |
| Password history          |             |
| Account lockout threshold |             |
| Account lockout duration  |             |

### 4.3 Access Reviews

| Question                                        | Response |
| ----------------------------------------------- | -------- |
| How often do you review user access?            |          |
| How often do you review administrative access?  |          |
| What is your process for access termination?    |          |
| How quickly is access revoked upon termination? |          |

### 4.4 Privileged Access

| Question                                            | Response       |
| --------------------------------------------------- | -------------- |
| Do you use privileged access management (PAM)?      | [ ] Yes [ ] No |
| How is privileged access logged?                    |                |
| Is session recording enabled for privileged access? | [ ] Yes [ ] No |
| How often are privileged accounts reviewed?         |                |

---

## Section 5: Data Protection

### 5.1 Data Classification

| Question                                   | Response       |
| ------------------------------------------ | -------------- |
| Do you have a data classification policy?  | [ ] Yes [ ] No |
| How many classification levels do you use? |                |
| How would AIVO data be classified?         |                |

### 5.2 Encryption

| Question                           | Response       |
| ---------------------------------- | -------------- |
| **Data at Rest**                   |                |
| Is AIVO data encrypted at rest?    | [ ] Yes [ ] No |
| What encryption algorithm is used? |                |
| What key size is used?             |                |
| Where are encryption keys stored?  |                |
| **Data in Transit**                |                |
| Is AIVO data encrypted in transit? | [ ] Yes [ ] No |
| What TLS version is supported?     |                |
| Do you support TLS 1.2 or higher?  | [ ] Yes [ ] No |
| Are weak cipher suites disabled?   | [ ] Yes [ ] No |

### 5.3 Data Retention and Disposal

| Question                               | Response       |
| -------------------------------------- | -------------- |
| What is your data retention policy?    |                |
| How long will AIVO data be retained?   |                |
| How is data securely disposed of?      |                |
| Can you provide deletion certificates? | [ ] Yes [ ] No |

### 5.4 Data Loss Prevention

| Question                           | Response       |
| ---------------------------------- | -------------- |
| Do you have DLP controls in place? | [ ] Yes [ ] No |
| What DLP tools do you use?         |                |
| Are data transfers monitored?      | [ ] Yes [ ] No |

---

## Section 6: Network Security

### 6.1 Network Architecture

| Question                                             | Response       |
| ---------------------------------------------------- | -------------- |
| Is your network segmented?                           | [ ] Yes [ ] No |
| Is production isolated from development?             | [ ] Yes [ ] No |
| Do you use firewalls?                                | [ ] Yes [ ] No |
| Is a Web Application Firewall (WAF) deployed?        | [ ] Yes [ ] No |
| Do you use intrusion detection/prevention (IDS/IPS)? | [ ] Yes [ ] No |

### 6.2 Remote Access

| Question                                  | Response       |
| ----------------------------------------- | -------------- |
| How do employees access systems remotely? |                |
| Is VPN required for remote access?        | [ ] Yes [ ] No |
| Is split tunneling allowed?               | [ ] Yes [ ] No |
| Is MFA required for remote access?        | [ ] Yes [ ] No |

---

## Section 7: Application Security

### 7.1 Secure Development

| Question                                                | Response       |
| ------------------------------------------------------- | -------------- |
| Do you have a secure SDLC process?                      | [ ] Yes [ ] No |
| Do you perform code reviews?                            | [ ] Yes [ ] No |
| Do you use static application security testing (SAST)?  | [ ] Yes [ ] No |
| Do you use dynamic application security testing (DAST)? | [ ] Yes [ ] No |
| Do you scan for vulnerable dependencies?                | [ ] Yes [ ] No |
| What SAST/DAST tools do you use?                        |                |

### 7.2 Change Management

| Question                                          | Response       |
| ------------------------------------------------- | -------------- |
| Do you have a change management process?          | [ ] Yes [ ] No |
| Are changes approved before deployment?           | [ ] Yes [ ] No |
| Are changes tested before production?             | [ ] Yes [ ] No |
| Is production access segregated from development? | [ ] Yes [ ] No |
| Do you maintain rollback procedures?              | [ ] Yes [ ] No |

---

## Section 8: Operations and Monitoring

### 8.1 Logging and Monitoring

| Question                           | Response       |
| ---------------------------------- | -------------- |
| Do you log security events?        | [ ] Yes [ ] No |
| What events are logged?            |                |
| How long are logs retained?        |                |
| Are logs protected from tampering? | [ ] Yes [ ] No |
| Do you use a SIEM?                 | [ ] Yes [ ] No |
| Are logs monitored 24/7?           | [ ] Yes [ ] No |

### 8.2 Vulnerability Management

| Question                                      | Response |
| --------------------------------------------- | -------- |
| How often do you perform vulnerability scans? |          |
| What are your remediation SLAs by severity?   |          |
| Critical:                                     |          |
| High:                                         |          |
| Medium:                                       |          |
| Low:                                          |          |
| How do you track vulnerability remediation?   |          |

---

## Section 9: Incident Response

### 9.1 Incident Management

| Question                                         | Response       |
| ------------------------------------------------ | -------------- |
| Do you have an incident response plan?           | [ ] Yes [ ] No |
| How often is the plan tested?                    |                |
| Do you have a 24/7 incident response capability? | [ ] Yes [ ] No |
| What is your initial response SLA?               |                |

### 9.2 Breach Notification

| Question                                                  | Response       |
| --------------------------------------------------------- | -------------- |
| Within what timeframe will you notify AIVO of a breach?   |                |
| What information will be included in breach notification? |                |
| Have you experienced any breaches in the past 3 years?    | [ ] Yes [ ] No |
| If yes, please describe                                   |                |

---

## Section 10: Business Continuity

### 10.1 Disaster Recovery

| Question                                     | Response       |
| -------------------------------------------- | -------------- |
| Do you have a disaster recovery plan?        | [ ] Yes [ ] No |
| How often is the DR plan tested?             |                |
| What is your RTO (Recovery Time Objective)?  |                |
| What is your RPO (Recovery Point Objective)? |                |
| Where is your DR site located?               |                |

### 10.2 Backup

| Question                              | Response       |
| ------------------------------------- | -------------- |
| How often are backups performed?      |                |
| Are backups encrypted?                | [ ] Yes [ ] No |
| Are backups stored off-site?          | [ ] Yes [ ] No |
| How often are backup restores tested? |                |

### 10.3 Availability

| Question                               | Response       |
| -------------------------------------- | -------------- |
| What is your uptime SLA?               |                |
| What was your actual uptime last year? |                |
| Do you have a status page?             | [ ] Yes [ ] No |
| URL:                                   |                |

---

## Section 11: Physical Security

### 11.1 Data Center Security

| Question                                             | Response       |
| ---------------------------------------------------- | -------------- |
| Where is AIVO data hosted?                           |                |
| Do you use your own data centers or cloud providers? |                |
| If cloud, which provider(s)?                         |                |
| What physical security controls are in place?        |                |
| Are data centers SOC 2 certified?                    | [ ] Yes [ ] No |

---

## Section 12: Third-Party Management

### 12.1 Subprocessors

| Question                                            | Response       |
| --------------------------------------------------- | -------------- |
| Do you use subprocessors for AIVO data?             | [ ] Yes [ ] No |
| Please list all subprocessors                       |                |
| How do you assess subprocessor security?            |                |
| Do subprocessors have equivalent security controls? | [ ] Yes [ ] No |
| Will you notify AIVO of subprocessor changes?       | [ ] Yes [ ] No |

---

## Section 13: Insurance

### 13.1 Coverage

| Insurance Type     | Coverage Amount | Policy Number |
| ------------------ | --------------- | ------------- |
| Cyber Liability    |                 |               |
| Errors & Omissions |                 |               |
| General Liability  |                 |               |

---

## Section 14: Additional Information

### 14.1 Attachments

Please attach the following documents if available:

- [ ] SOC 2 Type II Report
- [ ] ISO 27001 Certificate
- [ ] Information Security Policy
- [ ] Privacy Policy
- [ ] Penetration Test Executive Summary
- [ ] Business Continuity Plan Summary
- [ ] Certificate of Insurance

### 14.2 Additional Comments

_Please provide any additional information that may be relevant to this assessment:_

---

## Section 15: Attestation

I certify that the information provided in this questionnaire is accurate and complete to the best of my knowledge.

| Field     | Response |
| --------- | -------- |
| Name      |          |
| Title     |          |
| Date      |          |
| Signature |          |

---

## For AIVO Use Only

### Assessment Results

| Section                | Rating | Comments |
| ---------------------- | ------ | -------- |
| Compliance             |        |          |
| Access Control         |        |          |
| Data Protection        |        |          |
| Network Security       |        |          |
| Application Security   |        |          |
| Operations             |        |          |
| Incident Response      |        |          |
| Business Continuity    |        |          |
| Physical Security      |        |          |
| Third-Party Management |        |          |

### Overall Assessment

| Field               | Value                                                    |
| ------------------- | -------------------------------------------------------- |
| Risk Tier           | [ ] 1 (Critical) [ ] 2 (High) [ ] 3 (Medium) [ ] 4 (Low) |
| Overall Rating      | [ ] Approved [ ] Conditional [ ] Rejected                |
| Conditions (if any) |                                                          |
| Assessed By         |                                                          |
| Assessment Date     |                                                          |
| Next Review Date    |                                                          |
