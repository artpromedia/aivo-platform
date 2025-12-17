/// Token Manager Service
///
/// Manages JWT token storage, validation, and refresh operations.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Token pair containing access and refresh tokens.
class TokenPair {
  const TokenPair({
    required this.accessToken,
    required this.refreshToken,
    this.expiresAt,
  });

  final String accessToken;
  final String refreshToken;
  final DateTime? expiresAt;

  factory TokenPair.fromJson(Map<String, dynamic> json) {
    return TokenPair(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'accessToken': accessToken,
        'refreshToken': refreshToken,
        if (expiresAt != null) 'expiresAt': expiresAt!.toIso8601String(),
      };
}

/// Decoded JWT claims.
class JwtClaims {
  const JwtClaims({
    required this.sub,
    required this.exp,
    this.tenantId,
    this.email,
    this.roles = const [],
    this.iat,
    this.iss,
    this.rawClaims = const {},
  });

  final String sub;
  final DateTime exp;
  final String? tenantId;
  final String? email;
  final List<String> roles;
  final DateTime? iat;
  final String? iss;
  final Map<String, dynamic> rawClaims;

  /// Whether the token is expired.
  bool get isExpired => DateTime.now().isAfter(exp);

  /// Whether the token will expire within the given duration.
  bool willExpireIn(Duration duration) {
    return DateTime.now().add(duration).isAfter(exp);
  }

  factory JwtClaims.fromToken(String token) {
    try {
      final Map<String, dynamic> payload = _decodeJwt(token);
      
      return JwtClaims(
        sub: payload['sub'] as String? ?? '',
        exp: DateTime.fromMillisecondsSinceEpoch(
          (payload['exp'] as int) * 1000,
        ),
        tenantId: payload['tenantId'] as String?,
        email: payload['email'] as String?,
        roles: (payload['roles'] as List<dynamic>?)?.cast<String>() ?? [],
        iat: payload['iat'] != null
            ? DateTime.fromMillisecondsSinceEpoch(
                (payload['iat'] as int) * 1000,
              )
            : null,
        iss: payload['iss'] as String?,
        rawClaims: payload,
      );
    } catch (e) {
      throw TokenDecodeException('Failed to decode JWT: $e');
    }
  }
}

/// Decode JWT token manually (no external dependency).
Map<String, dynamic> _decodeJwt(String token) {
  final parts = token.split('.');
  if (parts.length != 3) {
    throw FormatException('Invalid JWT token format');
  }
  
  final payload = parts[1];
  final normalized = base64Url.normalize(payload);
  final decoded = utf8.decode(base64Url.decode(normalized));
  
  return jsonDecode(decoded) as Map<String, dynamic>;
}

/// Exception thrown when token decoding fails.
class TokenDecodeException implements Exception {
  const TokenDecodeException(this.message);
  final String message;

  @override
  String toString() => 'TokenDecodeException: $message';
}

/// Storage keys for tokens.
abstract class TokenStorageKeys {
  static const String accessToken = 'aivo_access_token';
  static const String refreshToken = 'aivo_refresh_token';
  static const String tokenExpiry = 'aivo_token_expiry';
}

/// Token manager for secure token storage and validation.
class TokenManager {
  TokenManager({
    FlutterSecureStorage? storage,
    this.refreshThreshold = const Duration(minutes: 5),
  }) : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions:
                  IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  final FlutterSecureStorage _storage;
  
  /// Duration before expiry when refresh should be triggered.
  final Duration refreshThreshold;

  JwtClaims? _cachedClaims;
  String? _cachedAccessToken;

  /// Save token pair to secure storage.
  Future<void> saveTokens(TokenPair tokens) async {
    await Future.wait([
      _storage.write(key: TokenStorageKeys.accessToken, value: tokens.accessToken),
      _storage.write(key: TokenStorageKeys.refreshToken, value: tokens.refreshToken),
    ]);
    _cachedAccessToken = tokens.accessToken;
    _cachedClaims = null; // Clear cached claims to force re-decode
  }

  /// Get the current access token.
  Future<String?> getAccessToken() async {
    if (_cachedAccessToken != null) {
      // Validate cache is still valid
      final claims = getCachedClaims();
      if (claims != null && !claims.isExpired) {
        return _cachedAccessToken;
      }
    }
    
    _cachedAccessToken = await _storage.read(key: TokenStorageKeys.accessToken);
    return _cachedAccessToken;
  }

  /// Get the refresh token.
  Future<String?> getRefreshToken() async {
    return _storage.read(key: TokenStorageKeys.refreshToken);
  }

  /// Check if user has a valid (non-expired) access token.
  Future<bool> hasValidToken() async {
    final token = await getAccessToken();
    if (token == null) return false;

    try {
      final claims = JwtClaims.fromToken(token);
      return !claims.isExpired;
    } catch (e) {
      return false;
    }
  }

  /// Check if refresh is needed (token expires soon).
  Future<bool> needsRefresh() async {
    final token = await getAccessToken();
    if (token == null) return false;

    try {
      final claims = JwtClaims.fromToken(token);
      return claims.willExpireIn(refreshThreshold);
    } catch (e) {
      return true; // If we can't decode, try to refresh
    }
  }

  /// Get claims from current access token.
  Future<JwtClaims?> getClaims() async {
    final token = await getAccessToken();
    if (token == null) return null;

    try {
      _cachedClaims = JwtClaims.fromToken(token);
      return _cachedClaims;
    } catch (e) {
      return null;
    }
  }

  /// Get cached claims (synchronous).
  JwtClaims? getCachedClaims() {
    if (_cachedClaims != null) return _cachedClaims;
    
    if (_cachedAccessToken != null) {
      try {
        _cachedClaims = JwtClaims.fromToken(_cachedAccessToken!);
        return _cachedClaims;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /// Get user ID from token.
  Future<String?> getUserId() async {
    final claims = await getClaims();
    return claims?.sub;
  }

  /// Get tenant ID from token.
  Future<String?> getTenantId() async {
    final claims = await getClaims();
    return claims?.tenantId;
  }

  /// Clear all tokens.
  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: TokenStorageKeys.accessToken),
      _storage.delete(key: TokenStorageKeys.refreshToken),
      _storage.delete(key: TokenStorageKeys.tokenExpiry),
    ]);
    _cachedAccessToken = null;
    _cachedClaims = null;
  }

  /// Refresh the access token.
  /// Returns true if refresh was successful.
  /// Note: This requires an API client to be passed or uses a callback.
  Future<bool> refreshToken({
    required Future<TokenPair?> Function(String refreshToken) refreshCallback,
  }) async {
    final currentRefreshToken = await getRefreshToken();
    if (currentRefreshToken == null) return false;

    try {
      final newTokens = await refreshCallback(currentRefreshToken);
      if (newTokens != null) {
        await saveTokens(newTokens);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}
