import { describe, it, expect } from 'vitest';

import type { FeatureAnnouncement } from '../src/types.js';

describe('FeatureAnnouncement type', () => {
  it('supports required fields', () => {
    const announcement: FeatureAnnouncement = {
      key: 'lesson-builder-v2',
      title: 'New Lesson Builder',
      description: 'Build lessons faster with our redesigned editor.',
    };
    expect(announcement.key).toBe('lesson-builder-v2');
    expect(announcement.title).toBe('New Lesson Builder');
    expect(announcement.description).toBeTruthy();
  });

  it('supports badge field', () => {
    const announcement: FeatureAnnouncement = {
      key: 'ai-grading',
      title: 'AI Grading',
      description: 'Automatic grading powered by AI.',
      badge: 'NEW',
    };
    expect(announcement.badge).toBe('NEW');
  });

  it('supports BETA badge', () => {
    const announcement: FeatureAnnouncement = {
      key: 'beta-feature',
      title: 'Beta Feature',
      description: 'Try our beta.',
      badge: 'BETA',
    };
    expect(announcement.badge).toBe('BETA');
  });

  it('supports learnMoreUrl and label', () => {
    const announcement: FeatureAnnouncement = {
      key: 'docs',
      title: 'Docs',
      description: 'See docs.',
      learnMoreUrl: 'https://docs.example.com',
      learnMoreLabel: 'Read Docs',
    };
    expect(announcement.learnMoreUrl).toBe('https://docs.example.com');
    expect(announcement.learnMoreLabel).toBe('Read Docs');
  });

  it('supports position values', () => {
    const positions: Array<FeatureAnnouncement['position']> = ['top', 'bottom', 'left', 'right'];
    for (const pos of positions) {
      const a: FeatureAnnouncement = {
        key: `pos-${pos}`,
        title: 'Positioned',
        description: 'Test',
        position: pos,
      };
      expect(a.position).toBe(pos);
    }
  });

  it('supports showPulse', () => {
    const announcement: FeatureAnnouncement = {
      key: 'pulse',
      title: 'Pulse Test',
      description: 'Shows pulse.',
      showPulse: true,
    };
    expect(announcement.showPulse).toBe(true);
  });

  it('optional fields default to undefined', () => {
    const announcement: FeatureAnnouncement = {
      key: 'minimal',
      title: 'Minimal',
      description: 'Minimal feature announcement.',
    };
    expect(announcement.badge).toBeUndefined();
    expect(announcement.learnMoreUrl).toBeUndefined();
    expect(announcement.position).toBeUndefined();
    expect(announcement.showPulse).toBeUndefined();
  });
});
