/**
 * Script to check performance budgets
 *
 * Usage: node scripts/check-performance-budgets.js <dist-dir>
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Performance budgets
const budgets = {
  'main-bundle': {
    pattern: /^assets\/js\/index-.*\.js$/,
    maxSize: 250 * 1024,
    warnSize: 200 * 1024,
  },
  'vendor-react': {
    pattern: /^assets\/js\/vendor-react-.*\.js$/,
    maxSize: 150 * 1024,
    warnSize: 120 * 1024,
  },
  'vendor-ui': {
    pattern: /^assets\/js\/vendor-ui-.*\.js$/,
    maxSize: 100 * 1024,
    warnSize: 80 * 1024,
  },
  'total-js': {
    pattern: /\.js$/,
    maxSize: 1024 * 1024,
    warnSize: 800 * 1024,
    aggregate: true,
  },
  'total-css': {
    pattern: /\.css$/,
    maxSize: 150 * 1024,
    warnSize: 100 * 1024,
    aggregate: true,
  },
  'initial-load': {
    pattern: /^assets\/(js\/index|js\/vendor-react|css\/index)/,
    maxSize: 500 * 1024,
    warnSize: 400 * 1024,
    aggregate: true,
  },
};

function getAllFiles(dir, basePath = '') {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, relativePath));
    } else {
      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath);
      const gzipSize = zlib.gzipSync(content).length;
      const brotliSize = zlib.brotliCompressSync(content).length;

      files.push({
        name: relativePath,
        size: stats.size,
        gzipSize,
        brotliSize,
      });
    }
  }

  return files;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function checkBudgets(distDir) {
  console.log('\n📊 Performance Budget Check\n');

  if (!fs.existsSync(distDir)) {
    console.error(`❌ Directory not found: ${distDir}`);
    process.exit(1);
  }

  const files = getAllFiles(distDir);
  const results = [];
  let hasFailure = false;

  for (const [budgetName, budget] of Object.entries(budgets)) {
    const matchingFiles = files.filter((f) => budget.pattern.test(f.name));

    if (matchingFiles.length === 0) {
      continue;
    }

    if (budget.aggregate) {
      const totalSize = matchingFiles.reduce((sum, f) => sum + f.size, 0);
      const totalGzip = matchingFiles.reduce((sum, f) => sum + f.gzipSize, 0);

      const passed = totalSize <= budget.maxSize;
      const warning = totalSize > budget.warnSize;

      results.push({
        name: budgetName,
        size: totalSize,
        gzipSize: totalGzip,
        maxSize: budget.maxSize,
        passed,
        warning,
        files: matchingFiles.length,
      });

      if (!passed) hasFailure = true;
    } else {
      for (const file of matchingFiles) {
        const passed = file.size <= budget.maxSize;
        const warning = file.size > budget.warnSize;

        results.push({
          name: `${budgetName}: ${file.name}`,
          size: file.size,
          gzipSize: file.gzipSize,
          maxSize: budget.maxSize,
          passed,
          warning,
          files: 1,
        });

        if (!passed) hasFailure = true;
      }
    }
  }

  // Print results
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│                    BUDGET CHECK RESULTS                      │');
  console.log('├─────────────────────────────────────────────────────────────┤');

  for (const result of results) {
    const status = result.passed
      ? result.warning
        ? '⚠️ '
        : '✅'
      : '❌';
    const percentage = ((result.size / result.maxSize) * 100).toFixed(1);

    console.log(
      `│ ${status} ${result.name.padEnd(40)} │`
    );
    console.log(
      `│    Size: ${formatBytes(result.size).padEnd(10)} / ${formatBytes(result.maxSize).padEnd(10)} (${percentage}%) │`
    );
    console.log(
      `│    Gzip: ${formatBytes(result.gzipSize).padEnd(10)}                            │`
    );
    console.log('├─────────────────────────────────────────────────────────────┤');
  }

  console.log('└─────────────────────────────────────────────────────────────┘');

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const warningCount = results.filter((r) => r.passed && r.warning).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n📈 Summary:');
  console.log(`   ✅ Passed: ${passedCount - warningCount}`);
  console.log(`   ⚠️  Warnings: ${warningCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);

  if (hasFailure) {
    console.log('\n❌ Budget check FAILED\n');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('\n⚠️  Budget check passed with warnings\n');
  } else {
    console.log('\n✅ All budgets passed\n');
  }
}

// Main execution
const distDir = process.argv[2] || 'dist';
checkBudgets(distDir);
