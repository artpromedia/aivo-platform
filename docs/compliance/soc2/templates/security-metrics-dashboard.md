# Security Metrics Dashboard Configuration

**Document ID:** DASH-SEC-001  
**Version:** 1.0  
**Last Updated:** January 15, 2024  
**Classification:** Internal

---

## 1. Overview

This document defines the security metrics dashboard configuration for the AIVO Platform, supporting SOC 2 Type II compliance monitoring and continuous security posture assessment.

---

## 2. Dashboard Architecture

### 2.1 Technology Stack

| Component      | Technology               | Purpose             |
| -------------- | ------------------------ | ------------------- |
| Visualization  | Grafana                  | Dashboard rendering |
| Time-series DB | Prometheus               | Metrics storage     |
| Log Analytics  | Elasticsearch/Kibana     | Log-based metrics   |
| Data Pipeline  | Fluent Bit + Kinesis     | Data collection     |
| Alerting       | AlertManager + PagerDuty | Alert routing       |

### 2.2 Data Sources

```yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    access: proxy
    isDefault: true

  - name: Elasticsearch
    type: elasticsearch
    url: http://elasticsearch:9200
    database: 'logs-*'
    access: proxy

  - name: PostgreSQL
    type: postgres
    url: compliance-db:5432
    database: compliance_svc
    access: proxy
```

---

## 3. Executive Security Dashboard

### 3.1 Overall Security Score

```json
{
  "panel": "security_score",
  "type": "gauge",
  "title": "Overall Security Score",
  "description": "Composite security health score (0-100)",
  "query": "sum(security_control_score) / count(security_control_score) * 100",
  "thresholds": [
    { "value": 0, "color": "red" },
    { "value": 70, "color": "yellow" },
    { "value": 85, "color": "green" }
  ]
}
```

### 3.2 Key Metrics Panel

| Metric                       | Query                                   | Target | Alert Threshold |
| ---------------------------- | --------------------------------------- | ------ | --------------- |
| MFA Adoption Rate            | `mfa_enabled_users / total_users * 100` | 100%   | < 98%           |
| Vulnerability SLA Compliance | `vulns_within_sla / total_vulns * 100`  | 100%   | < 95%           |
| Incident Response Time       | `avg(incident_resolution_time_hours)`   | < 4h   | > 4h            |
| Security Training Completion | `trained_users / total_users * 100`     | 100%   | < 95%           |
| Access Review Completion     | `completed_reviews / due_reviews * 100` | 100%   | < 100%          |

### 3.3 Risk Heat Map

```json
{
  "panel": "risk_heatmap",
  "type": "heatmap",
  "title": "Risk Heat Map",
  "query": "risk_register",
  "dimensions": {
    "x": "likelihood",
    "y": "impact",
    "value": "count"
  },
  "colors": ["#00ff00", "#ffff00", "#ff9900", "#ff0000"]
}
```

---

## 4. SOC 2 Compliance Dashboard

### 4.1 Trust Services Criteria Overview

```yaml
panels:
  - title: 'Security (CC) Controls'
    type: stat
    queries:
      - metric: controls_passing{category="security"}
      - metric: controls_total{category="security"}
    display: 'percentage'

  - title: 'Availability (A) Controls'
    type: stat
    queries:
      - metric: controls_passing{category="availability"}
      - metric: controls_total{category="availability"}
    display: 'percentage'

  - title: 'Processing Integrity (PI) Controls'
    type: stat
    queries:
      - metric: controls_passing{category="processing_integrity"}
      - metric: controls_total{category="processing_integrity"}
    display: 'percentage'

  - title: 'Confidentiality (C) Controls'
    type: stat
    queries:
      - metric: controls_passing{category="confidentiality"}
      - metric: controls_total{category="confidentiality"}
    display: 'percentage'

  - title: 'Privacy (P) Controls'
    type: stat
    queries:
      - metric: controls_passing{category="privacy"}
      - metric: controls_total{category="privacy"}
    display: 'percentage'
```

### 4.2 Control Testing Status

```json
{
  "panel": "control_testing",
  "type": "table",
  "title": "Control Testing Status",
  "columns": [
    "control_id",
    "control_name",
    "last_test_date",
    "test_result",
    "next_test_due",
    "owner"
  ],
  "query": "SELECT * FROM control_tests ORDER BY next_test_due ASC",
  "row_colors": {
    "PASS": "green",
    "FAIL": "red",
    "PARTIAL": "yellow",
    "OVERDUE": "orange"
  }
}
```

### 4.3 Evidence Collection Status

```yaml
panel:
  title: 'Evidence Collection Status'
  type: timeseries
  queries:
    - name: 'Evidence Collected'
      query: 'sum(evidence_collected_total) by (type)'
    - name: 'Evidence Missing'
      query: 'sum(evidence_missing_total) by (control_id)'
  timeRange: '30d'
```

