/// Golden Toolkit Configuration
///
/// Configuration for golden tests and device specifications.
library;

import 'package:flutter/material.dart';

/// Device specifications for golden tests.
class TestDevices {
  /// iPhone SE (small phone).
  static const iphoneSE = TestDevice(
    name: 'iphone_se',
    size: Size(375, 667),
    devicePixelRatio: 2.0,
  );

  /// iPhone 14 (standard phone).
  static const iphone14 = TestDevice(
    name: 'iphone_14',
    size: Size(390, 844),
    devicePixelRatio: 3.0,
  );

  /// iPhone 14 Pro Max (large phone).
  static const iphone14ProMax = TestDevice(
    name: 'iphone_14_pro_max',
    size: Size(430, 932),
    devicePixelRatio: 3.0,
  );

  /// iPad Mini (small tablet).
  static const ipadMini = TestDevice(
    name: 'ipad_mini',
    size: Size(744, 1133),
    devicePixelRatio: 2.0,
  );

  /// iPad Pro 11" (tablet).
  static const ipadPro11 = TestDevice(
    name: 'ipad_pro_11',
    size: Size(834, 1194),
    devicePixelRatio: 2.0,
  );

  /// iPad Pro 12.9" (large tablet).
  static const ipadPro12 = TestDevice(
    name: 'ipad_pro_12',
    size: Size(1024, 1366),
    devicePixelRatio: 2.0,
  );

  /// All phone devices.
  static const phones = [iphoneSE, iphone14, iphone14ProMax];

  /// All tablet devices.
  static const tablets = [ipadMini, ipadPro11, ipadPro12];

  /// All devices.
  static const all = [...phones, ...tablets];

  /// Default devices for golden tests.
  static const defaults = [iphone14, ipadPro11];
}

/// Test device configuration.
class TestDevice {
  const TestDevice({
    required this.name,
    required this.size,
    this.devicePixelRatio = 1.0,
    this.textScaleFactor = 1.0,
    this.brightness = Brightness.light,
    this.safeArea = EdgeInsets.zero,
  });

  final String name;
  final Size size;
  final double devicePixelRatio;
  final double textScaleFactor;
  final Brightness brightness;
  final EdgeInsets safeArea;

  /// Create a dark mode variant.
  TestDevice dark() {
    return TestDevice(
      name: '${name}_dark',
      size: size,
      devicePixelRatio: devicePixelRatio,
      textScaleFactor: textScaleFactor,
      brightness: Brightness.dark,
      safeArea: safeArea,
    );
  }

  /// Create a large text variant.
  TestDevice largeText() {
    return TestDevice(
      name: '${name}_large_text',
      size: size,
      devicePixelRatio: devicePixelRatio,
      textScaleFactor: 1.5,
      brightness: brightness,
      safeArea: safeArea,
    );
  }

  /// Create an extra large text variant.
  TestDevice extraLargeText() {
    return TestDevice(
      name: '${name}_xlarge_text',
      size: size,
      devicePixelRatio: devicePixelRatio,
      textScaleFactor: 2.0,
      brightness: brightness,
      safeArea: safeArea,
    );
  }
}

/// Accessibility test devices.
class AccessibilityDevices {
  /// Large text variants for all default devices.
  static List<TestDevice> get largeText =>
      TestDevices.defaults.map((d) => d.largeText()).toList();

  /// Extra large text variants for all default devices.
  static List<TestDevice> get extraLargeText =>
      TestDevices.defaults.map((d) => d.extraLargeText()).toList();

  /// Dark mode variants for all default devices.
  static List<TestDevice> get darkMode =>
      TestDevices.defaults.map((d) => d.dark()).toList();

  /// All accessibility variants.
  static List<TestDevice> get all => [
        ...largeText,
        ...extraLargeText,
        ...darkMode,
      ];
}

/// Theme data for golden tests.
class TestThemes {
  /// Light theme for tests.
  static ThemeData get light => ThemeData.light(useMaterial3: true);

  /// Dark theme for tests.
  static ThemeData get dark => ThemeData.dark(useMaterial3: true);
}
