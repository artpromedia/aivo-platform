// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'communication_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

HomeworkTranscript _$HomeworkTranscriptFromJson(Map<String, dynamic> json) {
  return _HomeworkTranscript.fromJson(json);
}

/// @nodoc
mixin _$HomeworkTranscript {
  String get id => throw _privateConstructorUsedError;
  String get childId => throw _privateConstructorUsedError;
  String get assignmentId => throw _privateConstructorUsedError;
  String get assignmentTitle => throw _privateConstructorUsedError;
  String get subject => throw _privateConstructorUsedError;
  DateTime get startTime => throw _privateConstructorUsedError;
  DateTime get endTime => throw _privateConstructorUsedError;
  int get durationMinutes => throw _privateConstructorUsedError;
  List<TranscriptEntry> get entries => throw _privateConstructorUsedError;
  TranscriptSummary get summary => throw _privateConstructorUsedError;
  double get completionPercentage => throw _privateConstructorUsedError;
  String? get aiSummary => throw _privateConstructorUsedError;

  /// Serializes this HomeworkTranscript to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of HomeworkTranscript
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $HomeworkTranscriptCopyWith<HomeworkTranscript> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $HomeworkTranscriptCopyWith<$Res> {
  factory $HomeworkTranscriptCopyWith(
          HomeworkTranscript value, $Res Function(HomeworkTranscript) then) =
      _$HomeworkTranscriptCopyWithImpl<$Res, HomeworkTranscript>;
  @useResult
  $Res call(
      {String id,
      String childId,
      String assignmentId,
      String assignmentTitle,
      String subject,
      DateTime startTime,
      DateTime endTime,
      int durationMinutes,
      List<TranscriptEntry> entries,
      TranscriptSummary summary,
      double completionPercentage,
      String? aiSummary});

  $TranscriptSummaryCopyWith<$Res> get summary;
}

/// @nodoc
class _$HomeworkTranscriptCopyWithImpl<$Res, $Val extends HomeworkTranscript>
    implements $HomeworkTranscriptCopyWith<$Res> {
  _$HomeworkTranscriptCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of HomeworkTranscript
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? childId = null,
    Object? assignmentId = null,
    Object? assignmentTitle = null,
    Object? subject = null,
    Object? startTime = null,
    Object? endTime = null,
    Object? durationMinutes = null,
    Object? entries = null,
    Object? summary = null,
    Object? completionPercentage = null,
    Object? aiSummary = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      assignmentId: null == assignmentId
          ? _value.assignmentId
          : assignmentId // ignore: cast_nullable_to_non_nullable
              as String,
      assignmentTitle: null == assignmentTitle
          ? _value.assignmentTitle
          : assignmentTitle // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      startTime: null == startTime
          ? _value.startTime
          : startTime // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endTime: null == endTime
          ? _value.endTime
          : endTime // ignore: cast_nullable_to_non_nullable
              as DateTime,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      entries: null == entries
          ? _value.entries
          : entries // ignore: cast_nullable_to_non_nullable
              as List<TranscriptEntry>,
      summary: null == summary
          ? _value.summary
          : summary // ignore: cast_nullable_to_non_nullable
              as TranscriptSummary,
      completionPercentage: null == completionPercentage
          ? _value.completionPercentage
          : completionPercentage // ignore: cast_nullable_to_non_nullable
              as double,
      aiSummary: freezed == aiSummary
          ? _value.aiSummary
          : aiSummary // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }

  /// Create a copy of HomeworkTranscript
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $TranscriptSummaryCopyWith<$Res> get summary {
    return $TranscriptSummaryCopyWith<$Res>(_value.summary, (value) {
      return _then(_value.copyWith(summary: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$HomeworkTranscriptImplCopyWith<$Res>
    implements $HomeworkTranscriptCopyWith<$Res> {
  factory _$$HomeworkTranscriptImplCopyWith(_$HomeworkTranscriptImpl value,
          $Res Function(_$HomeworkTranscriptImpl) then) =
      __$$HomeworkTranscriptImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String childId,
      String assignmentId,
      String assignmentTitle,
      String subject,
      DateTime startTime,
      DateTime endTime,
      int durationMinutes,
      List<TranscriptEntry> entries,
      TranscriptSummary summary,
      double completionPercentage,
      String? aiSummary});

  @override
  $TranscriptSummaryCopyWith<$Res> get summary;
}

/// @nodoc
class __$$HomeworkTranscriptImplCopyWithImpl<$Res>
    extends _$HomeworkTranscriptCopyWithImpl<$Res, _$HomeworkTranscriptImpl>
    implements _$$HomeworkTranscriptImplCopyWith<$Res> {
  __$$HomeworkTranscriptImplCopyWithImpl(_$HomeworkTranscriptImpl _value,
      $Res Function(_$HomeworkTranscriptImpl) _then)
      : super(_value, _then);

  /// Create a copy of HomeworkTranscript
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? childId = null,
    Object? assignmentId = null,
    Object? assignmentTitle = null,
    Object? subject = null,
    Object? startTime = null,
    Object? endTime = null,
    Object? durationMinutes = null,
    Object? entries = null,
    Object? summary = null,
    Object? completionPercentage = null,
    Object? aiSummary = freezed,
  }) {
    return _then(_$HomeworkTranscriptImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      assignmentId: null == assignmentId
          ? _value.assignmentId
          : assignmentId // ignore: cast_nullable_to_non_nullable
              as String,
      assignmentTitle: null == assignmentTitle
          ? _value.assignmentTitle
          : assignmentTitle // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      startTime: null == startTime
          ? _value.startTime
          : startTime // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endTime: null == endTime
          ? _value.endTime
          : endTime // ignore: cast_nullable_to_non_nullable
              as DateTime,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      entries: null == entries
          ? _value._entries
          : entries // ignore: cast_nullable_to_non_nullable
              as List<TranscriptEntry>,
      summary: null == summary
          ? _value.summary
          : summary // ignore: cast_nullable_to_non_nullable
              as TranscriptSummary,
      completionPercentage: null == completionPercentage
          ? _value.completionPercentage
          : completionPercentage // ignore: cast_nullable_to_non_nullable
              as double,
      aiSummary: freezed == aiSummary
          ? _value.aiSummary
          : aiSummary // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$HomeworkTranscriptImpl implements _HomeworkTranscript {
  const _$HomeworkTranscriptImpl(
      {required this.id,
      required this.childId,
      required this.assignmentId,
      required this.assignmentTitle,
      required this.subject,
      required this.startTime,
      required this.endTime,
      required this.durationMinutes,
      required final List<TranscriptEntry> entries,
      required this.summary,
      required this.completionPercentage,
      this.aiSummary})
      : _entries = entries;

  factory _$HomeworkTranscriptImpl.fromJson(Map<String, dynamic> json) =>
      _$$HomeworkTranscriptImplFromJson(json);

  @override
  final String id;
  @override
  final String childId;
  @override
  final String assignmentId;
  @override
  final String assignmentTitle;
  @override
  final String subject;
  @override
  final DateTime startTime;
  @override
  final DateTime endTime;
  @override
  final int durationMinutes;
  final List<TranscriptEntry> _entries;
  @override
  List<TranscriptEntry> get entries {
    if (_entries is EqualUnmodifiableListView) return _entries;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_entries);
  }

  @override
  final TranscriptSummary summary;
  @override
  final double completionPercentage;
  @override
  final String? aiSummary;

  @override
  String toString() {
    return 'HomeworkTranscript(id: $id, childId: $childId, assignmentId: $assignmentId, assignmentTitle: $assignmentTitle, subject: $subject, startTime: $startTime, endTime: $endTime, durationMinutes: $durationMinutes, entries: $entries, summary: $summary, completionPercentage: $completionPercentage, aiSummary: $aiSummary)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$HomeworkTranscriptImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.assignmentId, assignmentId) ||
                other.assignmentId == assignmentId) &&
            (identical(other.assignmentTitle, assignmentTitle) ||
                other.assignmentTitle == assignmentTitle) &&
            (identical(other.subject, subject) || other.subject == subject) &&
            (identical(other.startTime, startTime) ||
                other.startTime == startTime) &&
            (identical(other.endTime, endTime) || other.endTime == endTime) &&
            (identical(other.durationMinutes, durationMinutes) ||
                other.durationMinutes == durationMinutes) &&
            const DeepCollectionEquality().equals(other._entries, _entries) &&
            (identical(other.summary, summary) || other.summary == summary) &&
            (identical(other.completionPercentage, completionPercentage) ||
                other.completionPercentage == completionPercentage) &&
            (identical(other.aiSummary, aiSummary) ||
                other.aiSummary == aiSummary));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      childId,
      assignmentId,
      assignmentTitle,
      subject,
      startTime,
      endTime,
      durationMinutes,
      const DeepCollectionEquality().hash(_entries),
      summary,
      completionPercentage,
      aiSummary);

  /// Create a copy of HomeworkTranscript
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$HomeworkTranscriptImplCopyWith<_$HomeworkTranscriptImpl> get copyWith =>
      __$$HomeworkTranscriptImplCopyWithImpl<_$HomeworkTranscriptImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$HomeworkTranscriptImplToJson(
      this,
    );
  }
}

abstract class _HomeworkTranscript implements HomeworkTranscript {
  const factory _HomeworkTranscript(
      {required final String id,
      required final String childId,
      required final String assignmentId,
      required final String assignmentTitle,
      required final String subject,
      required final DateTime startTime,
      required final DateTime endTime,
      required final int durationMinutes,
      required final List<TranscriptEntry> entries,
      required final TranscriptSummary summary,
      required final double completionPercentage,
      final String? aiSummary}) = _$HomeworkTranscriptImpl;

  factory _HomeworkTranscript.fromJson(Map<String, dynamic> json) =
      _$HomeworkTranscriptImpl.fromJson;

  @override
  String get id;
  @override
  String get childId;
  @override
  String get assignmentId;
  @override
  String get assignmentTitle;
  @override
  String get subject;
  @override
  DateTime get startTime;
  @override
  DateTime get endTime;
  @override
  int get durationMinutes;
  @override
  List<TranscriptEntry> get entries;
  @override
  TranscriptSummary get summary;
  @override
  double get completionPercentage;
  @override
  String? get aiSummary;

  /// Create a copy of HomeworkTranscript
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$HomeworkTranscriptImplCopyWith<_$HomeworkTranscriptImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TranscriptEntry _$TranscriptEntryFromJson(Map<String, dynamic> json) {
  return _TranscriptEntry.fromJson(json);
}

/// @nodoc
mixin _$TranscriptEntry {
  String get id => throw _privateConstructorUsedError;
  DateTime get timestamp => throw _privateConstructorUsedError;
  TranscriptEntryType get type => throw _privateConstructorUsedError;
  String get content => throw _privateConstructorUsedError;
  String? get questionAsked => throw _privateConstructorUsedError;
  String? get aiResponse => throw _privateConstructorUsedError;
  String? get hint => throw _privateConstructorUsedError;
  double? get confidenceLevel => throw _privateConstructorUsedError;
  bool? get wasCorrect => throw _privateConstructorUsedError;
  int? get attemptNumber => throw _privateConstructorUsedError;

  /// Serializes this TranscriptEntry to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TranscriptEntry
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TranscriptEntryCopyWith<TranscriptEntry> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TranscriptEntryCopyWith<$Res> {
  factory $TranscriptEntryCopyWith(
          TranscriptEntry value, $Res Function(TranscriptEntry) then) =
      _$TranscriptEntryCopyWithImpl<$Res, TranscriptEntry>;
  @useResult
  $Res call(
      {String id,
      DateTime timestamp,
      TranscriptEntryType type,
      String content,
      String? questionAsked,
      String? aiResponse,
      String? hint,
      double? confidenceLevel,
      bool? wasCorrect,
      int? attemptNumber});
}

/// @nodoc
class _$TranscriptEntryCopyWithImpl<$Res, $Val extends TranscriptEntry>
    implements $TranscriptEntryCopyWith<$Res> {
  _$TranscriptEntryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TranscriptEntry
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? timestamp = null,
    Object? type = null,
    Object? content = null,
    Object? questionAsked = freezed,
    Object? aiResponse = freezed,
    Object? hint = freezed,
    Object? confidenceLevel = freezed,
    Object? wasCorrect = freezed,
    Object? attemptNumber = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as TranscriptEntryType,
      content: null == content
          ? _value.content
          : content // ignore: cast_nullable_to_non_nullable
              as String,
      questionAsked: freezed == questionAsked
          ? _value.questionAsked
          : questionAsked // ignore: cast_nullable_to_non_nullable
              as String?,
      aiResponse: freezed == aiResponse
          ? _value.aiResponse
          : aiResponse // ignore: cast_nullable_to_non_nullable
              as String?,
      hint: freezed == hint
          ? _value.hint
          : hint // ignore: cast_nullable_to_non_nullable
              as String?,
      confidenceLevel: freezed == confidenceLevel
          ? _value.confidenceLevel
          : confidenceLevel // ignore: cast_nullable_to_non_nullable
              as double?,
      wasCorrect: freezed == wasCorrect
          ? _value.wasCorrect
          : wasCorrect // ignore: cast_nullable_to_non_nullable
              as bool?,
      attemptNumber: freezed == attemptNumber
          ? _value.attemptNumber
          : attemptNumber // ignore: cast_nullable_to_non_nullable
              as int?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TranscriptEntryImplCopyWith<$Res>
    implements $TranscriptEntryCopyWith<$Res> {
  factory _$$TranscriptEntryImplCopyWith(_$TranscriptEntryImpl value,
          $Res Function(_$TranscriptEntryImpl) then) =
      __$$TranscriptEntryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      DateTime timestamp,
      TranscriptEntryType type,
      String content,
      String? questionAsked,
      String? aiResponse,
      String? hint,
      double? confidenceLevel,
      bool? wasCorrect,
      int? attemptNumber});
}

/// @nodoc
class __$$TranscriptEntryImplCopyWithImpl<$Res>
    extends _$TranscriptEntryCopyWithImpl<$Res, _$TranscriptEntryImpl>
    implements _$$TranscriptEntryImplCopyWith<$Res> {
  __$$TranscriptEntryImplCopyWithImpl(
      _$TranscriptEntryImpl _value, $Res Function(_$TranscriptEntryImpl) _then)
      : super(_value, _then);

  /// Create a copy of TranscriptEntry
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? timestamp = null,
    Object? type = null,
    Object? content = null,
    Object? questionAsked = freezed,
    Object? aiResponse = freezed,
    Object? hint = freezed,
    Object? confidenceLevel = freezed,
    Object? wasCorrect = freezed,
    Object? attemptNumber = freezed,
  }) {
    return _then(_$TranscriptEntryImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as TranscriptEntryType,
      content: null == content
          ? _value.content
          : content // ignore: cast_nullable_to_non_nullable
              as String,
      questionAsked: freezed == questionAsked
          ? _value.questionAsked
          : questionAsked // ignore: cast_nullable_to_non_nullable
              as String?,
      aiResponse: freezed == aiResponse
          ? _value.aiResponse
          : aiResponse // ignore: cast_nullable_to_non_nullable
              as String?,
      hint: freezed == hint
          ? _value.hint
          : hint // ignore: cast_nullable_to_non_nullable
              as String?,
      confidenceLevel: freezed == confidenceLevel
          ? _value.confidenceLevel
          : confidenceLevel // ignore: cast_nullable_to_non_nullable
              as double?,
      wasCorrect: freezed == wasCorrect
          ? _value.wasCorrect
          : wasCorrect // ignore: cast_nullable_to_non_nullable
              as bool?,
      attemptNumber: freezed == attemptNumber
          ? _value.attemptNumber
          : attemptNumber // ignore: cast_nullable_to_non_nullable
              as int?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TranscriptEntryImpl implements _TranscriptEntry {
  const _$TranscriptEntryImpl(
      {required this.id,
      required this.timestamp,
      required this.type,
      required this.content,
      this.questionAsked,
      this.aiResponse,
      this.hint,
      this.confidenceLevel,
      this.wasCorrect,
      this.attemptNumber});

  factory _$TranscriptEntryImpl.fromJson(Map<String, dynamic> json) =>
      _$$TranscriptEntryImplFromJson(json);

  @override
  final String id;
  @override
  final DateTime timestamp;
  @override
  final TranscriptEntryType type;
  @override
  final String content;
  @override
  final String? questionAsked;
  @override
  final String? aiResponse;
  @override
  final String? hint;
  @override
  final double? confidenceLevel;
  @override
  final bool? wasCorrect;
  @override
  final int? attemptNumber;

  @override
  String toString() {
    return 'TranscriptEntry(id: $id, timestamp: $timestamp, type: $type, content: $content, questionAsked: $questionAsked, aiResponse: $aiResponse, hint: $hint, confidenceLevel: $confidenceLevel, wasCorrect: $wasCorrect, attemptNumber: $attemptNumber)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TranscriptEntryImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.timestamp, timestamp) ||
                other.timestamp == timestamp) &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.content, content) || other.content == content) &&
            (identical(other.questionAsked, questionAsked) ||
                other.questionAsked == questionAsked) &&
            (identical(other.aiResponse, aiResponse) ||
                other.aiResponse == aiResponse) &&
            (identical(other.hint, hint) || other.hint == hint) &&
            (identical(other.confidenceLevel, confidenceLevel) ||
                other.confidenceLevel == confidenceLevel) &&
            (identical(other.wasCorrect, wasCorrect) ||
                other.wasCorrect == wasCorrect) &&
            (identical(other.attemptNumber, attemptNumber) ||
                other.attemptNumber == attemptNumber));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      timestamp,
      type,
      content,
      questionAsked,
      aiResponse,
      hint,
      confidenceLevel,
      wasCorrect,
      attemptNumber);

  /// Create a copy of TranscriptEntry
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TranscriptEntryImplCopyWith<_$TranscriptEntryImpl> get copyWith =>
      __$$TranscriptEntryImplCopyWithImpl<_$TranscriptEntryImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TranscriptEntryImplToJson(
      this,
    );
  }
}

