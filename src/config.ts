import * as fs from 'node:fs';
import * as path from 'node:path';
import { HealthConfig, DEFAULT_CONFIG, PackageJsonShape } from './types';

const CONFIG_FILES = ['.healthrc.json', '.healthrc', 'health.config.json'];

/**
 * Load configuration from disk, merging with defaults.
 */
export function loadConfig(root: string): HealthConfig {
  for (const filename of CONFIG_FILES) {
    const filePath = path.join(root, filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const userConfig = JSON.parse(content) as Partial<HealthConfig>;
        return mergeConfig(DEFAULT_CONFIG, userConfig);
      } catch {
        // Ignore parse errors, use defaults
      }
    }
  }

  // Check package.json for "health" key
  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as PackageJsonShape;
      if (pkg.health) {
        return mergeConfig(DEFAULT_CONFIG, pkg.health);
      }
    } catch {
      // Ignore
    }
  }

  return { ...DEFAULT_CONFIG };
}

function mergeConfig(base: HealthConfig, overrides: Partial<HealthConfig>): HealthConfig {
  return {
    ignore: overrides.ignore ?? base.ignore,
    rules: { ...base.rules, ...(overrides.rules || {}) },
    failOn: overrides.failOn ?? base.failOn,
    format: overrides.format ?? base.format,
    hugeSizeThreshold: overrides.hugeSizeThreshold ?? base.hugeSizeThreshold,
    outdatedThreshold: overrides.outdatedThreshold ?? base.outdatedThreshold,
  };
}
