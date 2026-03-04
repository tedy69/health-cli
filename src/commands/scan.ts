import * as path from 'node:path';
import chalk from 'chalk';
import { RuleEngine, shouldFail } from '../engine';
import { allRules } from '../rules';
import { loadConfig } from '../config';
import { formatReport } from '../formatters';
import { loadBaseline, saveBaseline, compareWithBaseline } from '../baseline';
import { runAutofix, formatAutofixResults } from '../autofix';
import { Severity } from '../types';

export interface ScanOptions {
  format?: 'console' | 'json' | 'sarif';
  failOn?: Severity;
  baseline?: boolean;
  saveBaseline?: boolean;
  autofix?: boolean;
  root?: string;
}

/**
 * Execute the `health scan` command.
 */
export async function runScan(options: ScanOptions): Promise<void> {
  const root = path.resolve(options.root || process.cwd());
  const config = loadConfig(root);

  // Apply CLI overrides
  if (options.format) config.format = options.format;
  if (options.failOn) config.failOn = options.failOn;

  // Run autofix first if requested
  if (options.autofix) {
    const fixResults = runAutofix(root);
    if (config.format === 'console') {
      console.log(formatAutofixResults(fixResults));
    }
  }

  // Build and run engine
  const engine = new RuleEngine();
  engine.registerAll(allRules);

  const report = await engine.run({ root, config });

  // Baseline comparison
  if (options.baseline) {
    const baseline = loadBaseline(root);
    if (baseline) {
      const regressions = compareWithBaseline(report, baseline);
      if (regressions.length > 0 && config.format === 'console') {
        console.log('');
        console.log(chalk.bold.red('⚠️  Regressions detected vs baseline:'));
        for (const reg of regressions) {
          console.log(
            chalk.red(
              `   ${reg.ruleId}: ${reg.baselineCount} → ${reg.currentCount} (+${reg.currentCount - reg.baselineCount})`,
            ),
          );
        }
        console.log('');
      }
    } else if (config.format === 'console') {
      console.log(chalk.gray('No baseline found. Run with --save-baseline to create one.'));
    }
  }

  // Save baseline if requested
  if (options.saveBaseline) {
    saveBaseline(root, report);
    if (config.format === 'console') {
      console.log(chalk.green('✅ Baseline saved to .health-baseline.json'));
    }
  }

  // Output report
  const output = formatReport(report, config.format);
  console.log(output);

  // Exit code
  if (shouldFail(report, config.failOn)) {
    process.exit(1);
  }
}