abstract class _TranscriptEntry implements TranscriptEntry {
  const factory _TranscriptEntry(
      {required final String id,
      required final DateTime timestamp,
      required final TranscriptEntryType type,
      required final String content,
      final String? questionAsked,
      final String? aiResponse,
      final String? hint,
      final double? confidenceLevel,
      final bool? wasCorrect,
      final int? attemptNumber}) = _$TranscriptEntryImpl;

  factory _TranscriptEntry.fromJson(Map<String, dynamic> json) =
      _$TranscriptEntryImpl.fromJson;

  @override
  String get id;
  @override
  DateTime get timestamp;
  @override
  TranscriptEntryType get type;
  @override
  String get content;
  @override
  String? get questionAsked;
  @override
  String? get aiResponse;
  @override
  String? get hint;
  @override
  double? get confidenceLevel;
  @override
  bool? get wasCorrect;
  @override
  int? get attemptNumber;

  /// Create a copy of TranscriptEntry
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TranscriptEntryImplCopyWith<_$TranscriptEntryImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TranscriptSummary _$TranscriptSummaryFromJson(Map<String, dynamic> json) {
  return _TranscriptSummary.fromJson(json);
}

/// @nodoc
mixin _$TranscriptSummary {
  int get totalQuestions => throw _privateConstructorUsedError;
  int get correctAnswers => throw _privateConstructorUsedError;
  int get hintsUsed => throw _privateConstructorUsedError;
  int get strugglesDetected => throw _privateConstructorUsedError;
  List<String> get topicsWorkedOn => throw _privateConstructorUsedError;
  List<String> get strengthsShown => throw _privateConstructorUsedError;
  List<String> get areasForImprovement => throw _privateConstructorUsedError;
  String? get parentRecommendation => throw _privateConstructorUsedError;

  /// Serializes this TranscriptSummary to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TranscriptSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TranscriptSummaryCopyWith<TranscriptSummary> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TranscriptSummaryCopyWith<$Res> {
  factory $TranscriptSummaryCopyWith(
          TranscriptSummary value, $Res Function(TranscriptSummary) then) =
      _$TranscriptSummaryCopyWithImpl<$Res, TranscriptSummary>;
  @useResult
  $Res call(
      {int totalQuestions,
      int correctAnswers,
      int hintsUsed,
      int strugglesDetected,
      List<String> topicsWorkedOn,
      List<String> strengthsShown,
      List<String> areasForImprovement,
      String? parentRecommendation});
}

/// @nodoc
class _$TranscriptSummaryCopyWithImpl<$Res, $Val extends TranscriptSummary>
    implements $TranscriptSummaryCopyWith<$Res> {
  _$TranscriptSummaryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TranscriptSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? totalQuestions = null,
    Object? correctAnswers = null,
    Object? hintsUsed = null,
    Object? strugglesDetected = null,
    Object? topicsWorkedOn = null,
    Object? strengthsShown = null,
    Object? areasForImprovement = null,
    Object? parentRecommendation = freezed,
  }) {
    return _then(_value.copyWith(
      totalQuestions: null == totalQuestions
          ? _value.totalQuestions
          : totalQuestions // ignore: cast_nullable_to_non_nullable
              as int,
      correctAnswers: null == correctAnswers
          ? _value.correctAnswers
          : correctAnswers // ignore: cast_nullable_to_non_nullable
              as int,
      hintsUsed: null == hintsUsed
          ? _value.hintsUsed
          : hintsUsed // ignore: cast_nullable_to_non_nullable
              as int,
      strugglesDetected: null == strugglesDetected
          ? _value.strugglesDetected
          : strugglesDetected // ignore: cast_nullable_to_non_nullable
              as int,
      topicsWorkedOn: null == topicsWorkedOn
          ? _value.topicsWorkedOn
          : topicsWorkedOn // ignore: cast_nullable_to_non_nullable
              as List<String>,
      strengthsShown: null == strengthsShown
          ? _value.strengthsShown
          : strengthsShown // ignore: cast_nullable_to_non_nullable
              as List<String>,
      areasForImprovement: null == areasForImprovement
          ? _value.areasForImprovement
          : areasForImprovement // ignore: cast_nullable_to_non_nullable
              as List<String>,
      parentRecommendation: freezed == parentRecommendation
          ? _value.parentRecommendation
          : parentRecommendation // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TranscriptSummaryImplCopyWith<$Res>
    implements $TranscriptSummaryCopyWith<$Res> {
  factory _$$TranscriptSummaryImplCopyWith(_$TranscriptSummaryImpl value,
          $Res Function(_$TranscriptSummaryImpl) then) =
      __$$TranscriptSummaryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {int totalQuestions,
      int correctAnswers,
      int hintsUsed,
      int strugglesDetected,
      List<String> topicsWorkedOn,
      List<String> strengthsShown,
      List<String> areasForImprovement,
      String? parentRecommendation});
}

/// @nodoc
class __$$TranscriptSummaryImplCopyWithImpl<$Res>
    extends _$TranscriptSummaryCopyWithImpl<$Res, _$TranscriptSummaryImpl>
    implements _$$TranscriptSummaryImplCopyWith<$Res> {
  __$$TranscriptSummaryImplCopyWithImpl(_$TranscriptSummaryImpl _value,
      $Res Function(_$TranscriptSummaryImpl) _then)
      : super(_value, _then);

  /// Create a copy of TranscriptSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? totalQuestions = null,
    Object? correctAnswers = null,
    Object? hintsUsed = null,
    Object? strugglesDetected = null,
    Object? topicsWorkedOn = null,
    Object? strengthsShown = null,
    Object? areasForImprovement = null,
    Object? parentRecommendation = freezed,
  }) {
    return _then(_$TranscriptSummaryImpl(
      totalQuestions: null == totalQuestions
          ? _value.totalQuestions
          : totalQuestions // ignore: cast_nullable_to_non_nullable
              as int,
      correctAnswers: null == correctAnswers
          ? _value.correctAnswers
          : correctAnswers // ignore: cast_nullable_to_non_nullable
              as int,
      hintsUsed: null == hintsUsed
          ? _value.hintsUsed
          : hintsUsed // ignore: cast_nullable_to_non_nullable
              as int,
      strugglesDetected: null == strugglesDetected
          ? _value.strugglesDetected
          : strugglesDetected // ignore: cast_nullable_to_non_nullable
              as int,
      topicsWorkedOn: null == topicsWorkedOn
          ? _value._topicsWorkedOn
          : topicsWorkedOn // ignore: cast_nullable_to_non_nullable
              as List<String>,
      strengthsShown: null == strengthsShown
          ? _value._strengthsShown
          : strengthsShown // ignore: cast_nullable_to_non_nullable
              as List<String>,
      areasForImprovement: null == areasForImprovement
          ? _value._areasForImprovement
          : areasForImprovement // ignore: cast_nullable_to_non_nullable
              as List<String>,
      parentRecommendation: freezed == parentRecommendation
          ? _value.parentRecommendation
          : parentRecommendation // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TranscriptSummaryImpl implements _TranscriptSummary {
  const _$TranscriptSummaryImpl(
      {required this.totalQuestions,
      required this.correctAnswers,
      required this.hintsUsed,
      required this.strugglesDetected,
      required final List<String> topicsWorkedOn,
      required final List<String> strengthsShown,
      required final List<String> areasForImprovement,
      this.parentRecommendation})
      : _topicsWorkedOn = topicsWorkedOn,
        _strengthsShown = strengthsShown,
        _areasForImprovement = areasForImprovement;

  factory _$TranscriptSummaryImpl.fromJson(Map<String, dynamic> json) =>
      _$$TranscriptSummaryImplFromJson(json);

  @override
  final int totalQuestions;
  @override
  final int correctAnswers;
  @override
  final int hintsUsed;
  @override
  final int strugglesDetected;
  final List<String> _topicsWorkedOn;
  @override
  List<String> get topicsWorkedOn {
    if (_topicsWorkedOn is EqualUnmodifiableListView) return _topicsWorkedOn;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_topicsWorkedOn);
  }

  final List<String> _strengthsShown;
  @override
  List<String> get strengthsShown {
    if (_strengthsShown is EqualUnmodifiableListView) return _strengthsShown;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_strengthsShown);
  }

  final List<String> _areasForImprovement;
  @override
  List<String> get areasForImprovement {
    if (_areasForImprovement is EqualUnmodifiableListView)
      return _areasForImprovement;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_areasForImprovement);
  }

  @override
  final String? parentRecommendation;

  @override
  String toString() {
    return 'TranscriptSummary(totalQuestions: $totalQuestions, correctAnswers: $correctAnswers, hintsUsed: $hintsUsed, strugglesDetected: $strugglesDetected, topicsWorkedOn: $topicsWorkedOn, strengthsShown: $strengthsShown, areasForImprovement: $areasForImprovement, parentRecommendation: $parentRecommendation)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TranscriptSummaryImpl &&
            (identical(other.totalQuestions, totalQuestions) ||
                other.totalQuestions == totalQuestions) &&
            (identical(other.correctAnswers, correctAnswers) ||
                other.correctAnswers == correctAnswers) &&
            (identical(other.hintsUsed, hintsUsed) ||
                other.hintsUsed == hintsUsed) &&
            (identical(other.strugglesDetected, strugglesDetected) ||
                other.strugglesDetected == strugglesDetected) &&
            const DeepCollectionEquality()
                .equals(other._topicsWorkedOn, _topicsWorkedOn) &&
            const DeepCollectionEquality()
                .equals(other._strengthsShown, _strengthsShown) &&
            const DeepCollectionEquality()
                .equals(other._areasForImprovement, _areasForImprovement) &&
            (identical(other.parentRecommendation, parentRecommendation) ||
                other.parentRecommendation == parentRecommendation));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      totalQuestions,
      correctAnswers,
      hintsUsed,
      strugglesDetected,
      const DeepCollectionEquality().hash(_topicsWorkedOn),
      const DeepCollectionEquality().hash(_strengthsShown),
      const DeepCollectionEquality().hash(_areasForImprovement),
      parentRecommendation);

  /// Create a copy of TranscriptSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TranscriptSummaryImplCopyWith<_$TranscriptSummaryImpl> get copyWith =>
      __$$TranscriptSummaryImplCopyWithImpl<_$TranscriptSummaryImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TranscriptSummaryImplToJson(
      this,
    );
  }
}

