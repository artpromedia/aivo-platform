/// Communication feature models for AAC boards, visual schedules, choice boards, and communication templates
library;

// AAC Board Models
class AACSymbol {
  final String id;
  final String label;
  final String? imageUrl;
  final String? audioUrl;
  final String category;
  final String backgroundColor;
  final String textColor;
  final int row;
  final int column;

  const AACSymbol({
    required this.id,
    required this.label,
    this.imageUrl,
    this.audioUrl,
    required this.category,
    this.backgroundColor = '#FFFFFF',
    this.textColor = '#000000',
    required this.row,
    required this.column,
  });

  factory AACSymbol.fromJson(Map<String, dynamic> json) {
    return AACSymbol(
      id: json['id'] as String,
      label: json['label'] as String,
      imageUrl: json['imageUrl'] as String?,
      audioUrl: json['audioUrl'] as String?,
      category: json['category'] as String,
      backgroundColor: json['backgroundColor'] as String? ?? '#FFFFFF',
      textColor: json['textColor'] as String? ?? '#000000',
      row: json['row'] as int,
      column: json['column'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (audioUrl != null) 'audioUrl': audioUrl,
      'category': category,
      'backgroundColor': backgroundColor,
      'textColor': textColor,
      'row': row,
      'column': column,
    };
  }
}

enum AACBoardLayout {
  grid2x2,
  grid3x3,
  grid4x4,
  grid5x5,
  custom,
}

class AACBoard {
  final String id;
  final String userId;
  final String name;
  final String? description;
  final AACBoardLayout layout;
  final List<AACSymbol> symbols;
  final bool enableAudio;
  final bool enablePrediction;
  final List<String> predictionWords;
  final String createdAt;
  final String updatedAt;
  final List<String> tags;

  const AACBoard({
    required this.id,
    required this.userId,
    required this.name,
    this.description,
    required this.layout,
    required this.symbols,
    this.enableAudio = true,
    this.enablePrediction = false,
    this.predictionWords = const [],
    required this.createdAt,
    required this.updatedAt,
    this.tags = const [],
  });

