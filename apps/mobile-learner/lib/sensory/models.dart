/// Sensory accommodation models for neurodiverse learners
library;

/// Type of sensory break activity
enum SensoryBreakType {
  breathing,
  stretching,
  movement,
  quiet,
  visual,
  tactile,
}

/// Sensory break activity
class SensoryBreak {
  final String id;
  final String name;
  final String description;
  final SensoryBreakType type;
  final int durationMinutes;
  final List<String> instructions;
  final String? imageUrl;
  final String? videoUrl;
  final bool requiresSupervision;

  const SensoryBreak({
    required this.id,
    required this.name,
    required this.description,
    required this.type,
    required this.durationMinutes,
    required this.instructions,
    this.imageUrl,
    this.videoUrl,
    this.requiresSupervision = false,
  });

  factory SensoryBreak.fromJson(Map<String, dynamic> json) {
    return SensoryBreak(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      type: SensoryBreakType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => SensoryBreakType.breathing,
      ),
      durationMinutes: json['durationMinutes'] as int,
      instructions: (json['instructions'] as List<dynamic>).cast<String>(),
      imageUrl: json['imageUrl'] as String?,
      videoUrl: json['videoUrl'] as String?,
      requiresSupervision: json['requiresSupervision'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'type': type.name,
      'durationMinutes': durationMinutes,
      'instructions': instructions,
      'imageUrl': imageUrl,
      'videoUrl': videoUrl,
      'requiresSupervision': requiresSupervision,
    };
  }
}

/// Sensory break session record
class SensoryBreakSession {
  final String id;
  final String learnerId;
  final String breakId;
  final DateTime startTime;
  final DateTime? endTime;
  final int? rating;
  final String? notes;

  const SensoryBreakSession({
    required this.id,
    required this.learnerId,
    required this.breakId,
    required this.startTime,
    this.endTime,
    this.rating,
    this.notes,
  });

  factory SensoryBreakSession.fromJson(Map<String, dynamic> json) {
    return SensoryBreakSession(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      breakId: json['breakId'] as String,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime'] as String) : null,
      rating: json['rating'] as int?,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'learnerId': learnerId,
      'breakId': breakId,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'rating': rating,
      'notes': notes,
    };
  }
}

/// Environment customization setting type
enum EnvironmentSettingType {
  brightness,
  contrast,
  colorScheme,
  fontSize,
  soundLevel,
  animations,
}

/// Environment customization setting
class EnvironmentSetting {
  final String id;
  final EnvironmentSettingType type;
  final String name;
  final String description;
  final dynamic value;
  final dynamic defaultValue;
  final dynamic minValue;
  final dynamic maxValue;
  final List<dynamic>? options;

  const EnvironmentSetting({
    required this.id,
    required this.type,
    required this.name,
    required this.description,
    required this.value,
    required this.defaultValue,
    this.minValue,
    this.maxValue,
    this.options,
  });

  factory EnvironmentSetting.fromJson(Map<String, dynamic> json) {
    return EnvironmentSetting(
      id: json['id'] as String,
      type: EnvironmentSettingType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => EnvironmentSettingType.brightness,
      ),
      name: json['name'] as String,
      description: json['description'] as String,
      value: json['value'],
      defaultValue: json['defaultValue'],
      minValue: json['minValue'],
      maxValue: json['maxValue'],
      options: json['options'] as List<dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'name': name,
      'description': description,
      'value': value,
      'defaultValue': defaultValue,
      'minValue': minValue,
      'maxValue': maxValue,
      'options': options,
    };
  }

  EnvironmentSetting copyWith({
    String? id,
    EnvironmentSettingType? type,
    String? name,
    String? description,
    dynamic value,
    dynamic defaultValue,
    dynamic minValue,
    dynamic maxValue,
    List<dynamic>? options,
  }) {
    return EnvironmentSetting(
      id: id ?? this.id,
      type: type ?? this.type,
      name: name ?? this.name,
      description: description ?? this.description,
      value: value ?? this.value,
      defaultValue: defaultValue ?? this.defaultValue,
      minValue: minValue ?? this.minValue,
      maxValue: maxValue ?? this.maxValue,
      options: options ?? this.options,
    );
  }
}

/// Calming activity type
enum CalmingActivityType {
  breathing,
  visualization,
  music,
  sounds,
  movement,
  tactile,
  mindfulness,
}

/// Calming activity
class CalmingActivity {
  final String id;
  final String name;
  final String description;
  final CalmingActivityType type;
  final int durationMinutes;
  final String? audioUrl;
  final String? videoUrl;
  final List<String> steps;
  final bool isGuided;
  final String? backgroundImageUrl;

  const CalmingActivity({
    required this.id,
    required this.name,
    required this.description,
    required this.type,
    required this.durationMinutes,
    this.audioUrl,
    this.videoUrl,
    required this.steps,
    this.isGuided = false,
    this.backgroundImageUrl,
  });

