import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Firebase configuration for the Learner app
/// 
/// COPPA COMPLIANCE NOTE:
/// This app is used by children under 13. All data collection
/// and notification handling must comply with COPPA requirements.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'DefaultFirebaseOptions have not been configured for web.',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  /// Firebase options for Android - Learner App
  /// Using mock credentials for local development
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDevelopmentMockKeyForLocalTestingOnly',
    appId: '1:123456789012:android:abcdef1234567890',
    messagingSenderId: '123456789012',
    projectId: 'aivo-platform-dev',
    storageBucket: 'aivo-platform-dev.appspot.com',
  );

  /// Firebase options for iOS - Learner App
  /// Using mock credentials for local development
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyDevelopmentMockKeyForIOSLocalTestingOnly',
    appId: '1:123456789012:ios:abcdef1234567890',
    messagingSenderId: '123456789012',
    projectId: 'aivo-platform-dev',
    storageBucket: 'aivo-platform-dev.appspot.com',
    iosClientId: '123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
    iosBundleId: 'com.aivo.learner.dev',
  );
}