---

## 5. Authentication & Access Dashboard

### 5.1 Authentication Metrics

| Metric                | PromQL Query                                                                | Panel Type  |
| --------------------- | --------------------------------------------------------------------------- | ----------- |
| Login Success Rate    | `sum(rate(auth_login_success[5m])) / sum(rate(auth_login_total[5m])) * 100` | Gauge       |
| Failed Login Attempts | `sum(rate(auth_login_failed[5m]))`                                          | Time Series |
| MFA Challenges        | `sum(rate(mfa_challenge_total[5m])) by (result)`                            | Stacked Bar |
| Active Sessions       | `sum(active_sessions_total)`                                                | Stat        |
| Session Duration      | `histogram_quantile(0.95, auth_session_duration_bucket)`                    | Histogram   |

### 5.2 Access Control Metrics

```yaml
panels:
  - title: 'Users by Role'
    type: pie
    query: 'sum(users_total) by (role)'

  - title: 'Privileged Access Users'
    type: stat
    query: "sum(users_total{role=~'admin|super_admin'})"
    alert:
      condition: '> threshold'
      threshold: 50

  - title: 'Access Denied Events'
    type: timeseries
    query: 'sum(rate(access_denied_total[5m])) by (resource, reason)'

  - title: 'API Key Usage'
    type: table
    query: 'topk(10, sum(rate(api_key_usage[1h])) by (key_name, service))'
```

### 5.3 Access Review Status

```json
{
  "panel": "access_reviews",
  "type": "stat_with_sparkline",
  "metrics": [
    {
      "name": "Reviews Completed",
      "query": "sum(access_reviews{status='completed'})",
      "color": "green"
    },
    {
      "name": "Reviews Pending",
      "query": "sum(access_reviews{status='pending'})",
      "color": "yellow"
    },
    {
      "name": "Reviews Overdue",
      "query": "sum(access_reviews{status='overdue'})",
      "color": "red"
    }
  ]
}
```

---

## 6. Vulnerability Management Dashboard

### 6.1 Vulnerability Overview

```yaml
panels:
  - title: 'Open Vulnerabilities by Severity'
    type: bar
    query: 'sum(vulnerabilities_open) by (severity)'
    colors:
      critical: '#ff0000'
      high: '#ff6600'
      medium: '#ffcc00'
      low: '#00cc00'

  - title: 'Vulnerability Trend'
    type: timeseries
    queries:
      - name: 'New'
        query: 'sum(rate(vulnerabilities_new[1d]))'
      - name: 'Resolved'
        query: 'sum(rate(vulnerabilities_resolved[1d]))'
      - name: 'Open'
        query: 'sum(vulnerabilities_open)'
    timeRange: '90d'
```

### 6.2 SLA Compliance

| Severity | SLA | Query                                           | Target |
| -------- | --- | ----------------------------------------------- | ------ |
| Critical | 24h | `sum(vulns_open{severity="critical", age>24h})` | 0      |
| High     | 7d  | `sum(vulns_open{severity="high", age>7d})`      | 0      |
| Medium   | 30d | `sum(vulns_open{severity="medium", age>30d})`   | 0      |
| Low      | 90d | `sum(vulns_open{severity="low", age>90d})`      | 0      |

### 6.3 Patch Compliance

```json
{
  "panel": "patch_compliance",
  "type": "gauge",
  "title": "Patch Compliance Rate",
  "query": "sum(systems_patched) / sum(systems_total) * 100",
  "thresholds": [
    { "value": 0, "color": "red" },
    { "value": 90, "color": "yellow" },
    { "value": 98, "color": "green" }
  ],
  "target": 100
}
```

---

## 7. Incident Response Dashboard

### 7.1 Incident Overview

```yaml
panels:
  - title: 'Active Incidents'
    type: stat
    query: 'sum(incidents_active) by (severity)'
    drill_down: '/incidents?status=active'

  - title: 'Incidents This Month'
    type: stat
    query: 'sum(increase(incidents_total[30d]))'
    comparison: 'previous_period'

  - title: 'Mean Time to Detect (MTTD)'
    type: gauge
    query: 'avg(incident_time_to_detect_minutes)'
    target: 15
    unit: 'minutes'

  - title: 'Mean Time to Respond (MTTR)'
    type: gauge
    query: 'avg(incident_time_to_respond_minutes)'
    target: 60
    unit: 'minutes'
```

### 7.2 Incident Trend Analysis

