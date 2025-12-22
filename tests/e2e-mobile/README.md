# AIVO Mobile E2E Test Suite

Comprehensive end-to-end testing suite for AIVO mobile applications using the **Patrol** testing framework.

## 📋 Overview

This test suite provides full coverage for all three AIVO mobile applications:
- **Parent App** (`mobile-parent`) - Parent dashboard, child management, progress monitoring
- **Teacher App** (`mobile-teacher`) - Class management, live monitoring, IEP tracking
- **Learner App** (`mobile-learner`) - Learning sessions, achievements, accessibility

## 🏗️ Architecture

```
tests/e2e-mobile/
├── patrol.yaml                    # Patrol framework configuration
├── docker-compose.e2e.yml        # Test backend services
├── integration_test/
│   ├── app_test.dart             # Main entry point
│   ├── config/
│   │   ├── test_config.dart      # Environment & timeout configuration
│   │   └── test_users.dart       # Test account credentials
│   ├── common/
│   │   ├── base_test.dart        # Base test class with setup/teardown
│   │   ├── test_utils.dart       # Logging, retry, data generation
│   │   ├── matchers.dart         # Custom Patrol matchers
│   │   └── actions.dart          # Reusable test actions
│   ├── parent_app/               # Parent app test cases
│   ├── teacher_app/              # Teacher app test cases
│   ├── learner_app/              # Learner app test cases
│   └── cross_app/                # Cross-app integration tests
├── fixtures/
│   ├── api_mocks.dart            # Mock API client
│   └── test_data.dart            # Static test data
├── mock-server/                   # Mock backend for testing
│   ├── Dockerfile
│   ├── package.json
│   └── src/server.js
├── scripts/
│   ├── run_e2e.sh                # Linux/macOS runner
│   └── run_e2e.ps1               # Windows PowerShell runner
└── reports/                       # Test reports output
```

## 🚀 Quick Start

### Prerequisites

1. **Flutter SDK** (3.19+)
2. **Patrol CLI**: `dart pub global activate patrol_cli`
3. **Docker** (for test backend)
4. **Android Emulator** or **iOS Simulator**

### Running Tests

#### Local Development

```bash
# Start test backend
docker compose -f tests/e2e-mobile/docker-compose.e2e.yml up -d

# Run all tests (Unix)
./tests/e2e-mobile/scripts/run_e2e.sh --app all --platform android

# Run all tests (Windows)
.\tests\e2e-mobile\scripts\run_e2e.ps1 -App all -Platform android

# Run specific app tests
./scripts/run_e2e.sh --app parent --tag smoke
./scripts/run_e2e.sh --app teacher --tag regression
./scripts/run_e2e.sh --app learner --tag critical
```

#### Using Patrol CLI Directly

```bash
# Navigate to app directory
cd apps/mobile-parent

# Run smoke tests
patrol test --target integration_test/parent_app --tags smoke

# Run with specific device
patrol test --device "Pixel 6 API 33"

# Run with sharding (for CI)
patrol test --shard-count 4 --shard-index 0
```

## 🏷️ Test Tags

Tests are organized with the following tags:

| Tag | Description | Count |
|-----|-------------|-------|
| `smoke` | Quick sanity checks (~5 min) | ~20 tests |
| `regression` | Full feature coverage (~30 min) | ~80 tests |
| `critical` | Business-critical paths (~10 min) | ~30 tests |
| `offline` | Offline functionality | ~10 tests |
| `billing` | Payment & subscription flows | ~8 tests |
| `accessibility` | A11y features & compliance | ~15 tests |
| `iep` | IEP tracking features | ~6 tests |
| `sync` | Cross-app data synchronization | ~5 tests |
| `notifications` | Push & in-app notifications | ~8 tests |

Run tests by tag:
```bash
patrol test --tags smoke
patrol test --tags "smoke,critical"
patrol test --exclude-tags slow
```

## 📱 Test Coverage

### Parent App Tests

| Test File | Description | Tags |
|-----------|-------------|------|
| `onboarding_test.dart` | Registration, profile setup | smoke, regression |
| `add_child_test.dart` | Child linking, management | smoke, critical |
| `view_progress_test.dart` | Dashboard, analytics | regression |
| `billing_test.dart` | Subscriptions, payments | billing, critical |
| `notifications_test.dart` | Push & in-app alerts | notifications |

### Teacher App Tests

