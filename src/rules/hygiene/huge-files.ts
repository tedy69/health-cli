import * as path from 'node:path';
import { Rule, RuleResult, RunContext, Evidence } from '../../types';
import { globFiles, getFileSize } from '../../utils';

/**
 * hygiene/huge-files — Detects accidentally committed huge files.
 */
export const hugeFilesRule: Rule = {
  meta: {
    id: 'hygiene/huge-files',
    title: 'Huge Files Committed',
    description:
      'Scans for files larger than a configurable threshold (default: 1 MB). ' +
      'Large files such as binaries, datasets, or compiled bundles should not be in version control.',
    category: 'hygiene',
    defaultSeverity: 'high',
    fixHint:
      'Remove large files from the repo using `git filter-branch` or BFG Repo-Cleaner. ' +
      'Add patterns to .gitignore. Consider Git LFS for assets that must be tracked.',
  },

  async run(ctx: RunContext): Promise<RuleResult> {
    const evidence: Evidence[] = [];
    const threshold = ctx.config.hugeSizeThreshold;

    const files = await globFiles(['**/*'], ctx.root, [...ctx.config.ignore, '**/.git/**']);

    for (const file of files) {
      const size = getFileSize(path.join(ctx.root, file));
      if (size > threshold) {
        const sizeMB = (size / 1_000_000).toFixed(2);
        evidence.push({
          file,
          message: `File is ${sizeMB} MB (threshold: ${(threshold / 1_000_000).toFixed(1)} MB)`,
          meta: { size, threshold },
        });
      }
    }

    // Sort by size descending
    evidence.sort((a, b) => {
      const sizeA = (a.meta?.size as number) || 0;
      const sizeB = (b.meta?.size as number) || 0;
      return sizeB - sizeA;
    });

    return {
      id: this.meta.id,
      title: this.meta.title,
      severity: evidence.length > 0 ? this.meta.defaultSeverity : 'info',
      evidence: evidence.slice(0, 20),
      fixHint: this.meta.fixHint,
    };
  },
};
