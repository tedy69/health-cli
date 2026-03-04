# health-cli

> One command to produce an actionable health report for JS/TS projects: dependency risk, dead code, circular deps, bundle risks, repo hygiene.

## Install

```bash
npm install -g health-cli
# or use locally
npx health-cli scan
```

## Quick Start

```bash
# Run all health checks (human-readable output)
health scan

# JSON report for CI artifacts
health scan --format json

# SARIF for GitHub code scanning
health scan --format sarif > health.sarif

# Fail CI if high-severity issues found
health scan --fail-on high

# List all available rules
health rules

# Explain a specific rule
health explain dep/outdated
```

## Commands

| Command                   | Description                                           |
| ------------------------- | ----------------------------------------------------- |
| `health scan`             | Run all health checks and produce a diagnostic report |
| `health rules`            | List all available health check rules                 |
| `health explain <ruleId>` | Show detailed explanation and fix steps for a rule    |

### Scan Options

| Flag                    | Description                                                                |
| ----------------------- | -------------------------------------------------------------------------- |
| `-f, --format <format>` | Output format: `console`, `json`, `sarif` (default: `console`)             |
| `--fail-on <severity>`  | Exit code 1 if issues at or above severity: `info`, `warn`, `high`         |
| `--baseline`            | Compare results against `.health-baseline.json`                            |
| `--save-baseline`       | Save current results as the new baseline                                   |
| `--autofix`             | Generate missing template files (LICENSE, README, SECURITY.md, CODEOWNERS) |
| `--root <path>`         | Project root to scan (default: current directory)                          |

## Built-in Rules

### Dependency Audit

- **dep/outdated** — Flags unpinned ranges (`*`, `latest`), 0.x pre-release deps, and large dependency counts
- **dep/duplicates** — Detects duplicate package versions in lockfiles (npm, yarn, pnpm)

### Unused Code

- **unused/exports** — Finds exported symbols not imported anywhere in the project
- **unused/files** — Detects orphan files not imported by any other file

### Circular Dependencies

- **circular/imports** — DFS-based circular dependency chain detection

### Repo Hygiene

- **hygiene/missing-files** — Checks for LICENSE, README.md, SECURITY.md, CODEOWNERS
- **hygiene/huge-files** — Flags files exceeding the size threshold (default: 1 MB)

### Build Signals

- **build/tsc** — TypeScript compile check via `tsc --noEmit`
- **build/eslint** — ESLint quick run (if config is present)

## Severity Model

Each rule produces findings with a severity level:

| Level  | Meaning                                        |
| ------ | ---------------------------------------------- |
| `info` | Informational, no action required              |
| `warn` | Should be addressed, but not blocking          |
| `high` | Must be fixed, blocks CI with `--fail-on high` |

## Baselining

Store a `.health-baseline.json` so teams can adopt incrementally:

```bash
# Create initial baseline
health scan --save-baseline

# Compare future scans against baseline (flags regressions)
health scan --baseline
```

## Autofix

Generate missing template files automatically:

```bash
health scan --autofix
```

Creates templates for: LICENSE (MIT), SECURITY.md, CODEOWNERS, README.md.

## Configuration

Create a `.healthrc.json` in your project root (or add a `"health"` key to `package.json`):

```json
{
  "ignore": ["node_modules/**", "dist/**", "vendor/**"],
  "rules": {
    "build/tsc": { "enabled": false },
    "dep/outdated": { "severity": "info" },
    "hygiene/huge-files": { "enabled": true }
  },
  "hugeSizeThreshold": 2000000,
  "outdatedThreshold": 20
}
```

## Output Formats

### Console (default)

Human-readable summary with severity icons, evidence, and fix hints.

### JSON

Structured report for CI artifact storage and programmatic consumption.

### SARIF

[Static Analysis Results Interchange Format](https://sarifweb.azurewebsites.net/) for GitHub code scanning integration. Upload to GitHub:

```yaml
# .github/workflows/health.yml
- run: npx health-cli scan --format sarif > health.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: health.sarif
```

## License

MIT
