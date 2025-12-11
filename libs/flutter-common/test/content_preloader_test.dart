import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_common/offline/content_preloader.dart';

void main() {
  group('PreloadConfiguration', () {
    test('should create with required fields', () {
      const config = PreloadConfiguration(
        tenantId: 'tenant_123',
        gradeBands: ['K_2', 'G3_5'],
        subjects: ['ELA', 'MATH'],
      );

      expect(config.tenantId, 'tenant_123');
      expect(config.gradeBands, ['K_2', 'G3_5']);
      expect(config.subjects, ['ELA', 'MATH']);
      expect(config.locales, ['en']); // Default
      expect(config.wifiOnly, true); // Default
      expect(config.autoUpdate, true); // Default
    });

    test('should serialize to JSON', () {
      const config = PreloadConfiguration(
        tenantId: 'tenant_123',
        gradeBands: ['K_2'],
        subjects: ['ELA'],
        locales: ['en', 'es'],
        syncWindowStart: '07:00',
        syncWindowEnd: '09:00',
        maxStorageBytes: 200 * 1024 * 1024,
        wifiOnly: false,
        autoUpdate: false,
      );

      final json = config.toJson();

      expect(json['tenantId'], 'tenant_123');
      expect(json['gradeBands'], ['K_2']);
      expect(json['subjects'], ['ELA']);
      expect(json['locales'], ['en', 'es']);
      expect(json['syncWindowStart'], '07:00');
      expect(json['syncWindowEnd'], '09:00');
      expect(json['maxStorageBytes'], 200 * 1024 * 1024);
      expect(json['wifiOnly'], false);
      expect(json['autoUpdate'], false);
    });

    test('should deserialize from JSON', () {
      final json = {
        'tenantId': 'tenant_456',
        'gradeBands': ['G6_8', 'G9_12'],
        'subjects': ['SCIENCE'],
        'locales': ['en'],
        'syncWindowStart': '06:00',
        'syncWindowEnd': '08:00',
        'maxStorageBytes': 500 * 1024 * 1024,
        'wifiOnly': true,
        'autoUpdate': true,
      };

      final config = PreloadConfiguration.fromJson(json);

      expect(config.tenantId, 'tenant_456');
      expect(config.gradeBands, ['G6_8', 'G9_12']);
      expect(config.subjects, ['SCIENCE']);
    });
  });

  group('ManifestItem', () {
    test('should parse from JSON', () {
      final json = {
        'loVersionId': 'lov_123',
        'learningObjectId': 'lo_123',
        'contentKey': 'LO_VERSION:lov_123:locale:en',
        'checksum': 'sha256:abc123',
        'contentUrl': 'https://content.aivo.ai/v1/content/lov_123/en',
        'sizeBytes': 5120,
        'subject': 'ELA',
        'gradeBand': 'K_2',
        'versionNumber': 1,
        'locale': 'en',
        'publishedAt': '2025-01-09T00:00:00.000Z',
        'updatedAt': '2025-01-09T12:00:00.000Z',
      };

      final item = ManifestItem.fromJson(json);

      expect(item.loVersionId, 'lov_123');
      expect(item.contentKey, 'LO_VERSION:lov_123:locale:en');
      expect(item.checksum, 'sha256:abc123');
      expect(item.sizeBytes, 5120);
      expect(item.subject, 'ELA');
      expect(item.gradeBand, 'K_2');
      expect(item.versionNumber, 1);
      expect(item.locale, 'en');
    });
  });

  group('ContentPackageManifest', () {
    test('should parse from JSON', () {
      final json = {
        'packageId': 'pkg_123',
        'manifestVersion': '1.0.0',
        'tenantId': 'tenant_123',
        'gradeBands': ['K_2', 'G3_5'],
        'subjects': ['ELA', 'MATH'],
        'locales': ['en'],
        'generatedAt': '2025-01-10T00:00:00.000Z',
        'expiresAt': '2025-01-11T00:00:00.000Z',
        'totalItems': 2,
        'totalSizeBytes': 10240,
        'items': [
          {
            'loVersionId': 'lov_1',
            'learningObjectId': 'lo_1',
            'contentKey': 'LO_VERSION:lov_1:locale:en',
            'checksum': 'sha256:abc',
            'contentUrl': 'https://content.aivo.ai/v1/content/lov_1/en',
            'sizeBytes': 5120,
            'subject': 'ELA',
            'gradeBand': 'K_2',
            'versionNumber': 1,
            'locale': 'en',
            'publishedAt': '2025-01-09T00:00:00.000Z',
            'updatedAt': '2025-01-09T00:00:00.000Z',
          },
          {
            'loVersionId': 'lov_2',
            'learningObjectId': 'lo_2',
            'contentKey': 'LO_VERSION:lov_2:locale:en',
            'checksum': 'sha256:def',
            'contentUrl': 'https://content.aivo.ai/v1/content/lov_2/en',
            'sizeBytes': 5120,
            'subject': 'MATH',
            'gradeBand': 'G3_5',
            'versionNumber': 1,
            'locale': 'en',
            'publishedAt': '2025-01-09T00:00:00.000Z',
            'updatedAt': '2025-01-09T00:00:00.000Z',
          },
        ],
      };

      final manifest = ContentPackageManifest.fromJson(json);

      expect(manifest.packageId, 'pkg_123');
      expect(manifest.manifestVersion, '1.0.0');
      expect(manifest.tenantId, 'tenant_123');
      expect(manifest.gradeBands, ['K_2', 'G3_5']);
      expect(manifest.subjects, ['ELA', 'MATH']);
      expect(manifest.totalItems, 2);
      expect(manifest.totalSizeBytes, 10240);
      expect(manifest.items.length, 2);
    });
  });

  group('DeltaItem', () {
    test('should parse ADDED item from JSON', () {
      final json = {
        'loVersionId': 'lov_123',
        'learningObjectId': 'lo_123',
        'contentKey': 'LO_VERSION:lov_123:locale:en',
        'changeType': 'ADDED',
        'checksum': 'sha256:abc123',
        'contentUrl': 'https://content.aivo.ai/v1/content/lov_123/en',
        'sizeBytes': 5120,
        'subject': 'ELA',
        'gradeBand': 'K_2',
        'versionNumber': 1,
        'locale': 'en',
        'changedAt': '2025-01-10T06:00:00.000Z',
      };

      final item = DeltaItem.fromJson(json);

      expect(item.changeType, 'ADDED');
      expect(item.checksum, 'sha256:abc123');
      expect(item.contentUrl, isNotNull);
      expect(item.sizeBytes, 5120);
    });

    test('should parse REMOVED item from JSON', () {
      final json = {
        'loVersionId': 'lov_456',
        'learningObjectId': 'lo_456',
        'contentKey': 'LO_VERSION:lov_456:locale:en',
        'changeType': 'REMOVED',
        'checksum': null,
        'contentUrl': null,
        'sizeBytes': null,
        'subject': 'ELA',
        'gradeBand': 'K_2',
        'versionNumber': 1,
        'locale': 'en',
        'changedAt': '2025-01-10T12:00:00.000Z',
      };

      final item = DeltaItem.fromJson(json);

      expect(item.changeType, 'REMOVED');
      expect(item.checksum, isNull);
      expect(item.contentUrl, isNull);
      expect(item.sizeBytes, isNull);
    });
  });

  group('DeltaUpdateResponse', () {
    test('should parse from JSON', () {
      final json = {
        'tenantId': 'tenant_123',
        'sinceTimestamp': '2025-01-09T00:00:00.000Z',
        'currentTimestamp': '2025-01-10T00:00:00.000Z',
        'hasMore': false,
        'nextCursor': null,
        'totalChanges': 1,
        'totalSizeBytes': 2560,
        'items': [
          {
            'loVersionId': 'lov_1',
            'learningObjectId': 'lo_1',
            'contentKey': 'LO_VERSION:lov_1:locale:en',
            'changeType': 'UPDATED',
            'checksum': 'sha256:xyz',
            'contentUrl': 'https://content.aivo.ai/v1/content/lov_1/en',
            'sizeBytes': 2560,
            'subject': 'MATH',
            'gradeBand': 'G3_5',
            'versionNumber': 2,
            'locale': 'en',
            'changedAt': '2025-01-09T18:00:00.000Z',
          },
        ],
      };

      final response = DeltaUpdateResponse.fromJson(json);

      expect(response.tenantId, 'tenant_123');
      expect(response.hasMore, false);
      expect(response.nextCursor, isNull);
      expect(response.totalChanges, 1);
      expect(response.totalSizeBytes, 2560);
      expect(response.items.length, 1);
      expect(response.items.first.changeType, 'UPDATED');
    });

    test('should parse paginated response', () {
      final json = {
        'tenantId': 'tenant_123',
        'sinceTimestamp': '2025-01-09T00:00:00.000Z',
        'currentTimestamp': '2025-01-10T00:00:00.000Z',
        'hasMore': true,
        'nextCursor': '2025-01-09T18:00:00.000Z',
        'totalChanges': 100,
        'totalSizeBytes': 256000,
        'items': [],
      };

      final response = DeltaUpdateResponse.fromJson(json);

      expect(response.hasMore, true);
      expect(response.nextCursor, '2025-01-09T18:00:00.000Z');
    });
  });

  group('SyncCheckpoint', () {
    test('should serialize to JSON', () {
      final checkpoint = SyncCheckpoint(
        tenantId: 'tenant_123',
        gradeBands: ['K_2', 'G3_5'],
        subjects: ['ELA', 'MATH'],
        locales: ['en'],
        lastSyncTimestamp: DateTime.parse('2025-01-10T00:00:00.000Z'),
        cachedItemCount: 150,
        cachedSizeBytes: 1536000,
      );

      final json = checkpoint.toJson();

      expect(json['tenantId'], 'tenant_123');
      expect(json['gradeBands'], ['K_2', 'G3_5']);
      expect(json['subjects'], ['ELA', 'MATH']);
      expect(json['locales'], ['en']);
      expect(json['cachedItemCount'], 150);
      expect(json['cachedSizeBytes'], 1536000);
    });

    test('should deserialize from JSON', () {
      final json = {
        'tenantId': 'tenant_456',
        'gradeBands': ['G6_8'],
        'subjects': ['SCIENCE'],
        'locales': ['en', 'es'],
        'lastSyncTimestamp': '2025-01-10T12:00:00.000Z',
        'cachedItemCount': 50,
        'cachedSizeBytes': 512000,
      };

      final checkpoint = SyncCheckpoint.fromJson(json);

      expect(checkpoint.tenantId, 'tenant_456');
      expect(checkpoint.gradeBands, ['G6_8']);
      expect(checkpoint.lastSyncTimestamp,
          DateTime.parse('2025-01-10T12:00:00.000Z'));
      expect(checkpoint.cachedItemCount, 50);
    });
  });

  group('PreloadProgress', () {
    test('should calculate progress percent', () {
      const progress = PreloadProgress(
        totalItems: 100,
        downloadedItems: 25,
        totalBytes: 1000000,
        downloadedBytes: 250000,
        state: PreloadState.downloading,
      );

      expect(progress.progressPercent, 0.25);
      expect(progress.bytesPercent, 0.25);
    });

    test('should handle zero totals', () {
      const progress = PreloadProgress(
        totalItems: 0,
        downloadedItems: 0,
        state: PreloadState.idle,
      );

      expect(progress.progressPercent, 0.0);
      expect(progress.bytesPercent, 0.0);
    });

    test('should copyWith correctly', () {
      const original = PreloadProgress(
        totalItems: 100,
        downloadedItems: 50,
        state: PreloadState.downloading,
      );

      final updated = original.copyWith(
        downloadedItems: 75,
        currentItem: 'item_75',
      );

      expect(updated.totalItems, 100);
      expect(updated.downloadedItems, 75);
      expect(updated.currentItem, 'item_75');
      expect(updated.state, PreloadState.downloading);
    });
  });

  group('PreloadState', () {
    test('should have all expected states', () {
      expect(PreloadState.values, contains(PreloadState.idle));
      expect(PreloadState.values, contains(PreloadState.checking));
      expect(PreloadState.values, contains(PreloadState.downloadingManifest));
      expect(PreloadState.values, contains(PreloadState.downloading));
      expect(PreloadState.values, contains(PreloadState.verifying));
      expect(PreloadState.values, contains(PreloadState.completed));
      expect(PreloadState.values, contains(PreloadState.failed));
      expect(PreloadState.values, contains(PreloadState.cancelled));
      expect(PreloadState.values, contains(PreloadState.paused));
    });
  });
}

/// Helper function to create a mock HTTP client for testing.
MockClient createMockHttpClient({
  required int statusCode,
  required Map<String, dynamic> responseBody,
}) {
  return MockClient((request) async {
    return http.Response(
      jsonEncode(responseBody),
      statusCode,
      headers: {'content-type': 'application/json'},
    );
  });
}
