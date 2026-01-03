/**
 * Query Explain Analyzer
 *
 * Analyzes PostgreSQL EXPLAIN output to identify:
 * - Sequential scans on large tables
 * - Missing indexes
 * - Inefficient joins
 * - Sort operations on large datasets
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

export interface ExplainNode {
  'Node Type': string;
  'Relation Name'?: string;
  'Index Name'?: string;
  'Startup Cost': number;
  'Total Cost': number;
  'Plan Rows': number;
  'Plan Width': number;
  'Actual Startup Time'?: number;
  'Actual Total Time'?: number;
  'Actual Rows'?: number;
  'Actual Loops'?: number;
  Plans?: ExplainNode[];
  Filter?: string;
  'Index Cond'?: string;
  'Join Type'?: string;
  'Hash Cond'?: string;
  'Merge Cond'?: string;
  'Sort Key'?: string[];
  'Sort Method'?: string;
  'Sort Space Used'?: number;
  'Sort Space Type'?: string;
}

export interface QueryAnalysis {
  totalCost: number;
  estimatedRows: number;
  actualTime?: number;
  issues: QueryIssue[];
  recommendations: string[];
  score: number; // 0-100, higher is better
}

export interface QueryIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  node: string;
  suggestion: string;
}

export class QueryExplainAnalyzer {
  private readonly SEQ_SCAN_ROW_THRESHOLD = 1000;
  private readonly SORT_ROW_THRESHOLD = 10000;
  private readonly NESTED_LOOP_THRESHOLD = 100;
  private readonly COST_THRESHOLD = 1000;

  /**
   * Analyze an EXPLAIN ANALYZE output
   */
  analyze(explainOutput: ExplainNode): QueryAnalysis {
    const issues: QueryIssue[] = [];
    const recommendations: string[] = [];

    // Traverse the plan tree
    this.traversePlan(explainOutput, issues);

    // Generate recommendations from issues
    for (const issue of issues) {
      recommendations.push(issue.suggestion);
    }

    // Calculate score
    const score = this.calculateScore(explainOutput, issues);

    return {
      totalCost: explainOutput['Total Cost'],
      estimatedRows: explainOutput['Plan Rows'],
      actualTime: explainOutput['Actual Total Time'],
      issues,
      recommendations: [...new Set(recommendations)], // Dedupe
      score,
    };
  }

  private traversePlan(node: ExplainNode, issues: QueryIssue[]): void {
    // Check for sequential scans
    if (node['Node Type'] === 'Seq Scan') {
      const rows = node['Actual Rows'] || node['Plan Rows'];
      if (rows > this.SEQ_SCAN_ROW_THRESHOLD) {
        issues.push({
          severity: rows > 10000 ? 'high' : 'medium',
          type: 'sequential_scan',
          description: `Sequential scan on ${node['Relation Name']} returning ${rows} rows`,
          node: node['Node Type'],
          suggestion: `Consider adding an index on ${node['Relation Name']} for columns in: ${node.Filter || 'WHERE clause'}`,
        });
      }
    }

    // Check for sort operations on large datasets
    if (node['Node Type'] === 'Sort') {
      const rows = node['Actual Rows'] || node['Plan Rows'];
      if (rows > this.SORT_ROW_THRESHOLD) {
        const sortType = node['Sort Space Type'] || 'unknown';
        issues.push({
          severity: sortType === 'Disk' ? 'high' : 'medium',
          type: 'expensive_sort',
          description: `Sort operation on ${rows} rows using ${sortType} storage`,
          node: node['Node Type'],
          suggestion: `Consider adding an index with sort order matching: ${node['Sort Key']?.join(', ')}`,
        });
      }
    }

    // Check for nested loops with high row counts
    if (node['Node Type'] === 'Nested Loop') {
      const loops = node['Actual Loops'] || 1;
      if (loops > this.NESTED_LOOP_THRESHOLD) {
        issues.push({
          severity: 'high',
          type: 'expensive_nested_loop',
          description: `Nested loop with ${loops} iterations`,
          node: node['Node Type'],
          suggestion: `Consider rewriting query to use hash join or adding appropriate indexes`,
        });
      }
    }

    // Check for hash joins on large tables without index
    if (node['Node Type'] === 'Hash Join') {
      const rows = node['Plan Rows'];
      if (rows > this.SORT_ROW_THRESHOLD && !node['Index Name']) {
        issues.push({
          severity: 'medium',
          type: 'hash_join_no_index',
          description: `Hash join without index on ${rows} estimated rows`,
          node: node['Node Type'],
          suggestion: `Consider adding index for join condition: ${node['Hash Cond']}`,
        });
      }
    }

    // Check for bitmap heap scans with recheck
    if (node['Node Type'] === 'Bitmap Heap Scan') {
      const rows = node['Actual Rows'] || node['Plan Rows'];
      // Bitmap scans with many rows might indicate index not selective enough
      if (rows > this.SORT_ROW_THRESHOLD) {
        issues.push({
          severity: 'low',
          type: 'bitmap_scan_large',
          description: `Bitmap heap scan returning ${rows} rows - index may not be selective enough`,
          node: node['Node Type'],
          suggestion: `Consider adding more columns to the index or using a partial index`,
        });
      }
    }

    // Check for high cost operations
    if (node['Total Cost'] > this.COST_THRESHOLD) {
      // Only flag if not already identified as an issue
      const hasIssue = issues.some(
        (i) =>
          i.node === node['Node Type'] &&
          (i.type === 'sequential_scan' || i.type === 'expensive_sort')
      );

      if (!hasIssue) {
        issues.push({
          severity: 'low',
          type: 'high_cost',
          description: `High cost operation: ${node['Node Type']} with cost ${node['Total Cost'].toFixed(2)}`,
          node: node['Node Type'],
          suggestion: `Review this operation for optimization opportunities`,
        });
      }
    }

    // Check for suboptimal join types
    if (node['Node Type'] === 'Merge Join' && node['Sort Key']) {
      // Merge joins require sorted input - check if sort is expensive
      issues.push({
        severity: 'low',
        type: 'merge_join_sort',
        description: `Merge join requiring sorted input`,
        node: node['Node Type'],
        suggestion: `Ensure indexes exist for sort keys: ${node['Sort Key'].join(', ')}`,
      });
    }

    // Recursively analyze child plans
    if (node.Plans) {
      for (const child of node.Plans) {
        this.traversePlan(child, issues);
      }
    }
  }

  private calculateScore(node: ExplainNode, issues: QueryIssue[]): number {
    let score = 100;

    // Deduct for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Deduct for high cost
    if (node['Total Cost'] > 10000) {
      score -= 10;
    } else if (node['Total Cost'] > 1000) {
      score -= 5;
    }

    // Deduct for slow actual time
    if (node['Actual Total Time']) {
      if (node['Actual Total Time'] > 1000) {
        score -= 20;
      } else if (node['Actual Total Time'] > 100) {
        score -= 10;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Format analysis as readable report
   */
  formatReport(analysis: QueryAnalysis): string {
    let report = `
Query Analysis Report
=====================

Score: ${analysis.score}/100
Total Cost: ${analysis.totalCost.toFixed(2)}
Estimated Rows: ${analysis.estimatedRows}
${analysis.actualTime ? `Actual Time: ${analysis.actualTime.toFixed(2)}ms` : ''}

Issues Found: ${analysis.issues.length}
`;

    if (analysis.issues.length > 0) {
      report += '\nIssues:\n';
      for (const issue of analysis.issues) {
        report += `
  [${issue.severity.toUpperCase()}] ${issue.type}
  ${issue.description}
  Suggestion: ${issue.suggestion}
`;
      }
    }

    if (analysis.recommendations.length > 0) {
      report += '\nRecommendations:\n';
      for (let i = 0; i < analysis.recommendations.length; i++) {
        report += `  ${i + 1}. ${analysis.recommendations[i]}\n`;
      }
    }

    return report;
  }

  /**
   * Run EXPLAIN ANALYZE on a query
   */
  async explainQuery(
    prisma: any,
    query: string
  ): Promise<{ plan: ExplainNode; analysis: QueryAnalysis }> {
    const result = await prisma.$queryRawUnsafe(
      `EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS) ${query}`
    ) as [{ 'QUERY PLAN': string }];

    const planJson = JSON.parse(result[0]['QUERY PLAN']);
    const plan = planJson[0].Plan as ExplainNode;

    return {
      plan,
      analysis: this.analyze(plan),
    };
  }

  /**
   * Generate index suggestion SQL
   */
  generateIndexSuggestion(
    table: string,
    columns: string[],
    options: {
      unique?: boolean;
      partial?: string;
      concurrent?: boolean;
      include?: string[];
    } = {}
  ): string {
    const { unique, partial, concurrent, include } = options;
    const indexName = `idx_${table}_${columns.join('_')}`;

    let sql = 'CREATE ';
    if (unique) sql += 'UNIQUE ';
    sql += 'INDEX ';
    if (concurrent) sql += 'CONCURRENTLY ';
    sql += `${indexName} ON ${table} (${columns.join(', ')})`;

    if (include && include.length > 0) {
      sql += ` INCLUDE (${include.join(', ')})`;
    }

    if (partial) {
      sql += ` WHERE ${partial}`;
    }

    return sql + ';';
  }
}

/**
 * Read Replica Router - Routes queries to appropriate database
 */
export class ReadReplicaRouter {
  private primaryUrl: string;
  private replicaUrls: string[];
  private currentReplicaIndex: number = 0;
  private healthyReplicas: Set<string>;

  constructor(primaryUrl: string, replicaUrls: string[] = []) {
    this.primaryUrl = primaryUrl;
    this.replicaUrls = replicaUrls;
    this.healthyReplicas = new Set(replicaUrls);
  }

  /**
   * Get URL for a read query (round-robin across healthy replicas)
   */
  getReadUrl(): string {
    if (this.healthyReplicas.size === 0) {
      return this.primaryUrl;
    }

    const healthyList = Array.from(this.healthyReplicas);
    const url = healthyList[this.currentReplicaIndex % healthyList.length];
    this.currentReplicaIndex++;

    return url;
  }

  /**
   * Get URL for a write query (always primary)
   */
  getWriteUrl(): string {
    return this.primaryUrl;
  }

  /**
   * Mark a replica as unhealthy
   */
  markUnhealthy(replicaUrl: string): void {
    this.healthyReplicas.delete(replicaUrl);
  }

  /**
   * Mark a replica as healthy
   */
  markHealthy(replicaUrl: string): void {
    if (this.replicaUrls.includes(replicaUrl)) {
      this.healthyReplicas.add(replicaUrl);
    }
  }

  /**
   * Get router status
   */
  getStatus(): {
    primary: string;
    replicas: string[];
    healthyReplicas: string[];
    unhealthyReplicas: string[];
  } {
    const healthy = Array.from(this.healthyReplicas);
    const unhealthy = this.replicaUrls.filter((r) => !this.healthyReplicas.has(r));

    return {
      primary: this.primaryUrl,
      replicas: this.replicaUrls,
      healthyReplicas: healthy,
      unhealthyReplicas: unhealthy,
    };
  }

  /**
   * Determine if query is read-only
   */
  isReadOnlyQuery(query: string): boolean {
    const normalized = query.trim().toUpperCase();
    return (
      normalized.startsWith('SELECT') ||
      normalized.startsWith('WITH') ||
      normalized.startsWith('EXPLAIN')
    );
  }

  /**
   * Route query to appropriate database
   */
  routeQuery(query: string): string {
    if (this.isReadOnlyQuery(query)) {
      return this.getReadUrl();
    }
    return this.getWriteUrl();
  }
}
