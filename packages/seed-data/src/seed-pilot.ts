#!/usr/bin/env node
/**
 * AIVO Platform — Pilot District Database Seeder
 *
 * Seeds all service databases with pilot-scale data.
 * Designed to run against a PostgreSQL instance with all AIVO databases.
 *
 * Usage:
 *   npx tsx packages/seed-data/src/seed-pilot.ts
 *   npx tsx packages/seed-data/src/seed-pilot.ts --dry-run
 *   npx tsx packages/seed-data/src/seed-pilot.ts --database-url postgresql://...
 *
 * Environment:
 *   DATABASE_URL  — PostgreSQL connection string (default: localhost)
 *   DRY_RUN       — Print SQL without executing (default: false)
 */

import { generatePilotData, type PilotData } from './pilot-generator.js';

import { TENANTS, DISTRICT_ADMIN, TEST_PASSWORD_HASH } from './index.js';

// =============================================================================
// DATABASE CONNECTION (lazy-loaded to avoid dependency issues)
// =============================================================================

interface DbClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
  end(): Promise<void>;
}

async function createDbClient(dbName: string): Promise<DbClient> {
  const baseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432';
  const url = `${baseUrl.replace(/\/[^/]*$/, '')}/${dbName}`;

  // Dynamic import to avoid build-time dependency issues
  const pg = await import('pg');
  const Pool = pg.default?.Pool || pg.Pool;
  const pool = new Pool({ connectionString: url, max: 5 });
  return {
    query: (sql: string, params?: unknown[]) => pool.query(sql, params),
    end: () => pool.end(),
  };
}

// =============================================================================
// SQL GENERATORS
// =============================================================================

