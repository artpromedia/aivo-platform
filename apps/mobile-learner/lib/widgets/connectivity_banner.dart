/// Connectivity Banner Widget
///
/// A comprehensive banner that shows network status with multiple states:
/// - Online: Hidden (normal operation)
/// - Offline: Orange warning banner
/// - Slow: Yellow caution banner
/// - Syncing: Blue progress banner
/// - Back Online: Green success banner (auto-dismisses)
/// - Error: Red error banner
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart' hide ConnectionState;
import 'package:flutter_common/theme/theme.dart';
import 'package:flutter_common/offline/offline.dart' as common;

import '../offline/offline.dart';

/// The current connectivity state for the banner.
enum BannerConnectionState {
  /// Normal operation - banner hidden
  online,

  /// No internet connection
  offline,

  /// Poor/degraded connection
  slow,

  /// Syncing offline data
  syncing,

  /// Just reconnected (shows briefly then hides)
  backOnline,

  /// Connection error
  error,
}

/// Provider for the enhanced connectivity banner state.
final connectivityBannerStateProvider = StreamProvider<BannerConnectionState>((ref) {
  final connectivity = ref.watch(connectivityServiceProvider);
  final syncManager = ref.watch(learnerSyncManagerProvider);

  return _createBannerStateStream(connectivity, syncManager);
});

Stream<BannerConnectionState> _createBannerStateStream(
  ConnectivityService connectivity,
  SyncManager syncManager,
) async* {
  // Initial state
  var currentState = _mapConnectionState(connectivity.currentState);
  yield currentState;

  // Combine connectivity and sync streams
  await for (final state in connectivity.stateStream) {
    final newState = _mapConnectionState(state);

    // If transitioning from offline to online, show backOnline briefly
    if (currentState == BannerConnectionState.offline &&
        newState == BannerConnectionState.online) {
      yield BannerConnectionState.backOnline;
      await Future.delayed(const Duration(seconds: 3));
    }

    currentState = newState;
    yield currentState;
  }
}

BannerConnectionState _mapConnectionState(common.ConnectionState state) {
  switch (state) {
    case common.ConnectionState.online:
      return BannerConnectionState.online;
    case common.ConnectionState.offline:
      return BannerConnectionState.offline;
    case common.ConnectionState.unknown:
      return BannerConnectionState.slow;
  }
}

/// An enhanced connectivity banner with multiple states and animations.
class ConnectivityBanner extends ConsumerStatefulWidget {
  const ConnectivityBanner({
    super.key,
    this.onTap,
    this.autoDismissBackOnline = true,
    this.showSyncProgress = true,
  });

  /// Called when the banner is tapped.
  final VoidCallback? onTap;

  /// Whether to auto-dismiss the "back online" banner.
  final bool autoDismissBackOnline;

  /// Whether to show sync progress indicator.
  final bool showSyncProgress;

  @override
  ConsumerState<ConnectivityBanner> createState() => _ConnectivityBannerState();
}

class _ConnectivityBannerState extends ConsumerState<ConnectivityBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _slideAnimation;
  Timer? _dismissTimer;
  BannerConnectionState _displayedState = BannerConnectionState.online;
  bool _isVisible = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _slideAnimation = Tween<double>(begin: -1.0, end: 0.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _animationController.dispose();
    super.dispose();
  }

  void _updateVisibility(BannerConnectionState state) {
    _dismissTimer?.cancel();

    final shouldBeVisible = state != BannerConnectionState.online;

    if (shouldBeVisible && !_isVisible) {
      setState(() {
        _displayedState = state;
        _isVisible = true;
      });
      _animationController.forward();
    } else if (!shouldBeVisible && _isVisible) {
      _animationController.reverse().then((_) {
        if (mounted) {
          setState(() => _isVisible = false);
        }
      });
    } else if (shouldBeVisible && _displayedState != state) {
      setState(() => _displayedState = state);
    }

    // Auto-dismiss back online state
    if (state == BannerConnectionState.backOnline && widget.autoDismissBackOnline) {
      _dismissTimer = Timer(const Duration(seconds: 3), () {
        if (mounted) {
          _animationController.reverse().then((_) {
            if (mounted) {
              setState(() => _isVisible = false);
            }
          });
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bannerState = ref.watch(connectivityBannerStateProvider);
    final syncStatus = ref.watch(syncStatusProvider);

    // Update visibility based on state changes
    bannerState.when(
      data: (state) {
        // If syncing, show sync state
        if (state == BannerConnectionState.online &&
            syncStatus.valueOrNull?.state == SyncState.syncing) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _updateVisibility(BannerConnectionState.syncing);
          });
        } else {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _updateVisibility(state);
          });
        }
      },
      loading: () {},
      error: (_, __) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _updateVisibility(BannerConnectionState.error);
        });
      },
    );

    if (!_isVisible) {
      return const SizedBox.shrink();
    }

    return AnimatedBuilder(
      animation: _slideAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, _slideAnimation.value * 60),
          child: child,
        );
      },
      child: _BannerContent(
        state: _displayedState,
        onTap: widget.onTap,
        syncProgress: widget.showSyncProgress
            ? syncStatus.valueOrNull
            : null,
      ),
    );
  }
}

