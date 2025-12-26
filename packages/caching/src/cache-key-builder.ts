import { createHash } from 'crypto';

/**
 * Cache Key Builder - Generates consistent, collision-resistant cache keys
 */
export class CacheKeyBuilder {
  private prefix: string;
  private parts: string[] = [];
  private hashParams: boolean;

  constructor(prefix: string, options: { hashParams?: boolean } = {}) {
    this.prefix = prefix;
    this.hashParams = options.hashParams ?? true;
  }

  /**
   * Add a namespace segment
   */
  namespace(ns: string): this {
    this.parts.push(ns);
    return this;
  }

  /**
   * Add an entity type
   */
  entity(type: string): this {
    this.parts.push(type);
    return this;
  }

  /**
   * Add an ID
   */
  id(id: string | number): this {
    this.parts.push(String(id));
    return this;
  }

  /**
   * Add tenant context
   */
  tenant(tenantId: string): this {
    this.parts.push(`t:${tenantId}`);
    return this;
  }

  /**
   * Add user context
   */
  user(userId: string): this {
    this.parts.push(`u:${userId}`);
    return this;
  }

  /**
   * Add query parameters
   */
  params(params: Record<string, any>): this {
    if (Object.keys(params).length === 0) {
      return this;
    }

    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}=${JSON.stringify(params[k])}`)
      .join('&');

    if (this.hashParams) {
      const hash = createHash('sha256').update(sorted).digest('hex').slice(0, 12);
      this.parts.push(`p:${hash}`);
    } else {
      this.parts.push(`p:${sorted}`);
    }

    return this;
  }

  /**
   * Add a version for cache busting
   */
  version(v: string | number): this {
    this.parts.push(`v${v}`);
    return this;
  }

  /**
   * Add custom segment
   */
  segment(name: string, value: string | number): this {
    this.parts.push(`${name}:${value}`);
    return this;
  }

  /**
   * Build the final cache key
   */
  build(): string {
    const key = [this.prefix, ...this.parts].join(':');
    // Normalize key - remove invalid characters
    return key.replace(/[^a-zA-Z0-9:_-]/g, '_');
  }

  /**
   * Build with hash suffix for uniqueness
   */
  buildHashed(): string {
    const base = this.build();
    const hash = createHash('sha256').update(base).digest('hex').slice(0, 8);
    return `${base}:${hash}`;
  }

  /**
   * Create a new builder instance
   */
  static create(prefix: string): CacheKeyBuilder {
    return new CacheKeyBuilder(prefix);
  }

  /**
   * Common key patterns
   */
  static forEntity(entity: string, id: string | number, tenantId?: string): string {
    const builder = new CacheKeyBuilder('entity').entity(entity).id(id);
    if (tenantId) {
      builder.tenant(tenantId);
    }
    return builder.build();
  }

  static forList(
    entity: string,
    params: Record<string, any>,
    tenantId?: string
  ): string {
    const builder = new CacheKeyBuilder('list').entity(entity).params(params);
    if (tenantId) {
      builder.tenant(tenantId);
    }
    return builder.build();
  }

  static forUser(userId: string, resource: string): string {
    return new CacheKeyBuilder('user').user(userId).segment('res', resource).build();
  }

  static forSession(sessionId: string): string {
    return new CacheKeyBuilder('session').id(sessionId).build();
  }

  static forAnalytics(
    reportType: string,
    entityId: string,
    dateRange: string
  ): string {
    return new CacheKeyBuilder('analytics')
      .segment('report', reportType)
      .id(entityId)
      .segment('range', dateRange)
      .build();
  }
}
