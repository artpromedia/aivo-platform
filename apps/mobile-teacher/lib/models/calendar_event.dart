/// Calendar Event Model
///
/// Represents calendar events for the teacher's schedule:
/// class sessions, assignment deadlines, meetings, and custom events.
library;

import 'package:flutter/foundation.dart';

/// Calendar event type.
enum CalendarEventType {
  classSession,
  assignmentDue,
  meeting,
  custom,
}

/// A calendar event.
@immutable
class CalendarEvent {
  const CalendarEvent({
    required this.id,
    required this.title,
    required this.startTime,
    required this.eventType,
    this.description,
    this.endTime,
    this.classId,
    this.className,
    this.assignmentId,
    this.location,
    this.color,
    this.isAllDay = false,
    this.remindMinutesBefore,
    this.createdAt,
  });

  final String id;
  final String title;
  final String? description;
  final DateTime startTime;
  final DateTime? endTime;
  final CalendarEventType eventType;
  final String? classId;
  final String? className;
  final String? assignmentId;
  final String? location;
  final int? color;
  final bool isAllDay;
  final int? remindMinutesBefore;
  final DateTime? createdAt;

  /// Duration of the event (defaults to 1 hour if no end time).
  Duration get duration => endTime != null
      ? endTime!.difference(startTime)
      : const Duration(hours: 1);

  /// Whether the event is happening right now.
  bool get isHappeningNow {
    final now = DateTime.now();
    final end = endTime ?? startTime.add(const Duration(hours: 1));
    return now.isAfter(startTime) && now.isBefore(end);
  }

  /// Whether the event is in the past.
  bool get isPast {
    final end = endTime ?? startTime.add(const Duration(hours: 1));
    return DateTime.now().isAfter(end);
  }

  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    return CalendarEvent(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: json['endTime'] != null
          ? DateTime.parse(json['endTime'] as String)
          : null,
      eventType: CalendarEventType.values.firstWhere(
        (e) => e.name == json['eventType'],
        orElse: () => CalendarEventType.custom,
      ),
      classId: json['classId'] as String?,
      className: json['className'] as String?,
      assignmentId: json['assignmentId'] as String?,
      location: json['location'] as String?,
      color: json['color'] as int?,
      isAllDay: json['isAllDay'] as bool? ?? false,
      remindMinutesBefore: json['remindMinutesBefore'] as int?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'eventType': eventType.name,
      'classId': classId,
      'className': className,
      'assignmentId': assignmentId,
      'location': location,
      'color': color,
      'isAllDay': isAllDay,
      'remindMinutesBefore': remindMinutesBefore,
    };
  }

  CalendarEvent copyWith({
    String? id,
    String? title,
    String? description,
    DateTime? startTime,
    DateTime? endTime,
    CalendarEventType? eventType,
    String? classId,
    String? className,
    String? assignmentId,
    String? location,
    int? color,
    bool? isAllDay,
    int? remindMinutesBefore,
  }) {
    return CalendarEvent(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      eventType: eventType ?? this.eventType,
      classId: classId ?? this.classId,
      className: className ?? this.className,
      assignmentId: assignmentId ?? this.assignmentId,
      location: location ?? this.location,
      color: color ?? this.color,
      isAllDay: isAllDay ?? this.isAllDay,
      remindMinutesBefore: remindMinutesBefore ?? this.remindMinutesBefore,
      createdAt: createdAt,
    );
  }
}
