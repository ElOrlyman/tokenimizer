import fs from 'fs';
import path from 'path';
import { writeAtomic, ensureDir } from '../../utils/fs.js';
import type { HookName } from '../../types/hook.js';

// ---------------------------------------------------------------------------
// Hook script content — what runs when the git event fires
// ---------------------------------------------------------------------------

// These scripts are written to .tokenimizer/hooks/<name>.js and called by
// the git hook shim. They use execSync to call the tokenimizer CLI, so they
// work regardless of how tokenimizer was installed (global, local, npx).
//
// All scripts are non-blocking: they catch errors and never fail the git op.

const SCRIPT_HEADER = `#!/usr/bin/env node
'use strict';
// Managed by tokenimizer — regenerate with: tokenimizer hooks install
const { execSync } = require('child_process');
const cwd = process.cwd();

function run(cmd) {
  try {
    execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, TOKENIMIZER_HOOK: '1' } });
  } catch (_) {
    // Non-blocking — never fail a git operation due to tokenimizer
  }
}

function findBin() {
  // Try global first, then local node_modules, then npx
  const bins = [
    'tokenimizer',
    require('path').join(cwd, 'node_modules', '.bin', 'tokenimizer'),
  ];
  for (const b of bins) {
    try {
      execSync(b + ' --version', { stdio: 'ignore' });
      return b;
    } catch (_) {}
  }
  return null;
}

const bin = findBin();
if (!bin) process.exit(0); // tokenimizer not found — skip silently
`;

const HOOK_SCRIPTS: Record<HookName, string> = {
  'post-commit': SCRIPT_HEADER + `
// post-commit: regenerate project_summary + handoff after each commit
run(bin + ' context refresh --json');
`,

  'post-checkout': SCRIPT_HEADER + `
// post-checkout: refresh handoff and current_task after branch switch
// Only on branch checkout (not file checkout): $3 === '1'
const args = process.argv.slice(2);
const isBranchCheckout = args[2] === '1';
if (isBranchCheckout) {
  run(bin + ' context refresh --json');
}
`,

  'post-merge': SCRIPT_HEADER + `
// post-merge: rebuild repo memory index after merge/pull
run(bin + ' index --json');
`,

  'pre-push': SCRIPT_HEADER + `
// pre-push: warn (non-blocking) if context docs are stale
const fs = require('fs');
const path = require('path');

const STALE_FILE = path.join(cwd, '.tokenimizer', 'cache', 'stale.json');
if (fs.existsSync(STALE_FILE)) {
  try {
    const stale = JSON.parse(fs.readFileSync(STALE_FILE, 'utf8'));
    if (stale.length > 0) {
      process.stderr.write(
        '\\n[tokenimizer] ' + stale.length + ' file(s) changed since last index.\\n' +
        '[tokenimizer] Run: tokenimizer index\\n\\n'
      );
    }
  } catch (_) {}
}
// Always exit 0 — pre-push warning only, never block
process.exit(0);
`,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function writeHookScripts(cwd: string): void {
  const dir = path.join(cwd, '.tokenimizer', 'hooks');
  ensureDir(dir);

  for (const [name, content] of Object.entries(HOOK_SCRIPTS) as Array<[HookName, string]>) {
    writeAtomic(path.join(dir, `${name}.js`), content);
  }
}

export function removeHookScripts(cwd: string): void {
  const dir = path.join(cwd, '.tokenimizer', 'hooks');
  for (const name of Object.keys(HOOK_SCRIPTS) as HookName[]) {
    const p = path.join(dir, `${name}.js`);
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* ignore */ }
  }
}
