import 'dart:isolate';
import 'dart:ui';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'models/aivo_notification.dart';
import 'models/notification_channel.dart';
import 'coppa_validator.dart';

/// Background message handler for Firebase Messaging
///
/// This must be a top-level function, not a class method
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Initialize Firebase if needed
  await Firebase.initializeApp();

  // Initialize local notifications for background
  final localNotifications = FlutterLocalNotificationsPlugin();
  const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
  const iosSettings = DarwinInitializationSettings();
  const settings = InitializationSettings(
    android: androidSettings,
    iOS: iosSettings,
  );
  await localNotifications.initialize(settings);

  // Parse notification
  final notification = AivoNotification.fromRemoteMessage(message);

  // Check if this is a child device
  final prefs = await SharedPreferences.getInstance();
  final isChildDevice = prefs.getBool('is_child_device') ?? false;

  // COPPA compliance for child devices
  if (isChildDevice) {
    if (!CoppaNotificationValidator.isCompliant(
      notification.title,
      notification.body,
    )) {
      return; // Don't show non-compliant notifications
    }
    if (!CoppaNotificationValidator.isAllowedType(notification.type)) {
      return; // Don't show disallowed types for children
    }
  }

  // Get channel for type
  final channel = AivoNotificationChannels.getChannelForType(notification.type);

  // Show notification
  await localNotifications.show(
    notification.id.hashCode,
    notification.title,
    notification.body,
    NotificationDetails(
      android: AndroidNotificationDetails(
        channel.id,
        channel.name,
        channelDescription: channel.description,
        importance: notification.priority == NotificationPriority.high
            ? Importance.high
            : Importance.defaultImportance,
        priority: notification.priority == NotificationPriority.high
            ? Priority.high
            : Priority.defaultPriority,
      ),
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        threadIdentifier: notification.type,
      ),
    ),
  );

  // Store notification for later retrieval
  await _storeBackgroundNotification(notification);

  // Send to port if registered (for data sync)
  _sendToPort(notification);
}

/// Store background notification for retrieval when app opens
Future<void> _storeBackgroundNotification(AivoNotification notification) async {
  final prefs = await SharedPreferences.getInstance();
  final stored = prefs.getStringList('background_notifications') ?? [];

  // Limit to last 50 notifications
  if (stored.length >= 50) {
    stored.removeAt(0);
  }

  stored.add(notification.toJson().toString());
  await prefs.setStringList('background_notifications', stored);
}

/// Send notification to isolate port if registered
void _sendToPort(AivoNotification notification) {
  final port = IsolateNameServer.lookupPortByName('notification_port');
  port?.send(notification.toJson());
}

/// Retrieve and clear background notifications
Future<List<AivoNotification>> getBackgroundNotifications() async {
  final prefs = await SharedPreferences.getInstance();
  final stored = prefs.getStringList('background_notifications') ?? [];
  await prefs.remove('background_notifications');

  return stored.map((json) {
    try {
      // Parse stored notification
      // Note: Actual implementation would parse properly
      return AivoNotification(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        type: 'background',
        title: 'Background Notification',
        body: json,
        data: {},
        receivedAt: DateTime.now(),
      );
    } catch (e) {
      return null;
    }
  }).whereType<AivoNotification>().toList();
}

/// Register port for receiving background notifications
void registerBackgroundNotificationPort(ReceivePort receivePort) {
  IsolateNameServer.removePortNameMapping('notification_port');
  IsolateNameServer.registerPortWithName(
    receivePort.sendPort,
    'notification_port',
  );
}

/// Unregister background notification port
void unregisterBackgroundNotificationPort() {
  IsolateNameServer.removePortNameMapping('notification_port');
}

/// Configuration for background handler
class BackgroundHandlerConfig {
  /// Mark device as child device for COPPA compliance
  static Future<void> setChildDevice(bool isChild) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('is_child_device', isChild);
  }

  /// Check if device is marked as child device
  static Future<bool> isChildDevice() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('is_child_device') ?? false;
  }
}
