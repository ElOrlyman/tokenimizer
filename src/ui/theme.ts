import pc from 'picocolors';

let _noColor = false;
let _noEmoji = false;

export function disableColors(): void { _noColor = true; }
export function disableEmoji(): void  { _noEmoji = true; }

const isWindows          = process.platform === 'win32';
const hasWindowsTerminal = !!process.env.WT_SESSION;
const hasVSCode          = process.env.TERM_PROGRAM === 'vscode';
const nativeEmojiTerm    = !isWindows || hasWindowsTerminal || hasVSCode;

function emoji(): boolean {
  return !_noEmoji && nativeEmojiTerm;
}

function c(s: string, fn: (s: string) => string): string {
  return _noColor ? s : fn(s);
}

export const theme = {
  error:  (s: string) => c(s, pc.red),
  warn:   (s: string) => c(s, pc.yellow),
  ok:     (s: string) => c(s, pc.green),
  info:   (s: string) => c(s, pc.cyan),
  dim:    (s: string) => c(s, pc.gray),
  bold:   (s: string) => c(s, pc.bold),
  white:  (s: string) => c(s, pc.white),
  orange: (s: string) => c(s, (str) => `\x1b[38;5;208m${str}\x1b[0m`),

  priority(p: 'required' | 'strongly_recommended' | 'optional'): string {
    if (p === 'required')             return c(c('REQUIRED', pc.bold), pc.red);
    if (p === 'strongly_recommended') return c('RECOMMENDED', pc.yellow);
    return c('OPTIONAL  ', pc.green);
  },
};

export const icon = {
  get scan()     { return emoji() ? '🔍' : '>'; },
  get skill()    { return emoji() ? '📦' : '*'; },
  get ok()       { return emoji() ? '✅' : '[OK]'; },
  get warn()     { return emoji() ? '⚠️ ' : '[!]'; },
  get err()      { return emoji() ? '❌' : '[X]'; },
  get heal()     { return emoji() ? '🩺' : '[~]'; },
  get fix()      { return emoji() ? '🔧' : '[+]'; },
  get prune()    { return emoji() ? '🧹' : '[-]'; },
  get backup()   { return emoji() ? '🗂️ ' : '[b]'; },
  get hook()     { return emoji() ? '🪝' : '[h]'; },
  get lock()     { return emoji() ? '🔒' : '[L]'; },
  get required() { return emoji() ? '🔴' : '*'; },
  get strongly() { return emoji() ? '🟡' : '+'; },
  get optional() { return emoji() ? '🟢' : '-'; },
  arrow:  '→',
  bullet: '•',
};

export function priorityIcon(p: 'required' | 'strongly_recommended' | 'optional'): string {
  return p === 'required'             ? icon.required
       : p === 'strongly_recommended' ? icon.strongly
       : icon.optional;
}
