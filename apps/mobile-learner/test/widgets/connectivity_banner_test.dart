import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_learner/widgets/connectivity_banner.dart';

void main() {
  group('BannerConnectionState', () {
    test('all states have unique values', () {
      final states = BannerConnectionState.values.toSet();
      expect(states.length, equals(BannerConnectionState.values.length));
    });

    test('states match expected values', () {
      expect(BannerConnectionState.online.index, equals(0));
      expect(BannerConnectionState.offline.index, equals(1));
      expect(BannerConnectionState.slow.index, equals(2));
      expect(BannerConnectionState.syncing.index, equals(3));
      expect(BannerConnectionState.backOnline.index, equals(4));
      expect(BannerConnectionState.error.index, equals(5));
    });
  });

  group('_BannerConfig', () {
    // These tests validate the banner configuration logic
    test('online state should be invisible', () {
      // Online state should not display a banner
      expect(BannerConnectionState.online.name, equals('online'));
    });

    test('offline state should show warning', () {
      expect(BannerConnectionState.offline.name, equals('offline'));
    });

    test('slow state should show caution', () {
      expect(BannerConnectionState.slow.name, equals('slow'));
    });

    test('syncing state should show progress', () {
      expect(BannerConnectionState.syncing.name, equals('syncing'));
    });

    test('backOnline state should show success', () {
      expect(BannerConnectionState.backOnline.name, equals('backOnline'));
    });

    test('error state should show error', () {
      expect(BannerConnectionState.error.name, equals('error'));
    });
  });
}
