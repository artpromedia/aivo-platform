import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uni_links/uni_links.dart';

/// Deep Link Service
///
/// Handles universal links (iOS) and app links (Android):
/// - Initial deep link when app opens from link
/// - Deep links while app is running
/// - Route mapping for various content types
/// - Analytics tracking for link attribution
class DeepLinkService {
  final Ref _ref;
  StreamSubscription<String?>? _linkSubscription;
  bool _initialized = false;

  /// Supported deep link schemes
  static const String appScheme = 'aivo';
  static const String httpsScheme = 'https';

  /// Supported hosts for universal/app links
  static const List<String> supportedHosts = [
    'learn.aivo.com',
    'app.aivo.com',
    'aivo.com',
  ];

  DeepLinkService(this._ref);

  /// Initialize deep link handling
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    try {
      // Handle initial link (app opened from deep link)
      final initialLink = await getInitialLink();
      if (initialLink != null) {
        await _handleDeepLink(initialLink);
      }
    } on PlatformException catch (e) {
      debugPrint('Failed to get initial link: $e');
    }

    // Handle links while app is running
    _linkSubscription = linkStream.listen(
      (String? link) async {
        if (link != null) {
          await _handleDeepLink(link);
        }
      },
      onError: (error) {
        debugPrint('Deep link stream error: $error');
      },
    );
  }

  /// Handle incoming deep link
  Future<void> _handleDeepLink(String link) async {
    debugPrint('Handling deep link: $link');

    try {
      final uri = Uri.parse(link);
      final route = _mapUriToRoute(uri);

      if (route != null) {
        // Track deep link analytics
        _trackDeepLinkEvent(uri, route);

        // Navigate to route
        _navigateToRoute(route);
      }
    } catch (e) {
      debugPrint('Failed to handle deep link: $e');
    }
  }

  /// Map URI to app route
  String? _mapUriToRoute(Uri uri) {
    // Handle custom scheme (aivo://...)
    if (uri.scheme == appScheme) {
      return _mapAppSchemeUri(uri);
    }

    // Handle universal/app links (https://learn.aivo.com/...)
    if (uri.scheme == httpsScheme && supportedHosts.contains(uri.host)) {
      return _mapWebUri(uri);
    }

    return null;
  }

  /// Map custom scheme URI to route
  String? _mapAppSchemeUri(Uri uri) {
    final path = uri.path;
    final segments = uri.pathSegments;
    final query = uri.queryParameters;

    switch (uri.host) {
      case 'lesson':
        // aivo://lesson/123
        if (segments.isNotEmpty) {
          return '/activity/${segments.first}';
        }
        break;

      case 'activity':
        // aivo://activity/session-id
        if (segments.isNotEmpty) {
          return '/activity/${segments.first}';
        }
        break;

      case 'baseline':
        // aivo://baseline/intro
        if (segments.isNotEmpty) {
          return '/baseline/${segments.first}';
        }
        return '/baseline/intro';

      case 'homework':
        // aivo://homework/intro
        if (segments.isNotEmpty) {
          return '/homework/${segments.first}';
        }
        return '/homework/intro';

      case 'focus':
        // aivo://focus/break
        return '/focus/break';

      case 'plan':
        // aivo://plan
        return '/plan';

      case 'schedule':
        // aivo://schedule
        return '/schedule';

      case 'badges':
        // aivo://badges
        return '/badges';

      case 'feedback':
        // aivo://feedback/session-id
        if (segments.isNotEmpty) {
          return '/feedback/${segments.first}';
        }
        break;
    }

    return null;
  }

  /// Map web URI to route
  String? _mapWebUri(Uri uri) {
    final segments = uri.pathSegments;
    if (segments.isEmpty) return '/plan';

    final first = segments.first;
    final id = segments.length > 1 ? segments[1] : null;

    switch (first) {
      case 'learn':
      case 'activity':
      case 'lesson':
        if (id != null) {
          return '/activity/$id';
        }
        return '/plan';

      case 'baseline':
        if (id != null) {
          return '/baseline/$id';
        }
        return '/baseline/intro';

      case 'homework':
        if (id != null) {
          return '/homework/$id';
        }
        return '/homework/intro';

      case 'focus':
      case 'break':
        return '/focus/break';

      case 'plan':
      case 'today':
        return '/plan';

      case 'schedule':
        return '/schedule';

      case 'badges':
      case 'achievements':
        return '/badges';

      case 'feedback':
        if (id != null) {
          return '/feedback/$id';
        }
        break;

      case 'share':
        // Handle share links
        return _handleShareLink(uri);
    }

    return null;
  }

  /// Handle share links
  String? _handleShareLink(Uri uri) {
    final type = uri.queryParameters['type'];
    final id = uri.queryParameters['id'];

    switch (type) {
      case 'activity':
      case 'lesson':
        if (id != null) return '/activity/$id';
        break;
      case 'achievement':
        return '/badges';
    }

    return null;
  }

  /// Navigate to route using GoRouter
  void _navigateToRoute(String route) {
    // Get router from the ref if available
    // This navigates using the current router context
    debugPrint('Navigating to: $route');

    // The actual navigation happens through the app's router
    // This is typically done by storing the pending route and
    // letting the main app handle it
    _pendingRoute = route;
  }

  /// Pending route from deep link
  String? _pendingRoute;

  /// Get and clear pending route
  String? consumePendingRoute() {
    final route = _pendingRoute;
    _pendingRoute = null;
    return route;
  }

  /// Check if there's a pending route
  bool get hasPendingRoute => _pendingRoute != null;

  /// Track deep link analytics
  void _trackDeepLinkEvent(Uri uri, String route) {
    // Track with analytics service
    debugPrint('Deep link tracked: ${uri.toString()} -> $route');
  }

  /// Generate shareable deep link for content
  String generateShareLink({
    required String type,
    required String id,
    String? title,
  }) {
    final uri = Uri(
      scheme: httpsScheme,
      host: 'learn.aivo.com',
      path: '/share',
      queryParameters: {
        'type': type,
        'id': id,
        if (title != null) 'title': title,
      },
    );

    return uri.toString();
  }

  /// Generate app scheme deep link
  String generateAppLink({
    required String type,
    String? id,
  }) {
    final path = id != null ? '/$id' : '';
    return '$appScheme://$type$path';
  }

  /// Dispose resources
  void dispose() {
    _linkSubscription?.cancel();
    _linkSubscription = null;
    _initialized = false;
  }
}

