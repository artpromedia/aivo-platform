/// OAuth WebView widget for Google Classroom authentication
/// Provides in-app OAuth flow with callback handling
/// Note: Falls back to external browser if WebView is unavailable
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:url_launcher/url_launcher.dart';

// Note: webview_flutter import is conditional based on platform support
// For now we provide a fallback implementation using url_launcher

/// In-app OAuth authorization handler
/// Uses WebView when available, falls back to external browser
class OAuthWebView extends StatefulWidget {
  const OAuthWebView({
    super.key,
    required this.authUrl,
    required this.redirectUri,
    required this.onAuthCode,
    this.onError,
    this.onCancel,
    this.title = 'Sign in with Google',
  });

  /// The OAuth authorization URL to load
  final String authUrl;

  /// The expected redirect URI to intercept
  final String redirectUri;

  /// Callback when authorization code is received
  final void Function(String code) onAuthCode;

  /// Callback when an error occurs
  final void Function(String error)? onError;

  /// Callback when user cancels
  final VoidCallback? onCancel;

  /// Title shown in app bar
  final String title;

  @override
  State<OAuthWebView> createState() => _OAuthWebViewState();
}

class _OAuthWebViewState extends State<OAuthWebView> {
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _launchExternalAuth();
  }

  Future<void> _launchExternalAuth() async {
    try {
      final uri = Uri.parse(widget.authUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        if (mounted) {
          setState(() => _isLoading = false);
        }
      } else {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _error = 'Could not open authorization URL';
          });
        }
        widget.onError?.call('Could not open authorization URL');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString();
        });
      }
      widget.onError?.call(e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            widget.onCancel?.call();
            Navigator.of(context).pop(false);
          },
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (_isLoading) ...[
                const CircularProgressIndicator(),
                const SizedBox(height: 24),
                Text(
                  'Opening authorization...',
                  style: theme.textTheme.titleMedium,
                ),
              ] else if (_error != null) ...[
                const Icon(
                  Icons.error_outline,
                  size: 64,
                  color: AivoBrand.error,
                ),
                const SizedBox(height: 16),
                Text(
                  'Connection Error',
                  style: theme.textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: () {
                    setState(() {
                      _isLoading = true;
                      _error = null;
                    });
                    _launchExternalAuth();
                  },
                  icon: const Icon(Icons.refresh),
                  label: const Text('Try Again'),
                ),
              ] else ...[
                Icon(
                  Icons.open_in_browser,
                  size: 64,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(height: 24),
                Text(
                  'Complete Sign In',
                  style: theme.textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'Please complete the authorization in your browser, '
                  'then return here and tap "Done".',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 32),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    OutlinedButton(
                      onPressed: () {
                        widget.onCancel?.call();
                        Navigator.of(context).pop(false);
                      },
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 16),
                    FilledButton(
                      onPressed: () {
                        // User claims they completed auth
                        // The actual OAuth code exchange happens server-side
                        Navigator.of(context).pop(true);
                      },
                      child: const Text('Done'),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Dialog wrapper for OAuth flow
class OAuthWebViewDialog extends StatelessWidget {
  const OAuthWebViewDialog({
    super.key,
    required this.authUrl,
    required this.redirectUri,
    this.title = 'Sign in with Google',
  });

  final String authUrl;
  final String redirectUri;
  final String title;

  /// Show the OAuth dialog and return whether user completed
  static Future<bool> show({
    required BuildContext context,
    required String authUrl,
    required String redirectUri,
    String title = 'Sign in with Google',
  }) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (context) => OAuthWebView(
          authUrl: authUrl,
          redirectUri: redirectUri,
          title: title,
          onAuthCode: (_) {},
        ),
      ),
    );

    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return OAuthWebView(
      authUrl: authUrl,
      redirectUri: redirectUri,
      title: title,
      onAuthCode: (code) {
        Navigator.of(context).pop(code);
      },
      onError: (error) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Authorization error: $error'),
            backgroundColor: AivoBrand.error,
          ),
        );
      },
    );
  }
}

/// Bottom sheet variant for OAuth flow
class OAuthWebViewSheet extends StatefulWidget {
  const OAuthWebViewSheet({
    super.key,
    required this.authUrl,
    required this.redirectUri,
    required this.onComplete,
    this.onError,
    this.title = 'Sign in with Google',
  });

  final String authUrl;
  final String redirectUri;
  final VoidCallback onComplete;
  final void Function(String error)? onError;
  final String title;

  /// Show the OAuth sheet and return whether completed
  static Future<bool> show({
    required BuildContext context,
    required String authUrl,
    required String redirectUri,
    String title = 'Sign in with Google',
  }) async {
    bool completed = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.8,
        expand: false,
        builder: (context, scrollController) => OAuthWebViewSheet(
          authUrl: authUrl,
          redirectUri: redirectUri,
          title: title,
          onComplete: () {
            completed = true;
            Navigator.of(context).pop();
          },
          onError: (error) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Authorization error: $error'),
                backgroundColor: AivoBrand.error,
              ),
            );
          },
        ),
      ),
    );

    return completed;
  }

  @override
  State<OAuthWebViewSheet> createState() => _OAuthWebViewSheetState();
}

class _OAuthWebViewSheetState extends State<OAuthWebViewSheet> {
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _launchExternalAuth();
  }

  Future<void> _launchExternalAuth() async {
    try {
      final uri = Uri.parse(widget.authUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        if (mounted) {
          setState(() => _isLoading = false);
        }
      } else {
        widget.onError?.call('Could not open authorization URL');
      }
    } catch (e) {
      widget.onError?.call(e.toString());
    }
    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        // Handle bar
        Container(
          width: 40,
          height: 4,
          margin: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: AivoBrand.gray[300],
            borderRadius: BorderRadius.circular(2),
          ),
        ),

        // Title bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  widget.title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        ),

        const Divider(height: 1),

        // Content
        Expanded(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_isLoading) ...[
                    const CircularProgressIndicator(),
                    const SizedBox(height: 16),
                    const Text('Opening authorization...'),
                  ] else ...[
                    Icon(
                      Icons.open_in_browser,
                      size: 48,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Complete sign in in your browser, then tap "Done"',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: widget.onComplete,
                      child: const Text('Done'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

