import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import { PackageLockShape, NpmV1DepEntry } from '../types';

/**
 * Read and parse a JSON file, returning null on failure.
 */
export function readJson<T = unknown>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Check if a file exists.
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * List files matching glob patterns relative to root.
 */
export async function globFiles(
  patterns: string[],
  root: string,
  ignore: string[] = [],
): Promise<string[]> {
  return fg(patterns, { cwd: root, ignore, dot: true, absolute: false });
}

/**
 * Get file size in bytes. Returns 0 if file doesn't exist.
 */
export function getFileSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

/**
 * Resolve a path relative to root.
 */
export function resolveFrom(root: string, ...segments: string[]): string {
  return path.resolve(root, ...segments);
}

/**
 * Read file content as string, null on failure.
 */
export function readFileContent(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Parse a lockfile to extract dependency version mappings.
 * Supports package-lock.json (v2/v3) and yarn.lock (v1 basic).
 */
export function parseLockfileDependencies(
  root: string,
): { name: string; version: string }[] | null {
  // Try package-lock.json first
  const pkgLockPath = path.join(root, 'package-lock.json');
  if (fs.existsSync(pkgLockPath)) {
    const lock = readJson<PackageLockShape>(pkgLockPath);
    if (lock?.packages) {
      const deps: { name: string; version: string }[] = [];
      for (const [key, val] of Object.entries(lock.packages)) {
        if (key === '') continue; // root
        const name = key.replace(/^node_modules\//, '');
        if (val.version) {
          deps.push({ name, version: val.version });
        }
      }
      return deps;
    }
    if (lock?.dependencies) {
      return flattenNpmV1Deps(lock.dependencies);
    }
  }

  // Try yarn.lock (basic parsing)
  const yarnLockPath = path.join(root, 'yarn.lock');
  if (fs.existsSync(yarnLockPath)) {
    return parseYarnLock(yarnLockPath);
  }

  // Try pnpm-lock.yaml
  const pnpmLockPath = path.join(root, 'pnpm-lock.yaml');
  if (fs.existsSync(pnpmLockPath)) {
    // Basic pnpm parsing
    return parsePnpmLock(pnpmLockPath);
  }

  return null;
}

function flattenNpmV1Deps(
  deps: Record<string, NpmV1DepEntry>,
  prefix = '',
): { name: string; version: string }[] {
  const result: { name: string; version: string }[] = [];
  for (const [name, val] of Object.entries(deps)) {
    const fullName = prefix ? `${prefix}/node_modules/${name}` : name;
    if (val.version) {
      result.push({ name: fullName, version: val.version });
    }
    if (val.dependencies) {
      result.push(...flattenNpmV1Deps(val.dependencies, fullName));
    }
  }
  return result;
}

function parseYarnLock(filePath: string): { name: string; version: string }[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const deps: { name: string; version: string }[] = [];
  const lines = content.split('\n');
  let currentPkg: string | null = null;

  for (const line of lines) {
    // Match package header like: "lodash@^4.17.0":
    const headerMatch = line.match(/^"?(@?[^@"]+)@[^"]*"?:?\s*$/);
    if (headerMatch) {
      currentPkg = headerMatch[1];
      continue;
    }
    // Match version line
    if (currentPkg && line.match(/^\s+version\s+"?([^"]+)"?\s*$/)) {
      const versionMatch = line.match(/^\s+version\s+"?([^"]+)"?\s*$/);
      if (versionMatch) {
        deps.push({ name: currentPkg, version: versionMatch[1] });
      }
      currentPkg = null;
    }
  }
  return deps;
}

function parsePnpmLock(filePath: string): { name: string; version: string }[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const deps: { name: string; version: string }[] = [];
  // Simple regex for pnpm: /@?scope/name/version or /name/version
  const pkgRegex = /^\s+\/?(@?[^:]+):\s*([\d.]+)/gm;
  let match;
  while ((match = pkgRegex.exec(content)) !== null) {
    deps.push({ name: match[1], version: match[2] });
  }
  return deps;
}
