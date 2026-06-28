/**
 * Interactive multi-select checkbox prompt.
 * All UI → stderr so --json consumers on stdout are unaffected.
 * Hotkeys: [↑↓] navigate · [space] toggle · [a] all · [n] none
 *          · [enter] confirm · [q] cancel · Ctrl+C exit 130
 */
import readline, { type Key } from 'readline';
import { theme, priorityIcon } from './theme.js';

export interface CheckboxItem {
  id:       string;
  priority: 'required' | 'strongly_recommended' | 'optional';
  label:    string;
  hint?:    string;
}

export function checkboxPrompt(items: CheckboxItem[], message: string): Promise<string[]> {
  return new Promise(resolve => {
    const selected = new Set<string>(
      items.filter(s => s.priority === 'required').map(s => s.id),
    );
    let cursor = 0;

    const rl = readline.createInterface({ input: process.stdin, terminal: false });
    readline.emitKeypressEvents(process.stdin, rl);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    process.stderr.write('\x1b[?25l'); // hide cursor

    const cols  = () => process.stdout.columns || 80;
    const trunc = (s: string, max: number) => s.length > max ? s.slice(0, max - 1) + '…' : s;
    const TOTAL_LINES = items.length + 3;

    const render = () => {
      const count    = selected.size;
      const total    = items.length;
      const reqCount = items.filter(s => s.priority === 'required').length;

      process.stderr.write(
        `${theme.info(message)}  ${theme.dim(`(${count}/${total} selected · ${reqCount} required)`)}\n`,
      );

      for (let i = 0; i < items.length; i++) {
        const item       = items[i];
        const isCursor   = i === cursor;
        const isSelected = selected.has(item.id);

        const cursorStr  = isCursor ? theme.info('▶ ') : '  ';
        const checkbox   = isSelected ? `[${theme.ok('x')}]` : theme.dim('[ ]');
        const pIcon      = priorityIcon(item.priority);
        const idStr      = isCursor ? theme.bold(trunc(item.id, 26)) : theme.dim(trunc(item.id, 26));
        const labelStr   = trunc(item.label, 32);
        const hintStr    = item.hint ? theme.dim('  ' + trunc(item.hint, 22)) : '';

        const line = `${cursorStr}${checkbox} ${pIcon}  ${idStr.padEnd(26)}  ${labelStr}${hintStr}`;
        process.stderr.write(line.slice(0, cols() - 1) + '\n');
      }

      process.stderr.write(
        '\n' +
        theme.dim('  [↑↓] navigate · [space] toggle · [a] all · [n] none · [enter] confirm · [q] cancel') +
        '\n',
      );
    };

    const clearRender = () => {
      for (let i = 0; i < TOTAL_LINES; i++) {
        process.stderr.write('\x1b[1A\x1b[2K');
      }
    };

    const cleanup = (code?: number) => {
      process.stderr.write('\x1b[?25h'); // restore cursor
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.removeListener('keypress', onKeypress);
      rl.close();
      if (code !== undefined) {
        process.stderr.write('\n');
        process.exit(code);
      }
      process.stderr.write('\n');
    };

    render();

    const onKeypress = (_str: string, key: Key) => {
      clearRender();

      if (key.ctrl && key.name === 'c') {
        process.stderr.write(theme.warn('Cancelled.\n'));
        cleanup(130);
        return;
      }

      switch (key.name) {
        case 'q':
          cleanup();
          resolve([]);
          return;
        case 'up':
          cursor = (cursor - 1 + items.length) % items.length;
          break;
        case 'down':
          cursor = (cursor + 1) % items.length;
          break;
        case 'space': {
          const s = items[cursor];
          selected.has(s.id) ? selected.delete(s.id) : selected.add(s.id);
          break;
        }
        case 'a':
          items.forEach(s => selected.add(s.id));
          break;
        case 'n':
          selected.clear();
          break;
        case 'return':
        case 'enter':
          cleanup();
          resolve(Array.from(selected));
          return;
      }

      render();
    };

    process.stdin.on('keypress', onKeypress);
  });
}
