import * as fs from 'node:fs';
import * as path from 'node:path';
import { Baseline, BaselineEntry, HealthReport } from './types';

const BASELINE_FILE = '.health-baseline.json';

/**
 * Load the baseline from disk.
 */
export function loadBaseline(root: string): Baseline | null {
  const filePath = path.join(root, BASELINE_FILE);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Baseline;
  } catch {
    return null;
  }
}

/**
 * Save a baseline to disk from the current report.
 */
export function saveBaseline(root: string, report: HealthReport): void {
  const entries: BaselineEntry[] = report.results.map((r) => ({
    ruleId: r.id,
    count: r.evidence.length,
  }));

  const baseline: Baseline = {
    version: 1,
    createdAt: new Date().toISOString(),
    entries,
  };

  const filePath = path.join(root, BASELINE_FILE);
  fs.writeFileSync(filePath, JSON.stringify(baseline, null, 2) + '\n');
}

/**
 * Compare a report against a baseline.
 * Returns new regressions (rules where evidence count increased).
 */
export function compareWithBaseline(
  report: HealthReport,
  baseline: Baseline,
): { ruleId: string; baselineCount: number; currentCount: number }[] {
  const regressions: { ruleId: string; baselineCount: number; currentCount: number }[] = [];

  for (const result of report.results) {
    const baselineEntry = baseline.entries.find((e) => e.ruleId === result.id);
    const baselineCount = baselineEntry?.count ?? 0;
    const currentCount = result.evidence.length;

    if (currentCount > baselineCount) {
      regressions.push({
        ruleId: result.id,
        baselineCount,
        currentCount,
      });
    }
  }

  return regressions;
}
