/**
 * AIVO Platform - Notify Service Seed Data
 *
 * Creates:
 * - Notification templates
 * - Sample notification preferences
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

// Fixed IDs from other services
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🌱 Seeding notify-svc...');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Create Notification Templates
  // ══════════════════════════════════════════════════════════════════════════

  const templates = [
    // Session notifications
    {
      id: '00000000-0000-0000-c000-000000000001',
      code: 'SESSION_COMPLETED',
      name: 'Session Completed',
      category: 'LEARNING',
      channels: ['PUSH', 'IN_APP'],
      titleTemplate: '🎉 Great job, {{learnerName}}!',
      bodyTemplate: 'You completed a {{sessionType}} session and earned {{xpEarned}} XP!',
      defaultEnabled: true,
    },
    {
      id: '00000000-0000-0000-c000-000000000002',
      code: 'STREAK_REMINDER',
      name: 'Streak Reminder',
      category: 'ENGAGEMENT',
      channels: ['PUSH'],
      titleTemplate: '🔥 Keep your streak going!',
      bodyTemplate:
        "You're on a {{streakDays}}-day streak! Complete a session today to keep it going.",
      defaultEnabled: true,
    },
    {
      id: '00000000-0000-0000-c000-000000000003',
      code: 'STREAK_LOST',
      name: 'Streak Lost',
      category: 'ENGAGEMENT',
      channels: ['PUSH', 'IN_APP'],
      titleTemplate: 'Your streak ended',
      bodyTemplate: 'Your {{streakDays}}-day streak ended. Start a new one today!',
      defaultEnabled: true,
    },
    {
      id: '00000000-0000-0000-c000-000000000004',
      code: 'BADGE_EARNED',
      name: 'Badge Earned',
      category: 'ACHIEVEMENT',
      channels: ['PUSH', 'IN_APP'],
      titleTemplate: '🏆 New Badge: {{badgeName}}!',
      bodyTemplate: '{{learnerName}} earned the "{{badgeName}}" badge! {{badgeDescription}}',
      defaultEnabled: true,
    },
    {
      id: '00000000-0000-0000-c000-000000000005',
      code: 'LEVEL_UP',
      name: 'Level Up',
      category: 'ACHIEVEMENT',
      channels: ['PUSH', 'IN_APP'],
      titleTemplate: '⬆️ Level Up!',
      bodyTemplate: '{{learnerName}} reached Level {{newLevel}}! Keep up the great work!',
      defaultEnabled: true,
    },
    // Parent notifications
    {
      id: '00000000-0000-0000-c000-000000000010',
      code: 'PARENT_DAILY_SUMMARY',
      name: 'Daily Progress Summary',
      category: 'PARENT',
      channels: ['EMAIL', 'PUSH'],
      titleTemplate: "📊 {{learnerName}}'s Daily Summary",
      bodyTemplate:
        '{{learnerName}} completed {{sessionsCount}} sessions today, earning {{xpEarned}} XP. Total time: {{totalMinutes}} minutes.',
      defaultEnabled: true,
    },
    {
      id: '00000000-0000-0000-c000-000000000011',
      code: 'PARENT_WEEKLY_SUMMARY',
      name: 'Weekly Progress Summary',
      category: 'PARENT',
      channels: ['EMAIL'],
      titleTemplate: "📈 {{learnerName}}'s Weekly Report",
      bodyTemplate:
        'This week {{learnerName}} completed {{sessionsCount}} sessions, maintained a {{streakDays}}-day streak, and earned {{xpEarned}} XP!',
      defaultEnabled: true,
    },
    {
      id: '00000000-0000-0000-c000-000000000012',
      code: 'PARENT_GOAL_PROGRESS',
      name: 'Goal Progress Update',
      category: 'PARENT',
      channels: ['PUSH', 'IN_APP'],
      titleTemplate: '🎯 Goal Progress',
      bodyTemplate: '{{learnerName}} is {{progressPercent}}% towards their goal: "{{goalTitle}}"',
      defaultEnabled: true,
    },
    // Teacher notifications
    {
      id: '00000000-0000-0000-c000-000000000020',
      code: 'TEACHER_STUDENT_STRUGGLING',
      name: 'Student Struggling Alert',
      category: 'TEACHER',
      channels: ['EMAIL', 'IN_APP'],
      titleTemplate: '⚠️ {{learnerName}} may need support',
      bodyTemplate:
        '{{learnerName}} has shown difficulty with {{skillName}}. Consider reviewing or providing additional support.',
      defaultEnabled: true,
    },
    {
      id: '00000000-0000-0000-c000-000000000021',
      code: 'TEACHER_CLASS_SUMMARY',
      name: 'Class Activity Summary',
      category: 'TEACHER',
      channels: ['EMAIL'],
      titleTemplate: "📊 Today's Class Activity",
      bodyTemplate:
        '{{activeStudents}} of {{totalStudents}} students were active today. Average session time: {{avgMinutes}} minutes.',
      defaultEnabled: true,
    },
    // System notifications
    {
      id: '00000000-0000-0000-c000-000000000030',
      code: 'WELCOME',
      name: 'Welcome Message',
      category: 'SYSTEM',
      channels: ['IN_APP'],
      titleTemplate: '👋 Welcome to AIVO!',
      bodyTemplate:
        "Hi {{userName}}! We're excited to have you. Let's get started with your first lesson!",
      defaultEnabled: true,
    },
    {
      id: '00000000-0000-0000-c000-000000000031',
      code: 'NEW_CONTENT_AVAILABLE',
      name: 'New Content Available',
      category: 'SYSTEM',
      channels: ['PUSH', 'IN_APP'],
      titleTemplate: '✨ New content just dropped!',
      bodyTemplate: 'Check out the new {{contentType}}: "{{contentTitle}}"',
      defaultEnabled: true,
    },
  ];

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: { id: template.id },
      update: {},
      create: {
        ...template,
        tenantId: null, // Global templates
        isActive: true,
      },
    });
    console.log(`  ✅ Created template: ${template.name}`);
  }

  console.log('');
  console.log('✅ notify-svc seeding complete!');
  console.log('');
  console.log(`Created ${templates.length} notification templates across categories:`);
  console.log('  - Learning: session updates');
  console.log('  - Engagement: streaks, achievements');
  console.log('  - Parent: daily/weekly summaries');
  console.log('  - Teacher: student alerts, class summaries');
  console.log('  - System: welcome, new content');
}

try {
  await main();
} catch (e) {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
