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
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'YOUR_ANDROID_API_KEY',
    appId: '1:123456789:android:learner_app_id',
    messagingSenderId: '123456789',
    projectId: 'aivo-platform',
    storageBucket: 'aivo-platform.appspot.com',
  );

  /// Firebase options for iOS - Learner App
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'YOUR_IOS_API_KEY',
    appId: '1:123456789:ios:learner_app_id',
    messagingSenderId: '123456789',
    projectId: 'aivo-platform',
    storageBucket: 'aivo-platform.appspot.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    iosBundleId: 'com.aivo.learner',
  );
}
