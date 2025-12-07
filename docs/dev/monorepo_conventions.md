# Monorepo Conventions (Aivo Learning Platform)

## Naming

- Web apps: `apps/web-<role>` (e.g., `apps/web-district`, `apps/web-platform-admin`).
- Mobile apps: `apps/mobile-<audience>` (e.g., `apps/mobile-parent`, `apps/mobile-learner`).
- Services: `services/<service-name>` (e.g., `services/auth-svc`, `services/tenant-svc`).
- Shared libs: `libs/<domain>` (e.g., `libs/ts-types`, `libs/ui-web`, `libs/flutter-common`).

## Adding a new service (Node/TS)

1. Create `services/<name>/` with `package.json` (private, module) and `tsconfig.json` extending `../../tsconfig.base.json`.
2. Add scripts: `lint` (`eslint .`), `test` (your runner), `build` (`tsc -p tsconfig.json --noEmit` or real build).
3. Wire imports via `@aivo/*` path alias if needed; keep sources under `src/`.
4. Ensure it matches `pnpm-workspace.yaml` globs (already `services/*`).

## Adding a new web app (Next.js)

1. Create `apps/web-<name>/` with Next.js (App Router). Include `tsconfig.json` extending the root base, Tailwind config, and `next.config.mjs`.
2. Scripts: `dev`, `lint` (`eslint .`), `test` (e.g., vitest), `build` (`next build`).
3. Add routes with no dead links; keep UI components in `components/`, routes in `app/`.
4. Tailwind content globs should include local `app/**` and shared `libs/ui-web/**` if used.

## Adding a new Flutter app

1. Create `apps/mobile-<name>/` Flutter app. Add dependencies on `go_router`, `flutter_riverpod`, and shared `flutter_common` if needed.
2. Keep routes in `lib/main.dart` with `GoRouter`; screens under `lib/screens/`.
3. Run `flutter pub get`; ensure it builds on iOS and Android.

## Tests

- Node/TS: place tests near source or under `__tests__/`; name with `.test.ts` or `.spec.ts`. Add a real `test` script per package.
- Web: use Vitest/RTL for components and Next route handlers as added.
- Flutter: use `test/` for Dart unit/widget tests; add golden tests as needed.

## Linting & formatting

- Run `pnpm run lint` (Turbo fan-outs to package lint scripts) and `pnpm run format:check` before PRs.
- TypeScript strict mode is enabled via `tsconfig.base.json`.
- Prettier config lives at `prettier.config.cjs`.

## Commits

- Use Conventional Commits (enforced by commitlint and Husky commit-msg hook).
- Run `pnpm commit` to use Commitizen for guided messages.

## Pull requests

- CI runs `pnpm run verify-all`; it must be green before merge to `main`.
- Add or update tests with code changes; avoid introducing dead routes or buttons in UI work.
