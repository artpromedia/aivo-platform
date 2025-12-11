# Offline Support Module

This module provides offline-first functionality for Aivo Flutter apps.

## Architecture

See `/docs/mobile/offline_architecture.md` for the full architecture documentation.

## Files

- `offline_tables.dart` - Drift table definitions
- `offline_database.dart` - Database class with query methods
- `sync_manager.dart` - Sync orchestration service
- `connectivity_service.dart` - Network connectivity monitoring

## Setup

### 1. Generate Drift Code

After making changes to `offline_tables.dart` or `offline_database.dart`, run:

```bash
cd libs/flutter-common
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

Or for continuous generation during development:

```bash
flutter pub run build_runner watch --delete-conflicting-outputs
```

### 2. Initialize in App

```dart
import 'package:flutter_common/flutter_common.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize connectivity monitoring
  final connectivity = ConnectivityService();
  await connectivity.initialize();
  
  // Initialize offline database
  final database = OfflineDatabase();
  
  // Create sync manager with app-specific API clients
  final syncManager = SyncManager(
    database: database,
    connectivityService: connectivity,
    planApi: YourPlanApiClient(),
    contentApi: YourContentApiClient(),
    sessionApi: YourSessionApiClient(),
    eventApi: YourEventApiClient(),
  );
  
  runApp(
    ProviderScope(
      overrides: [
        offlineDatabaseProvider.overrideWithValue(database),
        connectivityServiceProvider.overrideWithValue(connectivity),
        syncManagerProvider.overrideWithValue(syncManager),
      ],
      child: const MyApp(),
    ),
  );
}
```

### 3. Use in Widgets

```dart
class MyWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncStatus = ref.watch(syncStatusProvider);
    final isOnline = ref.watch(isOnlineProvider);
    
    return Column(
      children: [
        if (!isOnline)
          const OfflineBanner(),
        if (syncStatus.when(
          data: (s) => s.hasPendingData,
          loading: () => false,
          error: (_, __) => false,
        ))
          const SyncPendingIndicator(),
        // ... rest of widget
      ],
    );
  }
}
```

## Key Concepts

### Preloading

Call `preloadForToday()` when the app starts or when connectivity is restored:

```dart
final syncManager = ref.read(syncManagerProvider);
final result = await syncManager.preloadForToday(learnerId);
```

### Recording Events

Events are automatically queued for sync:

```dart
await syncManager.recordEvent(
  localSessionId,
  LearnerEvent(
    type: LearnerEventType.answerEvent,
    payload: {'questionId': 'q1', 'answer': 'A'},
  ),
);
```

### Manual Sync

Force a sync attempt:

```dart
final result = await syncManager.syncNow();
print('Synced ${result.eventsSynced} events');
```

## Testing

Run the sync manager tests:

```bash
cd libs/flutter-common
flutter test test/sync_manager_test.dart
```

## Dependencies

- `drift` - SQLite ORM
- `connectivity_plus` - Network connectivity detection
- `rxdart` - Reactive streams
- `uuid` - UUID generation
- `flutter_secure_storage` - Secure token storage
