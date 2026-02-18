# ADR-006: Stack Upgrade February 2026

**Status:** Accepted  
**Date:** 2026-02-17

## Decision
Upgrade the platform runtime and framework stack:
- Node.js 20.19.4 → 22.22.0 (Active LTS)
- pnpm 9.12.0 → 10.29.3
- React 18.3.1 → 19.0.0
- Next.js 14.2.35 → 15.5.12

## Rationale
- Node.js 20 enters maintenance mode April 2026
- pnpm 9 is EOL
- React 19 is the current stable with improved performance
- Next.js 15 is production-stable with LTS support until Oct 2026
- Next.js 16 was considered but deferred — its proxy.ts migration 
  and Cache Components model are too aggressive for a mid-cycle upgrade

## Consequences
- All Dockerfiles updated to node:22-alpine
- pnpm lockfile regenerated (SHA256 format)
- React.forwardRef is deprecated but still functional — 
  will be cleaned up incrementally
- Next.js async request APIs (cookies, headers, params) required 
  code changes in route handlers
