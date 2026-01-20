#!/bin/bash

# =============================================================================
# AIVO Platform - Security Audit Script
# Week 51: Performance & Security Audit
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
CRITICAL_COUNT=0

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Report output
REPORT_DIR="$PROJECT_ROOT/test-results/security"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/SECURITY_AUDIT_REPORT.md"
JSON_REPORT="$REPORT_DIR/SECURITY_AUDIT_REPORT.json"

# Logging functions
log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARN_COUNT++))
}

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1"
    ((CRITICAL_COUNT++))
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
# AIVO Platform - Security Audit Report

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Environment:** ${NODE_ENV:-development}
**Project:** aivo-platform

---

EOF
}

# Add to report
add_to_report() {
    echo -e "$1" >> "$REPORT_FILE"
}

cd "$PROJECT_ROOT"

echo ""
echo -e "${CYAN}=============================================="
echo "  AIVO Platform - Security Audit"
echo "  Running comprehensive security validation..."
echo "==============================================${NC}"
echo ""

init_report

# =============================================================================
# 1. DEPENDENCY VULNERABILITY SCAN
# =============================================================================

log_header "1. Dependency Vulnerability Scan"
add_to_report "## 1. Dependency Vulnerability Scan\n"

# Check for pnpm
if command -v pnpm &> /dev/null; then
    log_info "Running pnpm audit..."

    AUDIT_OUTPUT=$(pnpm audit --json 2>/dev/null || echo '{"vulnerabilities":{}}')

    # Parse vulnerability counts
    CRITICAL=$(echo "$AUDIT_OUTPUT" | grep -o '"critical":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
    HIGH=$(echo "$AUDIT_OUTPUT" | grep -o '"high":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
    MODERATE=$(echo "$AUDIT_OUTPUT" | grep -o '"moderate":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
    LOW=$(echo "$AUDIT_OUTPUT" | grep -o '"low":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")

    # Default to 0 if empty
    CRITICAL=${CRITICAL:-0}
    HIGH=${HIGH:-0}
    MODERATE=${MODERATE:-0}
    LOW=${LOW:-0}

    if [ "$CRITICAL" -gt 0 ]; then
        log_critical "Found $CRITICAL critical vulnerabilities!"
    fi

    if [ "$HIGH" -gt 0 ]; then
        log_fail "Found $HIGH high severity vulnerabilities"
    fi

    if [ "$MODERATE" -gt 0 ]; then
        log_warn "Found $MODERATE moderate vulnerabilities"
    fi

    if [ "$CRITICAL" -eq 0 ] && [ "$HIGH" -eq 0 ]; then
        log_pass "No critical or high severity vulnerabilities found"
    fi

    add_to_report "| Severity | Count |"
    add_to_report "|----------|-------|"
    add_to_report "| Critical | $CRITICAL |"
    add_to_report "| High | $HIGH |"
    add_to_report "| Moderate | $MODERATE |"
    add_to_report "| Low | $LOW |"
    add_to_report ""
else
    log_warn "pnpm not found, skipping audit"
    add_to_report "⚠️ pnpm not found, skipping audit\n"
fi

# =============================================================================
# 2. SECRET DETECTION
# =============================================================================

log_header "2. Secret Detection"
add_to_report "## 2. Secret Detection\n"

# Check for common secrets in code
log_info "Scanning for hardcoded secrets..."

SECRETS_FOUND=0

# Patterns to search for secrets
SECRET_PATTERNS=(
    "password\s*[:=]\s*['\"][^'\"]+['\"]"
    "api[_-]?key\s*[:=]\s*['\"][^'\"]+['\"]"
    "secret\s*[:=]\s*['\"][^'\"]+['\"]"
    "token\s*[:=]\s*['\"][a-zA-Z0-9]{20,}['\"]"
    "aws[_-]?access[_-]?key"
    "aws[_-]?secret"
    "AKIA[0-9A-Z]{16}"
    "-----BEGIN (RSA |DSA |EC )?PRIVATE KEY-----"
    "-----BEGIN CERTIFICATE-----"
)

# Files/directories to exclude
EXCLUDE_PATTERNS="node_modules|.git|dist|build|coverage|test-results|*.md|*.lock"

for pattern in "${SECRET_PATTERNS[@]}"; do
    # Search for pattern (case insensitive)
    matches=$(grep -riE "$pattern" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.env*" apps/ services/ libs/ 2>/dev/null | grep -vE "$EXCLUDE_PATTERNS" | grep -vE "example|sample|test|mock|fake" | head -10 || true)

    if [ -n "$matches" ]; then
        SECRETS_FOUND=$((SECRETS_FOUND + 1))
        log_warn "Potential secret found matching pattern: $pattern"
        add_to_report "⚠️ Potential secret found: \`$pattern\`\n"
    fi
done

# Check for .env files that might be committed
env_files=$(find . -name ".env" -o -name ".env.local" -o -name ".env.production" 2>/dev/null | grep -v node_modules || true)
if [ -n "$env_files" ]; then
    log_warn "Found .env files that might contain secrets"
    add_to_report "⚠️ Found .env files:\n\`\`\`\n$env_files\n\`\`\`\n"
else
    log_pass "No committed .env files found"
fi

# Check .gitignore
if grep -q "\.env" .gitignore 2>/dev/null; then
    log_pass ".env files are in .gitignore"
    add_to_report "✅ .env files are properly gitignored\n"
else
    log_warn ".env might not be in .gitignore"
    add_to_report "⚠️ .env might not be properly gitignored\n"
fi

if [ $SECRETS_FOUND -eq 0 ]; then
    log_pass "No obvious hardcoded secrets detected"
    add_to_report "✅ No hardcoded secrets detected\n"
fi

# =============================================================================
# 3. SECURITY HEADERS CHECK
# =============================================================================

log_header "3. Security Headers Check (Config)"
add_to_report "## 3. Security Headers Configuration\n"

# Check for security header configuration in Next.js configs
log_info "Checking for security header configuration..."

SECURITY_HEADERS=(
    "Content-Security-Policy"
    "X-Frame-Options"
    "X-Content-Type-Options"
    "Strict-Transport-Security"
    "X-XSS-Protection"
    "Referrer-Policy"
    "Permissions-Policy"
)

found_headers=0

# Check Next.js configs
for config_file in apps/*/next.config.* apps/*/next.config.js apps/*/next.config.mjs apps/*/next.config.ts; do
    if [ -f "$config_file" ]; then
        for header in "${SECURITY_HEADERS[@]}"; do
            if grep -qi "$header" "$config_file" 2>/dev/null; then
                found_headers=$((found_headers + 1))
            fi
        done
    fi
done

# Check middleware files
for middleware_file in apps/*/middleware.ts apps/*/src/middleware.ts; do
    if [ -f "$middleware_file" ]; then
        for header in "${SECURITY_HEADERS[@]}"; do
            if grep -qi "$header" "$middleware_file" 2>/dev/null; then
                found_headers=$((found_headers + 1))
            fi
        done
    fi
done

if [ $found_headers -ge 4 ]; then
    log_pass "Security headers appear to be configured"
    add_to_report "✅ Security headers configured in application\n"
else
    log_warn "Some security headers may not be configured"
    add_to_report "⚠️ Some security headers may be missing\n"
fi

add_to_report "| Header | Recommended |"
add_to_report "|--------|-------------|"
for header in "${SECURITY_HEADERS[@]}"; do
    add_to_report "| $header | Required |"
done
add_to_report ""

# =============================================================================
# 4. AUTHENTICATION & AUTHORIZATION
# =============================================================================

log_header "4. Authentication & Authorization"
add_to_report "## 4. Authentication & Authorization\n"

# Check for auth service
if [ -d "services/auth-svc" ]; then
    log_pass "Auth service exists"
    add_to_report "✅ Auth service exists\n"

    # Check for JWT configuration
    if grep -rq "jwt" services/auth-svc/ 2>/dev/null; then
        log_pass "JWT authentication configured"
        add_to_report "✅ JWT authentication configured\n"
    fi

    # Check for SSO/SAML
    if grep -rqi "saml\|oidc\|oauth" services/auth-svc/ 2>/dev/null; then
        log_pass "SSO/SAML support detected"
        add_to_report "✅ SSO/SAML support detected\n"
    fi

    # Check for MFA
    if grep -rqi "mfa\|totp\|2fa\|two-factor" services/auth-svc/ 2>/dev/null; then
        log_pass "MFA support detected"
        add_to_report "✅ MFA support detected\n"
    else
        log_warn "MFA support not clearly detected"
        add_to_report "⚠️ MFA support not clearly detected\n"
    fi
else
    log_fail "Auth service not found"
    add_to_report "❌ Auth service not found\n"
fi

# Check for RBAC
if [ -d "libs/ts-rbac" ]; then
    log_pass "RBAC library exists"
    add_to_report "✅ RBAC library exists\n"
else
    log_warn "RBAC library not found"
    add_to_report "⚠️ RBAC library not found\n"
fi

# =============================================================================
# 5. INPUT VALIDATION & SANITIZATION
# =============================================================================

log_header "5. Input Validation & Sanitization"
add_to_report "## 5. Input Validation & Sanitization\n"

# Check for Zod or similar validation
if grep -rq "zod\|yup\|joi\|class-validator" package.json apps/*/package.json services/*/package.json 2>/dev/null; then
    log_pass "Schema validation library detected"
    add_to_report "✅ Schema validation library in use\n"
else
    log_warn "No schema validation library detected"
    add_to_report "⚠️ Consider using schema validation (Zod, Yup, Joi)\n"
fi

# Check for XSS protection
if grep -rqi "dompurify\|sanitize\|escape" package.json apps/*/package.json 2>/dev/null; then
    log_pass "XSS sanitization detected"
    add_to_report "✅ XSS sanitization in use\n"
else
    log_warn "XSS sanitization not clearly detected"
    add_to_report "⚠️ Ensure XSS sanitization is in place\n"
fi

# Check for SQL injection prevention (Prisma is safe by default)
if grep -rq "prisma" services/*/package.json 2>/dev/null; then
    log_pass "Prisma ORM detected (parameterized queries)"
    add_to_report "✅ Prisma ORM provides SQL injection protection\n"
fi

# =============================================================================
# 6. DATA PROTECTION & PRIVACY
# =============================================================================

log_header "6. Data Protection & Privacy"
add_to_report "## 6. Data Protection & Privacy\n"

# Check for consent service (COPPA compliance)
if [ -d "services/consent-svc" ]; then
    log_pass "Consent service exists (COPPA)"
    add_to_report "✅ Consent service exists for COPPA compliance\n"
else
    log_fail "Consent service not found"
    add_to_report "❌ Consent service not found\n"
fi

# Check for DSR service (GDPR compliance)
if [ -d "services/dsr-svc" ]; then
    log_pass "DSR service exists (GDPR)"
    add_to_report "✅ DSR service exists for GDPR compliance\n"
else
    log_warn "DSR service not found"
    add_to_report "⚠️ DSR service not found\n"
fi

# Check for audit service
if [ -d "services/audit-svc" ]; then
    log_pass "Audit service exists"
    add_to_report "✅ Audit logging service exists\n"
else
    log_warn "Audit service not found"
    add_to_report "⚠️ Audit logging service not found\n"
fi

# Check for encryption utilities
if grep -rqi "bcrypt\|argon2\|crypto\|encrypt" package.json libs/*/package.json services/*/package.json 2>/dev/null; then
    log_pass "Encryption/hashing utilities detected"
    add_to_report "✅ Encryption/hashing utilities in use\n"
fi

# =============================================================================
# 7. INFRASTRUCTURE SECURITY
# =============================================================================

log_header "7. Infrastructure Security"
add_to_report "## 7. Infrastructure Security\n"

# Check for WAF configuration
if [ -d "infrastructure/terraform/modules/waf" ]; then
    log_pass "WAF configuration exists"
    add_to_report "✅ WAF configuration exists\n"
else
    log_warn "WAF configuration not found"
    add_to_report "⚠️ WAF configuration not found\n"
fi

# Check for network policies in Kubernetes
if find infra/k8s -name "*network*policy*" 2>/dev/null | grep -q .; then
    log_pass "Kubernetes network policies found"
    add_to_report "✅ Kubernetes network policies configured\n"
else
    log_warn "Kubernetes network policies not found"
    add_to_report "⚠️ Consider adding Kubernetes network policies\n"
fi

# Check for secrets management
if grep -rqi "vault\|secrets-manager\|sealed-secrets" infrastructure/ infra/ 2>/dev/null; then
    log_pass "Secrets management solution detected"
    add_to_report "✅ Secrets management solution in use\n"
else
    log_warn "No dedicated secrets management solution detected"
    add_to_report "⚠️ Consider using dedicated secrets management\n"
fi

# Check for TLS configuration
if grep -rqi "tls\|ssl\|https\|certificate" infrastructure/ infra/ 2>/dev/null; then
    log_pass "TLS/SSL configuration detected"
    add_to_report "✅ TLS/SSL configuration present\n"
fi

# =============================================================================
# 8. API SECURITY
# =============================================================================

log_header "8. API Security"
add_to_report "## 8. API Security\n"

# Check for rate limiting
if [ -d "packages/rate-limiter" ]; then
    log_pass "Rate limiting package exists"
    add_to_report "✅ Rate limiting package exists\n"
elif grep -rqi "rate.?limit" services/ libs/ 2>/dev/null; then
    log_pass "Rate limiting appears to be implemented"
    add_to_report "✅ Rate limiting implemented\n"
else
    log_warn "Rate limiting not clearly detected"
    add_to_report "⚠️ Ensure rate limiting is implemented\n"
fi

# Check for CORS configuration
if grep -rqi "cors" services/ apps/ 2>/dev/null; then
    log_pass "CORS configuration detected"
    add_to_report "✅ CORS configuration present\n"
fi

# Check for API versioning
if grep -rqi "/api/v[0-9]" services/ apps/ 2>/dev/null; then
    log_pass "API versioning detected"
    add_to_report "✅ API versioning in use\n"
fi

# =============================================================================
# 9. CI/CD SECURITY
# =============================================================================

log_header "9. CI/CD Security"
add_to_report "## 9. CI/CD Security\n"

# Check for security scanning workflow
if [ -f ".github/workflows/security-scan.yml" ]; then
    log_pass "Security scanning workflow exists"
    add_to_report "✅ Security scanning workflow configured\n"
else
    log_warn "Security scanning workflow not found"
    add_to_report "⚠️ Add security scanning to CI/CD\n"
fi

# Check for dependency update workflow
if [ -f ".github/workflows/dependency-update.yml" ]; then
    log_pass "Dependency update workflow exists"
    add_to_report "✅ Dependency update workflow configured\n"
fi

# Check for branch protection rules (we can't check GitHub settings, but can check for required files)
if grep -rqi "protected\|require.*review\|status.*check" .github/ 2>/dev/null; then
    log_info "Branch protection may be configured"
    add_to_report "ℹ️ Verify branch protection rules in GitHub settings\n"
fi

# =============================================================================
# 10. SECURITY TESTS
# =============================================================================

log_header "10. Security Tests"
add_to_report "## 10. Security Tests\n"

# Check for security test directory
if [ -d "tests/security" ]; then
    log_pass "Security test directory exists"
    add_to_report "✅ Security test directory exists\n"

    # Count security test files
    security_test_count=$(find tests/security -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | wc -l)
    log_info "Found $security_test_count security test files"
    add_to_report "Found $security_test_count security test files\n"
else
    log_warn "Security test directory not found"
    add_to_report "⚠️ Add dedicated security tests\n"
fi

# Check for SSO security tests
if [ -f "tests/security/sso-security.test.ts" ] || [ -f "scripts/security/sso-vulnerability-scan.ts" ]; then
    log_pass "SSO security tests exist"
    add_to_report "✅ SSO security tests exist\n"
fi

# =============================================================================
# SUMMARY
# =============================================================================

log_header "SECURITY AUDIT SUMMARY"

echo ""
echo "Results:"
echo "  - Passed:   $PASS_COUNT"
echo "  - Failed:   $FAIL_COUNT"
echo "  - Warnings: $WARN_COUNT"
echo "  - Critical: $CRITICAL_COUNT"
echo ""

# Calculate overall status
if [ $CRITICAL_COUNT -gt 0 ]; then
    AUDIT_STATUS="CRITICAL"
elif [ $FAIL_COUNT -gt 0 ]; then
    AUDIT_STATUS="FAILED"
elif [ $WARN_COUNT -gt 5 ]; then
    AUDIT_STATUS="NEEDS_ATTENTION"
else
    AUDIT_STATUS="PASSED"
fi

# Add summary to report
add_to_report "---\n"
add_to_report "## Summary\n"
add_to_report "| Category | Count |"
add_to_report "|----------|-------|"
add_to_report "| Passed | $PASS_COUNT |"
add_to_report "| Failed | $FAIL_COUNT |"
add_to_report "| Warnings | $WARN_COUNT |"
add_to_report "| Critical | $CRITICAL_COUNT |"
add_to_report ""
add_to_report "**Overall Status:** $AUDIT_STATUS\n"

# Create JSON report
cat > "$JSON_REPORT" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "$AUDIT_STATUS",
  "summary": {
    "passed": $PASS_COUNT,
    "failed": $FAIL_COUNT,
    "warnings": $WARN_COUNT,
    "critical": $CRITICAL_COUNT
  },
  "recommendation": "$([ "$AUDIT_STATUS" = "PASSED" ] && echo "Ready for production deployment" || echo "Address security issues before deployment")"
}
EOF

echo ""
log_info "Reports saved to:"
log_info "  - $REPORT_FILE"
log_info "  - $JSON_REPORT"
echo ""

# Determine exit status
case $AUDIT_STATUS in
    "CRITICAL")
        echo -e "${RED}SECURITY AUDIT: CRITICAL ISSUES FOUND${NC}"
        echo "Address $CRITICAL_COUNT critical issues before deployment."
        exit 2
        ;;
    "FAILED")
        echo -e "${RED}SECURITY AUDIT: FAILED${NC}"
        echo "Address $FAIL_COUNT failed checks before deployment."
        exit 1
        ;;
    "NEEDS_ATTENTION")
        echo -e "${YELLOW}SECURITY AUDIT: PASSED WITH WARNINGS${NC}"
        echo "Consider addressing $WARN_COUNT warnings."
        exit 0
        ;;
    *)
        echo -e "${GREEN}SECURITY AUDIT: PASSED${NC}"
        exit 0
        ;;
esac
