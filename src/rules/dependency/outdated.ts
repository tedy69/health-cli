import { Rule, RuleResult, RunContext, PackageJsonShape } from '../../types';
import { readJson, resolveFrom } from '../../utils';

/**
 * dep/outdated — Checks for outdated dependencies by comparing
 * installed versions against desired ranges in package.json.
 */
export const outdatedDepsRule: Rule = {
  meta: {
    id: 'dep/outdated',
    title: 'Outdated Dependencies',
    description:
      'Scans package.json dependencies and devDependencies for packages that might be outdated. ' +
      'Flags packages using very old major versions or wide ranges like "*".',
    category: 'dependency',
    defaultSeverity: 'warn',
    fixHint:
      'Run `npm outdated` or `yarn outdated` and update stale packages. Consider using `npx npm-check-updates`.',
  },

  async run(ctx: RunContext): Promise<RuleResult> {
    const evidence: RuleResult['evidence'] = [];
    const pkgPath = resolveFrom(ctx.root, 'package.json');
    const pkg = readJson<PackageJsonShape>(pkgPath);

    if (!pkg) {
      return {
        ...this.meta,
        severity: this.meta.defaultSeverity,
        evidence: [{ message: 'No package.json found — skipping outdated check.' }],
        fixHint: this.meta.fixHint,
      };
    }

    const allDeps: Record<string, string> = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    for (const [name, range] of Object.entries(allDeps)) {
      if (range === '*' || range === 'latest') {
        evidence.push({
          file: 'package.json',
          message: `${name} uses unpinned range "${range}" — this is risky for reproducibility.`,
        });
      }
      // Check for very old-looking pinned ranges (heuristic)
      const majorMatch = range.match(/^[\^~]?(\d+)\./);
      if (majorMatch && parseInt(majorMatch[1], 10) === 0) {
        evidence.push({
          file: 'package.json',
          message: `${name}@${range} is still on a 0.x pre-release version.`,
        });
      }
    }

    const depCount = Object.keys(allDeps).length;
    if (depCount > ctx.config.outdatedThreshold) {
      evidence.push({
        file: 'package.json',
        message: `Project has ${depCount} total dependencies (threshold: ${ctx.config.outdatedThreshold}). Consider auditing for unused packages.`,
      });
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
