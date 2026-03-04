import chalk from 'chalk';
import { RuleMeta } from '../types';

/**
 * Print a table of all available rules.
 */
export function printRulesList(rules: RuleMeta[]): void {
  console.log('');
  console.log(chalk.bold.underline('📋 Available Health Rules'));
  console.log('');

  const grouped = new Map<string, RuleMeta[]>();
  for (const rule of rules) {
    const cat = rule.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(rule);
  }

  for (const [category, categoryRules] of grouped.entries()) {
    console.log(chalk.bold(`  ${categoryIcon(category)} ${category.toUpperCase()}`));
    for (const rule of categoryRules) {
      const sev = severityBadge(rule.defaultSeverity);
      console.log(`    ${sev} ${chalk.white(rule.id.padEnd(25))} ${chalk.gray(rule.title)}`);
    }
    console.log('');
  }
}

/**
 * Print detailed explanation for a specific rule.
 */
export function printRuleExplanation(rule: RuleMeta): void {
  console.log('');
  console.log(chalk.bold.underline(`📖 Rule: ${rule.id}`));
  console.log('');
  console.log(chalk.bold('  Title:      ') + rule.title);
  console.log(chalk.bold('  Category:   ') + rule.category);
  console.log(
    chalk.bold('  Severity:   ') + severityBadge(rule.defaultSeverity) + ' ' + rule.defaultSeverity,
  );
  console.log('');
  console.log(chalk.bold('  Description:'));
  // Word-wrap description at 70 chars
  const words = rule.description.split(' ');
  let line = '    ';
  for (const word of words) {
    if (line.length + word.length > 74) {
      console.log(line);
      line = '    ';
    }
    line += word + ' ';
  }
  if (line.trim()) console.log(line);
  console.log('');
  console.log(chalk.bold('  Fix Hint:'));
  console.log(chalk.cyan(`    ${rule.fixHint}`));
  console.log('');
}

function categoryIcon(category: string): string {
  switch (category) {
    case 'dependency':
      return '📦';
    case 'unused':
      return '🗑️';
    case 'circular':
      return '🔄';
    case 'hygiene':
      return '🧹';
    case 'build':
      return '🔨';
    default:
      return '📌';
  }
}

function severityBadge(severity: string): string {
  switch (severity) {
    case 'high':
      return chalk.bgRed.white(' HIGH ');
    case 'warn':
      return chalk.bgYellow.black(' WARN ');
    case 'info':
      return chalk.bgBlue.white(' INFO ');
    default:
      return chalk.bgGray.white(` ${severity.toUpperCase()} `);
  }
}