abstract class _TranscriptSummary implements TranscriptSummary {
  const factory _TranscriptSummary(
      {required final int totalQuestions,
      required final int correctAnswers,
      required final int hintsUsed,
      required final int strugglesDetected,
      required final List<String> topicsWorkedOn,
      required final List<String> strengthsShown,
      required final List<String> areasForImprovement,
      final String? parentRecommendation}) = _$TranscriptSummaryImpl;

  factory _TranscriptSummary.fromJson(Map<String, dynamic> json) =
      _$TranscriptSummaryImpl.fromJson;

  @override
  int get totalQuestions;
  @override
  int get correctAnswers;
  @override
  int get hintsUsed;
  @override
  int get strugglesDetected;
  @override
  List<String> get topicsWorkedOn;
  @override
  List<String> get strengthsShown;
  @override
  List<String> get areasForImprovement;
  @override
  String? get parentRecommendation;

  /// Create a copy of TranscriptSummary
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TranscriptSummaryImplCopyWith<_$TranscriptSummaryImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TeacherNote _$TeacherNoteFromJson(Map<String, dynamic> json) {
  return _TeacherNote.fromJson(json);
}

/// @nodoc
mixin _$TeacherNote {
  String get id => throw _privateConstructorUsedError;
  String get childId => throw _privateConstructorUsedError;
  String get teacherId => throw _privateConstructorUsedError;
  String get teacherName => throw _privateConstructorUsedError;
  String get subject => throw _privateConstructorUsedError;
  DateTime get createdAt => throw _privateConstructorUsedError;
  TeacherNoteType get type => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String get content => throw _privateConstructorUsedError;
  bool get isRead => throw _privateConstructorUsedError;
  NotePriority get priority => throw _privateConstructorUsedError;
  DateTime? get readAt => throw _privateConstructorUsedError;
  List<String>? get attachmentUrls => throw _privateConstructorUsedError;
  String? get actionRequired => throw _privateConstructorUsedError;
  DateTime? get actionDueDate => throw _privateConstructorUsedError;
  bool? get acknowledged => throw _privateConstructorUsedError;
  String? get parentResponse => throw _privateConstructorUsedError;

  /// Serializes this TeacherNote to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TeacherNote
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TeacherNoteCopyWith<TeacherNote> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TeacherNoteCopyWith<$Res> {
  factory $TeacherNoteCopyWith(
          TeacherNote value, $Res Function(TeacherNote) then) =
      _$TeacherNoteCopyWithImpl<$Res, TeacherNote>;
  @useResult
  $Res call(
      {String id,
      String childId,
      String teacherId,
      String teacherName,
      String subject,
      DateTime createdAt,
      TeacherNoteType type,
      String title,
      String content,
      bool isRead,
      NotePriority priority,
      DateTime? readAt,
      List<String>? attachmentUrls,
      String? actionRequired,
      DateTime? actionDueDate,
      bool? acknowledged,
      String? parentResponse});
}

/// @nodoc
class _$TeacherNoteCopyWithImpl<$Res, $Val extends TeacherNote>
    implements $TeacherNoteCopyWith<$Res> {
  _$TeacherNoteCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TeacherNote
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? childId = null,
    Object? teacherId = null,
    Object? teacherName = null,
    Object? subject = null,
    Object? createdAt = null,
    Object? type = null,
    Object? title = null,
    Object? content = null,
    Object? isRead = null,
    Object? priority = null,
    Object? readAt = freezed,
    Object? attachmentUrls = freezed,
    Object? actionRequired = freezed,
    Object? actionDueDate = freezed,
    Object? acknowledged = freezed,
    Object? parentResponse = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      teacherId: null == teacherId
          ? _value.teacherId
          : teacherId // ignore: cast_nullable_to_non_nullable
              as String,
      teacherName: null == teacherName
          ? _value.teacherName
          : teacherName // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as TeacherNoteType,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      content: null == content
          ? _value.content
          : content // ignore: cast_nullable_to_non_nullable
              as String,
      isRead: null == isRead
          ? _value.isRead
          : isRead // ignore: cast_nullable_to_non_nullable
              as bool,
      priority: null == priority
          ? _value.priority
          : priority // ignore: cast_nullable_to_non_nullable
              as NotePriority,
      readAt: freezed == readAt
          ? _value.readAt
          : readAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      attachmentUrls: freezed == attachmentUrls
          ? _value.attachmentUrls
          : attachmentUrls // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      actionRequired: freezed == actionRequired
          ? _value.actionRequired
          : actionRequired // ignore: cast_nullable_to_non_nullable
              as String?,
      actionDueDate: freezed == actionDueDate
          ? _value.actionDueDate
          : actionDueDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      acknowledged: freezed == acknowledged
          ? _value.acknowledged
          : acknowledged // ignore: cast_nullable_to_non_nullable
              as bool?,
      parentResponse: freezed == parentResponse
          ? _value.parentResponse
          : parentResponse // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TeacherNoteImplCopyWith<$Res>
    implements $TeacherNoteCopyWith<$Res> {
  factory _$$TeacherNoteImplCopyWith(
          _$TeacherNoteImpl value, $Res Function(_$TeacherNoteImpl) then) =
      __$$TeacherNoteImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String childId,
      String teacherId,
      String teacherName,
      String subject,
      DateTime createdAt,
      TeacherNoteType type,
      String title,
      String content,
      bool isRead,
      NotePriority priority,
      DateTime? readAt,
      List<String>? attachmentUrls,
      String? actionRequired,
      DateTime? actionDueDate,
      bool? acknowledged,
      String? parentResponse});
}

/// @nodoc
class __$$TeacherNoteImplCopyWithImpl<$Res>
    extends _$TeacherNoteCopyWithImpl<$Res, _$TeacherNoteImpl>
    implements _$$TeacherNoteImplCopyWith<$Res> {
  __$$TeacherNoteImplCopyWithImpl(
      _$TeacherNoteImpl _value, $Res Function(_$TeacherNoteImpl) _then)
      : super(_value, _then);

  /// Create a copy of TeacherNote
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? childId = null,
    Object? teacherId = null,
    Object? teacherName = null,
    Object? subject = null,
    Object? createdAt = null,
    Object? type = null,
    Object? title = null,
    Object? content = null,
    Object? isRead = null,
    Object? priority = null,
    Object? readAt = freezed,
    Object? attachmentUrls = freezed,
    Object? actionRequired = freezed,
    Object? actionDueDate = freezed,
    Object? acknowledged = freezed,
    Object? parentResponse = freezed,
  }) {
    return _then(_$TeacherNoteImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      teacherId: null == teacherId
          ? _value.teacherId
          : teacherId // ignore: cast_nullable_to_non_nullable
              as String,
      teacherName: null == teacherName
          ? _value.teacherName
          : teacherName // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as TeacherNoteType,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      content: null == content
          ? _value.content
          : content // ignore: cast_nullable_to_non_nullable
              as String,
      isRead: null == isRead
          ? _value.isRead
          : isRead // ignore: cast_nullable_to_non_nullable
              as bool,
      priority: null == priority
          ? _value.priority
          : priority // ignore: cast_nullable_to_non_nullable
              as NotePriority,
      readAt: freezed == readAt
          ? _value.readAt
          : readAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      attachmentUrls: freezed == attachmentUrls
          ? _value._attachmentUrls
          : attachmentUrls // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      actionRequired: freezed == actionRequired
          ? _value.actionRequired
          : actionRequired // ignore: cast_nullable_to_non_nullable
              as String?,
      actionDueDate: freezed == actionDueDate
          ? _value.actionDueDate
          : actionDueDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      acknowledged: freezed == acknowledged
          ? _value.acknowledged
          : acknowledged // ignore: cast_nullable_to_non_nullable
              as bool?,
      parentResponse: freezed == parentResponse
          ? _value.parentResponse
          : parentResponse // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TeacherNoteImpl implements _TeacherNote {
  const _$TeacherNoteImpl(
      {required this.id,
      required this.childId,
      required this.teacherId,
      required this.teacherName,
      required this.subject,
      required this.createdAt,
      required this.type,
      required this.title,
      required this.content,
      required this.isRead,
      required this.priority,
      this.readAt,
      final List<String>? attachmentUrls,
      this.actionRequired,
      this.actionDueDate,
      this.acknowledged,
      this.parentResponse})
      : _attachmentUrls = attachmentUrls;

  factory _$TeacherNoteImpl.fromJson(Map<String, dynamic> json) =>
      _$$TeacherNoteImplFromJson(json);

  @override
  final String id;
  @override
  final String childId;
  @override
  final String teacherId;
  @override
  final String teacherName;
  @override
  final String subject;
  @override
  final DateTime createdAt;
  @override
  final TeacherNoteType type;
  @override
  final String title;
  @override
  final String content;
  @override
  final bool isRead;
  @override
  final NotePriority priority;
  @override
  final DateTime? readAt;
  final List<String>? _attachmentUrls;
  @override
  List<String>? get attachmentUrls {
    final value = _attachmentUrls;
    if (value == null) return null;
    if (_attachmentUrls is EqualUnmodifiableListView) return _attachmentUrls;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  final String? actionRequired;
  @override
  final DateTime? actionDueDate;
  @override
  final bool? acknowledged;
  @override
  final String? parentResponse;

  @override
  String toString() {
    return 'TeacherNote(id: $id, childId: $childId, teacherId: $teacherId, teacherName: $teacherName, subject: $subject, createdAt: $createdAt, type: $type, title: $title, content: $content, isRead: $isRead, priority: $priority, readAt: $readAt, attachmentUrls: $attachmentUrls, actionRequired: $actionRequired, actionDueDate: $actionDueDate, acknowledged: $acknowledged, parentResponse: $parentResponse)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TeacherNoteImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.teacherId, teacherId) ||
                other.teacherId == teacherId) &&
            (identical(other.teacherName, teacherName) ||
                other.teacherName == teacherName) &&
            (identical(other.subject, subject) || other.subject == subject) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.content, content) || other.content == content) &&
            (identical(other.isRead, isRead) || other.isRead == isRead) &&
            (identical(other.priority, priority) ||
                other.priority == priority) &&
            (identical(other.readAt, readAt) || other.readAt == readAt) &&
            const DeepCollectionEquality()
                .equals(other._attachmentUrls, _attachmentUrls) &&
            (identical(other.actionRequired, actionRequired) ||
                other.actionRequired == actionRequired) &&
            (identical(other.actionDueDate, actionDueDate) ||
                other.actionDueDate == actionDueDate) &&
            (identical(other.acknowledged, acknowledged) ||
                other.acknowledged == acknowledged) &&
            (identical(other.parentResponse, parentResponse) ||
                other.parentResponse == parentResponse));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      childId,
      teacherId,
      teacherName,
      subject,
      createdAt,
      type,
      title,
      content,
      isRead,
      priority,
      readAt,
      const DeepCollectionEquality().hash(_attachmentUrls),
      actionRequired,
      actionDueDate,
      acknowledged,
      parentResponse);

  /// Create a copy of TeacherNote
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TeacherNoteImplCopyWith<_$TeacherNoteImpl> get copyWith =>
      __$$TeacherNoteImplCopyWithImpl<_$TeacherNoteImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TeacherNoteImplToJson(
      this,
    );
  }
}

