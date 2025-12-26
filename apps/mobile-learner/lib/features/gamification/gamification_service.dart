/// Gamification service for mobile learner app
library;

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'gamification_models.dart';

/// Service for interacting with the gamification backend
class GamificationService {
  final String baseUrl;
  final String Function() getAuthToken;
  final String studentId;

  GamificationService({
    required this.baseUrl,
    required this.getAuthToken,
    required this.studentId,
  });

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${getAuthToken()}',
  };

  /// Get player profile
  Future<PlayerProfile> getProfile() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/profile?studentId=$studentId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load profile: ${response.statusCode}');
    }

    return PlayerProfile.fromJson(json.decode(response.body));
  }

  /// Get daily progress
  Future<DailyProgress> getDailyProgress() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/daily-progress?studentId=$studentId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load daily progress');
    }

    return DailyProgress.fromJson(json.decode(response.body));
  }

  /// Get achievements
  Future<List<Achievement>> getAchievements({String? category, bool? earnedOnly}) async {
    var url = '$baseUrl/api/gamification/achievements?studentId=$studentId';
    if (category != null) url += '&category=$category';
    if (earnedOnly != null) url += '&earnedOnly=$earnedOnly';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load achievements');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => Achievement.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get streak data
  Future<Streak> getStreak() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/streaks?studentId=$studentId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load streak');
    }

    return Streak.fromJson(json.decode(response.body));
  }

  /// Get streak calendar
  Future<List<StreakDay>> getStreakCalendar({int days = 30}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/streaks/calendar?studentId=$studentId&days=$days'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load streak calendar');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => StreakDay.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Use a streak freeze
  Future<bool> useStreakFreeze() async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/gamification/streaks/freeze'),
      headers: _headers,
      body: json.encode({'studentId': studentId}),
    );

    if (response.statusCode != 200) {
      return false;
    }

    final data = json.decode(response.body);
    return data['success'] as bool? ?? false;
  }

  /// Get active challenges
  Future<List<Challenge>> getChallenges({ChallengeType? type}) async {
    var url = '$baseUrl/api/gamification/challenges?studentId=$studentId';
    if (type != null) url += '&type=${type.name}';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load challenges');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => Challenge.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get leaderboard
  Future<List<LeaderboardEntry>> getLeaderboard({
    String scope = 'class',
    String period = 'weekly',
    String? classId,
    int limit = 10,
  }) async {
    var url = '$baseUrl/api/gamification/leaderboard?studentId=$studentId&scope=$scope&period=$period&limit=$limit';
    if (classId != null) url += '&classId=$classId';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load leaderboard');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => LeaderboardEntry.fromJson(
      e as Map<String, dynamic>,
      currentUserId: studentId,
    )).toList();
  }

  /// Get player rank
  Future<int> getPlayerRank({String scope = 'class', String period = 'weekly', String? classId}) async {
    var url = '$baseUrl/api/gamification/leaderboard/rank?studentId=$studentId&scope=$scope&period=$period';
    if (classId != null) url += '&classId=$classId';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load rank');
    }

    final data = json.decode(response.body);
    return data['rank'] as int;
  }

  /// Get shop items
  Future<List<ShopItem>> getShopItems({ShopItemCategory? category}) async {
    var url = '$baseUrl/api/gamification/shop?studentId=$studentId';
    if (category != null) url += '&category=${category.name}';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load shop items');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => ShopItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Purchase an item
  Future<bool> purchaseItem(String itemId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/gamification/shop/purchase'),
      headers: _headers,
      body: json.encode({
        'studentId': studentId,
        'itemId': itemId,
      }),
    );

    if (response.statusCode != 200) {
      final data = json.decode(response.body);
      throw GamificationException(data['error'] as String? ?? 'Purchase failed');
    }

    return true;
  }

  /// Equip an item
  Future<bool> equipItem(String itemId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/gamification/shop/equip'),
      headers: _headers,
      body: json.encode({
        'studentId': studentId,
        'itemId': itemId,
      }),
    );

    return response.statusCode == 200;
  }

  /// Get inventory
  Future<List<ShopItem>> getInventory() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/shop/inventory?studentId=$studentId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load inventory');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => ShopItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Start a learning session (for anti-addiction tracking)
  Future<SessionStartResult> startSession({String? classId}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/gamification/session/start'),
      headers: _headers,
      body: json.encode({
        'studentId': studentId,
        if (classId != null) 'classId': classId,
      }),
    );

    if (response.statusCode != 200) {
      throw GamificationException('Failed to start session');
    }

    return SessionStartResult.fromJson(json.decode(response.body));
  }

  /// End a learning session
  Future<void> endSession(String sessionId) async {
    await http.post(
      Uri.parse('$baseUrl/api/gamification/session/end'),
      headers: _headers,
      body: json.encode({'sessionId': sessionId}),
    );
  }

  /// Session heartbeat
  Future<SessionHeartbeatResult> sessionHeartbeat(String sessionId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/gamification/session/heartbeat'),
      headers: _headers,
      body: json.encode({'sessionId': sessionId}),
    );

    if (response.statusCode != 200) {
      throw GamificationException('Heartbeat failed');
    }

    return SessionHeartbeatResult.fromJson(json.decode(response.body));
  }

  /// Get today's usage in minutes
  Future<int> getTodayUsage() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/session/today-usage?studentId=$studentId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      return 0;
    }

    final data = json.decode(response.body);
    return data['minutes'] as int;
  }
}

/// Session start result
class SessionStartResult {
  final String sessionId;
  final int remainingDailyMinutes;
  final bool isLimited;
  final String? message;

  SessionStartResult({
    required this.sessionId,
    required this.remainingDailyMinutes,
    required this.isLimited,
    this.message,
  });

  factory SessionStartResult.fromJson(Map<String, dynamic> json) {
    return SessionStartResult(
      sessionId: json['sessionId'] as String? ?? '',
      remainingDailyMinutes: json['remainingDailyMinutes'] as int,
      isLimited: json['isLimited'] as bool,
      message: json['message'] as String?,
    );
  }
}

/// Session heartbeat result
class SessionHeartbeatResult {
  final bool shouldBreak;
  final String? message;

  SessionHeartbeatResult({
    required this.shouldBreak,
    this.message,
  });

  factory SessionHeartbeatResult.fromJson(Map<String, dynamic> json) {
    return SessionHeartbeatResult(
      shouldBreak: json['shouldBreak'] as bool,
      message: json['message'] as String?,
    );
  }
}

/// Gamification exception
class GamificationException implements Exception {
  final String message;
  GamificationException(this.message);

  @override
  String toString() => 'GamificationException: $message';
}
