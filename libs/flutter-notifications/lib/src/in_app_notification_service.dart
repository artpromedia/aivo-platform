import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:rxdart/rxdart.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// In-app notification model
class InAppNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final String? imageUrl;
  final String? actionUrl;
  final bool isRead;
  final DateTime? readAt;
  final bool isDismissed;
  final String priority;
  final String? groupKey;
  final DateTime createdAt;

  const InAppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.imageUrl,
    this.actionUrl,
    required this.isRead,
    this.readAt,
    required this.isDismissed,
    required this.priority,
    this.groupKey,
    required this.createdAt,
  });

  factory InAppNotification.fromJson(Map<String, dynamic> json) {
    return InAppNotification(
      id: json['id'] as String,
      type: json['type'] as String,
      title: json['title'] as String,
      body: json['body'] as String,
      imageUrl: json['imageUrl'] as String?,
      actionUrl: json['actionUrl'] as String?,
      isRead: json['isRead'] as bool,
      readAt: json['readAt'] != null
          ? DateTime.parse(json['readAt'] as String)
          : null,
      isDismissed: json['isDismissed'] as bool,
      priority: json['priority'] as String,
      groupKey: json['groupKey'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'title': title,
      'body': body,
      'imageUrl': imageUrl,
      'actionUrl': actionUrl,
      'isRead': isRead,
      'readAt': readAt?.toIso8601String(),
      'isDismissed': isDismissed,
      'priority': priority,
      'groupKey': groupKey,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  InAppNotification copyWith({
    String? id,
    String? type,
    String? title,
    String? body,
    String? imageUrl,
    String? actionUrl,
    bool? isRead,
    DateTime? readAt,
    bool? isDismissed,
    String? priority,
    String? groupKey,
    DateTime? createdAt,
  }) {
    return InAppNotification(
      id: id ?? this.id,
      type: type ?? this.type,
      title: title ?? this.title,
      body: body ?? this.body,
      imageUrl: imageUrl ?? this.imageUrl,
      actionUrl: actionUrl ?? this.actionUrl,
      isRead: isRead ?? this.isRead,
      readAt: readAt ?? this.readAt,
      isDismissed: isDismissed ?? this.isDismissed,
      priority: priority ?? this.priority,
      groupKey: groupKey ?? this.groupKey,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

/// Paginated response for notifications
class PaginatedNotifications {
  final List<InAppNotification> data;
  final int total;
  final int page;
  final int pageSize;
  final bool hasMore;

  const PaginatedNotifications({
    required this.data,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.hasMore,
  });

  factory PaginatedNotifications.fromJson(Map<String, dynamic> json) {
    return PaginatedNotifications(
      data: (json['data'] as List)
          .map((e) => InAppNotification.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int,
      page: json['page'] as int,
      pageSize: json['pageSize'] as int,
      hasMore: json['hasMore'] as bool,
    );
  }
}

/// Service for managing in-app notifications
class InAppNotificationService {
  final String baseUrl;
  final Future<String> Function() getAuthToken;
  final Duration pollInterval;
  final Duration cacheExpiry;

  final _notificationsController = BehaviorSubject<List<InAppNotification>>.seeded([]);
  final _unreadCountController = BehaviorSubject<int>.seeded(0);
  final _errorController = BehaviorSubject<String?>.seeded(null);
  final _loadingController = BehaviorSubject<bool>.seeded(false);

  Timer? _pollTimer;
  int _currentPage = 1;
  bool _hasMore = true;
  DateTime? _lastFetched;
  bool _initialized = false;

  /// Stream of notifications
  Stream<List<InAppNotification>> get notifications => _notificationsController.stream;

  /// Stream of unread count
  Stream<int> get unreadCount => _unreadCountController.stream;

  /// Stream of error messages
  Stream<String?> get error => _errorController.stream;

  /// Stream of loading state
  Stream<bool> get isLoading => _loadingController.stream;

  /// Current unread count
  int get currentUnreadCount => _unreadCountController.value;

  /// Current notifications
  List<InAppNotification> get currentNotifications => _notificationsController.value;

  InAppNotificationService({
    required this.baseUrl,
    required this.getAuthToken,
    this.pollInterval = const Duration(seconds: 30),
    this.cacheExpiry = const Duration(minutes: 5),
  });

  /// Initialize the service
  Future<void> initialize() async {
    if (_initialized) return;

    // Load cached notifications
    await _loadFromCache();

    // Fetch fresh data
    await refresh();

    // Start polling
    _startPolling();

    _initialized = true;
  }

  /// Dispose resources
  void dispose() {
    _pollTimer?.cancel();
    _notificationsController.close();
    _unreadCountController.close();
    _errorController.close();
    _loadingController.close();
  }

  /// Refresh notifications from server
  Future<void> refresh() async {
    _currentPage = 1;
    _hasMore = true;
    await _fetchNotifications(reset: true);
  }

  /// Load more notifications (pagination)
  Future<void> loadMore() async {
    if (!_hasMore || _loadingController.value) return;
    _currentPage++;
    await _fetchNotifications(reset: false);
  }

  /// Mark a notification as read
  Future<void> markAsRead(String notificationId) async {
    try {
      await _request(
        'POST',
        '/notifications/in-app/$notificationId/read',
      );

      // Update local state
      final notifications = List<InAppNotification>.from(_notificationsController.value);
      final index = notifications.indexWhere((n) => n.id == notificationId);
      if (index != -1 && !notifications[index].isRead) {
        notifications[index] = notifications[index].copyWith(
          isRead: true,
          readAt: DateTime.now(),
        );
        _notificationsController.add(notifications);
        _unreadCountController.add((_unreadCountController.value - 1).clamp(0, double.maxFinite.toInt()));
      }

      await _saveToCache();
    } catch (e) {
      _errorController.add('Failed to mark notification as read');
    }
  }

  /// Mark all notifications as read
  Future<void> markAllAsRead() async {
    try {
      await _request('POST', '/notifications/in-app/read-all');

      // Update local state
      final notifications = _notificationsController.value
          .map((n) => n.copyWith(isRead: true, readAt: DateTime.now()))
          .toList();
      _notificationsController.add(notifications);
      _unreadCountController.add(0);

      await _saveToCache();
    } catch (e) {
      _errorController.add('Failed to mark all as read');
    }
  }

  /// Dismiss a notification
  Future<void> dismiss(String notificationId) async {
    try {
      await _request(
        'POST',
        '/notifications/in-app/$notificationId/dismiss',
      );

      // Update local state
      final notifications = _notificationsController.value
          .where((n) => n.id != notificationId)
          .toList();
      _notificationsController.add(notifications);

      await _saveToCache();
    } catch (e) {
      _errorController.add('Failed to dismiss notification');
    }
  }

  /// Delete a notification
  Future<void> delete(String notificationId) async {
    try {
      await _request(
        'DELETE',
        '/notifications/in-app/$notificationId',
      );

      // Update local state
      final notifications = _notificationsController.value;
      final notification = notifications.firstWhere(
        (n) => n.id == notificationId,
        orElse: () => throw Exception('Not found'),
      );

      final updatedNotifications = notifications
          .where((n) => n.id != notificationId)
          .toList();
      _notificationsController.add(updatedNotifications);

      if (!notification.isRead) {
        _unreadCountController.add((_unreadCountController.value - 1).clamp(0, double.maxFinite.toInt()));
      }

      await _saveToCache();
    } catch (e) {
      _errorController.add('Failed to delete notification');
    }
  }

  /// Fetch notifications from server
  Future<void> _fetchNotifications({required bool reset}) async {
    _loadingController.add(true);
    _errorController.add(null);

    try {
      final response = await _request(
        'GET',
        '/notifications/in-app?page=$_currentPage&pageSize=20',
      );

      final paginated = PaginatedNotifications.fromJson(response);
      _hasMore = paginated.hasMore;

      if (reset) {
        _notificationsController.add(paginated.data);
      } else {
        final existing = List<InAppNotification>.from(_notificationsController.value);
        existing.addAll(paginated.data);
        _notificationsController.add(existing);
      }

      // Also fetch unread count
      final unreadResponse = await _request(
        'GET',
        '/notifications/in-app/unread-count',
      );
      _unreadCountController.add(unreadResponse['count'] as int);

      _lastFetched = DateTime.now();
      await _saveToCache();
    } catch (e) {
      _errorController.add('Failed to fetch notifications');
      debugPrint('Error fetching notifications: $e');
    } finally {
      _loadingController.add(false);
    }
  }

  /// Make HTTP request
  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final token = await getAuthToken();
    final uri = Uri.parse('$baseUrl$path');

    http.Response response;
    final headers = {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };

    switch (method) {
      case 'GET':
        response = await http.get(uri, headers: headers);
        break;
      case 'POST':
        response = await http.post(
          uri,
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      case 'DELETE':
        response = await http.delete(uri, headers: headers);
        break;
      default:
        throw Exception('Unsupported HTTP method: $method');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Request failed: ${response.statusCode}');
    }
  }

  /// Start polling for new notifications
  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(pollInterval, (_) {
      _fetchNotifications(reset: true);
    });
  }

  /// Stop polling
  void stopPolling() {
    _pollTimer?.cancel();
  }

  /// Resume polling
  void resumePolling() {
    _startPolling();
  }

  /// Load notifications from local cache
  Future<void> _loadFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString('in_app_notifications');
      final cachedCount = prefs.getInt('in_app_unread_count');
      final cachedTime = prefs.getInt('in_app_cache_time');

      if (cached != null && cachedTime != null) {
        final cacheTime = DateTime.fromMillisecondsSinceEpoch(cachedTime);
        if (DateTime.now().difference(cacheTime) < cacheExpiry) {
          final list = (jsonDecode(cached) as List)
              .map((e) => InAppNotification.fromJson(e as Map<String, dynamic>))
              .toList();
          _notificationsController.add(list);
          _unreadCountController.add(cachedCount ?? 0);
          _lastFetched = cacheTime;
        }
      }
    } catch (e) {
      debugPrint('Error loading from cache: $e');
    }
  }

  /// Save notifications to local cache
  Future<void> _saveToCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final notifications = _notificationsController.value
          .map((n) => n.toJson())
          .toList();

      await prefs.setString('in_app_notifications', jsonEncode(notifications));
      await prefs.setInt('in_app_unread_count', _unreadCountController.value);
      await prefs.setInt('in_app_cache_time', DateTime.now().millisecondsSinceEpoch);
    } catch (e) {
      debugPrint('Error saving to cache: $e');
    }
  }

  /// Clear local cache
  Future<void> clearCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('in_app_notifications');
    await prefs.remove('in_app_unread_count');
    await prefs.remove('in_app_cache_time');
  }
}
