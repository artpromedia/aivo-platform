/**
 * k6 Threshold Checker
 *
 * Usage: node scripts/check-k6-thresholds.js <k6-summary.json>
 */

const fs = require('fs');

function checkThresholds(summaryFile) {
  console.log('\n🔍 Checking k6 Performance Thresholds\n');

  if (!fs.existsSync(summaryFile)) {
    console.error(`❌ File not found: ${summaryFile}`);
    process.exit(1);
  }

  const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
  const { metrics } = summary;

  const thresholds = {
    // Response time thresholds
    'http_req_duration.p50': { max: 100, unit: 'ms' },
    'http_req_duration.p95': { max: 200, unit: 'ms' },
    'http_req_duration.p99': { max: 500, unit: 'ms' },

    // Error rate
    'http_req_failed.rate': { max: 0.01, unit: '%', multiply: 100 },

    // Throughput (informational)
    'http_reqs.rate': { min: 100, unit: 'req/s' },
  };

  const results = [];

  for (const [metricPath, threshold] of Object.entries(thresholds)) {
    const [metricName, statName] = metricPath.split('.');
    const metric = metrics[metricName];

    if (!metric) {
      results.push({
        name: metricPath,
        status: 'skip',
        message: 'Metric not found',
      });
      continue;
    }

    let value;
    if (statName) {
      // Get specific stat (p50, p95, rate, etc.)
      value =
        metric.values?.[statName] ||
        metric.values?.[`p(${statName.replace('p', '')})`];
    } else {
      value = metric.values?.avg || metric.values?.value;
    }

    if (value === undefined) {
      results.push({
        name: metricPath,
        status: 'skip',
        message: 'Value not found',
      });
      continue;
    }

    const displayValue = threshold.multiply ? value * threshold.multiply : value;
    let passed = true;
    let message = '';

    if (threshold.max !== undefined) {
      passed = displayValue <= threshold.max;
      message = `${displayValue.toFixed(2)}${threshold.unit} (max: ${threshold.max}${threshold.unit})`;
    } else if (threshold.min !== undefined) {
      passed = displayValue >= threshold.min;
      message = `${displayValue.toFixed(2)}${threshold.unit} (min: ${threshold.min}${threshold.unit})`;
    }

    results.push({
      name: metricPath,
      status: passed ? 'pass' : 'fail',
      message,
      value: displayValue,
    });
  }

  // Print results
  console.log('┌────────────────────────────────────────────────────────────────┐');
  console.log('│                    K6 THRESHOLD RESULTS                         │');
  console.log('├────────────────────────────────────────────────────────────────┤');

  for (const result of results) {
    const statusIcon =
      result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️ ';

    console.log(`│ ${statusIcon} ${result.name.padEnd(30)} │ ${result.message.padEnd(25)} │`);
  }

  console.log('└────────────────────────────────────────────────────────────────┘');

  // Summary
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  console.log('\n📊 Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);

  if (failed > 0) {
    console.log('\n❌ Threshold check FAILED\n');
    process.exit(1);
  }

  console.log('\n✅ All thresholds passed\n');
}

// Main execution
const summaryFile = process.argv[2];
if (!summaryFile) {
  console.error('Usage: node check-k6-thresholds.js <k6-summary.json>');
  process.exit(1);
}

checkThresholds(summaryFile);