abstract class _TeacherNote implements TeacherNote {
  const factory _TeacherNote(
      {required final String id,
      required final String childId,
      required final String teacherId,
      required final String teacherName,
      required final String subject,
      required final DateTime createdAt,
      required final TeacherNoteType type,
      required final String title,
      required final String content,
      required final bool isRead,
      required final NotePriority priority,
      final DateTime? readAt,
      final List<String>? attachmentUrls,
      final String? actionRequired,
      final DateTime? actionDueDate,
      final bool? acknowledged,
      final String? parentResponse}) = _$TeacherNoteImpl;

  factory _TeacherNote.fromJson(Map<String, dynamic> json) =
      _$TeacherNoteImpl.fromJson;

  @override
  String get id;
  @override
  String get childId;
  @override
  String get teacherId;
  @override
  String get teacherName;
  @override
  String get subject;
  @override
  DateTime get createdAt;
  @override
  TeacherNoteType get type;
  @override
  String get title;
  @override
  String get content;
  @override
  bool get isRead;
  @override
  NotePriority get priority;
  @override
  DateTime? get readAt;
  @override
  List<String>? get attachmentUrls;
  @override
  String? get actionRequired;
  @override
  DateTime? get actionDueDate;
  @override
  bool? get acknowledged;
  @override
  String? get parentResponse;

  /// Create a copy of TeacherNote
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TeacherNoteImplCopyWith<_$TeacherNoteImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ProgressReport _$ProgressReportFromJson(Map<String, dynamic> json) {
  return _ProgressReport.fromJson(json);
}

/// @nodoc
mixin _$ProgressReport {
  String get id => throw _privateConstructorUsedError;
  String get childId => throw _privateConstructorUsedError;
  String get childName => throw _privateConstructorUsedError;
  ReportPeriod get period => throw _privateConstructorUsedError;
  DateTime get generatedAt => throw _privateConstructorUsedError;
  DateTime get periodStart => throw _privateConstructorUsedError;
  DateTime get periodEnd => throw _privateConstructorUsedError;
  OverallProgress get overallProgress => throw _privateConstructorUsedError;
  List<SubjectProgress> get subjectProgress =>
      throw _privateConstructorUsedError;
  EngagementMetrics get engagement => throw _privateConstructorUsedError;
  List<String> get achievements => throw _privateConstructorUsedError;
  List<String> get areasForGrowth => throw _privateConstructorUsedError;
  List<GoalProgress> get goalProgress => throw _privateConstructorUsedError;
  String? get teacherComments => throw _privateConstructorUsedError;
  String? get aiInsights => throw _privateConstructorUsedError;
  String? get pdfUrl => throw _privateConstructorUsedError;

  /// Serializes this ProgressReport to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ProgressReport
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ProgressReportCopyWith<ProgressReport> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ProgressReportCopyWith<$Res> {
  factory $ProgressReportCopyWith(
          ProgressReport value, $Res Function(ProgressReport) then) =
      _$ProgressReportCopyWithImpl<$Res, ProgressReport>;
  @useResult
  $Res call(
      {String id,
      String childId,
      String childName,
      ReportPeriod period,
      DateTime generatedAt,
      DateTime periodStart,
      DateTime periodEnd,
      OverallProgress overallProgress,
      List<SubjectProgress> subjectProgress,
      EngagementMetrics engagement,
      List<String> achievements,
      List<String> areasForGrowth,
      List<GoalProgress> goalProgress,
      String? teacherComments,
      String? aiInsights,
      String? pdfUrl});

  $OverallProgressCopyWith<$Res> get overallProgress;
  $EngagementMetricsCopyWith<$Res> get engagement;
}

/// @nodoc
class _$ProgressReportCopyWithImpl<$Res, $Val extends ProgressReport>
    implements $ProgressReportCopyWith<$Res> {
  _$ProgressReportCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ProgressReport
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? childId = null,
    Object? childName = null,
    Object? period = null,
    Object? generatedAt = null,
    Object? periodStart = null,
    Object? periodEnd = null,
    Object? overallProgress = null,
    Object? subjectProgress = null,
    Object? engagement = null,
    Object? achievements = null,
    Object? areasForGrowth = null,
    Object? goalProgress = null,
    Object? teacherComments = freezed,
    Object? aiInsights = freezed,
    Object? pdfUrl = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      childName: null == childName
          ? _value.childName
          : childName // ignore: cast_nullable_to_non_nullable
              as String,
      period: null == period
          ? _value.period
          : period // ignore: cast_nullable_to_non_nullable
              as ReportPeriod,
      generatedAt: null == generatedAt
          ? _value.generatedAt
          : generatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      periodStart: null == periodStart
          ? _value.periodStart
          : periodStart // ignore: cast_nullable_to_non_nullable
              as DateTime,
      periodEnd: null == periodEnd
          ? _value.periodEnd
          : periodEnd // ignore: cast_nullable_to_non_nullable
              as DateTime,
      overallProgress: null == overallProgress
          ? _value.overallProgress
          : overallProgress // ignore: cast_nullable_to_non_nullable
              as OverallProgress,
      subjectProgress: null == subjectProgress
          ? _value.subjectProgress
          : subjectProgress // ignore: cast_nullable_to_non_nullable
              as List<SubjectProgress>,
      engagement: null == engagement
          ? _value.engagement
          : engagement // ignore: cast_nullable_to_non_nullable
              as EngagementMetrics,
      achievements: null == achievements
          ? _value.achievements
          : achievements // ignore: cast_nullable_to_non_nullable
              as List<String>,
      areasForGrowth: null == areasForGrowth
          ? _value.areasForGrowth
          : areasForGrowth // ignore: cast_nullable_to_non_nullable
              as List<String>,
      goalProgress: null == goalProgress
          ? _value.goalProgress
          : goalProgress // ignore: cast_nullable_to_non_nullable
              as List<GoalProgress>,
      teacherComments: freezed == teacherComments
          ? _value.teacherComments
          : teacherComments // ignore: cast_nullable_to_non_nullable
              as String?,
      aiInsights: freezed == aiInsights
          ? _value.aiInsights
          : aiInsights // ignore: cast_nullable_to_non_nullable
              as String?,
      pdfUrl: freezed == pdfUrl
          ? _value.pdfUrl
          : pdfUrl // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }

  /// Create a copy of ProgressReport
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $OverallProgressCopyWith<$Res> get overallProgress {
    return $OverallProgressCopyWith<$Res>(_value.overallProgress, (value) {
      return _then(_value.copyWith(overallProgress: value) as $Val);
    });
  }

  /// Create a copy of ProgressReport
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $EngagementMetricsCopyWith<$Res> get engagement {
    return $EngagementMetricsCopyWith<$Res>(_value.engagement, (value) {
      return _then(_value.copyWith(engagement: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$ProgressReportImplCopyWith<$Res>
    implements $ProgressReportCopyWith<$Res> {
  factory _$$ProgressReportImplCopyWith(_$ProgressReportImpl value,
          $Res Function(_$ProgressReportImpl) then) =
      __$$ProgressReportImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String childId,
      String childName,
      ReportPeriod period,
      DateTime generatedAt,
      DateTime periodStart,
      DateTime periodEnd,
      OverallProgress overallProgress,
      List<SubjectProgress> subjectProgress,
      EngagementMetrics engagement,
      List<String> achievements,
      List<String> areasForGrowth,
      List<GoalProgress> goalProgress,
      String? teacherComments,
      String? aiInsights,
      String? pdfUrl});

  @override
  $OverallProgressCopyWith<$Res> get overallProgress;
  @override
  $EngagementMetricsCopyWith<$Res> get engagement;
}

/// @nodoc
class __$$ProgressReportImplCopyWithImpl<$Res>
    extends _$ProgressReportCopyWithImpl<$Res, _$ProgressReportImpl>
    implements _$$ProgressReportImplCopyWith<$Res> {
  __$$ProgressReportImplCopyWithImpl(
      _$ProgressReportImpl _value, $Res Function(_$ProgressReportImpl) _then)
      : super(_value, _then);

  /// Create a copy of ProgressReport
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? childId = null,
    Object? childName = null,
    Object? period = null,
    Object? generatedAt = null,
    Object? periodStart = null,
    Object? periodEnd = null,
    Object? overallProgress = null,
    Object? subjectProgress = null,
    Object? engagement = null,
    Object? achievements = null,
    Object? areasForGrowth = null,
    Object? goalProgress = null,
    Object? teacherComments = freezed,
    Object? aiInsights = freezed,
    Object? pdfUrl = freezed,
  }) {
    return _then(_$ProgressReportImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      childName: null == childName
          ? _value.childName
          : childName // ignore: cast_nullable_to_non_nullable
              as String,
      period: null == period
          ? _value.period
          : period // ignore: cast_nullable_to_non_nullable
              as ReportPeriod,
      generatedAt: null == generatedAt
          ? _value.generatedAt
          : generatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      periodStart: null == periodStart
          ? _value.periodStart
          : periodStart // ignore: cast_nullable_to_non_nullable
              as DateTime,
      periodEnd: null == periodEnd
          ? _value.periodEnd
          : periodEnd // ignore: cast_nullable_to_non_nullable
              as DateTime,
      overallProgress: null == overallProgress
          ? _value.overallProgress
          : overallProgress // ignore: cast_nullable_to_non_nullable
              as OverallProgress,
      subjectProgress: null == subjectProgress
          ? _value._subjectProgress
          : subjectProgress // ignore: cast_nullable_to_non_nullable
              as List<SubjectProgress>,
      engagement: null == engagement
          ? _value.engagement
          : engagement // ignore: cast_nullable_to_non_nullable
              as EngagementMetrics,
      achievements: null == achievements
          ? _value._achievements
          : achievements // ignore: cast_nullable_to_non_nullable
              as List<String>,
      areasForGrowth: null == areasForGrowth
          ? _value._areasForGrowth
          : areasForGrowth // ignore: cast_nullable_to_non_nullable
              as List<String>,
      goalProgress: null == goalProgress
          ? _value._goalProgress
          : goalProgress // ignore: cast_nullable_to_non_nullable
              as List<GoalProgress>,
      teacherComments: freezed == teacherComments
          ? _value.teacherComments
          : teacherComments // ignore: cast_nullable_to_non_nullable
              as String?,
      aiInsights: freezed == aiInsights
          ? _value.aiInsights
          : aiInsights // ignore: cast_nullable_to_non_nullable
              as String?,
      pdfUrl: freezed == pdfUrl
          ? _value.pdfUrl
          : pdfUrl // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ProgressReportImpl implements _ProgressReport {
  const _$ProgressReportImpl(
      {required this.id,
      required this.childId,
      required this.childName,
      required this.period,
      required this.generatedAt,
      required this.periodStart,
      required this.periodEnd,
      required this.overallProgress,
      required final List<SubjectProgress> subjectProgress,
      required this.engagement,
      required final List<String> achievements,
      required final List<String> areasForGrowth,
      required final List<GoalProgress> goalProgress,
      this.teacherComments,
      this.aiInsights,
      this.pdfUrl})
      : _subjectProgress = subjectProgress,
        _achievements = achievements,
        _areasForGrowth = areasForGrowth,
        _goalProgress = goalProgress;

  factory _$ProgressReportImpl.fromJson(Map<String, dynamic> json) =>
      _$$ProgressReportImplFromJson(json);

  @override
  final String id;
  @override
  final String childId;
  @override
  final String childName;
  @override
  final ReportPeriod period;
  @override
  final DateTime generatedAt;
  @override
  final DateTime periodStart;
  @override
  final DateTime periodEnd;
  @override
  final OverallProgress overallProgress;
  final List<SubjectProgress> _subjectProgress;
  @override
  List<SubjectProgress> get subjectProgress {
    if (_subjectProgress is EqualUnmodifiableListView) return _subjectProgress;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_subjectProgress);
  }

  @override
  final EngagementMetrics engagement;
  final List<String> _achievements;
  @override
  List<String> get achievements {
    if (_achievements is EqualUnmodifiableListView) return _achievements;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_achievements);
  }

  final List<String> _areasForGrowth;
  @override
  List<String> get areasForGrowth {
    if (_areasForGrowth is EqualUnmodifiableListView) return _areasForGrowth;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_areasForGrowth);
  }

  final List<GoalProgress> _goalProgress;
  @override
  List<GoalProgress> get goalProgress {
    if (_goalProgress is EqualUnmodifiableListView) return _goalProgress;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_goalProgress);
  }

  @override
  final String? teacherComments;
  @override
  final String? aiInsights;
  @override
  final String? pdfUrl;

  @override
  String toString() {
    return 'ProgressReport(id: $id, childId: $childId, childName: $childName, period: $period, generatedAt: $generatedAt, periodStart: $periodStart, periodEnd: $periodEnd, overallProgress: $overallProgress, subjectProgress: $subjectProgress, engagement: $engagement, achievements: $achievements, areasForGrowth: $areasForGrowth, goalProgress: $goalProgress, teacherComments: $teacherComments, aiInsights: $aiInsights, pdfUrl: $pdfUrl)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ProgressReportImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.childName, childName) ||
                other.childName == childName) &&
            (identical(other.period, period) || other.period == period) &&
            (identical(other.generatedAt, generatedAt) ||
                other.generatedAt == generatedAt) &&
            (identical(other.periodStart, periodStart) ||
                other.periodStart == periodStart) &&
            (identical(other.periodEnd, periodEnd) ||
                other.periodEnd == periodEnd) &&
            (identical(other.overallProgress, overallProgress) ||
                other.overallProgress == overallProgress) &&
            const DeepCollectionEquality()
                .equals(other._subjectProgress, _subjectProgress) &&
            (identical(other.engagement, engagement) ||
                other.engagement == engagement) &&
            const DeepCollectionEquality()
                .equals(other._achievements, _achievements) &&
            const DeepCollectionEquality()
                .equals(other._areasForGrowth, _areasForGrowth) &&
            const DeepCollectionEquality()
                .equals(other._goalProgress, _goalProgress) &&
            (identical(other.teacherComments, teacherComments) ||
                other.teacherComments == teacherComments) &&
            (identical(other.aiInsights, aiInsights) ||
                other.aiInsights == aiInsights) &&
            (identical(other.pdfUrl, pdfUrl) || other.pdfUrl == pdfUrl));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      childId,
      childName,
      period,
      generatedAt,
      periodStart,
      periodEnd,
      overallProgress,
      const DeepCollectionEquality().hash(_subjectProgress),
      engagement,
      const DeepCollectionEquality().hash(_achievements),
      const DeepCollectionEquality().hash(_areasForGrowth),
      const DeepCollectionEquality().hash(_goalProgress),
      teacherComments,
      aiInsights,
      pdfUrl);

