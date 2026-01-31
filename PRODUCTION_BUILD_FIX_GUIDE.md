# Production Build Fix Guide: Module Resolution Errors

## Problem Summary

**18+ microservices failing to build** with error:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/node_modules/.pnpm/node_modules/@aivo/ts-data-access/dist/learnerAccess.js'
```

## Root Cause Analysis

The issue occurs because `@aivo/ts-data-access` (and likely `@aivo/ts-rbac`) are **workspace libraries that need to be compiled** before microservices can import them. During Docker builds:

1. ✅ `pnpm install` runs successfully
2. ❌ **Library build step is missing or incomplete**
3. ❌ `pnpm deploy` copies the libraries WITHOUT their `dist/` folders
4. ❌ Microservices try to import from non-existent `dist/` paths

### Why This Happens

1. **`pnpm deploy`** creates a pruned dependency tree but:
   - It copies `node_modules` but workspace packages may be symlinked
   - The `dist/` folders from libs aren't explicitly included in the copy
2. **`prepare` script** in `@aivo/ts-data-access/package.json`:

   ```json
   "prepare": "pnpm build"
   ```

   This runs during `pnpm install` in local dev, but may not run in all Docker build scenarios

3. **Build order issue**: Services build before their workspace dependencies

## Solution: Fix Docker Build Process

### Option 1: Build Dependencies Explicitly (RECOMMENDED)

Update **ALL microservice Dockerfiles** (18+ files):

**Current problematic pattern:**

```dockerfile
# Build the service (includes dependencies like ts-data-access and ts-rbac)
RUN pnpm turbo build --filter="@aivo/auth-svc"
```

**Fixed pattern:**

```dockerfile
# Build workspace dependencies first
RUN pnpm turbo build --filter="@aivo/ts-data-access" --filter="@aivo/ts-rbac"

# Then build the service
RUN pnpm turbo build --filter="@aivo/auth-svc"
```

### Option 2: Fix the Deploy Stage

**Current problematic pattern:**

```dockerfile
# Create a deployable bundle with all production dependencies
RUN pnpm deploy --filter="@aivo/auth-svc" --prod /deploy

# ...later...
# Copy built application from the deploy bundle
COPY --from=builder --chown=nodejs:nodejs /deploy/node_modules ./node_modules
```

**Fixed pattern (add explicit lib copying):**

```dockerfile
# Build workspace dependencies explicitly
RUN pnpm turbo build --filter="@aivo/ts-data-access" --filter="@aivo/ts-rbac"

# Create a deployable bundle
RUN pnpm deploy --filter="@aivo/auth-svc" --prod /deploy

# ...later in runner stage...
# Copy workspace library build outputs explicitly
COPY --from=builder --chown=nodejs:nodejs /app/libs/ts-data-access/dist ./node_modules/@aivo/ts-data-access/dist
COPY --from=builder --chown=nodejs:nodejs /app/libs/ts-rbac/dist ./node_modules/@aivo/ts-rbac/dist
COPY --from=builder --chown=nodejs:nodejs /deploy/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/services/auth-svc/dist ./dist
```

### Option 3: Use Turbo's Dependency Resolution (BEST LONG-TERM)

Modify the build command to automatically include dependencies:

```dockerfile
# This single command builds all dependencies AND the service
RUN pnpm turbo build --filter="@aivo/auth-svc..."
```

The `...` suffix tells Turbo to build all dependencies first (see `turbo.json` "dependsOn": ["^build"]).

## Implementation Steps

### Step 1: Update All Service Dockerfiles

Services that need updating (18+):

- services/auth-svc/Dockerfile
- services/audit-svc/Dockerfile
- services/iep-svc/Dockerfile
- services/learner-svc/Dockerfile
- services/lesson-svc/Dockerfile
- services/parent-svc/Dockerfile
- services/profile-svc/Dockerfile
- services/reports-svc/Dockerfile
- services/research-svc/Dockerfile
- services/retention-svc/Dockerfile
- services/sandbox-svc/Dockerfile
- services/scorm-svc/Dockerfile
- services/search-svc/Dockerfile
- services/sel-svc/Dockerfile
- services/session-svc/Dockerfile
- services/sis-sync-svc/Dockerfile
- services/sync-svc/Dockerfile
- services/teacher-planning-svc/Dockerfile
- (and any others that import @aivo/ts-data-access or @aivo/ts-rbac)

### Step 2: Apply the Fix

**RECOMMENDED: Use Option 3 (Turbo dependency resolution)**

Change this line in ALL service Dockerfiles:

```dockerfile
# OLD:
RUN pnpm turbo build --filter="@aivo/SERVICE-NAME"

# NEW (note the triple dots):
RUN pnpm turbo build --filter="@aivo/SERVICE-NAME..."
```

The `...` syntax means "build this package AND all its dependencies".

### Step 3: Verify the Fix Locally

Test one service before updating all:

```bash
# IMPORTANT: Must run from workspace root!
cd c:/Users/ofema/aivo

# Build a service Docker image locally
docker build -f services/auth-svc/Dockerfile -t auth-svc-test .

