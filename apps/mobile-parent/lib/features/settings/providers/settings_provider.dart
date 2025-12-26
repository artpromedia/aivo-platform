import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../core/api_client.dart';

part 'settings_provider.g.dart';

// App settings model
class AppSettings {
  final String firstName;
  final String lastName;
  final String email;
  final String locale;
  final String themeMode;
  final bool pushEnabled;
  final bool emailEnabled;
  final bool weeklyDigestEnabled;

  AppSettings({
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.locale,
    required this.themeMode,
    required this.pushEnabled,
    required this.emailEnabled,
    required this.weeklyDigestEnabled,
  });

  String get fullName => '$firstName $lastName';
  String get initials => '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'.toUpperCase();

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    return AppSettings(
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      email: json['email'] as String? ?? '',
      locale: json['locale'] as String? ?? 'en',
      themeMode: json['themeMode'] as String? ?? 'system',
      pushEnabled: json['pushEnabled'] as bool? ?? true,
      emailEnabled: json['emailEnabled'] as bool? ?? true,
      weeklyDigestEnabled: json['weeklyDigestEnabled'] as bool? ?? true,
    );
  }
}

// Provider for settings
@riverpod
Future<AppSettings> settings(Ref ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/parent/settings');
  return AppSettings.fromJson(response.data as Map<String, dynamic>);
}

// Provider for updating a setting
@riverpod
Future<void> updateSetting(
  Ref ref, {
  required String key,
  required dynamic value,
}) async {
  final dio = ref.watch(dioProvider);
  await dio.patch('/parent/settings', data: {key: value});
}

// Provider for updating profile
@riverpod
Future<void> updateProfile(
  Ref ref, {
  required String firstName,
  required String lastName,
}) async {
  final dio = ref.watch(dioProvider);
  await dio.patch('/parent/profile', data: {
    'firstName': firstName,
    'lastName': lastName,
  });
}

// Provider for changing password
@riverpod
Future<void> changePassword(
  Ref ref, {
  required String currentPassword,
  required String newPassword,
}) async {
  final dio = ref.watch(dioProvider);
  await dio.post('/parent/auth/change-password', data: {
    'currentPassword': currentPassword,
    'newPassword': newPassword,
  });
}

// Provider for logout
@riverpod
Future<void> logout(Ref ref) async {
  final dio = ref.watch(dioProvider);
  final storage = ref.watch(secureStorageProvider);
  
  try {
    await dio.post('/parent/auth/logout');
  } finally {
    await storage.delete(key: 'access_token');
    await storage.delete(key: 'refresh_token');
  }
}
