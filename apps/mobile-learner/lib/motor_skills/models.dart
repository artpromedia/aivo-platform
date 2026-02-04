/// Motor Skills Models
/// Comprehensive data models for motor skills development support
library;

/// Handwriting Exercise
class HandwritingExercise {
  final String id;
  final String name;
  final String description;
  final HandwritingType type;
  final String letterOrWord;
  final List<StrokeGuidance> strokes;
  final int difficulty; // 1-5
  final String? previewImage;
  final Duration estimatedTime;
  final List<String> tips;

  HandwritingExercise({
    required this.id,
    required this.name,
    required this.description,
    required this.type,
    required this.letterOrWord,
    required this.strokes,
    required this.difficulty,
    this.previewImage,
    required this.estimatedTime,
    required this.tips,
  });

  factory HandwritingExercise.fromJson(Map<String, dynamic> json) {
    return HandwritingExercise(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      type: HandwritingType.values.firstWhere(
        (e) => e.toString() == 'HandwritingType.${json['type']}',
      ),
      letterOrWord: json['letterOrWord'] as String,
      strokes: (json['strokes'] as List)
          .map((s) => StrokeGuidance.fromJson(s as Map<String, dynamic>))
          .toList(),
      difficulty: json['difficulty'] as int,
      previewImage: json['previewImage'] as String?,
      estimatedTime: Duration(seconds: json['estimatedTime'] as int),
      tips: (json['tips'] as List).map((t) => t as String).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'type': type.toString().split('.').last,
      'letterOrWord': letterOrWord,
      'strokes': strokes.map((s) => s.toJson()).toList(),
      'difficulty': difficulty,
      'previewImage': previewImage,
      'estimatedTime': estimatedTime.inSeconds,
      'tips': tips,
    };
  }
}

enum HandwritingType {
  uppercase,
  lowercase,
  number,
  word,
  sentence,
  shape,
}

/// Stroke Guidance for Handwriting
class StrokeGuidance {
  final int order;
  final String direction;
  final List<Map<String, double>> points;
  final String description;
  final String? animation;

  StrokeGuidance({
    required this.order,
    required this.direction,
    required this.points,
    required this.description,
    this.animation,
  });

  factory StrokeGuidance.fromJson(Map<String, dynamic> json) {
    return StrokeGuidance(
      order: json['order'] as int,
      direction: json['direction'] as String,
      points: (json['points'] as List)
          .map((p) => Map<String, double>.from(p as Map))
          .toList(),
      description: json['description'] as String,
      animation: json['animation'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'order': order,
      'direction': direction,
      'points': points,
      'description': description,
      'animation': animation,
    };
  }
}

/// Handwriting Practice Session
class HandwritingSession {
  final String id;
  final String learnerId;
  final String exerciseId;
  final DateTime startedAt;
  final DateTime? completedAt;
  final int accuracy; // 0-100
  final int strokesCompleted;
  final int totalStrokes;
  final List<String> feedback;
  final Map<String, dynamic>? traceData;

  HandwritingSession({
    required this.id,
    required this.learnerId,
    required this.exerciseId,
    required this.startedAt,
    this.completedAt,
    required this.accuracy,
    required this.strokesCompleted,
    required this.totalStrokes,
    required this.feedback,
    this.traceData,
  });

  factory HandwritingSession.fromJson(Map<String, dynamic> json) {
    return HandwritingSession(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      exerciseId: json['exerciseId'] as String,
      startedAt: DateTime.parse(json['startedAt'] as String),
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      accuracy: json['accuracy'] as int,
      strokesCompleted: json['strokesCompleted'] as int,
      totalStrokes: json['totalStrokes'] as int,
      feedback: (json['feedback'] as List).map((f) => f as String).toList(),
      traceData: json['traceData'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'learnerId': learnerId,
      'exerciseId': exerciseId,
      'startedAt': startedAt.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'accuracy': accuracy,
      'strokesCompleted': strokesCompleted,
      'totalStrokes': totalStrokes,
      'feedback': feedback,
      'traceData': traceData,
    };
  }
}

/// Fine Motor Activity
class FineMotorActivity {
  final String id;
  final String name;
  final String description;
  final FineMotorType type;
  final int difficulty; // 1-5
  final List<ActivityStep> steps;
  final Duration estimatedTime;
  final String? previewImage;
  final List<String> materials;
  final List<String> benefits;

  FineMotorActivity({
    required this.id,
    required this.name,
    required this.description,
    required this.type,
    required this.difficulty,
    required this.steps,
    required this.estimatedTime,
    this.previewImage,
    required this.materials,
    required this.benefits,
  });

