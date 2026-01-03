import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Provider for the deep link handler
final deepLinkHandlerProvider = Provider<DeepLinkHandler>((ref) {
  return DeepLinkHandler();
});

/// Provider for pending deep link (set when app opens via deep link)
final pendingDeepLinkProvider = StateProvider<Uri?>((ref) => null);

/// Handler for deep links
///
/// Use this to:
/// - Parse incoming deep links
/// - Validate deep links
/// - Handle deferred deep links (after auth)
class DeepLinkHandler {
  /// Parse a deep link URI into route and parameters
  DeepLinkInfo? parseDeepLink(Uri uri) {
    try {
      // Handle custom schemes: aivo-learner://, aivo-parent://, aivo-teacher://
      if (uri.scheme.startsWith('aivo-')) {
        return DeepLinkInfo(
          path: uri.path.isEmpty ? '/' : uri.path,
          queryParameters: uri.queryParameters,
          source: DeepLinkSource.customScheme,
          originalUri: uri,
        );
      }

      // Handle universal links: https://app.aivo.com/...
      if (uri.scheme == 'https' && uri.host == 'app.aivo.com') {
        // Remove app prefix from path (/learner/..., /parent/..., /teacher/...)
        String path = uri.path;
        final prefixes = ['/learner', '/parent', '/teacher'];
        for (final prefix in prefixes) {
          if (path.startsWith(prefix)) {
            path = path.substring(prefix.length);
            if (path.isEmpty) path = '/';
            break;
          }
        }

        return DeepLinkInfo(
          path: path,
          queryParameters: uri.queryParameters,
          source: DeepLinkSource.universalLink,
          originalUri: uri,
        );
      }

      // Unknown scheme
      debugPrint('[DeepLink] Unknown deep link scheme: ${uri.scheme}');
      return null;
    } catch (e) {
      debugPrint('[DeepLink] Error parsing deep link: $e');
      return null;
    }
  }

  /// Validate if a deep link path is allowed
  ///
  /// Override in subclasses for app-specific validation
  bool isAllowedPath(String path, {bool isChildDevice = false}) {
    // Block certain paths for child devices (COPPA compliance)
    if (isChildDevice) {
      final blockedPaths = [
        '/settings',
        '/billing',
        '/subscription',
        '/payment',
        '/admin',
      ];

      for (final blocked in blockedPaths) {
        if (path.startsWith(blocked)) {
          return false;
        }
      }
    }

    return true;
  }

  /// Build a deep link URI
  Uri buildDeepLink({
    required String scheme,
    required String path,
    Map<String, String>? queryParameters,
  }) {
    return Uri(
      scheme: scheme,
      path: path,
      queryParameters: queryParameters?.isEmpty == true ? null : queryParameters,
    );
  }

  /// Build a universal link URI
  Uri buildUniversalLink({
    required String appPrefix,
    required String path,
    Map<String, String>? queryParameters,
  }) {
    return Uri(
      scheme: 'https',
      host: 'app.aivo.com',
      path: '$appPrefix$path',
      queryParameters: queryParameters?.isEmpty == true ? null : queryParameters,
    );
  }
}

/// Parsed deep link information
class DeepLinkInfo {
  const DeepLinkInfo({
    required this.path,
    required this.queryParameters,
    required this.source,
    required this.originalUri,
  });

  /// The path to navigate to
  final String path;

  /// Query parameters from the deep link
  final Map<String, String> queryParameters;

  /// Source of the deep link
  final DeepLinkSource source;

  /// Original URI
  final Uri originalUri;

  /// Get a query parameter
  String? operator [](String key) => queryParameters[key];

  @override
  String toString() => 'DeepLinkInfo(path: $path, source: $source)';
}

/// Source of the deep link
enum DeepLinkSource {
  /// Custom URL scheme (aivo-learner://)
  customScheme,

  /// Universal/App link (https://app.aivo.com/...)
  universalLink,

  /// Push notification
  notification,
}

/// Mixin for handling deep links in app state
mixin DeepLinkMixin<T extends ConsumerStatefulWidget> on ConsumerState<T> {
  StreamSubscription? _deepLinkSubscription;

  /// Override to handle deep links
  void handleDeepLink(DeepLinkInfo info);

  /// Call in initState to start listening for deep links
  void setupDeepLinkHandling() {
    // Check for pending deep link
    final pending = ref.read(pendingDeepLinkProvider);
    if (pending != null) {
      final handler = ref.read(deepLinkHandlerProvider);
      final info = handler.parseDeepLink(pending);
      if (info != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          handleDeepLink(info);
          ref.read(pendingDeepLinkProvider.notifier).state = null;
        });
      }
    }
  }

  @override
  void dispose() {
    _deepLinkSubscription?.cancel();
    super.dispose();
  }
}

/// Extension to easily set pending deep link
extension DeepLinkRefExtension on Ref {
  /// Set a pending deep link to be handled after auth
  void setPendingDeepLink(Uri uri) {
    read(pendingDeepLinkProvider.notifier).state = uri;
  }

  /// Clear pending deep link
  void clearPendingDeepLink() {
    read(pendingDeepLinkProvider.notifier).state = null;
  }

  /// Get and clear pending deep link
  Uri? consumePendingDeepLink() {
    final pending = read(pendingDeepLinkProvider);
    if (pending != null) {
      read(pendingDeepLinkProvider.notifier).state = null;
    }
    return pending;
  }
}
