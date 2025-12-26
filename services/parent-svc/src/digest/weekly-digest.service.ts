/**
 * Weekly Digest Service
 *
 * Generates and sends personalized weekly progress summaries to parents
 * in their preferred language.
 */

import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { logger, metrics } from '@aivo/ts-observability';
import { PrismaService } from '../prisma/prisma.service.js';
import { I18nService } from '../i18n/i18n.service.js';
import { EmailService } from '../email/email.service.js';
import { ParentService } from '../parent/parent.service.js';
import { config } from '../config.js';
import { DigestFrequency } from '../parent/parent.types.js';

interface DigestContent {
  parentName: string;
  language: string;
  children: ChildDigest[];
  weekRange: { start: Date; end: Date };
}

interface ChildDigest {
  studentName: string;
  photoUrl?: string | null;
  summary: {
    totalMinutes: number;
    lessonsCompleted: number;
    averageScore: number;
    achievementsEarned: number;
    daysActive: number;
  };
  comparison: {
    minutesChange: number;
    trend: 'up' | 'down' | 'stable';
  };
  highlights: string[];
  topSubjects: Array<{ subject: string; minutes: number }>;
  achievements: Array<{ name: string; iconUrl?: string | null }>;
  teacherNotes: Array<{ content: string; teacherName: string }>;
  upcomingAssignments: Array<{ title: string; dueDate: Date }>;
}