  factory AACBoard.fromJson(Map<String, dynamic> json) {
    return AACBoard(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      layout: AACBoardLayout.values.firstWhere(
        (e) => e.name == json['layout'],
        orElse: () => AACBoardLayout.grid3x3,
      ),
      symbols: (json['symbols'] as List<dynamic>)
          .map((e) => AACSymbol.fromJson(e as Map<String, dynamic>))
          .toList(),
      enableAudio: json['enableAudio'] as bool? ?? true,
      enablePrediction: json['enablePrediction'] as bool? ?? false,
      predictionWords: (json['predictionWords'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
      tags: (json['tags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      if (description != null) 'description': description,
      'layout': layout.name,
      'symbols': symbols.map((e) => e.toJson()).toList(),
      'enableAudio': enableAudio,
      'enablePrediction': enablePrediction,
      'predictionWords': predictionWords,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'tags': tags,
    };
  }
}

class AACMessage {
  final String id;
  final String userId;
  final String boardId;
  final List<String> symbolIds;
  final String text;
  final String? audioUrl;
  final String createdAt;

  const AACMessage({
    required this.id,
    required this.userId,
    required this.boardId,
    required this.symbolIds,
    required this.text,
    this.audioUrl,
    required this.createdAt,
  });

  factory AACMessage.fromJson(Map<String, dynamic> json) {
    return AACMessage(
      id: json['id'] as String,
      userId: json['userId'] as String,
      boardId: json['boardId'] as String,
      symbolIds: (json['symbolIds'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      text: json['text'] as String,
      audioUrl: json['audioUrl'] as String?,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'boardId': boardId,
      'symbolIds': symbolIds,
      'text': text,
      if (audioUrl != null) 'audioUrl': audioUrl,
      'createdAt': createdAt,
    };
  }
}

// Visual Schedule Models
class ScheduleActivity {
  final String id;
  final String name;
  final String? description;
  final String? imageUrl;
  final String time;
  final int duration; // minutes
  final String category;
  final bool isCompleted;
  final String? completedAt;
  final List<String> reminders;

  const ScheduleActivity({
    required this.id,
    required this.name,
    this.description,
    this.imageUrl,
    required this.time,
    required this.duration,
    required this.category,
    this.isCompleted = false,
    this.completedAt,
    this.reminders = const [],
  });

  factory ScheduleActivity.fromJson(Map<String, dynamic> json) {
    return ScheduleActivity(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      imageUrl: json['imageUrl'] as String?,
      time: json['time'] as String,
      duration: json['duration'] as int,
      category: json['category'] as String,
      isCompleted: json['isCompleted'] as bool? ?? false,
      completedAt: json['completedAt'] as String?,
      reminders: (json['reminders'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      if (imageUrl != null) 'imageUrl': imageUrl,
      'time': time,
      'duration': duration,
      'category': category,
      'isCompleted': isCompleted,
      if (completedAt != null) 'completedAt': completedAt,
      'reminders': reminders,
    };
  }

  ScheduleActivity copyWith({
    bool? isCompleted,
    String? completedAt,
  }) {
    return ScheduleActivity(
      id: id,
      name: name,
      description: description,
      imageUrl: imageUrl,
      time: time,
      duration: duration,
      category: category,
      isCompleted: isCompleted ?? this.isCompleted,
      completedAt: completedAt ?? this.completedAt,
      reminders: reminders,
    );
  }
}

enum ScheduleViewType {
  timeline,
  list,
  visual,
}

class VisualSchedule {
  final String id;
  final String userId;
  final String name;
  final String date;
  final List<ScheduleActivity> activities;
  final ScheduleViewType viewType;
  final bool enableNotifications;
  final bool enableTimer;
  final String createdAt;
  final String updatedAt;

  const VisualSchedule({
    required this.id,
    required this.userId,
    required this.name,
    required this.date,
    required this.activities,
    this.viewType = ScheduleViewType.visual,
    this.enableNotifications = true,
    this.enableTimer = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory VisualSchedule.fromJson(Map<String, dynamic> json) {
    return VisualSchedule(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      date: json['date'] as String,
      activities: (json['activities'] as List<dynamic>)
          .map((e) => ScheduleActivity.fromJson(e as Map<String, dynamic>))
          .toList(),
      viewType: ScheduleViewType.values.firstWhere(
        (e) => e.name == json['viewType'],
        orElse: () => ScheduleViewType.visual,
      ),
      enableNotifications: json['enableNotifications'] as bool? ?? true,
      enableTimer: json['enableTimer'] as bool? ?? true,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'date': date,
      'activities': activities.map((e) => e.toJson()).toList(),
      'viewType': viewType.name,
      'enableNotifications': enableNotifications,
      'enableTimer': enableTimer,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

// Choice Board Models
class Choice {
  final String id;
  final String label;
  final String? imageUrl;
  final String? audioUrl;
  final String category;
  final int timesSelected;
  final String? lastSelectedAt;

  const Choice({
    required this.id,
    required this.label,
    this.imageUrl,
    this.audioUrl,
    required this.category,
    this.timesSelected = 0,
    this.lastSelectedAt,
  });

  factory Choice.fromJson(Map<String, dynamic> json) {
    return Choice(
      id: json['id'] as String,
      label: json['label'] as String,
      imageUrl: json['imageUrl'] as String?,
      audioUrl: json['audioUrl'] as String?,
      category: json['category'] as String,
      timesSelected: json['timesSelected'] as int? ?? 0,
      lastSelectedAt: json['lastSelectedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (audioUrl != null) 'audioUrl': audioUrl,
      'category': category,
      'timesSelected': timesSelected,
      if (lastSelectedAt != null) 'lastSelectedAt': lastSelectedAt,
    };
  }
}

enum ChoiceBoardType {
  yesNo,
  feelings,
  activities,
  food,
  custom,
}

class ChoiceBoard {
  final String id;
  final String userId;
  final String name;
  final String? description;
  final ChoiceBoardType type;
  final List<Choice> choices;
  final int maxSelections;
  final bool allowMultiple;
  final String createdAt;
  final String updatedAt;

  const ChoiceBoard({
    required this.id,
    required this.userId,
    required this.name,
    this.description,
    required this.type,
    required this.choices,
    this.maxSelections = 1,
    this.allowMultiple = false,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ChoiceBoard.fromJson(Map<String, dynamic> json) {
    return ChoiceBoard(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      type: ChoiceBoardType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => ChoiceBoardType.custom,
      ),
      choices: (json['choices'] as List<dynamic>)
          .map((e) => Choice.fromJson(e as Map<String, dynamic>))
          .toList(),
      maxSelections: json['maxSelections'] as int? ?? 1,
      allowMultiple: json['allowMultiple'] as bool? ?? false,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      if (description != null) 'description': description,
      'type': type.name,
      'choices': choices.map((e) => e.toJson()).toList(),
      'maxSelections': maxSelections,
      'allowMultiple': allowMultiple,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class ChoiceSelection {
  final String id;
  final String userId;
  final String boardId;
  final List<String> choiceIds;
  final String createdAt;
  final String? notes;

  const ChoiceSelection({
    required this.id,
    required this.userId,
    required this.boardId,
    required this.choiceIds,
    required this.createdAt,
    this.notes,
  });

  factory ChoiceSelection.fromJson(Map<String, dynamic> json) {
    return ChoiceSelection(
      id: json['id'] as String,
      userId: json['userId'] as String,
      boardId: json['boardId'] as String,
      choiceIds: (json['choiceIds'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      createdAt: json['createdAt'] as String,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'boardId': boardId,
      'choiceIds': choiceIds,
      'createdAt': createdAt,
      if (notes != null) 'notes': notes,
    };
  }
}

// Communication Template Models
class TemplateField {
  final String id;
  final String label;
  final String type; // text, dropdown, image, emoji
  final List<String> options;
  final String? defaultValue;
  final bool required;

  const TemplateField({
    required this.id,
    required this.label,
    required this.type,
    this.options = const [],
    this.defaultValue,
    this.required = false,
  });

  factory TemplateField.fromJson(Map<String, dynamic> json) {
    return TemplateField(
      id: json['id'] as String,
      label: json['label'] as String,
      type: json['type'] as String,
      options: (json['options'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      defaultValue: json['defaultValue'] as String?,
      required: json['required'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      'type': type,
      'options': options,
      if (defaultValue != null) 'defaultValue': defaultValue,
      'required': required,
    };
  }
}

enum TemplateCategory {
  greeting,
  request,
  question,
  feeling,
  emergency,
  social,
  custom,
}

class CommunicationTemplate {
  final String id;
  final String userId;
  final String name;
  final String? description;
  final TemplateCategory category;
  final String template;
  final List<TemplateField> fields;
  final String? imageUrl;
  final String? audioUrl;
  final int timesUsed;
  final String createdAt;
  final String updatedAt;
  final List<String> tags;

  const CommunicationTemplate({
    required this.id,
    required this.userId,
    required this.name,
    this.description,
    required this.category,
    required this.template,
    required this.fields,
    this.imageUrl,
    this.audioUrl,
    this.timesUsed = 0,
    required this.createdAt,
    required this.updatedAt,
    this.tags = const [],
  });

  factory CommunicationTemplate.fromJson(Map<String, dynamic> json) {
    return CommunicationTemplate(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      category: TemplateCategory.values.firstWhere(
        (e) => e.name == json['category'],
        orElse: () => TemplateCategory.custom,
      ),
      template: json['template'] as String,
      fields: (json['fields'] as List<dynamic>)
          .map((e) => TemplateField.fromJson(e as Map<String, dynamic>))
          .toList(),
      imageUrl: json['imageUrl'] as String?,
      audioUrl: json['audioUrl'] as String?,
      timesUsed: json['timesUsed'] as int? ?? 0,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
      tags: (json['tags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      if (description != null) 'description': description,
      'category': category.name,
      'template': template,
      'fields': fields.map((e) => e.toJson()).toList(),
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (audioUrl != null) 'audioUrl': audioUrl,
      'timesUsed': timesUsed,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'tags': tags,
    };
  }
}

class TemplateMessage {
  final String id;
  final String userId;
  final String templateId;
  final Map<String, String> fieldValues;
  final String composedMessage;
  final String? audioUrl;
  final String createdAt;

  const TemplateMessage({
    required this.id,
    required this.userId,
    required this.templateId,
    required this.fieldValues,
    required this.composedMessage,
    this.audioUrl,
    required this.createdAt,
  });

  factory TemplateMessage.fromJson(Map<String, dynamic> json) {
    return TemplateMessage(
      id: json['id'] as String,
      userId: json['userId'] as String,
      templateId: json['templateId'] as String,
      fieldValues: Map<String, String>.from(json['fieldValues'] as Map),
      composedMessage: json['composedMessage'] as String,
      audioUrl: json['audioUrl'] as String?,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'templateId': templateId,
      'fieldValues': fieldValues,
      'composedMessage': composedMessage,
      if (audioUrl != null) 'audioUrl': audioUrl,
      'createdAt': createdAt,
    };
  }
}
