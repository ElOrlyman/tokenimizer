import fs from 'fs';
import path from 'path';
import { writeAtomic, readOrNull, ensureDir, exists } from '../../utils/fs.js';
import type { HookName, HookStatus } from '../../types/hook.js';
import { ALL_HOOKS } from '../../types/hook.js';

const TOKENIMIZER_TAG   = '# tokenimizer-hook-begin';
const TOKENIMIZER_END   = '# tokenimizer-hook-end';
const TOKENIMIZER_CALL  = (name: HookName) =>
  `\n${TOKENIMIZER_TAG}\n# Managed by tokenimizer — do not edit manually\n` +
  `node "$(git rev-parse --show-toplevel)/.tokenimizer/hooks/${name}.js" "$@" || true\n` +
  `${TOKENIMIZER_END}\n`;

function hooksDir(cwd: string): string {
  // Find .git directory
  const gitDir = path.join(cwd, '.git');
  if (!exists(gitDir)) throw new Error('Not a git repository (no .git directory found).');
  return path.join(gitDir, 'hooks');
}

function hookPath(cwd: string, name: HookName): string {
  return path.join(hooksDir(cwd), name);
}

/** Install a tokenimizer call into a git hook file, co-existing with existing content. */
export function installHook(cwd: string, name: HookName, dryRun: boolean): 'installed' | 'already-installed' | 'dry-run' {
  const hp      = hookPath(cwd, name);
  const existing = readOrNull(hp) ?? '';

  if (existing.includes(TOKENIMIZER_TAG)) return 'already-installed';
  if (dryRun) return 'dry-run';

  ensureDir(path.dirname(hp));

  let content: string;
  if (existing.trim() === '') {
    content = `#!/bin/sh\n${TOKENIMIZER_CALL(name)}`;
  } else {
    // Append to existing hook — ensure shebang stays at top
    content = existing.trimEnd() + '\n' + TOKENIMIZER_CALL(name);
  }

  writeAtomic(hp, content);
  fs.chmodSync(hp, 0o755);
  return 'installed';
}

/** Remove tokenimizer's section from a hook file. */
export function uninstallHook(cwd: string, name: HookName, dryRun: boolean): 'removed' | 'not-found' | 'dry-run' {
  const hp      = hookPath(cwd, name);
  const content = readOrNull(hp);
  if (!content || !content.includes(TOKENIMIZER_TAG)) return 'not-found';

  if (dryRun) return 'dry-run';

  const pattern = new RegExp(`\\n?${escapeRegex(TOKENIMIZER_TAG)}[\\s\\S]*?${escapeRegex(TOKENIMIZER_END)}\\n?`, 'g');
  const updated = content.replace(pattern, '\n').replace(/\n{3,}/g, '\n\n').trimEnd();

  if (updated.trim() === '#!/bin/sh' || updated.trim() === '') {
    fs.unlinkSync(hp);
  } else {
    writeAtomic(hp, updated + '\n');
  }
  return 'removed';
}

export function hookStatus(cwd: string): HookStatus[] {
  let hDir: string;
  try { hDir = hooksDir(cwd); } catch { return []; }

  return ALL_HOOKS.map(name => {
    const hp      = path.join(hDir, name);
    const content = readOrNull(hp);
    const installed = !!(content?.includes(TOKENIMIZER_TAG));
    const shared    = !!(content && installed && content.replace(
      new RegExp(`${escapeRegex(TOKENIMIZER_TAG)}[\\s\\S]*?${escapeRegex(TOKENIMIZER_END)}`), '',
    ).trim().length > 0);
    return { name, installed, shared, lastFired: null };
  });
}

export function installAllHooks(cwd: string, dryRun: boolean) {
  return ALL_HOOKS.map(name => ({ name, result: installHook(cwd, name, dryRun) }));
}

export function uninstallAllHooks(cwd: string, dryRun: boolean) {
  return ALL_HOOKS.map(name => ({ name, result: uninstallHook(cwd, name, dryRun) }));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
