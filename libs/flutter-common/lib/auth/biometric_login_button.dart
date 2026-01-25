/// Biometric Login Button Widget
///
/// A reusable button component for biometric authentication that can be
/// integrated into any login screen. Handles checking availability,
/// displaying appropriate icon (Face ID/fingerprint), and performing auth.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'biometric_service.dart';

/// A button that allows users to sign in with biometrics (Face ID/Touch ID/fingerprint).
///
/// This widget automatically:
/// - Checks if biometrics are available and enabled
/// - Shows the appropriate icon based on available biometric type
/// - Handles the authentication flow
/// - Provides callbacks for success/failure
///
/// Usage:
/// ```dart
/// BiometricLoginButton(
///   onSuccess: (userId, refreshToken) {
///     // Sign in with the refresh token
///   },
///   onError: (message) {
///     // Show error to user
///   },
/// )
/// ```
class BiometricLoginButton extends ConsumerStatefulWidget {
  const BiometricLoginButton({
    super.key,
    required this.onSuccess,
    this.onError,
    this.reason,
    this.size = BiometricButtonSize.normal,
  });

  /// Called when biometric authentication succeeds
  final void Function(String userId, String refreshToken) onSuccess;

  /// Called when biometric authentication fails
  final void Function(String message)? onError;

  /// Custom reason text shown in the biometric prompt
  final String? reason;

  /// Size variant of the button
  final BiometricButtonSize size;

  @override
  ConsumerState<BiometricLoginButton> createState() => _BiometricLoginButtonState();
}

enum BiometricButtonSize {
  small,
  normal,
  large,
}

class _BiometricLoginButtonState extends ConsumerState<BiometricLoginButton> {
  bool _isAuthenticating = false;
  bool _isAvailable = false;
  bool _isEnabled = false;
  BiometricType? _primaryType;

  @override
  void initState() {
    super.initState();
    _checkBiometrics();
  }

  Future<void> _checkBiometrics() async {
    final service = ref.read(biometricServiceProvider);
    
    final canUse = await service.canUseBiometrics;
    final isEnabled = await service.isBiometricLoginEnabled;
    final types = await service.getAvailableBiometrics();

    if (mounted) {
      setState(() {
        _isAvailable = canUse;
        _isEnabled = isEnabled;
        _primaryType = types.isNotEmpty ? types.first : null;
      });
    }
  }

  Future<void> _authenticate() async {
    if (_isAuthenticating) return;

    setState(() => _isAuthenticating = true);

    try {
      final service = ref.read(biometricServiceProvider);
      final result = await service.signInWithBiometrics(
        reason: widget.reason ?? 'Sign in to Aivo',
      );

      if (!mounted) return;

      if (result.isSuccess && result.userId != null && result.refreshToken != null) {
        widget.onSuccess(result.userId!, result.refreshToken!);
      } else {
        final message = _getErrorMessage(result.status, result.authResult);
        widget.onError?.call(message);
      }
    } catch (e) {
      widget.onError?.call('Authentication failed. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _isAuthenticating = false);
      }
    }
  }

  String _getErrorMessage(BiometricSignInStatus status, BiometricAuthResult? authResult) {
    switch (status) {
      case BiometricSignInStatus.notEnabled:
        return 'Biometric sign-in is not enabled. Please sign in with your credentials first.';
      case BiometricSignInStatus.credentialsNotFound:
        return 'Stored credentials not found. Please sign in with your credentials.';
      case BiometricSignInStatus.authFailed:
        return authResult?.errorMessage ?? 'Authentication failed';
      case BiometricSignInStatus.success:
        return ''; // Should not happen
    }
  }