  /// Create a copy of ProgressReport
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ProgressReportImplCopyWith<_$ProgressReportImpl> get copyWith =>
      __$$ProgressReportImplCopyWithImpl<_$ProgressReportImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ProgressReportImplToJson(
      this,
    );
  }
}

abstract class _ProgressReport implements ProgressReport {
  const factory _ProgressReport(
      {required final String id,
      required final String childId,
      required final String childName,
      required final ReportPeriod period,
      required final DateTime generatedAt,
      required final DateTime periodStart,
      required final DateTime periodEnd,
      required final OverallProgress overallProgress,
      required final List<SubjectProgress> subjectProgress,
      required final EngagementMetrics engagement,
      required final List<String> achievements,
      required final List<String> areasForGrowth,
      required final List<GoalProgress> goalProgress,
      final String? teacherComments,
      final String? aiInsights,
      final String? pdfUrl}) = _$ProgressReportImpl;

  factory _ProgressReport.fromJson(Map<String, dynamic> json) =
      _$ProgressReportImpl.fromJson;

  @override
  String get id;
  @override
  String get childId;
  @override
  String get childName;
  @override
  ReportPeriod get period;
  @override
  DateTime get generatedAt;
  @override
  DateTime get periodStart;
  @override
  DateTime get periodEnd;
  @override
  OverallProgress get overallProgress;
  @override
  List<SubjectProgress> get subjectProgress;
  @override
  EngagementMetrics get engagement;
  @override
  List<String> get achievements;
  @override
  List<String> get areasForGrowth;
  @override
  List<GoalProgress> get goalProgress;
  @override
  String? get teacherComments;
  @override
  String? get aiInsights;
  @override
  String? get pdfUrl;

