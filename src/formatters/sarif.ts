import { HealthReport, Severity } from '../types';

/**
 * Format a health report as SARIF (Static Analysis Results Interchange Format)
 * for GitHub code scanning integration.
 */
export function formatSarif(report: HealthReport): string {
  const sarif = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'health-cli',
            version: '1.0.0',
            informationUri: 'https://github.com/health-cli/health-cli',
            rules: report.results.map((r) => ({
              id: r.id,
              name: r.title,
              shortDescription: { text: r.title },
              defaultConfiguration: {
                level: sarifLevel(r.severity),
              },
              helpUri: `https://github.com/health-cli/health-cli#${r.id}`,
              help: {
                text: r.fixHint,
                markdown: `**Fix:** ${r.fixHint}`,
              },
            })),
          },
        },
        results: report.results.flatMap((r) =>
          r.evidence
            .filter((e) => e.file)
            .map((e) => ({
              ruleId: r.id,
              level: sarifLevel(r.severity),
              message: { text: e.message },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: {
                      uri: e.file,
                      uriBaseId: '%SRCROOT%',
                    },
                    region: {
                      startLine: e.line || 1,
                    },
                  },
                },
              ],
            })),
        ),
        columnKind: 'utf16CodeUnits',
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

function sarifLevel(severity: Severity): string {
  switch (severity) {
    case 'high':
      return 'error';
    case 'warn':
      return 'warning';
    case 'info':
      return 'note';
  }
}
