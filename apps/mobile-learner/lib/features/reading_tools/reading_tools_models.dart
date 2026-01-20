/// Models for reading tools feature
library;

/// TTS Voice model
class TTSVoice {
  final String id;
  final String name;
  final String language;
  final String gender;

  const TTSVoice({
    required this.id,
    required this.name,
    required this.language,
    required this.gender,
  });

  factory TTSVoice.fromJson(Map<String, dynamic> json) {
    return TTSVoice(
      id: json['id'] as String,
      name: json['name'] as String,
      language: json['language'] as String? ?? 'en-US',
      gender: json['gender'] as String? ?? 'neutral',
    );
  }
}

/// TTS Settings model
class TTSSettings {
  final String learnerId;
  final String voiceId;
  final double rate;
  final double pitch;
  final double volume;
  final bool highlightText;
  final bool autoScroll;

  const TTSSettings({
    required this.learnerId,
    required this.voiceId,
    this.rate = 1.0,
    this.pitch = 1.0,
    this.volume = 1.0,
    this.highlightText = true,
    this.autoScroll = false,
  });

  factory TTSSettings.fromJson(Map<String, dynamic> json) {
    return TTSSettings(
      learnerId: json['learnerId'] as String,
      voiceId: json['voiceId'] as String? ?? 'default',
      rate: (json['rate'] as num?)?.toDouble() ?? 1.0,
      pitch: (json['pitch'] as num?)?.toDouble() ?? 1.0,
      volume: (json['volume'] as num?)?.toDouble() ?? 1.0,
      highlightText: json['highlightText'] as bool? ?? true,
      autoScroll: json['autoScroll'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'learnerId': learnerId,
        'voiceId': voiceId,
        'rate': rate,
        'pitch': pitch,
        'volume': volume,
        'highlightText': highlightText,
        'autoScroll': autoScroll,
      };

  TTSSettings copyWith({
    String? learnerId,
    String? voiceId,
    double? rate,
    double? pitch,
    double? volume,
    bool? highlightText,
    bool? autoScroll,
  }) {
    return TTSSettings(
      learnerId: learnerId ?? this.learnerId,
      voiceId: voiceId ?? this.voiceId,
      rate: rate ?? this.rate,
      pitch: pitch ?? this.pitch,
      volume: volume ?? this.volume,
      highlightText: highlightText ?? this.highlightText,
      autoScroll: autoScroll ?? this.autoScroll,
    );
  }
}

/// Vocabulary word model
class VocabularyWord {
  final String id;
  final String word;
  final String definition;
  final String? pronunciation;
  final String? example;
  final String? imageUrl;
  final int masteryLevel;
  final DateTime addedAt;

  const VocabularyWord({
    required this.id,
    required this.word,
    required this.definition,
    this.pronunciation,
    this.example,
    this.imageUrl,
    this.masteryLevel = 0,
    required this.addedAt,
  });

  factory VocabularyWord.fromJson(Map<String, dynamic> json) {
    return VocabularyWord(
      id: json['id'] as String,
      word: json['word'] as String,
      definition: json['definition'] as String,
      pronunciation: json['pronunciation'] as String?,
      example: json['example'] as String?,
      imageUrl: json['imageUrl'] as String?,
      masteryLevel: json['masteryLevel'] as int? ?? 0,
      addedAt: DateTime.parse(json['addedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'word': word,
        'definition': definition,
        'pronunciation': pronunciation,
        'example': example,
        'imageUrl': imageUrl,
        'masteryLevel': masteryLevel,
        'addedAt': addedAt.toIso8601String(),
      };
}

/// Reading comprehension question
class ComprehensionQuestion {
  final String id;
  final String question;
  final List<String> options;
  final int correctIndex;
  final String explanation;

  const ComprehensionQuestion({
    required this.id,
    required this.question,
    required this.options,
    required this.correctIndex,
    required this.explanation,
  });

  factory ComprehensionQuestion.fromJson(Map<String, dynamic> json) {
    return ComprehensionQuestion(
      id: json['id'] as String,
      question: json['question'] as String,
      options: (json['options'] as List).cast<String>(),
      correctIndex: json['correctIndex'] as int,
      explanation: json['explanation'] as String,
    );
  }
}

/// Word prediction suggestion
class WordPrediction {
  final String word;
  final double confidence;
  final String? partOfSpeech;

  const WordPrediction({
    required this.word,
    required this.confidence,
    this.partOfSpeech,
  });

  factory WordPrediction.fromJson(Map<String, dynamic> json) {
    return WordPrediction(
      word: json['word'] as String,
      confidence: (json['confidence'] as num).toDouble(),
      partOfSpeech: json['partOfSpeech'] as String?,
    );
  }
}
