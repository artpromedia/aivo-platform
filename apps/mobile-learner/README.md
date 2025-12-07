# Mobile Learner

Flutter app for learners with PIN-based auth.

## Running with real PIN validation

```bash
flutter run \
	--dart-define=AUTH_BASE_URL=http://localhost:4001 \
	--dart-define=USE_AUTH_MOCK=false
```

- `PinEntryScreen` calls `/auth/pin-login` (or future learner endpoint) via `dio`.
- Session token is stored in `flutter_secure_storage`; routes are protected with Riverpod + `go_router`.

## Mock mode

```bash
flutter run --dart-define=USE_AUTH_MOCK=true
```

This issues unsigned mock tokens so the flow works without a backend.
