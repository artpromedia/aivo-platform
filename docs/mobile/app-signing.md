# Mobile App Signing Configuration

This document describes how to configure app signing for production releases.

## Android Signing

### 1. Generate Keystore

Generate a keystore for production releases:

```bash
# Create keystore directory (gitignored)
mkdir -p android/app/keystore

# Generate keystore
keytool -genkey -v \
  -keystore android/app/keystore/upload-keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias upload
```

Store the keystore password securely in a password manager or secrets vault.

### 2. Create key.properties

Create `android/key.properties` (gitignored):

```properties
storePassword=<keystore password>
keyPassword=<key password>
keyAlias=upload
storeFile=keystore/upload-keystore.jks
```

### 3. Configure build.gradle

Add to `android/app/build.gradle`:

```groovy
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...

    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4. ProGuard Configuration

Create `android/app/proguard-rules.pro`:

```proguard
# Flutter
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Crashlytics
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
-keep class com.crashlytics.** { *; }
-dontwarn com.crashlytics.**

# Keep model classes (Freezed)
-keep class **.models.** { *; }
-keep class **.data.** { *; }
```

### 5. CI/CD Secrets

Store in GitHub Secrets or your CI provider:

```
ANDROID_KEYSTORE_BASE64    # base64 encoded keystore file
ANDROID_KEYSTORE_PASSWORD  # keystore password
ANDROID_KEY_ALIAS          # key alias
ANDROID_KEY_PASSWORD       # key password
```

GitHub Actions example:

```yaml
- name: Decode Keystore
  run: |
    echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/app/keystore/upload-keystore.jks

- name: Create key.properties
  run: |
    cat > android/key.properties << EOF
    storePassword=${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    keyPassword=${{ secrets.ANDROID_KEY_PASSWORD }}
    keyAlias=${{ secrets.ANDROID_KEY_ALIAS }}
    storeFile=keystore/upload-keystore.jks
    EOF
```

## iOS Signing

### 1. Apple Developer Account Setup

1. Create App IDs in Apple Developer Portal:
   - `com.aivo.learner`
   - `com.aivo.parent`
   - `com.aivo.teacher`

2. Create provisioning profiles for each:
   - Development (for testing)
   - App Store (for production)

### 2. Fastlane Setup

Install and configure Fastlane for automated signing:

```bash
cd ios
fastlane init
```

Create `ios/fastlane/Appfile`:

```ruby
app_identifier("com.aivo.learner")  # Change per app
apple_id("developer@aivo.com")
itc_team_id("YOUR_TEAM_ID")
team_id("YOUR_TEAM_ID")
```

Create `ios/fastlane/Fastfile`:

```ruby
default_platform(:ios)

platform :ios do
  desc "Build and deploy to TestFlight"
  lane :beta do
    setup_ci if ENV['CI']

    match(type: "appstore", readonly: true)

    build_app(
      workspace: "Runner.xcworkspace",
      scheme: "Runner-Prod",
      export_method: "app-store"
    )

    upload_to_testflight(skip_waiting_for_build_processing: true)
  end

  desc "Build for App Store"
  lane :release do
    setup_ci if ENV['CI']

    match(type: "appstore", readonly: true)

    build_app(
      workspace: "Runner.xcworkspace",
      scheme: "Runner-Prod",
      export_method: "app-store"
    )

    upload_to_app_store(
      skip_metadata: true,
      skip_screenshots: true,
      precheck_include_in_app_purchases: false
    )
  end
end
```

### 3. Match for Code Signing

Use `fastlane match` for team code signing:

```bash
fastlane match init
fastlane match appstore
fastlane match development
```

Store certificates in a private Git repository.

### 4. CI/CD Integration

GitHub Actions secrets:

```
MATCH_PASSWORD           # Match encryption password
MATCH_GIT_URL           # Git repo URL for certificates
MATCH_GIT_BASIC_AUTH    # Git credentials
APP_STORE_CONNECT_API_KEY_ID
APP_STORE_CONNECT_API_ISSUER_ID
APP_STORE_CONNECT_API_KEY_CONTENT
```

GitHub Actions workflow:

```yaml
- name: Install Fastlane
  run: gem install fastlane

- name: Build iOS
  env:
    MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
    MATCH_GIT_URL: ${{ secrets.MATCH_GIT_URL }}
    MATCH_GIT_BASIC_AUTH: ${{ secrets.MATCH_GIT_BASIC_AUTH }}
  run: |
    cd ios
    fastlane beta
```

## Security Best Practices

### DO:

- Store keystores and signing credentials in secure secrets management
- Use different signing keys for each flavor (dev/staging/prod)
- Rotate signing keys periodically
- Use CI/CD secrets for all credentials
- Enable Google Play App Signing for Android

### DON'T:

- Commit keystores or certificates to version control
- Share signing passwords in plaintext
- Use the same keystore for multiple apps
- Store credentials in plaintext files

## Files to Gitignore

Ensure these are in `.gitignore`:

```gitignore
# Android signing
android/key.properties
android/app/keystore/
*.jks
*.keystore

# iOS signing
ios/*.mobileprovision
ios/*.p12
ios/fastlane/report.xml
ios/fastlane/Preview.html
ios/fastlane/test_output
```

## Verification

### Android

```bash
# Verify APK signature
apksigner verify --print-certs app-release.apk
```

### iOS

```bash
# Verify IPA contents
unzip -l app.ipa
codesign -dv --verbose=4 Payload/Runner.app
```
