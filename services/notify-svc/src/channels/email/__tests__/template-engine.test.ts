/**
 * Template Engine Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { EmailTemplateEngine } from '../template-engine.js';

describe('EmailTemplateEngine', () => {
  let engine: EmailTemplateEngine;

  beforeAll(async () => {
    engine = new EmailTemplateEngine();
    
    // Only initialize if templates directory exists
    const templatesDir = join(process.cwd(), 'src/channels/email/templates');
    if (existsSync(templatesDir)) {
      await engine.initialize();
    }
  });

  describe('renderString', () => {
    it('should render simple template strings', () => {
      const result = engine.renderString('Hello, {{name}}!', { name: 'World' });
      expect(result).toBe('Hello, World!');
    });

    it('should handle missing variables gracefully', () => {
      const result = engine.renderString('Hello, {{name}}!', {});
      expect(result).toBe('Hello, !');
    });

    it('should support nested properties', () => {
      const result = engine.renderString('{{user.name}}', { user: { name: 'John' } });
      expect(result).toBe('John');
    });

    it('should escape HTML by default', () => {
      const result = engine.renderString('{{content}}', { content: '<script>alert("xss")</script>' });
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should allow raw HTML with triple braces', () => {
      const result = engine.renderString('{{{content}}}', { content: '<strong>Bold</strong>' });
      expect(result).toContain('<strong>Bold</strong>');
    });
  });

  describe('helpers', () => {
    describe('formatDate', () => {
      it('should format dates', () => {
        const date = new Date('2024-06-15T10:30:00Z');
        const result = engine.renderString('{{formatDate date "MMMM d, yyyy"}}', { date });
        expect(result).toMatch(/June 15, 2024/);
      });
    });

    describe('formatCurrency', () => {
      it('should format currency', () => {
        const result = engine.renderString('{{formatCurrency amount "USD"}}', { amount: 99.99 });
        expect(result).toMatch(/\$99\.99/);
      });
    });

    describe('eq', () => {
      it('should compare values for equality', () => {
        const template = '{{#if (eq status "active")}}Active{{else}}Inactive{{/if}}';
        expect(engine.renderString(template, { status: 'active' })).toBe('Active');
        expect(engine.renderString(template, { status: 'inactive' })).toBe('Inactive');
      });
    });

    describe('gte', () => {
      it('should compare greater than or equal', () => {
        const template = '{{#if (gte score 80)}}Pass{{else}}Fail{{/if}}';
        expect(engine.renderString(template, { score: 80 })).toBe('Pass');
        expect(engine.renderString(template, { score: 90 })).toBe('Pass');
        expect(engine.renderString(template, { score: 70 })).toBe('Fail');
      });
    });

    describe('lt', () => {
      it('should compare less than', () => {
        const template = '{{#if (lt score 50)}}Low{{else}}OK{{/if}}';
        expect(engine.renderString(template, { score: 30 })).toBe('Low');
        expect(engine.renderString(template, { score: 60 })).toBe('OK');
      });
    });

    describe('and', () => {
      it('should perform logical AND', () => {
        const template = '{{#if (and hasAccess isActive)}}Allowed{{else}}Denied{{/if}}';
        expect(engine.renderString(template, { hasAccess: true, isActive: true })).toBe('Allowed');
        expect(engine.renderString(template, { hasAccess: true, isActive: false })).toBe('Denied');
      });
    });

    describe('or', () => {
      it('should perform logical OR', () => {
        const template = '{{#if (or isAdmin isOwner)}}Access{{else}}Denied{{/if}}';
        expect(engine.renderString(template, { isAdmin: true, isOwner: false })).toBe('Access');
        expect(engine.renderString(template, { isAdmin: false, isOwner: false })).toBe('Denied');
      });
    });

    describe('pluralize', () => {
      it('should pluralize words', () => {
        const template = '{{count}} {{pluralize count "item" "items"}}';
        expect(engine.renderString(template, { count: 1 })).toBe('1 item');
        expect(engine.renderString(template, { count: 5 })).toBe('5 items');
        expect(engine.renderString(template, { count: 0 })).toBe('0 items');
      });
    });

    describe('truncate', () => {
      it('should truncate long strings', () => {
        const result = engine.renderString('{{truncate text 10}}', { text: 'This is a very long string' });
        expect(result).toBe('This is a...');
      });

      it('should not truncate short strings', () => {
        const result = engine.renderString('{{truncate text 50}}', { text: 'Short' });
        expect(result).toBe('Short');
      });
    });
  });

  describe('conditionals', () => {
    it('should handle if/else blocks', () => {
      const template = '{{#if show}}Visible{{else}}Hidden{{/if}}';
      expect(engine.renderString(template, { show: true })).toBe('Visible');
      expect(engine.renderString(template, { show: false })).toBe('Hidden');
    });

    it('should handle unless blocks', () => {
      const template = '{{#unless hide}}Visible{{else}}Hidden{{/unless}}';
      expect(engine.renderString(template, { hide: false })).toBe('Visible');
      expect(engine.renderString(template, { hide: true })).toBe('Hidden');
    });
  });

  describe('loops', () => {
    it('should iterate over arrays', () => {
      const template = '{{#each items}}{{this}},{{/each}}';
      expect(engine.renderString(template, { items: ['a', 'b', 'c'] })).toBe('a,b,c,');
    });

    it('should provide @index in loops', () => {
      const template = '{{#each items}}{{@index}}:{{this}} {{/each}}';
      expect(engine.renderString(template, { items: ['a', 'b'] })).toBe('0:a 1:b ');
    });

    it('should provide @first and @last', () => {
      const template = '{{#each items}}{{#if @first}}[{{/if}}{{this}}{{#if @last}}]{{/if}}{{/each}}';
      expect(engine.renderString(template, { items: ['a', 'b', 'c'] })).toBe('[abc]');
    });
  });

  describe('complex templates', () => {
    it('should render email-like templates', () => {
      const template = `
        <h1>Hello, {{user.firstName}}!</h1>
        {{#if hasUpdates}}
          <p>You have {{updateCount}} {{pluralize updateCount "update" "updates"}}.</p>
          <ul>
            {{#each updates}}
              <li>{{this.title}}</li>
            {{/each}}
          </ul>
        {{else}}
          <p>No updates today.</p>
        {{/if}}
      `;

      const result = engine.renderString(template, {
        user: { firstName: 'Jane' },
        hasUpdates: true,
        updateCount: 2,
        updates: [
          { title: 'New feature released' },
          { title: 'Bug fixes' },
        ],
      });

      expect(result).toContain('Hello, Jane!');
      expect(result).toContain('2 updates');
      expect(result).toContain('New feature released');
      expect(result).toContain('Bug fixes');
    });
  });
});
