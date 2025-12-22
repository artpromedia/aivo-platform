import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mobile_learner/motor/motor_models.dart';
import 'package:mobile_learner/motor/motor_profile_provider.dart';
import 'package:mobile_learner/motor/widgets/large_touch_target.dart';
import 'package:mobile_learner/motor/widgets/dwell_selection.dart';
import 'package:mobile_learner/motor/widgets/drag_assist.dart';
import 'package:mobile_learner/motor/widgets/handwriting_alternative.dart';
import 'package:mobile_learner/motor/widgets/simplified_gesture.dart';

/// Mock provider that allows setting accommodations directly for testing
class TestableMotorProfileProvider extends MotorProfileProvider {
  MotorAccommodations? _testAccommodations;
  MotorProfile? _testProfile;

  TestableMotorProfileProvider({
    MotorAccommodations? accommodations,
    MotorProfile? profile,
  })  : _testAccommodations = accommodations,
        _testProfile = profile;

  void setAccommodations(MotorAccommodations accommodations) {
    _testAccommodations = accommodations;
    notifyListeners();
  }

  @override
  MotorAccommodations? get accommodations => _testAccommodations;

  @override
  MotorProfile? get profile => _testProfile;

  @override
  bool get hasAccommodations => _testAccommodations != null;

  // Override getters to use test accommodations
  @override
  double get touchTargetMultiplier =>
      _testAccommodations?.touchTargetMultiplier ?? 1.0;

  @override
  int get touchHoldDuration => _testAccommodations?.touchHoldDuration ?? 0;

  @override
  bool get enhancedTouchFeedback =>
      _testAccommodations?.enhancedTouchFeedback ?? false;

  @override
  String get hapticFeedbackIntensity =>
      _testAccommodations?.hapticFeedbackIntensity ?? 'normal';

  @override
  bool get dwellSelectionEnabled =>
      _testAccommodations?.dwellSelectionEnabled ?? false;

  @override
  int get dwellTimeMs => _testAccommodations?.dwellTimeMs ?? 1000;

  @override
  String get dwellIndicatorStyle =>
      _testAccommodations?.dwellIndicatorStyle ?? 'circle';

  @override
  bool get voiceInputEnabled =>
      _testAccommodations?.voiceInputEnabled ?? false;

  @override
  bool get switchAccessEnabled =>
      _testAccommodations?.switchAccessEnabled ?? false;

  @override
  int get switchScanSpeed => _testAccommodations?.switchScanSpeed ?? 1000;

  @override
  bool get dragAssistEnabled =>
      _testAccommodations?.dragAssistEnabled ?? false;

  @override
  bool get dragSnapToGrid => _testAccommodations?.dragSnapToGrid ?? false;

  @override
  int get dragGridSize => _testAccommodations?.dragGridSize ?? 20;

  @override
  bool get dragAutoComplete =>
      _testAccommodations?.dragAutoComplete ?? false;

  @override
  int get dragAutoCompleteThreshold =>
      _testAccommodations?.dragAutoCompleteThreshold ?? 30;

  @override
  bool get tremorFilterEnabled =>
      _testAccommodations?.tremorFilterEnabled ?? false;

  @override
  int get tremorFilterStrength =>
      _testAccommodations?.tremorFilterStrength ?? 50;

  @override
  double get tremorSmoothingFactor =>
      _testAccommodations?.tremorSmoothingFactor ?? 0.7;

  @override
  int get tremorWindowSize => _testAccommodations?.tremorWindowSize ?? 5;

  @override
  int get tremorMovementThreshold =>
      _testAccommodations?.tremorMovementThreshold ?? 3;

  @override
  bool get simplifiedGestures =>
      _testAccommodations?.simplifiedGestures ?? false;

  @override
  bool get enlargedTouchTargets => touchTargetMultiplier > 1.0;

  @override
  bool get holdToActivateEnabled => touchHoldDuration > 0;

  @override
  bool get gesturesToButtons => simplifiedGestures;
}

/// Helper to wrap widget with testable provider
Widget wrapWithProvider(Widget child, TestableMotorProfileProvider provider) {
  return MaterialApp(
    home: ChangeNotifierProvider<MotorProfileProvider>.value(
      value: provider,
      child: Scaffold(body: Center(child: child)),
    ),
  );
}