```json
{
  "panel": "incident_trends",
  "type": "timeseries",
  "title": "Incident Trends",
  "queries": [
    {
      "name": "Critical",
      "query": "sum(increase(incidents_total{severity='critical'}[1d]))",
      "color": "#ff0000"
    },
    {
      "name": "High",
      "query": "sum(increase(incidents_total{severity='high'}[1d]))",
      "color": "#ff6600"
    },
    {
      "name": "Medium",
      "query": "sum(increase(incidents_total{severity='medium'}[1d]))",
      "color": "#ffcc00"
    },
    {
      "name": "Low",
      "query": "sum(increase(incidents_total{severity='low'}[1d]))",
      "color": "#00cc00"
    }
  ],
  "timeRange": "90d"
}
```

### 7.3 Incident Categories

```yaml
panel:
  title: 'Incidents by Category'
  type: pie
  query: 'sum(incidents_total) by (category)'
  categories:
    - phishing
    - malware
    - unauthorized_access
    - data_breach
    - denial_of_service
    - configuration_error
    - other
```

---

## 8. Data Protection Dashboard

### 8.1 Encryption Status

```json
{
  "panels": [
    {
      "title": "Data at Rest Encryption",
      "type": "stat",
      "query": "sum(databases_encrypted) / sum(databases_total) * 100",
      "unit": "%",
      "target": 100
    },
    {
      "title": "Data in Transit Encryption",
      "type": "stat",
      "query": "sum(connections_tls) / sum(connections_total) * 100",
      "unit": "%",
      "target": 100
    },
    {
      "title": "Key Rotation Status",
      "type": "table",
      "query": "SELECT key_name, last_rotated, days_since_rotation FROM encryption_keys"
    }
  ]
}
```

### 8.2 Data Access Patterns

```yaml
panels:
  - title: 'Student Data Access (24h)'
    type: stat
    query: 'sum(increase(student_data_access_total[24h]))'
    alert:
      condition: 'anomaly'
      sensitivity: 'high'

  - title: 'Data Access by Role'
    type: bar
    query: 'sum(data_access_total) by (role, data_classification)'

  - title: 'Sensitive Data Downloads'
    type: timeseries
    query: "sum(rate(data_export_total{classification='restricted'}[1h]))"
    alert:
      threshold: 100
      period: '1h'
```

### 8.3 DLP Events

```json
{
  "panel": "dlp_events",
  "type": "timeseries",
  "title": "Data Loss Prevention Events",
  "queries": [
    {
      "name": "Blocked",
      "query": "sum(rate(dlp_events{action='blocked'}[1h]))"
    },
    {
      "name": "Warned",
      "query": "sum(rate(dlp_events{action='warned'}[1h]))"
    },
    {
      "name": "Allowed",
      "query": "sum(rate(dlp_events{action='allowed'}[1h]))"
    }
  ]
}
```

---

## 9. Availability Dashboard

### 9.1 Service Availability

```yaml
panels:
  - title: 'Overall Platform Availability'
    type: gauge
    query: "avg(up{job=~'.*-svc'}) * 100"
    target: 99.9
    thresholds:
      - value: 0
        color: red
      - value: 99
        color: yellow
      - value: 99.9
        color: green

  - title: 'Service Health Matrix'
    type: status_grid
    query: "up{job=~'.*-svc'}"
    services:
      - auth-svc
      - profile-svc
      - content-svc
      - assessment-svc
      - ai-orchestrator
      - billing-svc
```

### 9.2 Error Rates

```json
{
  "panel": "error_rates",
  "type": "timeseries",
  "title": "Service Error Rates",
  "query": "sum(rate(http_requests_total{status=~'5..'}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service) * 100",
  "alert": {
    "condition": "> 1",
    "for": "5m",
    "severity": "critical"
  }
}
```

### 9.3 Backup Status

```yaml
panels:
  - title: 'Last Backup Status'
    type: table
    columns:
      - system
      - last_backup_time
      - backup_size
      - status
      - next_scheduled
    query: 'SELECT * FROM backup_status ORDER BY last_backup_time DESC'

  - title: 'Backup Success Rate'
    type: stat
    query: 'sum(backups_successful) / sum(backups_total) * 100'
    target: 100
```

---

## 10. Vendor Risk Dashboard

### 10.1 Vendor Overview

```json
{
  "panels": [
    {
      "title": "Vendors by Risk Tier",
      "type": "pie",
      "query": "sum(vendors_total) by (risk_tier)"
    },
    {
      "title": "Vendor Assessments Due",
      "type": "stat",
      "query": "sum(vendor_assessments{status='due'})",
      "alert": {
        "condition": "> 0",
        "severity": "warning"
      }
    },
    {
      "title": "Vendor Compliance Rate",
      "type": "gauge",
      "query": "sum(vendors_compliant) / sum(vendors_total) * 100",
      "target": 100
    }
  ]
}
```

### 10.2 Vendor Assessment Tracker

