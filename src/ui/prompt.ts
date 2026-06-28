import readline from 'readline';
import { theme } from './theme.js';

type PromptOpts = {
  default?: string;
  validate?: (v: string) => string | null;
  optional?: boolean;
};

export function prompt(question: string, opts: PromptOpts = {}): Promise<string> {
  return new Promise(resolve => {
    const suffix = opts.default
      ? theme.dim(` (${opts.default})`)
      : opts.optional ? theme.dim(' (skip)') : '';

    const ask = () => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
      process.stderr.write(question + suffix + ' ');
      rl.question('', answer => {
        rl.close();
        const value = answer.trim() || opts.default || '';
        if (!value && !opts.optional) {
          process.stderr.write(theme.warn('  Required.\n'));
          ask();
          return;
        }
        if (value && opts.validate) {
          const e = opts.validate(value);
          if (e) {
            process.stderr.write(theme.warn(`  ${e}\n`));
            ask();
            return;
          }
        }
        resolve(value);
      });
    };
    ask();
  });
}

export function pick(question: string, choices: string[], opts: { default?: number } = {}): Promise<string> {
  return new Promise(resolve => {
    const defaultIdx = opts.default ?? 0;
    const ask = () => {
      process.stderr.write('\n' + question + '\n');
      choices.forEach((c, i) => {
        const marker = i === defaultIdx ? theme.info(`${i + 1}`) : theme.dim(`${i + 1}`);
        process.stderr.write(`  ${marker}. ${c}\n`);
      });
      const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
      process.stderr.write(theme.dim(`Choice (default ${defaultIdx + 1}): `));
      rl.question('', answer => {
        rl.close();
        const raw = answer.trim();
        if (!raw) { resolve(choices[defaultIdx]); return; }
        const n = parseInt(raw, 10);
        if (isNaN(n) || n < 1 || n > choices.length) {
          process.stderr.write(theme.warn(`  Enter 1–${choices.length}.\n`));
          ask();
          return;
        }
        resolve(choices[n - 1]);
      });
    };
    ask();
  });
}