  @override
  Widget build(BuildContext context) {
    // Don't show if biometrics not available or not enabled
    if (!_isAvailable || !_isEnabled) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final icon = _getBiometricIcon();
    final label = _getBiometricLabel();

    switch (widget.size) {
      case BiometricButtonSize.small:
        return IconButton(
          onPressed: _isAuthenticating ? null : _authenticate,
          icon: _isAuthenticating
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Icon(icon, color: colorScheme.primary),
          tooltip: label,
        );

      case BiometricButtonSize.normal:
        return OutlinedButton.icon(
          onPressed: _isAuthenticating ? null : _authenticate,
          icon: _isAuthenticating
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Icon(icon),
          label: Text(label),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );

      case BiometricButtonSize.large:
        return SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: _isAuthenticating ? null : _authenticate,
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 20),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _isAuthenticating
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(icon, size: 48),
                      const SizedBox(height: 8),
                      Text(label),
                    ],
                  ),
          ),
        );
    }
  }

  IconData _getBiometricIcon() {
    switch (_primaryType) {
      case BiometricType.face:
        return Icons.face;
      case BiometricType.fingerprint:
        return Icons.fingerprint;
      case BiometricType.iris:
        return Icons.remove_red_eye;
      case BiometricType.deviceCredential:
      case null:
        return Icons.lock;
    }
  }

  String _getBiometricLabel() {
    switch (_primaryType) {
      case BiometricType.face:
        return 'Sign in with Face ID';
      case BiometricType.fingerprint:
        return 'Sign in with Fingerprint';
      case BiometricType.iris:
        return 'Sign in with Iris';
      case BiometricType.deviceCredential:
      case null:
        return 'Sign in with Biometrics';
    }
  }
}

/// Widget to enable/disable biometric login in settings
class BiometricSettingsToggle extends ConsumerStatefulWidget {
  const BiometricSettingsToggle({
    super.key,
    required this.userId,
    required this.refreshToken,
    this.onChanged,
  });

  /// Current user ID (needed to store for biometric login)
  final String userId;

  /// Current refresh token (needed to store for biometric login)
  final String refreshToken;

  /// Called when the setting changes
  final void Function(bool enabled)? onChanged;

  @override
  ConsumerState<BiometricSettingsToggle> createState() => _BiometricSettingsToggleState();
}

class _BiometricSettingsToggleState extends ConsumerState<BiometricSettingsToggle> {
  bool _isAvailable = false;
  bool _isEnabled = false;
  bool _isLoading = true;
  BiometricType? _primaryType;

  @override
  void initState() {
    super.initState();
    _loadState();
  }

  Future<void> _loadState() async {
    final service = ref.read(biometricServiceProvider);
    
    final canUse = await service.canUseBiometrics;
    final isEnabled = await service.isBiometricLoginEnabled;
    final types = await service.getAvailableBiometrics();

    if (mounted) {
      setState(() {
        _isAvailable = canUse;
        _isEnabled = isEnabled;
        _primaryType = types.isNotEmpty ? types.first : null;
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleBiometrics(bool enable) async {
    final service = ref.read(biometricServiceProvider);

    if (enable) {
      final success = await service.enableBiometricLogin(
        userId: widget.userId,
        refreshToken: widget.refreshToken,
      );

      if (mounted) {
        setState(() => _isEnabled = success);
        widget.onChanged?.call(success);
        
        if (!success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to enable biometric login')),
          );
        }
      }
    } else {
      await service.disableBiometricLogin();
      
      if (mounted) {
        setState(() => _isEnabled = false);
        widget.onChanged?.call(false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_isAvailable) {
      return ListTile(
        leading: const Icon(Icons.fingerprint),
        title: const Text('Biometric Sign-In'),
        subtitle: const Text('Not available on this device'),
        enabled: false,
        trailing: Switch(
          value: false,
          onChanged: null,
        ),
      );
    }

    final biometricName = _getBiometricName();

    return ListTile(
      leading: Icon(_getBiometricIcon()),
      title: Text('Sign in with $biometricName'),
      subtitle: Text(_isEnabled 
          ? 'Enabled - use $biometricName to sign in quickly'
          : 'Enable fast sign-in with $biometricName'),
      trailing: _isLoading
          ? const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Switch(
              value: _isEnabled,
              onChanged: _toggleBiometrics,
            ),
    );
  }

  String _getBiometricName() {
    switch (_primaryType) {
      case BiometricType.face:
        return 'Face ID';
      case BiometricType.fingerprint:
        return 'Fingerprint';
      case BiometricType.iris:
        return 'Iris';
      case BiometricType.deviceCredential:
      case null:
        return 'Biometrics';
    }
  }

  IconData _getBiometricIcon() {
    switch (_primaryType) {
      case BiometricType.face:
        return Icons.face;
      case BiometricType.fingerprint:
        return Icons.fingerprint;
      case BiometricType.iris:
        return Icons.remove_red_eye;
      case BiometricType.deviceCredential:
      case null:
        return Icons.lock;
    }
  }
}
