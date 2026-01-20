import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';
import 'package:local_auth/error_codes.dart' as auth_error;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Biometric authentication service for AIVO mobile apps.
///
/// Provides secure biometric authentication for:
/// - Quick unlock (Face ID, Touch ID, fingerprint)
/// - Secure credential storage
/// - Fallback to PIN/password
///
/// Addresses P1 Issue: Biometric authentication not implemented
///
/// Usage:
/// ```dart
/// final biometricService = ref.watch(biometricServiceProvider);
///
/// // Check if biometrics are available
/// if (await biometricService.canUseBiometrics) {
///   // Enable biometric login
///   await biometricService.enableBiometricLogin();
/// }
///
/// // Authenticate with biometrics
/// final result = await biometricService.authenticate(
///   reason: 'Sign in to Aivo',
/// );
/// ```

/// Result of a biometric authentication attempt
class BiometricAuthResult {
  const BiometricAuthResult({
    required this.success,
    this.errorCode,
    this.errorMessage,
  });

  /// Whether authentication was successful
  final bool success;

  /// Error code if authentication failed
  final BiometricErrorCode? errorCode;

  /// Human-readable error message
  final String? errorMessage;

  /// Create a successful result
  const BiometricAuthResult.success()
      : success = true,
        errorCode = null,
        errorMessage = null;

  /// Create a failed result
  factory BiometricAuthResult.failure({
    required BiometricErrorCode code,
    String? message,
  }) {
    return BiometricAuthResult(
      success: false,
      errorCode: code,
      errorMessage: message,
    );
  }
}

/// Error codes for biometric authentication
enum BiometricErrorCode {
  /// Biometrics not available on this device
  notAvailable,

  /// Biometrics not enrolled on this device
  notEnrolled,

  /// User cancelled authentication
  userCancelled,

  /// Too many failed attempts, locked out
  lockedOut,

  /// Permanent lockout, requires device passcode
  permanentlyLockedOut,

  /// Passcode/PIN not set on device
  passcodeNotSet,

  /// Unknown error
  unknown,
}

/// Available biometric types
enum BiometricType {
  /// Face ID (iOS) or face recognition
  face,

  /// Touch ID (iOS) or fingerprint
  fingerprint,

  /// Iris scanner
  iris,

  /// Device credential (PIN/pattern/password)
  deviceCredential,
}

/// Service for managing biometric authentication
class BiometricService {
  BiometricService({
    LocalAuthentication? localAuth,
    FlutterSecureStorage? secureStorage,
  })  : _localAuth = localAuth ?? LocalAuthentication(),
        _secureStorage = secureStorage ?? const FlutterSecureStorage();

  final LocalAuthentication _localAuth;
  final FlutterSecureStorage _secureStorage;

  // Secure storage keys
  static const _keyBiometricEnabled = 'biometric_enabled';
  static const _keyRefreshToken = 'biometric_refresh_token';
  static const _keyUserId = 'biometric_user_id';

  // ============================================================================
  // CAPABILITY CHECKS
  // ============================================================================

  /// Check if the device supports biometric authentication
  Future<bool> get isDeviceSupported async {
    try {
      return await _localAuth.isDeviceSupported();
    } catch (e) {
      debugPrint('[BiometricService] Error checking device support: $e');
      return false;
    }
  }

  /// Check if biometrics can be used (supported and enrolled)
  Future<bool> get canUseBiometrics async {
    try {
      final supported = await _localAuth.isDeviceSupported();
      if (!supported) return false;

      final canCheck = await _localAuth.canCheckBiometrics;
      return canCheck;
    } catch (e) {
      debugPrint('[BiometricService] Error checking biometrics: $e');
      return false;
    }
  }

