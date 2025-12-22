/// API Mock Client
///
/// Mock client for backend API interactions during E2E tests.
library;

import 'dart:convert';
import 'package:http/http.dart' as http;

import '../config/test_config.dart';
import 'test_data.dart';

/// API client for test backend interactions
class TestApiClient {
  TestApiClient._();

  static final _client = http.Client();
  static String get _baseUrl => TestConfig.apiBaseUrl;

  /// Reset all test data to initial state
  static Future<void> resetTestData() async {
    await _post('/test/reset');
  }

  /// Seed test data for a specific scenario
  static Future<void> seedScenario(String scenario) async {
    await _post('/test/seed', body: {'scenario': scenario});
  }

  /// Create a test user on the backend
  static Future<String> createTestUser({
    required String email,
    required String password,
    required String role,
    String? name,
  }) async {
    final response = await _post('/test/users', body: {
      'email': email,
      'password': password,
      'role': role,
      'name': name ?? 'Test User',
    });
    return response['id'] as String;
  }

  /// Delete a test user
  static Future<void> deleteTestUser(String userId) async {
    await _delete('/test/users/$userId');
  }

  /// Link parent to child
  static Future<void> linkParentChild({
    required String parentId,
    required String childId,
  }) async {
    await _post('/test/link-parent-child', body: {
      'parentId': parentId,
      'childId': childId,
    });
  }

  /// Create a class for teacher
  static Future<String> createClass({
    required String teacherId,
    required String name,
    List<String>? studentIds,
  }) async {
    final response = await _post('/test/classes', body: {
      'teacherId': teacherId,
      'name': name,
      'studentIds': studentIds ?? [],
    });
    return response['id'] as String;
  }

  /// Add student to class
  static Future<void> addStudentToClass({
    required String classId,
    required String studentId,
  }) async {
    await _post('/test/classes/$classId/students', body: {
      'studentId': studentId,
    });
  }

  /// Create learning session
  static Future<String> createSession({
    required String learnerId,
    required String subject,
    int durationMinutes = 30,
  }) async {
    final response = await _post('/test/sessions', body: {
      'learnerId': learnerId,
      'subject': subject,
      'durationMinutes': durationMinutes,
    });
    return response['id'] as String;
  }

  /// Complete a session with results
  static Future<void> completeSession({
    required String sessionId,
    int score = 80,
    int questionsAnswered = 10,
  }) async {
    await _post('/test/sessions/$sessionId/complete', body: {
      'score': score,
      'questionsAnswered': questionsAnswered,
    });
  }

  /// Send a notification
  static Future<void> sendNotification({
    required String userId,
    required String title,
    required String body,
    String type = 'info',
  }) async {
    await _post('/test/notifications', body: {
      'userId': userId,
      'title': title,
      'body': body,
      'type': type,
    });
  }

  /// Trigger push notification
  static Future<void> triggerPushNotification({
    required String userId,
    required String title,
    required String body,
  }) async {
    await _post('/test/push-notification', body: {
      'userId': userId,
      'title': title,
      'body': body,
    });
  }

  /// Set subscription status
  static Future<void> setSubscription({
    required String userId,
    required String tier,
    DateTime? expiresAt,
  }) async {
    await _post('/test/subscription', body: {
      'userId': userId,
      'tier': tier,
      'expiresAt': expiresAt?.toIso8601String(),
    });
  }

  /// Create IEP goal
  static Future<String> createIepGoal({
    required String studentId,
    required String description,
    required String targetDate,
    int targetProgress = 100,
  }) async {
    final response = await _post('/test/iep-goals', body: {
      'studentId': studentId,
      'description': description,
      'targetDate': targetDate,
      'targetProgress': targetProgress,
    });
    return response['id'] as String;
  }

  /// Update IEP goal progress
  static Future<void> updateIepProgress({
    required String goalId,
    required int progress,
  }) async {
    await _post('/test/iep-goals/$goalId/progress', body: {
      'progress': progress,
    });
  }

  /// Advance time for testing time-based features
  static Future<void> advanceTime({required int minutes}) async {
    await _post('/test/time/advance', body: {
      'minutes': minutes,
    });
  }

  /// Get user data
  static Future<Map<String, dynamic>> getUser(String userId) async {
    return await _get('/test/users/$userId');
  }

  /// Get session data
  static Future<Map<String, dynamic>> getSession(String sessionId) async {
    return await _get('/test/sessions/$sessionId');
  }

  // HTTP helpers
  static Future<Map<String, dynamic>> _get(String path) async {
    final response = await _client.get(
      Uri.parse('$_baseUrl$path'),
      headers: {'Content-Type': 'application/json'},
    );
    if (response.statusCode >= 400) {
      throw ApiException('GET $path failed: ${response.statusCode}');
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> _post(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final response = await _client.post(
      Uri.parse('$_baseUrl$path'),
      headers: {'Content-Type': 'application/json'},
      body: body != null ? jsonEncode(body) : null,
    );
    if (response.statusCode >= 400) {
      throw ApiException('POST $path failed: ${response.statusCode}');
    }
    if (response.body.isEmpty) return {};
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  static Future<void> _delete(String path) async {
    final response = await _client.delete(
      Uri.parse('$_baseUrl$path'),
      headers: {'Content-Type': 'application/json'},
    );
    if (response.statusCode >= 400) {
      throw ApiException('DELETE $path failed: ${response.statusCode}');
    }
  }
}

/// API exception
class ApiException implements Exception {
  ApiException(this.message);
  final String message;

  @override
  String toString() => 'ApiException: $message';
}

/// Payment mock provider
class MockPaymentProvider {
  MockPaymentProvider._();

  /// Valid test card numbers
  static const validCard = '4242424242424242';
  static const declinedCard = '4000000000000002';
  static const insufficientFundsCard = '4000000000009995';
  static const expiredCard = '4000000000000069';

  /// Process mock payment
  static Future<PaymentResult> processPayment({
    required String cardNumber,
    required double amount,
  }) async {
    await Future.delayed(const Duration(seconds: 1));

    if (cardNumber == validCard) {
      return PaymentResult.success('pay_${DateTime.now().millisecondsSinceEpoch}');
    } else if (cardNumber == declinedCard) {
      return PaymentResult.declined();
    } else if (cardNumber == insufficientFundsCard) {
      return PaymentResult.insufficientFunds();
    } else if (cardNumber == expiredCard) {
      return PaymentResult.expired();
    }
    return PaymentResult.error('Invalid card');
  }
}

/// Payment result
class PaymentResult {
  PaymentResult.success(this.transactionId)
      : status = PaymentStatus.success,
        errorMessage = null;

  PaymentResult.declined()
      : status = PaymentStatus.declined,
        transactionId = null,
        errorMessage = 'Card declined';

  PaymentResult.insufficientFunds()
      : status = PaymentStatus.insufficientFunds,
        transactionId = null,
        errorMessage = 'Insufficient funds';

  PaymentResult.expired()
      : status = PaymentStatus.expired,
        transactionId = null,
        errorMessage = 'Card expired';

  PaymentResult.error(this.errorMessage)
      : status = PaymentStatus.error,
        transactionId = null;

  final PaymentStatus status;
  final String? transactionId;
  final String? errorMessage;

  bool get isSuccess => status == PaymentStatus.success;
}

/// Payment status
enum PaymentStatus {
  success,
  declined,
  insufficientFunds,
  expired,
  error,
}
