import { theme, icon } from './theme.js';
import { err } from './io.js';

export interface CliError {
  title: string;
  detail?: string;
  suggestions?: string[];
  exitCode?: number;
}

export function reportError(e: CliError): never {
  err('');
  err(`  ${icon.err}  ${theme.error(theme.bold(e.title))}`);

  if (e.detail) {
    err('');
    for (const line of e.detail.split('\n')) {
      err('     ' + line);
    }
  }

  if (e.suggestions && e.suggestions.length > 0) {
    err('');
    for (const s of e.suggestions) {
      err(`     ${theme.dim(icon.arrow + ' ')}${s}`);
    }
  }

  err('');
  process.exit(e.exitCode ?? 1);
}