  /// Get available biometric types on this device
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      final available = await _localAuth.getAvailableBiometrics();
      return available.map(_mapBiometricType).toList();
    } catch (e) {
      debugPrint('[BiometricService] Error getting biometrics: $e');
      return [];
    }
  }

  BiometricType _mapBiometricType(BiometricType_ type) {
    switch (type) {
      case BiometricType_.face:
        return BiometricType.face;
      case BiometricType_.fingerprint:
        return BiometricType.fingerprint;
      case BiometricType_.iris:
        return BiometricType.iris;
      default:
        return BiometricType.deviceCredential;
    }
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /// Authenticate the user using biometrics
  ///
  /// Parameters:
  /// - [reason]: The message shown to the user explaining why authentication is needed
  /// - [useErrorDialogs]: Whether to show platform error dialogs
  /// - [stickyAuth]: Keep authentication valid across app backgrounding (iOS)
  /// - [sensitiveTransaction]: Mark this as a sensitive transaction
  /// - [biometricOnly]: Only allow biometrics, not device credentials
  Future<BiometricAuthResult> authenticate({
    required String reason,
    bool useErrorDialogs = true,
    bool stickyAuth = true,
    bool sensitiveTransaction = false,
    bool biometricOnly = false,
  }) async {
    try {
      // Check if biometrics are available
      final canUse = await canUseBiometrics;
      if (!canUse) {
        return BiometricAuthResult.failure(
          code: BiometricErrorCode.notAvailable,
          message: 'Biometric authentication is not available on this device',
        );
      }

      final authenticated = await _localAuth.authenticate(
        localizedReason: reason,
        options: AuthenticationOptions(
          useErrorDialogs: useErrorDialogs,
          stickyAuth: stickyAuth,
          sensitiveTransaction: sensitiveTransaction,
          biometricOnly: biometricOnly,
        ),
      );

      if (authenticated) {
        return const BiometricAuthResult.success();
      } else {
        return BiometricAuthResult.failure(
          code: BiometricErrorCode.userCancelled,
          message: 'Authentication was cancelled',
        );
      }
    } on PlatformException catch (e) {
      return _handlePlatformException(e);
    } catch (e) {
      debugPrint('[BiometricService] Authentication error: $e');
      return BiometricAuthResult.failure(
        code: BiometricErrorCode.unknown,
        message: 'An unexpected error occurred',
      );
    }
  }

  BiometricAuthResult _handlePlatformException(PlatformException e) {
    switch (e.code) {
      case auth_error.notEnrolled:
        return BiometricAuthResult.failure(
          code: BiometricErrorCode.notEnrolled,
          message: 'No biometrics enrolled. Please set up Face ID or fingerprint in device settings.',
        );
      case auth_error.lockedOut:
        return BiometricAuthResult.failure(
          code: BiometricErrorCode.lockedOut,
          message: 'Too many attempts. Please try again later.',
        );
      case auth_error.permanentlyLockedOut:
        return BiometricAuthResult.failure(
          code: BiometricErrorCode.permanentlyLockedOut,
          message: 'Biometrics are locked. Please use your device passcode.',
        );
      case auth_error.passcodeNotSet:
        return BiometricAuthResult.failure(
          code: BiometricErrorCode.passcodeNotSet,
          message: 'Please set up a device passcode in settings.',
        );
      case auth_error.notAvailable:
        return BiometricAuthResult.failure(
          code: BiometricErrorCode.notAvailable,
          message: 'Biometric authentication is not available.',
        );
      default:
        return BiometricAuthResult.failure(
          code: BiometricErrorCode.unknown,
          message: e.message ?? 'Authentication failed',
        );
    }
  }

  // ============================================================================
  // CREDENTIAL STORAGE
  // ============================================================================

  /// Check if biometric login is enabled for the current user
  Future<bool> get isBiometricLoginEnabled async {
    try {
      final enabled = await _secureStorage.read(key: _keyBiometricEnabled);
      return enabled == 'true';
    } catch (e) {
      debugPrint('[BiometricService] Error reading biometric status: $e');
      return false;
    }
  }

  /// Enable biometric login and store credentials securely
  ///
  /// This stores the refresh token securely so the user can sign in
  /// without entering credentials.
  Future<bool> enableBiometricLogin({
    required String userId,
    required String refreshToken,
  }) async {
    try {
      // First authenticate to confirm identity
      final authResult = await authenticate(
        reason: 'Enable biometric sign-in',
        sensitiveTransaction: true,
      );

      if (!authResult.success) {
        return false;
      }

      // Store credentials securely
      await _secureStorage.write(key: _keyBiometricEnabled, value: 'true');
      await _secureStorage.write(key: _keyUserId, value: userId);
      await _secureStorage.write(key: _keyRefreshToken, value: refreshToken);

      debugPrint('[BiometricService] Biometric login enabled for user $userId');
      return true;
    } catch (e) {
      debugPrint('[BiometricService] Error enabling biometric login: $e');
      return false;
    }
  }

  /// Disable biometric login and clear stored credentials
  Future<void> disableBiometricLogin() async {
    try {
      await _secureStorage.delete(key: _keyBiometricEnabled);
      await _secureStorage.delete(key: _keyUserId);
      await _secureStorage.delete(key: _keyRefreshToken);

      debugPrint('[BiometricService] Biometric login disabled');
    } catch (e) {
      debugPrint('[BiometricService] Error disabling biometric login: $e');
    }
  }

  /// Get stored user ID for biometric login
  Future<String?> getStoredUserId() async {
    try {
      return await _secureStorage.read(key: _keyUserId);
    } catch (e) {
      debugPrint('[BiometricService] Error reading user ID: $e');
      return null;
    }
  }

  /// Get stored refresh token for biometric login
  ///
  /// Only call this after successful biometric authentication!
  Future<String?> getStoredRefreshToken() async {
    try {
      return await _secureStorage.read(key: _keyRefreshToken);
    } catch (e) {
      debugPrint('[BiometricService] Error reading refresh token: $e');
      return null;
    }
  }

  /// Update the stored refresh token (after token refresh)
  Future<void> updateStoredRefreshToken(String newToken) async {
    try {
      final enabled = await isBiometricLoginEnabled;
      if (enabled) {
        await _secureStorage.write(key: _keyRefreshToken, value: newToken);
      }
    } catch (e) {
      debugPrint('[BiometricService] Error updating refresh token: $e');
    }
  }

  /// Sign in using biometrics
  ///
  /// Returns the stored refresh token if authentication succeeds,
  /// or null if authentication fails or credentials are not stored.
  Future<BiometricSignInResult> signInWithBiometrics({
    String? reason,
  }) async {
    // Check if biometric login is enabled
    final enabled = await isBiometricLoginEnabled;
    if (!enabled) {
      return BiometricSignInResult.notEnabled();
    }

    // Authenticate with biometrics
    final authResult = await authenticate(
      reason: reason ?? 'Sign in to Aivo',
    );

    if (!authResult.success) {
      return BiometricSignInResult.authFailed(authResult);
    }

    // Get stored credentials
    final userId = await getStoredUserId();
    final refreshToken = await getStoredRefreshToken();

    if (userId == null || refreshToken == null) {
      // Credentials corrupted, disable biometric login
      await disableBiometricLogin();
      return BiometricSignInResult.credentialsNotFound();
    }

    return BiometricSignInResult.success(
      userId: userId,
      refreshToken: refreshToken,
    );
  }
}

