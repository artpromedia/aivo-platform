/// Authentication module for Flutter apps.
///
/// Provides SSO authentication services and UI components.
///
/// Features:
/// - Enterprise SSO (Clever, ClassLink, Google, Microsoft)
/// - Tenant-based discovery
/// - Secure token storage
/// - Deep link callback handling
/// - Biometric authentication (Face ID, Touch ID, fingerprint)
library;

export 'sso_service.dart';
export 'sso_login_screen.dart';
export 'sso_providers.dart';
export 'enterprise_sso_screen.dart';
export 'biometric_service.dart';