class _BannerContent extends StatelessWidget {
  const _BannerContent({
    required this.state,
    this.onTap,
    this.syncProgress,
  });

  final BannerConnectionState state;
  final VoidCallback? onTap;
  final SyncStatusInfo? syncProgress;

  @override
  Widget build(BuildContext context) {
    final config = _getBannerConfig(state);

    return Material(
      color: config.backgroundColor,
      child: InkWell(
        onTap: onTap,
        child: SafeArea(
          bottom: false,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
            child: Row(
              children: [
                // Icon or progress indicator
                if (state == BannerConnectionState.syncing)
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: config.iconColor,
                    ),
                  )
                else
                  Icon(config.icon, color: config.iconColor, size: 20),
                const SizedBox(width: 12),

                // Message
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        config.title,
                        style: TextStyle(
                          color: config.textColor,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      if (config.subtitle != null || syncProgress != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          _getSubtitle(config, syncProgress),
                          style: TextStyle(
                            color: config.textColor.withValues(alpha: 0.8),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

                // Action indicator
                if (onTap != null)
                  Icon(
                    Icons.chevron_right,
                    color: config.iconColor.withValues(alpha: 0.7),
                    size: 20,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _getSubtitle(_BannerConfig config, SyncStatusInfo? syncProgress) {
    if (state == BannerConnectionState.syncing && syncProgress != null) {
      final pending = syncProgress.pendingEvents + syncProgress.pendingSessions;
      if (pending > 0) {
        return 'Syncing $pending items...';
      }
      return 'Syncing your data...';
    }
    return config.subtitle ?? '';
  }

  _BannerConfig _getBannerConfig(BannerConnectionState state) {
    switch (state) {
      case BannerConnectionState.online:
        return const _BannerConfig(
          backgroundColor: Colors.transparent,
          iconColor: Colors.transparent,
          textColor: Colors.transparent,
          icon: Icons.wifi,
          title: '',
          subtitle: null,
        );

      case BannerConnectionState.offline:
        return _BannerConfig(
          backgroundColor: AivoBrand.sunshine.shade100,
          iconColor: AivoBrand.sunshine.shade800,
          textColor: AivoBrand.sunshine.shade900,
          icon: Icons.cloud_off,
          title: 'You\'re Offline',
          subtitle: 'Your progress is saved and will sync when you reconnect.',
        );

      case BannerConnectionState.slow:
        return _BannerConfig(
          backgroundColor: Colors.amber.shade100,
          iconColor: Colors.amber.shade800,
          textColor: Colors.amber.shade900,
          icon: Icons.signal_wifi_statusbar_connected_no_internet_4,
          title: 'Slow Connection',
          subtitle: 'Some features may be limited.',
        );

      case BannerConnectionState.syncing:
        return _BannerConfig(
          backgroundColor: Colors.blue.shade100,
          iconColor: Colors.blue.shade700,
          textColor: Colors.blue.shade900,
          icon: Icons.sync,
          title: 'Syncing',
          subtitle: 'Syncing your data...',
        );

      case BannerConnectionState.backOnline:
        return _BannerConfig(
          backgroundColor: AivoBrand.mint.shade100,
          iconColor: AivoBrand.mint.shade700,
          textColor: AivoBrand.mint.shade900,
          icon: Icons.cloud_done,
          title: 'Back Online',
          subtitle: 'You\'re connected again!',
        );

      case BannerConnectionState.error:
        return _BannerConfig(
          backgroundColor: AivoBrand.error.shade100,
          iconColor: AivoBrand.error.shade700,
          textColor: AivoBrand.error.shade900,
          icon: Icons.error_outline,
          title: 'Connection Error',
          subtitle: 'Tap to retry.',
        );
    }
  }
}

class _BannerConfig {
  const _BannerConfig({
    required this.backgroundColor,
    required this.iconColor,
    required this.textColor,
    required this.icon,
    required this.title,
    this.subtitle,
  });

  final Color backgroundColor;
  final Color iconColor;
  final Color textColor;
  final IconData icon;
  final String title;
  final String? subtitle;
}

/// Provider for sync status stream
final syncStatusProvider = StreamProvider<SyncStatusInfo>((ref) {
  final syncManager = ref.watch(learnerSyncManagerProvider);
  return syncManager.statusStream;
});
