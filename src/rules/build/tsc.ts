import { Rule, RuleResult, RunContext, Evidence, ExecError } from '../../types';
import { fileExists, resolveFrom } from '../../utils';
import { execSync } from 'node:child_process';

/**
 * build/tsc — Runs TypeScript compiler check (optional).
 */
export const tscCheckRule: Rule = {
  meta: {
    id: 'build/tsc',
    title: 'TypeScript Compile Check',
    description:
      'Runs `tsc --noEmit` to check for TypeScript compilation errors. ' +
      'Only runs if a tsconfig.json is present.',
    category: 'build',
    defaultSeverity: 'high',
    fixHint: 'Fix the TypeScript errors reported by the compiler.',
  },

  async run(ctx: RunContext): Promise<RuleResult> {
    const evidence: Evidence[] = [];

    if (!fileExists(resolveFrom(ctx.root, 'tsconfig.json'))) {
      return {
        id: this.meta.id,
        title: this.meta.title,
        severity: 'info',
        evidence: [{ message: 'No tsconfig.json found — skipping TypeScript check.' }],
        fixHint: this.meta.fixHint,
      };
    }

    try {
      // Try to find local tsc first, then global
      const tscPath = fileExists(resolveFrom(ctx.root, 'node_modules/.bin/tsc'))
        ? resolveFrom(ctx.root, 'node_modules/.bin/tsc')
        : 'tsc';

      execSync(`${tscPath} --noEmit --pretty false`, {
        cwd: ctx.root,
        encoding: 'utf-8',
        timeout: 120_000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err: unknown) {
      const execErr = err as ExecError;
      const output: string = execErr.stdout || execErr.stderr || '';
      const lines = output.split('\n').filter((l: string) => l.trim());

      // Parse tsc output: file(line,col): error TS1234: message
      const errorRegex = /^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/;
      let errorCount = 0;

      for (const line of lines) {
        const match = line.match(errorRegex);
        if (match) {
          errorCount++;
          if (errorCount <= 20) {
            evidence.push({
              file: match[1],
              line: parseInt(match[2], 10),
              message: `${match[4]}: ${match[5]}`,
            });
          }
        }
      }

      if (errorCount > 20) {
        evidence.push({ message: `... and ${errorCount - 20} more TypeScript errors.` });
      }

      if (errorCount === 0 && lines.length > 0) {
        evidence.push({ message: `tsc failed: ${lines[0]}` });
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
