/// Realtime Service - WebSocket Client for Flutter
///
/// Provides real-time connectivity for mobile apps with:
/// - Automatic reconnection
/// - Presence tracking
/// - Room management
/// - Live session updates
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rxdart/rxdart.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

class RealtimeConfig {
  const RealtimeConfig({
    required this.baseUrl,
    this.reconnectInterval = const Duration(seconds: 5),
    this.heartbeatInterval = const Duration(seconds: 25),
    this.connectionTimeout = const Duration(seconds: 20),
  });

  final String baseUrl;
  final Duration reconnectInterval;
  final Duration heartbeatInterval;
  final Duration connectionTimeout;

  static const development = RealtimeConfig(baseUrl: 'ws://localhost:3003');
  static const production = RealtimeConfig(baseUrl: 'wss://realtime.aivo.app');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTION STATE
// ═══════════════════════════════════════════════════════════════════════════════

enum ConnectionStatus { disconnected, connecting, connected, reconnecting, error }

class ConnectionState {
  const ConnectionState({
    required this.status,
    this.sessionId,
    this.error,
  });

  final ConnectionStatus status;
  final String? sessionId;
  final String? error;

  bool get isConnected => status == ConnectionStatus.connected;

  ConnectionState copyWith({
    ConnectionStatus? status,
    String? sessionId,
    String? error,
  }) =>
      ConnectionState(
        status: status ?? this.status,
        sessionId: sessionId ?? this.sessionId,
        error: error,
      );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESENCE
// ═══════════════════════════════════════════════════════════════════════════════

class UserPresence {
  const UserPresence({
    required this.userId,
    required this.displayName,
    required this.status,
    required this.lastSeen,
    this.avatar,
    this.device = 'mobile',
    this.color,
  });

  final String userId;
  final String displayName;
  final String status;
  final DateTime lastSeen;
  final String? avatar;
  final String device;
  final String? color;

  factory UserPresence.fromJson(Map<String, dynamic> json) => UserPresence(
        userId: json['userId'] as String,
        displayName: json['displayName'] as String,
        status: json['status'] as String? ?? 'online',
        lastSeen: DateTime.tryParse(json['lastSeen'] as String? ?? '') ?? DateTime.now(),
        avatar: json['avatar'] as String?,
        device: json['device'] as String? ?? 'mobile',
        color: json['color'] as String?,
      );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REALTIME CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

class RealtimeClient {
  RealtimeClient({required this.config});

  final RealtimeConfig config;

  WebSocketChannel? _channel;
  Timer? _heartbeatTimer;
  Timer? _reconnectTimer;
  String? _token;
  int _messageId = 0;
  final Map<int, Completer<Map<String, dynamic>>> _pending = {};
  final Set<String> _rooms = {};

  final _connectionState = BehaviorSubject<ConnectionState>.seeded(
    const ConnectionState(status: ConnectionStatus.disconnected),
  );
  final _events = PublishSubject<Map<String, dynamic>>();
  final _presence = BehaviorSubject<Map<String, UserPresence>>.seeded({});

  Stream<ConnectionState> get connectionState => _connectionState.stream;
  Stream<Map<String, dynamic>> get events => _events.stream;
  Stream<Map<String, UserPresence>> get presence => _presence.stream;
  bool get isConnected => _connectionState.value.isConnected;

  /// Connect to the realtime server
  Future<void> connect(String token) async {
    _token = token;
    _connectionState.add(const ConnectionState(status: ConnectionStatus.connecting));

    try {
      final uri = Uri.parse('${config.baseUrl}/socket.io/?EIO=4&transport=websocket');
      _channel = WebSocketChannel.connect(uri);

      await _channel!.ready.timeout(config.connectionTimeout);

      _channel!.stream.listen(
        _handleMessage,
        onError: _handleError,
        onDone: _handleDisconnect,
      );

      // Send auth
      _send({'type': 'auth', 'token': token});
      _startHeartbeat();
    } catch (e) {
      _connectionState.add(ConnectionState(
        status: ConnectionStatus.error,
        error: e.toString(),
      ));
      _scheduleReconnect();
    }
  }

  /// Disconnect from the server
  void disconnect() {
    _heartbeatTimer?.cancel();
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
    _rooms.clear();
    _connectionState.add(const ConnectionState(status: ConnectionStatus.disconnected));
  }

  /// Join a room
  Future<void> joinRoom(String roomId, String roomType) async {
    final response = await _emit('room:join', {'roomId': roomId, 'roomType': roomType});
    if (response['success'] == true) {
      _rooms.add(roomId);
    }
  }

  /// Leave a room
  Future<void> leaveRoom(String roomId) async {
    await _emit('room:leave', {'roomId': roomId});
    _rooms.remove(roomId);
  }

