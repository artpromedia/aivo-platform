# Security Policy

Thank you for helping keep **AIVO Platform** and its users safe. We take security issues seriously — especially given that our platform serves K-12 students (minors) and processes protected educational records (FERPA).

---

## Supported Versions

| Version / Branch | Supported          |
| ---------------  | ------------------ |
| `main` (latest)  | :white_check_mark: |
| Release tags      | Latest two minor releases |
| Older releases    | :x: — please upgrade |

## Reporting a Vulnerability

### Responsible Disclosure

We follow a **90-day coordinated disclosure** timeline:

1. **Report** the vulnerability via email (see below).
2. We will **acknowledge** receipt within **2 business days**.
3. We will **triage and assess** severity within **5 business days**.
4. We will work on a **fix** and coordinate a release timeline with you.
5. After the fix is released (or after 90 days, whichever comes first), you may publicly disclose the vulnerability.

### How to Report

**Email:** [security@aivo.com](mailto:security@aivo.com)

Please include:

- **Description** of the vulnerability
- **Steps to reproduce** (proof-of-concept code or screenshots)
- **Impact assessment** — what can an attacker do?
- **Affected component** — service name, endpoint, version
- **Your contact info** — for follow-up coordination

> **PGP encryption** is encouraged for sensitive reports.
> PGP Key Fingerprint: `[TO BE PUBLISHED — contact security@aivo.com for current key]`

### What to Report

We are interested in vulnerabilities such as:

- **Authentication / authorization bypasses** — gaining access without valid credentials or escalating privileges
- **Data exposure** — accessing another tenant's data, student PII leaks, FERPA violations
- **Injection attacks** — SQL injection, NoSQL injection, command injection, LDAP injection
- **Cross-Site Scripting (XSS)** — stored, reflected, or DOM-based
- **Cross-Site Request Forgery (CSRF)** — bypassing our Double-Submit Cookie protection
- **Server-Side Request Forgery (SSRF)** — accessing internal services or cloud metadata
- **Insecure Direct Object References (IDOR)** — accessing resources by manipulating IDs
- **Cryptographic weaknesses** — weak algorithms, key exposure, nonce reuse
- **Remote Code Execution (RCE)** — any form of arbitrary code execution
- **Privilege escalation** — student → teacher, teacher → admin, tenant → cross-tenant

### What NOT to Report

The following are generally out of scope:

- Rate limiting / brute-force without demonstrating a bypass of existing protections
- Social engineering (phishing, vishing) against employees
- Physical attacks against infrastructure
- Denial of service (DoS/DDoS) — unless it reveals an algorithmic complexity vulnerability
- Reports from automated scanners without manual validation
- Missing security headers on non-sensitive endpoints (e.g., marketing pages)
- Software version disclosure

---

## Severity Classification

We use [CVSS v3.1](https://www.first.org/cvss/calculator/3.1) for severity scoring:

| CVSS Score | Severity | Response SLA |
| ---------- | -------- | ------------ |
| 9.0 – 10.0 | **Critical** | Fix within 24 hours, hotfix release |
| 7.0 – 8.9  | **High**     | Fix within 7 days |
| 4.0 – 6.9  | **Medium**   | Fix within 30 days |
| 0.1 – 3.9  | **Low**      | Fix in next scheduled release |

### Additional factors for educational platforms:

- Vulnerabilities affecting **student data (minors)** are automatically escalated by one severity level
- **FERPA-regulated data** exposure is treated as minimum **High** severity
- **COPPA-applicable** issues (children under 13) are treated as minimum **Critical** severity

---

## Bug Bounty

We do not currently operate a formal bug bounty program, but we:

- **Acknowledge** security researchers in our release notes (with permission)
- **Coordinate** privately on fix timelines
- **Provide** a letter of appreciation for responsible disclosure
- Are working toward a formal bounty program — stay tuned

---

## Security Contact

**Primary:** [security@aivo.com](mailto:security@aivo.com)

**Response time:** 1–2 business days for initial acknowledgment

**Languages:** English

---

## Security Commitments

- All credentials are stored using industry-standard hashing (bcrypt, cost factor 12+)
- JWTs use RS256 asymmetric signing with key rotation every 90 days
- All inter-service communication uses TLS 1.2+
- Multi-tenant data isolation is enforced at the database query level (Row-Level Security)
- Audit logs are immutable and retained for 7 years (FERPA requirement)
- Dependencies are monitored via Dependabot and Snyk
- Container images are scanned for CVEs before deployment
