/// SSO (Single Sign-On) Service for Flutter
///
/// Handles SSO authentication flows for mobile apps using browser-based
/// authentication (ASWebAuthenticationSession on iOS, Custom Tabs on Android).
///
/// Features:
/// - Tenant-based SSO initiation
/// - Deep link callback handling
/// - Secure token storage
/// - Session management
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:url_launcher/url_launcher.dart';

/// SSO configuration for connecting to the auth service.
class SsoConfig {
  /// Base URL of the auth service.
  final String authServiceUrl;

  /// Deep link scheme for callback (e.g., "aivo").
  final String deepLinkScheme;

  /// Deep link host for callback (e.g., "auth").
  final String deepLinkHost;

  /// Path for the callback (e.g., "/callback").
  final String deepLinkPath;

  const SsoConfig({
    required this.authServiceUrl,
    this.deepLinkScheme = 'aivo',
    this.deepLinkHost = 'auth',
    this.deepLinkPath = '/callback',
  });

  /// The full deep link URI for SSO callback.
  String get callbackUri =>
      '$deepLinkScheme://$deepLinkHost$deepLinkPath';
}

/// Result of an SSO authentication attempt.
sealed class SsoResult {}

/// Successful SSO authentication.
class SsoSuccess extends SsoResult {
  final String accessToken;
  final String refreshToken;
  final SsoUser user;

  SsoSuccess({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });
}

/// SSO authentication error.
class SsoError extends SsoResult {
  final String code;
  final String message;

  SsoError({required this.code, required this.message});

  @override
  String toString() => 'SsoError($code): $message';
}

/// SSO authentication cancelled by user.
class SsoCancelled extends SsoResult {}

/// User information from SSO.
class SsoUser {
  final String id;
  final String email;
  final String tenantId;
  final List<String> roles;

  SsoUser({
    required this.id,
    required this.email,
    required this.tenantId,
    required this.roles,
  });

  factory SsoUser.fromJson(Map<String, dynamic> json) {
    return SsoUser(
      id: json['id'] as String,
      email: json['email'] as String,
      tenantId: json['tenantId'] as String,
      roles: (json['roles'] as List).cast<String>(),
    );
  }
}

/// SSO authentication service.
///
/// Handles the complete SSO flow including:
/// 1. Launching browser for IdP authentication
/// 2. Receiving callback via deep link
/// 3. Storing tokens securely
/// 4. Managing SSO session
class SsoService {
  final SsoConfig config;
  final FlutterSecureStorage _secureStorage;

  /// Stream controller for SSO callbacks (from deep links).
  final StreamController<Uri> _callbackController =
      StreamController<Uri>.broadcast();

  /// Completer for pending SSO operations.
  Completer<SsoResult>? _pendingAuth;

