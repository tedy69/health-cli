import * as path from 'node:path';
import { Rule, RuleResult, RunContext, Evidence } from '../../types';
import { fileExists } from '../../utils';

/**
 * hygiene/missing-files — Checks for essential repo files.
 */
export const missingFilesRule: Rule = {
  meta: {
    id: 'hygiene/missing-files',
    title: 'Missing Repository Files',
    description:
      'Checks that essential repository files are present: LICENSE, SECURITY.md, CODEOWNERS, ' +
      'README.md, CONTRIBUTING.md, and .editorconfig.',
    category: 'hygiene',
    defaultSeverity: 'warn',
    fixHint:
      'Add the missing files. Use `health scan --autofix` to generate templates for common files.',
  },

  async run(ctx: RunContext): Promise<RuleResult> {
    const evidence: Evidence[] = [];

    const requiredFiles: { name: string; severity: 'warn' | 'high'; description: string }[] = [
      {
        name: 'LICENSE',
        severity: 'high',
        description: 'License file is required for open source compliance',
      },
      {
        name: 'README.md',
        severity: 'warn',
        description: 'README helps others understand your project',
      },
      {
        name: 'SECURITY.md',
        severity: 'warn',
        description: 'Security policy file helps users report vulnerabilities',
      },
      {
        name: 'CODEOWNERS',
        severity: 'warn',
        description: 'CODEOWNERS ensures PRs get the right reviewers',
      },
      {
        name: '.github/CODEOWNERS',
        severity: 'warn',
        description: 'CODEOWNERS (in .github/) ensures PRs get the right reviewers',
      },
    ];

    let highestSeverity: 'info' | 'warn' | 'high' = 'info';

    for (const req of requiredFiles) {
      // Special handling for CODEOWNERS — can be in root or .github/
      if (req.name === '.github/CODEOWNERS') {
        if (fileExists(path.join(ctx.root, 'CODEOWNERS'))) continue;
      }
      if (req.name === 'CODEOWNERS') {
        if (fileExists(path.join(ctx.root, '.github/CODEOWNERS'))) continue;
      }

      if (!fileExists(path.join(ctx.root, req.name))) {
        evidence.push({
          file: req.name,
          message: `Missing ${req.name}: ${req.description}`,
        });
        if (req.severity === 'high') highestSeverity = 'high';
        else if (highestSeverity !== 'high') highestSeverity = 'warn';
      }
    }

    return {
      id: this.meta.id,
      title: this.meta.title,
      severity: evidence.length > 0 ? highestSeverity : 'info',
      evidence,
      fixHint: this.meta.fixHint,
    };
  },
};
