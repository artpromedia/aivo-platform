// prisma-generate-all.mjs
// Finds every services/*/prisma/schema.prisma and runs prisma generate in parallel batches.
// Usage:
//   node scripts/prisma-generate-all.mjs
//   node scripts/prisma-generate-all.mjs --concurrency 10
//   node scripts/prisma-generate-all.mjs --filter messaging-svc,auth-svc

import { exec } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SERVICES_DIR = path.join(ROOT, 'services');

// ── CLI args ──────────────────────────────────────────────
const args = process.argv.slice(2);
let CONCURRENCY = 6;
let FILTER = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--concurrency' && args[i + 1]) {
    CONCURRENCY = parseInt(args[i + 1], 10) || 6;
    i++;
  }
  if (args[i] === '--filter' && args[i + 1]) {
    FILTER = new Set(args[i + 1].split(',').map(s => s.trim()));
    i++;
  }
}

// ── Colors ────────────────────────────────────────────────
const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ── Discover services with prisma schemas ─────────────────
async function discoverServices() {
  const entries = await readdir(SERVICES_DIR, { withFileTypes: true });
  const services = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (FILTER && !FILTER.has(entry.name)) continue;

    const schemaPath = path.join(SERVICES_DIR, entry.name, 'prisma', 'schema.prisma');
    try {
      await stat(schemaPath);
      services.push({
        name: entry.name,
        dir: path.join(SERVICES_DIR, entry.name),
        schema: schemaPath,
      });
    } catch {
      // no prisma schema — skip
    }
  }

  return services.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Run prisma generate for one service ───────────────────
function generate(svc) {
  return new Promise((resolve) => {
    const start = Date.now();

    // Run prisma via node directly to avoid .bin shim issues on Windows
    const prismaEntry = path.join(svc.dir, 'node_modules', 'prisma', 'build', 'index.js');
    const cmd = `node "${prismaEntry}" generate`;

    exec(cmd, {
      cwd: svc.dir,
      env: { ...process.env },
      timeout: 120_000,
      windowsHide: true,
      shell: true,
    }, (error, stdout, stderr) => {
      const elapsed = Date.now() - start;
      const output = (stdout || '') + (stderr || '');
      const ok = output.includes('Generated Prisma Client');

      resolve({
        name: svc.name,
        ok,
        elapsed,
        error: ok ? null : (error?.message || output.slice(0, 500)),
      });
    });
  });
}

// ── Run in batches ────────────────────────────────────────
async function runBatches(services) {
  const results = [];
  let completed = 0;
  const total = services.length;

  for (let i = 0; i < services.length; i += CONCURRENCY) {
    const batch = services.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(async (svc) => {
      const result = await generate(svc);
      completed++;
      const status = result.ok
        ? c.green('✓')
        : c.red('✗');
      const time = c.dim(`${result.elapsed}ms`);
      const counter = c.dim(`[${String(completed).padStart(2)}/${total}]`);
      console.log(`  ${counter} ${status} ${svc.name} ${time}`);
      return result;
    }));
    results.push(...batchResults);
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log(c.bold('\n🔧 Prisma Generate — All Services\n'));

  const services = await discoverServices();
  if (services.length === 0) {
    console.log(c.yellow('No services with prisma/schema.prisma found.'));
    process.exit(0);
  }

  console.log(`  Found ${c.cyan(services.length)} services with Prisma schemas`);
  console.log(`  Concurrency: ${c.cyan(CONCURRENCY)}\n`);

  const startAll = Date.now();
  const results = await runBatches(services);
  const totalTime = ((Date.now() - startAll) / 1000).toFixed(1);

  // ── Summary ──
  const succeeded = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);

  console.log(c.bold(`\n${'═'.repeat(50)}`));
  console.log(c.bold('  SUMMARY'));
  console.log(c.bold(`${'═'.repeat(50)}`));
  console.log(`  Total:     ${results.length}`);
  console.log(`  ${c.green('Success:')}  ${succeeded.length}`);
  console.log(`  ${c.red('Failed:')}   ${failed.length}`);
  console.log(`  Time:      ${totalTime}s\n`);

  if (failed.length > 0) {
    console.log(c.red('  Failed services:'));
    for (const f of failed) {
      console.log(c.red(`    • ${f.name}`));
      if (f.error) {
        const lines = f.error.split('\n').slice(0, 3).map(l => `      ${c.dim(l)}`);
        console.log(lines.join('\n'));
      }
    }
    console.log('');
    process.exit(1);
  }

  console.log(c.green('  All Prisma clients generated successfully! ✓\n'));
}

main().catch((err) => {
  console.error(c.red(`Fatal: ${err.message}`));
  process.exit(1);
});
