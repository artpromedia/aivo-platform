import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:rxdart/rxdart.dart';
import 'package:flutter_common/realtime/realtime_types.dart';

/// WebSocket connection status
enum ConnectionStatus {
  disconnected,
  connecting,
  connected,
  reconnecting,
  error,
}

/// Configuration for WebSocket client
class WebSocketConfig {
  final String url;
  final Duration reconnectDelay;
  final Duration maxReconnectDelay;
  final int maxReconnectAttempts;
  final Duration pingInterval;
  final Duration connectionTimeout;

  const WebSocketConfig({
    required this.url,
    this.reconnectDelay = const Duration(seconds: 1),
    this.maxReconnectDelay = const Duration(seconds: 30),
    this.maxReconnectAttempts = 10,
    this.pingInterval = const Duration(seconds: 25),
    this.connectionTimeout = const Duration(seconds: 10),
  });
}

/// WebSocket message wrapper
class WSMessage {
  final String event;
  final Map<String, dynamic> data;
  final String? ackId;

  WSMessage({
    required this.event,
    required this.data,
    this.ackId,
  });

  Map<String, dynamic> toJson() => {
        'event': event,
        'data': data,
        if (ackId != null) 'ackId': ackId,
      };

  factory WSMessage.fromJson(Map<String, dynamic> json) {
    return WSMessage(
      event: json['event'] as String,
      data: json['data'] as Map<String, dynamic>? ?? {},
      ackId: json['ackId'] as String?,
    );
  }
}

/// WebSocket client for real-time communication
///
/// Provides:
/// - Auto-reconnection with exponential backoff
/// - Heartbeat/ping-pong to detect stale connections
/// - Promise-based emit with acknowledgments
/// - Room management
/// - Event streaming via RxDart
class WebSocketClient {
  final WebSocketConfig config;
  final String Function() getAuthToken;

  WebSocket? _socket;
  Timer? _pingTimer;
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  bool _intentionalDisconnect = false;
  final Map<String, Completer<Map<String, dynamic>>> _pendingAcks = {};
  int _ackCounter = 0;

  // Streams
  final _statusController = BehaviorSubject<ConnectionStatus>.seeded(
    ConnectionStatus.disconnected,
  );
  final _messageController = StreamController<WSMessage>.broadcast();
  final _errorController = StreamController<dynamic>.broadcast();

  /// Current connection status
  Stream<ConnectionStatus> get statusStream => _statusController.stream;
  ConnectionStatus get status => _statusController.value;

  /// Incoming messages stream
  Stream<WSMessage> get messageStream => _messageController.stream;

  /// Error stream
  Stream<dynamic> get errorStream => _errorController.stream;

  /// Whether connected
  bool get isConnected => _socket != null && status == ConnectionStatus.connected;

  /// Set of currently joined rooms
  final Set<String> _joinedRooms = {};
  Set<String> get joinedRooms => Set.unmodifiable(_joinedRooms);

  WebSocketClient({
    required this.config,
    required this.getAuthToken,
  });

  /// Connect to WebSocket server
  Future<void> connect() async {
    if (status == ConnectionStatus.connecting ||
        status == ConnectionStatus.connected) {
      return;
    }

    _intentionalDisconnect = false;
    _statusController.add(ConnectionStatus.connecting);

    try {
      final token = getAuthToken();
      final uri = Uri.parse(config.url).replace(
        queryParameters: {'token': token},
      );

      _socket = await WebSocket.connect(
        uri.toString(),
      ).timeout(config.connectionTimeout);

      _statusController.add(ConnectionStatus.connected);
      _reconnectAttempts = 0;
      _startPingTimer();
      _listen();

      debugPrint('[WebSocket] Connected to ${config.url}');
    } catch (e) {
      debugPrint('[WebSocket] Connection error: $e');
      _statusController.add(ConnectionStatus.error);
      _errorController.add(e);
      _scheduleReconnect();
    }
  }

  /// Disconnect from server
  Future<void> disconnect() async {
    _intentionalDisconnect = true;
    _stopPingTimer();
    _reconnectTimer?.cancel();
    _joinedRooms.clear();

    if (_socket != null) {
      await _socket!.close();
      _socket = null;
    }

    _statusController.add(ConnectionStatus.disconnected);
    debugPrint('[WebSocket] Disconnected');
  }

  /// Listen for incoming messages
  void _listen() {
    _socket?.listen(
      (data) {
        try {
          final json = jsonDecode(data as String) as Map<String, dynamic>;
          final message = WSMessage.fromJson(json);

          // Handle acknowledgments
          if (message.ackId != null && _pendingAcks.containsKey(message.ackId)) {
            _pendingAcks[message.ackId]!.complete(message.data);
            _pendingAcks.remove(message.ackId);
            return;
          }

          // Handle pong
          if (message.event == WSEventType.pong.value) {
            return;
          }

          _messageController.add(message);
        } catch (e) {
          debugPrint('[WebSocket] Parse error: $e');
        }
      },
      onError: (error) {
        debugPrint('[WebSocket] Stream error: $error');
        _errorController.add(error);
        _handleDisconnect();
      },
      onDone: () {
        debugPrint('[WebSocket] Stream closed');
        _handleDisconnect();
      },
    );
  }