  factory CalmingActivity.fromJson(Map<String, dynamic> json) {
    return CalmingActivity(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      type: CalmingActivityType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => CalmingActivityType.breathing,
      ),
      durationMinutes: json['durationMinutes'] as int,
      audioUrl: json['audioUrl'] as String?,
      videoUrl: json['videoUrl'] as String?,
      steps: (json['steps'] as List<dynamic>).cast<String>(),
      isGuided: json['isGuided'] as bool? ?? false,
      backgroundImageUrl: json['backgroundImageUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'type': type.name,
      'durationMinutes': durationMinutes,
      'audioUrl': audioUrl,
      'videoUrl': videoUrl,
      'steps': steps,
      'isGuided': isGuided,
      'backgroundImageUrl': backgroundImageUrl,
    };
  }
}

/// Calming activity session record
class CalmingActivitySession {
  final String id;
  final String learnerId;
  final String activityId;
  final DateTime startTime;
  final DateTime? endTime;
  final int? moodBefore;
  final int? moodAfter;
  final bool completed;

  const CalmingActivitySession({
    required this.id,
    required this.learnerId,
    required this.activityId,
    required this.startTime,
    this.endTime,
    this.moodBefore,
    this.moodAfter,
    this.completed = false,
  });

  factory CalmingActivitySession.fromJson(Map<String, dynamic> json) {
    return CalmingActivitySession(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      activityId: json['activityId'] as String,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime'] as String) : null,
      moodBefore: json['moodBefore'] as int?,
      moodAfter: json['moodAfter'] as int?,
      completed: json['completed'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'learnerId': learnerId,
      'activityId': activityId,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'moodBefore': moodBefore,
      'moodAfter': moodAfter,
      'completed': completed,
    };
  }
}

/// Sensory preference category
enum SensoryPreferenceCategory {
  visual,
  auditory,
  tactile,
  movement,
  environment,
}

/// Sensory preference
class SensoryPreference {
  final String id;
  final SensoryPreferenceCategory category;
  final String name;
  final String description;
  final bool enabled;
  final int intensity;
  final Map<String, dynamic>? settings;

  const SensoryPreference({
    required this.id,
    required this.category,
    required this.name,
    required this.description,
    required this.enabled,
    required this.intensity,
    this.settings,
  });

  factory SensoryPreference.fromJson(Map<String, dynamic> json) {
    return SensoryPreference(
      id: json['id'] as String,
      category: SensoryPreferenceCategory.values.firstWhere(
        (e) => e.name == json['category'],
        orElse: () => SensoryPreferenceCategory.visual,
      ),
      name: json['name'] as String,
      description: json['description'] as String,
      enabled: json['enabled'] as bool,
      intensity: json['intensity'] as int,
      settings: json['settings'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'category': category.name,
      'name': name,
      'description': description,
      'enabled': enabled,
      'intensity': intensity,
      'settings': settings,
    };
  }

  SensoryPreference copyWith({
    String? id,
    SensoryPreferenceCategory? category,
    String? name,
    String? description,
    bool? enabled,
    int? intensity,
    Map<String, dynamic>? settings,
  }) {
    return SensoryPreference(
      id: id ?? this.id,
      category: category ?? this.category,
      name: name ?? this.name,
      description: description ?? this.description,
      enabled: enabled ?? this.enabled,
      intensity: intensity ?? this.intensity,
      settings: settings ?? this.settings,
    );
  }
}

/// Learner sensory profile
class SensoryProfile {
  final String learnerId;
  final List<SensoryPreference> preferences;
  final List<String> sensitivities;
  final List<String> favoriteBreaks;
  final List<String> favoriteActivities;
  final DateTime lastUpdated;

  const SensoryProfile({
    required this.learnerId,
    required this.preferences,
    required this.sensitivities,
    required this.favoriteBreaks,
    required this.favoriteActivities,
    required this.lastUpdated,
  });

  factory SensoryProfile.fromJson(Map<String, dynamic> json) {
    return SensoryProfile(
      learnerId: json['learnerId'] as String,
      preferences: (json['preferences'] as List<dynamic>)
          .map((p) => SensoryPreference.fromJson(p as Map<String, dynamic>))
          .toList(),
      sensitivities: (json['sensitivities'] as List<dynamic>).cast<String>(),
      favoriteBreaks: (json['favoriteBreaks'] as List<dynamic>).cast<String>(),
      favoriteActivities: (json['favoriteActivities'] as List<dynamic>).cast<String>(),
      lastUpdated: DateTime.parse(json['lastUpdated'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'learnerId': learnerId,
      'preferences': preferences.map((p) => p.toJson()).toList(),
      'sensitivities': sensitivities,
      'favoriteBreaks': favoriteBreaks,
      'favoriteActivities': favoriteActivities,
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }
}
