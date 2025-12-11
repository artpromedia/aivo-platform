/// Network Resilience Library
///
/// Provides comprehensive network resilience patterns for Flutter apps
/// operating in challenging school network environments.
///
/// This library includes:
/// - [ResilientHttpClient] - HTTP client with timeouts, retries, and telemetry
/// - [CircuitBreaker] - Prevents cascading failures
/// - [GracefulDegradationService] - Manages feature availability during outages
/// - [NetworkTelemetryService] - Collects network metrics for monitoring
///
/// Example usage:
/// ```dart
/// import 'package:flutter_common/network/network.dart';
///
/// // Initialize services
/// await NetworkTelemetryService.instance.initialize();
/// await GracefulDegradationService.instance.initialize();
///
/// // Create a resilient HTTP client
/// final client = ResilientHttpClient(
///   baseUrl: 'https://api.aivo.app',
///   tenantId: 'tenant-123',
/// );
///
/// // Make requests with automatic retry and circuit breaking
/// final aiBreaker = CircuitBreakerRegistry.instance.aiService;
/// try {
///   final response = await aiBreaker.execute(() async {
///     return await client.post(
///       '/ai/generate',
///       body: {'prompt': 'Explain this concept'},
///       config: RequestConfig.aiOperation,
///     );
///   });
/// } on CircuitBreakerOpenException {
///   // Use fallback response
///   return AIFallbackResponses.explanation;
/// }
/// ```
library;

export 'circuit_breaker.dart';
export 'graceful_degradation.dart';
export 'network_status_widget.dart';
export 'network_telemetry.dart';
export 'resilient_http_client.dart';
