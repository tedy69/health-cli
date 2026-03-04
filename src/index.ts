#!/usr/bin/env node

import { Command } from 'commander';
import { runScan } from './commands/scan';
import { printRulesList, printRuleExplanation } from './commands/rules';
import { RuleEngine } from './engine';
import { allRules } from './rules';

const program = new Command();

program
  .name('health')
  .description('CLI for Project Health Diagnostics — actionable health reports for JS/TS projects')
  .version('1.0.0');

// ─── health scan ────────────────────────────────────────────

program
  .command('scan')
  .description('Run all health checks and produce a diagnostic report')
  .option('-f, --format <format>', 'Output format: console, json, sarif', 'console')
  .option(
    '--fail-on <severity>',
    'Exit with code 1 if issues at or above severity: info, warn, high',
  )
  .option('--baseline', 'Compare results against .health-baseline.json')
  .option('--save-baseline', 'Save current results as the new baseline')
  .option('--autofix', 'Run autofix hooks before scanning (generate missing template files)')
  .option('--root <path>', 'Project root to scan (default: current directory)')
  .action(async (opts) => {
    await runScan({
      format: opts.format,
      failOn: opts.failOn,
      baseline: opts.baseline,
      saveBaseline: opts.saveBaseline,
      autofix: opts.autofix,
      root: opts.root,
    });
  });

// ─── health rules ───────────────────────────────────────────

program
  .command('rules')
  .description('List all available health check rules')
  .action(() => {
    const engine = new RuleEngine();
    engine.registerAll(allRules);
    printRulesList(engine.listRules());
  });

// ─── health explain <rule> ──────────────────────────────────

program
  .command('explain <ruleId>')
  .description('Show detailed explanation and fix steps for a specific rule')
  .action((ruleId: string) => {
    const engine = new RuleEngine();
    engine.registerAll(allRules);
    const meta = engine.explainRule(ruleId);
    if (!meta) {
      console.error(`Unknown rule: "${ruleId}". Run \`health rules\` to see available rules.`);
      process.exit(1);
    }
    printRuleExplanation(meta);
  });

// ─── default: run scan ─────────────────────────────────────

// If no command is given, run scan
program.action(async () => {
  await runScan({ format: 'console' });
});

program.parse(process.argv);