/// Result of biometric sign-in attempt
class BiometricSignInResult {
  const BiometricSignInResult({
    required this.status,
    this.userId,
    this.refreshToken,
    this.authResult,
  });

  final BiometricSignInStatus status;
  final String? userId;
  final String? refreshToken;
  final BiometricAuthResult? authResult;

  bool get isSuccess => status == BiometricSignInStatus.success;

  factory BiometricSignInResult.success({
    required String userId,
    required String refreshToken,
  }) {
    return BiometricSignInResult(
      status: BiometricSignInStatus.success,
      userId: userId,
      refreshToken: refreshToken,
    );
  }

  factory BiometricSignInResult.notEnabled() {
    return const BiometricSignInResult(
      status: BiometricSignInStatus.notEnabled,
    );
  }

  factory BiometricSignInResult.authFailed(BiometricAuthResult result) {
    return BiometricSignInResult(
      status: BiometricSignInStatus.authFailed,
      authResult: result,
    );
  }

  factory BiometricSignInResult.credentialsNotFound() {
    return const BiometricSignInResult(
      status: BiometricSignInStatus.credentialsNotFound,
    );
  }
}

/// Status of biometric sign-in
enum BiometricSignInStatus {
  success,
  notEnabled,
  authFailed,
  credentialsNotFound,
}

// ============================================================================
// PROVIDERS
// ============================================================================

/// Provider for the biometric service
final biometricServiceProvider = Provider<BiometricService>((ref) {
  return BiometricService();
});

/// Provider to check if biometrics are available
final canUseBiometricsProvider = FutureProvider<bool>((ref) async {
  final service = ref.watch(biometricServiceProvider);
  return service.canUseBiometrics;
});

/// Provider to check if biometric login is enabled
final isBiometricLoginEnabledProvider = FutureProvider<bool>((ref) async {
  final service = ref.watch(biometricServiceProvider);
  return service.isBiometricLoginEnabled;
});

/// Provider to get available biometric types
final availableBiometricsProvider = FutureProvider<List<BiometricType>>((ref) async {
  final service = ref.watch(biometricServiceProvider);
  return service.getAvailableBiometrics();
});
