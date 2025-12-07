# CI/CD Overview

- The `CI` workflow (`.github/workflows/ci.yml`) runs on pushes and pull requests to `main`.
- Job `verify` installs deps (Node 20.19.4, pnpm), restores pnpm/turbo caches, and runs `pnpm run verify-all` (lint, tests, type checks/builds). This job must be green before merging to `main`.
- Job `security` runs `pnpm run sec:all`. It skips gracefully if `osv-scanner` or `trivy` are not installed yet and does not block merging until those tools are enabled.
- Future Docker image scans: add `trivy image <image>` or `osv-scanner --lockfile <lockfile>` steps once container builds land.
