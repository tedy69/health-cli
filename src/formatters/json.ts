import { HealthReport } from '../types';

/**
 * Format a health report as JSON.
 */
export function formatJson(report: HealthReport): string {
  return JSON.stringify(report, null, 2);
}
