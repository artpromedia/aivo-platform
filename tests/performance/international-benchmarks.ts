/**
 * International Performance Benchmark Suite
 *
 * Benchmarks for multi-region performance:
 * - Geolocation detection latency
 * - Currency conversion throughput
 * - Translation loading times
 * - Compliance check performance
 * - Cross-border validation speed
 */

import { performance } from 'perf_hooks';

/* ==========================================================================
   Benchmark Configuration
   ========================================================================== */

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  opsPerSecond: number;
}

interface BenchmarkThresholds {
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
}

const DEFAULT_ITERATIONS = 1000;
const WARMUP_ITERATIONS = 100;

/* ==========================================================================
   Benchmark Runner
   ========================================================================== */

async function runBenchmark(
  name: string,
  fn: () => Promise<void> | void,
  iterations: number = DEFAULT_ITERATIONS
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    await fn();
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  // Sort for percentiles
  times.sort((a, b) => a - b);

  const totalMs = times.reduce((sum, t) => sum + t, 0);
  const avgMs = totalMs / iterations;
  const minMs = times[0];
  const maxMs = times[times.length - 1];
  const p50Ms = times[Math.floor(iterations * 0.5)];
  const p95Ms = times[Math.floor(iterations * 0.95)];
  const p99Ms = times[Math.floor(iterations * 0.99)];
  const opsPerSecond = 1000 / avgMs;

  return {
    name,
    iterations,
    totalMs,
    avgMs,
    minMs,
    maxMs,
    p50Ms,
    p95Ms,
    p99Ms,
    opsPerSecond,
  };
}

function checkThresholds(result: BenchmarkResult, thresholds: BenchmarkThresholds): {
  passed: boolean;
  failures: string[];
} {
  const failures: string[] = [];

  if (result.avgMs > thresholds.avgMs) {
    failures.push(`avg ${result.avgMs.toFixed(2)}ms > ${thresholds.avgMs}ms`);
  }
  if (result.p95Ms > thresholds.p95Ms) {
    failures.push(`p95 ${result.p95Ms.toFixed(2)}ms > ${thresholds.p95Ms}ms`);
  }
  if (result.p99Ms > thresholds.p99Ms) {
    failures.push(`p99 ${result.p99Ms.toFixed(2)}ms > ${thresholds.p99Ms}ms`);
  }

  return { passed: failures.length === 0, failures };
}

function formatResult(result: BenchmarkResult): string {
  return `
${result.name}
${'='.repeat(result.name.length)}
  Iterations: ${result.iterations.toLocaleString()}
  Total Time: ${result.totalMs.toFixed(2)}ms
  Avg:        ${result.avgMs.toFixed(3)}ms
  Min:        ${result.minMs.toFixed(3)}ms
  Max:        ${result.maxMs.toFixed(3)}ms
  P50:        ${result.p50Ms.toFixed(3)}ms
  P95:        ${result.p95Ms.toFixed(3)}ms
  P99:        ${result.p99Ms.toFixed(3)}ms
  Throughput: ${result.opsPerSecond.toFixed(0)} ops/sec
`;
}

/* ==========================================================================
   Geolocation Benchmarks
   ========================================================================== */

// Simulated geolocation detection
const COUNTRY_DATA: Record<string, { currency: string; locale: string; regulations: string[] }> = {
  US: { currency: 'USD', locale: 'en-US', regulations: ['COPPA', 'FERPA'] },
  GB: { currency: 'GBP', locale: 'en-GB', regulations: ['GDPR', 'UK_GDPR'] },
  DE: { currency: 'EUR', locale: 'de-DE', regulations: ['GDPR'] },
  FR: { currency: 'EUR', locale: 'fr-FR', regulations: ['GDPR'] },
  BR: { currency: 'BRL', locale: 'pt-BR', regulations: ['LGPD'] },
  NG: { currency: 'NGN', locale: 'en-NG', regulations: ['NDPR'] },
  IN: { currency: 'INR', locale: 'hi-IN', regulations: ['DPDP'] },
  JP: { currency: 'JPY', locale: 'ja-JP', regulations: ['APPI'] },
};