| Test File | Description | Tags |
|-----------|-------------|------|
| `login_test.dart` | Authentication flows | smoke, critical |
| `class_management_test.dart` | Class CRUD operations | smoke, regression |
| `live_monitoring_test.dart` | Real-time session monitoring | regression |
| `iep_tracking_test.dart` | IEP goals & progress | iep, critical |
| `offline_test.dart` | Offline mode handling | offline |

### Learner App Tests

| Test File | Description | Tags |
|-----------|-------------|------|
| `session_flow_test.dart` | Learning session lifecycle | smoke, critical |
| `achievements_test.dart` | Badges, streaks, rewards | regression |
| `accessibility_test.dart` | TTS, visual settings | accessibility, critical |
| `break_reminders_test.dart` | Focus & break management | regression |

### Cross-App Tests

| Test File | Description | Tags |
|-----------|-------------|------|
| `parent_learner_sync_test.dart` | Data sync validation | sync, critical |
| `teacher_parent_comm_test.dart` | Communication features | regression |
| `notification_delivery_test.dart` | Push notification flows | notifications, sync |

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_ENV` | Environment: `test`, `staging` | `test` |
| `API_BASE_URL` | Backend API URL | `http://localhost:3001` |
| `AUTH_URL` | Auth service URL | `http://localhost:4001` |
| `HEADLESS` | Run without GUI | `false` |
| `SHARD_INDEX` | Current shard index | `0` |
| `TOTAL_SHARDS` | Total number of shards | `1` |

### Timeouts

Configure in `integration_test/config/test_config.dart`:

```dart
class TestTimeouts {
  static const Duration testTimeout = Duration(minutes: 5);
  static const Duration appLaunchTimeout = Duration(seconds: 60);
  static const Duration elementWaitTimeout = Duration(seconds: 10);
  static const Duration networkTimeout = Duration(seconds: 30);
}
```

## 🔧 CI/CD Integration

The test suite is integrated with GitHub Actions. See `.github/workflows/e2e-tests.yml`.

### Pipeline Structure

```
┌─────────────────┐
│  setup-backend  │
└────────┬────────┘
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
┌───────┐ ┌───────┐ ┌────────────┐
│Android│ │  iOS  │ │ Cross-App  │
│  E2E  │ │  E2E  │ │    E2E     │
│(4 shd)│ │(4 shd)│ └────────────┘
└───┬───┘ └───┬───┘       │
    │         │           │
    └────┬────┴───────────┘
         ▼
   ┌───────────┐
   │  Reports  │
   └───────────┘
```

### Manual Trigger

```bash
gh workflow run e2e-tests.yml -f apps="parent,teacher" -f platforms="android"
```

## 📊 Reports

Test reports are generated in multiple formats:

- **JUnit XML**: `reports/junit/` - For CI integration
- **Screenshots**: `reports/screenshots/` - Failure captures
- **Logs**: `reports/logs/` - Detailed execution logs

## 🛠️ Troubleshooting

### Common Issues

#### Emulator not detected
```bash
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_6_API_33 -no-snapshot
```

#### Patrol build fails
```bash
# Clean and rebuild
flutter clean
flutter pub get
patrol build android --flavor dev
```

#### Tests timeout
- Increase `testTimeout` in `test_config.dart`
- Check network connectivity to mock server
- Verify emulator performance

#### Mock server connection refused
```bash
# Check if containers are running
docker compose -f docker-compose.e2e.yml ps

# View logs
docker compose -f docker-compose.e2e.yml logs mock-api
```

## 📝 Writing New Tests

### Basic Test Template

```dart
import 'package:patrol/patrol.dart';
import '../config/test_config.dart';
import '../common/base_test.dart';

void main() {
  patrolTest(
    'My new test case',
    tags: ['smoke'],
    ($) async {
      // Arrange
      await $.pumpAndSettle();
      
      // Act
      await $(#myButton).tap();
      
      // Assert
      expect($(#successMessage), findsOneWidget);
    },
  );
}
```

### Best Practices

1. **Use semantic keys** for widget identification
2. **Tag tests appropriately** for selective execution
3. **Add screenshots** at failure points
4. **Use retry helpers** for flaky operations
5. **Clean up test data** in tearDown

## 📚 Resources

- [Patrol Documentation](https://patrol.leancode.co/)
- [Flutter Testing Guide](https://docs.flutter.dev/testing)
- [AIVO Testing Standards](../docs/testing.md)

## 🤝 Contributing

1. Create tests in the appropriate app directory
2. Follow naming convention: `<feature>_test.dart`
3. Add appropriate tags
4. Update this README if adding new test categories
5. Ensure tests pass locally before pushing

---

**Maintained by AIVO Quality Engineering Team**