  /// Handle unexpected disconnect
  void _handleDisconnect() {
    _socket = null;
    _stopPingTimer();

    if (!_intentionalDisconnect) {
      _statusController.add(ConnectionStatus.reconnecting);
      _scheduleReconnect();
    } else {
      _statusController.add(ConnectionStatus.disconnected);
    }
  }

  /// Schedule reconnection with exponential backoff
  void _scheduleReconnect() {
    if (_intentionalDisconnect ||
        _reconnectAttempts >= config.maxReconnectAttempts) {
      _statusController.add(ConnectionStatus.error);
      return;
    }

    final delay = Duration(
      milliseconds: (config.reconnectDelay.inMilliseconds *
              (1 << _reconnectAttempts))
          .clamp(0, config.maxReconnectDelay.inMilliseconds),
    );

    debugPrint(
        '[WebSocket] Reconnecting in ${delay.inSeconds}s (attempt ${_reconnectAttempts + 1})');

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(delay, () async {
      _reconnectAttempts++;
      await connect();

      // Rejoin rooms after reconnect
      if (isConnected) {
        for (final roomId in _joinedRooms.toList()) {
          await joinRoom(roomId);
        }
      }
    });
  }

  /// Start ping timer
  void _startPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(config.pingInterval, (_) {
      if (isConnected) {
        send(WSEventType.heartbeat.value, {});
      }
    });
  }

  /// Stop ping timer
  void _stopPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = null;
  }

  /// Send a message without waiting for acknowledgment
  void send(String event, Map<String, dynamic> data) {
    if (!isConnected) {
      debugPrint('[WebSocket] Cannot send - not connected');
      return;
    }

    final message = WSMessage(event: event, data: data);
    _socket!.add(jsonEncode(message.toJson()));
  }

  /// Send a message and wait for acknowledgment
  Future<Map<String, dynamic>> emit(
    String event,
    Map<String, dynamic> data, {
    Duration timeout = const Duration(seconds: 5),
  }) async {
    if (!isConnected) {
      throw StateError('WebSocket not connected');
    }

    final ackId = 'ack_${++_ackCounter}';
    final completer = Completer<Map<String, dynamic>>();
    _pendingAcks[ackId] = completer;

    final message = WSMessage(event: event, data: data, ackId: ackId);
    _socket!.add(jsonEncode(message.toJson()));

    // Handle timeout
    return completer.future.timeout(timeout, onTimeout: () {
      _pendingAcks.remove(ackId);
      throw TimeoutException('Emit timeout for event: $event');
    });
  }

  /// Subscribe to a specific event type
  Stream<Map<String, dynamic>> on(String event) {
    return messageStream
        .where((msg) => msg.event == event)
        .map((msg) => msg.data);
  }

  /// Subscribe to a specific event type enum
  Stream<Map<String, dynamic>> onEvent(WSEventType event) {
    return on(event.value);
  }

  /// Join a room
  Future<RoomState?> joinRoom(String roomId, {Map<String, dynamic>? options}) async {
    if (!isConnected) {
      throw StateError('WebSocket not connected');
    }

    try {
      final response = await emit(WSEventType.roomJoin.value, {
        'roomId': roomId,
        ...?options,
      });

      if (response['success'] == true) {
        _joinedRooms.add(roomId);
        if (response['state'] != null) {
          return RoomState.fromJson(response['state'] as Map<String, dynamic>);
        }
      }
      return null;
    } catch (e) {
      debugPrint('[WebSocket] Join room error: $e');
      rethrow;
    }
  }

  /// Leave a room
  Future<void> leaveRoom(String roomId) async {
    if (!isConnected) return;

    try {
      await emit(WSEventType.roomLeave.value, {'roomId': roomId});
      _joinedRooms.remove(roomId);
    } catch (e) {
      debugPrint('[WebSocket] Leave room error: $e');
    }
  }

  /// Leave all rooms
  Future<void> leaveAllRooms() async {
    for (final roomId in _joinedRooms.toList()) {
      await leaveRoom(roomId);
    }
  }

  /// Update presence
  void updatePresence({
    PresenceStatus? status,
    String? currentActivity,
    Map<String, dynamic>? cursor,
  }) {
    send(WSEventType.presenceUpdate.value, {
      if (status != null) 'status': status.value,
      if (currentActivity != null) 'currentActivity': currentActivity,
      if (cursor != null) 'cursor': cursor,
    });
  }

  /// Dispose resources
  Future<void> dispose() async {
    await disconnect();
    await _statusController.close();
    await _messageController.close();
    await _errorController.close();
  }
}
