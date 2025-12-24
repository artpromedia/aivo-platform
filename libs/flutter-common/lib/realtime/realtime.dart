/// Flutter Realtime Module
///
/// Provides WebSocket-based real-time communication for Flutter apps.
///
/// Features:
/// - WebSocket client with auto-reconnection
/// - Presence management
/// - Live session monitoring
/// - Riverpod providers for state management
///
/// Usage:
/// ```dart
/// import 'package:flutter_common/realtime/realtime.dart';
///
/// // Create client
/// final client = WebSocketClient(
///   config: WebSocketConfig(url: 'wss://realtime.example.com'),
///   getAuthToken: () => authService.accessToken,
/// );
///
/// // Connect
/// await client.connect();
///
/// // Join a room
/// await client.joinRoom('class:class_123');
///
/// // Listen for events
/// client.onEvent(WSEventType.sessionActivity).listen((data) {
///   print('Session activity: $data');
/// });
/// ```

library realtime;

export 'realtime_types.dart';
export 'websocket_client.dart';
export 'presence_provider.dart';
export 'live_session_provider.dart';
