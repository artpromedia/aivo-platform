/// Tutor API Service
///
/// HTTP client for the tutor-svc backend endpoints. Handles all network
/// communication for tutor personas, sessions, and messaging.
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/tutor_models.dart';

/// Service for communicating with the tutor backend API.
class TutorApiService {
  final String baseUrl;
  final String Function() getAuthToken;
  final String learnerId;

  TutorApiService({
    required this.baseUrl,
    required this.getAuthToken,
    required this.learnerId,
  });

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${getAuthToken()}',
      };

  // ==========================================================================
  // PERSONAS
  // ==========================================================================

  /// Fetch all available tutor personas.
  ///
  /// Optionally filter by [subject] to only retrieve personas for a specific
  /// academic subject.
  Future<List<TutorPersona>> getPersonas({TutorSubject? subject}) async {
    var url = '$baseUrl/api/tutor/personas';
    if (subject != null) {
      url += '?subject=${subject.name}';
    }

    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode != 200) {
      throw TutorApiException(
        'Failed to load tutor personas',
        statusCode: response.statusCode,
      );
    }

    final data = json.decode(response.body);
    final List<dynamic> personas = data['data'] ?? data;
    return personas
        .map((p) => TutorPersona.fromJson(p as Map<String, dynamic>))
        .toList();
  }

  /// Fetch a single tutor persona by ID.
  Future<TutorPersona> getPersona(String personaId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/tutor/personas/$personaId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw TutorApiException(
        'Failed to load tutor persona',
        statusCode: response.statusCode,
      );
    }

    final data = json.decode(response.body);
    return TutorPersona.fromJson(data['data'] ?? data);
  }

  // ==========================================================================
  // SESSIONS
  // ==========================================================================

  /// Create a new tutoring session with the specified persona.
  ///
  /// Returns the newly created session with an initial greeting message
  /// from the tutor.
  Future<TutorSession> createSession({
    required String personaId,
    required TutorSubject subject,
    String? topic,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/tutor/sessions'),
      headers: _headers,
      body: json.encode({
        'learnerId': learnerId,
        'personaId': personaId,
        'subject': subject.name,
        if (topic != null) 'topic': topic,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw TutorApiException(
        'Failed to create tutor session',
        statusCode: response.statusCode,
      );
    }

    final data = json.decode(response.body);
    return TutorSession.fromJson(data['data'] ?? data);
  }

  /// Fetch a specific session by ID.
  Future<TutorSession> getSession(String sessionId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/tutor/sessions/$sessionId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw TutorApiException(
        'Failed to load tutor session',
        statusCode: response.statusCode,
      );
    }

    final data = json.decode(response.body);
    return TutorSession.fromJson(data['data'] ?? data);
  }

  /// Fetch all sessions for the current learner.
  ///
  /// Results are ordered by creation date descending (most recent first).
  /// Use [status] to filter by session status. Use [limit] to control
  /// the number of results returned.
  Future<List<TutorSession>> getSessions({
    SessionStatus? status,
    int limit = 20,
    int offset = 0,
  }) async {
    final params = <String>[
      'learnerId=$learnerId',
      'limit=$limit',
      'offset=$offset',
    ];
    if (status != null) {
      params.add('status=${status.name}');
    }

    final response = await http.get(
      Uri.parse('$baseUrl/api/tutor/sessions?${params.join('&')}'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw TutorApiException(
        'Failed to load tutor sessions',
        statusCode: response.statusCode,
      );
    }

    final data = json.decode(response.body);
    final List<dynamic> sessions = data['data'] ?? data;
    return sessions
        .map((s) => TutorSession.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  // ==========================================================================
  // MESSAGES
  // ==========================================================================

  /// Send a message in an active tutoring session.
  ///
  /// Returns the assistant's response message, which may include emotion
  /// metadata, audio URL for TTS playback, and viseme data for lip-sync.
  Future<TutorMessage> sendMessage({
    required String sessionId,
    required String content,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/tutor/sessions/$sessionId/messages'),
      headers: _headers,
      body: json.encode({
        'content': content,
        'role': MessageRole.user.name,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw TutorApiException(
        'Failed to send message',
        statusCode: response.statusCode,
      );
    }

    final data = json.decode(response.body);
    return TutorMessage.fromJson(data['data'] ?? data);
  }

  /// Fetch message history for a session.
  ///
  /// Returns messages ordered by timestamp ascending (oldest first).
  /// Use [limit] and [before] for pagination.
  Future<List<TutorMessage>> getMessages({
    required String sessionId,
    int limit = 50,
    String? before,
  }) async {
    final params = <String>['limit=$limit'];
    if (before != null) {
      params.add('before=$before');
    }

    final response = await http.get(
      Uri.parse(
          '$baseUrl/api/tutor/sessions/$sessionId/messages?${params.join('&')}'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw TutorApiException(
        'Failed to load messages',
        statusCode: response.statusCode,
      );
    }

    final data = json.decode(response.body);
    final List<dynamic> messages = data['data'] ?? data;
    return messages
        .map((m) => TutorMessage.fromJson(m as Map<String, dynamic>))
        .toList();
  }

  // ==========================================================================
  // SESSION LIFECYCLE
  // ==========================================================================

  /// End an active tutoring session.
  ///
  /// The session status will be set to [SessionStatus.completed] and
  /// analytics data will be finalized on the backend.
  Future<TutorSession> endSession(String sessionId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/tutor/sessions/$sessionId/end'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw TutorApiException(
        'Failed to end session',
        statusCode: response.statusCode,
      );
    }

    final data = json.decode(response.body);
    return TutorSession.fromJson(data['data'] ?? data);
  }
}

/// Exception thrown by the tutor API service on request failures.
class TutorApiException implements Exception {
  final String message;
  final int? statusCode;

  TutorApiException(this.message, {this.statusCode});

  @override
  String toString() =>
      'TutorApiException: $message${statusCode != null ? ' (HTTP $statusCode)' : ''}';
}
