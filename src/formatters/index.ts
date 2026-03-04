import { HealthReport } from '../types';
import { formatConsole } from './console';
import { formatJson } from './json';
import { formatSarif } from './sarif';

export type OutputFormat = 'console' | 'json' | 'sarif';

/**
 * Format a health report into the requested output format.
 */
export function formatReport(report: HealthReport, format: OutputFormat): string {
  switch (format) {
    case 'console':
      return formatConsole(report);
    case 'json':
      return formatJson(report);
    case 'sarif':
      return formatSarif(report);
    default:
      return formatConsole(report);
  }
}

export { formatConsole } from './console';
export { formatJson } from './json';
export { formatSarif } from './sarif';
