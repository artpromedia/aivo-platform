import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rxdart/rxdart.dart';
import 'package:flutter_common/realtime/websocket_client.dart';
import 'package:flutter_common/realtime/realtime_types.dart';

/// State for presence in a room
class PresenceState {
  final Map<String, UserPresence> presences;
  final bool synced;

  const PresenceState({
    this.presences = const {},
    this.synced = false,
  });

  PresenceState copyWith({
    Map<String, UserPresence>? presences,
    bool? synced,
  }) {
    return PresenceState(
      presences: presences ?? this.presences,
      synced: synced ?? this.synced,
    );
  }

  /// Get online users count
  int get onlineCount => presences.values
      .where((p) => p.status != PresenceStatus.offline)
      .length;

  /// Get users with a specific status
  List<UserPresence> withStatus(PresenceStatus status) =>
      presences.values.where((p) => p.status == status).toList();
}

/// Presence state notifier for Riverpod
class PresenceNotifier extends StateNotifier<PresenceState> {
  final WebSocketClient _client;
  final String _roomId;
  StreamSubscription? _presenceSyncSub;
  StreamSubscription? _presenceUpdateSub;
  StreamSubscription? _presenceLeftSub;
  StreamSubscription? _statusSub;

  PresenceNotifier(this._client, this._roomId) : super(const PresenceState()) {
    _setupListeners();
    _requestSync();
  }

  void _setupListeners() {
    // Handle presence sync (initial state)
    _presenceSyncSub = _client.onEvent(WSEventType.presenceSync).listen((data) {
      if (data['roomId'] != _roomId) return;

      final presences = (data['presences'] as List)
          .map((p) => UserPresence.fromJson(p as Map<String, dynamic>))
          .fold<Map<String, UserPresence>>({}, (map, p) {
        map[p.odId] = p;
        return map;
      });

      state = state.copyWith(
        presences: presences,
        synced: true,
      );
    });

    // Handle presence updates
    _presenceUpdateSub = _client.onEvent(WSEventType.presenceUpdate).listen((data) {
      if (data['roomId'] != _roomId) return;

      final presence = UserPresence.fromJson(data);
      final updated = Map<String, UserPresence>.from(state.presences);
      updated[presence.odId] = presence;

      state = state.copyWith(presences: updated);
    });

    // Handle user leaving
    _presenceLeftSub = _client.onEvent(WSEventType.presenceLeft).listen((data) {
      if (data['roomId'] != _roomId) return;

      final odId = data['userId'] as String;
      final updated = Map<String, UserPresence>.from(state.presences);
      updated.remove(odId);

      state = state.copyWith(presences: updated);
    });

    // Handle reconnection
    _statusSub = _client.statusStream
        .where((s) => s == ConnectionStatus.connected)
        .skip(1) // Skip initial connection
        .listen((_) => _requestSync());
  }

  /// Request presence sync
  void _requestSync() {
    if (_client.isConnected) {
      _client.send(WSEventType.presenceSync.value, {'roomId': _roomId});
    }
  }

  /// Update local user's presence
  void updatePresence({
    PresenceStatus? status,
    String? currentActivity,
  }) {
    _client.updatePresence(
      status: status,
      currentActivity: currentActivity,
    );
  }

  @override
  void dispose() {
    _presenceSyncSub?.cancel();
    _presenceUpdateSub?.cancel();
    _presenceLeftSub?.cancel();
    _statusSub?.cancel();
    super.dispose();
  }
}

/// Provider family for room presence
final presenceProvider = StateNotifierProvider.family<PresenceNotifier, PresenceState, ({WebSocketClient client, String roomId})>(
  (ref, params) => PresenceNotifier(params.client, params.roomId),
);

/// Simplified provider that uses a WebSocketClient provider
/// Usage: ref.watch(roomPresenceProvider('room_123'))
final roomPresenceProvider = StateNotifierProvider.family<PresenceNotifier, PresenceState, String>(
  (ref, roomId) {
    // This requires a websocketClientProvider to be defined in the app
    throw UnimplementedError(
      'roomPresenceProvider requires websocketClientProvider to be overridden in the app',
    );
  },
);
