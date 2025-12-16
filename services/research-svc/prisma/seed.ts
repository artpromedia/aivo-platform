/**
 * AIVO Platform - Research Service Seed Data
 *
 * Creates:
 * - Research projects (internal eval, external research)
 * - Data use agreements
 * - Research cohorts
 * - Dataset definitions
 * - Sample export jobs
 * - Access grants
 */

import {
  PrismaClient,
  ProjectType,
  ProjectStatus,
  DUAStatus,
  DatasetGranularity,
  ExportJobStatus,
  ExportFormat,
  AccessGrantScope,
  AccessGrantStatus,
  AuditAction,
} from '@prisma/client';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_USER_ID = '00000000-0000-0000-1000-000000000001';

// Research project IDs
const INTERNAL_EVAL_PROJECT = '00000000-0000-0000-re00-000000000001';
const ACADEMIC_RESEARCH_PROJECT = '00000000-0000-0000-re00-000000000002';

// Cohort IDs
const GRADE3_MATH_COHORT = '00000000-0000-0000-re10-000000000001';
const SEL_INTERVENTION_COHORT = '00000000-0000-0000-re10-000000000002';

// Dataset definition IDs
const SESSION_METRICS_DATASET = '00000000-0000-0000-re20-000000000001';
const SKILL_PROGRESS_DATASET = '00000000-0000-0000-re20-000000000002';

