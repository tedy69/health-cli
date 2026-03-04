/**
 * Core types for the health-cli diagnostic system.
 */

/** Severity levels for diagnostic rules */
export type Severity = 'info' | 'warn' | 'high';

/** A single piece of evidence produced by a rule */
export interface Evidence {
  /** File path (relative to project root) */
  file?: string;
  /** Line number, if applicable */
  line?: number;
  /** Human-readable message describing the finding */
  message: string;
  /** Optional metadata */
  meta?: Record<string, unknown>;
}

/** The result produced by a single rule execution */
export interface RuleResult {
  /** Unique rule identifier, e.g. "dep/outdated" */
  id: string;
  /** Short human-readable title */
  title: string;
  /** Severity of the findings */
  severity: Severity;
  /** Array of evidence items found */
  evidence: Evidence[];
  /** Short hint on how to fix the issue */
  fixHint: string;
  /** Duration (ms) the rule took to run */
  durationMs?: number;
}

/** Category grouping for rules */
export type RuleCategory = 'dependency' | 'unused' | 'circular' | 'hygiene' | 'build';

/** Metadata describing a rule (for listing / explain) */
export interface RuleMeta {
  id: string;
  title: string;
  description: string;
  category: RuleCategory;
  defaultSeverity: Severity;
  fixHint: string;
}

/** A rule implementation */
export interface Rule {
  meta: RuleMeta;
  /** Execute the rule against the given project root */
  run(ctx: RunContext): Promise<RuleResult>;
}

/** Context passed to every rule at execution time */
export interface RunContext {
  /** Absolute path to the project root being scanned */
  root: string;
  /** Resolved configuration */
  config: HealthConfig;
}

/** Per-rule config overrides */
export interface RuleOverride {
  enabled?: boolean;
  severity?: Severity;
  options?: Record<string, unknown>;
}

/** Top-level health-cli configuration */
export interface HealthConfig {
  /** Glob patterns to ignore */
  ignore: string[];
  /** Per-rule overrides keyed by rule id */
  rules: Record<string, RuleOverride>;
  /** Thresholds for --fail-on */
  failOn?: Severity;
  /** Output format */
  format: 'console' | 'json' | 'sarif';
  /** File size threshold in bytes for huge-file detection */
  hugeSizeThreshold: number;
  /** Max allowed outdated deps before warn */
  outdatedThreshold: number;
}

/** Complete health report */
export interface HealthReport {
  /** ISO timestamp */
  timestamp: string;
  /** Scanned project root */
  root: string;
  /** Results from all rules */
  results: RuleResult[];
  /** Summary counts */
  summary: {
    total: number;
    info: number;
    warn: number;
    high: number;
    passed: number;
  };
  /** Total scan duration ms */
  durationMs: number;
}

/** Baseline entry */
export interface BaselineEntry {
  ruleId: string;
  count: number;
}

/** Baseline file format */
export interface Baseline {
  version: number;
  createdAt: string;
  entries: BaselineEntry[];
}

/** Minimal shape of a package.json we care about */
export interface PackageJsonShape {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  eslintConfig?: unknown;
  health?: Partial<HealthConfig>;
  [key: string]: unknown;
}

/** Shape of a package-lock.json (v2/v3) */
export interface PackageLockShape {
  packages?: Record<string, { version?: string; [key: string]: unknown }>;
  dependencies?: Record<string, NpmV1DepEntry>;
}

/** Recursive npm v1 lockfile dependency entry */
export interface NpmV1DepEntry {
  version?: string;
  dependencies?: Record<string, NpmV1DepEntry>;
  [key: string]: unknown;
}

/** Shape of a single ESLint JSON result entry */
export interface EslintFileResult {
  filePath?: string;
  errorCount?: number;
  warningCount?: number;
  messages?: EslintMessage[];
}

/** Shape of a single ESLint message */
export interface EslintMessage {
  line?: number;
  column?: number;
  severity?: number;
  message?: string;
  ruleId?: string;
}

/** Error shape from child_process execSync failures */
export interface ExecError extends Error {
  stdout?: string;
  stderr?: string;
  status?: number;
}

/** Default configuration values */
export const DEFAULT_CONFIG: HealthConfig = {
  ignore: ['node_modules/**', 'dist/**', 'build/**', '.git/**', 'coverage/**'],
  rules: {},
  failOn: undefined,
  format: 'console',
  hugeSizeThreshold: 1_000_000, // 1 MB
  outdatedThreshold: 10,
};