  /// Update presence status
  Future<void> updatePresence({String? status, Map<String, dynamic>? metadata}) async {
    await _emit('presence:update', {
      if (status != null) 'status': status,
      if (metadata != null) ...metadata,
    });
  }

  /// Subscribe to analytics for a class
  Future<void> subscribeToAnalytics(String classId) async {
    await joinRoom('analytics:$classId', 'analytics');
    await _emit('analytics:subscribe', {'classId': classId, 'metrics': ['mastery', 'engagement']});
  }

  /// Listen to specific event types
  Stream<Map<String, dynamic>> on(String eventType) =>
      _events.where((e) => e['event'] == eventType);

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  void _send(Map<String, dynamic> data) {
    _channel?.sink.add(jsonEncode(data));
  }

  Future<Map<String, dynamic>> _emit(String event, Map<String, dynamic> data) async {
    final id = ++_messageId;
    final completer = Completer<Map<String, dynamic>>();
    _pending[id] = completer;

    _send({'id': id, 'event': event, 'data': data});

    return completer.future.timeout(
      const Duration(seconds: 10),
      onTimeout: () {
        _pending.remove(id);
        throw TimeoutException('Request timed out');
      },
    );
  }

  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message as String) as Map<String, dynamic>;

      // Handle acknowledgments
      if (data.containsKey('ack')) {
        final id = data['ack'] as int;
        _pending.remove(id)?.complete(data['data'] as Map<String, dynamic>? ?? {});
        return;
      }

      // Handle connection confirmation
      if (data['event'] == 'connect') {
        _connectionState.add(ConnectionState(
          status: ConnectionStatus.connected,
          sessionId: data['sessionId'] as String?,
        ));
        _rejoinRooms();
        return;
      }

      // Handle presence updates
      if (data['event']?.toString().startsWith('presence:') == true) {
        _handlePresenceEvent(data);
      }

      // Forward to events stream
      _events.add(data);
    } catch (e) {
      // Ignore malformed messages
    }
  }

  void _handlePresenceEvent(Map<String, dynamic> data) {
    final event = data['event'] as String;
    final payload = data['data'] as Map<String, dynamic>? ?? {};

    switch (event) {
      case 'presence:join':
        final userId = payload['userId'] as String;
        _presence.add({
          ..._presence.value,
          userId: UserPresence.fromJson(payload),
        });
        break;
      case 'presence:leave':
        final userId = payload['userId'] as String;
        final updated = Map<String, UserPresence>.from(_presence.value)..remove(userId);
        _presence.add(updated);
        break;
      case 'presence:update':
        final userId = payload['userId'] as String;
        final existing = _presence.value[userId];
        if (existing != null) {
          _presence.add({
            ..._presence.value,
            userId: UserPresence.fromJson({...payload, 'userId': userId}),
          });
        }
        break;
    }
  }

  void _handleError(dynamic error) {
    _connectionState.add(ConnectionState(
      status: ConnectionStatus.error,
      error: error.toString(),
    ));
    _scheduleReconnect();
  }

  void _handleDisconnect() {
    _heartbeatTimer?.cancel();
    _connectionState.add(const ConnectionState(status: ConnectionStatus.disconnected));
    _scheduleReconnect();
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(config.heartbeatInterval, (_) {
      _send({'type': 'ping'});
    });
  }

  void _scheduleReconnect() {
    if (_token == null) return;

    _reconnectTimer?.cancel();
    _connectionState.add(const ConnectionState(status: ConnectionStatus.reconnecting));

    _reconnectTimer = Timer(config.reconnectInterval, () {
      if (_token != null) connect(_token!);
    });
  }

  Future<void> _rejoinRooms() async {
    for (final roomId in _rooms.toList()) {
      try {
        await _emit('room:join', {'roomId': roomId, 'roomType': 'rejoin'});
      } catch (e) {
        debugPrint('[RealtimeService] Failed to rejoin room $roomId: $e');
        _rooms.remove(roomId);
      }
    }
  }

  void dispose() {
    disconnect();
    _connectionState.close();
    _events.close();
    _presence.close();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

final realtimeConfigProvider = Provider<RealtimeConfig>((ref) {
  const isProduction = bool.fromEnvironment('dart.vm.product');
  return isProduction ? RealtimeConfig.production : RealtimeConfig.development;
});

final realtimeClientProvider = Provider<RealtimeClient>((ref) {
  final config = ref.watch(realtimeConfigProvider);
  final client = RealtimeClient(config: config);
  ref.onDispose(client.dispose);
  return client;
});

final connectionStateProvider = StreamProvider<ConnectionState>((ref) {
  final client = ref.watch(realtimeClientProvider);
  return client.connectionState;
});

final presenceProvider = StreamProvider<Map<String, UserPresence>>((ref) {
  final client = ref.watch(realtimeClientProvider);
  return client.presence;
});
