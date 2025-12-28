import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' show Color;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:rxdart/rxdart.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import 'models/aivo_notification.dart';
import 'models/notification_channel.dart';
import 'models/notification_preferences.dart';
import 'coppa_validator.dart';
import 'notification_analytics.dart';

/// Callback types
typedef NotificationHandler = void Function(AivoNotification notification);
typedef TokenRefreshHandler = void Function(String? token);

/// Exception when notification permission is denied
class NotificationPermissionDeniedException implements Exception {
  final String message = 'Notification permission was denied';

  @override
  String toString() => message;
}

/// Main notification service for Aivo apps
class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  final _notificationStreamController = BehaviorSubject<AivoNotification>();
  final _tokenStreamController = BehaviorSubject<String?>();

  /// Stream of received notifications
  Stream<AivoNotification> get notificationStream =>
      _notificationStreamController.stream;

  /// Stream of FCM token updates
  Stream<String?> get tokenStream => _tokenStreamController.stream;

  String? _currentToken;
  bool _initialized = false;
  NotificationPreferences _preferences = const NotificationPreferences();
  NotificationAnalytics? _analytics;

  /// Current FCM token
  String? get currentToken => _currentToken;

  /// Whether the service is initialized
  bool get isInitialized => _initialized;

  /// Initialize the notification service
  Future<void> initialize({
    required NotificationHandler onNotificationTapped,
    required NotificationHandler onNotificationReceived,
    required TokenRefreshHandler onTokenRefresh,
    NotificationAnalytics? analytics,
    bool isChildDevice = false,
  }) async {
    if (_initialized) return;

    _analytics = analytics;

    // Initialize timezone data
    tz_data.initializeTimeZones();

    // Initialize Firebase if not already done
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp();
    }

    // Request permission
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
      announcement: true,
      carPlay: false,
      criticalAlert: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      throw NotificationPermissionDeniedException();
    }

    // Load saved preferences
    await _loadPreferences();

    // Initialize local notifications
    await _initializeLocalNotifications(onNotificationTapped);

    // Create Android notification channels
    if (Platform.isAndroid) {
      await _createAndroidChannels();
    }

    // Get initial token
    _currentToken = await _fcm.getToken();
    _tokenStreamController.add(_currentToken);
    onTokenRefresh(_currentToken);

    // Listen for token refresh
    _fcm.onTokenRefresh.listen((token) {
      _currentToken = token;
      _tokenStreamController.add(token);
      onTokenRefresh(token);
    });

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((message) {
      final notification = AivoNotification.fromRemoteMessage(message);

      // COPPA compliance check for child devices
      if (isChildDevice) {
        if (!CoppaNotificationValidator.isCompliant(
          notification.title,
          notification.body,
        )) {
          _analytics?.logBlockedNotification(
            notification,
            'COPPA violation',
          );
          return; // Don't show non-compliant notifications
        }
      }

      _notificationStreamController.add(notification);
      onNotificationReceived(notification);
      _showLocalNotification(notification);
      _analytics?.logNotificationReceived(notification);
    });

    // Handle background/terminated message taps
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      final notification = AivoNotification.fromRemoteMessage(message);
      onNotificationTapped(notification);
      _analytics?.logNotificationTapped(notification);
    });

    // Check for initial message (app opened from terminated state)
    final initialMessage = await _fcm.getInitialMessage();
    if (initialMessage != null) {
      final notification = AivoNotification.fromRemoteMessage(initialMessage);
      onNotificationTapped(notification);
      _analytics?.logNotificationTapped(notification);
    }

    _initialized = true;
  }

  Future<void> _initializeLocalNotifications(
    NotificationHandler onNotificationTapped,
  ) async {
    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      settings,
      onDidReceiveNotificationResponse: (response) {
        if (response.payload != null) {
          try {
            final data = jsonDecode(response.payload!);
            final notification = AivoNotification.fromJson(data);
            onNotificationTapped(notification);
            _analytics?.logNotificationTapped(notification);
          } catch (e) {
            // Handle parsing error
          }
        }
      },
    );
  }

  Future<void> _createAndroidChannels() async {
    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();

    if (androidPlugin == null) return;

    for (final channel in AivoNotificationChannels.all) {
      await androidPlugin.createNotificationChannel(
        AndroidNotificationChannel(
          channel.id,
          channel.name,
          description: channel.description,
          importance: _mapPriority(channel.defaultPriority),
          showBadge: channel.showBadge,
          playSound: channel.playSound,
          enableVibration: channel.enableVibration,
          enableLights: channel.enableLights,
          sound: channel.soundFile != null
              ? RawResourceAndroidNotificationSound(channel.soundFile!)
              : null,
          ledColor: channel.lightColor != null
              ? Color(channel.lightColor!)
              : null,
        ),
      );
    }
  }

  Importance _mapPriority(NotificationPriority priority) {
    switch (priority) {
      case NotificationPriority.high:
        return Importance.high;
      case NotificationPriority.low:
        return Importance.low;
      default:
        return Importance.defaultImportance;
    }
  }

  /// Show a local notification
  Future<void> _showLocalNotification(AivoNotification notification) async {
    // Check preferences
    final channel =
        AivoNotificationChannels.getChannelForType(notification.type);
    if (!_preferences.isTypeEnabled(channel.id)) {
      return;
    }

    // Check quiet hours
    if (_preferences.isInQuietHours()) {
      return;
    }

    // Download image if present
    String? bigPicturePath;
    if (notification.imageUrl != null) {
      bigPicturePath = await _downloadImage(notification.imageUrl!);
    }

    final androidDetails = AndroidNotificationDetails(
      channel.id,
      channel.name,
      channelDescription: channel.description,
      importance: _mapPriority(notification.priority),
      priority: notification.priority == NotificationPriority.high
          ? Priority.high
          : Priority.defaultPriority,
      showWhen: true,
      when: notification.receivedAt.millisecondsSinceEpoch,
      styleInformation: bigPicturePath != null
          ? BigPictureStyleInformation(
              FilePathAndroidBitmap(bigPicturePath),
              hideExpandedLargeIcon: true,
            )
          : BigTextStyleInformation(notification.body),
      category: _getCategoryForType(notification.type),
    );

    final iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      sound: channel.soundFile,
      threadIdentifier: notification.type,
      attachments: bigPicturePath != null
          ? [DarwinNotificationAttachment(bigPicturePath)]
          : null,
    );

    await _localNotifications.show(
      notification.id.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(android: androidDetails, iOS: iosDetails),
      payload: jsonEncode(notification.toJson()),
    );
  }

  AndroidNotificationCategory? _getCategoryForType(String type) {
    switch (type) {
      case 'teacher_message':
      case 'parent_message':
        return AndroidNotificationCategory.message;
      case 'session_reminder':
        return AndroidNotificationCategory.reminder;
      case 'student_struggling':
        return AndroidNotificationCategory.alarm;
      default:
        return null;
    }
  }

  Future<String?> _downloadImage(String url) async {
    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final directory = await getTemporaryDirectory();
        final fileName = url.hashCode.toString();
        final file = File('${directory.path}/$fileName');
        await file.writeAsBytes(response.bodyBytes);
        return file.path;
      }
    } catch (e) {
      // Ignore download errors
    }
    return null;
  }

  /// Subscribe to a topic
  Future<void> subscribeToTopic(String topic) async {
    await _fcm.subscribeToTopic(topic);
    _analytics?.logTopicSubscribed(topic);
  }

  /// Unsubscribe from a topic
  Future<void> unsubscribeFromTopic(String topic) async {
    await _fcm.unsubscribeFromTopic(topic);
    _analytics?.logTopicUnsubscribed(topic);
  }

  /// Update notification preferences
  Future<void> updatePreferences(NotificationPreferences preferences) async {
    _preferences = preferences;
    await _savePreferences();
  }

  /// Get current preferences
  NotificationPreferences get preferences => _preferences;

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString('notification_preferences');
    if (json != null) {
      _preferences = NotificationPreferences.fromJson(jsonDecode(json));
    }
  }

  Future<void> _savePreferences() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      'notification_preferences',
      jsonEncode(_preferences.toJson()),
    );
  }

  /// Update badge count (iOS)
  Future<void> updateBadgeCount(int count) async {
    if (Platform.isIOS) {
      await _localNotifications
          .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(badge: true);
    }
  }

  /// Clear all notifications
  Future<void> clearAll() async {
    await _localNotifications.cancelAll();
  }

  /// Cancel a specific notification
  Future<void> cancel(String id) async {
    await _localNotifications.cancel(id.hashCode);
  }

  /// Schedule a local notification
  Future<void> scheduleNotification({
    required String id,
    required String title,
    required String body,
    required DateTime scheduledTime,
    required String type,
    Map<String, dynamic>? data,
    bool isChildDevice = false,
  }) async {
    // COPPA compliance check for child devices
    if (isChildDevice) {
      if (!CoppaNotificationValidator.isCompliant(title, body)) {
        throw Exception('Notification content not COPPA compliant');
      }
      if (!CoppaNotificationValidator.isAllowedType(type)) {
        throw Exception('Notification type not allowed for children');
      }
    }

    final notification = AivoNotification(
      id: id,
      type: type,
      title: title,
      body: body,
      data: data ?? {},
      receivedAt: scheduledTime,
    );

    final channel = AivoNotificationChannels.getChannelForType(type);

    await _localNotifications.zonedSchedule(
      id.hashCode,
      title,
      body,
      tz.TZDateTime.from(scheduledTime, tz.local),
      NotificationDetails(
        android: AndroidNotificationDetails(
          channel.id,
          channel.name,
          channelDescription: channel.description,
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      payload: jsonEncode(notification.toJson()),
    );

    _analytics?.logNotificationScheduled(notification, scheduledTime);
  }

  /// Cancel a scheduled notification
  Future<void> cancelScheduledNotification(String id) async {
    await _localNotifications.cancel(id.hashCode);
  }

  /// Get pending scheduled notifications
  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    return _localNotifications.pendingNotificationRequests();
  }

  /// Dispose resources
  void dispose() {
    _notificationStreamController.close();
    _tokenStreamController.close();
  }
}

