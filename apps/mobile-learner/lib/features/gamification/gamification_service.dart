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

  // ==========================================================================
  // TEAM API (Sprint 3.1)
  // ==========================================================================

  /// Get student's current team
  Future<TeamDetails?> getStudentTeam() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/teams/my-team?studentId=$studentId'),
      headers: _headers,
    );

    if (response.statusCode == 404) {
      return null;
    }

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load team');
    }

    final data = json.decode(response.body);
    return TeamDetails.fromJson(data['data'] ?? data);
  }

  /// Get team details by ID
  Future<TeamDetails> getTeamDetails(String teamId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/teams/$teamId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load team details');
    }

    final data = json.decode(response.body);
    return TeamDetails.fromJson(data['data'] ?? data);
  }

  /// Get team members
  Future<List<TeamMember>> getTeamMembers(String teamId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/teams/$teamId/members'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load team members');
    }

    final List<dynamic> data = json.decode(response.body)['data'] ?? json.decode(response.body);
    return data.map((e) => TeamMember.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Search for teams
  Future<List<Team>> searchTeams(String query, {TeamType? type, String? schoolId}) async {
    var url = '$baseUrl/api/gamification/teams?q=$query';
    if (type != null) url += '&type=${type.name}';
    if (schoolId != null) url += '&schoolId=$schoolId';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw GamificationException('Failed to search teams');
    }

    final data = json.decode(response.body);
    final List<dynamic> teams = data['data'] ?? data;
    return teams.map((e) => Team.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get team leaderboard
  Future<List<Team>> getTeamLeaderboard({String? schoolId, int limit = 20}) async {
    var url = '$baseUrl/api/gamification/teams?limit=$limit';
    if (schoolId != null) url += '&schoolId=$schoolId';

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load team leaderboard');
    }

    final data = json.decode(response.body);
    final List<dynamic> teams = data['data'] ?? data;
    return teams.map((e) => Team.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Create a new team
  Future<Team> createTeam({
    required String name,
    String? description,
    required TeamType type,
    bool isPublic = true,
    int maxMembers = 20,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/gamification/teams'),
      headers: {..._headers, 'x-student-id': studentId},
      body: json.encode({
        'name': name,
        'description': description ?? '',
        'type': type.name,
        'isPublic': isPublic,
        'maxMembers': maxMembers,
        'creatorId': studentId,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      final data = json.decode(response.body);
      throw GamificationException(data['error'] ?? 'Failed to create team');
    }

    final data = json.decode(response.body);
    return Team.fromJson(data['data'] ?? data);
  }

  /// Join a team
  Future<bool> joinTeam(String teamId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/gamification/teams/$teamId/join'),
      headers: {..._headers, 'x-student-id': studentId},
      body: json.encode({}),
    );

    if (response.statusCode != 200) {
      final data = json.decode(response.body);
      throw GamificationException(data['error'] ?? 'Failed to join team');
    }

    final data = json.decode(response.body);
    return data['data']?['joined'] ?? data['joined'] ?? true;
  }

  /// Leave a team
  Future<bool> leaveTeam(String teamId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/gamification/teams/$teamId/leave'),
      headers: {..._headers, 'x-student-id': studentId},
      body: json.encode({}),
    );

    if (response.statusCode != 200) {
      throw GamificationException('Failed to leave team');
    }

    return true;
  }

  /// Get pending team invites
  Future<List<TeamInvite>> getTeamInvites() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/students/$studentId/team-invites'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      return [];
    }

    final data = json.decode(response.body);
    final List<dynamic> invites = data['data'] ?? data;
    return invites.map((e) => TeamInvite.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Respond to a team invite
  Future<bool> respondToTeamInvite(String inviteId, {required bool accept}) async {
    final action = accept ? 'accept' : 'decline';
    final response = await http.post(
      Uri.parse('$baseUrl/api/gamification/team-invites/$inviteId/$action'),
      headers: _headers,
      body: json.encode({}),
    );

    return response.statusCode == 200;
  }

  // ==========================================================================
  // COMPETITION API (Sprint 3.1)
  // ==========================================================================

  /// Get active competitions
  Future<List<Competition>> getCompetitions({
    CompetitionType? type,
    String? schoolId,
    bool forStudent = true,
  }) async {
    var url = '$baseUrl/api/gamification/competitions';
    final params = <String>[];
    if (type != null) params.add('type=${type.name}');
    if (schoolId != null) params.add('schoolId=$schoolId');
    if (forStudent) params.add('forStudent=true');
    if (params.isNotEmpty) url += '?${params.join('&')}';

    final response = await http.get(
      Uri.parse(url),
      headers: forStudent ? {..._headers, 'x-student-id': studentId} : _headers,
    );

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load competitions');
    }

    final data = json.decode(response.body);
    final List<dynamic> competitions = data['data'] ?? data;
    return competitions.map((e) => Competition.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get recommended competitions
  Future<List<Competition>> getRecommendedCompetitions() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/competitions/recommended'),
      headers: {..._headers, 'x-student-id': studentId},
    );

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load recommended competitions');
    }

    final data = json.decode(response.body);
    final List<dynamic> competitions = data['data'] ?? data;
    return competitions.map((e) => Competition.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get competition details
  Future<Competition> getCompetitionDetails(String competitionId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/competitions/$competitionId'),
      headers: {..._headers, 'x-student-id': studentId},
    );

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load competition details');
    }

    final data = json.decode(response.body);
    return Competition.fromJson(data['data'] ?? data);
  }

  /// Get competition leaderboard
  Future<List<CompetitionParticipant>> getCompetitionLeaderboard(
    String competitionId, {
    int limit = 20,
  }) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/competitions/$competitionId/leaderboard?limit=$limit'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw GamificationException('Failed to load competition leaderboard');
    }

    final data = json.decode(response.body);
    final List<dynamic> participants = data['data'] ?? data;
    return participants.map((e) => CompetitionParticipant.fromJson(
      e as Map<String, dynamic>,
      currentUserId: studentId,
    )).toList();
  }

  /// Join a competition
  Future<bool> joinCompetition(String competitionId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/gamification/competitions/$competitionId/join'),
      headers: {..._headers, 'x-student-id': studentId},
      body: json.encode({}),
    );

    if (response.statusCode != 200) {
      final data = json.decode(response.body);
      throw GamificationException(data['error'] ?? 'Failed to join competition');
    }

    return true;
  }

  /// Leave a competition
  Future<bool> leaveCompetition(String competitionId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/gamification/competitions/$competitionId/leave'),
      headers: {..._headers, 'x-student-id': studentId},
      body: json.encode({}),
    );

    return response.statusCode == 200;
  }

  /// Get student's active competition standings
  Future<List<CompetitionStanding>> getMyCompetitionStandings() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/students/$studentId/competitions'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      return [];
    }

    final data = json.decode(response.body);
    final List<dynamic> standings = data['data'] ?? data;
    return standings.map((e) => CompetitionStanding.fromJson(e as Map<String, dynamic>)).toList();
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