# Check build output - should show:
# ✓ @aivo/ts-rbac built successfully
# ✓ @aivo/ts-data-access built successfully
# ✓ @aivo/auth-svc built successfully

# Run it to verify no module errors (if service compiles)
docker run --rm auth-svc-test node dist/index.js
```

**Common Pitfall:** Running `docker build` from service directory will fail with:

```
ERROR: "/services/auth-svc": not found
```

**Solution:** Always run from workspace root with `-f` flag pointing to Dockerfile.

### Step 4: Update CI/CD Pipeline

If using a CI/CD pipeline (GitHub Actions, GitLab CI, etc.), ensure:

1. ✅ Workspace dependencies are built before services
2. ✅ Build cache includes `libs/*/dist` folders
3. ✅ Docker layer caching includes the build outputs

## Quick Fix Script

To update all Dockerfiles automatically:

```powershell
# PowerShell script to update all Dockerfiles
$services = Get-ChildItem -Path "services/*/Dockerfile" -Recurse

foreach ($dockerfile in $services) {
    $content = Get-Content $dockerfile.FullName -Raw

    # Update the build command to include dependencies
    $content = $content -replace `
        'pnpm turbo build --filter="@aivo/([^"]+)"', `
        'pnpm turbo build --filter="@aivo/$1..."'

    Set-Content -Path $dockerfile.FullName -Value $content
    Write-Host "Updated: $($dockerfile.FullName)"
}
```

Or manually search and replace in VS Code:

1. Press `Ctrl+Shift+H` (Find and Replace in Files)
2. Search: `pnpm turbo build --filter="(@aivo/[^"]+)"`
3. Replace: `pnpm turbo build --filter="$1..."`
4. Files to include: `services/**/Dockerfile`
5. Click "Replace All"

## Verification Checklist

After applying the fix:

- [ ] All 18+ Dockerfiles updated with `...` syntax
- [ ] Local Docker build succeeds for at least 2 services
- [ ] CI/CD pipeline builds successfully
- [ ] Deployed containers start without module errors
- [ ] Runtime imports from `@aivo/ts-data-access` work correctly

## Additional Recommendations

### 1. Add Build Verification

Add to `.github/workflows` or CI pipeline:

```yaml
- name: Verify workspace libraries are built
  run: |
    test -d libs/ts-data-access/dist || exit 1
    test -d libs/ts-rbac/dist || exit 1
    echo "✅ All workspace libraries built successfully"
```

### 2. Update Library package.json

Ensure both libraries have the `prepare` script:

**libs/ts-data-access/package.json:**

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "prepare": "pnpm build"
  }
}
```

**libs/ts-rbac/package.json:**

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "prepare": "pnpm build"
  }
}
```

### 3. Add Pre-commit Hook

Prevent future issues by validating builds:

**.husky/pre-push:**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Building workspace libraries..."
pnpm turbo build --filter="@aivo/ts-data-access" --filter="@aivo/ts-rbac"
```

## Troubleshooting

### Issue: Build still fails after fix

**Check 1: Verify Turbo is building dependencies**

```bash
pnpm turbo build --filter="@aivo/auth-svc..." --dry-run
```

Should show:

```
Tasks to Run
@aivo/ts-data-access:build
@aivo/ts-rbac:build
@aivo/auth-svc:build
```

**Check 2: Verify dist folders exist after build**

```bash
ls -la libs/ts-data-access/dist
ls -la libs/ts-rbac/dist
```

**Check 3: Check for symlink issues**

```bash
# In Docker container
ls -la /app/node_modules/@aivo/ts-data-access
# Should be a directory, not a broken symlink
```

### Issue: "Cannot find package '@aivo/ts-data-access'"

This means pnpm workspace resolution failed. Check:

1. `pnpm-workspace.yaml` includes `libs/*`
2. `package.json` has `"@aivo/ts-data-access": "workspace:*"`
3. `pnpm install` ran successfully

### Issue: TypeScript errors in production

Check `moduleResolution` mismatch:

- Libraries use: `"moduleResolution": "bundler"`
- Services use: `"moduleResolution": "node"` or `"NodeNext"`

**Fix:** Standardize to `"moduleResolution": "NodeNext"` everywhere:

**libs/ts-data-access/tsconfig.json:**

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

## Summary

**Root cause:** Workspace libraries not built before services in Docker

**Solution:** Add `...` to Turbo build filter to include dependencies

**Impact:** All 18+ microservices will build successfully in production

**Estimated fix time:** 15-30 minutes for automated script + testing

## Related Files

- All `services/*/Dockerfile` files (18+)
- `libs/ts-data-access/package.json`
- `libs/ts-rbac/package.json`
- `turbo.json`
- `pnpm-workspace.yaml`

## Next Steps

1. ✅ Review this guide
2. ⏳ Apply the automated fix script (or manual updates)
3. ⏳ Test locally with 2-3 services
4. ⏳ Deploy to staging environment
5. ⏳ Monitor for module resolution errors
6. ⏳ Deploy to production

---

**Created:** January 30, 2026  
**Status:** Ready for implementation  
**Severity:** Critical (Production blocker)  
**Estimated Resolution:** 30 minutes
