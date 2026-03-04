import { Rule } from '../types';
import { outdatedDepsRule, duplicateDepsRule } from './dependency';
import { unusedExportsRule, orphanFilesRule } from './unused';
import { circularDepsRule } from './circular';
import { missingFilesRule, hugeFilesRule } from './hygiene';
import { tscCheckRule, eslintCheckRule } from './build';

/**
 * All built-in rules, ordered by category.
 */
export const allRules: Rule[] = [
  // Dependency audit
  outdatedDepsRule,
  duplicateDepsRule,

  // Unused code
  unusedExportsRule,
  orphanFilesRule,

  // Circular dependencies
  circularDepsRule,

  // Repo hygiene
  missingFilesRule,
  hugeFilesRule,

  // Build signals
  tscCheckRule,
  eslintCheckRule,
];