function detectCountry(ip: string): { country: string; data: typeof COUNTRY_DATA.US } {
  // Simulate IP to country lookup (would use MaxMind in production)
  const countries = Object.keys(COUNTRY_DATA);
  const hash = ip.split('.').reduce((sum, octet) => sum + parseInt(octet, 10), 0);
  const country = countries[hash % countries.length];
  return { country, data: COUNTRY_DATA[country] };
}

async function benchmarkGeolocation(): Promise<BenchmarkResult> {
  const testIPs = [
    '8.8.8.8', '1.1.1.1', '208.67.222.222', '9.9.9.9',
    '185.228.168.9', '76.76.19.19', '94.140.14.14', '149.112.112.112',
  ];

  return runBenchmark('Geolocation Detection', () => {
    const ip = testIPs[Math.floor(Math.random() * testIPs.length)];
    const result = detectCountry(ip);
    if (!result.country) throw new Error('Detection failed');
  });
}

/* ==========================================================================
   Currency Conversion Benchmarks
   ========================================================================== */

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  BRL: 4.97,
  INR: 83.12,
  NGN: 1550.0,
  KES: 153.50,
  ZAR: 18.90,
  AED: 3.67,
  MXN: 17.15,
  AUD: 1.53,
  CAD: 1.36,
  KRW: 1320.0,
};

function convertCurrency(amount: number, from: string, to: string): number {
  const fromRate = EXCHANGE_RATES[from] || 1;
  const toRate = EXCHANGE_RATES[to] || 1;
  return (amount / fromRate) * toRate;
}

async function benchmarkCurrencyConversion(): Promise<BenchmarkResult> {
  const currencies = Object.keys(EXCHANGE_RATES);

  return runBenchmark('Currency Conversion', () => {
    const from = currencies[Math.floor(Math.random() * currencies.length)];
    const to = currencies[Math.floor(Math.random() * currencies.length)];
    const amount = Math.random() * 10000;
    const result = convertCurrency(amount, from, to);
    if (isNaN(result)) throw new Error('Conversion failed');
  });
}

/* ==========================================================================
   Translation Loading Benchmarks
   ========================================================================== */

// Simulated translation cache
const TRANSLATION_CACHE = new Map<string, Record<string, string>>();

function generateTranslations(locale: string): Record<string, string> {
  const translations: Record<string, string> = {};
  for (let i = 0; i < 500; i++) {
    translations[`key.${i}`] = `Translation ${i} for ${locale}`;
  }
  return translations;
}

function loadTranslations(locale: string): Record<string, string> {
  if (!TRANSLATION_CACHE.has(locale)) {
    TRANSLATION_CACHE.set(locale, generateTranslations(locale));
  }
  return TRANSLATION_CACHE.get(locale)!;
}

function formatMessage(
  translations: Record<string, string>,
  key: string,
  values?: Record<string, string | number>
): string {
  let message = translations[key] || key;
  if (values) {
    for (const [k, v] of Object.entries(values)) {
      message = message.replace(`{${k}}`, String(v));
    }
  }
  return message;
}

async function benchmarkTranslationLoad(): Promise<BenchmarkResult> {
  const locales = ['en', 'es', 'fr', 'de', 'pt', 'ar', 'hi', 'ja', 'ko', 'zh'];
  TRANSLATION_CACHE.clear(); // Clear cache for cold load test

  return runBenchmark(
    'Translation Load (Cold)',
    () => {
      const locale = locales[Math.floor(Math.random() * locales.length)];
      const translations = loadTranslations(locale);
      if (Object.keys(translations).length === 0) throw new Error('Load failed');
    },
    500
  );
}

async function benchmarkTranslationFormat(): Promise<BenchmarkResult> {
  const translations = loadTranslations('en');
  const keys = Object.keys(translations);

  return runBenchmark('Translation Format', () => {
    const key = keys[Math.floor(Math.random() * keys.length)];
    const result = formatMessage(translations, key, { name: 'User', count: 42 });
    if (!result) throw new Error('Format failed');
  });
}

/* ==========================================================================
   Compliance Check Benchmarks
   ========================================================================== */

interface ComplianceFramework {
  name: string;
  ageOfConsent: number;
  parentalConsentAge: number;
  dsrResponseDays: number;
  breachNotificationHours: number;
}

