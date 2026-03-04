import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';

/**
 * Autofix hooks — generate template files for common hygiene issues.
 */
export interface AutofixResult {
  file: string;
  action: 'created' | 'skipped';
  message: string;
}

const TEMPLATES: Record<string, string> = {
  LICENSE: `MIT License

Copyright (c) ${new Date().getFullYear()} [Your Name or Organization]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`,

  'SECURITY.md': `# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| x.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue.
2. Email [security@example.com](mailto:security@example.com) with details.
3. Include steps to reproduce, if possible.

We will acknowledge your report within 48 hours and provide a timeline for a fix.
`,

  CODEOWNERS: `# Code Owners
# See: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

# Default owners for everything in the repo
* @your-org/your-team
`,

  'README.md': `# Project Name

> A brief description of your project.

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

See [LICENSE](LICENSE).
`,
};

/**
 * Run autofix: create missing template files.
 */
export function runAutofix(root: string): AutofixResult[] {
  const results: AutofixResult[] = [];

  for (const [filename, template] of Object.entries(TEMPLATES)) {
    const filePath = path.join(root, filename);

    if (fs.existsSync(filePath)) {
      results.push({
        file: filename,
        action: 'skipped',
        message: `${filename} already exists`,
      });
    } else {
      fs.writeFileSync(filePath, template);
      results.push({
        file: filename,
        action: 'created',
        message: `Created ${filename} from template`,
      });
    }
  }

  return results;
}

/**
 * Format autofix results for console output.
 */
export function formatAutofixResults(results: AutofixResult[]): string {
  const lines: string[] = ['', chalk.bold.underline('🔧 Autofix Results'), ''];

  for (const r of results) {
    if (r.action === 'created') {
      lines.push(chalk.green(`  ✅ ${r.message}`));
    } else {
      lines.push(chalk.gray(`  ⏭  ${r.message}`));
    }
  }

  lines.push('');
  return lines.join('\n');
}