  /// Create a copy of ProgressReport
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ProgressReportImplCopyWith<_$ProgressReportImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

OverallProgress _$OverallProgressFromJson(Map<String, dynamic> json) {
  return _OverallProgress.fromJson(json);
}

/// @nodoc
mixin _$OverallProgress {
  double get overallScore => throw _privateConstructorUsedError;
  double get previousScore => throw _privateConstructorUsedError;
  double get improvementRate => throw _privateConstructorUsedError;
  int get lessonsCompleted => throw _privateConstructorUsedError;
  int get totalMinutesLearned => throw _privateConstructorUsedError;
  int get daysActive => throw _privateConstructorUsedError;
  int get currentStreak => throw _privateConstructorUsedError;

  /// Serializes this OverallProgress to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of OverallProgress
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $OverallProgressCopyWith<OverallProgress> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OverallProgressCopyWith<$Res> {
  factory $OverallProgressCopyWith(
          OverallProgress value, $Res Function(OverallProgress) then) =
      _$OverallProgressCopyWithImpl<$Res, OverallProgress>;
  @useResult
  $Res call(
      {double overallScore,
      double previousScore,
      double improvementRate,
      int lessonsCompleted,
      int totalMinutesLearned,
      int daysActive,
      int currentStreak});
}

/// @nodoc
class _$OverallProgressCopyWithImpl<$Res, $Val extends OverallProgress>
    implements $OverallProgressCopyWith<$Res> {
  _$OverallProgressCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of OverallProgress
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? overallScore = null,
    Object? previousScore = null,
    Object? improvementRate = null,
    Object? lessonsCompleted = null,
    Object? totalMinutesLearned = null,
    Object? daysActive = null,
    Object? currentStreak = null,
  }) {
    return _then(_value.copyWith(
      overallScore: null == overallScore
          ? _value.overallScore
          : overallScore // ignore: cast_nullable_to_non_nullable
              as double,
      previousScore: null == previousScore
          ? _value.previousScore
          : previousScore // ignore: cast_nullable_to_non_nullable
              as double,
      improvementRate: null == improvementRate
          ? _value.improvementRate
          : improvementRate // ignore: cast_nullable_to_non_nullable
              as double,
      lessonsCompleted: null == lessonsCompleted
          ? _value.lessonsCompleted
          : lessonsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      totalMinutesLearned: null == totalMinutesLearned
          ? _value.totalMinutesLearned
          : totalMinutesLearned // ignore: cast_nullable_to_non_nullable
              as int,
      daysActive: null == daysActive
          ? _value.daysActive
          : daysActive // ignore: cast_nullable_to_non_nullable
              as int,
      currentStreak: null == currentStreak
          ? _value.currentStreak
          : currentStreak // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$OverallProgressImplCopyWith<$Res>
    implements $OverallProgressCopyWith<$Res> {
  factory _$$OverallProgressImplCopyWith(_$OverallProgressImpl value,
          $Res Function(_$OverallProgressImpl) then) =
      __$$OverallProgressImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {double overallScore,
      double previousScore,
      double improvementRate,
      int lessonsCompleted,
      int totalMinutesLearned,
      int daysActive,
      int currentStreak});
}

/// @nodoc
class __$$OverallProgressImplCopyWithImpl<$Res>
    extends _$OverallProgressCopyWithImpl<$Res, _$OverallProgressImpl>
    implements _$$OverallProgressImplCopyWith<$Res> {
  __$$OverallProgressImplCopyWithImpl(
      _$OverallProgressImpl _value, $Res Function(_$OverallProgressImpl) _then)
      : super(_value, _then);

  /// Create a copy of OverallProgress
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? overallScore = null,
    Object? previousScore = null,
    Object? improvementRate = null,
    Object? lessonsCompleted = null,
    Object? totalMinutesLearned = null,
    Object? daysActive = null,
    Object? currentStreak = null,
  }) {
    return _then(_$OverallProgressImpl(
      overallScore: null == overallScore
          ? _value.overallScore
          : overallScore // ignore: cast_nullable_to_non_nullable
              as double,
      previousScore: null == previousScore
          ? _value.previousScore
          : previousScore // ignore: cast_nullable_to_non_nullable
              as double,
      improvementRate: null == improvementRate
          ? _value.improvementRate
          : improvementRate // ignore: cast_nullable_to_non_nullable
              as double,
      lessonsCompleted: null == lessonsCompleted
          ? _value.lessonsCompleted
          : lessonsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      totalMinutesLearned: null == totalMinutesLearned
          ? _value.totalMinutesLearned
          : totalMinutesLearned // ignore: cast_nullable_to_non_nullable
              as int,
      daysActive: null == daysActive
          ? _value.daysActive
          : daysActive // ignore: cast_nullable_to_non_nullable
              as int,
      currentStreak: null == currentStreak
          ? _value.currentStreak
          : currentStreak // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OverallProgressImpl implements _OverallProgress {
  const _$OverallProgressImpl(
      {required this.overallScore,
      required this.previousScore,
      required this.improvementRate,
      required this.lessonsCompleted,
      required this.totalMinutesLearned,
      required this.daysActive,
      required this.currentStreak});

  factory _$OverallProgressImpl.fromJson(Map<String, dynamic> json) =>
      _$$OverallProgressImplFromJson(json);

  @override
  final double overallScore;
  @override
  final double previousScore;
  @override
  final double improvementRate;
  @override
  final int lessonsCompleted;
  @override
  final int totalMinutesLearned;
  @override
  final int daysActive;
  @override
  final int currentStreak;

  @override
  String toString() {
    return 'OverallProgress(overallScore: $overallScore, previousScore: $previousScore, improvementRate: $improvementRate, lessonsCompleted: $lessonsCompleted, totalMinutesLearned: $totalMinutesLearned, daysActive: $daysActive, currentStreak: $currentStreak)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OverallProgressImpl &&
            (identical(other.overallScore, overallScore) ||
                other.overallScore == overallScore) &&
            (identical(other.previousScore, previousScore) ||
                other.previousScore == previousScore) &&
            (identical(other.improvementRate, improvementRate) ||
                other.improvementRate == improvementRate) &&
            (identical(other.lessonsCompleted, lessonsCompleted) ||
                other.lessonsCompleted == lessonsCompleted) &&
            (identical(other.totalMinutesLearned, totalMinutesLearned) ||
                other.totalMinutesLearned == totalMinutesLearned) &&
            (identical(other.daysActive, daysActive) ||
                other.daysActive == daysActive) &&
            (identical(other.currentStreak, currentStreak) ||
                other.currentStreak == currentStreak));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      overallScore,
      previousScore,
      improvementRate,
      lessonsCompleted,
      totalMinutesLearned,
      daysActive,
      currentStreak);

  /// Create a copy of OverallProgress
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$OverallProgressImplCopyWith<_$OverallProgressImpl> get copyWith =>
      __$$OverallProgressImplCopyWithImpl<_$OverallProgressImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OverallProgressImplToJson(
      this,
    );
  }
}

abstract class _OverallProgress implements OverallProgress {
  const factory _OverallProgress(
      {required final double overallScore,
      required final double previousScore,
      required final double improvementRate,
      required final int lessonsCompleted,
      required final int totalMinutesLearned,
      required final int daysActive,
      required final int currentStreak}) = _$OverallProgressImpl;

  factory _OverallProgress.fromJson(Map<String, dynamic> json) =
      _$OverallProgressImpl.fromJson;

  @override
  double get overallScore;
  @override
  double get previousScore;
  @override
  double get improvementRate;
  @override
  int get lessonsCompleted;
  @override
  int get totalMinutesLearned;
  @override
  int get daysActive;
  @override
  int get currentStreak;

  /// Create a copy of OverallProgress
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$OverallProgressImplCopyWith<_$OverallProgressImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

SubjectProgress _$SubjectProgressFromJson(Map<String, dynamic> json) {
  return _SubjectProgress.fromJson(json);
}

/// @nodoc
mixin _$SubjectProgress {
  String get subject => throw _privateConstructorUsedError;
  double get score => throw _privateConstructorUsedError;
  double get previousScore => throw _privateConstructorUsedError;
  double get improvementRate => throw _privateConstructorUsedError;
  int get lessonsCompleted => throw _privateConstructorUsedError;
  int get minutesSpent => throw _privateConstructorUsedError;
  String get proficiencyLevel => throw _privateConstructorUsedError;
  List<String> get topicsCompleted => throw _privateConstructorUsedError;
  List<String> get topicsInProgress => throw _privateConstructorUsedError;
  String? get teacherNote => throw _privateConstructorUsedError;

  /// Serializes this SubjectProgress to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SubjectProgress
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SubjectProgressCopyWith<SubjectProgress> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SubjectProgressCopyWith<$Res> {
  factory $SubjectProgressCopyWith(
          SubjectProgress value, $Res Function(SubjectProgress) then) =
      _$SubjectProgressCopyWithImpl<$Res, SubjectProgress>;
  @useResult
  $Res call(
      {String subject,
      double score,
      double previousScore,
      double improvementRate,
      int lessonsCompleted,
      int minutesSpent,
      String proficiencyLevel,
      List<String> topicsCompleted,
      List<String> topicsInProgress,
      String? teacherNote});
}

/// @nodoc
class _$SubjectProgressCopyWithImpl<$Res, $Val extends SubjectProgress>
    implements $SubjectProgressCopyWith<$Res> {
  _$SubjectProgressCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SubjectProgress
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? subject = null,
    Object? score = null,
    Object? previousScore = null,
    Object? improvementRate = null,
    Object? lessonsCompleted = null,
    Object? minutesSpent = null,
    Object? proficiencyLevel = null,
    Object? topicsCompleted = null,
    Object? topicsInProgress = null,
    Object? teacherNote = freezed,
  }) {
    return _then(_value.copyWith(
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      score: null == score
          ? _value.score
          : score // ignore: cast_nullable_to_non_nullable
              as double,
      previousScore: null == previousScore
          ? _value.previousScore
          : previousScore // ignore: cast_nullable_to_non_nullable
              as double,
      improvementRate: null == improvementRate
          ? _value.improvementRate
          : improvementRate // ignore: cast_nullable_to_non_nullable
              as double,
      lessonsCompleted: null == lessonsCompleted
          ? _value.lessonsCompleted
          : lessonsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      minutesSpent: null == minutesSpent
          ? _value.minutesSpent
          : minutesSpent // ignore: cast_nullable_to_non_nullable
              as int,
      proficiencyLevel: null == proficiencyLevel
          ? _value.proficiencyLevel
          : proficiencyLevel // ignore: cast_nullable_to_non_nullable
              as String,
      topicsCompleted: null == topicsCompleted
          ? _value.topicsCompleted
          : topicsCompleted // ignore: cast_nullable_to_non_nullable
              as List<String>,
      topicsInProgress: null == topicsInProgress
          ? _value.topicsInProgress
          : topicsInProgress // ignore: cast_nullable_to_non_nullable
              as List<String>,
      teacherNote: freezed == teacherNote
          ? _value.teacherNote
          : teacherNote // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SubjectProgressImplCopyWith<$Res>
    implements $SubjectProgressCopyWith<$Res> {
  factory _$$SubjectProgressImplCopyWith(_$SubjectProgressImpl value,
          $Res Function(_$SubjectProgressImpl) then) =
      __$$SubjectProgressImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String subject,
      double score,
      double previousScore,
      double improvementRate,
      int lessonsCompleted,
      int minutesSpent,
      String proficiencyLevel,
      List<String> topicsCompleted,
      List<String> topicsInProgress,
      String? teacherNote});
}

/// @nodoc
class __$$SubjectProgressImplCopyWithImpl<$Res>
    extends _$SubjectProgressCopyWithImpl<$Res, _$SubjectProgressImpl>
    implements _$$SubjectProgressImplCopyWith<$Res> {
  __$$SubjectProgressImplCopyWithImpl(
      _$SubjectProgressImpl _value, $Res Function(_$SubjectProgressImpl) _then)
      : super(_value, _then);

  /// Create a copy of SubjectProgress
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? subject = null,
    Object? score = null,
    Object? previousScore = null,
    Object? improvementRate = null,
    Object? lessonsCompleted = null,
    Object? minutesSpent = null,
    Object? proficiencyLevel = null,
    Object? topicsCompleted = null,
    Object? topicsInProgress = null,
    Object? teacherNote = freezed,
  }) {
    return _then(_$SubjectProgressImpl(
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      score: null == score
          ? _value.score
          : score // ignore: cast_nullable_to_non_nullable
              as double,
      previousScore: null == previousScore
          ? _value.previousScore
          : previousScore // ignore: cast_nullable_to_non_nullable
              as double,
      improvementRate: null == improvementRate
          ? _value.improvementRate
          : improvementRate // ignore: cast_nullable_to_non_nullable
              as double,
      lessonsCompleted: null == lessonsCompleted
          ? _value.lessonsCompleted
          : lessonsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      minutesSpent: null == minutesSpent
          ? _value.minutesSpent
          : minutesSpent // ignore: cast_nullable_to_non_nullable
              as int,
      proficiencyLevel: null == proficiencyLevel
          ? _value.proficiencyLevel
          : proficiencyLevel // ignore: cast_nullable_to_non_nullable
              as String,
      topicsCompleted: null == topicsCompleted
          ? _value._topicsCompleted
          : topicsCompleted // ignore: cast_nullable_to_non_nullable
              as List<String>,
      topicsInProgress: null == topicsInProgress
          ? _value._topicsInProgress
          : topicsInProgress // ignore: cast_nullable_to_non_nullable
              as List<String>,
      teacherNote: freezed == teacherNote
          ? _value.teacherNote
          : teacherNote // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SubjectProgressImpl implements _SubjectProgress {
  const _$SubjectProgressImpl(
      {required this.subject,
      required this.score,
      required this.previousScore,
      required this.improvementRate,
      required this.lessonsCompleted,
      required this.minutesSpent,
      required this.proficiencyLevel,
      required final List<String> topicsCompleted,
      required final List<String> topicsInProgress,
      this.teacherNote})
      : _topicsCompleted = topicsCompleted,
        _topicsInProgress = topicsInProgress;

  factory _$SubjectProgressImpl.fromJson(Map<String, dynamic> json) =>
      _$$SubjectProgressImplFromJson(json);

  @override
  final String subject;
  @override
  final double score;
  @override
  final double previousScore;
  @override
  final double improvementRate;
  @override
  final int lessonsCompleted;
  @override
  final int minutesSpent;
  @override
  final String proficiencyLevel;
  final List<String> _topicsCompleted;
  @override
  List<String> get topicsCompleted {
    if (_topicsCompleted is EqualUnmodifiableListView) return _topicsCompleted;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_topicsCompleted);
  }

  final List<String> _topicsInProgress;
  @override
  List<String> get topicsInProgress {
    if (_topicsInProgress is EqualUnmodifiableListView)
      return _topicsInProgress;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_topicsInProgress);
  }

  @override
  final String? teacherNote;

  @override
  String toString() {
    return 'SubjectProgress(subject: $subject, score: $score, previousScore: $previousScore, improvementRate: $improvementRate, lessonsCompleted: $lessonsCompleted, minutesSpent: $minutesSpent, proficiencyLevel: $proficiencyLevel, topicsCompleted: $topicsCompleted, topicsInProgress: $topicsInProgress, teacherNote: $teacherNote)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SubjectProgressImpl &&
            (identical(other.subject, subject) || other.subject == subject) &&
            (identical(other.score, score) || other.score == score) &&
            (identical(other.previousScore, previousScore) ||
                other.previousScore == previousScore) &&
            (identical(other.improvementRate, improvementRate) ||
                other.improvementRate == improvementRate) &&
            (identical(other.lessonsCompleted, lessonsCompleted) ||
                other.lessonsCompleted == lessonsCompleted) &&
            (identical(other.minutesSpent, minutesSpent) ||
                other.minutesSpent == minutesSpent) &&
            (identical(other.proficiencyLevel, proficiencyLevel) ||
                other.proficiencyLevel == proficiencyLevel) &&
            const DeepCollectionEquality()
                .equals(other._topicsCompleted, _topicsCompleted) &&
            const DeepCollectionEquality()
                .equals(other._topicsInProgress, _topicsInProgress) &&
            (identical(other.teacherNote, teacherNote) ||
                other.teacherNote == teacherNote));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      subject,
      score,
      previousScore,
      improvementRate,
      lessonsCompleted,
      minutesSpent,
      proficiencyLevel,
      const DeepCollectionEquality().hash(_topicsCompleted),
      const DeepCollectionEquality().hash(_topicsInProgress),
      teacherNote);

  /// Create a copy of SubjectProgress
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SubjectProgressImplCopyWith<_$SubjectProgressImpl> get copyWith =>
      __$$SubjectProgressImplCopyWithImpl<_$SubjectProgressImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SubjectProgressImplToJson(
      this,
    );
  }
}

abstract class _SubjectProgress implements SubjectProgress {
  const factory _SubjectProgress(
      {required final String subject,
      required final double score,
      required final double previousScore,
      required final double improvementRate,
      required final int lessonsCompleted,
      required final int minutesSpent,
      required final String proficiencyLevel,
      required final List<String> topicsCompleted,
      required final List<String> topicsInProgress,
      final String? teacherNote}) = _$SubjectProgressImpl;

  factory _SubjectProgress.fromJson(Map<String, dynamic> json) =
      _$SubjectProgressImpl.fromJson;

