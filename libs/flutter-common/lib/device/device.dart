/// Device management and policy enforcement for Aivo Flutter apps.
///
/// This library provides:
/// - Device registration with backend
/// - Periodic check-in (heartbeat)
/// - Policy enforcement (kiosk mode, grade bands, offline limits)
/// - Device identity management
///
/// See docs/device/device_management.md for architecture details.
library;

export 'device_service.dart';
export 'device_models.dart';
export 'policy_enforcer.dart';
