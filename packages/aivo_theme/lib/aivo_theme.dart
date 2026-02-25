/// White-label theming for AIVO Flutter apps.
///
/// Fetches tenant branding from the AIVO branding API and converts it
/// to a Material 3 [ThemeData] with [AivoColors] extension.
///
/// ```dart
/// // Fetch branding at app startup
/// final branding = await AivoBranding.fetchForDomain('academy.example.com');
/// // or use defaults
/// final branding = AivoBranding.defaults();
///
/// runApp(
///   MaterialApp(
///     theme: branding.toThemeData(),
///     home: MyHome(),
///   ),
/// );
/// ```
library aivo_theme;

export 'src/aivo_branding.dart';
export 'src/aivo_branding_provider.dart';
