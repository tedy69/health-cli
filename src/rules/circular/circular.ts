import * as path from 'node:path';
import { Rule, RuleResult, RunContext, Evidence } from '../../types';
import { globFiles, readFileContent } from '../../utils';

/**
 * circular/imports — Detects circular dependency chains in the project.
 * Uses a custom DFS-based graph traversal (no external dependency on madge).
 */
export const circularDepsRule: Rule = {
  meta: {
    id: 'circular/imports',
    title: 'Circular Dependencies',
    description:
      'Builds an import graph from all source files and detects circular dependency chains. ' +
      'Circular deps can cause initialization bugs, increased bundle size, and hard-to-debug issues.',
    category: 'circular',
    defaultSeverity: 'high',
    fixHint:
      'Refactor circular imports by extracting shared types/utils into a separate module, ' +
      'or use dependency inversion. Consider barrel-file restructuring.',
  },

  async run(ctx: RunContext): Promise<RuleResult> {
    const evidence: Evidence[] = [];

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

    // Build adjacency list
    const graph = new Map<string, string[]>();
    const importPathRegex = /(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    for (const file of files) {
      const content = readFileContent(path.join(ctx.root, file));
      if (!content) continue;

      const deps: string[] = [];
      const fileDir = path.dirname(file);

      for (const regex of [importPathRegex, requireRegex]) {
        let match;
        const tempRegex = new RegExp(regex.source, 'g');
        while ((match = tempRegex.exec(content)) !== null) {
          const importPath = match[1];
          if (!importPath.startsWith('.')) continue; // skip node_modules

          const resolved = resolveImport(fileDir, importPath, files);
          if (resolved) {
            deps.push(resolved);
          }
        }
      }

      graph.set(file, deps);
    }

    // DFS cycle detection
    const cycles = findCycles(graph);

    // Deduplicate cycles (same set of files = same cycle)
    const seen = new Set<string>();
    for (const cycle of cycles) {
      const key = [...cycle].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);

      evidence.push({
        message: `Circular dependency chain: ${cycle.join(' → ')} → ${cycle[0]}`,
        meta: { chain: cycle },
      });
    }

    const maxEvidence = 30;
    const trimmed = evidence.slice(0, maxEvidence);
    if (evidence.length > maxEvidence) {
      trimmed.push({ message: `... and ${evidence.length - maxEvidence} more circular chains.` });
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

/**
 * Resolve a relative import path to a known file.
 */
function resolveImport(fromDir: string, importPath: string, knownFiles: string[]): string | null {
  const resolved = path.normalize(path.join(fromDir, importPath));
  const candidates = [
    resolved,
    resolved + '.ts',
    resolved + '.tsx',
    resolved + '.js',
    resolved + '.jsx',
    path.join(resolved, 'index.ts'),
    path.join(resolved, 'index.tsx'),
    path.join(resolved, 'index.js'),
  ];

  for (const candidate of candidates) {
    if (knownFiles.includes(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Find all cycles in a directed graph using iterative DFS.
 */
function findCycles(graph: Map<string, string[]>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string): void {
    if (inStack.has(node)) {
      // Found a cycle — extract it
      const cycleStart = stack.indexOf(node);
      if (cycleStart >= 0) {
        cycles.push(stack.slice(cycleStart));
      }
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    stack.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor);
    }

    stack.pop();
    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    dfs(node);
  }

  return cycles;
}
