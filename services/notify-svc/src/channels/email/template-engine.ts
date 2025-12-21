/**
 * Email Template Engine
 *
 * Handlebars-based template rendering engine with:
 * - Compiled template caching
 * - i18n support via translation helper
 * - Layout/partial support
 * - Custom helpers for formatting
 * - Template preloading on startup
 */

import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

import Handlebars from 'handlebars';

import type { EmailTemplateContext, SupportedLocale } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface CompiledTemplate {
  template: Handlebars.TemplateDelegate;
  lastModified: number;
}

interface TranslationEntry {
  [key: string]: string | TranslationEntry;
}

interface TemplateRenderOptions {
  locale?: SupportedLocale;
  layout?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const TEMPLATES_DIR = join(import.meta.dirname, 'templates');
const LOCALES_DIR = join(import.meta.dirname, 'locales');
const DEFAULT_LOCALE: SupportedLocale = 'en';
const TEMPLATE_EXTENSION = '.hbs';

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE ENGINE
// ══════════════════════════════════════════════════════════════════════════════

class EmailTemplateEngine {
  private readonly handlebars: typeof Handlebars;
  private readonly compiledTemplates = new Map<string, CompiledTemplate>();
  private readonly translations = new Map<SupportedLocale, TranslationEntry>();
  private _isInitialized = false;

  constructor() {
    this.handlebars = Handlebars.create();
  }

  /**
   * Initialize the template engine
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    console.log('[TemplateEngine] Initializing...');

    // Register custom helpers
    this.registerHelpers();

    // Load translations
    await this.loadTranslations();

    // Precompile all templates
    await this.precompileTemplates();

    this._isInitialized = true;
    console.log('[TemplateEngine] Initialized', {
      templates: this.compiledTemplates.size,
      locales: this.translations.size,
    });
  }

  /**
   * Render a template with context
   */
  async render(
    templateName: string,
    context: EmailTemplateContext,
    options: TemplateRenderOptions = {}
  ): Promise<{ html: string; text: string }> {
    if (!this._isInitialized) {
      await this.initialize();
    }

    const locale = options.locale || context.locale || DEFAULT_LOCALE;
    const templateKey = this.getTemplateKey(templateName);

    // Get compiled template
    const compiled = this.compiledTemplates.get(templateKey);
    if (!compiled) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Build render context with translations
    const renderContext = this.buildRenderContext(context, locale);

    // Render HTML
    const html = compiled.template(renderContext);

    // Generate plain text version
    const text = this.htmlToText(html);

    return { html, text };
  }

  /**
   * Render a template string (not from file)
   */
  renderString(templateString: string, context: EmailTemplateContext): string {
    const locale = context.locale || DEFAULT_LOCALE;
    const renderContext = this.buildRenderContext(context, locale);
    const compiled = this.handlebars.compile(templateString);
    return compiled(renderContext);
  }

  /**
   * Check if a template exists
   */
  hasTemplate(templateName: string): boolean {
    const templateKey = this.getTemplateKey(templateName);
    return this.compiledTemplates.has(templateKey);
  }

  /**
   * Get list of available templates
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.compiledTemplates.keys());
  }

  /**
   * Get list of available locales
   */
  getAvailableLocales(): SupportedLocale[] {
    return Array.from(this.translations.keys());
  }

  /**
   * Reload all templates (useful for development)
   */
  async reloadTemplates(): Promise<void> {
    this.compiledTemplates.clear();
    await this.precompileTemplates();
    console.log('[TemplateEngine] Templates reloaded');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private registerHelpers(): void {
    // Translation helper: {{t 'key.subkey' arg1=value1}}
    this.handlebars.registerHelper('t', (key: string, options: Handlebars.HelperOptions) => {
      const root = (options.data as Record<string, unknown> | undefined)?.root as { __locale?: SupportedLocale } | undefined;
      const locale = root?.__locale || DEFAULT_LOCALE;
      const translations = this.translations.get(locale) || this.translations.get(DEFAULT_LOCALE);

      if (!translations) {
        return key;
      }

      // Navigate to the key
      const value = this.getNestedValue(translations, key);
      if (typeof value !== 'string') {
        return key;
      }

      // Replace placeholders with hash arguments
      let result = value;
      if (options.hash) {
        const hashEntries = Object.entries(options.hash as Record<string, unknown>);
        for (const [placeholder, replacement] of hashEntries) {
          result = result.replaceAll(`{{${placeholder}}}`, String(replacement));
        }
      }

      return new Handlebars.SafeString(result);
    });

    // Date formatting helper: {{formatDate date 'long'}}
    this.handlebars.registerHelper('formatDate', function (date: Date | string, format: string) {
      const d = date instanceof Date ? date : new Date(date);
      let options: Intl.DateTimeFormatOptions;
      if (format === 'short') {
        options = { month: 'short', day: 'numeric' };
      } else if (format === 'long') {
        options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      } else {
        options = { year: 'numeric', month: 'short', day: 'numeric' };
      }
      return d.toLocaleDateString('en-US', options);
    });

    // Time formatting helper: {{formatTime date}}
    this.handlebars.registerHelper('formatTime', function (date: Date | string) {
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    });

    // Currency formatting helper: {{formatCurrency amount currency}}
    this.handlebars.registerHelper('formatCurrency', function (amount: number, currency = 'USD') {
      const currencyStr = String(currency);
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyStr }).format(amount);
    });