const FRAMEWORKS: Record<string, ComplianceFramework> = {
  GDPR: { name: 'GDPR', ageOfConsent: 16, parentalConsentAge: 16, dsrResponseDays: 30, breachNotificationHours: 72 },
  COPPA: { name: 'COPPA', ageOfConsent: 13, parentalConsentAge: 13, dsrResponseDays: 30, breachNotificationHours: 72 },
  LGPD: { name: 'LGPD', ageOfConsent: 12, parentalConsentAge: 18, dsrResponseDays: 15, breachNotificationHours: 48 },
  CCPA: { name: 'CCPA', ageOfConsent: 16, parentalConsentAge: 13, dsrResponseDays: 45, breachNotificationHours: 72 },
  PIPEDA: { name: 'PIPEDA', ageOfConsent: 13, parentalConsentAge: 13, dsrResponseDays: 30, breachNotificationHours: 72 },
  POPIA: { name: 'POPIA', ageOfConsent: 18, parentalConsentAge: 18, dsrResponseDays: 30, breachNotificationHours: 72 },
  DPDP: { name: 'DPDP', ageOfConsent: 18, parentalConsentAge: 18, dsrResponseDays: 30, breachNotificationHours: 72 },
  APPI: { name: 'APPI', ageOfConsent: 15, parentalConsentAge: 15, dsrResponseDays: 14, breachNotificationHours: 72 },
};

const COUNTRY_FRAMEWORKS: Record<string, string[]> = {
  US: ['COPPA', 'CCPA'],
  GB: ['GDPR'],
  DE: ['GDPR'],
  FR: ['GDPR'],
  BR: ['LGPD'],
  CA: ['PIPEDA'],
  ZA: ['POPIA'],
  IN: ['DPDP'],
  JP: ['APPI'],
};

function detectApplicableFrameworks(country: string): ComplianceFramework[] {
  const frameworkNames = COUNTRY_FRAMEWORKS[country] || [];
  return frameworkNames.map((name) => FRAMEWORKS[name]).filter(Boolean);
}

function getMostRestrictiveAge(frameworks: ComplianceFramework[]): number {
  return Math.max(...frameworks.map((f) => f.ageOfConsent), 13);
}

async function benchmarkComplianceDetection(): Promise<BenchmarkResult> {
  const countries = Object.keys(COUNTRY_FRAMEWORKS);

  return runBenchmark('Compliance Framework Detection', () => {
    const country = countries[Math.floor(Math.random() * countries.length)];
    const frameworks = detectApplicableFrameworks(country);
    const minAge = getMostRestrictiveAge(frameworks);
    if (minAge < 0) throw new Error('Detection failed');
  });
}

/* ==========================================================================
   Cross-Border Validation Benchmarks
   ========================================================================== */

const EEA_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
]);

const ADEQUACY_COUNTRIES = new Set([
  'AD', 'AR', 'CA', 'FO', 'GG', 'IL', 'IM', 'JP', 'JE', 'NZ',
  'KR', 'CH', 'GB', 'UY', 'US',
]);

interface TransferValidation {
  allowed: boolean;
  requiresSCC: boolean;
  requiresTIA: boolean;
  blockers: string[];
}

function validateCrossBorderTransfer(source: string, destination: string): TransferValidation {
  // Same country
  if (source === destination) {
    return { allowed: true, requiresSCC: false, requiresTIA: false, blockers: [] };
  }

  // EEA to EEA
  if (EEA_COUNTRIES.has(source) && EEA_COUNTRIES.has(destination)) {
    return { allowed: true, requiresSCC: false, requiresTIA: false, blockers: [] };
  }

  // Check adequacy
  if (ADEQUACY_COUNTRIES.has(destination)) {
    return { allowed: true, requiresSCC: false, requiresTIA: true, blockers: [] };
  }

  // Requires SCCs
  return {
    allowed: true,
    requiresSCC: true,
    requiresTIA: true,
    blockers: [],
  };
}