/// Deep link service provider
final deepLinkServiceProvider = Provider<DeepLinkService>((ref) {
  final service = DeepLinkService(ref);
  ref.onDispose(() => service.dispose());
  return service;
});

/// Deep link state for tracking pending navigation
class DeepLinkState {
  final String? pendingRoute;
  final DateTime? timestamp;

  const DeepLinkState({
    this.pendingRoute,
    this.timestamp,
  });

  DeepLinkState copyWith({
    String? pendingRoute,
    DateTime? timestamp,
  }) {
    return DeepLinkState(
      pendingRoute: pendingRoute ?? this.pendingRoute,
      timestamp: timestamp ?? this.timestamp,
    );
  }

  DeepLinkState cleared() => const DeepLinkState();
}

/// Deep link state provider
final deepLinkStateProvider =
    StateNotifierProvider<DeepLinkStateNotifier, DeepLinkState>((ref) {
  return DeepLinkStateNotifier();
});

class DeepLinkStateNotifier extends StateNotifier<DeepLinkState> {
  DeepLinkStateNotifier() : super(const DeepLinkState());

  void setPendingRoute(String route) {
    state = DeepLinkState(
      pendingRoute: route,
      timestamp: DateTime.now(),
    );
  }

  String? consumePendingRoute() {
    final route = state.pendingRoute;
    state = state.cleared();
    return route;
  }
}