    // Percentage formatting helper: {{formatPercent value}}
    this.handlebars.registerHelper('formatPercent', function (value: number) {
      return `${Math.round(value)}%`;
    });

    // Conditional equals helper: {{#if (eq a b)}}
    this.handlebars.registerHelper('eq', function (a: unknown, b: unknown) {
      return a === b;
    });

    // Greater than or equal: {{#if (gte a b)}}
    this.handlebars.registerHelper('gte', function (a: number, b: number) {
      return a >= b;
    });

    // Less than: {{#if (lt a b)}}
    this.handlebars.registerHelper('lt', function (a: number, b: number) {
      return a < b;
    });

    // And helper: {{#if (and a b)}}
    this.handlebars.registerHelper('and', function (...args: unknown[]) {
      // Last argument is the options object
      const values = args.slice(0, -1);
      return values.every(Boolean);
    });

    // Or helper: {{#if (or a b)}}
    this.handlebars.registerHelper('or', function (...args: unknown[]) {
      const values = args.slice(0, -1);
      return values.some(Boolean);
    });

    // Pluralize helper: {{pluralize count 'item' 'items'}}
    this.handlebars.registerHelper('pluralize', function (count: number, singular: string, plural: string) {
      return count === 1 ? singular : plural;
    });

    // Truncate helper: {{truncate text 100}}
    this.handlebars.registerHelper('truncate', function (text: string, length: number) {
      if (text.length <= length) return text;
      return text.substring(0, length) + '...';
    });

    // JSON stringify helper (for debugging): {{json object}}
    this.handlebars.registerHelper('json', function (obj: unknown) {
      return JSON.stringify(obj, null, 2);
    });
  }

  private async loadTranslations(): Promise<void> {
    if (!existsSync(LOCALES_DIR)) {
      console.warn('[TemplateEngine] Locales directory not found, creating default');
      // Create default English translations
      this.translations.set('en', this.getDefaultTranslations());
      return;
    }

    try {
      const files = await readdir(LOCALES_DIR);
      
      for (const file of files) {
        if (extname(file) === '.json') {
          const locale = basename(file, '.json') as SupportedLocale;
          const content = await readFile(join(LOCALES_DIR, file), 'utf-8');
          const parsed = JSON.parse(content) as TranslationEntry;
          this.translations.set(locale, parsed);
          console.log(`[TemplateEngine] Loaded locale: ${locale}`);
        }
      }
    } catch (error) {
      console.error('[TemplateEngine] Error loading translations:', error);
      this.translations.set('en', this.getDefaultTranslations());
    }

    // Ensure default locale exists
    if (!this.translations.has(DEFAULT_LOCALE)) {
      this.translations.set(DEFAULT_LOCALE, this.getDefaultTranslations());
    }
  }

  private async precompileTemplates(): Promise<void> {
    if (!existsSync(TEMPLATES_DIR)) {
      console.warn('[TemplateEngine] Templates directory not found');
      return;
    }

    // First, register all layouts as partials
    const layoutsDir = join(TEMPLATES_DIR, 'layouts');
    if (existsSync(layoutsDir)) {
      await this.registerLayoutsAsPartials(layoutsDir);
    }

    // Then compile all templates
    await this.compileTemplatesRecursively(TEMPLATES_DIR);
  }