async function benchmarkCrossBorderValidation(): Promise<BenchmarkResult> {
  const allCountries = [...EEA_COUNTRIES, ...ADEQUACY_COUNTRIES, 'CN', 'RU', 'IN', 'BR'];

  return runBenchmark('Cross-Border Transfer Validation', () => {
    const source = allCountries[Math.floor(Math.random() * allCountries.length)];
    const dest = allCountries[Math.floor(Math.random() * allCountries.length)];
    const result = validateCrossBorderTransfer(source, dest);
    if (result.allowed === undefined) throw new Error('Validation failed');
  });
}

/* ==========================================================================
   Gateway Selection Benchmarks
   ========================================================================== */

const GATEWAY_PRIORITIES: Record<string, string[]> = {
  US: ['stripe'],
  GB: ['stripe'],
  DE: ['stripe'],
  FR: ['stripe'],
  NG: ['paystack', 'flutterwave'],
  GH: ['paystack', 'flutterwave'],
  KE: ['flutterwave', 'mpesa'],
  ZA: ['payfast', 'flutterwave'],
  IN: ['razorpay', 'paytm'],
  BR: ['mercadopago'],
  MX: ['mercadopago'],
  AR: ['mercadopago'],
};

function selectPaymentGateway(country: string): string {
  const gateways = GATEWAY_PRIORITIES[country] || ['stripe'];
  return gateways[0];
}

async function benchmarkGatewaySelection(): Promise<BenchmarkResult> {
  const countries = Object.keys(GATEWAY_PRIORITIES);

  return runBenchmark('Payment Gateway Selection', () => {
    const country = countries[Math.floor(Math.random() * countries.length)];
    const gateway = selectPaymentGateway(country);
    if (!gateway) throw new Error('Selection failed');
  });
}

/* ==========================================================================
   Run All Benchmarks
   ========================================================================== */

export async function runAllBenchmarks(): Promise<{
  results: BenchmarkResult[];
  passed: boolean;
  summary: string;
}> {
  console.log('Starting International Performance Benchmarks...\n');

  const thresholds: Record<string, BenchmarkThresholds> = {
    'Geolocation Detection': { avgMs: 1, p95Ms: 2, p99Ms: 5 },
    'Currency Conversion': { avgMs: 0.1, p95Ms: 0.5, p99Ms: 1 },
    'Translation Load (Cold)': { avgMs: 10, p95Ms: 20, p99Ms: 50 },
    'Translation Format': { avgMs: 0.1, p95Ms: 0.5, p99Ms: 1 },
    'Compliance Framework Detection': { avgMs: 0.5, p95Ms: 1, p99Ms: 2 },
    'Cross-Border Transfer Validation': { avgMs: 0.5, p95Ms: 1, p99Ms: 2 },
    'Payment Gateway Selection': { avgMs: 0.1, p95Ms: 0.5, p99Ms: 1 },
  };

  const benchmarks = [
    benchmarkGeolocation,
    benchmarkCurrencyConversion,
    benchmarkTranslationLoad,
    benchmarkTranslationFormat,
    benchmarkComplianceDetection,
    benchmarkCrossBorderValidation,
    benchmarkGatewaySelection,
  ];

  const results: BenchmarkResult[] = [];
  let allPassed = true;
  const summaryLines: string[] = [];

  for (const benchmark of benchmarks) {
    const result = await benchmark();
    results.push(result);

    console.log(formatResult(result));

    const threshold = thresholds[result.name];
    if (threshold) {
      const check = checkThresholds(result, threshold);
      if (!check.passed) {
        allPassed = false;
        summaryLines.push(`❌ ${result.name}: ${check.failures.join(', ')}`);
      } else {
        summaryLines.push(`✅ ${result.name}: PASSED`);
      }
    }
  }

  const summary = `
BENCHMARK SUMMARY
=================
${summaryLines.join('\n')}

Overall: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}
`;

  console.log(summary);

  return { results, passed: allPassed, summary };
}

// Export for testing
export {
  runBenchmark,
  checkThresholds,
  formatResult,
  benchmarkGeolocation,
  benchmarkCurrencyConversion,
  benchmarkTranslationLoad,
  benchmarkTranslationFormat,
  benchmarkComplianceDetection,
  benchmarkCrossBorderValidation,
  benchmarkGatewaySelection,
};

// Run if executed directly
if (require.main === module) {
  runAllBenchmarks()
    .then(({ passed }) => {
      process.exit(passed ? 0 : 1);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
