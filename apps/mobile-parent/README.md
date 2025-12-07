# Mobile Parent

Flutter app targeting parents with real auth wired to `auth-svc`.

## Running with real auth

```bash
flutter run \
	--dart-define=AUTH_BASE_URL=http://localhost:4001 \
	--dart-define=USE_AUTH_MOCK=false
```

- Uses `dio` for `/auth/login` and stores access/refresh tokens in `flutter_secure_storage`.
- Tokens are decoded client-side for `userId`, `tenantId`, and `roles`.
- Routing is protected via Riverpod + `go_router`; unauthenticated users see `/login`.

## Mock mode (no backend)

```bash
flutter run --dart-define=USE_AUTH_MOCK=true
```

This issues locally generated unsigned JWTs for quick UI work. Disable when pointing at a real backend.
