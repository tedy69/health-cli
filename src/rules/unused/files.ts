import * as path from 'node:path';
import { Rule, RuleResult, RunContext } from '../../types';
import { globFiles, readFileContent } from '../../utils';

/**
 * unused/files — Detects orphan files that are not imported by any other file.
 */
export const orphanFilesRule: Rule = {
  meta: {
    id: 'unused/files',
    title: 'Orphan Files',
    description:
      'Detects source files that are not imported or referenced by any other file in the project. ' +
      'These orphan files may be dead code that should be removed.',
    category: 'unused',
    defaultSeverity: 'warn',
    fixHint:
      'Remove orphan files or add them to your entry points. ' +
      'If they are scripts, config, or test files, add them to the ignore list.',
  },

  async run(ctx: RunContext): Promise<RuleResult> {
    const evidence: RuleResult['evidence'] = [];

    const files = await globFiles(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'], ctx.root, [
      ...ctx.config.ignore,
      '**/*.d.ts',
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.config.*',
      '**/jest.*',
      '**/vite.*',
      '**/webpack.*',
      '**/rollup.*',
      '**/tsconfig.*',
    ]);

    if (files.length === 0) {
      return {
        id: this.meta.id,
        title: this.meta.title,
        severity: 'info',
        evidence: [],
        fixHint: this.meta.fixHint,
      };
    }

    // Build a set of all files referenced via imports
    const referencedFiles = new Set<string>();
    const importPathRegex = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g;

    for (const file of files) {
      const content = readFileContent(path.join(ctx.root, file));
      if (!content) continue;

      let match;
      const tempRegex = new RegExp(importPathRegex.source, 'g');
      while ((match = tempRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          // Resolve relative import
          const dir = path.dirname(file);
          const resolved = path.normalize(path.join(dir, importPath));
          // Try with various extensions
          for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js']) {
            referencedFiles.add(resolved + ext);
          }
        }
      }
    }

    // Entry-point heuristics: keep index files, main, bin
    const entryPatterns = [
      'index.ts',
      'index.js',
      'main.ts',
      'main.js',
      'cli.ts',
      'cli.js',
      'app.ts',
      'app.js',
    ];

    for (const file of files) {
      const basename = path.basename(file);
      // Skip entry points
      if (entryPatterns.includes(basename)) continue;

      // Check if any variant is referenced
      const fileWithoutExt = file.replace(/\.\w+$/, '');
      const isReferenced =
        referencedFiles.has(file) ||
        referencedFiles.has(fileWithoutExt) ||
        referencedFiles.has(fileWithoutExt + '.ts') ||
        referencedFiles.has(fileWithoutExt + '.tsx') ||
        referencedFiles.has(fileWithoutExt + '.js') ||
        referencedFiles.has(fileWithoutExt + '.jsx');

      if (!isReferenced) {
        evidence.push({
          file,
          message: `File "${file}" is not imported by any other file in the project.`,
        });
      }
    }

    const maxEvidence = 50;
    const trimmed = evidence.slice(0, maxEvidence);
    if (evidence.length > maxEvidence) {
      trimmed.push({ message: `... and ${evidence.length - maxEvidence} more orphan files.` });
    }

    return {
      id: this.meta.id,
      title: this.meta.title,
      severity: trimmed.length > 0 ? this.meta.defaultSeverity : 'info',
      evidence: trimmed,
      fixHint: this.meta.fixHint,
    };
  },
};