  @override
  String get subject;
  @override
  double get score;
  @override
  double get previousScore;
  @override
  double get improvementRate;
  @override
  int get lessonsCompleted;
  @override
  int get minutesSpent;
  @override
  String get proficiencyLevel;
  @override
  List<String> get topicsCompleted;
  @override
  List<String> get topicsInProgress;
  @override
  String? get teacherNote;

  /// Create a copy of SubjectProgress
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SubjectProgressImplCopyWith<_$SubjectProgressImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

EngagementMetrics _$EngagementMetricsFromJson(Map<String, dynamic> json) {
  return _EngagementMetrics.fromJson(json);
}

/// @nodoc
mixin _$EngagementMetrics {
  double get averageEngagement => throw _privateConstructorUsedError;
  double get attentionScore => throw _privateConstructorUsedError;
  int get totalSessions => throw _privateConstructorUsedError;
  int get averageSessionLength => throw _privateConstructorUsedError;
  double get completionRate => throw _privateConstructorUsedError;
  int get hintsUsedPerLesson => throw _privateConstructorUsedError;
  Map<String, int> get activityByDay => throw _privateConstructorUsedError;
  List<String> get peakLearningTimes => throw _privateConstructorUsedError;

  /// Serializes this EngagementMetrics to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of EngagementMetrics
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $EngagementMetricsCopyWith<EngagementMetrics> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $EngagementMetricsCopyWith<$Res> {
  factory $EngagementMetricsCopyWith(
          EngagementMetrics value, $Res Function(EngagementMetrics) then) =
      _$EngagementMetricsCopyWithImpl<$Res, EngagementMetrics>;
  @useResult
  $Res call(
      {double averageEngagement,
      double attentionScore,
      int totalSessions,
      int averageSessionLength,
      double completionRate,
      int hintsUsedPerLesson,
      Map<String, int> activityByDay,
      List<String> peakLearningTimes});
}

/// @nodoc
class _$EngagementMetricsCopyWithImpl<$Res, $Val extends EngagementMetrics>
    implements $EngagementMetricsCopyWith<$Res> {
  _$EngagementMetricsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of EngagementMetrics
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? averageEngagement = null,
    Object? attentionScore = null,
    Object? totalSessions = null,
    Object? averageSessionLength = null,
    Object? completionRate = null,
    Object? hintsUsedPerLesson = null,
    Object? activityByDay = null,
    Object? peakLearningTimes = null,
  }) {
    return _then(_value.copyWith(
      averageEngagement: null == averageEngagement
          ? _value.averageEngagement
          : averageEngagement // ignore: cast_nullable_to_non_nullable
              as double,
      attentionScore: null == attentionScore
          ? _value.attentionScore
          : attentionScore // ignore: cast_nullable_to_non_nullable
              as double,
      totalSessions: null == totalSessions
          ? _value.totalSessions
          : totalSessions // ignore: cast_nullable_to_non_nullable
              as int,
      averageSessionLength: null == averageSessionLength
          ? _value.averageSessionLength
          : averageSessionLength // ignore: cast_nullable_to_non_nullable
              as int,
      completionRate: null == completionRate
          ? _value.completionRate
          : completionRate // ignore: cast_nullable_to_non_nullable
              as double,
      hintsUsedPerLesson: null == hintsUsedPerLesson
          ? _value.hintsUsedPerLesson
          : hintsUsedPerLesson // ignore: cast_nullable_to_non_nullable
              as int,
      activityByDay: null == activityByDay
          ? _value.activityByDay
          : activityByDay // ignore: cast_nullable_to_non_nullable
              as Map<String, int>,
      peakLearningTimes: null == peakLearningTimes
          ? _value.peakLearningTimes
          : peakLearningTimes // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$EngagementMetricsImplCopyWith<$Res>
    implements $EngagementMetricsCopyWith<$Res> {
  factory _$$EngagementMetricsImplCopyWith(_$EngagementMetricsImpl value,
          $Res Function(_$EngagementMetricsImpl) then) =
      __$$EngagementMetricsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {double averageEngagement,
      double attentionScore,
      int totalSessions,
      int averageSessionLength,
      double completionRate,
      int hintsUsedPerLesson,
      Map<String, int> activityByDay,
      List<String> peakLearningTimes});
}

/// @nodoc
class __$$EngagementMetricsImplCopyWithImpl<$Res>
    extends _$EngagementMetricsCopyWithImpl<$Res, _$EngagementMetricsImpl>
    implements _$$EngagementMetricsImplCopyWith<$Res> {
  __$$EngagementMetricsImplCopyWithImpl(_$EngagementMetricsImpl _value,
      $Res Function(_$EngagementMetricsImpl) _then)
      : super(_value, _then);

  /// Create a copy of EngagementMetrics
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? averageEngagement = null,
    Object? attentionScore = null,
    Object? totalSessions = null,
    Object? averageSessionLength = null,
    Object? completionRate = null,
    Object? hintsUsedPerLesson = null,
    Object? activityByDay = null,
    Object? peakLearningTimes = null,
  }) {
    return _then(_$EngagementMetricsImpl(
      averageEngagement: null == averageEngagement
          ? _value.averageEngagement
          : averageEngagement // ignore: cast_nullable_to_non_nullable
              as double,
      attentionScore: null == attentionScore
          ? _value.attentionScore
          : attentionScore // ignore: cast_nullable_to_non_nullable
              as double,
      totalSessions: null == totalSessions
          ? _value.totalSessions
          : totalSessions // ignore: cast_nullable_to_non_nullable
              as int,
      averageSessionLength: null == averageSessionLength
          ? _value.averageSessionLength
          : averageSessionLength // ignore: cast_nullable_to_non_nullable
              as int,
      completionRate: null == completionRate
          ? _value.completionRate
          : completionRate // ignore: cast_nullable_to_non_nullable
              as double,
      hintsUsedPerLesson: null == hintsUsedPerLesson
          ? _value.hintsUsedPerLesson
          : hintsUsedPerLesson // ignore: cast_nullable_to_non_nullable
              as int,
      activityByDay: null == activityByDay
          ? _value._activityByDay
          : activityByDay // ignore: cast_nullable_to_non_nullable
              as Map<String, int>,
      peakLearningTimes: null == peakLearningTimes
          ? _value._peakLearningTimes
          : peakLearningTimes // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$EngagementMetricsImpl implements _EngagementMetrics {
  const _$EngagementMetricsImpl(
      {required this.averageEngagement,
      required this.attentionScore,
      required this.totalSessions,
      required this.averageSessionLength,
      required this.completionRate,
      required this.hintsUsedPerLesson,
      required final Map<String, int> activityByDay,
      required final List<String> peakLearningTimes})
      : _activityByDay = activityByDay,
        _peakLearningTimes = peakLearningTimes;

  factory _$EngagementMetricsImpl.fromJson(Map<String, dynamic> json) =>
      _$$EngagementMetricsImplFromJson(json);

  @override
  final double averageEngagement;
  @override
  final double attentionScore;
  @override
  final int totalSessions;
  @override
  final int averageSessionLength;
  @override
  final double completionRate;
  @override
  final int hintsUsedPerLesson;
  final Map<String, int> _activityByDay;
  @override
  Map<String, int> get activityByDay {
    if (_activityByDay is EqualUnmodifiableMapView) return _activityByDay;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_activityByDay);
  }

  final List<String> _peakLearningTimes;
  @override
  List<String> get peakLearningTimes {
    if (_peakLearningTimes is EqualUnmodifiableListView)
      return _peakLearningTimes;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_peakLearningTimes);
  }

  @override
  String toString() {
    return 'EngagementMetrics(averageEngagement: $averageEngagement, attentionScore: $attentionScore, totalSessions: $totalSessions, averageSessionLength: $averageSessionLength, completionRate: $completionRate, hintsUsedPerLesson: $hintsUsedPerLesson, activityByDay: $activityByDay, peakLearningTimes: $peakLearningTimes)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$EngagementMetricsImpl &&
            (identical(other.averageEngagement, averageEngagement) ||
                other.averageEngagement == averageEngagement) &&
            (identical(other.attentionScore, attentionScore) ||
                other.attentionScore == attentionScore) &&
            (identical(other.totalSessions, totalSessions) ||
                other.totalSessions == totalSessions) &&
            (identical(other.averageSessionLength, averageSessionLength) ||
                other.averageSessionLength == averageSessionLength) &&
            (identical(other.completionRate, completionRate) ||
                other.completionRate == completionRate) &&
            (identical(other.hintsUsedPerLesson, hintsUsedPerLesson) ||
                other.hintsUsedPerLesson == hintsUsedPerLesson) &&
            const DeepCollectionEquality()
                .equals(other._activityByDay, _activityByDay) &&
            const DeepCollectionEquality()
                .equals(other._peakLearningTimes, _peakLearningTimes));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      averageEngagement,
      attentionScore,
      totalSessions,
      averageSessionLength,
      completionRate,
      hintsUsedPerLesson,
      const DeepCollectionEquality().hash(_activityByDay),
      const DeepCollectionEquality().hash(_peakLearningTimes));

  /// Create a copy of EngagementMetrics
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$EngagementMetricsImplCopyWith<_$EngagementMetricsImpl> get copyWith =>
      __$$EngagementMetricsImplCopyWithImpl<_$EngagementMetricsImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$EngagementMetricsImplToJson(
      this,
    );
  }
}

abstract class _EngagementMetrics implements EngagementMetrics {
  const factory _EngagementMetrics(
      {required final double averageEngagement,
      required final double attentionScore,
      required final int totalSessions,
      required final int averageSessionLength,
      required final double completionRate,
      required final int hintsUsedPerLesson,
      required final Map<String, int> activityByDay,
      required final List<String> peakLearningTimes}) = _$EngagementMetricsImpl;

  factory _EngagementMetrics.fromJson(Map<String, dynamic> json) =
      _$EngagementMetricsImpl.fromJson;

  @override
  double get averageEngagement;
  @override
  double get attentionScore;
  @override
  int get totalSessions;
  @override
  int get averageSessionLength;
  @override
  double get completionRate;
  @override
  int get hintsUsedPerLesson;
  @override
  Map<String, int> get activityByDay;
  @override
  List<String> get peakLearningTimes;

