// ════════════════════════════════════════════════════════════════════════════
// SOC 2 Control Registry
// ════════════════════════════════════════════════════════════════════════════
// Maps every control in docs/compliance/soc2/control-matrix.md to
// its automated evidence collectors.
// ════════════════════════════════════════════════════════════════════════════

import type { ControlDefinition, CollectorDefinition, CollectionFrequency } from './types.js';

// ── Control Definitions ──────────────────────────────────────────────────────

export const CONTROLS: ControlDefinition[] = [
  // CC1: Control Environment
  { id: 'CC1.1.1', category: 'CC', section: 'CC1.1', sectionTitle: 'Commitment to Integrity and Ethical Values', description: 'Code of Conduct documented, communicated, acknowledged annually', controlType: 'Preventive', frequency: 'Annual', owner: 'HR', evidenceDescription: 'Signed acknowledgments, policy document', collectors: ['org-policies'] },
  { id: 'CC1.1.2', category: 'CC', section: 'CC1.1', sectionTitle: 'Commitment to Integrity and Ethical Values', description: 'Background checks performed for all employees before hire', controlType: 'Preventive', frequency: 'Per hire', owner: 'HR', evidenceDescription: 'Background check reports, offer letters', collectors: ['org-policies'] },
  { id: 'CC1.1.3', category: 'CC', section: 'CC1.1', sectionTitle: 'Commitment to Integrity and Ethical Values', description: 'Security awareness training completed within 30 days and annually', controlType: 'Preventive', frequency: 'Annual', owner: 'Security', evidenceDescription: 'Training completion records, quiz scores', collectors: ['org-policies'] },
  { id: 'CC1.1.4', category: 'CC', section: 'CC1.1', sectionTitle: 'Commitment to Integrity and Ethical Values', description: 'Code of Conduct violations result in documented disciplinary action', controlType: 'Detective/Corrective', frequency: 'Per incident', owner: 'HR', evidenceDescription: 'Incident records, disciplinary documentation', collectors: ['org-policies'] },

  // CC1.2: Board Oversight
  { id: 'CC1.2.1', category: 'CC', section: 'CC1.2', sectionTitle: 'Board of Directors Oversight', description: 'Board includes members with IT and security expertise', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Board', evidenceDescription: 'Board member bios, committee charters', collectors: ['org-policies'] },
  { id: 'CC1.2.2', category: 'CC', section: 'CC1.2', sectionTitle: 'Board of Directors Oversight', description: 'Audit Committee meets quarterly to review security', controlType: 'Detective', frequency: 'Quarterly', owner: 'Audit Committee', evidenceDescription: 'Meeting minutes, presentations', collectors: ['org-policies'] },
  { id: 'CC1.2.3', category: 'CC', section: 'CC1.2', sectionTitle: 'Board of Directors Oversight', description: 'Board receives quarterly security metrics', controlType: 'Detective', frequency: 'Quarterly', owner: 'CISO', evidenceDescription: 'Board reports, dashboards', collectors: ['org-policies'] },
  { id: 'CC1.2.4', category: 'CC', section: 'CC1.2', sectionTitle: 'Board of Directors Oversight', description: 'Annual independent security assessment presented to Board', controlType: 'Detective', frequency: 'Annual', owner: 'CISO', evidenceDescription: 'Penetration test reports, audit findings', collectors: ['vulnerability-scan'] },

  // CC1.3: Org Structure
  { id: 'CC1.3.1', category: 'CC', section: 'CC1.3', sectionTitle: 'Organizational Structure', description: 'Org chart maintained and updated within 30 days of changes', controlType: 'Preventive', frequency: 'Ongoing', owner: 'HR', evidenceDescription: 'Current org chart, change history', collectors: ['access-review'] },
  { id: 'CC1.3.2', category: 'CC', section: 'CC1.3', sectionTitle: 'Organizational Structure', description: 'Job descriptions define security responsibilities', controlType: 'Preventive', frequency: 'Per role', owner: 'HR', evidenceDescription: 'Job descriptions', collectors: ['org-policies'] },
  { id: 'CC1.3.3', category: 'CC', section: 'CC1.3', sectionTitle: 'Organizational Structure', description: 'CISO reports directly to CEO', controlType: 'Preventive', frequency: 'Ongoing', owner: 'CEO', evidenceDescription: 'Org chart, CISO job description', collectors: ['org-policies'] },
  { id: 'CC1.3.4', category: 'CC', section: 'CC1.3', sectionTitle: 'Organizational Structure', description: 'Security team adequately staffed based on annual assessment', controlType: 'Preventive', frequency: 'Annual', owner: 'CISO', evidenceDescription: 'Staffing assessment, budget approval', collectors: ['org-policies'] },

  // CC1.4: Commitment to Competence
  { id: 'CC1.4.1', category: 'CC', section: 'CC1.4', sectionTitle: 'Commitment to Competence', description: 'Job descriptions specify required qualifications', controlType: 'Preventive', frequency: 'Per role', owner: 'HR', evidenceDescription: 'Job descriptions', collectors: ['org-policies'] },
  { id: 'CC1.4.2', category: 'CC', section: 'CC1.4', sectionTitle: 'Commitment to Competence', description: 'Annual performance evaluations assess security competencies', controlType: 'Detective', frequency: 'Annual', owner: 'Managers', evidenceDescription: 'Performance reviews', collectors: ['org-policies'] },
  { id: 'CC1.4.3', category: 'CC', section: 'CC1.4', sectionTitle: 'Commitment to Competence', description: 'Security certifications maintained', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Security', evidenceDescription: 'Certification records', collectors: ['org-policies'] },
  { id: 'CC1.4.4', category: 'CC', section: 'CC1.4', sectionTitle: 'Commitment to Competence', description: 'Technical training budget allocated and tracked', controlType: 'Preventive', frequency: 'Annual', owner: 'HR/Finance', evidenceDescription: 'Training budget, expense reports', collectors: ['org-policies'] },

  // CC1.5: Accountability
  { id: 'CC1.5.1', category: 'CC', section: 'CC1.5', sectionTitle: 'Accountability', description: 'Security metrics tracked and reported monthly', controlType: 'Detective', frequency: 'Monthly', owner: 'CISO', evidenceDescription: 'Security dashboards, reports', collectors: ['monitoring-config'] },
  { id: 'CC1.5.2', category: 'CC', section: 'CC1.5', sectionTitle: 'Accountability', description: 'Control owners assigned for all security controls', controlType: 'Preventive', frequency: 'Ongoing', owner: 'CISO', evidenceDescription: 'Control matrix', collectors: ['org-policies'] },
  { id: 'CC1.5.3', category: 'CC', section: 'CC1.5', sectionTitle: 'Accountability', description: 'Security incidents tracked with accountability', controlType: 'Detective', frequency: 'Per incident', owner: 'Security', evidenceDescription: 'Incident tickets, post-mortems', collectors: ['incident-history'] },
  { id: 'CC1.5.4', category: 'CC', section: 'CC1.5', sectionTitle: 'Accountability', description: 'Access reviews identify owners for all system access', controlType: 'Detective', frequency: 'Quarterly', owner: 'Security', evidenceDescription: 'Access review reports', collectors: ['access-review'] },

  // CC2: Communication and Information
  { id: 'CC2.1.1', category: 'CC', section: 'CC2.1', sectionTitle: 'Information Quality', description: 'Security policies reviewed and approved annually', controlType: 'Preventive', frequency: 'Annual', owner: 'CISO', evidenceDescription: 'Policy versions, approval records', collectors: ['org-policies'] },
  { id: 'CC2.1.2', category: 'CC', section: 'CC2.1', sectionTitle: 'Information Quality', description: 'Security documentation version controlled', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Security', evidenceDescription: 'Version history', collectors: ['change-management'] },
  { id: 'CC2.1.3', category: 'CC', section: 'CC2.1', sectionTitle: 'Information Quality', description: 'Policy exceptions require documented approval', controlType: 'Preventive', frequency: 'Per exception', owner: 'CISO', evidenceDescription: 'Exception requests, approvals', collectors: ['org-policies'] },
  { id: 'CC2.1.4', category: 'CC', section: 'CC2.1', sectionTitle: 'Information Quality', description: 'Security policies accessible to all employees', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Security', evidenceDescription: 'Intranet access logs', collectors: ['org-policies'] },

  { id: 'CC2.2.1', category: 'CC', section: 'CC2.2', sectionTitle: 'Internal Communication', description: 'Security updates communicated via monthly newsletter', controlType: 'Preventive', frequency: 'Monthly', owner: 'Security', evidenceDescription: 'Newsletter archives', collectors: ['org-policies'] },
  { id: 'CC2.2.2', category: 'CC', section: 'CC2.2', sectionTitle: 'Internal Communication', description: 'Security incidents communicated to affected parties', controlType: 'Detective', frequency: 'Per incident', owner: 'Security', evidenceDescription: 'Incident communications', collectors: ['incident-history'] },
  { id: 'CC2.2.3', category: 'CC', section: 'CC2.2', sectionTitle: 'Internal Communication', description: 'Policy changes announced with 30-day notice', controlType: 'Preventive', frequency: 'Per change', owner: 'Security', evidenceDescription: 'Announcement records', collectors: ['org-policies'] },
  { id: 'CC2.2.4', category: 'CC', section: 'CC2.2', sectionTitle: 'Internal Communication', description: 'Security team maintains shared communication channels', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Security', evidenceDescription: 'Slack channel activity', collectors: ['org-policies'] },

  { id: 'CC2.3.1', category: 'CC', section: 'CC2.3', sectionTitle: 'External Communication', description: 'Privacy policy publicly available', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Legal', evidenceDescription: 'Website screenshot, policy document', collectors: ['org-policies'] },
  { id: 'CC2.3.2', category: 'CC', section: 'CC2.3', sectionTitle: 'External Communication', description: 'Security contact published for vulnerability disclosure', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Security', evidenceDescription: 'Security.txt file, website', collectors: ['org-policies'] },
  { id: 'CC2.3.3', category: 'CC', section: 'CC2.3', sectionTitle: 'External Communication', description: 'Customer security inquiries responded to within 5 days', controlType: 'Detective', frequency: 'Per inquiry', owner: 'Security', evidenceDescription: 'Ticket response times', collectors: ['org-policies'] },
  { id: 'CC2.3.4', category: 'CC', section: 'CC2.3', sectionTitle: 'External Communication', description: 'Data breach notification procedures documented', controlType: 'Preventive', frequency: 'Per incident', owner: 'Legal/Security', evidenceDescription: 'Breach notification policy', collectors: ['org-policies'] },

  // CC3: Risk Assessment
  { id: 'CC3.1.1', category: 'CC', section: 'CC3.1', sectionTitle: 'Risk Identification and Assessment', description: 'Annual risk assessment using standardized methodology', controlType: 'Detective', frequency: 'Annual', owner: 'CISO', evidenceDescription: 'Risk assessment report', collectors: ['org-policies'] },
  { id: 'CC3.1.2', category: 'CC', section: 'CC3.1', sectionTitle: 'Risk Identification and Assessment', description: 'Risk register maintained', controlType: 'Detective', frequency: 'Ongoing', owner: 'CISO', evidenceDescription: 'Risk register', collectors: ['org-policies'] },
  { id: 'CC3.1.3', category: 'CC', section: 'CC3.1', sectionTitle: 'Risk Identification and Assessment', description: 'Risks rated using likelihood and impact criteria', controlType: 'Detective', frequency: 'Per risk', owner: 'CISO', evidenceDescription: 'Risk rating scores', collectors: ['org-policies'] },
  { id: 'CC3.1.4', category: 'CC', section: 'CC3.1', sectionTitle: 'Risk Identification and Assessment', description: 'Risk owners assigned for high/critical risks', controlType: 'Preventive', frequency: 'Per risk', owner: 'CISO', evidenceDescription: 'Risk register owner assignments', collectors: ['org-policies'] },

  { id: 'CC3.2.1', category: 'CC', section: 'CC3.2', sectionTitle: 'Fraud Risk', description: 'Fraud risk included in annual risk assessment', controlType: 'Detective', frequency: 'Annual', owner: 'CISO', evidenceDescription: 'Risk assessment fraud section', collectors: ['org-policies'] },
  { id: 'CC3.2.2', category: 'CC', section: 'CC3.2', sectionTitle: 'Fraud Risk', description: 'Segregation of duties enforced for financial transactions', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Finance', evidenceDescription: 'Access controls, approval workflows', collectors: ['access-review'] },
  { id: 'CC3.2.3', category: 'CC', section: 'CC3.2', sectionTitle: 'Fraud Risk', description: 'Anonymous reporting mechanism available', controlType: 'Detective', frequency: 'Ongoing', owner: 'HR', evidenceDescription: 'Hotline availability, reports', collectors: ['org-policies'] },
  { id: 'CC3.2.4', category: 'CC', section: 'CC3.2', sectionTitle: 'Fraud Risk', description: 'Privileged access monitored for anomalous activity', controlType: 'Detective', frequency: 'Continuous', owner: 'Security', evidenceDescription: 'SIEM alerts, access logs', collectors: ['audit-logs'] },

  { id: 'CC3.3.1', category: 'CC', section: 'CC3.3', sectionTitle: 'Change Impact Assessment', description: 'Significant changes trigger risk reassessment', controlType: 'Detective', frequency: 'Per change', owner: 'CISO', evidenceDescription: 'Change risk assessments', collectors: ['change-management'] },
  { id: 'CC3.3.2', category: 'CC', section: 'CC3.3', sectionTitle: 'Change Impact Assessment', description: 'New vendor relationships include security risk assessment', controlType: 'Preventive', frequency: 'Per vendor', owner: 'Security', evidenceDescription: 'Vendor assessments', collectors: ['org-policies'] },
  { id: 'CC3.3.3', category: 'CC', section: 'CC3.3', sectionTitle: 'Change Impact Assessment', description: 'Infrastructure changes evaluated for security impact', controlType: 'Preventive', frequency: 'Per change', owner: 'Security', evidenceDescription: 'Change tickets with security review', collectors: ['change-management'] },
  { id: 'CC3.3.4', category: 'CC', section: 'CC3.3', sectionTitle: 'Change Impact Assessment', description: 'Regulatory changes monitored and assessed', controlType: 'Detective', frequency: 'Ongoing', owner: 'Legal/Compliance', evidenceDescription: 'Regulatory tracking log', collectors: ['org-policies'] },

  // CC4: Monitoring
  { id: 'CC4.1.1', category: 'CC', section: 'CC4.1', sectionTitle: 'Ongoing Monitoring', description: 'SIEM system deployed', controlType: 'Detective', frequency: 'Continuous', owner: 'Security', evidenceDescription: 'SIEM configuration, alert logs', collectors: ['monitoring-config'] },
  { id: 'CC4.1.2', category: 'CC', section: 'CC4.1', sectionTitle: 'Ongoing Monitoring', description: 'Security events reviewed within 24 hours', controlType: 'Detective', frequency: 'Daily', owner: 'Security', evidenceDescription: 'Alert response times', collectors: ['monitoring-config', 'incident-history'] },
  { id: 'CC4.1.3', category: 'CC', section: 'CC4.1', sectionTitle: 'Ongoing Monitoring', description: 'Key security metrics tracked on dashboards', controlType: 'Detective', frequency: 'Continuous', owner: 'Security', evidenceDescription: 'Dashboard screenshots', collectors: ['monitoring-config'] },
  { id: 'CC4.1.4', category: 'CC', section: 'CC4.1', sectionTitle: 'Ongoing Monitoring', description: 'Quarterly control testing performed', controlType: 'Detective', frequency: 'Quarterly', owner: 'Security', evidenceDescription: 'Control testing reports', collectors: ['org-policies'] },

  { id: 'CC4.2.1', category: 'CC', section: 'CC4.2', sectionTitle: 'Deficiency Evaluation', description: 'Control deficiencies documented and tracked', controlType: 'Corrective', frequency: 'Per finding', owner: 'CISO', evidenceDescription: 'Deficiency register', collectors: ['org-policies'] },
  { id: 'CC4.2.2', category: 'CC', section: 'CC4.2', sectionTitle: 'Deficiency Evaluation', description: 'Remediation plans created for all deficiencies', controlType: 'Corrective', frequency: 'Per finding', owner: 'Control Owner', evidenceDescription: 'Remediation plans', collectors: ['org-policies'] },
  { id: 'CC4.2.3', category: 'CC', section: 'CC4.2', sectionTitle: 'Deficiency Evaluation', description: 'Deficiency remediation tracked to completion', controlType: 'Corrective', frequency: 'Ongoing', owner: 'CISO', evidenceDescription: 'Remediation status reports', collectors: ['org-policies'] },
  { id: 'CC4.2.4', category: 'CC', section: 'CC4.2', sectionTitle: 'Deficiency Evaluation', description: 'Root cause analysis for significant deficiencies', controlType: 'Corrective', frequency: 'Per incident', owner: 'Security', evidenceDescription: 'RCA documents', collectors: ['incident-history'] },

  // CC5: Control Activities
  { id: 'CC5.1.1', category: 'CC', section: 'CC5.1', sectionTitle: 'Logical Access Security', description: 'Unique user IDs assigned to all users', controlType: 'Preventive', frequency: 'Per user', owner: 'IT', evidenceDescription: 'User provisioning records', collectors: ['access-review'] },
  { id: 'CC5.1.2', category: 'CC', section: 'CC5.1', sectionTitle: 'Logical Access Security', description: 'MFA required for all access', controlType: 'Preventive', frequency: 'Continuous', owner: 'Security', evidenceDescription: 'MFA configuration, adoption reports', collectors: ['access-review', 'auth-config'] },
  { id: 'CC5.1.3', category: 'CC', section: 'CC5.1', sectionTitle: 'Logical Access Security', description: 'Password policy enforces complexity', controlType: 'Preventive', frequency: 'Continuous', owner: 'Security', evidenceDescription: 'Password policy configuration', collectors: ['auth-config'] },
  { id: 'CC5.1.4', category: 'CC', section: 'CC5.1', sectionTitle: 'Logical Access Security', description: 'Account lockout after 5 failed attempts', controlType: 'Preventive', frequency: 'Continuous', owner: 'Security', evidenceDescription: 'Authentication configuration', collectors: ['auth-config'] },
  { id: 'CC5.1.5', category: 'CC', section: 'CC5.1', sectionTitle: 'Logical Access Security', description: 'Session timeout after 15 min inactivity', controlType: 'Preventive', frequency: 'Continuous', owner: 'Engineering', evidenceDescription: 'Session configuration', collectors: ['auth-config'] },
  { id: 'CC5.1.6', category: 'CC', section: 'CC5.1', sectionTitle: 'Logical Access Security', description: 'Admin access requires additional approval', controlType: 'Preventive', frequency: 'Per request', owner: 'Security', evidenceDescription: 'Access request tickets', collectors: ['access-review'] },
  { id: 'CC5.1.7', category: 'CC', section: 'CC5.1', sectionTitle: 'Logical Access Security', description: 'Service accounts inventoried and reviewed quarterly', controlType: 'Detective', frequency: 'Quarterly', owner: 'Security', evidenceDescription: 'Service account inventory', collectors: ['access-review'] },

  { id: 'CC5.2.1', category: 'CC', section: 'CC5.2', sectionTitle: 'Access Provisioning', description: 'Access requests require manager approval', controlType: 'Preventive', frequency: 'Per request', owner: 'IT', evidenceDescription: 'Approval workflows', collectors: ['access-review'] },
  { id: 'CC5.2.2', category: 'CC', section: 'CC5.2', sectionTitle: 'Access Provisioning', description: 'RBAC implemented', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Security', evidenceDescription: 'RBAC configuration', collectors: ['access-review', 'auth-config'] },
  { id: 'CC5.2.3', category: 'CC', section: 'CC5.2', sectionTitle: 'Access Provisioning', description: 'Least privilege applied to all access', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Security', evidenceDescription: 'Access review findings', collectors: ['access-review'] },
  { id: 'CC5.2.4', category: 'CC', section: 'CC5.2', sectionTitle: 'Access Provisioning', description: 'Access provisioned within 24 hours of approval', controlType: 'Preventive', frequency: 'Per request', owner: 'IT', evidenceDescription: 'Provisioning SLA metrics', collectors: ['access-review'] },
  { id: 'CC5.2.5', category: 'CC', section: 'CC5.2', sectionTitle: 'Access Provisioning', description: 'Emergency access requires documented justification', controlType: 'Preventive', frequency: 'Per request', owner: 'Security', evidenceDescription: 'Emergency access logs', collectors: ['audit-logs'] },

  { id: 'CC5.3.1', category: 'CC', section: 'CC5.3', sectionTitle: 'Access Revocation', description: 'Access revoked within 24 hours of termination', controlType: 'Preventive', frequency: 'Per termination', owner: 'IT/HR', evidenceDescription: 'Termination checklist, access logs', collectors: ['access-review'] },
  { id: 'CC5.3.2', category: 'CC', section: 'CC5.3', sectionTitle: 'Access Revocation', description: 'Terminated accounts disabled not deleted', controlType: 'Preventive', frequency: 'Per termination', owner: 'IT', evidenceDescription: 'Account status records', collectors: ['access-review'] },
  { id: 'CC5.3.3', category: 'CC', section: 'CC5.3', sectionTitle: 'Access Revocation', description: 'Role changes trigger access review within 5 days', controlType: 'Detective', frequency: 'Per change', owner: 'IT', evidenceDescription: 'Transfer/promotion tickets', collectors: ['access-review'] },
  { id: 'CC5.3.4', category: 'CC', section: 'CC5.3', sectionTitle: 'Access Revocation', description: 'Quarterly access reviews verify appropriate access', controlType: 'Detective', frequency: 'Quarterly', owner: 'Managers', evidenceDescription: 'Access review reports', collectors: ['access-review'] },

  // CC5.5: Change Management
  { id: 'CC5.5.1', category: 'CC', section: 'CC5.5', sectionTitle: 'Change Management', description: 'All changes follow documented change management process', controlType: 'Preventive', frequency: 'Per change', owner: 'Engineering', evidenceDescription: 'Change tickets', collectors: ['change-management'] },
  { id: 'CC5.5.2', category: 'CC', section: 'CC5.5', sectionTitle: 'Change Management', description: 'Changes require testing in non-production environment', controlType: 'Preventive', frequency: 'Per change', owner: 'Engineering', evidenceDescription: 'Test records', collectors: ['change-management', 'cicd-evidence'] },
  { id: 'CC5.5.3', category: 'CC', section: 'CC5.5', sectionTitle: 'Change Management', description: 'Changes require approval before production deployment', controlType: 'Preventive', frequency: 'Per change', owner: 'Engineering', evidenceDescription: 'Approval records', collectors: ['change-management'] },
  { id: 'CC5.5.4', category: 'CC', section: 'CC5.5', sectionTitle: 'Change Management', description: 'Emergency changes documented within 24 hours', controlType: 'Corrective', frequency: 'Per change', owner: 'Engineering', evidenceDescription: 'Emergency change logs', collectors: ['change-management'] },
  { id: 'CC5.5.5', category: 'CC', section: 'CC5.5', sectionTitle: 'Change Management', description: 'Production access separate from development', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Security', evidenceDescription: 'Access control lists', collectors: ['network-config'] },
  { id: 'CC5.5.6', category: 'CC', section: 'CC5.5', sectionTitle: 'Change Management', description: 'Rollback procedures documented for all changes', controlType: 'Preventive', frequency: 'Per change', owner: 'Engineering', evidenceDescription: 'Rollback documentation', collectors: ['change-management'] },

  // CC5.6: Configuration Management
  { id: 'CC5.6.1', category: 'CC', section: 'CC5.6', sectionTitle: 'Configuration Management', description: 'Baseline configurations documented', controlType: 'Preventive', frequency: 'Per system', owner: 'Engineering', evidenceDescription: 'Configuration documentation', collectors: ['infra-config'] },
  { id: 'CC5.6.2', category: 'CC', section: 'CC5.6', sectionTitle: 'Configuration Management', description: 'Configuration changes logged and auditable', controlType: 'Detective', frequency: 'Continuous', owner: 'Engineering', evidenceDescription: 'Configuration audit logs', collectors: ['audit-logs'] },
  { id: 'CC5.6.3', category: 'CC', section: 'CC5.6', sectionTitle: 'Configuration Management', description: 'IaC used for all infrastructure', controlType: 'Preventive', frequency: 'Per deployment', owner: 'Engineering', evidenceDescription: 'IaC repositories', collectors: ['infra-config'] },
  { id: 'CC5.6.4', category: 'CC', section: 'CC5.6', sectionTitle: 'Configuration Management', description: 'Configuration drift detected and remediated', controlType: 'Detective', frequency: 'Daily', owner: 'Operations', evidenceDescription: 'Drift detection reports', collectors: ['infra-config'] },
  { id: 'CC5.6.5', category: 'CC', section: 'CC5.6', sectionTitle: 'Configuration Management', description: 'Hardening standards applied to all systems', controlType: 'Preventive', frequency: 'Per deployment', owner: 'Security', evidenceDescription: 'CIS benchmark compliance', collectors: ['vulnerability-scan'] },

  // CC6: Logical and Physical Access
  { id: 'CC6.1.1', category: 'CC', section: 'CC6.1', sectionTitle: 'Logical Access Security', description: 'Network segmentation isolates prod from dev', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Engineering', evidenceDescription: 'Network diagrams, firewall rules', collectors: ['network-config'] },
  { id: 'CC6.1.2', category: 'CC', section: 'CC6.1', sectionTitle: 'Logical Access Security', description: 'Firewall rules follow deny-by-default', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Security', evidenceDescription: 'Firewall configurations', collectors: ['network-config'] },
  { id: 'CC6.1.3', category: 'CC', section: 'CC6.1', sectionTitle: 'Logical Access Security', description: 'VPN required for remote internal access', controlType: 'Preventive', frequency: 'Continuous', owner: 'Security', evidenceDescription: 'VPN configurations', collectors: ['network-config'] },
  { id: 'CC6.1.4', category: 'CC', section: 'CC6.1', sectionTitle: 'Logical Access Security', description: 'IDS/IPS deployed', controlType: 'Detective', frequency: 'Continuous', owner: 'Security', evidenceDescription: 'IDS/IPS alerts', collectors: ['monitoring-config'] },
  { id: 'CC6.1.5', category: 'CC', section: 'CC6.1', sectionTitle: 'Logical Access Security', description: 'WAF protects public-facing applications', controlType: 'Preventive', frequency: 'Continuous', owner: 'Security', evidenceDescription: 'WAF configurations', collectors: ['network-config'] },

  // CC6.2: System Acquisition / Secure Development
  { id: 'CC6.2.1', category: 'CC', section: 'CC6.2', sectionTitle: 'System Development', description: 'Secure coding standards documented and followed', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Engineering', evidenceDescription: 'Coding standards document', collectors: ['org-policies'] },
  { id: 'CC6.2.2', category: 'CC', section: 'CC6.2', sectionTitle: 'System Development', description: 'Code reviews required for all changes', controlType: 'Preventive', frequency: 'Per change', owner: 'Engineering', evidenceDescription: 'PR review records', collectors: ['change-management'] },
  { id: 'CC6.2.3', category: 'CC', section: 'CC6.2', sectionTitle: 'System Development', description: 'SAST performed per build', controlType: 'Detective', frequency: 'Per build', owner: 'Engineering', evidenceDescription: 'SAST scan results', collectors: ['cicd-evidence'] },
  { id: 'CC6.2.4', category: 'CC', section: 'CC6.2', sectionTitle: 'System Development', description: 'DAST performed weekly', controlType: 'Detective', frequency: 'Weekly', owner: 'Security', evidenceDescription: 'DAST scan results', collectors: ['vulnerability-scan'] },
  { id: 'CC6.2.5', category: 'CC', section: 'CC6.2', sectionTitle: 'System Development', description: 'Dependency scanning identifies vulnerable libraries', controlType: 'Detective', frequency: 'Per build', owner: 'Engineering', evidenceDescription: 'Dependency scan results', collectors: ['vulnerability-scan'] },
  { id: 'CC6.2.6', category: 'CC', section: 'CC6.2', sectionTitle: 'System Development', description: 'Penetration testing performed annually', controlType: 'Detective', frequency: 'Annual', owner: 'Security', evidenceDescription: 'Penetration test reports', collectors: ['vulnerability-scan'] },

  // CC6.3: Encryption
  { id: 'CC6.3.1', category: 'CC', section: 'CC6.3', sectionTitle: 'Encryption', description: 'Data encrypted at rest using AES-256', controlType: 'Preventive', frequency: 'Continuous', owner: 'Engineering', evidenceDescription: 'Encryption configurations', collectors: ['encryption-config'] },
  { id: 'CC6.3.2', category: 'CC', section: 'CC6.3', sectionTitle: 'Encryption', description: 'Data encrypted in transit using TLS 1.2+', controlType: 'Preventive', frequency: 'Continuous', owner: 'Engineering', evidenceDescription: 'TLS configurations', collectors: ['encryption-config'] },
  { id: 'CC6.3.3', category: 'CC', section: 'CC6.3', sectionTitle: 'Encryption', description: 'Encryption keys managed using KMS', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Security', evidenceDescription: 'KMS configurations', collectors: ['encryption-config'] },
  { id: 'CC6.3.4', category: 'CC', section: 'CC6.3', sectionTitle: 'Encryption', description: 'Key rotation performed annually', controlType: 'Preventive', frequency: 'Annual', owner: 'Security', evidenceDescription: 'Key rotation logs', collectors: ['encryption-config'] },
  { id: 'CC6.3.5', category: 'CC', section: 'CC6.3', sectionTitle: 'Encryption', description: 'Encryption configs validated quarterly', controlType: 'Detective', frequency: 'Quarterly', owner: 'Security', evidenceDescription: 'Encryption audit reports', collectors: ['encryption-config'] },

  // CC7: System Operations
  { id: 'CC7.1.1', category: 'CC', section: 'CC7.1', sectionTitle: 'Vulnerability Management', description: 'Vulnerability scans performed weekly', controlType: 'Detective', frequency: 'Weekly', owner: 'Security', evidenceDescription: 'Scan results', collectors: ['vulnerability-scan'] },
  { id: 'CC7.1.2', category: 'CC', section: 'CC7.1', sectionTitle: 'Vulnerability Management', description: 'Critical vulns remediated within 24 hours', controlType: 'Corrective', frequency: 'Per finding', owner: 'Engineering', evidenceDescription: 'Remediation tickets', collectors: ['vulnerability-scan'] },
  { id: 'CC7.1.3', category: 'CC', section: 'CC7.1', sectionTitle: 'Vulnerability Management', description: 'High vulns remediated within 7 days', controlType: 'Corrective', frequency: 'Per finding', owner: 'Engineering', evidenceDescription: 'Remediation tickets', collectors: ['vulnerability-scan'] },
  { id: 'CC7.1.4', category: 'CC', section: 'CC7.1', sectionTitle: 'Vulnerability Management', description: 'Medium vulns remediated within 30 days', controlType: 'Corrective', frequency: 'Per finding', owner: 'Engineering', evidenceDescription: 'Remediation tickets', collectors: ['vulnerability-scan'] },
  { id: 'CC7.1.5', category: 'CC', section: 'CC7.1', sectionTitle: 'Vulnerability Management', description: 'Vulnerability exceptions require documented approval', controlType: 'Preventive', frequency: 'Per exception', owner: 'CISO', evidenceDescription: 'Exception approvals', collectors: ['org-policies'] },

  { id: 'CC7.2.1', category: 'CC', section: 'CC7.2', sectionTitle: 'Incident Management', description: 'Incident response plan documented and current', controlType: 'Preventive', frequency: 'Annual review', owner: 'Security', evidenceDescription: 'IR plan document', collectors: ['org-policies'] },
  { id: 'CC7.2.2', category: 'CC', section: 'CC7.2', sectionTitle: 'Incident Management', description: 'Security incidents logged in ticketing system', controlType: 'Detective', frequency: 'Per incident', owner: 'Security', evidenceDescription: 'Incident tickets', collectors: ['incident-history'] },
  { id: 'CC7.2.3', category: 'CC', section: 'CC7.2', sectionTitle: 'Incident Management', description: 'Incidents classified by severity', controlType: 'Detective', frequency: 'Per incident', owner: 'Security', evidenceDescription: 'Severity classifications', collectors: ['incident-history'] },
  { id: 'CC7.2.4', category: 'CC', section: 'CC7.2', sectionTitle: 'Incident Management', description: 'Post-incident reviews within 5 days', controlType: 'Corrective', frequency: 'Per incident', owner: 'Security', evidenceDescription: 'Post-mortem documents', collectors: ['incident-history'] },
  { id: 'CC7.2.5', category: 'CC', section: 'CC7.2', sectionTitle: 'Incident Management', description: 'IR tabletop exercises conducted quarterly', controlType: 'Detective', frequency: 'Quarterly', owner: 'Security', evidenceDescription: 'Exercise reports', collectors: ['org-policies'] },

  { id: 'CC7.3.1', category: 'CC', section: 'CC7.3', sectionTitle: 'Recovery Operations', description: 'Backup procedures documented', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Operations', evidenceDescription: 'Backup documentation', collectors: ['backup-verification'] },
  { id: 'CC7.3.2', category: 'CC', section: 'CC7.3', sectionTitle: 'Recovery Operations', description: 'Backups performed daily', controlType: 'Preventive', frequency: 'Daily', owner: 'Operations', evidenceDescription: 'Backup logs', collectors: ['backup-verification'] },
  { id: 'CC7.3.3', category: 'CC', section: 'CC7.3', sectionTitle: 'Recovery Operations', description: 'Backup restoration tested quarterly', controlType: 'Detective', frequency: 'Quarterly', owner: 'Operations', evidenceDescription: 'Restoration test reports', collectors: ['backup-verification'] },
  { id: 'CC7.3.4', category: 'CC', section: 'CC7.3', sectionTitle: 'Recovery Operations', description: 'Backups stored in geographically separate location', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Operations', evidenceDescription: 'Backup storage configuration', collectors: ['backup-verification'] },
  { id: 'CC7.3.5', category: 'CC', section: 'CC7.3', sectionTitle: 'Recovery Operations', description: 'DR plan documented and tested annually', controlType: 'Preventive', frequency: 'Annual', owner: 'Operations', evidenceDescription: 'DR plan, test results', collectors: ['backup-verification'] },

  // CC9: Risk Mitigation
  { id: 'CC9.1.1', category: 'CC', section: 'CC9.1', sectionTitle: 'Risk Treatment', description: 'Risk treatment plans documented for high/critical risks', controlType: 'Corrective', frequency: 'Per risk', owner: 'Risk Owner', evidenceDescription: 'Treatment plans', collectors: ['org-policies'] },
  { id: 'CC9.1.2', category: 'CC', section: 'CC9.1', sectionTitle: 'Risk Treatment', description: 'Risk acceptance requires CISO approval', controlType: 'Preventive', frequency: 'Per risk', owner: 'CISO', evidenceDescription: 'Acceptance records', collectors: ['org-policies'] },
  { id: 'CC9.1.3', category: 'CC', section: 'CC9.1', sectionTitle: 'Risk Treatment', description: 'Third-party risks assessed and monitored', controlType: 'Detective', frequency: 'Per vendor', owner: 'Security', evidenceDescription: 'Vendor assessments', collectors: ['org-policies'] },
  { id: 'CC9.1.4', category: 'CC', section: 'CC9.1', sectionTitle: 'Risk Treatment', description: 'Insurance coverage addresses cyber risks', controlType: 'Preventive', frequency: 'Annual', owner: 'Finance', evidenceDescription: 'Insurance policy', collectors: ['org-policies'] },

  // A1: Availability
  { id: 'A1.1', category: 'A', section: 'A1', sectionTitle: 'System Availability', description: 'System availability SLA of 99.9% defined', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Operations', evidenceDescription: 'SLA documentation', collectors: ['uptime'] },
  { id: 'A1.2', category: 'A', section: 'A1', sectionTitle: 'System Availability', description: 'Uptime monitored continuously', controlType: 'Detective', frequency: 'Continuous', owner: 'Operations', evidenceDescription: 'Monitoring dashboards', collectors: ['uptime'] },
  { id: 'A1.3', category: 'A', section: 'A1', sectionTitle: 'System Availability', description: 'Redundant infrastructure across AZs', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Engineering', evidenceDescription: 'Architecture diagrams', collectors: ['infra-config'] },
  { id: 'A1.4', category: 'A', section: 'A1', sectionTitle: 'System Availability', description: 'Auto-scaling configured', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Engineering', evidenceDescription: 'Auto-scaling configurations', collectors: ['infra-config'] },
  { id: 'A1.5', category: 'A', section: 'A1', sectionTitle: 'System Availability', description: 'Capacity planning performed quarterly', controlType: 'Preventive', frequency: 'Quarterly', owner: 'Operations', evidenceDescription: 'Capacity reports', collectors: ['uptime'] },
  { id: 'A1.6', category: 'A', section: 'A1', sectionTitle: 'System Availability', description: 'Maintenance windows scheduled and communicated', controlType: 'Preventive', frequency: 'Per maintenance', owner: 'Operations', evidenceDescription: 'Maintenance notifications', collectors: ['incident-history'] },

  // PI1: Processing Integrity
  { id: 'PI1.1', category: 'PI', section: 'PI1', sectionTitle: 'Data Processing', description: 'Input validation on all user inputs', controlType: 'Preventive', frequency: 'Continuous', owner: 'Engineering', evidenceDescription: 'Code review records', collectors: ['change-management'] },
  { id: 'PI1.2', category: 'PI', section: 'PI1', sectionTitle: 'Data Processing', description: 'Data processing errors logged and alerted', controlType: 'Detective', frequency: 'Continuous', owner: 'Operations', evidenceDescription: 'Error logs, alerts', collectors: ['monitoring-config'] },
  { id: 'PI1.3', category: 'PI', section: 'PI1', sectionTitle: 'Data Processing', description: 'Transaction integrity using DB transactions', controlType: 'Preventive', frequency: 'Continuous', owner: 'Engineering', evidenceDescription: 'Database configurations', collectors: ['infra-config'] },
  { id: 'PI1.4', category: 'PI', section: 'PI1', sectionTitle: 'Data Processing', description: 'Data reconciliation for critical processes', controlType: 'Detective', frequency: 'Daily', owner: 'Operations', evidenceDescription: 'Reconciliation reports', collectors: ['data-quality'] },
  { id: 'PI1.5', category: 'PI', section: 'PI1', sectionTitle: 'Data Processing', description: 'Processing exceptions reviewed and resolved', controlType: 'Corrective', frequency: 'Daily', owner: 'Operations', evidenceDescription: 'Exception reports', collectors: ['data-quality'] },

  // C1: Confidentiality
  { id: 'C1.1', category: 'C', section: 'C1', sectionTitle: 'Data Protection', description: 'Data classification policy documented', controlType: 'Preventive', frequency: 'Annual review', owner: 'Security', evidenceDescription: 'Classification policy', collectors: ['org-policies'] },
  { id: 'C1.2', category: 'C', section: 'C1', sectionTitle: 'Data Protection', description: 'Confidential data identified and labeled', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Data Owners', evidenceDescription: 'Data inventory', collectors: ['data-quality'] },
  { id: 'C1.3', category: 'C', section: 'C1', sectionTitle: 'Data Protection', description: 'Access to confidential data requires justification', controlType: 'Preventive', frequency: 'Per request', owner: 'Data Owners', evidenceDescription: 'Access requests', collectors: ['access-review'] },
  { id: 'C1.4', category: 'C', section: 'C1', sectionTitle: 'Data Protection', description: 'Confidential data not stored in dev environments', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Engineering', evidenceDescription: 'Environment configurations', collectors: ['infra-config'] },
  { id: 'C1.5', category: 'C', section: 'C1', sectionTitle: 'Data Protection', description: 'Data masking in non-production', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Engineering', evidenceDescription: 'Masking configurations', collectors: ['infra-config'] },
  { id: 'C1.6', category: 'C', section: 'C1', sectionTitle: 'Data Protection', description: 'Data retention follows documented policy', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Legal', evidenceDescription: 'Retention schedules', collectors: ['org-policies'] },
  { id: 'C1.7', category: 'C', section: 'C1', sectionTitle: 'Data Protection', description: 'Secure data disposal for decommissioned media', controlType: 'Preventive', frequency: 'Per disposal', owner: 'IT', evidenceDescription: 'Disposal certificates', collectors: ['org-policies'] },

  // P1: Privacy
  { id: 'P1.1', category: 'P', section: 'P1', sectionTitle: 'Privacy Management', description: 'Privacy policy published and accessible', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Legal', evidenceDescription: 'Website privacy policy', collectors: ['org-policies'] },
  { id: 'P1.2', category: 'P', section: 'P1', sectionTitle: 'Privacy Management', description: 'Consent obtained for personal data collection', controlType: 'Preventive', frequency: 'Per user', owner: 'Engineering', evidenceDescription: 'Consent records', collectors: ['privacy-evidence'] },
  { id: 'P1.3', category: 'P', section: 'P1', sectionTitle: 'Privacy Management', description: 'DSARs fulfilled within 30 days', controlType: 'Corrective', frequency: 'Per request', owner: 'Legal', evidenceDescription: 'DSAR ticket logs', collectors: ['privacy-evidence'] },
  { id: 'P1.4', category: 'P', section: 'P1', sectionTitle: 'Privacy Management', description: 'Personal data inventory maintained', controlType: 'Detective', frequency: 'Annual', owner: 'Security', evidenceDescription: 'Data inventory', collectors: ['privacy-evidence'] },
  { id: 'P1.5', category: 'P', section: 'P1', sectionTitle: 'Privacy Management', description: 'PIAs performed for new processing', controlType: 'Preventive', frequency: 'Per project', owner: 'Legal', evidenceDescription: 'PIA documents', collectors: ['privacy-evidence'] },
  { id: 'P1.6', category: 'P', section: 'P1', sectionTitle: 'Privacy Management', description: 'DPAs executed with processors', controlType: 'Preventive', frequency: 'Per vendor', owner: 'Legal', evidenceDescription: 'DPA contracts', collectors: ['org-policies'] },
  { id: 'P1.7', category: 'P', section: 'P1', sectionTitle: 'Privacy Management', description: 'Cross-border transfers compliant', controlType: 'Preventive', frequency: 'Ongoing', owner: 'Legal', evidenceDescription: 'Transfer mechanisms', collectors: ['org-policies'] },
];

// ── Collector Definitions ────────────────────────────────────────────────────

export const COLLECTORS: CollectorDefinition[] = [
  { id: 'access-review', name: 'Access Review', description: 'Exports user-role assignments, RBAC config, MFA adoption, service accounts from auth-svc and GitHub', schedule: 'weekly', category: 'CC', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('access-review')).map(c => c.id) },
  { id: 'auth-config', name: 'Authentication Config', description: 'Exports auth-svc configuration: password policy, lockout, session timeout, MFA settings', schedule: 'weekly', category: 'CC', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('auth-config')).map(c => c.id) },
  { id: 'change-management', name: 'Change Management', description: 'Exports GitHub PRs merged, review counts, CI pass rates, approval gates', schedule: 'weekly', category: 'CC', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('change-management')).map(c => c.id) },
  { id: 'cicd-evidence', name: 'CI/CD Pipeline', description: 'Documents pipeline stages, SAST scans, approval gates, deployment frequency', schedule: 'weekly', category: 'CC', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('cicd-evidence')).map(c => c.id) },
  { id: 'vulnerability-scan', name: 'Vulnerability Scanning', description: 'Runs Trivy scans on container images, collects CVE data, generates remediation timelines', schedule: 'weekly', category: 'CC', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('vulnerability-scan')).map(c => c.id) },
  { id: 'monitoring-config', name: 'Monitoring & Alerting', description: 'Exports Prometheus alert rules, Grafana dashboards, SIEM config, alert response times', schedule: 'weekly', category: 'CC', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('monitoring-config')).map(c => c.id) },
  { id: 'incident-history', name: 'Incident History', description: 'Exports security incidents, severity classifications, post-mortems, response times', schedule: 'weekly', category: 'CC', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('incident-history')).map(c => c.id) },
  { id: 'audit-logs', name: 'Audit Logs', description: 'Exports audit-svc logs, verifies completeness and integrity, samples critical operations', schedule: 'daily', category: 'CC', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('audit-logs')).map(c => c.id) },
  { id: 'network-config', name: 'Network Security', description: 'Exports K8s NetworkPolicies, Cloudflare WAF rules, firewall configs, ingress rules', schedule: 'weekly', category: 'CC', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('network-config')).map(c => c.id) },
  { id: 'encryption-config', name: 'Encryption Config', description: 'Exports TLS configs, encryption-at-rest settings, KMS key metadata, rotation logs', schedule: 'monthly', category: 'CC', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('encryption-config')).map(c => c.id) },
  { id: 'infra-config', name: 'Infrastructure Config', description: 'Exports K8s HPA configs, deployment manifests, Terraform state summary, capacity metrics', schedule: 'weekly', category: 'CC', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('infra-config')).map(c => c.id) },
  { id: 'backup-verification', name: 'Backup Verification', description: 'Verifies backup CronJob status, RPO compliance, restore test results', schedule: 'daily', category: 'CC', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('backup-verification')).map(c => c.id) },
  { id: 'uptime', name: 'Uptime & SLO', description: 'Queries Prometheus for availability metrics, calculates monthly uptime per SLO target', schedule: 'daily', category: 'A', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('uptime')).map(c => c.id) },
  { id: 'data-quality', name: 'Data Quality', description: 'Runs reconciliation checks, data integrity tests, processing exception reports', schedule: 'daily', category: 'PI', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('data-quality')).map(c => c.id) },
  { id: 'org-policies', name: 'Organizational Policies', description: 'Collects policy documents, training records, risk register from document management', schedule: 'monthly', category: 'CC', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('org-policies')).map(c => c.id) },
  { id: 'privacy-evidence', name: 'Privacy Evidence', description: 'Exports consent records, DSR logs, PIAs, data inventory from compliance-svc', schedule: 'weekly', category: 'P', enabled: true, controlIds: CONTROLS.filter(c => c.collectors.includes('privacy-evidence')).map(c => c.id) },
];

// ── Helper functions ─────────────────────────────────────────────────────────

export function getControl(id: string): ControlDefinition | undefined {
  return CONTROLS.find(c => c.id === id);
}

export function getCollector(id: string): CollectorDefinition | undefined {
  return COLLECTORS.find(c => c.id === id);
}

export function getControlsByCategory(cat: string): ControlDefinition[] {
  return CONTROLS.filter(c => c.category === cat);
}

export function getControlsByCollector(collectorId: string): ControlDefinition[] {
  return CONTROLS.filter(c => c.collectors.includes(collectorId));
}

/** How many days until evidence is considered stale for a given schedule */
export function staleDaysForSchedule(schedule: CollectionFrequency): number {
  switch (schedule) {
    case 'daily': return 2;
    case 'weekly': return 10;
    case 'monthly': return 35;
    case 'quarterly': return 100;
    case 'annual': return 380;
  }
}
