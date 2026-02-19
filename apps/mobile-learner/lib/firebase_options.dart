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
      return web;
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

  /// Firebase options for Web - Learner App
  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyDNuwHzk4LcFVgEPJkbIHShzF51rIz7M4A',
    appId: '1:373030578076:web:3cc9684d0c134bc8608a59',
    messagingSenderId: '373030578076',
    projectId: 'aivo-learning-7eee8',
    authDomain: 'aivo-learning-7eee8.firebaseapp.com',
    storageBucket: 'aivo-learning-7eee8.firebasestorage.app',
    measurementId: 'G-4WBR9ZP5Q9',
  );

  /// Firebase options for Android - Learner App
  /// NOTE: Register an Android app in Firebase Console and update appId
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDNuwHzk4LcFVgEPJkbIHShzF51rIz7M4A',
    appId: '1:373030578076:android:learner_app_id', // TODO: Replace with actual Android app ID from Firebase Console
    messagingSenderId: '373030578076',
    projectId: 'aivo-learning-7eee8',
    storageBucket: 'aivo-learning-7eee8.firebasestorage.app',
  );

  /// Firebase options for iOS - Learner App
  /// NOTE: Register an iOS app in Firebase Console and update appId/iosClientId
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyDNuwHzk4LcFVgEPJkbIHShzF51rIz7M4A',
    appId: '1:373030578076:ios:learner_app_id', // TODO: Replace with actual iOS app ID from Firebase Console
    messagingSenderId: '373030578076',
    projectId: 'aivo-learning-7eee8',
    storageBucket: 'aivo-learning-7eee8.firebasestorage.app',
    iosBundleId: 'com.aivo.learner',
  );
}
