import { Rule, RuleResult, RunContext, HealthReport, RuleMeta, Severity } from './types';

/**
 * Central rule registry & execution engine.
 */
export class RuleEngine {
  private rules: Rule[] = [];

  /** Register a rule */
  register(rule: Rule): void {
    this.rules.push(rule);
  }

  /** Register multiple rules */
  registerAll(rules: Rule[]): void {
    rules.forEach((r) => this.register(r));
  }

  /** List metadata for all registered rules */
  listRules(): RuleMeta[] {
    return this.rules.map((r) => r.meta);
  }

  /** Get metadata for a specific rule by id */
  explainRule(id: string): RuleMeta | undefined {
    return this.rules.find((r) => r.meta.id === id)?.meta;
  }

  /** Execute all enabled rules and produce a health report */
  async run(ctx: RunContext): Promise<HealthReport> {
    const start = Date.now();
    const results: RuleResult[] = [];

    for (const rule of this.rules) {
      const override = ctx.config.rules[rule.meta.id];
      if (override?.enabled === false) continue;

      const ruleStart = Date.now();
      try {
        const result = await rule.run(ctx);
        // Apply severity override
        if (override?.severity) {
          result.severity = override.severity;
        }
        result.durationMs = Date.now() - ruleStart;
        results.push(result);
      } catch (err) {
        results.push({
          id: rule.meta.id,
          title: rule.meta.title,
          severity: 'info',
          evidence: [{ message: `Rule failed to execute: ${(err as Error).message}` }],
          fixHint: 'Check rule configuration',
          durationMs: Date.now() - ruleStart,
        });
      }
    }

    const summary = buildSummary(results);
    return {
      timestamp: new Date().toISOString(),
      root: ctx.root,
      results,
      summary,
      durationMs: Date.now() - start,
    };
  }
}

function buildSummary(results: RuleResult[]) {
  let info = 0,
    warn = 0,
    high = 0,
    passed = 0;
  for (const r of results) {
    if (r.evidence.length === 0) {
      passed++;
      continue;
    }
    switch (r.severity) {
      case 'info':
        info++;
        break;
      case 'warn':
        warn++;
        break;
      case 'high':
        high++;
        break;
    }
  }
  return { total: results.length, info, warn, high, passed };
}

/** Determine if the scan should fail based on failOn threshold */
export function shouldFail(report: HealthReport, failOn?: Severity): boolean {
  if (!failOn) return false;
  switch (failOn) {
    case 'info':
      return report.summary.info > 0 || report.summary.warn > 0 || report.summary.high > 0;
    case 'warn':
      return report.summary.warn > 0 || report.summary.high > 0;
    case 'high':
      return report.summary.high > 0;
    default:
      return false;
  }
}
