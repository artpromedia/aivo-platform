import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Firebase configuration for the Teacher app
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

  /// Firebase options for Web - Teacher App
  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyDNuwHzk4LcFVgEPJkbIHShzF51rIz7M4A',
    appId: '1:373030578076:web:3cc9684d0c134bc8608a59',
    messagingSenderId: '373030578076',
    projectId: 'aivo-learning-7eee8',
    authDomain: 'aivo-learning-7eee8.firebaseapp.com',
    storageBucket: 'aivo-learning-7eee8.firebasestorage.app',
    measurementId: 'G-4WBR9ZP5Q9',
  );

  /// Firebase options for Android - Teacher App
  /// NOTE: Register an Android app in Firebase Console and update appId
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDNuwHzk4LcFVgEPJkbIHShzF51rIz7M4A',
    appId: '1:373030578076:android:teacher_app_id', // TODO: Replace with actual Android app ID from Firebase Console
    messagingSenderId: '373030578076',
    projectId: 'aivo-learning-7eee8',
    storageBucket: 'aivo-learning-7eee8.firebasestorage.app',
  );

  /// Firebase options for iOS - Teacher App
  /// NOTE: Register an iOS app in Firebase Console and update appId/iosClientId
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyDNuwHzk4LcFVgEPJkbIHShzF51rIz7M4A',
    appId: '1:373030578076:ios:teacher_app_id', // TODO: Replace with actual iOS app ID from Firebase Console
    messagingSenderId: '373030578076',
    projectId: 'aivo-learning-7eee8',
    storageBucket: 'aivo-learning-7eee8.firebasestorage.app',
    iosBundleId: 'com.aivo.teacher',
  );
}