  private async registerLayoutsAsPartials(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(TEMPLATE_EXTENSION)) {
        const filePath = join(dir, entry.name);
        const content = await readFile(filePath, 'utf-8');
        const partialName = `layouts/${basename(entry.name, TEMPLATE_EXTENSION)}`;
        
        this.handlebars.registerPartial(partialName, content);
        console.log(`[TemplateEngine] Registered partial: ${partialName}`);
      }
    }
  }

  private async compileTemplatesRecursively(dir: string, prefix = ''): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.processDirectory(entry, fullPath, prefix);
      } else if (this.isTemplateFile(entry)) {
        await this.compileTemplateFile(entry, fullPath, prefix);
      }
    }
  }

  private async processDirectory(entry: { name: string }, fullPath: string, prefix: string): Promise<void> {
    // Skip layouts directory as they're registered as partials
    if (entry.name === 'layouts') return;
    await this.compileTemplatesRecursively(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name);
  }

  private isTemplateFile(entry: { name: string; isFile: () => boolean }): boolean {
    return entry.isFile() && entry.name.endsWith(TEMPLATE_EXTENSION);
  }

  private async compileTemplateFile(entry: { name: string }, fullPath: string, prefix: string): Promise<void> {
    const templateName = basename(entry.name, TEMPLATE_EXTENSION);
    const templateKey = prefix ? `${prefix}/${templateName}` : templateName;

    try {
      const content = await readFile(fullPath, 'utf-8');
      const compiled = this.handlebars.compile(content);

      this.compiledTemplates.set(templateKey, {
        template: compiled,
        lastModified: Date.now(),
      });

      console.log(`[TemplateEngine] Compiled template: ${templateKey}`);
    } catch (error) {
      console.error(`[TemplateEngine] Error compiling ${templateKey}:`, error);
    }
  }

  private getTemplateKey(templateName: string): string {
    // Normalize template name (remove extension if provided)
    return templateName.replace(/\.hbs$/, '');
  }

  private buildRenderContext(context: EmailTemplateContext, locale: SupportedLocale): Record<string, unknown> {
    return {
      ...context,
      __locale: locale,
      currentYear: new Date().getFullYear(),
      lang: locale,
      rtl: ['ar', 'he', 'fa'].includes(locale),
    };
  }

  private getNestedValue(obj: TranslationEntry, path: string): string | TranslationEntry | undefined {
    const keys = path.split('.');
    let current: TranslationEntry | string | undefined = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private htmlToText(html: string): string {
    // Simple HTML to plain text conversion
    return html
      // Remove style and script tags with content
      .replaceAll(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replaceAll(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Convert line breaks
      .replaceAll(/<br\s*\/?>/gi, '\n')
      .replaceAll(/<\/p>/gi, '\n\n')
      .replaceAll(/<\/tr>/gi, '\n')
      .replaceAll(/<\/li>/gi, '\n')
      .replaceAll(/<\/h[1-6]>/gi, '\n\n')
      // Convert links to text with URL
      .replaceAll(/<a[^>]+href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
      // Remove remaining HTML tags
      .replaceAll(/<[^>]+>/g, '')
      // Decode HTML entities
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'")
      // Clean up whitespace
      .replaceAll(/\n\s*\n\s*\n/g, '\n\n')
      .replaceAll(/[ \t]+/g, ' ')
      .trim();
  }

  private getDefaultTranslations(): TranslationEntry {
    return {
      footer: {
        sent_by: 'Sent by',
        unsubscribe: 'Unsubscribe',
        preferences: 'Email preferences',
        rights: 'All rights reserved.',
      },
      coppa: {
        notice: 'This email contains information about a child\'s educational progress. Please keep this information confidential.',
      },
      welcome: {
        title: 'Welcome, {{name}}!',
        subtitle: 'Get started with {{tenantName}}',
        activate_button: 'Activate Your Account',
        features_title: 'What you can do',
        link_expiry_title: 'Link expires soon',
        link_expiry_message: 'This link will expire in {{hours}} hours.',
        need_help: 'Need help getting started?',
        visit_help: 'Visit our Help Center',
        ignore_message: 'If you didn\'t create this account, you can safely ignore this email.',
      },
      // Add more default translations as needed
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

export const emailTemplateEngine = new EmailTemplateEngine();

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export async function initializeTemplateEngine(): Promise<void> {
  await emailTemplateEngine.initialize();
}

export async function renderEmailTemplate(
  templateName: string,
  context: EmailTemplateContext,
  options?: TemplateRenderOptions
): Promise<{ html: string; text: string }> {
  return emailTemplateEngine.render(templateName, context, options);
}
