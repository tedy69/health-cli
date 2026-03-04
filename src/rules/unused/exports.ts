import * as path from 'node:path';
import { Rule, RuleResult, RunContext } from '../../types';
import { globFiles, readFileContent } from '../../utils';

/**
 * unused/exports — Detects exported symbols from TypeScript files
 * that are not imported anywhere else in the project.
 */
export const unusedExportsRule: Rule = {
  meta: {
    id: 'unused/exports',
    title: 'Unused Exports',
    description:
      'Scans TypeScript/JavaScript files for exported symbols (named exports) ' +
      'and checks whether they are imported by any other file in the project. ' +
      'Unused exports add cognitive overhead and can indicate dead code.',
    category: 'unused',
    defaultSeverity: 'warn',
    fixHint:
      'Remove unused exports or convert them to non-exported local symbols. ' +
      'If they are part of a public API, consider adding to ignore list.',
  },

  async run(ctx: RunContext): Promise<RuleResult> {
    const evidence: RuleResult['evidence'] = [];

    const files = await globFiles(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'], ctx.root, [
      ...ctx.config.ignore,
      '**/*.d.ts',
      '**/*.test.*',
      '**/*.spec.*',
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

    // Phase 1: Collect all named exports
    const exportMap = new Map<string, { file: string; line: number }[]>();
    const exportNameRegex =
      /export\s+(?:const|let|var|function|class|enum|interface|type|abstract\s+class)\s+(\w+)/g;
    const exportNamedRegex = /export\s*\{([^}]+)\}/g;

    for (const file of files) {
      const content = readFileContent(path.join(ctx.root, file));
      if (!content) continue;

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Direct named exports
        let match;
        const tempRegex1 = new RegExp(exportNameRegex.source, 'g');
        while ((match = tempRegex1.exec(line)) !== null) {
          const name = match[1];
          if (!exportMap.has(name)) exportMap.set(name, []);
          exportMap.get(name)!.push({ file, line: i + 1 });
        }

        // Re-exports: export { foo, bar }
        const tempRegex2 = new RegExp(exportNamedRegex.source, 'g');
        while ((match = tempRegex2.exec(line)) !== null) {
          const names = match[1].split(',').map((n) => {
            const parts = n.trim().split(/\s+as\s+/);
            return parts[parts.length - 1].trim();
          });
          for (const name of names) {
            if (name && name !== 'default') {
              if (!exportMap.has(name)) exportMap.set(name, []);
              exportMap.get(name)!.push({ file, line: i + 1 });
            }
          }
        }
      }
    }

    // Phase 2: Scan all files for import usage
    const usedNames = new Set<string>();
    const importNameRegex = /import\s*\{([^}]+)\}/g;
    const dynamicImportRegex = /import\s*\(/g;

    for (const file of files) {
      const content = readFileContent(path.join(ctx.root, file));
      if (!content) continue;

      let match;
      const tempRegex = new RegExp(importNameRegex.source, 'g');
      while ((match = tempRegex.exec(content)) !== null) {
        const names = match[1].split(',').map((n) => {
          const parts = n.trim().split(/\s+as\s+/);
          return parts[0].trim(); // original name before 'as'
        });
        names.forEach((n) => {
          if (n) usedNames.add(n);
        });
      }
    }

    // Phase 3: Report unused exports
    for (const [name, locations] of exportMap.entries()) {
      if (!usedNames.has(name)) {
        // Don't flag index files (barrel exports) or entry points
        for (const loc of locations) {
          const basename = path.basename(loc.file);
          if (basename === 'index.ts' || basename === 'index.js') continue;
          evidence.push({
            file: loc.file,
            line: loc.line,
            message: `Export "${name}" is not imported anywhere in the project.`,
          });
        }
      }
    }

    // Limit noise
    const maxEvidence = 50;
    const trimmed = evidence.slice(0, maxEvidence);
    if (evidence.length > maxEvidence) {
      trimmed.push({
        message: `... and ${evidence.length - maxEvidence} more unused exports.`,
      });
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
