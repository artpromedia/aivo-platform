/// Shared device / kiosk mode support for classroom devices.
///
/// This library provides functionality for shared iPad/Chromebook deployments
/// where multiple learners use the same device throughout the day.
///
/// Key features:
/// - Class code entry for device-classroom association
/// - Roster selection (tap your name)
/// - Per-learner PIN authentication
/// - Session isolation and data separation
/// - Teacher-controlled flows
///
/// Usage:
/// ```dart
/// import 'package:flutter_common/shared_device/shared_device.dart';
///
/// final service = SharedDeviceService(
///   baseUrl: apiUrl,
///   tenantId: tenantId,
///   deviceService: deviceService,
/// );
///
/// if (service.isSharedMode) {
///   // Show class code entry → roster → PIN flow
///   final roster = await service.validateClassCode('ABC123');
///   await service.startSession(learnerId, pin);
/// }
/// ```
library;

export 'shared_device_models.dart';
export 'shared_device_service.dart';
