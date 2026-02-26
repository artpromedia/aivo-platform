import 'package:aivo_theme/aivo_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AivoBrandingProvider.maybeOf', () {
    testWidgets('returns branding when provider is present',
        (tester) async {
      final branding = AivoBranding.defaults().copyWith(
        displayName: 'MaybeOf Test',
      );

      AivoBranding? result;

      await tester.pumpWidget(
        AivoBrandingProvider(
          branding: branding,
          child: Builder(
            builder: (context) {
              result = AivoBrandingProvider.maybeOf(context);
              return const SizedBox();
            },
          ),
        ),
      );

      expect(result, isNotNull);
      expect(result!.displayName, 'MaybeOf Test');
    });

    testWidgets('returns null when no provider ancestor', (tester) async {
      AivoBranding? result;

      await tester.pumpWidget(
        Builder(
          builder: (context) {
            result = AivoBrandingProvider.maybeOf(context);
            return const SizedBox();
          },
        ),
      );

      expect(result, isNull);
    });
  });

  group('AivoBrandingProvider.updateShouldNotify', () {
    testWidgets('rebuilds when displayName changes', (tester) async {
      int buildCount = 0;

      final initial = AivoBranding.defaults().copyWith(
        displayName: 'Before',
      );
      final updated = AivoBranding.defaults().copyWith(
        displayName: 'After',
      );

      final widget = _TrackingApp(
        initialBranding: initial,
        onBuild: () => buildCount++,
      );

      await tester.pumpWidget(widget);
      expect(buildCount, 1);

      // Update branding
      widget.state!.updateBranding(updated);
      await tester.pump();
      expect(buildCount, 2);
    });

    testWidgets('does not rebuild when branding is identical',
        (tester) async {
      int buildCount = 0;

      final branding = AivoBranding.defaults();

      final widget = _TrackingApp(
        initialBranding: branding,
        onBuild: () => buildCount++,
      );

      await tester.pumpWidget(widget);
      expect(buildCount, 1);

      // "Update" with identical branding
      widget.state!.updateBranding(AivoBranding.defaults());
      await tester.pump();

      // Should not trigger a rebuild of dependent widgets because
      // displayName, colorPrimary, colorSecondary, logoUrl are all equal
      expect(buildCount, 1);
    });

    testWidgets('rebuilds when colorPrimary changes', (tester) async {
      int buildCount = 0;

      final initial = AivoBranding.defaults();
      final updated = AivoBranding.defaults().copyWith(
        colorPrimary: const Color(0xFFFF0000),
      );

      final widget = _TrackingApp(
        initialBranding: initial,
        onBuild: () => buildCount++,
      );

      await tester.pumpWidget(widget);
      expect(buildCount, 1);

      widget.state!.updateBranding(updated);
      await tester.pump();
      expect(buildCount, 2);
    });
  });

  group('AivoBrandingContext extension', () {
    testWidgets('tenantName returns displayName', (tester) async {
      late String name;

      await tester.pumpWidget(
        AivoBrandingProvider(
          branding: AivoBranding.defaults().copyWith(
            displayName: 'Context Test',
          ),
          child: Builder(
            builder: (context) {
              name = context.tenantName;
              return const SizedBox();
            },
          ),
        ),
      );

      expect(name, 'Context Test');
    });

    testWidgets('tenantLogoSmallUrl returns small logo', (tester) async {
      late String? url;

      await tester.pumpWidget(
        AivoBrandingProvider(
          branding: AivoBranding.defaults().copyWith(
            logoSmallUrl: 'https://example.com/small.png',
          ),
          child: Builder(
            builder: (context) {
              url = context.tenantLogoSmallUrl;
              return const SizedBox();
            },
          ),
        ),
      );

      expect(url, 'https://example.com/small.png');
    });

    testWidgets('defaults when no provider in tree', (tester) async {
      late String name;

      await tester.pumpWidget(
        Builder(
          builder: (context) {
            name = context.tenantName;
            return const SizedBox();
          },
        ),
      );

      expect(name, 'Aivo Learning');
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Test helpers
// ══════════════════════════════════════════════════════════════════════════════

/// A simple stateful app that allows updating branding and tracks rebuilds
/// of a dependent widget.
class _TrackingApp extends StatefulWidget {
  _TrackingApp({
    required this.initialBranding,
    required this.onBuild,
  });

  final AivoBranding initialBranding;
  final VoidCallback onBuild;

  _TrackingAppState? state;

  @override
  State<_TrackingApp> createState() {
    state = _TrackingAppState();
    return state!;
  }
}

class _TrackingAppState extends State<_TrackingApp> {
  late AivoBranding _branding;

  @override
  void initState() {
    super.initState();
    _branding = widget.initialBranding;
  }

  void updateBranding(AivoBranding branding) {
    setState(() {
      _branding = branding;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AivoBrandingProvider(
      branding: _branding,
      child: Builder(
        builder: (context) {
          // Access branding to register as dependent
          AivoBrandingProvider.of(context);
          widget.onBuild();
          return const SizedBox();
        },
      ),
    );
  }
}
