/// Visual Schedule Models - ND-1.3
///
/// Data models for the visual schedule system.

import 'package:flutter/foundation.dart';

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

/// Type of schedule
enum ScheduleType {
  daily,
  session,
  activity,
  custom,
}

/// Display style for schedules
enum ScheduleDisplayStyle {
  verticalList,
  horizontalStrip,
  grid,
  firstThen,
  nowNextLater,
}

/// Type of schedule item
enum ScheduleItemType {
  activity,
  breakTime,
  transition,
  reward,
  meal,
  custom,
}

/// Status of a schedule item
enum ScheduleItemStatus {
  upcoming,
  current,
  completed,
  skipped,
  inProgress,
}

// ══════════════════════════════════════════════════════════════════════════════
// MODELS
// ══════════════════════════════════════════════════════════════════════════════

/// A sub-item within a schedule item (for activity breakdowns)
@immutable
class ScheduleSubItem {
  final String id;
  final String title;
  final String? icon;
  final bool completed;

  const ScheduleSubItem({
    required this.id,
    required this.title,
    this.icon,
    this.completed = false,
  });

  factory ScheduleSubItem.fromJson(Map<String, dynamic> json) {
    return ScheduleSubItem(
      id: json['id'] as String,
      title: json['title'] as String,
      icon: json['icon'] as String?,
      completed: json['completed'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'icon': icon,
        'completed': completed,
      };

  ScheduleSubItem copyWith({
    String? id,
    String? title,
    String? icon,
    bool? completed,
  }) {
    return ScheduleSubItem(
      id: id ?? this.id,
      title: title ?? this.title,
      icon: icon ?? this.icon,
      completed: completed ?? this.completed,
    );
  }
}

/// A single item in a visual schedule
@immutable
class ScheduleItem {
  final String id;
  final String title;
  final ScheduleItemType type;
  final ScheduleItemStatus status;
  final String? scheduledTime;
  final int estimatedDuration; // minutes
  final int? actualDuration;
  final String? activityId;
  final String? activityType;
  final String icon;
  final String color;
  final String? image;
  final String? symbolUrl;
  final bool isFlexible;
  final String? notes;
  final String? completedAt;
  final List<ScheduleSubItem>? subItems;

  const ScheduleItem({
    required this.id,
    required this.title,
    required this.type,
    required this.status,
    this.scheduledTime,
    required this.estimatedDuration,
    this.actualDuration,
    this.activityId,
    this.activityType,
    required this.icon,
    required this.color,
    this.image,
    this.symbolUrl,
    required this.isFlexible,
    this.notes,
    this.completedAt,
    this.subItems,
  });

  factory ScheduleItem.fromJson(Map<String, dynamic> json) {
    return ScheduleItem(
      id: json['id'] as String,
      title: json['title'] as String,
      type: _parseItemType(json['type'] as String),
      status: _parseItemStatus(json['status'] as String),
      scheduledTime: json['scheduledTime'] as String?,
      estimatedDuration: json['estimatedDuration'] as int,
      actualDuration: json['actualDuration'] as int?,
      activityId: json['activityId'] as String?,
      activityType: json['activityType'] as String?,
      icon: json['icon'] as String,
      color: json['color'] as String,
      image: json['image'] as String?,
      symbolUrl: json['symbolUrl'] as String?,
      isFlexible: json['isFlexible'] as bool,
      notes: json['notes'] as String?,
      completedAt: json['completedAt'] as String?,
      subItems: (json['subItems'] as List<dynamic>?)
          ?.map((e) => ScheduleSubItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'type': type.name,
        'status': status.name,
        'scheduledTime': scheduledTime,
        'estimatedDuration': estimatedDuration,
        'actualDuration': actualDuration,
        'activityId': activityId,
        'activityType': activityType,
        'icon': icon,
        'color': color,
        'image': image,
        'symbolUrl': symbolUrl,
        'isFlexible': isFlexible,
        'notes': notes,
        'completedAt': completedAt,
        'subItems': subItems?.map((e) => e.toJson()).toList(),
      };

  ScheduleItem copyWith({
    String? id,
    String? title,
    ScheduleItemType? type,
    ScheduleItemStatus? status,
    String? scheduledTime,
    int? estimatedDuration,
    int? actualDuration,
    String? activityId,
    String? activityType,
    String? icon,
    String? color,
    String? image,
    String? symbolUrl,
    bool? isFlexible,
    String? notes,
    String? completedAt,
    List<ScheduleSubItem>? subItems,
  }) {
    return ScheduleItem(
      id: id ?? this.id,
      title: title ?? this.title,
      type: type ?? this.type,
      status: status ?? this.status,
      scheduledTime: scheduledTime ?? this.scheduledTime,
      estimatedDuration: estimatedDuration ?? this.estimatedDuration,
      actualDuration: actualDuration ?? this.actualDuration,
      activityId: activityId ?? this.activityId,
      activityType: activityType ?? this.activityType,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      image: image ?? this.image,
      symbolUrl: symbolUrl ?? this.symbolUrl,
      isFlexible: isFlexible ?? this.isFlexible,
      notes: notes ?? this.notes,
      completedAt: completedAt ?? this.completedAt,
      subItems: subItems ?? this.subItems,
    );
  }

  static ScheduleItemType _parseItemType(String value) {
    switch (value) {
      case 'activity':
        return ScheduleItemType.activity;
      case 'break':
        return ScheduleItemType.breakTime;
      case 'transition':
        return ScheduleItemType.transition;
      case 'reward':
        return ScheduleItemType.reward;
      case 'meal':
        return ScheduleItemType.meal;
      default:
        return ScheduleItemType.custom;
    }
  }

  static ScheduleItemStatus _parseItemStatus(String value) {
    switch (value) {
      case 'upcoming':
        return ScheduleItemStatus.upcoming;
      case 'current':
        return ScheduleItemStatus.current;
      case 'completed':
        return ScheduleItemStatus.completed;
      case 'skipped':
        return ScheduleItemStatus.skipped;
      case 'in_progress':
        return ScheduleItemStatus.inProgress;
      default:
        return ScheduleItemStatus.upcoming;
    }
  }
}

/// Progress information for a schedule
@immutable
class ScheduleProgress {
  final int completed;
  final int total;
  final int percentComplete;

  const ScheduleProgress({
    required this.completed,
    required this.total,
    required this.percentComplete,
  });

  factory ScheduleProgress.fromJson(Map<String, dynamic> json) {
    return ScheduleProgress(
      completed: json['completed'] as int,
      total: json['total'] as int,
      percentComplete: json['percentComplete'] as int,
    );
  }
}

/// A visual schedule
@immutable
class VisualSchedule {
  final String id;
  final String learnerId;
  final String tenantId;
  final DateTime date;
  final ScheduleType type;
  final List<ScheduleItem> items;
  final ScheduleDisplayStyle displayStyle;
  final bool showTimes;
  final bool showDuration;
  final bool showImages;
  final bool useSymbols;
  final int currentItemIndex;
  final int completedCount;
  final String? generatedBy;

  const VisualSchedule({
    required this.id,
    required this.learnerId,
    required this.tenantId,
    required this.date,
    required this.type,
    required this.items,
    required this.displayStyle,
    required this.showTimes,
    required this.showDuration,
    required this.showImages,
    required this.useSymbols,
    required this.currentItemIndex,
    required this.completedCount,
    this.generatedBy,
  });

  factory VisualSchedule.fromJson(Map<String, dynamic> json) {
    return VisualSchedule(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      tenantId: json['tenantId'] as String,
      date: DateTime.parse(json['date'] as String),
      type: _parseScheduleType(json['type'] as String),
      items: (json['items'] as List<dynamic>)
          .map((e) => ScheduleItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      displayStyle: _parseDisplayStyle(json['displayStyle'] as String),
      showTimes: json['showTimes'] as bool,
      showDuration: json['showDuration'] as bool,
      showImages: json['showImages'] as bool,
      useSymbols: json['useSymbols'] as bool,
      currentItemIndex: json['currentItemIndex'] as int,
      completedCount: json['completedCount'] as int,
      generatedBy: json['generatedBy'] as String?,
    );
  }

  static ScheduleType _parseScheduleType(String value) {
    switch (value) {
      case 'DAILY':
        return ScheduleType.daily;
      case 'SESSION':
        return ScheduleType.session;
      case 'ACTIVITY':
        return ScheduleType.activity;
      default:
        return ScheduleType.custom;
    }
  }

  static ScheduleDisplayStyle _parseDisplayStyle(String value) {
    switch (value) {
      case 'VERTICAL_LIST':
        return ScheduleDisplayStyle.verticalList;
      case 'HORIZONTAL_STRIP':
        return ScheduleDisplayStyle.horizontalStrip;
      case 'GRID':
        return ScheduleDisplayStyle.grid;
      case 'FIRST_THEN':
        return ScheduleDisplayStyle.firstThen;
      case 'NOW_NEXT_LATER':
        return ScheduleDisplayStyle.nowNextLater;
      default:
        return ScheduleDisplayStyle.verticalList;
    }
  }
}

/// Schedule with computed progress
@immutable
class ScheduleWithProgress {
  final VisualSchedule schedule;
  final List<ScheduleItem> items;
  final ScheduleItem? currentItem;
  final ScheduleItem? nextItem;
  final ScheduleProgress progress;
  final int? timeUntilNext;

  const ScheduleWithProgress({
    required this.schedule,
    required this.items,
    this.currentItem,
    this.nextItem,
    required this.progress,
    this.timeUntilNext,
  });

  factory ScheduleWithProgress.fromJson(Map<String, dynamic> json) {
    final scheduleJson = json['schedule'] as Map<String, dynamic>;
    final items = (json['items'] as List<dynamic>)
        .map((e) => ScheduleItem.fromJson(e as Map<String, dynamic>))
        .toList();

    return ScheduleWithProgress(
      schedule: VisualSchedule.fromJson(scheduleJson),
      items: items,
      currentItem: json['currentItem'] != null
          ? ScheduleItem.fromJson(json['currentItem'] as Map<String, dynamic>)
          : null,
      nextItem: json['nextItem'] != null
          ? ScheduleItem.fromJson(json['nextItem'] as Map<String, dynamic>)
          : null,
      progress:
          ScheduleProgress.fromJson(json['progress'] as Map<String, dynamic>),
      timeUntilNext: json['timeUntilNext'] as int?,
    );
  }
}

/// Learner schedule preferences
@immutable
class SchedulePreferences {
  final String id;
  final String learnerId;
  final ScheduleDisplayStyle preferredStyle;
  final bool showTimes;
  final bool showDuration;
  final bool showImages;
  final bool useSymbols;
  final bool showCountdownToNext;
  final bool warnBeforeTransition;
  final int transitionWarningMinutes;
  final String iconSize;
  final bool colorCoding;
  final bool highContrast;
  final bool announceItems;
  final bool playChimeOnChange;
  final bool celebrateCompletion;
  final bool showProgressBar;

  const SchedulePreferences({
    required this.id,
    required this.learnerId,
    required this.preferredStyle,
    required this.showTimes,
    required this.showDuration,
    required this.showImages,
    required this.useSymbols,
    required this.showCountdownToNext,
    required this.warnBeforeTransition,
    required this.transitionWarningMinutes,
    required this.iconSize,
    required this.colorCoding,
    required this.highContrast,
    required this.announceItems,
    required this.playChimeOnChange,
    required this.celebrateCompletion,
    required this.showProgressBar,
  });

  factory SchedulePreferences.fromJson(Map<String, dynamic> json) {
    return SchedulePreferences(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      preferredStyle: VisualSchedule._parseDisplayStyle(
          json['preferredStyle'] as String? ?? 'VERTICAL_LIST'),
      showTimes: json['showTimes'] as bool? ?? true,
      showDuration: json['showDuration'] as bool? ?? true,
      showImages: json['showImages'] as bool? ?? true,
      useSymbols: json['useSymbols'] as bool? ?? false,
      showCountdownToNext: json['showCountdownToNext'] as bool? ?? true,
      warnBeforeTransition: json['warnBeforeTransition'] as bool? ?? true,
      transitionWarningMinutes: json['transitionWarningMinutes'] as int? ?? 2,
      iconSize: json['iconSize'] as String? ?? 'medium',
      colorCoding: json['colorCoding'] as bool? ?? true,
      highContrast: json['highContrast'] as bool? ?? false,
      announceItems: json['announceItems'] as bool? ?? false,
      playChimeOnChange: json['playChimeOnChange'] as bool? ?? true,
      celebrateCompletion: json['celebrateCompletion'] as bool? ?? true,
      showProgressBar: json['showProgressBar'] as bool? ?? true,
    );
  }

  SchedulePreferences copyWith({
    String? id,
    String? learnerId,
    ScheduleDisplayStyle? preferredStyle,
    bool? showTimes,
    bool? showDuration,
    bool? showImages,
    bool? useSymbols,
    bool? showCountdownToNext,
    bool? warnBeforeTransition,
    int? transitionWarningMinutes,
    String? iconSize,
    bool? colorCoding,
    bool? highContrast,
    bool? announceItems,
    bool? playChimeOnChange,
    bool? celebrateCompletion,
    bool? showProgressBar,
  }) {
    return SchedulePreferences(
      id: id ?? this.id,
      learnerId: learnerId ?? this.learnerId,
      preferredStyle: preferredStyle ?? this.preferredStyle,
      showTimes: showTimes ?? this.showTimes,
      showDuration: showDuration ?? this.showDuration,
      showImages: showImages ?? this.showImages,
      useSymbols: useSymbols ?? this.useSymbols,
      showCountdownToNext: showCountdownToNext ?? this.showCountdownToNext,
      warnBeforeTransition: warnBeforeTransition ?? this.warnBeforeTransition,
      transitionWarningMinutes:
          transitionWarningMinutes ?? this.transitionWarningMinutes,
      iconSize: iconSize ?? this.iconSize,
      colorCoding: colorCoding ?? this.colorCoding,
      highContrast: highContrast ?? this.highContrast,
      announceItems: announceItems ?? this.announceItems,
      playChimeOnChange: playChimeOnChange ?? this.playChimeOnChange,
      celebrateCompletion: celebrateCompletion ?? this.celebrateCompletion,
      showProgressBar: showProgressBar ?? this.showProgressBar,
    );
  }
}