@Injectable()
export class WeeklyDigestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly email: EmailService,
    private readonly parentService: ParentService,
  ) {}

  /**
   * Send weekly digests every Sunday at 6 PM (user's timezone)
   */
  @Cron('0 18 * * 0') // Sunday at 6 PM UTC
  async sendWeeklyDigests(): Promise<void> {
    logger.info('Starting weekly digest job');
    const startTime = Date.now();

    try {
      // Get all active parents who want weekly digests
      const parents = await this.prisma.parent.findMany({
        where: {
          status: 'active',
          digestFrequency: DigestFrequency.WEEKLY,
          emailVerified: true,
        },
        include: {
          studentLinks: {
            where: { status: 'active' },
            include: {
              student: true,
            },
          },
        },
      });

      let sent = 0;
      let failed = 0;

      for (const parent of parents) {
        try {
          // Check if it's the right time for this parent's timezone
          if (!this.isCorrectTimeForTimezone(parent.timezone)) {
            continue;
          }

          await this.generateAndSendDigest(parent);
          sent++;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          logger.error('Failed to send digest to parent', {
            parentId: parent.id,
            error: message,
          });
          failed++;
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Weekly digest job completed', { sent, failed, duration });
      metrics.histogram('digest.weekly.duration_ms', duration);
      metrics.increment('digest.weekly.sent', { count: String(sent) });
      metrics.increment('digest.weekly.failed', { count: String(failed) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Weekly digest job failed', { error: message });
      metrics.increment('digest.weekly.job_failed');
    }
  }

  /**
   * Generate and send digest for a single parent (can be called manually)
   */
  async generateAndSendDigest(parent: {
    id: string;
    email: string;
    givenName: string;
    language: string;
    studentLinks: Array<{ student: { id: string } }>;
  }): Promise<void> {
    const weekRange = this.getWeekRange();

    const childDigests: ChildDigest[] = [];

    for (const link of parent.studentLinks) {
      const digest = await this.generateChildDigest(link.student.id, weekRange);
      if (digest) {
        childDigests.push(digest);
      }
    }

    if (childDigests.length === 0) {
      // No activity to report
      return;
    }

    const content: DigestContent = {
      parentName: parent.givenName,
      language: parent.language,
      children: childDigests,
      weekRange,
    };

    // Generate email HTML
    const html = await this.renderDigestEmail(content);
    const subject = this.i18n.t('digest.weekly.subject', parent.language, {
      weekStart: this.formatDate(weekRange.start, parent.language),
    });

    // Send email
    await this.email.send({
      to: parent.email,
      subject,
      html,
      tags: ['weekly-digest'],
    });

    // Record digest sent
    await this.prisma.digestLog.create({
      data: {
        parentId: parent.id,
        type: 'weekly',
        sentAt: new Date(),
        childrenIncluded: childDigests.map((c) => c.studentName),
      },
    });
  }

  /**
   * Generate digest content for a single child
   */
  private async generateChildDigest(
    studentId: string,
    weekRange: { start: Date; end: Date }
  ): Promise<ChildDigest | null> {
    const student = await this.prisma.profile.findUnique({
      where: { id: studentId },
      select: { givenName: true, familyName: true, photoUrl: true },
    });

    if (!student) return null;

    // Get sessions for this week
    const sessions = await this.prisma.learningSession.findMany({
      where: {
        studentId,
        startedAt: { gte: weekRange.start, lte: weekRange.end },
      },
      include: {
        lesson: { select: { title: true, subject: true } },
      },
    });

    // Get previous week for comparison
    const previousWeekStart = new Date(weekRange.start);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousSessions = await this.prisma.learningSession.findMany({
      where: {
        studentId,
        startedAt: { gte: previousWeekStart, lt: weekRange.start },
      },
    });

    // Calculate stats
    const totalMinutes = sessions.reduce(
      (sum, s) => sum + Math.round((s.timeSpentSeconds || 0) / 60),
      0
    );
    const previousMinutes = previousSessions.reduce(
      (sum, s) => sum + Math.round((s.timeSpentSeconds || 0) / 60),
      0
    );
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    const averageScore =
      completedSessions.length > 0
        ? Math.round(
            completedSessions.reduce((sum, s) => sum + (s.score || 0), 0) /
              completedSessions.length
          )
        : 0;

    // Get achievements
    const achievements = await this.prisma.achievement.findMany({
      where: {
        studentId,
        earnedAt: { gte: weekRange.start, lte: weekRange.end },
      },
      take: 5,
    });

    // Get teacher notes
    const teacherNotes = await this.prisma.teacherNote.findMany({
      where: {
        studentId,
        createdAt: { gte: weekRange.start, lte: weekRange.end },
        visibleToParent: true,
      },
      include: {
        teacher: { select: { givenName: true, familyName: true } },
      },
      take: 3,
    });

    // Get upcoming assignments
    const upcomingAssignments = await this.prisma.assignment.findMany({
      where: {
        class: {
          enrollments: {
            some: { profileId: studentId, status: 'active' },
          },
        },
        dueAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        status: 'active',
      },
      select: { title: true, dueAt: true },
      take: 5,
      orderBy: { dueAt: 'asc' },
    });

    // Calculate top subjects
    const subjectMinutes = new Map<string, number>();
    for (const session of sessions) {
      const subject = session.lesson.subject || 'Other';
      subjectMinutes.set(
        subject,
        (subjectMinutes.get(subject) || 0) + Math.round((session.timeSpentSeconds || 0) / 60)
      );
    }
    const topSubjects = Array.from(subjectMinutes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([subject, minutes]) => ({ subject, minutes }));

    // Generate highlights
    const highlights = this.generateHighlights({
      totalMinutes,
      previousMinutes,
      completedSessions: completedSessions.length,
      averageScore,
      achievementsCount: achievements.length,
      daysActive: new Set(sessions.map((s) => s.startedAt.toISOString().split('T')[0])).size,
    });

    // Skip if no activity
    if (totalMinutes === 0 && achievements.length === 0) {
      return null;
    }

    return {
      studentName: `${student.givenName} ${student.familyName}`,
      photoUrl: student.photoUrl,
      summary: {
        totalMinutes,
        lessonsCompleted: completedSessions.length,
        averageScore,
        achievementsEarned: achievements.length,
        daysActive: new Set(sessions.map((s) => s.startedAt.toISOString().split('T')[0])).size,
      },
      comparison: {
        minutesChange: totalMinutes - previousMinutes,
        trend:
          totalMinutes > previousMinutes
            ? 'up'
            : totalMinutes < previousMinutes
              ? 'down'
              : 'stable',
      },
      highlights,
      topSubjects,
      achievements: achievements.map((a) => ({
        name: a.name,
        iconUrl: a.iconUrl,
      })),
      teacherNotes: teacherNotes.map((n) => ({
        content: n.content,
        teacherName: `${n.teacher.givenName} ${n.teacher.familyName}`,
      })),
      upcomingAssignments: upcomingAssignments.map((a) => ({
        title: a.title,
        dueDate: a.dueAt,
      })),
    };
  }

  /**
   * Generate personalized highlights based on activity
   */
  private generateHighlights(data: {
    totalMinutes: number;
    previousMinutes: number;
    completedSessions: number;
    averageScore: number;
    achievementsCount: number;
    daysActive: number;
  }): string[] {
    const highlights: string[] = [];

    // Time improvement
    if (data.previousMinutes > 0 && data.totalMinutes > data.previousMinutes * 1.2) {
      const increase = Math.round(
        ((data.totalMinutes - data.previousMinutes) / data.previousMinutes) * 100
      );
      highlights.push(`🚀 Learning time increased by ${increase}% this week!`);
    }

    // Consistency
    if (data.daysActive >= 5) {
      highlights.push(`🔥 Active ${data.daysActive} days this week - excellent consistency!`);
    } else if (data.daysActive >= 3) {
      highlights.push(`✨ Practiced ${data.daysActive} days this week`);
    }

    // High scores
    if (data.averageScore >= 90) {
      highlights.push(`🌟 Outstanding average score of ${data.averageScore}%!`);
    } else if (data.averageScore >= 80) {
      highlights.push(`👏 Great average score of ${data.averageScore}%`);
    }

    // Achievements
    if (data.achievementsCount > 0) {
      highlights.push(
        `🏆 Earned ${data.achievementsCount} achievement${data.achievementsCount > 1 ? 's' : ''}!`
      );
    }

    // Lessons completed
    if (data.completedSessions >= 10) {
      highlights.push(`📚 Completed ${data.completedSessions} lessons - amazing effort!`);
    } else if (data.completedSessions >= 5) {
      highlights.push(`📖 Completed ${data.completedSessions} lessons this week`);
    }

    return highlights.slice(0, 4); // Limit to 4 highlights
  }

  /**
   * Render digest email template
   */
  private async renderDigestEmail(content: DigestContent): Promise<string> {
    const { parentName, language, children, weekRange } = content;

    const t = (key: string, args?: Record<string, unknown>) =>
      this.i18n.t(`digest.${key}`, language, args);

    const weekRangeText = `${this.formatDate(weekRange.start, language)} - ${this.formatDate(weekRange.end, language)}`;

    let html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('weekly.title')}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { width: 120px; margin-bottom: 16px; }
    h1 { color: #1a1a2e; font-size: 24px; margin: 0; }
    .week-range { color: #666; font-size: 14px; margin-top: 8px; }
    .child-section {
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .child-header { display: flex; align-items: center; margin-bottom: 20px; }
    .child-avatar {
      width: 48px; height: 48px;
      border-radius: 50%;
      margin-right: 16px;
      background-color: #e0e0e0;
      object-fit: cover;
    }
    .child-name { font-size: 20px; font-weight: 600; color: #1a1a2e; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      text-align: center;
      padding: 16px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }
    .stat-value { font-size: 28px; font-weight: 700; color: #4CAF50; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .trend-up { color: #4CAF50; }
    .trend-down { color: #f44336; }
    .trend-stable { color: #666; }
    .highlights {
      background-color: #fff3e0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .highlight-item { padding: 8px 0; border-bottom: 1px solid #ffe0b2; }
    .highlight-item:last-child { border-bottom: none; }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 12px;
    }
    .achievement-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .achievement-badge {
      display: inline-flex;
      align-items: center;
      background-color: #fff8e1;
      border: 1px solid #ffd54f;
      border-radius: 16px;
      padding: 4px 12px;
      font-size: 14px;
    }
    .teacher-note {
      background-color: #e3f2fd;
      border-left: 4px solid #2196F3;
      padding: 12px 16px;
      margin-bottom: 12px;
      border-radius: 0 8px 8px 0;
    }
    .teacher-name { font-size: 12px; color: #1976D2; margin-top: 8px; }
    .upcoming-assignment {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .due-date { color: #f44336; font-size: 14px; }
    .cta-button {
      display: block;
      text-align: center;
      background-color: #4CAF50;
      color: white;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin: 24px 0;
    }
    .footer {
      text-align: center;
      color: #999;
      font-size: 12px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #eee;
    }
    .footer a { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${config.appUrl}/images/logo.png" alt="AIVO" class="logo">
      <h1>${t('weekly.greeting', { name: parentName })}</h1>
      <p class="week-range">${weekRangeText}</p>
    </div>
`;

    // Render each child's section
    for (const child of children) {
      html += this.renderChildSection(child, language);
    }

    // CTA and footer
    html += `
    <a href="${config.appUrl}/parent/dashboard" class="cta-button">
      ${t('weekly.viewDashboard')}
    </a>

    <div class="footer">
      <p>${t('weekly.footer.receivingBecause')}</p>
      <p>
        <a href="${config.appUrl}/parent/settings/notifications">${t('weekly.footer.managePreferences')}</a> |
        <a href="${config.appUrl}/parent/settings/unsubscribe">${t('weekly.footer.unsubscribe')}</a>
      </p>
      <p>© ${new Date().getFullYear()} AIVO Learning</p>
    </div>
  </div>
</body>
</html>
`;

    return html;
  }

  /**
   * Render a single child's digest section
   */
  private renderChildSection(child: ChildDigest, language: string): string {
    const t = (key: string, args?: Record<string, unknown>) =>
      this.i18n.t(`digest.${key}`, language, args);

    const trendIcon =
      child.comparison.trend === 'up' ? '↑' : child.comparison.trend === 'down' ? '↓' : '→';
    const trendClass = `trend-${child.comparison.trend}`;

    let html = `
    <div class="child-section">
      <div class="child-header">
        ${
          child.photoUrl
            ? `<img src="${child.photoUrl}" alt="${child.studentName}" class="child-avatar">`
            : `<div class="child-avatar"></div>`
        }
        <div>
          <div class="child-name">${child.studentName}</div>
          <span class="${trendClass}">
            ${trendIcon} ${Math.abs(child.comparison.minutesChange)} min ${t(child.comparison.trend === 'up' ? 'weekly.moreThanlastWeek' : 'weekly.lessThanlastWeek')}
          </span>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${child.summary.totalMinutes}</div>
          <div class="stat-label">${t('weekly.stats.minutes')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${child.summary.lessonsCompleted}</div>
          <div class="stat-label">${t('weekly.stats.lessons')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${child.summary.averageScore}%</div>
          <div class="stat-label">${t('weekly.stats.avgScore')}</div>
        </div>
      </div>
`;

    // Highlights
    if (child.highlights.length > 0) {
      html += `
      <div class="highlights">
        <div class="section-title">✨ ${t('weekly.highlights')}</div>
        ${child.highlights.map((h) => `<div class="highlight-item">${h}</div>`).join('')}
      </div>
`;
    }

    // Achievements
    if (child.achievements.length > 0) {
      html += `
      <div style="margin-bottom: 20px;">
        <div class="section-title">🏆 ${t('weekly.achievements')}</div>
        <div class="achievement-list">
          ${child.achievements
            .map(
              (a) => `
            <span class="achievement-badge">
              ${a.iconUrl ? `<img src="${a.iconUrl}" width="16" height="16" style="margin-right: 4px;">` : ''}
              ${a.name}
            </span>
          `
            )
            .join('')}
        </div>
      </div>
`;
    }

    // Teacher notes
    if (child.teacherNotes.length > 0) {
      html += `
      <div style="margin-bottom: 20px;">
        <div class="section-title">📝 ${t('weekly.teacherNotes')}</div>
        ${child.teacherNotes
          .map(
            (n) => `
          <div class="teacher-note">
            ${n.content}
            <div class="teacher-name">— ${n.teacherName}</div>
          </div>
        `
          )
          .join('')}
      </div>
`;
    }

    // Upcoming assignments
    if (child.upcomingAssignments.length > 0) {
      html += `
      <div>
        <div class="section-title">📅 ${t('weekly.upcoming')}</div>
        ${child.upcomingAssignments
          .map(
            (a) => `
          <div class="upcoming-assignment">
            <span>${a.title}</span>
            <span class="due-date">${this.formatDate(a.dueDate, language)}</span>
          </div>
        `
          )
          .join('')}
      </div>
`;
    }

    html += `</div>`;

    return html;
  }

  /**
   * Get the current week's date range
   */
  private getWeekRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date, language: string): string {
    return new Intl.DateTimeFormat(language, {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  /**
   * Check if it's the right time to send digest for a timezone
   */
  private isCorrectTimeForTimezone(timezone: string): boolean {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      });
      const hour = parseInt(formatter.format(now), 10);

      // Send between 6 PM and 7 PM local time
      return hour === 18;
    } catch {
      return false;
    }
  }
}
