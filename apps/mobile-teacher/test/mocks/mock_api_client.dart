/// Mock API Client
///
/// Mock implementation of the API client for testing.
library;

import 'dart:async';

import 'package:mocktail/mocktail.dart';
import 'package:flutter_common/flutter_common.dart';

import 'fixtures/fixtures.dart';

/// Mock API client for testing.
class MockApiClient extends Mock implements AivoApiClient {
  MockApiClient() {
    _setupDefaultResponses();
  }

  final Map<String, dynamic> _mockResponses = {};
  final List<ApiRequest> _requestLog = [];
  bool _shouldFail = false;
  int _latencyMs = 0;

  /// Get the request log.
  List<ApiRequest> get requestLog => List.unmodifiable(_requestLog);

  /// Set whether requests should fail.
  void setShouldFail(bool shouldFail) {
    _shouldFail = shouldFail;
  }

  /// Set simulated latency in milliseconds.
  void setLatency(int ms) {
    _latencyMs = ms;
  }

  /// Add a mock response for a path.
  void mockResponse(String path, dynamic response) {
    _mockResponses[path] = response;
  }

  /// Clear all mock responses.
  void clearMockResponses() {
    _mockResponses.clear();
  }

  /// Clear the request log.
  void clearRequestLog() {
    _requestLog.clear();
  }

  void _setupDefaultResponses() {
    // Students
    _mockResponses['/students'] = {
      'students': TestStudents.all.map((s) => s.toJson()).toList(),
    };

    // Sessions
    _mockResponses['/sessions'] = {
      'sessions': TestSessions.all.map((s) => s.toJson()).toList(),
    };
    _mockResponses['/sessions/active'] = {
      'sessions': TestSessions.active.map((s) => s.toJson()).toList(),
    };

    // Classes
    _mockResponses['/classes'] = {
      'classes': TestClasses.all.map((c) => c.toJson()).toList(),
    };

    // IEP Goals
    _mockResponses['/iep-goals'] = {
      'goals': TestIepGoals.all.map((g) => g.toJson()).toList(),
    };

    // Messages
    _mockResponses['/messages'] = {
      'messages': TestMessages.all.map((m) => m.toJson()).toList(),
    };
  }

  Future<T> _executeRequest<T>(
    String method,
    String path,
    dynamic data,
    T Function(dynamic) handler,
  ) async {
    _requestLog.add(ApiRequest(
      method: method,
      path: path,
      data: data,
      timestamp: DateTime.now(),
    ));

    if (_latencyMs > 0) {
      await Future.delayed(Duration(milliseconds: _latencyMs));
    }

    if (_shouldFail) {
      throw ApiException(
        statusCode: 500,
        message: 'Simulated API failure',
      );
    }

    final response = _mockResponses[path];
    return handler(response);
  }
}

/// Represents an API request for logging/verification.
class ApiRequest {
  const ApiRequest({
    required this.method,
    required this.path,
    this.data,
    required this.timestamp,
  });

  final String method;
  final String path;
  final dynamic data;
  final DateTime timestamp;

  @override
  String toString() => '$method $path at $timestamp';
}

/// API exception for testing.
class ApiException implements Exception {
  const ApiException({
    required this.statusCode,
    required this.message,
  });

  final int statusCode;
  final String message;

  @override
  String toString() => 'ApiException($statusCode): $message';
}
