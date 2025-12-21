/// Flutter Test Configuration
///
/// Configures test utilities and common setup.
library;

import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

/// Global test configuration.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  // Configure test environment
  TestWidgetsFlutterBinding.ensureInitialized();

  // Run tests
  await testMain();
}
