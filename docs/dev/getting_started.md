# Getting Started (Aivo Learning Platform)

This guide gets you productive in one day. Follow the steps in order.

## Prerequisites

- Node 20.19.4 (use `.nvmrc`). Enable Corepack (`corepack enable`) to get pnpm 9.x.
- Python 3.11 (see `.python-version`).
- pnpm (managed by Corepack) and git.
- Flutter SDK (3.19+ recommended), with Xcode (iOS) and Android Studio/SDK (Android) installed and an emulator or device configured.
- For macOS/iOS: Xcode command-line tools and `cocoapods` installed.

## Clone and install

```bash
git clone <your-fork-or-repo-url> aivo
cd aivo
corepack enable
pnpm install
```

## Run the full check

`pnpm run verify-all`  
Runs turborepo pipelines for lint, test (placeholders in some packages), and build.

## Running apps locally

### Web: District Admin (`apps/web-district`)

```bash
cd apps/web-district
pnpm dev
# open http://localhost:3000
```

Routes available: `/login`, `/dashboard`, `/schools`.

### Web: Platform Admin (`apps/web-platform-admin`)

```bash
cd apps/web-platform-admin
pnpm dev
# open http://localhost:3000
```

Routes: `/login`, `/tenants`, `/flags`.

### Mobile: Parent (`apps/mobile-parent`)

```bash
cd apps/mobile-parent
flutter pub get
flutter run   # choose emulator/device
```

Routes: Login → Dashboard → Add Child (buttons navigate).

### Mobile: Learner (`apps/mobile-learner`)

```bash
cd apps/mobile-learner
flutter pub get
flutter run   # choose emulator/device
```

Routes: PIN → Today Plan → Session Complete.

## Common pitfalls

- **Node version mismatch**: if you see engine warnings, install Node 20.19.4 (`nvm use` on macOS/Linux). On Windows, install matching Node and rerun `pnpm install`.
- **Corepack disabled**: run `corepack enable` before `pnpm install`.
- **Flutter missing toolchains**: ensure Android SDK licenses accepted (`yes | sdkmanager --licenses`) and an emulator is running before `flutter run`.
- **Husky prepare warning in CI**: Husky expects a git repo; locally it installs fine after `pnpm install` in a cloned repo.
- **Next.js lint plugin warning**: harmless; will be addressed when we add Next’s flat config preset.

## Quick sanity checks

- `pnpm --filter @aivo/web-district build` should complete without errors.
- `pnpm --filter @aivo/web-platform-admin build` should complete without errors.
- `flutter test` currently minimal; main check is `flutter run` for each app.
