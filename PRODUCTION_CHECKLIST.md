# Production Deployment Checklist

This checklist ensures all production readiness criteria are met before deployment.

## Pre-Deployment Verification

### Testing & Quality
- [ ] All unit tests passing (`pnpm test`)
- [ ] All integration tests passing (`pnpm test:integration`)
- [ ] E2E tests passing (`pnpm test:e2e`)
- [ ] Lighthouse score > 90 for all core metrics
- [ ] Accessibility audit passing (WCAG 2.1 AA)
- [ ] No critical or high security vulnerabilities (`pnpm sec:all`)
- [ ] Type checking passes (`pnpm type-check`)
- [ ] Linting passes (`pnpm lint`)

### Environment & Configuration
- [ ] All environment variables documented in `.env.example`
- [ ] Environment variables validated with Zod schema
- [ ] Production environment variables set in deployment platform
- [ ] Secrets rotated and stored securely
- [ ] Feature flags configured for production

### Database
- [ ] Database migrations tested on staging
- [ ] Migration rollback tested
- [ ] Database backup created before deployment
- [ ] Connection pooling configured
- [ ] Query performance verified

## Performance Checklist

### Core Web Vitals
- [ ] First Contentful Paint (FCP) < 2.0s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Time to Interactive (TTI) < 3.5s
- [ ] Total Blocking Time (TBT) < 300ms
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Speed Index < 3.0s

### Bundle Optimization
- [ ] JavaScript bundle size < 300KB (gzipped)
- [ ] CSS bundle size < 50KB (gzipped)
- [ ] Code splitting implemented for routes
- [ ] Lazy loading for below-fold content
- [ ] Tree shaking enabled
- [ ] Dead code eliminated

### Assets
- [ ] Images optimized (WebP format)
- [ ] Thumbnails generated
- [ ] Images lazy loaded
- [ ] CDN configured for static assets
- [ ] Asset caching headers configured
- [ ] Font loading optimized (preload critical fonts)

### Caching
- [ ] Service worker configured (PWA)
- [ ] API response caching strategy defined
- [ ] Static asset caching (1 year for immutable)
- [ ] Browser caching headers configured

## Security Checklist

### Headers & Policies
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Content-Security-Policy configured
- [ ] Permissions-Policy configured
- [ ] HTTPS enforced (HSTS enabled)

### Authentication & Authorization
- [ ] Authentication tokens secured (HttpOnly, Secure, SameSite)
- [ ] API keys rotated
- [ ] Rate limiting implemented
- [ ] CORS configured correctly
- [ ] CSRF protection enabled

### Data Protection
- [ ] PII handling compliant with privacy policy
- [ ] Data encryption at rest
- [ ] Data encryption in transit
- [ ] Input validation on all forms
- [ ] SQL injection protection verified
- [ ] XSS protection verified

## Monitoring & Observability

### Error Tracking
- [ ] Sentry configured for production
- [ ] Error alerts configured
- [ ] PII scrubbed from error reports
- [ ] Source maps uploaded to Sentry

### Application Monitoring
- [ ] APM configured (performance monitoring)
- [ ] Custom metrics defined
- [ ] Dashboard created for key metrics
- [ ] API latency monitoring enabled
- [ ] Database query monitoring enabled

### Alerting
- [ ] Uptime monitoring configured
- [ ] Error rate alerts configured
- [ ] Performance degradation alerts configured
- [ ] On-call rotation defined
- [ ] Escalation policy configured

### Logging
- [ ] Structured logging implemented
- [ ] Log levels configured appropriately
- [ ] Log retention policy defined
- [ ] Sensitive data excluded from logs

## Deployment Process

### CI/CD Pipeline
- [ ] Build workflow configured
- [ ] Test workflow configured
- [ ] Deploy workflow configured
- [ ] Rollback procedure documented
- [ ] Blue-green or canary deployment enabled

### Release Process
- [ ] Version tagging strategy defined
- [ ] Changelog updated
- [ ] Release notes prepared
- [ ] Stakeholders notified
- [ ] Deployment window scheduled

## Post-Deployment Verification

### Smoke Tests
- [ ] Homepage loads successfully
- [ ] Authentication flow works
- [ ] Core user journeys functional
- [ ] API endpoints responding
- [ ] Database connections working

### Performance Verification
- [ ] Real-user monitoring shows acceptable metrics
- [ ] No significant performance regression
- [ ] CDN functioning correctly
- [ ] Caching working as expected

### Monitoring Check
- [ ] Logs showing expected traffic
- [ ] No unusual error patterns
- [ ] Metrics within expected ranges
- [ ] Alerts not triggering

## Rollback Procedure

If issues are detected post-deployment:

1. **Assess severity**: Determine if immediate rollback is needed
2. **Notify team**: Alert stakeholders via Slack
3. **Execute rollback**: 
   - Vercel: `vercel rollback`
   - K8s: `kubectl rollout undo deployment/learner-app`
4. **Verify rollback**: Confirm previous version is live
5. **Document incident**: Create post-mortem document
6. **Investigate**: Analyze logs and metrics to identify root cause

## Emergency Contacts

| Role | Contact | Escalation Time |
|------|---------|-----------------|
| On-call Engineer | @on-call | Immediate |
| Tech Lead | @tech-lead | 15 minutes |
| Engineering Manager | @eng-manager | 30 minutes |
| VP Engineering | @vp-eng | 1 hour |

## Documentation Links

- [Deployment Guide](./docs/deployment.md)
- [Runbook](./docs/runbook.md)
- [Architecture Overview](./docs/architecture.md)
- [API Documentation](./docs/api.md)
- [Monitoring Dashboard](https://monitoring.aivo.ai)
- [Sentry Dashboard](https://sentry.io/aivo)

---

**Last Updated**: Sprint 4 - Production Readiness
**Maintainer**: Platform Team