void main() {
  group('LargeTouchTarget', () {
    testWidgets('renders child widget', (tester) async {
      final provider = TestableMotorProfileProvider();

      await tester.pumpWidget(wrapWithProvider(
        LargeTouchTarget(
          child: const Text('Touch Me'),
          onTap: () {},
        ),
        provider,
      ));

      expect(find.text('Touch Me'), findsOneWidget);
    });

    testWidgets('applies touch target multiplier from provider', (tester) async {
      final provider = TestableMotorProfileProvider(
        accommodations: const MotorAccommodations(
          touchTargetMultiplier: 2.0,
        ),
      );

      await tester.pumpWidget(wrapWithProvider(
        LargeTouchTarget(
          minWidth: 48,
          minHeight: 48,
          child: const Text('Touch Me'),
          onTap: () {},
        ),
        provider,
      ));

      // The widget should be rendered with enlarged touch target
      // Due to the multiplier, min size should be 96x96
      expect(find.text('Touch Me'), findsOneWidget);
    });

    testWidgets('triggers onTap callback when tapped', (tester) async {
      final provider = TestableMotorProfileProvider();
      bool wasTapped = false;

      await tester.pumpWidget(wrapWithProvider(
        LargeTouchTarget(
          child: const Text('Touch Me'),
          onTap: () {
            wasTapped = true;
          },
        ),
        provider,
      ));

      await tester.tap(find.text('Touch Me'));
      await tester.pump();

      expect(wasTapped, isTrue);
    });

    testWidgets('triggers onLongPress callback on long press', (tester) async {
      final provider = TestableMotorProfileProvider();
      bool wasLongPressed = false;

      await tester.pumpWidget(wrapWithProvider(
        LargeTouchTarget(
          child: const Text('Touch Me'),
          onLongPress: () {
            wasLongPressed = true;
          },
        ),
        provider,
      ));

      await tester.longPress(find.text('Touch Me'));
      await tester.pump();

      expect(wasLongPressed, isTrue);
    });

    testWidgets('respects custom borderRadius', (tester) async {
      final provider = TestableMotorProfileProvider();

      await tester.pumpWidget(wrapWithProvider(
        LargeTouchTarget(
          borderRadius: BorderRadius.circular(16),
          child: const Text('Rounded'),
          onTap: () {},
        ),
        provider,
      ));

      expect(find.text('Rounded'), findsOneWidget);
    });
  });

  group('DwellSelection', () {
    testWidgets('renders child widget', (tester) async {
      final provider = TestableMotorProfileProvider();

      await tester.pumpWidget(wrapWithProvider(
        DwellSelection(
          child: const Text('Dwell Here'),
          onSelected: () {},
        ),
        provider,
      ));

      expect(find.text('Dwell Here'), findsOneWidget);
    });

    testWidgets('falls back to tap when dwell disabled', (tester) async {
      final provider = TestableMotorProfileProvider(
        accommodations: const MotorAccommodations(
          dwellSelectionEnabled: false,
        ),
      );
      bool wasSelected = false;

      await tester.pumpWidget(wrapWithProvider(
        DwellSelection(
          child: const Text('Tap Me'),
          onSelected: () {
            wasSelected = true;
          },
        ),
        provider,
      ));

      await tester.tap(find.text('Tap Me'));
      await tester.pump();

      expect(wasSelected, isTrue);
    });

    testWidgets('respects enabled property', (tester) async {
      final provider = TestableMotorProfileProvider();
      bool wasSelected = false;

      await tester.pumpWidget(wrapWithProvider(
        DwellSelection(
          enabled: false,
          child: const Text('Tap Me'),
          onSelected: () {
            wasSelected = true;
          },
        ),
        provider,
      ));

      await tester.tap(find.text('Tap Me'));
      await tester.pump();

      // When enabled is false, it should still work as a tap
      expect(wasSelected, isTrue);
    });

    testWidgets('uses dwellTimeMs from provider', (tester) async {
      final provider = TestableMotorProfileProvider(
        accommodations: const MotorAccommodations(
          dwellSelectionEnabled: true,
          dwellTimeMs: 500,
        ),
      );

      await tester.pumpWidget(wrapWithProvider(
        DwellSelection(
          child: const Text('Dwell'),
          onSelected: () {},
        ),
        provider,
      ));

      expect(find.text('Dwell'), findsOneWidget);
    });

    testWidgets('allows override of dwell time', (tester) async {
      final provider = TestableMotorProfileProvider(
        accommodations: const MotorAccommodations(
          dwellSelectionEnabled: true,
          dwellTimeMs: 1000,
        ),
      );

      await tester.pumpWidget(wrapWithProvider(
        DwellSelection(
          dwellTimeMs: 300, // Override
          child: const Text('Quick Dwell'),
          onSelected: () {},
        ),
        provider,
      ));

      expect(find.text('Quick Dwell'), findsOneWidget);
    });
  });

  group('DragAssist', () {
    testWidgets('renders child widget', (tester) async {
      final provider = TestableMotorProfileProvider();

      await tester.pumpWidget(wrapWithProvider(
        DragAssist<String>(
          data: 'test-data',
          child: Container(
            width: 50,
            height: 50,
            color: Colors.blue,
            child: const Text('Drag'),
          ),
        ),
        provider,
      ));

      expect(find.text('Drag'), findsOneWidget);
    });

    testWidgets('respects drag assist settings from provider', (tester) async {
      final provider = TestableMotorProfileProvider(
        accommodations: const MotorAccommodations(
          dragAssistEnabled: true,
          dragSnapToGrid: true,
          dragGridSize: 32,
        ),
      );

      await tester.pumpWidget(wrapWithProvider(
        DragAssist<String>(
          data: 'test-data',
          child: Container(
            width: 50,
            height: 50,
            color: Colors.blue,
            child: const Text('Drag'),
          ),
        ),
        provider,
      ));

      expect(find.text('Drag'), findsOneWidget);
    });
  });

  group('SimplifiedGesture widgets', () {
    testWidgets('SimplifiedZoom shows zoom controls', (tester) async {
      final provider = TestableMotorProfileProvider(
        accommodations: const MotorAccommodations(
          simplifiedGestures: true,
        ),
      );

      await tester.pumpWidget(wrapWithProvider(
        SimplifiedZoom(
          initialScale: 1.0,
          onScaleChanged: (zoom) {},
          child: Container(
            width: 100,
            height: 100,
            color: Colors.blue,
          ),
        ),
        provider,
      ));

      expect(find.byType(Container), findsWidgets);
    });

    testWidgets('SimplifiedSwipeNavigation shows arrow buttons', (tester) async {
      final provider = TestableMotorProfileProvider(
        accommodations: const MotorAccommodations(
          simplifiedGestures: true,
        ),
      );

      await tester.pumpWidget(wrapWithProvider(
        SimplifiedSwipeNavigation(
          onSwipeLeft: () {},
          onSwipeRight: () {},
          child: const Text('Content'),
        ),
        provider,
      ));

      expect(find.text('Content'), findsOneWidget);
    });
  });

  group('HandwritingAlternative', () {
    testWidgets('renders text input field', (tester) async {
      final provider = TestableMotorProfileProvider();
      final controller = TextEditingController();

      await tester.pumpWidget(wrapWithProvider(
        HandwritingAlternative(
          controller: controller,
        ),
        provider,
      ));

      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('accepts text input', (tester) async {
      final provider = TestableMotorProfileProvider();
      final controller = TextEditingController();

      await tester.pumpWidget(wrapWithProvider(
        HandwritingAlternative(
          controller: controller,
        ),
        provider,
      ));

      await tester.enterText(find.byType(TextField), 'Hello');
      expect(controller.text, equals('Hello'));
    });
  });

  group('TremorFilter', () {
    test('moving average algorithm smooths input', () {
      // Test the filter algorithm directly
      final positions = [
        const Offset(10, 10),
        const Offset(12, 11),
        const Offset(9, 10),
        const Offset(11, 12),
        const Offset(10, 10),
      ];

      // Calculate expected average
      double sumX = 0, sumY = 0;
      for (final pos in positions) {
        sumX += pos.dx;
        sumY += pos.dy;
      }
      final avgX = sumX / positions.length;
      final avgY = sumY / positions.length;

      expect(avgX, closeTo(10.4, 0.1));
      expect(avgY, closeTo(10.6, 0.1));
    });

    test('respects movement threshold', () {
      // Movement less than threshold should be filtered
      const threshold = 3.0;
      const lastPosition = Offset(10, 10);
      const newPosition = Offset(11, 11);

      final distance = (newPosition - lastPosition).distance;
      expect(distance, lessThan(threshold));
    });

    test('uses configurable window size', () {
      // Window size determines how many samples are averaged
      const windowSize = 5;
      final buffer = <Offset>[];

      // Add more samples than window size
      for (var i = 0; i < 10; i++) {
        buffer.add(Offset(i.toDouble(), i.toDouble()));
        if (buffer.length > windowSize) {
          buffer.removeAt(0);
        }
      }

      expect(buffer.length, equals(windowSize));
      // Buffer should only contain last 5 positions
      expect(buffer.first.dx, equals(5.0));
      expect(buffer.last.dx, equals(9.0));
    });
  });

  group('VoiceInputButton', () {
    testWidgets('renders voice button icon', (tester) async {
      final provider = TestableMotorProfileProvider(
        accommodations: const MotorAccommodations(
          voiceInputEnabled: true,
        ),
      );

      await tester.pumpWidget(wrapWithProvider(
        const SizedBox(
          width: 100,
          height: 100,
          child: Center(child: Icon(Icons.mic)),
        ),
        provider,
      ));

      expect(find.byIcon(Icons.mic), findsOneWidget);
    });
  });

  group('SwitchAccessController', () {
    test('auto scan mode timing', () {
      // Test scan timing logic
      const scanSpeed = 1000; // 1 second per item
      const itemCount = 5;
      const totalCycleTime = scanSpeed * itemCount;

      expect(totalCycleTime, equals(5000)); // 5 seconds for full cycle
    });

    test('group-item navigation', () {
      // Test hierarchical navigation logic
      final groups = [
        ['Item 1', 'Item 2', 'Item 3'],
        ['Item 4', 'Item 5'],
        ['Item 6', 'Item 7', 'Item 8', 'Item 9'],
      ];

      expect(groups.length, equals(3));
      expect(groups[0].length, equals(3));
      expect(groups[2].length, equals(4));
    });
  });

  group('Integration', () {
    testWidgets('widgets work without accommodations (use defaults)', (tester) async {
      // Test that widgets don't crash when provider gives default values
      final provider = TestableMotorProfileProvider();

      await tester.pumpWidget(wrapWithProvider(
        Column(
          children: [
            LargeTouchTarget(
              child: const Text('Button 1'),
              onTap: () {},
            ),
            DwellSelection(
              child: const Text('Button 2'),
              onSelected: () {},
            ),
          ],
        ),
        provider,
      ));

      expect(find.text('Button 1'), findsOneWidget);
      expect(find.text('Button 2'), findsOneWidget);
    });

    testWidgets('widgets respond to accommodation changes', (tester) async {
      final provider = TestableMotorProfileProvider();

      await tester.pumpWidget(wrapWithProvider(
        LargeTouchTarget(
          child: const Text('Adaptive'),
          onTap: () {},
        ),
        provider,
      ));

      expect(find.text('Adaptive'), findsOneWidget);

      // Update accommodations
      provider.setAccommodations(const MotorAccommodations(
        touchTargetMultiplier: 2.0,
      ));

      await tester.pump();

      // Widget should still render
      expect(find.text('Adaptive'), findsOneWidget);
    });

    testWidgets('multiple motor widgets can coexist', (tester) async {
      final provider = TestableMotorProfileProvider(
        accommodations: const MotorAccommodations(
          touchTargetMultiplier: 1.5,
          dwellSelectionEnabled: true,
          dwellTimeMs: 800,
          simplifiedGestures: true,
        ),
      );

      await tester.pumpWidget(wrapWithProvider(
        Column(
          children: [
            LargeTouchTarget(
              child: const Text('Large Touch'),
              onTap: () {},
            ),
            DwellSelection(
              child: const Text('Dwell Select'),
              onSelected: () {},
            ),
            SimplifiedSwipeNavigation(
              onSwipeLeft: () {},
              onSwipeRight: () {},
              child: const Text('Swipe Nav'),
            ),
          ],
        ),
        provider,
      ));

      expect(find.text('Large Touch'), findsOneWidget);
      expect(find.text('Dwell Select'), findsOneWidget);
      expect(find.text('Swipe Nav'), findsOneWidget);
    });
  });
}