  factory FineMotorActivity.fromJson(Map<String, dynamic> json) {
    return FineMotorActivity(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      type: FineMotorType.values.firstWhere(
        (e) => e.toString() == 'FineMotorType.${json['type']}',
      ),
      difficulty: json['difficulty'] as int,
      steps: (json['steps'] as List)
          .map((s) => ActivityStep.fromJson(s as Map<String, dynamic>))
          .toList(),
      estimatedTime: Duration(seconds: json['estimatedTime'] as int),
      previewImage: json['previewImage'] as String?,
      materials: (json['materials'] as List).map((m) => m as String).toList(),
      benefits: (json['benefits'] as List).map((b) => b as String).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'type': type.toString().split('.').last,
      'difficulty': difficulty,
      'steps': steps.map((s) => s.toJson()).toList(),
      'estimatedTime': estimatedTime.inSeconds,
      'previewImage': previewImage,
      'materials': materials,
      'benefits': benefits,
    };
  }
}

enum FineMotorType {
  tapping,
  dragging,
  pinching,
  tracing,
  matching,
  sorting,
  threading,
  manipulation,
}

/// Activity Step
class ActivityStep {
  final int order;
  final String instruction;
  final String? image;
  final String? video;
  final Duration? duration;
  final Map<String, dynamic>? interactiveData;

  ActivityStep({
    required this.order,
    required this.instruction,
    this.image,
    this.video,
    this.duration,
    this.interactiveData,
  });

  factory ActivityStep.fromJson(Map<String, dynamic> json) {
    return ActivityStep(
      order: json['order'] as int,
      instruction: json['instruction'] as String,
      image: json['image'] as String?,
      video: json['video'] as String?,
      duration: json['duration'] != null
          ? Duration(seconds: json['duration'] as int)
          : null,
      interactiveData: json['interactiveData'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'order': order,
      'instruction': instruction,
      'image': image,
      'video': video,
      'duration': duration?.inSeconds,
      'interactiveData': interactiveData,
    };
  }
}

/// Fine Motor Activity Session
class FineMotorSession {
  final String id;
  final String learnerId;
  final String activityId;
  final DateTime startedAt;
  final DateTime? completedAt;
  final int stepsCompleted;
  final int totalSteps;
  final int accuracy; // 0-100
  final List<String> achievements;
  final Map<String, dynamic>? performanceData;

  FineMotorSession({
    required this.id,
    required this.learnerId,
    required this.activityId,
    required this.startedAt,
    this.completedAt,
    required this.stepsCompleted,
    required this.totalSteps,
    required this.accuracy,
    required this.achievements,
    this.performanceData,
  });

  factory FineMotorSession.fromJson(Map<String, dynamic> json) {
    return FineMotorSession(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      activityId: json['activityId'] as String,
      startedAt: DateTime.parse(json['startedAt'] as String),
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      stepsCompleted: json['stepsCompleted'] as int,
      totalSteps: json['totalSteps'] as int,
      accuracy: json['accuracy'] as int,
      achievements: (json['achievements'] as List).map((a) => a as String).toList(),
      performanceData: json['performanceData'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'learnerId': learnerId,
      'activityId': activityId,
      'startedAt': startedAt.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'stepsCompleted': stepsCompleted,
      'totalSteps': totalSteps,
      'accuracy': accuracy,
      'achievements': achievements,
      'performanceData': performanceData,
    };
  }
}

/// Gross Motor Exercise
class GrossMotorExercise {
  final String id;
  final String name;
  final String description;
  final GrossMotorType type;
  final int difficulty; // 1-5
  final List<MovementStep> movements;
  final Duration duration;
  final String? videoUrl;
  final List<String> equipment;
  final int caloriesBurned;
  final List<String> muscleGroups;

  GrossMotorExercise({
    required this.id,
    required this.name,
    required this.description,
    required this.type,
    required this.difficulty,
    required this.movements,
    required this.duration,
    this.videoUrl,
    required this.equipment,
    required this.caloriesBurned,
    required this.muscleGroups,
  });

  factory GrossMotorExercise.fromJson(Map<String, dynamic> json) {
    return GrossMotorExercise(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      type: GrossMotorType.values.firstWhere(
        (e) => e.toString() == 'GrossMotorType.${json['type']}',
      ),
      difficulty: json['difficulty'] as int,
      movements: (json['movements'] as List)
          .map((m) => MovementStep.fromJson(m as Map<String, dynamic>))
          .toList(),
      duration: Duration(seconds: json['duration'] as int),
      videoUrl: json['videoUrl'] as String?,
      equipment: (json['equipment'] as List).map((e) => e as String).toList(),
      caloriesBurned: json['caloriesBurned'] as int,
      muscleGroups: (json['muscleGroups'] as List).map((m) => m as String).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'type': type.toString().split('.').last,
      'difficulty': difficulty,
      'movements': movements.map((m) => m.toJson()).toList(),
      'duration': duration.inSeconds,
      'videoUrl': videoUrl,
      'equipment': equipment,
      'caloriesBurned': caloriesBurned,
      'muscleGroups': muscleGroups,
    };
  }
}

enum GrossMotorType {
  jumping,
  running,
  dancing,
  balancing,
  coordination,
  stretching,
  yoga,
  sports,
}

/// Movement Step
class MovementStep {
  final int order;
  final String name;
  final String description;
  final int repetitions;
  final Duration duration;
  final String? image;
  final List<String> cues;

