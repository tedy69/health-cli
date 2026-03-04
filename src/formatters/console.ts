import chalk from 'chalk';
import { HealthReport, Severity } from '../types';

/**
 * Format a health report for human-readable console output.
 */
export function formatConsole(report: HealthReport): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold.underline('🏥 Project Health Report'));
  lines.push(chalk.gray(`   Scanned: ${report.root}`));
  lines.push(chalk.gray(`   Time:    ${report.timestamp}`));
  lines.push(chalk.gray(`   Duration: ${report.durationMs}ms`));
  lines.push('');

  // Group results by pass/fail
  const passed = report.results.filter((r) => r.evidence.length === 0);
  const issues = report.results.filter((r) => r.evidence.length > 0);

  // Sort issues: high > warn > info
  const severityOrder: Record<Severity, number> = { high: 0, warn: 1, info: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  if (issues.length > 0) {
    lines.push(chalk.bold('Issues Found:'));
    lines.push('');

    for (const result of issues) {
      const icon = severityIcon(result.severity);
      const color = severityColor(result.severity);
      lines.push(
        color(`${icon} ${result.title} (${result.id}) [${result.severity.toUpperCase()}]`),
      );

      for (const ev of result.evidence) {
        const loc = ev.file ? chalk.gray(`  ${ev.file}${ev.line ? `:${ev.line}` : ''}`) : '  ';
        lines.push(`${loc} ${ev.message}`);
      }

      lines.push(chalk.cyan(`  💡 ${result.fixHint}`));
      if (result.durationMs !== undefined) {
        lines.push(chalk.gray(`  ⏱  ${result.durationMs}ms`));
      }
      lines.push('');
    }
  }

  if (passed.length > 0) {
    lines.push(chalk.bold('Passed Checks:'));
    for (const result of passed) {
      lines.push(chalk.green(`  ✅ ${result.title} (${result.id})`));
    }
    lines.push('');
  }

  // Summary bar
  lines.push(chalk.bold('Summary:'));
  lines.push(
    `  Total: ${report.summary.total} | ` +
      chalk.green(`Passed: ${report.summary.passed}`) +
      ' | ' +
      chalk.red(`High: ${report.summary.high}`) +
      ' | ' +
      chalk.yellow(`Warn: ${report.summary.warn}`) +
      ' | ' +
      chalk.blue(`Info: ${report.summary.info}`),
  );
  lines.push('');

  return lines.join('\n');
}

function severityIcon(severity: Severity): string {
  switch (severity) {
    case 'high':
      return '🔴';
    case 'warn':
      return '🟡';
    case 'info':
      return '🔵';
  }
}

function severityColor(severity: Severity): chalk.Chalk {
  switch (severity) {
    case 'high':
      return chalk.red;
    case 'warn':
      return chalk.yellow;
    case 'info':
      return chalk.blue;
  }
}
