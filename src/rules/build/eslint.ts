import {
  Rule,
  RuleResult,
  RunContext,
  Evidence,
  PackageJsonShape,
  EslintFileResult,
  ExecError,
} from '../../types';
import { fileExists, resolveFrom, readJson } from '../../utils';
import { execSync } from 'node:child_process';

/**
 * build/eslint — Runs ESLint quick check (optional).
 */
export const eslintCheckRule: Rule = {
  meta: {
    id: 'build/eslint',
    title: 'ESLint Quick Check',
    description:
      'Runs ESLint to detect code quality and style issues. ' +
      'Only runs if an ESLint config is detected in the project.',
    category: 'build',
    defaultSeverity: 'warn',
    fixHint: 'Fix ESLint errors: `npx eslint --fix .`',
  },

  async run(ctx: RunContext): Promise<RuleResult> {
    const evidence: Evidence[] = [];

    // Check for ESLint config
    const eslintConfigs = [
      '.eslintrc',
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc.yaml',
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.cjs',
    ];

    const pkg = readJson<PackageJsonShape>(resolveFrom(ctx.root, 'package.json'));
    const hasEslintConfig =
      eslintConfigs.some((c) => fileExists(resolveFrom(ctx.root, c))) ||
      pkg?.eslintConfig !== undefined;

    if (!hasEslintConfig) {
      return {
        id: this.meta.id,
        title: this.meta.title,
        severity: 'info',
        evidence: [{ message: 'No ESLint config found — skipping lint check.' }],
        fixHint: this.meta.fixHint,
      };
    }

    const eslintBin = fileExists(resolveFrom(ctx.root, 'node_modules/.bin/eslint'))
      ? resolveFrom(ctx.root, 'node_modules/.bin/eslint')
      : 'eslint';

    try {
      const output = execSync(
        `${eslintBin} . --format json --max-warnings 0 --no-error-on-unmatched-pattern`,
        {
          cwd: ctx.root,
          encoding: 'utf-8',
          timeout: 120_000,
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );

      const results = JSON.parse(output) as EslintFileResult[];
      let errorCount = 0;
      let warningCount = 0;

      for (const result of results) {
        errorCount += result.errorCount ?? 0;
        warningCount += result.warningCount ?? 0;

        if (result.messages) {
          for (const msg of result.messages.slice(0, 5)) {
            evidence.push({
              file: result.filePath?.replace(ctx.root + '/', '') ?? 'unknown',
              line: msg.line,
              message: `[${msg.severity === 2 ? 'error' : 'warn'}] ${msg.message ?? ''} (${msg.ruleId ?? 'unknown'})`,
            });
          }
        }
      }

      if (errorCount + warningCount > evidence.length) {
        evidence.push({
          message: `Total: ${errorCount} errors, ${warningCount} warnings across ${results.length} files.`,
        });
      }
    } catch (err: unknown) {
      // ESLint exits non-zero when there are issues
      const execErr = err as ExecError;
      const errOutput = execErr.stdout ?? '';
      try {
        const results = JSON.parse(errOutput) as EslintFileResult[];
        let errorCount = 0;
        let warningCount = 0;
        let shown = 0;

        for (const result of results) {
          errorCount += result.errorCount ?? 0;
          warningCount += result.warningCount ?? 0;

          if (result.messages && shown < 20) {
            for (const msg of result.messages.slice(0, 3)) {
              if (shown >= 20) break;
              evidence.push({
                file: result.filePath?.replace(ctx.root + '/', '') ?? 'unknown',
                line: msg.line,
                message: `[${msg.severity === 2 ? 'error' : 'warn'}] ${msg.message ?? ''} (${msg.ruleId ?? 'unknown'})`,
              });
              shown++;
            }
          }
        }

        evidence.push({
          message: `Total: ${errorCount} errors, ${warningCount} warnings.`,
        });
      } catch {
        evidence.push({
          message: `ESLint execution failed: ${(execErr.message ?? '').slice(0, 200)}`,
        });
      }
    }

    return {
      id: this.meta.id,
      title: this.meta.title,
      severity: evidence.length > 0 ? this.meta.defaultSeverity : 'info',
      evidence,
      fixHint: this.meta.fixHint,
    };
  },
};
