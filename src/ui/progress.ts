import { theme, icon } from './theme.js';
import { ui } from './io.js';

export class Steps {
  constructor(title: string) {
    ui(`\n${icon.scan} ${theme.bold(title)}`);
  }

  step(label: string, detail?: string): void {
    const tail = detail !== undefined ? theme.dim(`  ${detail}`) : '';
    ui(`  ${theme.ok('✓')} ${label}${tail}`);
  }

  warn(label: string): void {
    ui(`  ${icon.warn} ${theme.warn(label)}`);
  }

  info(label: string): void {
    ui(`  ${icon.hook} ${theme.dim(label)}`);
  }

  done(): void {
    ui('');
  }
}
