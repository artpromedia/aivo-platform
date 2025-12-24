/// WebSocket Event Types
///
/// Enum of all events supported by the realtime service.
enum WSEventType {
  // Connection events
  connect('connect'),
  disconnect('disconnect'),
  error('error'),
  reconnect('reconnect'),

  // Room events
  roomJoin('room:join'),
  roomJoined('room:joined'),
  roomLeave('room:leave'),
  roomLeft('room:left'),
  roomMessage('room:message'),
  roomError('room:error'),

  // Presence events
  presenceUpdate('presence:update'),
  presenceSync('presence:sync'),
  presenceLeft('presence:left'),

  // Collaboration events
  collabOperation('collab:operation'),
  collabCursor('collab:cursor'),
  collabSelection('collab:selection'),
  collabLock('collab:lock'),
  collabUnlock('collab:unlock'),
  collabState('collab:state'),

  // Session events
  sessionActivity('session:activity'),
  sessionProgress('session:progress'),
  sessionComplete('session:complete'),

  // Analytics events
  analyticsSubscribe('analytics:subscribe'),
  analyticsUpdate('analytics:update'),
  analyticsAlert('analytics:alert'),
  alertAcknowledge('alert:acknowledge'),

  // Control events
  heartbeat('heartbeat'),
  pong('pong');

  const WSEventType(this.value);
  final String value;

  static WSEventType? fromValue(String value) {
    return WSEventType.values.cast<WSEventType?>().firstWhere(
          (e) => e?.value == value,
          orElse: () => null,
        );
  }
}

/// User presence status
enum PresenceStatus {
  online('online'),
  away('away'),
  busy('busy'),
  offline('offline');

  const PresenceStatus(this.value);
  final String value;

  static PresenceStatus fromValue(String value) {
    return PresenceStatus.values.firstWhere(
      (e) => e.value == value,
      orElse: () => PresenceStatus.offline,
    );
  }
}

/// User presence information
class UserPresence {
  final String odId;
  final String displayName;
  final String tenantId;
  final PresenceStatus status;
  final DateTime lastSeen;
  final String? currentActivity;
  final Map<String, dynamic>? cursor;

  UserPresence({
    required this.odId,
    required this.displayName,
    required this.tenantId,
    required this.status,
    required this.lastSeen,
    this.currentActivity,
    this.cursor,
  });

  factory UserPresence.fromJson(Map<String, dynamic> json) {
    return UserPresence(
      odId: json['userId'] as String,
      displayName: json['displayName'] as String,
      tenantId: json['tenantId'] as String,
      status: PresenceStatus.fromValue(json['status'] as String),
      lastSeen: DateTime.parse(json['lastSeen'] as String),
      currentActivity: json['currentActivity'] as String?,
      cursor: json['cursor'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
        'userId': odId,
        'displayName': displayName,
        'tenantId': tenantId,
        'status': status.value,
        'lastSeen': lastSeen.toIso8601String(),
        if (currentActivity != null) 'currentActivity': currentActivity,
        if (cursor != null) 'cursor': cursor,
      };
}

/// Room member information
class RoomMember {
  final String odId;
  final String displayName;
  final String role;
  final DateTime joinedAt;
  final String? color;

  RoomMember({
    required this.odId,
    required this.displayName,
    required this.role,
    required this.joinedAt,
    this.color,
  });

  factory RoomMember.fromJson(Map<String, dynamic> json) {
    return RoomMember(
      odId: json['userId'] as String,
      displayName: json['displayName'] as String,
      role: json['role'] as String,
      joinedAt: DateTime.parse(json['joinedAt'] as String),
      color: json['color'] as String?,
    );
  }
}

/// Room state
class RoomState {
  final String roomId;
  final String type;
  final List<RoomMember> members;
  final bool locked;
  final String? lockedBy;
  final int version;

  RoomState({
    required this.roomId,
    required this.type,
    required this.members,
    required this.locked,
    this.lockedBy,
    required this.version,
  });

  factory RoomState.fromJson(Map<String, dynamic> json) {
    return RoomState(
      roomId: json['roomId'] as String,
      type: json['type'] as String,
      members: (json['members'] as List)
          .map((m) => RoomMember.fromJson(m as Map<String, dynamic>))
          .toList(),
      locked: json['locked'] as bool? ?? false,
      lockedBy: json['lockedBy'] as String?,
      version: json['version'] as int? ?? 0,
    );
  }
}

/// Live session update
class LiveSessionUpdate {
  final String sessionId;
  final String studentId;
  final String studentName;
  final String classId;
  final String status;
  final int progress;
  final int? score;
  final String? currentActivity;
  final String? currentSkill;
  final DateTime timestamp;

  LiveSessionUpdate({
    required this.sessionId,
    required this.studentId,
    required this.studentName,
    required this.classId,
    required this.status,
    required this.progress,
    this.score,
    this.currentActivity,
    this.currentSkill,
    required this.timestamp,
  });

  factory LiveSessionUpdate.fromJson(Map<String, dynamic> json) {
    return LiveSessionUpdate(
      sessionId: json['sessionId'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      classId: json['classId'] as String,
      status: json['status'] as String,
      progress: json['progress'] as int,
      score: json['score'] as int?,
      currentActivity: json['currentActivity'] as String?,
      currentSkill: json['currentSkill'] as String?,
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }
}

/// Live alert
class LiveAlert {
  final String id;
  final String type;
  final String severity;
  final String studentId;
  final String studentName;
  final String classId;
  final String message;
  final DateTime timestamp;
  final bool acknowledged;

  LiveAlert({
    required this.id,
    required this.type,
    required this.severity,
    required this.studentId,
    required this.studentName,
    required this.classId,
    required this.message,
    required this.timestamp,
    this.acknowledged = false,
  });

  factory LiveAlert.fromJson(Map<String, dynamic> json) {
    return LiveAlert(
      id: json['id'] as String,
      type: json['type'] as String,
      severity: json['severity'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      classId: json['classId'] as String,
      message: json['message'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      acknowledged: json['acknowledged'] as bool? ?? false,
    );
  }

  LiveAlert copyWith({bool? acknowledged}) {
    return LiveAlert(
      id: id,
      type: type,
      severity: severity,
      studentId: studentId,
      studentName: studentName,
      classId: classId,
      message: message,
      timestamp: timestamp,
      acknowledged: acknowledged ?? this.acknowledged,
    );
  }
}