async function main() {
  console.log('🌱 Seeding research-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Research Projects
  // ══════════════════════════════════════════════════════════════════════════

  const projects = [
    {
      id: INTERNAL_EVAL_PROJECT,
      tenantId: DEV_TENANT_ID,
      title: 'Q1 2024 Math Intervention Effectiveness Study',
      description: 'Internal program evaluation to measure the impact of AIVO adaptive learning on 3rd grade math proficiency in Title I schools.',
      type: ProjectType.INTERNAL_EVAL,
      status: ProjectStatus.APPROVED,
      piName: 'Dr. Sarah Assessment',
      piEmail: 'sassessment@district.edu',
      piAffiliation: 'District Assessment Office',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
      createdByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      approvedAt: new Date('2023-12-15'),
    },
    {
      id: ACADEMIC_RESEARCH_PROJECT,
      tenantId: DEV_TENANT_ID,
      title: 'Adaptive Learning and Executive Function Development in Neurodiverse Learners',
      description: 'IRB-approved academic study examining how personalized pacing affects executive function development in students with ADHD and autism.',
      type: ProjectType.EXTERNAL_RESEARCH,
      status: ProjectStatus.APPROVED,
      piName: 'Dr. Maya Researcher',
      piEmail: 'mresearcher@university.edu',
      piAffiliation: 'State University School of Education',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2025-12-31'),
      irbProtocolId: 'IRB-2024-0123',
      irbExpiryDate: new Date('2025-12-31'),
      createdByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      approvedAt: new Date('2024-01-20'),
    },
  ];

  for (const project of projects) {
    await prisma.researchProject.upsert({
      where: { id: project.id },
      update: {},
      create: project,
    });
  }
  console.log(`  ✅ Created ${projects.length} research projects`);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Create Data Use Agreements
  // ══════════════════════════════════════════════════════════════════════════

  const duas = [
    {
      id: '00000000-0000-0000-re01-000000000001',
      tenantId: DEV_TENANT_ID,
      researchProjectId: INTERNAL_EVAL_PROJECT,
      version: 1,
      title: 'Internal Evaluation Data Use Agreement',
      agreementText: 'This agreement governs the use of de-identified learner data for internal program evaluation purposes...',
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: new Date('2024-06-30'),
      status: DUAStatus.ACTIVE,
      allowedDataTypes: ['session_metrics', 'skill_progress', 'engagement_aggregates'],
      retentionDays: 365,
      allowDerivatives: false,
      allowPublication: false,
    },
    {
      id: '00000000-0000-0000-re01-000000000002',
      tenantId: DEV_TENANT_ID,
      researchProjectId: ACADEMIC_RESEARCH_PROJECT,
      version: 1,
      title: 'Academic Research Data Use Agreement',
      agreementText: 'This agreement governs the use of de-identified learner data for academic research purposes per IRB protocol IRB-2024-0123...',
      documentUrl: 'https://storage.aivo.dev/dua/irb-2024-0123-dua.pdf',
      effectiveFrom: new Date('2024-02-01'),
      effectiveTo: new Date('2025-12-31'),
      status: DUAStatus.ACTIVE,
      allowedDataTypes: ['session_metrics', 'skill_progress', 'focus_events', 'sel_indicators'],
      retentionDays: 730, // 2 years
      allowDerivatives: true,
      allowPublication: true,
    },
  ];

  for (const dua of duas) {
    await prisma.dataUseAgreement.upsert({
      where: { id: dua.id },
      update: {},
      create: dua,
    });
  }
  console.log(`  ✅ Created ${duas.length} data use agreements`);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Create Research Cohorts
  // ══════════════════════════════════════════════════════════════════════════

  const cohorts = [
    {
      id: GRADE3_MATH_COHORT,
      tenantId: DEV_TENANT_ID,
      researchProjectId: INTERNAL_EVAL_PROJECT,
      name: 'Grade 3 Math Intervention Cohort',
      description: '3rd grade students in Title I schools receiving math intervention',
      filterJson: {
        gradeBands: ['K5'],
        gradeLevel: '3',
        subjects: ['MATH'],
        schoolTags: ['title_i'],
        interventionStatus: 'active',
      },
      estimatedLearnerCount: 245,
      estimatedAt: new Date(),
    },
    {
      id: SEL_INTERVENTION_COHORT,
      tenantId: DEV_TENANT_ID,
      researchProjectId: ACADEMIC_RESEARCH_PROJECT,
      name: 'SEL + Neurodiverse Cohort',
      description: 'Students with ADHD or autism receiving SEL curriculum with consent for research',
      filterJson: {
        profileTags: ['adhd', 'autism'],
        hasResearchConsent: true,
        consentPurpose: 'academic_research',
        subjects: ['SEL'],
      },
      estimatedLearnerCount: 87,
      estimatedAt: new Date(),
    },
  ];

  for (const cohort of cohorts) {
    await prisma.researchCohort.upsert({
      where: { id: cohort.id },
      update: {},
      create: cohort,
    });
  }
  console.log(`  ✅ Created ${cohorts.length} research cohorts`);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Create Dataset Definitions
  // ══════════════════════════════════════════════════════════════════════════

  const datasetDefinitions = [
    {
      id: SESSION_METRICS_DATASET,
      tenantId: DEV_TENANT_ID,
      researchProjectId: INTERNAL_EVAL_PROJECT,
      name: 'Session Metrics - Aggregated Weekly',
      description: 'Weekly aggregated session metrics per learner pseudoID',
      granularity: DatasetGranularity.DEIDENTIFIED_LEARNER_LEVEL,
      schemaJson: {
        factTables: ['sessions'],
        dimensions: ['grade_level', 'subject', 'week'],
        metrics: [
          'session_count',
          'total_duration_minutes',
          'avg_correct_rate',
          'items_attempted',
          'items_correct',
        ],
      },
      privacyConstraintsJson: {
        minCellSize: 5,
        pseudonymization: 'hmac_sha256',
        dateCoarsening: 'week',
        excludeColumns: ['exact_timestamp', 'device_id', 'ip_address'],
      },
      isTemplate: true,
    },
    {
      id: SKILL_PROGRESS_DATASET,
      tenantId: DEV_TENANT_ID,
      researchProjectId: ACADEMIC_RESEARCH_PROJECT,
      name: 'Skill Mastery Trajectories',
      description: 'Skill progression data with focus indicators for executive function research',
      granularity: DatasetGranularity.DEIDENTIFIED_LEARNER_LEVEL,
      schemaJson: {
        factTables: ['skill_states', 'focus_events'],
        dimensions: ['skill_category', 'month', 'profile_tag'],
        metrics: [
          'mastery_level_start',
          'mastery_level_end',
          'time_to_mastery_days',
          'avg_focus_duration',
          'break_frequency',
        ],
      },
      privacyConstraintsJson: {
        minCellSize: 10,
        pseudonymization: 'k_anonymity_5',
        dateCoarsening: 'month',
        maxDimensions: 3,
        excludeColumns: ['learner_name', 'email', 'school_name'],
      },
      isTemplate: false,
    },
  ];

  for (const dataset of datasetDefinitions) {
    await prisma.researchDatasetDefinition.upsert({
      where: { id: dataset.id },
      update: {},
      create: dataset,
    });
  }
  console.log(`  ✅ Created ${datasetDefinitions.length} dataset definitions`);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Create Export Jobs
  // ══════════════════════════════════════════════════════════════════════════

  const exportJobs = [
    {
      id: '00000000-0000-0000-re30-000000000001',
      tenantId: DEV_TENANT_ID,
      researchProjectId: INTERNAL_EVAL_PROJECT,
      datasetDefinitionId: SESSION_METRICS_DATASET,
      cohortId: GRADE3_MATH_COHORT,
      requestedByUserId: ADMIN_USER_ID,
      status: ExportJobStatus.SUCCEEDED,
      format: ExportFormat.CSV,
      dateRangeFrom: new Date('2024-01-01'),
      dateRangeTo: new Date('2024-01-31'),
      startedAt: new Date('2024-02-01T10:00:00Z'),
      completedAt: new Date('2024-02-01T10:05:32Z'),
      rowCount: 4890,
      fileSizeBytes: BigInt(524288),
    },
    {
      id: '00000000-0000-0000-re30-000000000002',
      tenantId: DEV_TENANT_ID,
      researchProjectId: ACADEMIC_RESEARCH_PROJECT,
      datasetDefinitionId: SKILL_PROGRESS_DATASET,
      cohortId: SEL_INTERVENTION_COHORT,
      requestedByUserId: ADMIN_USER_ID,
      status: ExportJobStatus.RUNNING,
      format: ExportFormat.PARQUET,
      dateRangeFrom: new Date('2024-02-01'),
      dateRangeTo: new Date('2024-03-31'),
      startedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
    },
  ];

  for (const job of exportJobs) {
    await prisma.researchExportJob.upsert({
      where: { id: job.id },
      update: {},
      create: job,
    });
  }
  console.log(`  ✅ Created ${exportJobs.length} export jobs`);

  // ══════════════════════════════════════════════════════════════════════════
  // 6. Create Access Grants
  // ══════════════════════════════════════════════════════════════════════════

  const accessGrants = [
    {
      id: '00000000-0000-0000-re40-000000000001',
      tenantId: DEV_TENANT_ID,
      researchProjectId: INTERNAL_EVAL_PROJECT,
      userId: ADMIN_USER_ID,
      scope: AccessGrantScope.DEIDENTIFIED_LEARNER_LEVEL,
      status: AccessGrantStatus.ACTIVE,
      grantedByUserId: ADMIN_USER_ID,
      grantedAt: new Date('2024-01-01'),
      expiresAt: new Date('2024-06-30'),
    },
    {
      id: '00000000-0000-0000-re40-000000000002',
      tenantId: DEV_TENANT_ID,
      researchProjectId: ACADEMIC_RESEARCH_PROJECT,
      userId: ADMIN_USER_ID,
      scope: AccessGrantScope.DEIDENTIFIED_LEARNER_LEVEL,
      status: AccessGrantStatus.ACTIVE,
      grantedByUserId: ADMIN_USER_ID,
      grantedAt: new Date('2024-02-01'),
      expiresAt: new Date('2025-12-31'),
    },
  ];

  for (const grant of accessGrants) {
    await prisma.researchAccessGrant.upsert({
      where: { id: grant.id },
      update: {},
      create: grant,
    });
  }
  console.log(`  ✅ Created ${accessGrants.length} access grants`);

  // ══════════════════════════════════════════════════════════════════════════
  // 7. Create Audit Logs
  // ══════════════════════════════════════════════════════════════════════════

  const auditLogs = [
    {
      id: '00000000-0000-0000-re50-000000000001',
      tenantId: DEV_TENANT_ID,
      researchProjectId: INTERNAL_EVAL_PROJECT,
      action: AuditAction.PROJECT_CREATED,
      userId: ADMIN_USER_ID,
      details: { title: 'Q1 2024 Math Intervention Effectiveness Study' },
      createdAt: new Date('2023-12-10'),
    },
    {
      id: '00000000-0000-0000-re50-000000000002',
      tenantId: DEV_TENANT_ID,
      researchProjectId: INTERNAL_EVAL_PROJECT,
      action: AuditAction.PROJECT_APPROVED,
      userId: ADMIN_USER_ID,
      details: { approvalNotes: 'Internal eval - standard approval process' },
      createdAt: new Date('2023-12-15'),
    },
    {
      id: '00000000-0000-0000-re50-000000000003',
      tenantId: DEV_TENANT_ID,
      researchProjectId: INTERNAL_EVAL_PROJECT,
      action: AuditAction.EXPORT_COMPLETED,
      userId: ADMIN_USER_ID,
      details: { exportJobId: '00000000-0000-0000-re30-000000000001', rowCount: 4890, format: 'CSV' },
      createdAt: new Date('2024-02-01T10:05:32Z'),
    },
    {
      id: '00000000-0000-0000-re50-000000000004',
      tenantId: DEV_TENANT_ID,
      researchProjectId: ACADEMIC_RESEARCH_PROJECT,
      action: AuditAction.DUA_ACCEPTED,
      userId: ADMIN_USER_ID,
      details: { duaId: '00000000-0000-0000-re01-000000000002', version: 1 },
      createdAt: new Date('2024-01-25'),
    },
  ];

  for (const log of auditLogs) {
    await prisma.researchAuditLog.upsert({
      where: { id: log.id },
      update: {},
      create: log,
    });
  }
  console.log(`  ✅ Created ${auditLogs.length} audit logs`);

  console.log('');
  console.log('✅ research-svc seeding complete!');
  console.log('');
  console.log('Created:');
  console.log('  - 2 research projects (internal eval, academic research)');
  console.log('  - 2 data use agreements');
  console.log('  - 2 research cohorts');
  console.log('  - 2 dataset definitions');
  console.log('  - 2 export jobs (1 completed, 1 running)');
  console.log('  - 2 access grants');
  console.log('  - 4 audit logs');
  console.log('');
  console.log('Demonstrates:');
  console.log('  - FERPA/COPPA compliant research data governance');
  console.log('  - IRB integration for external research');
  console.log('  - Privacy-preserving export with k-anonymity');
  console.log('  - Complete audit trail for data access');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