  /// Create a copy of EngagementMetrics
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$EngagementMetricsImplCopyWith<_$EngagementMetricsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

GoalProgress _$GoalProgressFromJson(Map<String, dynamic> json) {
  return _GoalProgress.fromJson(json);
}

/// @nodoc
mixin _$GoalProgress {
  String get goalId => throw _privateConstructorUsedError;
  String get goalTitle => throw _privateConstructorUsedError;
  String get goalType => throw _privateConstructorUsedError;
  double get progress => throw _privateConstructorUsedError;
  DateTime get targetDate => throw _privateConstructorUsedError;
  GoalStatus get status => throw _privateConstructorUsedError;
  String? get notes => throw _privateConstructorUsedError;

  /// Serializes this GoalProgress to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of GoalProgress
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $GoalProgressCopyWith<GoalProgress> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $GoalProgressCopyWith<$Res> {
  factory $GoalProgressCopyWith(
          GoalProgress value, $Res Function(GoalProgress) then) =
      _$GoalProgressCopyWithImpl<$Res, GoalProgress>;
  @useResult
  $Res call(
      {String goalId,
      String goalTitle,
      String goalType,
      double progress,
      DateTime targetDate,
      GoalStatus status,
      String? notes});
}

/// @nodoc
class _$GoalProgressCopyWithImpl<$Res, $Val extends GoalProgress>
    implements $GoalProgressCopyWith<$Res> {
  _$GoalProgressCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of GoalProgress
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? goalId = null,
    Object? goalTitle = null,
    Object? goalType = null,
    Object? progress = null,
    Object? targetDate = null,
    Object? status = null,
    Object? notes = freezed,
  }) {
    return _then(_value.copyWith(
      goalId: null == goalId
          ? _value.goalId
          : goalId // ignore: cast_nullable_to_non_nullable
              as String,
      goalTitle: null == goalTitle
          ? _value.goalTitle
          : goalTitle // ignore: cast_nullable_to_non_nullable
              as String,
      goalType: null == goalType
          ? _value.goalType
          : goalType // ignore: cast_nullable_to_non_nullable
              as String,
      progress: null == progress
          ? _value.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as double,
      targetDate: null == targetDate
          ? _value.targetDate
          : targetDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as GoalStatus,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$GoalProgressImplCopyWith<$Res>
    implements $GoalProgressCopyWith<$Res> {
  factory _$$GoalProgressImplCopyWith(
          _$GoalProgressImpl value, $Res Function(_$GoalProgressImpl) then) =
      __$$GoalProgressImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String goalId,
      String goalTitle,
      String goalType,
      double progress,
      DateTime targetDate,
      GoalStatus status,
      String? notes});
}

/// @nodoc
class __$$GoalProgressImplCopyWithImpl<$Res>
    extends _$GoalProgressCopyWithImpl<$Res, _$GoalProgressImpl>
    implements _$$GoalProgressImplCopyWith<$Res> {
  __$$GoalProgressImplCopyWithImpl(
      _$GoalProgressImpl _value, $Res Function(_$GoalProgressImpl) _then)
      : super(_value, _then);

  /// Create a copy of GoalProgress
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? goalId = null,
    Object? goalTitle = null,
    Object? goalType = null,
    Object? progress = null,
    Object? targetDate = null,
    Object? status = null,
    Object? notes = freezed,
  }) {
    return _then(_$GoalProgressImpl(
      goalId: null == goalId
          ? _value.goalId
          : goalId // ignore: cast_nullable_to_non_nullable
              as String,
      goalTitle: null == goalTitle
          ? _value.goalTitle
          : goalTitle // ignore: cast_nullable_to_non_nullable
              as String,
      goalType: null == goalType
          ? _value.goalType
          : goalType // ignore: cast_nullable_to_non_nullable
              as String,
      progress: null == progress
          ? _value.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as double,
      targetDate: null == targetDate
          ? _value.targetDate
          : targetDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as GoalStatus,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$GoalProgressImpl implements _GoalProgress {
  const _$GoalProgressImpl(
      {required this.goalId,
      required this.goalTitle,
      required this.goalType,
      required this.progress,
      required this.targetDate,
      required this.status,
      this.notes});

  factory _$GoalProgressImpl.fromJson(Map<String, dynamic> json) =>
      _$$GoalProgressImplFromJson(json);

  @override
  final String goalId;
  @override
  final String goalTitle;
  @override
  final String goalType;
  @override
  final double progress;
  @override
  final DateTime targetDate;
  @override
  final GoalStatus status;
  @override
  final String? notes;

  @override
  String toString() {
    return 'GoalProgress(goalId: $goalId, goalTitle: $goalTitle, goalType: $goalType, progress: $progress, targetDate: $targetDate, status: $status, notes: $notes)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$GoalProgressImpl &&
            (identical(other.goalId, goalId) || other.goalId == goalId) &&
            (identical(other.goalTitle, goalTitle) ||
                other.goalTitle == goalTitle) &&
            (identical(other.goalType, goalType) ||
                other.goalType == goalType) &&
            (identical(other.progress, progress) ||
                other.progress == progress) &&
            (identical(other.targetDate, targetDate) ||
                other.targetDate == targetDate) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.notes, notes) || other.notes == notes));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, goalId, goalTitle, goalType,
      progress, targetDate, status, notes);

  /// Create a copy of GoalProgress
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$GoalProgressImplCopyWith<_$GoalProgressImpl> get copyWith =>
      __$$GoalProgressImplCopyWithImpl<_$GoalProgressImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$GoalProgressImplToJson(
      this,
    );
  }
}

abstract class _GoalProgress implements GoalProgress {
  const factory _GoalProgress(
      {required final String goalId,
      required final String goalTitle,
      required final String goalType,
      required final double progress,
      required final DateTime targetDate,
      required final GoalStatus status,
      final String? notes}) = _$GoalProgressImpl;

  factory _GoalProgress.fromJson(Map<String, dynamic> json) =
      _$GoalProgressImpl.fromJson;

  @override
  String get goalId;
  @override
  String get goalTitle;
  @override
  String get goalType;
  @override
  double get progress;
  @override
  DateTime get targetDate;
  @override
  GoalStatus get status;
  @override
  String? get notes;

  /// Create a copy of GoalProgress
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$GoalProgressImplCopyWith<_$GoalProgressImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ReportRequest _$ReportRequestFromJson(Map<String, dynamic> json) {
  return _ReportRequest.fromJson(json);
}

/// @nodoc
mixin _$ReportRequest {
  String get childId => throw _privateConstructorUsedError;
  ReportPeriod get period => throw _privateConstructorUsedError;
  DateTime? get customStartDate => throw _privateConstructorUsedError;
  DateTime? get customEndDate => throw _privateConstructorUsedError;
  bool get includeTranscripts => throw _privateConstructorUsedError;
  bool get includeTeacherNotes => throw _privateConstructorUsedError;
  bool get includeGoalProgress => throw _privateConstructorUsedError;
  bool get generatePdf => throw _privateConstructorUsedError;

  /// Serializes this ReportRequest to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ReportRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ReportRequestCopyWith<ReportRequest> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ReportRequestCopyWith<$Res> {
  factory $ReportRequestCopyWith(
          ReportRequest value, $Res Function(ReportRequest) then) =
      _$ReportRequestCopyWithImpl<$Res, ReportRequest>;
  @useResult
  $Res call(
      {String childId,
      ReportPeriod period,
      DateTime? customStartDate,
      DateTime? customEndDate,
      bool includeTranscripts,
      bool includeTeacherNotes,
      bool includeGoalProgress,
      bool generatePdf});
}

/// @nodoc
class _$ReportRequestCopyWithImpl<$Res, $Val extends ReportRequest>
    implements $ReportRequestCopyWith<$Res> {
  _$ReportRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ReportRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? period = null,
    Object? customStartDate = freezed,
    Object? customEndDate = freezed,
    Object? includeTranscripts = null,
    Object? includeTeacherNotes = null,
    Object? includeGoalProgress = null,
    Object? generatePdf = null,
  }) {
    return _then(_value.copyWith(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      period: null == period
          ? _value.period
          : period // ignore: cast_nullable_to_non_nullable
              as ReportPeriod,
      customStartDate: freezed == customStartDate
          ? _value.customStartDate
          : customStartDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      customEndDate: freezed == customEndDate
          ? _value.customEndDate
          : customEndDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      includeTranscripts: null == includeTranscripts
          ? _value.includeTranscripts
          : includeTranscripts // ignore: cast_nullable_to_non_nullable
              as bool,
      includeTeacherNotes: null == includeTeacherNotes
          ? _value.includeTeacherNotes
          : includeTeacherNotes // ignore: cast_nullable_to_non_nullable
              as bool,
      includeGoalProgress: null == includeGoalProgress
          ? _value.includeGoalProgress
          : includeGoalProgress // ignore: cast_nullable_to_non_nullable
              as bool,
      generatePdf: null == generatePdf
          ? _value.generatePdf
          : generatePdf // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ReportRequestImplCopyWith<$Res>
    implements $ReportRequestCopyWith<$Res> {
  factory _$$ReportRequestImplCopyWith(
          _$ReportRequestImpl value, $Res Function(_$ReportRequestImpl) then) =
      __$$ReportRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String childId,
      ReportPeriod period,
      DateTime? customStartDate,
      DateTime? customEndDate,
      bool includeTranscripts,
      bool includeTeacherNotes,
      bool includeGoalProgress,
      bool generatePdf});
}

/// @nodoc
class __$$ReportRequestImplCopyWithImpl<$Res>
    extends _$ReportRequestCopyWithImpl<$Res, _$ReportRequestImpl>
    implements _$$ReportRequestImplCopyWith<$Res> {
  __$$ReportRequestImplCopyWithImpl(
      _$ReportRequestImpl _value, $Res Function(_$ReportRequestImpl) _then)
      : super(_value, _then);

  /// Create a copy of ReportRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? period = null,
    Object? customStartDate = freezed,
    Object? customEndDate = freezed,
    Object? includeTranscripts = null,
    Object? includeTeacherNotes = null,
    Object? includeGoalProgress = null,
    Object? generatePdf = null,
  }) {
    return _then(_$ReportRequestImpl(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      period: null == period
          ? _value.period
          : period // ignore: cast_nullable_to_non_nullable
              as ReportPeriod,
      customStartDate: freezed == customStartDate
          ? _value.customStartDate
          : customStartDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      customEndDate: freezed == customEndDate
          ? _value.customEndDate
          : customEndDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      includeTranscripts: null == includeTranscripts
          ? _value.includeTranscripts
          : includeTranscripts // ignore: cast_nullable_to_non_nullable
              as bool,
      includeTeacherNotes: null == includeTeacherNotes
          ? _value.includeTeacherNotes
          : includeTeacherNotes // ignore: cast_nullable_to_non_nullable
              as bool,
      includeGoalProgress: null == includeGoalProgress
          ? _value.includeGoalProgress
          : includeGoalProgress // ignore: cast_nullable_to_non_nullable
              as bool,
      generatePdf: null == generatePdf
          ? _value.generatePdf
          : generatePdf // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ReportRequestImpl implements _ReportRequest {
  const _$ReportRequestImpl(
      {required this.childId,
      required this.period,
      this.customStartDate,
      this.customEndDate,
      this.includeTranscripts = true,
      this.includeTeacherNotes = true,
      this.includeGoalProgress = true,
      this.generatePdf = true});

  factory _$ReportRequestImpl.fromJson(Map<String, dynamic> json) =>
      _$$ReportRequestImplFromJson(json);

  @override
  final String childId;
  @override
  final ReportPeriod period;
  @override
  final DateTime? customStartDate;
  @override
  final DateTime? customEndDate;
  @override
  @JsonKey()
  final bool includeTranscripts;
  @override
  @JsonKey()
  final bool includeTeacherNotes;
  @override
  @JsonKey()
  final bool includeGoalProgress;
  @override
  @JsonKey()
  final bool generatePdf;

  @override
  String toString() {
    return 'ReportRequest(childId: $childId, period: $period, customStartDate: $customStartDate, customEndDate: $customEndDate, includeTranscripts: $includeTranscripts, includeTeacherNotes: $includeTeacherNotes, includeGoalProgress: $includeGoalProgress, generatePdf: $generatePdf)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ReportRequestImpl &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.period, period) || other.period == period) &&
            (identical(other.customStartDate, customStartDate) ||
                other.customStartDate == customStartDate) &&
            (identical(other.customEndDate, customEndDate) ||
                other.customEndDate == customEndDate) &&
            (identical(other.includeTranscripts, includeTranscripts) ||
                other.includeTranscripts == includeTranscripts) &&
            (identical(other.includeTeacherNotes, includeTeacherNotes) ||
                other.includeTeacherNotes == includeTeacherNotes) &&
            (identical(other.includeGoalProgress, includeGoalProgress) ||
                other.includeGoalProgress == includeGoalProgress) &&
            (identical(other.generatePdf, generatePdf) ||
                other.generatePdf == generatePdf));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      childId,
      period,
      customStartDate,
      customEndDate,
      includeTranscripts,
      includeTeacherNotes,
      includeGoalProgress,
      generatePdf);

  /// Create a copy of ReportRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ReportRequestImplCopyWith<_$ReportRequestImpl> get copyWith =>
      __$$ReportRequestImplCopyWithImpl<_$ReportRequestImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ReportRequestImplToJson(
      this,
    );
  }
}

abstract class _ReportRequest implements ReportRequest {
  const factory _ReportRequest(
      {required final String childId,
      required final ReportPeriod period,
      final DateTime? customStartDate,
      final DateTime? customEndDate,
      final bool includeTranscripts,
      final bool includeTeacherNotes,
      final bool includeGoalProgress,
      final bool generatePdf}) = _$ReportRequestImpl;

  factory _ReportRequest.fromJson(Map<String, dynamic> json) =
      _$ReportRequestImpl.fromJson;

  @override
  String get childId;
  @override
  ReportPeriod get period;
  @override
  DateTime? get customStartDate;
  @override
  DateTime? get customEndDate;
  @override
  bool get includeTranscripts;
  @override
  bool get includeTeacherNotes;
  @override
  bool get includeGoalProgress;
  @override
  bool get generatePdf;

  /// Create a copy of ReportRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ReportRequestImplCopyWith<_$ReportRequestImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
