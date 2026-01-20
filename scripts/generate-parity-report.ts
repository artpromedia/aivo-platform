#!/usr/bin/env tsx
/**
 * AIVO Platform - Feature Parity Report Generator
 * Week 49: Feature Parity Audit
 *
 * Generates a comprehensive parity report comparing expected features
 * against actual implementation status.
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Feature categories and expected features per portal
const FEATURE_MATRIX: Record<string, FeatureCategory[]> = {
  learner: [
    {
      name: 'Onboarding',
      features: [
        'Welcome flow',
        'Profile setup',
        'Grade level selection',
        'Interest selection',
        'Accessibility preferences',
        'Sensory profile',
        'Avatar customization',
      ],
    },
    {
      name: 'Baseline Assessment',
      features: [
        'Initial assessment',
        'Adaptive questioning',
        'Progress indication',
        'Results display',
        'IEP document upload',
      ],
    },
    {
      name: 'Subject Learning',
      features: [
        'Subject selection',
        'Lesson view',
        'Activity completion',
        'Progress tracking',
        'Adaptive difficulty',
        'Multi-sensory content',
      ],
    },
    {
      name: 'AI Brain',
      features: [
        'Personalized recommendations',
        'Learning path generation',
        'Weakness identification',
        'Strength recognition',
        'Intervention suggestions',
      ],
    },
    {
      name: 'Games & Brain Training',
      features: [
        'Game library',
        'Memory games',
        'Focus games',
        'Problem solving games',
        'Reward integration',
        'Progress tracking',
      ],
    },
    {
      name: 'Focus Monitor',
      features: [
        'Attention tracking',
        'Break suggestions',
        'Session analytics',
        'Parent notifications',
      ],
    },
    {
      name: 'Rewards & Gamification',
      features: [
        'Points system',
        'Badges/achievements',
        'Leaderboards',
        'Avatar rewards',
        'Streak tracking',
      ],
    },
    {
      name: 'Accessibility',
      features: [
        'Screen reader support',
        'High contrast mode',
        'Font size adjustment',
        'Color blind modes',
        'Keyboard navigation',
        'Text-to-speech',
      ],
    },
  ],
  parent: [
    {
      name: 'Dashboard',
      features: [
        'Overview widgets',
        'Child selector',
        'Recent activity',
        'AI insights',
        'Quick actions',
      ],
    },
    {
      name: 'Multi-child Management',
      features: [
        'Add child profile',
        'Switch between children',
        'Individual settings per child',
        'Comparison view',
      ],
    },
    {
      name: 'Progress Reports',
      features: [
        'Daily/weekly/monthly views',
        'Subject breakdowns',
        'Goal tracking',
        'Trend analysis',
        'PDF export',
      ],
    },
    {
      name: 'Messaging',
      features: [
        'Teacher communication',
        'Message inbox',
        'Notifications',
        'Reply functionality',
      ],
    },
    {
      name: 'Parental Controls',
      features: [
        'Screen time limits',
        'Content filtering',
        'Session scheduling',
        'Activity restrictions',
      ],
    },
    {
      name: 'Billing & Subscription',
      features: [
        'Plan selection',
        'Payment management',
        'Invoice history',
        'Plan changes',
      ],
    },
    {
      name: 'Caregiver Delegation',
      features: [
        'Invite caregivers',
        'Permission levels',
        'Access management',
        'Activity logging',
      ],
    },
  ],
  teacher: [
    {
      name: 'Dashboard',
      features: [
        'Class overview',
        'Student roster',
        'Recent submissions',
        'Alerts/notifications',
        'Quick stats',
      ],
    },
    {
      name: 'Lesson Builder',
      features: [
        'Lesson creation',
        'Content library',
        'Activity insertion',
        'Preview mode',
        'Assignment scheduling',
      ],
    },
    {
      name: 'Assessment Creator',
      features: [
        'Question types (MC, SA, Essay)',
        'Auto-grading setup',
        'Rubric creation',
        'Assessment assignment',
      ],
    },
    {
      name: 'Student Monitoring',
      features: [
        'Real-time progress',
        'Individual student view',
        'Class analytics',
        'Intervention alerts',
      ],
    },
    {
      name: 'IEP Tracking',
      features: [
        'IEP goal management',
        'Progress documentation',
        'Accommodation tracking',
        'Parent communication',
      ],
    },
    {
      name: 'Communication',
      features: [
        'Parent messaging',
        'Announcements',
        'Progress sharing',
        'Meeting scheduling',
      ],
    },
    {
      name: 'Professional Development',
      features: [
        'Training modules',
        'Certification tracking',
        'Resource library',
        'Collaboration tools',
      ],
    },
  ],
  district: [
    {
      name: 'Multi-school Management',
      features: [
        'School hierarchy view',
        'School settings',
        'Cross-school analytics',
        'Resource allocation',
      ],
    },
    {
      name: 'User Management',
      features: [
        'Bulk user import',
        'Role assignment',
        'Deactivation workflows',
        'Audit logs',
      ],
    },
    {
      name: 'Curriculum Library',
      features: [
        'Curriculum upload',
        'Standard alignment',
        'Distribution management',
        'Version control',
      ],
    },
    {
      name: 'Integrations',
      features: [
        'SSO/SAML configuration',
        'SIS integration',
        'LMS integration',
        'Data export APIs',
      ],
    },
    {
      name: 'Analytics & Reporting',
      features: [
        'District-wide analytics',
        'Compliance reports',
        'Usage statistics',
        'Custom report builder',
      ],
    },
    {
      name: 'Compliance Management',
      features: [
        'FERPA compliance',
        'COPPA consent management',
        'Data retention policies',
        'Audit trails',
      ],
    },
  ],
  'super-admin': [
    {
      name: 'Platform Overview',
      features: [
        'System health dashboard',
        'Tenant metrics',
        'Error monitoring',
        'Performance stats',
      ],
    },
    {
      name: 'Tenant Management',
      features: [
        'Create/manage tenants',
        'Plan assignment',
        'Feature flags',
        'Resource limits',
      ],
    },
    {
      name: 'Content Management',
      features: [
        'Global content library',
        'Content moderation',
        'Template management',
        'Asset management',
      ],
    },
    {
      name: 'System Configuration',
      features: [
        'Global settings',
        'Feature toggles',
        'Integration settings',
        'Maintenance mode',
      ],
    },
    {
      name: 'Support Tools',
      features: [
        'User impersonation',
        'Ticket management',
        'Audit log viewer',
        'Debug tools',
      ],
    },
  ],
};

// Service feature requirements
const SERVICE_MATRIX: Record<string, string[]> = {
  'ai-orchestrator': ['Recommendation engine', 'Learning path', 'Intervention suggestions'],
  'assessment-svc': ['Question bank', 'Adaptive testing', 'Scoring'],
  'brain-engine': ['Cognitive modeling', 'Skill gaps', 'Progress prediction'],
  'grading-engine': ['Auto-grading', 'Rubric evaluation', 'Feedback generation'],
  'auth-svc': ['JWT auth', 'SSO/SAML', 'OIDC', 'MFA'],
  'profile-svc': ['User profiles', 'Preferences', 'Avatar management'],
  'content-svc': ['Content CRUD', 'Version control', 'Asset management'],
  'curriculum-svc': ['Curriculum management', 'Standard alignment', 'Pacing guides'],
  'gamification-svc': ['Points', 'Badges', 'Leaderboards', 'Streaks'],
  'analytics-svc': ['Event tracking', 'Dashboards', 'Reports'],
  'messaging-svc': ['Direct messages', 'Threads', 'Notifications'],
  'billing-svc': ['Subscriptions', 'Invoicing', 'Plan management'],
  'iep-svc': ['IEP management', 'Goal tracking', 'Accommodation plans'],
  'session-svc': ['Session management', 'Activity logging', 'Time tracking'],
  'tenant-svc': ['Multi-tenancy', 'Isolation', 'Configuration'],
  'consent-svc': ['COPPA consent', 'Parental verification', 'Consent audit'],
  'focus-svc': ['Attention tracking', 'Break scheduling', 'Analytics'],
};

interface FeatureCategory {
  name: string;
  features: string[];
}

interface FeatureStatus {
  feature: string;
  status: 'implemented' | 'partial' | 'missing';
  confidence: number;
  evidence?: string;
}

interface CategoryStatus {
  category: string;
  features: FeatureStatus[];
  completionRate: number;
}

interface PortalReport {
  portal: string;
  categories: CategoryStatus[];
  totalFeatures: number;
  implementedFeatures: number;
  partialFeatures: number;
  missingFeatures: number;
  completionRate: number;
}

interface ServiceReport {
  service: string;
  exists: boolean;
  hasDocker: boolean;
  hasPrisma: boolean;
  hasTests: boolean;
  features: FeatureStatus[];
  completionRate: number;
}

interface ParityReport {
  timestamp: string;
  version: string;
  summary: {
    totalPortals: number;
    totalServices: number;
    totalFeatures: number;
    implementedFeatures: number;
    partialFeatures: number;
    missingFeatures: number;
    overallCompletionRate: number;
    portalsReady: number;
    servicesReady: number;
  };
  portals: PortalReport[];
  services: ServiceReport[];
  recommendations: string[];
}

// File search utilities
function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(PROJECT_ROOT, relativePath));
}

function directoryExists(relativePath: string): boolean {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
}

function searchForPattern(searchPath: string, pattern: RegExp): boolean {
  const fullPath = path.join(PROJECT_ROOT, searchPath);
  if (!fs.existsSync(fullPath)) return false;

  try {
    const files = getAllFiles(fullPath, ['.ts', '.tsx', '.js', '.jsx']);
    for (const file of files.slice(0, 100)) {
      // Limit to first 100 files for performance
      try {
        const content = fs.readFileSync(file, 'utf-8');
        if (pattern.test(content)) return true;
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    return false;
  }
  return false;
}

function getAllFiles(dirPath: string, extensions: string[]): string[] {
  const files: string[] = [];

  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      try {
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...getAllFiles(itemPath, extensions));
        } else if (stat.isFile() && extensions.some((ext) => item.endsWith(ext))) {
          files.push(itemPath);
        }
      } catch {
        // Skip inaccessible items
      }
    }
  } catch {
    // Skip inaccessible directories
  }

  return files;
}

// Portal analysis
function analyzePortal(portalName: string, categories: FeatureCategory[]): PortalReport {
  const portalDirMap: Record<string, string> = {
    learner: 'web-learner',
    parent: 'web-parent',
    teacher: 'web-teacher',
    district: 'web-district',
    'super-admin': 'web-platform-admin',
  };

  const portalDir = portalDirMap[portalName] || `web-${portalName}`;
  const portalPath = `apps/${portalDir}`;

  const categoryStatuses: CategoryStatus[] = [];
  let totalImplemented = 0;
  let totalPartial = 0;
  let totalMissing = 0;
  let totalFeatures = 0;

  for (const category of categories) {
    const featureStatuses: FeatureStatus[] = [];
    let categoryImplemented = 0;

    for (const feature of category.features) {
      const status = checkFeatureImplementation(portalPath, feature, category.name);
      featureStatuses.push(status);

      if (status.status === 'implemented') {
        totalImplemented++;
        categoryImplemented++;
      } else if (status.status === 'partial') {
        totalPartial++;
        categoryImplemented += 0.5;
      } else {
        totalMissing++;
      }
      totalFeatures++;
    }

    categoryStatuses.push({
      category: category.name,
      features: featureStatuses,
      completionRate: Math.round((categoryImplemented / category.features.length) * 100),
    });
  }

  return {
    portal: portalName,
    categories: categoryStatuses,
    totalFeatures,
    implementedFeatures: totalImplemented,
    partialFeatures: totalPartial,
    missingFeatures: totalMissing,
    completionRate: Math.round(((totalImplemented + totalPartial * 0.5) / totalFeatures) * 100),
  };
}

// Feature checking logic
function checkFeatureImplementation(
  portalPath: string,
  feature: string,
  category: string
): FeatureStatus {
  const featureSlug = feature.toLowerCase().replace(/[^a-z0-9]/g, '');
  const categorySlug = category.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Check for component
  const componentPaths = [
    `${portalPath}/src/components/${categorySlug}`,
    `${portalPath}/src/components/${featureSlug}`,
    `${portalPath}/src/app/${categorySlug}`,
    `${portalPath}/src/pages/${categorySlug}`,
  ];

  let hasComponent = false;
  let hasPage = false;
  let hasHook = false;

  for (const componentPath of componentPaths) {
    if (directoryExists(componentPath)) {
      hasComponent = true;
      break;
    }
  }

  // Check for page/route
  const pagePaths = [
    `${portalPath}/src/app/${categorySlug}`,
    `${portalPath}/src/pages/${categorySlug}`,
    `${portalPath}/src/app/(dashboard)/${categorySlug}`,
  ];

  for (const pagePath of pagePaths) {
    if (directoryExists(pagePath) || fileExists(`${pagePath}.tsx`)) {
      hasPage = true;
      break;
    }
  }

  // Check for hook
  const hookPaths = [
    `${portalPath}/src/hooks/use${categorySlug}`,
    `${portalPath}/src/hooks/use-${categorySlug}`,
  ];

  for (const hookPath of hookPaths) {
    if (fileExists(`${hookPath}.ts`) || fileExists(`${hookPath}.tsx`)) {
      hasHook = true;
      break;
    }
  }

  // Pattern search for feature keywords
  const featurePattern = new RegExp(featureSlug.slice(0, 8), 'i');
  const hasPatternMatch = searchForPattern(portalPath, featurePattern);

  // Determine status
  let status: 'implemented' | 'partial' | 'missing';
  let confidence: number;
  let evidence: string | undefined;

  if ((hasComponent && hasPage) || (hasPage && hasHook) || (hasComponent && hasPatternMatch)) {
    status = 'implemented';
    confidence = 90;
    evidence = `Found: ${hasComponent ? 'component ' : ''}${hasPage ? 'page ' : ''}${hasHook ? 'hook ' : ''}`;
  } else if (hasComponent || hasPage || hasHook || hasPatternMatch) {
    status = 'partial';
    confidence = 60;
    evidence = `Partially found: ${hasComponent ? 'component ' : ''}${hasPage ? 'page ' : ''}${hasPatternMatch ? 'pattern ' : ''}`;
  } else {
    status = 'missing';
    confidence = 80;
  }

  return { feature, status, confidence, evidence };
}

// Service analysis
function analyzeService(serviceName: string, expectedFeatures: string[]): ServiceReport {
  const servicePath = `services/${serviceName}`;

  const exists = directoryExists(servicePath);
  const hasDocker = fileExists(`${servicePath}/Dockerfile`);
  const hasPrisma = directoryExists(`${servicePath}/prisma`);
  const hasTests =
    directoryExists(`${servicePath}/test`) ||
    directoryExists(`${servicePath}/__tests__`) ||
    directoryExists(`${servicePath}/tests`);

  const featureStatuses: FeatureStatus[] = [];
  let implementedCount = 0;

  for (const feature of expectedFeatures) {
    const featureSlug = feature.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pattern = new RegExp(featureSlug.slice(0, 6), 'i');

    let status: 'implemented' | 'partial' | 'missing' = 'missing';
    let confidence = 70;

    if (exists) {
      const hasPattern = searchForPattern(servicePath, pattern);
      if (hasPattern) {
        status = 'implemented';
        confidence = 85;
        implementedCount++;
      } else {
        status = 'partial';
        confidence = 50;
        implementedCount += 0.5;
      }
    }

    featureStatuses.push({ feature, status, confidence });
  }

  return {
    service: serviceName,
    exists,
    hasDocker,
    hasPrisma,
    hasTests,
    features: featureStatuses,
    completionRate: exists
      ? Math.round((implementedCount / expectedFeatures.length) * 100)
      : 0,
  };
}

// Main report generation
async function generateReport(): Promise<ParityReport> {
  console.log('Generating Feature Parity Report...\n');

  const portals: PortalReport[] = [];
  const services: ServiceReport[] = [];
  const recommendations: string[] = [];

  // Analyze portals
  console.log('Analyzing portals...');
  for (const [portalName, categories] of Object.entries(FEATURE_MATRIX)) {
    console.log(`  - ${portalName}`);
    const portalReport = analyzePortal(portalName, categories);
    portals.push(portalReport);

    if (portalReport.completionRate < 80) {
      recommendations.push(
        `${portalName} portal at ${portalReport.completionRate}% - needs attention`
      );
    }
  }

  // Analyze services
  console.log('\nAnalyzing services...');
  for (const [serviceName, features] of Object.entries(SERVICE_MATRIX)) {
    console.log(`  - ${serviceName}`);
    const serviceReport = analyzeService(serviceName, features);
    services.push(serviceReport);

    if (!serviceReport.exists) {
      recommendations.push(`${serviceName} service is missing`);
    } else if (serviceReport.completionRate < 70) {
      recommendations.push(
        `${serviceName} service at ${serviceReport.completionRate}% - needs attention`
      );
    }
  }

  // Calculate summary
  const totalPortalFeatures = portals.reduce((sum, p) => sum + p.totalFeatures, 0);
  const totalPortalImplemented = portals.reduce((sum, p) => sum + p.implementedFeatures, 0);
  const totalPortalPartial = portals.reduce((sum, p) => sum + p.partialFeatures, 0);
  const totalPortalMissing = portals.reduce((sum, p) => sum + p.missingFeatures, 0);

  const totalServiceFeatures = services.reduce((sum, s) => sum + s.features.length, 0);
  const totalServiceImplemented = services.reduce(
    (sum, s) => sum + s.features.filter((f) => f.status === 'implemented').length,
    0
  );
  const totalServicePartial = services.reduce(
    (sum, s) => sum + s.features.filter((f) => f.status === 'partial').length,
    0
  );
  const totalServiceMissing = services.reduce(
    (sum, s) => sum + s.features.filter((f) => f.status === 'missing').length,
    0
  );

  const totalFeatures = totalPortalFeatures + totalServiceFeatures;
  const totalImplemented = totalPortalImplemented + totalServiceImplemented;
  const totalPartial = totalPortalPartial + totalServicePartial;
  const totalMissing = totalPortalMissing + totalServiceMissing;

  const report: ParityReport = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    summary: {
      totalPortals: portals.length,
      totalServices: services.length,
      totalFeatures,
      implementedFeatures: totalImplemented,
      partialFeatures: totalPartial,
      missingFeatures: totalMissing,
      overallCompletionRate: Math.round(
        ((totalImplemented + totalPartial * 0.5) / totalFeatures) * 100
      ),
      portalsReady: portals.filter((p) => p.completionRate >= 80).length,
      servicesReady: services.filter((s) => s.exists && s.completionRate >= 70).length,
    },
    portals,
    services,
    recommendations,
  };

  return report;
}

// Generate markdown report
function generateMarkdownReport(report: ParityReport): string {
  let md = '# AIVO Platform - Feature Parity Report\n\n';
  md += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n\n`;
  md += `**Version:** ${report.version}\n\n`;

  // Summary
  md += '## Executive Summary\n\n';
  md += '| Metric | Value |\n';
  md += '|--------|-------|\n';
  md += `| Total Features | ${report.summary.totalFeatures} |\n`;
  md += `| Implemented | ${report.summary.implementedFeatures} |\n`;
  md += `| Partial | ${report.summary.partialFeatures} |\n`;
  md += `| Missing | ${report.summary.missingFeatures} |\n`;
  md += `| **Overall Completion** | **${report.summary.overallCompletionRate}%** |\n`;
  md += `| Portals Ready (≥80%) | ${report.summary.portalsReady}/${report.summary.totalPortals} |\n`;
  md += `| Services Ready (≥70%) | ${report.summary.servicesReady}/${report.summary.totalServices} |\n\n`;

  // Portal completion chart (text-based)
  md += '### Portal Completion\n\n';
  md += '```\n';
  for (const portal of report.portals) {
    const bar = '█'.repeat(Math.floor(portal.completionRate / 5));
    const empty = '░'.repeat(20 - Math.floor(portal.completionRate / 5));
    md += `${portal.portal.padEnd(15)} [${bar}${empty}] ${portal.completionRate}%\n`;
  }
  md += '```\n\n';

  // Portal details
  md += '## Portal Details\n\n';
  for (const portal of report.portals) {
    const icon = portal.completionRate >= 80 ? '✅' : portal.completionRate >= 50 ? '🔶' : '❌';
    md += `### ${icon} ${portal.portal.charAt(0).toUpperCase() + portal.portal.slice(1)} Portal (${portal.completionRate}%)\n\n`;

    for (const category of portal.categories) {
      md += `#### ${category.category} (${category.completionRate}%)\n\n`;
      md += '| Feature | Status |\n';
      md += '|---------|--------|\n';

      for (const feature of category.features) {
        const statusIcon =
          feature.status === 'implemented' ? '✅' : feature.status === 'partial' ? '🔶' : '❌';
        md += `| ${feature.feature} | ${statusIcon} ${feature.status} |\n`;
      }
      md += '\n';
    }
  }

  // Service details
  md += '## Service Details\n\n';
  md += '| Service | Exists | Docker | Prisma | Tests | Completion |\n';
  md += '|---------|--------|--------|--------|-------|------------|\n';

  for (const service of report.services) {
    const existsIcon = service.exists ? '✅' : '❌';
    const dockerIcon = service.hasDocker ? '✅' : '❌';
    const prismaIcon = service.hasPrisma ? '✅' : '➖';
    const testsIcon = service.hasTests ? '✅' : '❌';
    md += `| ${service.service} | ${existsIcon} | ${dockerIcon} | ${prismaIcon} | ${testsIcon} | ${service.completionRate}% |\n`;
  }
  md += '\n';

  // Recommendations
  if (report.recommendations.length > 0) {
    md += '## Recommendations\n\n';
    for (const rec of report.recommendations) {
      md += `- ⚠️ ${rec}\n`;
    }
    md += '\n';
  }

  // Deployment readiness
  md += '## Deployment Readiness\n\n';
  const isReady =
    report.summary.overallCompletionRate >= 80 &&
    report.summary.portalsReady >= 4 &&
    report.summary.servicesReady >= 12;

  if (isReady) {
    md += '### ✅ READY FOR PRODUCTION DEPLOYMENT\n\n';
    md += 'All critical requirements have been met.\n';
  } else {
    md += '### ❌ NOT READY FOR PRODUCTION DEPLOYMENT\n\n';
    md += 'The following criteria must be met:\n\n';
    if (report.summary.overallCompletionRate < 80) {
      md += `- [ ] Overall completion must be ≥80% (currently ${report.summary.overallCompletionRate}%)\n`;
    }
    if (report.summary.portalsReady < 4) {
      md += `- [ ] At least 4 portals must be ≥80% complete (currently ${report.summary.portalsReady})\n`;
    }
    if (report.summary.servicesReady < 12) {
      md += `- [ ] At least 12 services must be ≥70% complete (currently ${report.summary.servicesReady})\n`;
    }
  }

  return md;
}

// Main execution
async function main() {
  try {
    const report = await generateReport();

    // Write JSON report
    const jsonPath = path.join(PROJECT_ROOT, 'PARITY_REPORT.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ JSON report saved to: ${jsonPath}`);

    // Write Markdown report
    const markdownReport = generateMarkdownReport(report);
    const mdPath = path.join(PROJECT_ROOT, 'PARITY_REPORT.md');
    fs.writeFileSync(mdPath, markdownReport);
    console.log(`✅ Markdown report saved to: ${mdPath}`);

    // Summary
    console.log('\n========================================');
    console.log('  PARITY REPORT SUMMARY');
    console.log('========================================\n');
    console.log(`Total Features: ${report.summary.totalFeatures}`);
    console.log(`Implemented: ${report.summary.implementedFeatures}`);
    console.log(`Partial: ${report.summary.partialFeatures}`);
    console.log(`Missing: ${report.summary.missingFeatures}`);
    console.log(`\nOverall Completion: ${report.summary.overallCompletionRate}%`);
    console.log(`Portals Ready: ${report.summary.portalsReady}/${report.summary.totalPortals}`);
    console.log(`Services Ready: ${report.summary.servicesReady}/${report.summary.totalServices}`);

    if (report.summary.overallCompletionRate >= 80) {
      console.log('\n✅ PARITY CHECK PASSED');
      process.exit(0);
    } else {
      console.log('\n⚠️  PARITY CHECK NEEDS ATTENTION');
      process.exit(0); // Don't fail, just warn
    }
  } catch (error) {
    console.error('Error generating parity report:', error);
    process.exit(1);
  }
}

main();
