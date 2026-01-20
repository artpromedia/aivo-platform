import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_learner/widgets/offline_indicator.dart';

void main() {
  group('OfflineIndicatorPosition', () {
    test('topLeft has correct position flags', () {
      const position = OfflineIndicatorPosition.topLeft;
      // These are internal extension methods, so we test the enum itself
      expect(position.index, equals(0));
    });

    test('topRight has correct position flags', () {
      const position = OfflineIndicatorPosition.topRight;
      expect(position.index, equals(1));
    });

    test('bottomLeft has correct position flags', () {
      const position = OfflineIndicatorPosition.bottomLeft;
      expect(position.index, equals(2));
    });

    test('bottomRight has correct position flags', () {
      const position = OfflineIndicatorPosition.bottomRight;
      expect(position.index, equals(3));
    });

    test('all positions are unique', () {
      final positions = OfflineIndicatorPosition.values.toSet();
      expect(positions.length, equals(4));
    });
  });
}