```yaml
panel:
  title: 'Vendor Assessment Status'
  type: table
  columns:
    - vendor_name
    - risk_tier
    - last_assessment
    - next_assessment
    - overall_rating
    - issues_open
  query: 'SELECT * FROM vendor_assessments ORDER BY next_assessment ASC'
  row_highlight:
    condition: 'next_assessment < now()'
    color: 'red'
```

---

## 11. Training & Awareness Dashboard

### 11.1 Training Completion

```json
{
  "panels": [
    {
      "title": "Overall Training Completion",
      "type": "gauge",
      "query": "sum(training_completed) / sum(training_required) * 100",
      "target": 100,
      "thresholds": [
        { "value": 0, "color": "red" },
        { "value": 90, "color": "yellow" },
        { "value": 100, "color": "green" }
      ]
    },
    {
      "title": "Training by Course",
      "type": "bar",
      "query": "sum(training_completion_rate) by (course_name)"
    },
    {
      "title": "Overdue Training",
      "type": "stat",
      "query": "sum(training_overdue)",
      "alert": {
        "condition": "> 0",
        "severity": "warning"
      }
    }
  ]
}
```

### 11.2 Phishing Simulation Results

```yaml
panels:
  - title: 'Phishing Click Rate (Trend)'
    type: timeseries
    query: 'sum(phishing_clicked) / sum(phishing_sent) * 100'
    target: '< 5%'
    timeRange: '1y'

  - title: 'Phishing Report Rate'
    type: gauge
    query: 'sum(phishing_reported) / sum(phishing_sent) * 100'
    target: 70

  - title: 'Repeat Offenders'
    type: stat
    query: 'sum(phishing_repeat_clickers)'
    alert:
      condition: '> 0'
```

---

## 12. Alerting Configuration

### 12.1 Alert Rules

```yaml
groups:
  - name: security_alerts
    rules:
      - alert: HighFailedLogins
        expr: sum(rate(auth_login_failed[5m])) > 100
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High rate of failed logins detected'

      - alert: MFAAdoptionLow
        expr: (mfa_enabled_users / total_users) < 0.98
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: 'MFA adoption below 98%'

      - alert: CriticalVulnerabilityOpen
        expr: sum(vulns_open{severity="critical"}) > 0
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: 'Critical vulnerability remains open'

      - alert: SecurityIncidentOpen
        expr: sum(incidents_active{severity="critical"}) > 0
        labels:
          severity: critical
        annotations:
          summary: 'Critical security incident active'

      - alert: AccessReviewOverdue
        expr: sum(access_reviews{status="overdue"}) > 0
        labels:
          severity: warning
        annotations:
          summary: 'Access reviews are overdue'
```

### 12.2 Alert Routing

```yaml
route:
  receiver: security-team
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: critical
      receiver: security-oncall
      continue: true

    - match:
        alertname: SecurityIncidentOpen
      receiver: incident-response

receivers:
  - name: security-team
    email_configs:
      - to: security@aivo.com
    slack_configs:
      - channel: '#security-alerts'

  - name: security-oncall
    pagerduty_configs:
      - service_key: '<pagerduty-key>'

  - name: incident-response
    pagerduty_configs:
      - service_key: '<incident-key>'
    slack_configs:
      - channel: '#incident-response'
```

---

## 13. Access Control

### 13.1 Dashboard Permissions

| Dashboard          | Viewer               | Editor          | Admin       |
| ------------------ | -------------------- | --------------- | ----------- |
| Executive Security | Executive, CISO      | Security Team   | CISO        |
| SOC 2 Compliance   | Auditor, Compliance  | Compliance Team | CISO        |
| Authentication     | Security Team        | Security Team   | CISO        |
| Vulnerability      | Security, SRE        | Security Team   | CISO        |
| Incident Response  | Security Team        | Security Team   | CISO        |
| Data Protection    | Security, Compliance | Security Team   | CISO, DPO   |
| Availability       | SRE, Engineering     | SRE Team        | CTO         |
| Vendor Risk        | Compliance, Legal    | Compliance Team | CISO        |
| Training           | HR, Compliance       | HR Team         | HR Director |

### 13.2 Data Sensitivity

| Dashboard        | Data Classification    | Masking Required            |
| ---------------- | ---------------------- | --------------------------- |
| All Dashboards   | Aggregate metrics only | N/A                         |
| User-level data  | Confidential           | Yes - email, names          |
| Incident Details | Restricted             | Yes - IPs, affected systems |
| Audit Logs       | Confidential           | Yes - user identifiers      |

---

## 14. Document Control

| Version | Date       | Author        | Changes                         |
| ------- | ---------- | ------------- | ------------------------------- |
| 1.0     | 2024-01-15 | Security Team | Initial dashboard configuration |

**Next Review Date:** July 2024
