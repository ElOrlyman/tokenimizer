import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { installHook, uninstallHook, hookStatus, installAllHooks } from '../core/hooks/manager.js';

function tmpRepoDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tokenimizer-hooks-'));
  // Create fake .git directory
  fs.mkdirSync(path.join(dir, '.git', 'hooks'), { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('installHook', () => {
  let cwd: string;

  beforeEach(() => { cwd = tmpRepoDir(); });
  afterEach(() => cleanup(cwd));

  it('installs a hook and returns installed', () => {
    const result = installHook(cwd, 'post-commit', false);
    expect(result).toBe('installed');
  });

  it('creates the hook file with shebang', () => {
    installHook(cwd, 'post-commit', false);
    const hookFile = path.join(cwd, '.git', 'hooks', 'post-commit');
    expect(fs.existsSync(hookFile)).toBe(true);
    const content = fs.readFileSync(hookFile, 'utf8');
    expect(content).toMatch(/^#!/);
  });

  it('includes tokenimizer section markers', () => {
    installHook(cwd, 'post-commit', false);
    const content = fs.readFileSync(path.join(cwd, '.git', 'hooks', 'post-commit'), 'utf8');
    expect(content).toContain('# tokenimizer-hook-begin');
    expect(content).toContain('# tokenimizer-hook-end');
  });

  it('returns already-installed on second call', () => {
    installHook(cwd, 'post-commit', false);
    const second = installHook(cwd, 'post-commit', false);
    expect(second).toBe('already-installed');
  });

  it('preserves existing hook content', () => {
    const hookFile = path.join(cwd, '.git', 'hooks', 'post-commit');
    fs.writeFileSync(hookFile, '#!/bin/sh\necho "existing hook"\n');
    installHook(cwd, 'post-commit', false);
    const content = fs.readFileSync(hookFile, 'utf8');
    expect(content).toContain('existing hook');
    expect(content).toContain('tokenimizer-hook-begin');
  });

  it('returns dry-run without writing file', () => {
    const result = installHook(cwd, 'post-commit', true);
    expect(result).toBe('dry-run');
    expect(fs.existsSync(path.join(cwd, '.git', 'hooks', 'post-commit'))).toBe(false);
  });
});

describe('uninstallHook', () => {
  let cwd: string;

  beforeEach(() => { cwd = tmpRepoDir(); });
  afterEach(() => cleanup(cwd));

  it('removes tokenimizer section from hook', () => {
    installHook(cwd, 'post-commit', false);
    const result = uninstallHook(cwd, 'post-commit', false);
    expect(result).toBe('removed');
    const hookFile = path.join(cwd, '.git', 'hooks', 'post-commit');
    expect(fs.existsSync(hookFile)).toBe(false);
  });

  it('returns not-found when hook is not installed', () => {
    const result = uninstallHook(cwd, 'post-commit', false);
    expect(result).toBe('not-found');
  });

  it('preserves existing hook content after removal', () => {
    const hookFile = path.join(cwd, '.git', 'hooks', 'post-commit');
    fs.writeFileSync(hookFile, '#!/bin/sh\necho "existing"\n');
    installHook(cwd, 'post-commit', false);
    uninstallHook(cwd, 'post-commit', false);
    const content = fs.readFileSync(hookFile, 'utf8');
    expect(content).toContain('existing');
    expect(content).not.toContain('tokenimizer-hook-begin');
  });
});

describe('hookStatus', () => {
  let cwd: string;

  beforeEach(() => { cwd = tmpRepoDir(); });
  afterEach(() => cleanup(cwd));

  it('returns 4 hook entries', () => {
    const statuses = hookStatus(cwd);
    expect(statuses).toHaveLength(4);
  });

  it('all hooks start as not installed', () => {
    const statuses = hookStatus(cwd);
    expect(statuses.every(s => !s.installed)).toBe(true);
  });

  it('shows installed after installAllHooks', () => {
    installAllHooks(cwd, false);
    const statuses = hookStatus(cwd);
    expect(statuses.every(s => s.installed)).toBe(true);
  });
});

describe('installAllHooks', () => {
  let cwd: string;

  beforeEach(() => { cwd = tmpRepoDir(); });
  afterEach(() => cleanup(cwd));

  it('installs all 4 hooks', () => {
    const results = installAllHooks(cwd, false);
    expect(results).toHaveLength(4);
    expect(results.every(r => r.result === 'installed')).toBe(true);
  });

  it('writes hook scripts to .tokenimizer/hooks/', () => {
    installAllHooks(cwd, false);
    const hooksDir = path.join(cwd, '.tokenimizer', 'hooks');
    expect(fs.existsSync(path.join(hooksDir, 'post-commit.js'))).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, 'post-checkout.js'))).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, 'post-merge.js'))).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, 'pre-push.js'))).toBe(true);
  });

  it('hook scripts contain non-blocking error handling', () => {
    installAllHooks(cwd, false);
    const script = fs.readFileSync(
      path.join(cwd, '.tokenimizer', 'hooks', 'post-commit.js'), 'utf8',
    );
    expect(script).toContain('try');
    expect(script).toContain('context refresh');
  });
});
