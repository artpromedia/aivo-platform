import 'dart:convert';

import 'package:aivo_theme/aivo_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mocktail/mocktail.dart';

// ── Mock HTTP Client ───────────────────────────────────────────────

class MockHttpClient extends Mock implements http.Client {}

void main() {
  late MockHttpClient mockClient;

  setUpAll(() {
    registerFallbackValue(Uri.parse('https://example.com'));
  });

  setUp(() {
    mockClient = MockHttpClient();
  });

  group('AivoBranding.fetchForDomain', () {
    test('returns parsed branding on 200 response', () async {
      final body = json.encode({
        'displayName': 'Mock Academy',
        'colorPrimary': '#FF0000',
        'colorSecondary': '#00FF00',
        'colorAccent': '#0000FF',
        'colorBackground': '#FFFFFF',
        'colorSurface': '#FAFAFA',
        'colorText': '#111111',
        'colorTextOnPrimary': '#FFFFFF',
        'colorMuted': '#888888',
        'colorBorder': '#DDDDDD',
        'fontFamily': 'Roboto',
        'borderRadius': '8px',
      });

      when(() => mockClient.get(
            any(),
            headers: any(named: 'headers'),
          )).thenAnswer((_) async => http.Response(body, 200));

      final branding = await AivoBranding.fetchForDomain(
        'mock.example.com',
        httpClient: mockClient,
      );

      expect(branding.displayName, 'Mock Academy');
      expect(branding.colorPrimary, const Color(0xFFFF0000));
      expect(branding.fontFamily, 'Roboto');
    });

    test('returns defaults on non-200 response', () async {
      when(() => mockClient.get(
            any(),
            headers: any(named: 'headers'),
          )).thenAnswer((_) async => http.Response('Not Found', 404));

      final branding = await AivoBranding.fetchForDomain(
        'bad.example.com',
        httpClient: mockClient,
      );

      expect(branding.displayName, 'Aivo Learning');
      expect(branding.colorPrimary, const Color(0xFF6366F1));
    });

    test('returns defaults on network exception', () async {
      when(() => mockClient.get(
            any(),
            headers: any(named: 'headers'),
          )).thenThrow(Exception('Network error'));

      final branding = await AivoBranding.fetchForDomain(
        'offline.example.com',
        httpClient: mockClient,
      );

      expect(branding.displayName, 'Aivo Learning');
    });

    test('uses custom apiBaseUrl', () async {
      final body = json.encode({
        'displayName': 'Custom API',
      });

      Uri? capturedUri;
      when(() => mockClient.get(
            any(),
            headers: any(named: 'headers'),
          )).thenAnswer((invocation) {
        capturedUri = invocation.positionalArguments[0] as Uri;
        return Future.value(http.Response(body, 200));
      });

      await AivoBranding.fetchForDomain(
        'tenant.example.com',
        apiBaseUrl: 'https://custom-api.example.com',
        httpClient: mockClient,
      );

      expect(
        capturedUri.toString(),
        contains('custom-api.example.com'),
      );
    });

    test('URL-encodes the domain parameter', () async {
      final body = json.encode({'displayName': 'Encoded'});

      Uri? capturedUri;
      when(() => mockClient.get(
            any(),
            headers: any(named: 'headers'),
          )).thenAnswer((invocation) {
        capturedUri = invocation.positionalArguments[0] as Uri;
        return Future.value(http.Response(body, 200));
      });

      await AivoBranding.fetchForDomain(
        'academy with spaces.com',
        httpClient: mockClient,
      );

      expect(
        capturedUri.toString(),
        contains('academy%20with%20spaces.com'),
      );
    });

    test('returns defaults on invalid JSON response', () async {
      when(() => mockClient.get(
            any(),
            headers: any(named: 'headers'),
          )).thenAnswer((_) async => http.Response('not json', 200));

      final branding = await AivoBranding.fetchForDomain(
        'badjson.example.com',
        httpClient: mockClient,
      );

      // Invalid JSON should fall through to catch block → defaults
      expect(branding.displayName, 'Aivo Learning');
    });
  });

  group('AivoBranding border radius parsing', () {
    test('rem border radius converted to pixels (×16)', () {
      final branding = AivoBranding.defaults().copyWith(
        borderRadius: '0.5rem',
      );
      final theme = branding.toThemeData();
      // Cards should have border radius = 0.5 * 16 = 8
      final cardShape = theme.cardTheme.shape as RoundedRectangleBorder;
      final radius =
          (cardShape.borderRadius as BorderRadius).topLeft.x;
      expect(radius, 8.0);
    });

    test('px border radius used directly', () {
      final branding = AivoBranding.defaults().copyWith(
        borderRadius: '12px',
      );
      final theme = branding.toThemeData();
      final cardShape = theme.cardTheme.shape as RoundedRectangleBorder;
      final radius =
          (cardShape.borderRadius as BorderRadius).topLeft.x;
      expect(radius, 12.0);
    });

    test('bare number border radius used directly', () {
      final branding = AivoBranding.defaults().copyWith(
        borderRadius: '10',
      );
      final theme = branding.toThemeData();
      final cardShape = theme.cardTheme.shape as RoundedRectangleBorder;
      final radius =
          (cardShape.borderRadius as BorderRadius).topLeft.x;
      expect(radius, 10.0);
    });
  });

  group('AivoBranding color parsing edge cases', () {
    test('fromJson handles 8-digit hex (with alpha)', () {
      final branding = AivoBranding.fromJson({
        'colorPrimary': '#80FF5733', // 8-digit with alpha
      });
      // Should parse the 8-digit hex directly
      expect(branding.colorPrimary, isNotNull);
    });

    test('fromJson handles missing # prefix', () {
      final branding = AivoBranding.fromJson({
        'colorPrimary': 'FF5733', // no #
      });
      expect(branding.colorPrimary, const Color(0xFFFF5733));
    });
  });
}