  SsoService({
    required this.config,
    FlutterSecureStorage? secureStorage,
  }) : _secureStorage = secureStorage ?? const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
          iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
        );

  // ============================================================================
  // SSO FLOW
  // ============================================================================

  /// Initiate SSO flow for a tenant.
  ///
  /// Opens the browser/in-app browser for IdP authentication.
  /// Returns the result when the callback is received.
  Future<SsoResult> signInWithSso({
    required String tenantSlug,
    String? protocol, // 'SAML' or 'OIDC'
    String? loginHint,
  }) async {
    // Check if there's already a pending auth
    if (_pendingAuth != null && !_pendingAuth!.isCompleted) {
      return SsoError(
        code: 'SSO_IN_PROGRESS',
        message: 'An SSO operation is already in progress',
      );
    }

    _pendingAuth = Completer<SsoResult>();

    try {
      // Build SSO URL
      final ssoUrl = _buildSsoUrl(
        tenantSlug: tenantSlug,
        protocol: protocol,
        loginHint: loginHint,
      );

      // Launch browser
      final uri = Uri.parse(ssoUrl);
      final canLaunch = await canLaunchUrl(uri);

      if (!canLaunch) {
        return SsoError(
          code: 'BROWSER_UNAVAILABLE',
          message: 'Unable to open browser for SSO',
        );
      }

      await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );

      // Wait for callback (with timeout)
      final result = await _pendingAuth!.future.timeout(
        const Duration(minutes: 5),
        onTimeout: () => SsoError(
          code: 'SSO_TIMEOUT',
          message: 'SSO authentication timed out',
        ),
      );

      return result;
    } catch (e) {
      return SsoError(
        code: 'SSO_ERROR',
        message: e.toString(),
      );
    } finally {
      _pendingAuth = null;
    }
  }

  /// Handle deep link callback from SSO.
  ///
  /// Call this method when the app receives a deep link matching the SSO callback.
  Future<void> handleCallback(Uri uri) async {
    // Check if this is an SSO callback
    if (uri.scheme != config.deepLinkScheme ||
        uri.host != config.deepLinkHost) {
      return;
    }

    // Notify stream listeners
    _callbackController.add(uri);

    // Complete pending auth if any
    if (_pendingAuth == null || _pendingAuth!.isCompleted) {
      return;
    }

    // Parse callback
    final result = await _parseCallback(uri);
    _pendingAuth!.complete(result);
  }

  /// Stream of SSO callbacks (for apps that want to handle callbacks manually).
  Stream<Uri> get callbacks => _callbackController.stream;

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  /// Store tokens securely after successful SSO.
  Future<void> storeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _secureStorage.write(key: _accessTokenKey, value: accessToken),
      _secureStorage.write(key: _refreshTokenKey, value: refreshToken),
    ]);
  }

  /// Get the stored access token.
  Future<String?> getAccessToken() async {
    return _secureStorage.read(key: _accessTokenKey);
  }

  /// Get the stored refresh token.
  Future<String?> getRefreshToken() async {
    return _secureStorage.read(key: _refreshTokenKey);
  }

  /// Clear stored tokens (logout).
  Future<void> clearTokens() async {
    await Future.wait([
      _secureStorage.delete(key: _accessTokenKey),
      _secureStorage.delete(key: _refreshTokenKey),
    ]);
  }

  /// Check if the user is authenticated.
  Future<bool> isAuthenticated() async {
    final token = await getAccessToken();
    if (token == null) return false;

    // Check if token is expired
    try {
      final payload = _decodeJwtPayload(token);
      final exp = payload['exp'] as int?;
      if (exp == null) return false;

      final expiry = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
      return DateTime.now().isBefore(expiry);
    } catch (_) {
      return false;
    }
  }

  // ============================================================================
  // TENANT DISCOVERY
  // ============================================================================

  /// Check if SSO is available for a tenant.
  Future<TenantSsoInfo?> getTenantSsoInfo(String tenantSlug) async {
    try {
      final uri = Uri.parse(
        '${config.authServiceUrl}/auth/sso/info/$tenantSlug',
      );

      final client = HttpClient();
      final request = await client.getUrl(uri);
      final response = await request.close();

      if (response.statusCode != 200) {
        return null;
      }

      final body = await response.transform(utf8.decoder).join();
      final json = jsonDecode(body) as Map<String, dynamic>;

      return TenantSsoInfo.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  String _buildSsoUrl({
    required String tenantSlug,
    String? protocol,
    String? loginHint,
  }) {
    final params = <String, String>{
      'client_type': 'mobile',
      'redirect_uri': config.callbackUri,
    };

    if (protocol != null) {
      params['protocol'] = protocol;
    }

    if (loginHint != null) {
      params['login_hint'] = loginHint;
    }

    final uri = Uri.parse(
      '${config.authServiceUrl}/auth/sso/$tenantSlug',
    ).replace(queryParameters: params);

    return uri.toString();
  }

  Future<SsoResult> _parseCallback(Uri uri) async {
    final params = uri.queryParameters;

    // Check for error
    if (params.containsKey('error')) {
      return SsoError(
        code: params['error'] ?? 'UNKNOWN_ERROR',
        message: params['message'] ?? 'Authentication failed',
      );
    }

    // Check for tokens
    final accessToken = params['access_token'];
    final refreshToken = params['refresh_token'];

    if (accessToken == null || refreshToken == null) {
      return SsoError(
        code: 'MISSING_TOKENS',
        message: 'No tokens received from SSO callback',
      );
    }

    // Store tokens
    await storeTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );

    // Parse user from token
    try {
      final payload = _decodeJwtPayload(accessToken);
      final user = SsoUser(
        id: payload['sub'] as String,
        email: '', // Not in token, fetch from userinfo
        tenantId: payload['tenant_id'] as String,
        roles: (payload['roles'] as List).cast<String>(),
      );

      return SsoSuccess(
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: user,
      );
    } catch (e) {
      return SsoError(
        code: 'TOKEN_PARSE_ERROR',
        message: 'Failed to parse authentication token',
      );
    }
  }

  Map<String, dynamic> _decodeJwtPayload(String token) {
    final parts = token.split('.');
    if (parts.length != 3) {
      throw FormatException('Invalid JWT token');
    }

    final payload = parts[1];
    final normalized = base64Url.normalize(payload);
    final decoded = utf8.decode(base64Url.decode(normalized));

    return jsonDecode(decoded) as Map<String, dynamic>;
  }

  // Storage keys
  static const _accessTokenKey = 'aivo_access_token';
  static const _refreshTokenKey = 'aivo_refresh_token';

  /// Dispose resources.
  void dispose() {
    _callbackController.close();
  }
}

/// Information about SSO configuration for a tenant.
class TenantSsoInfo {
  final bool ssoEnabled;
  final bool ssoRequired;
  final List<String> availableProtocols;
  final String? idpName;

  TenantSsoInfo({
    required this.ssoEnabled,
    required this.ssoRequired,
    required this.availableProtocols,
    this.idpName,
  });

  factory TenantSsoInfo.fromJson(Map<String, dynamic> json) {
    return TenantSsoInfo(
      ssoEnabled: json['ssoEnabled'] as bool,
      ssoRequired: json['ssoRequired'] as bool,
      availableProtocols: (json['protocols'] as List).cast<String>(),
      idpName: json['idpName'] as String?,
    );
  }
}
