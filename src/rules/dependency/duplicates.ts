import { Rule, RuleResult, RunContext } from '../../types';
import { parseLockfileDependencies } from '../../utils';

/**
 * dep/duplicates — Detects duplicate package versions in the lockfile.
 */
export const duplicateDepsRule: Rule = {
  meta: {
    id: 'dep/duplicates',
    title: 'Duplicate Dependency Versions',
    description:
      'Parses the lockfile (package-lock.json, yarn.lock, or pnpm-lock.yaml) to detect ' +
      'packages that are installed in multiple versions, increasing bundle size and potential conflicts.',
    category: 'dependency',
    defaultSeverity: 'warn',
    fixHint:
      'Run `npm dedupe` or `npx yarn-deduplicate` to reduce duplicate versions. ' +
      'Consider using `overrides` (npm) or `resolutions` (yarn) to pin a single version.',
  },

  async run(ctx: RunContext): Promise<RuleResult> {
    const evidence: RuleResult['evidence'] = [];
    const deps = parseLockfileDependencies(ctx.root);

    if (!deps) {
      return {
        id: this.meta.id,
        title: this.meta.title,
        severity: 'info',
        evidence: [{ message: 'No lockfile found — skipping duplicate check.' }],
        fixHint: this.meta.fixHint,
      };
    }

    // Group by package name (strip nested path)
    const versionMap = new Map<string, Set<string>>();
    for (const dep of deps) {
      // Normalize name: strip nested node_modules paths
      const baseName = dep.name.includes('node_modules/')
        ? dep.name.split('node_modules/').pop()!
        : dep.name;

      if (!versionMap.has(baseName)) {
        versionMap.set(baseName, new Set());
      }
      versionMap.get(baseName)!.add(dep.version);
    }

    for (const [name, versions] of versionMap.entries()) {
      if (versions.size > 1) {
        evidence.push({
          message: `${name} has ${versions.size} versions: ${[...versions].join(', ')}`,
          meta: { package: name, versions: [...versions] },
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