  MovementStep({
    required this.order,
    required this.name,
    required this.description,
    required this.repetitions,
    required this.duration,
    this.image,
    required this.cues,
  });

  factory MovementStep.fromJson(Map<String, dynamic> json) {
    return MovementStep(
      order: json['order'] as int,
      name: json['name'] as String,
      description: json['description'] as String,
      repetitions: json['repetitions'] as int,
      duration: Duration(seconds: json['duration'] as int),
      image: json['image'] as String?,
      cues: (json['cues'] as List).map((c) => c as String).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'order': order,
      'name': name,
      'description': description,
      'repetitions': repetitions,
      'duration': duration.inSeconds,
      'image': image,
      'cues': cues,
    };
  }
}

/// Gross Motor Exercise Session
class GrossMotorSession {
  final String id;
  final String learnerId;
  final String exerciseId;
  final DateTime startedAt;
  final DateTime? completedAt;
  final int movementsCompleted;
  final int totalMovements;
  final int accuracy; // 0-100
  final Map<String, dynamic>? trackingData;
  final List<String> notes;

  GrossMotorSession({
    required this.id,
    required this.learnerId,
    required this.exerciseId,
    required this.startedAt,
    this.completedAt,
    required this.movementsCompleted,
    required this.totalMovements,
    required this.accuracy,
    this.trackingData,
    required this.notes,
  });

  factory GrossMotorSession.fromJson(Map<String, dynamic> json) {
    return GrossMotorSession(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      exerciseId: json['exerciseId'] as String,
      startedAt: DateTime.parse(json['startedAt'] as String),
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      movementsCompleted: json['movementsCompleted'] as int,
      totalMovements: json['totalMovements'] as int,
      accuracy: json['accuracy'] as int,
      trackingData: json['trackingData'] as Map<String, dynamic>?,
      notes: (json['notes'] as List).map((n) => n as String).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'learnerId': learnerId,
      'exerciseId': exerciseId,
      'startedAt': startedAt.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'movementsCompleted': movementsCompleted,
      'totalMovements': totalMovements,
      'accuracy': accuracy,
      'trackingData': trackingData,
      'notes': notes,
    };
  }
}

/// Adaptive Input Setting
class AdaptiveInputSetting {
  final String id;
  final String name;
  final AdaptiveInputType type;
  final dynamic value;
  final dynamic defaultValue;
  final String description;
  final Map<String, dynamic>? constraints;

  AdaptiveInputSetting({
    required this.id,
    required this.name,
    required this.type,
    required this.value,
    required this.defaultValue,
    required this.description,
    this.constraints,
  });

  factory AdaptiveInputSetting.fromJson(Map<String, dynamic> json) {
    return AdaptiveInputSetting(
      id: json['id'] as String,
      name: json['name'] as String,
      type: AdaptiveInputType.values.firstWhere(
        (e) => e.toString() == 'AdaptiveInputType.${json['type']}',
      ),
      value: json['value'],
      defaultValue: json['defaultValue'],
      description: json['description'] as String,
      constraints: json['constraints'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type.toString().split('.').last,
      'value': value,
      'defaultValue': defaultValue,
      'description': description,
      'constraints': constraints,
    };
  }

  AdaptiveInputSetting copyWith({dynamic value}) {
    return AdaptiveInputSetting(
      id: id,
      name: name,
      type: type,
      value: value ?? this.value,
      defaultValue: defaultValue,
      description: description,
      constraints: constraints,
    );
  }
}

enum AdaptiveInputType {
  touchTargetSize,
  touchDuration,
  swipeSpeed,
  dragSensitivity,
  doubleTapDelay,
  vibrationFeedback,
  audioFeedback,
  visualFeedback,
  buttonLayout,
  gestureControl,
}

/// Adaptive Input Profile
class AdaptiveInputProfile {
  final String id;
  final String learnerId;
  final List<AdaptiveInputSetting> settings;
  final DateTime updatedAt;
  final bool isActive;

  AdaptiveInputProfile({
    required this.id,
    required this.learnerId,
    required this.settings,
    required this.updatedAt,
    required this.isActive,
  });

  factory AdaptiveInputProfile.fromJson(Map<String, dynamic> json) {
    return AdaptiveInputProfile(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      settings: (json['settings'] as List)
          .map((s) => AdaptiveInputSetting.fromJson(s as Map<String, dynamic>))
          .toList(),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      isActive: json['isActive'] as bool,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'learnerId': learnerId,
      'settings': settings.map((s) => s.toJson()).toList(),
      'updatedAt': updatedAt.toIso8601String(),
      'isActive': isActive,
    };
  }
}
