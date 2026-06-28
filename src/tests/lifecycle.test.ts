import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { initContextDocs, refreshContextDocs, listContextDocs, contextDocPath } from '../context/lifecycle.js';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tokenimizer-lifecycle-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('initContextDocs', () => {
  let cwd: string;

  beforeEach(() => { cwd = tmpDir(); });
  afterEach(() => cleanup(cwd));

  it('creates all 6 context docs on first run', async () => {
    const result = await initContextDocs(cwd);
    expect(result.created).toHaveLength(6);
    expect(result.skipped).toHaveLength(0);
    expect(result.created).toContain('project_summary.md');
    expect(result.created).toContain('architecture.md');
    expect(result.created).toContain('session_summary.md');
    expect(result.created).toContain('progress.md');
    expect(result.created).toContain('handoff.md');
    expect(result.created).toContain('current_task.md');
  });

  it('skips existing docs on second run', async () => {
    await initContextDocs(cwd);
    const second = await initContextDocs(cwd);
    expect(second.created).toHaveLength(0);
    expect(second.skipped).toHaveLength(6);
  });

  it('force-overwrites with --force', async () => {
    await initContextDocs(cwd);
    const forced = await initContextDocs(cwd, true);
    expect(forced.created).toHaveLength(6);
    expect(forced.skipped).toHaveLength(0);
  });

  it('writes actual content to disk', async () => {
    await initContextDocs(cwd);
    const summaryPath = contextDocPath(cwd, 'project_summary.md');
    expect(fs.existsSync(summaryPath)).toBe(true);
    const content = fs.readFileSync(summaryPath, 'utf8');
    expect(content).toContain('# Project Summary');
  });

  it('includes token estimates for created files', async () => {
    const result = await initContextDocs(cwd);
    for (const name of result.created) {
      expect(result.tokens[name]).toBeGreaterThan(0);
    }
  });

  it('reads package.json name if present', async () => {
    fs.writeFileSync(
      path.join(cwd, 'package.json'),
      JSON.stringify({ name: 'my-test-project', version: '3.0.0', description: 'A test.' }),
    );
    const result = await initContextDocs(cwd);
    const content = fs.readFileSync(contextDocPath(cwd, 'project_summary.md'), 'utf8');
    expect(content).toContain('my-test-project');
    expect(content).toContain('v3.0.0');
  });
});

describe('refreshContextDocs', () => {
  let cwd: string;

  beforeEach(() => { cwd = tmpDir(); });
  afterEach(() => cleanup(cwd));

  it('regenerates only auto-docs (3 files)', async () => {
    const result = await refreshContextDocs(cwd);
    expect(result.created).toHaveLength(3);
    expect(result.created).toContain('project_summary.md');
    expect(result.created).toContain('architecture.md');
    expect(result.created).toContain('handoff.md');
  });

  it('does not regenerate user-maintained docs', async () => {
    const result = await refreshContextDocs(cwd);
    expect(result.created).not.toContain('session_summary.md');
    expect(result.created).not.toContain('progress.md');
    expect(result.created).not.toContain('current_task.md');
  });
});

describe('listContextDocs', () => {
  let cwd: string;

  beforeEach(() => { cwd = tmpDir(); });
  afterEach(() => cleanup(cwd));

  it('returns 6 entries with exists=false when not initialized', () => {
    const docs = listContextDocs(cwd);
    expect(docs).toHaveLength(6);
    expect(docs.every(d => !d.exists)).toBe(true);
    expect(docs.every(d => d.tokens === 0)).toBe(true);
  });

  it('returns exists=true after init', async () => {
    await initContextDocs(cwd);
    const docs = listContextDocs(cwd);
    expect(docs.every(d => d.exists)).toBe(true);
    expect(docs.every(d => d.tokens > 0)).toBe(true);
  });
});
