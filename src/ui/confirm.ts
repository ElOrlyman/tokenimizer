import readline from 'readline';
import { theme } from './theme.js';

export function confirm(question: string, defaultYes = false): Promise<boolean> {
  return new Promise(resolve => {
    const hint = defaultYes ? theme.dim(' [Y/n]') : theme.dim(' [y/N]');
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    process.stderr.write(question + hint + ' ');
    rl.question('', answer => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      resolve(trimmed === '' ? defaultYes : trimmed.startsWith('y'));
    });
  });
}