function escapeStr(s: string): string {
  return s.replace(/'/g, "''");
}

function generateAuthSQL(data: PilotData): string[] {
  const sqls: string[] = [];

  // District admin
  sqls.push(`
    INSERT INTO users (id, email, given_name, family_name, role, tenant_id, password_hash, status, created_at, updated_at)
    VALUES (
      '${DISTRICT_ADMIN.id}',
      '${escapeStr(DISTRICT_ADMIN.email)}',
      '${escapeStr(DISTRICT_ADMIN.givenName)}',
      '${escapeStr(DISTRICT_ADMIN.familyName)}',
      'DISTRICT_ADMIN',
      '${TENANTS.ANOKA_HENNEPIN}',
      '${TEST_PASSWORD_HASH}',
      'ACTIVE',
      NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;
  `);

  // Teachers
  for (const t of data.teachers) {
    sqls.push(`
      INSERT INTO users (id, email, given_name, family_name, role, tenant_id, password_hash, status, created_at, updated_at)
      VALUES (
        '${t.id}',
        '${escapeStr(t.email)}',
        '${escapeStr(t.givenName)}',
        '${escapeStr(t.familyName)}',
        'TEACHER',
        '${TENANTS.ANOKA_HENNEPIN}',
        '${TEST_PASSWORD_HASH}',
        'ACTIVE',
        NOW(), NOW()
      ) ON CONFLICT (id) DO NOTHING;
    `);
  }

  // Parents
  for (const p of data.parents) {
    sqls.push(`
      INSERT INTO users (id, email, given_name, family_name, role, tenant_id, password_hash, status, created_at, updated_at)
      VALUES (
        '${p.id}',
        '${escapeStr(p.email)}',
        '${escapeStr(p.givenName)}',
        '${escapeStr(p.familyName)}',
        'PARENT',
        '${TENANTS.ANOKA_HENNEPIN}',
        '${TEST_PASSWORD_HASH}',
        'ACTIVE',
        NOW(), NOW()
      ) ON CONFLICT (id) DO NOTHING;
    `);
  }

  return sqls;
}

function generateProfileSQL(data: PilotData): string[] {
  const sqls: string[] = [];

  for (const s of data.students) {
    sqls.push(`
      INSERT INTO learner_profiles (id, first_name, last_name, grade, date_of_birth, school_id, parent_id, tenant_id, functioning_level, assessment_type, primary_disability, created_at, updated_at)
      VALUES (
        '${s.id}',
        '${escapeStr(s.firstName)}',
        '${escapeStr(s.lastName)}',
        '${escapeStr(s.grade)}',
        '${s.dateOfBirth}',
        '${s.school}',
        '${s.parentId}',
        '${TENANTS.ANOKA_HENNEPIN}',
        '${s.functioningLevel}',
        '${s.assessmentType}',
        '${escapeStr(s.primaryDisability)}',
        NOW(), NOW()
      ) ON CONFLICT (id) DO NOTHING;
    `);
  }

  return sqls;
}

function generateIEPSQL(data: PilotData): string[] {
  const sqls: string[] = [];

  for (const iep of data.ieps) {
    sqls.push(`
      INSERT INTO ieps (id, learner_id, tenant_id, school_id, case_manager_id, status, start_date, end_date, next_review_date, created_at, updated_at)
      VALUES (
        '${iep.id}',
        '${iep.learnerId}',
        '${iep.tenantId}',
        '${iep.schoolId}',
        '${iep.caseManagerId}',
        '${iep.status}',
        '${iep.startDate}',
        '${iep.endDate}',
        '${iep.nextReviewDate}',
        NOW(), NOW()
      ) ON CONFLICT (id) DO NOTHING;
    `);

    for (const goal of iep.goals) {
      sqls.push(`
        INSERT INTO iep_goals (id, iep_id, goal_number, domain, description, baseline, target_criteria, measurement_method, status, created_at, updated_at)
        VALUES (
          '${goal.id}',
          '${goal.iepId}',
          ${goal.goalNumber},
          '${goal.domain}',
          '${escapeStr(goal.description)}',
          '${escapeStr(goal.baseline)}',
          '${escapeStr(goal.targetCriteria)}',
          '${escapeStr(goal.measurementMethod)}',
          '${goal.status}',
          NOW(), NOW()
        ) ON CONFLICT (id) DO NOTHING;
      `);
    }

    for (const acc of iep.accommodations) {
      sqls.push(`
        INSERT INTO accommodations (id, iep_id, category, name, description, settings, created_at, updated_at)
        VALUES (
          '${acc.id}',
          '${acc.iepId}',
          '${acc.category}',
          '${escapeStr(acc.name)}',
          '${escapeStr(acc.description)}',
          '${JSON.stringify(acc.settings).replace(/'/g, "''")}',
          NOW(), NOW()
        ) ON CONFLICT (id) DO NOTHING;
      `);
    }

    for (const svc of iep.services) {
      sqls.push(`
        INSERT INTO iep_services (id, iep_id, service_type, frequency, duration_minutes, provider_type, created_at, updated_at)
        VALUES (
          '${svc.id}',
          '${svc.iepId}',
          '${svc.serviceType}',
          '${escapeStr(svc.frequency)}',
          ${svc.duration},
          '${escapeStr(svc.providerType)}',
          NOW(), NOW()
        ) ON CONFLICT (id) DO NOTHING;
      `);
    }
  }

  return sqls;
}

function generateTenantSQL(data: PilotData): string[] {
  return [
    `INSERT INTO tenants (id, name, state, nces_id, status, plan, created_at, updated_at)
     VALUES (
       '${data.district.id}',
       '${escapeStr(data.district.name)}',
       '${data.district.state}',
       '${data.district.nces_id}',
       'ACTIVE',
       'PILOT',
       NOW(), NOW()
     ) ON CONFLICT (id) DO NOTHING;`,
    ...data.schools.map(
      (s) => `
      INSERT INTO schools (id, tenant_id, name, address, phone, principal_name, type, created_at, updated_at)
      VALUES (
        '${s.id}',
        '${s.tenantId}',
        '${escapeStr(s.name)}',
        '${escapeStr(s.address)}',
        '${s.phone}',
        '${escapeStr(s.principalName)}',
        '${s.type}',
        NOW(), NOW()
      ) ON CONFLICT (id) DO NOTHING;
    `
    ),
  ];
}

// =============================================================================
// MAIN SEEDER
// =============================================================================

interface SeedResult {
  database: string;
  recordsInserted: number;
  errors: string[];
  durationMs: number;
}

async function seedDatabase(
  dbName: string,
  sqlStatements: string[],
  dryRun: boolean
): Promise<SeedResult> {
  const start = Date.now();
  const result: SeedResult = {
    database: dbName,
    recordsInserted: 0,
    errors: [],
    durationMs: 0,
  };

  if (dryRun) {
    console.log(`\n--- DRY RUN: ${dbName} (${sqlStatements.length} statements) ---`);
    sqlStatements.slice(0, 3).forEach((sql) => {
      console.log(sql.trim().substring(0, 200) + '...');
    });
    console.log(`... and ${sqlStatements.length - 3} more`);
    result.recordsInserted = sqlStatements.length;
    result.durationMs = Date.now() - start;
    return result;
  }

  let client: DbClient | null = null;
  try {
    client = await createDbClient(dbName);

    for (const sql of sqlStatements) {
      try {
        await client.query(sql);
        result.recordsInserted++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('already exists') && !msg.includes('duplicate')) {
          result.errors.push(msg);
        }
      }
    }
  } catch (err: unknown) {
    result.errors.push(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    if (client) await client.end();
  }

  result.durationMs = Date.now() - start;
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AIVO Platform — Pilot District Data Seeder');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${dryRun ? 'DRY RUN (no database writes)' : 'LIVE SEED'}`);
  console.log('');

  // Generate all pilot data
  console.log('Generating pilot data...');
  const data = generatePilotData();

  console.log(`  District:  ${data.district.name}`);
  console.log(`  Schools:   ${data.stats.schools}`);
  console.log(`  Teachers:  ${data.stats.teachers}`);
  console.log(`  Students:  ${data.stats.students}`);
  console.log(`  Parents:   ${data.stats.parents}`);
  console.log(`  IEPs:      ${data.stats.ieps}`);
  console.log(`  Goals:     ${data.stats.totalGoals}`);
  console.log(`  Accommodations: ${data.stats.totalAccommodations}`);
  console.log(`  Services:  ${data.stats.totalServices}`);
  console.log('');

  // Seed each database
  const databases: { name: string; sql: string[] }[] = [
    { name: 'aivo_tenant', sql: generateTenantSQL(data) },
    { name: 'aivo_auth', sql: generateAuthSQL(data) },
    { name: 'aivo_profile', sql: generateProfileSQL(data) },
    { name: 'aivo_iep', sql: generateIEPSQL(data) },
  ];

  const results: SeedResult[] = [];

  for (const db of databases) {
    console.log(`Seeding ${db.name}... (${db.sql.length} records)`);
    const result = await seedDatabase(db.name, db.sql, dryRun);
    results.push(result);

    if (result.errors.length > 0) {
      console.log(`  ⚠️  ${result.errors.length} errors (${result.recordsInserted} succeeded)`);
      result.errors.slice(0, 3).forEach((e) => {
        console.log(`     ${e}`);
      });
    } else {
      console.log(`  ✅ ${result.recordsInserted} records in ${result.durationMs}ms`);
    }
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SEED SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  const totalRecords = results.reduce((sum, r) => sum + r.recordsInserted, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalTime = results.reduce((sum, r) => sum + r.durationMs, 0);

  console.log(`  Total records:  ${totalRecords}`);
  console.log(`  Total errors:   ${totalErrors}`);
  console.log(`  Total time:     ${totalTime}ms`);
  console.log(`  Status:         ${totalErrors === 0 ? '✅ SUCCESS' : '⚠️  PARTIAL'}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (totalErrors > 0 && !dryRun) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
