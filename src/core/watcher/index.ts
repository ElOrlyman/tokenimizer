import fs from 'fs';
import path from 'path';
import { writeAtomic, ensureDir } from '../../utils/fs.js';

const WATCHER_DIR   = (cwd: string) => path.join(cwd, '.tokenimizer', 'watcher');
const PID_FILE      = (cwd: string) => path.join(WATCHER_DIR(cwd), 'pid');
const LOG_FILE      = (cwd: string) => path.join(WATCHER_DIR(cwd), 'watcher.log');
const STALE_FILE    = (cwd: string) => path.join(cwd, '.tokenimizer', 'cache', 'stale.json');

export interface WatcherStatus {
  running:  boolean;
  pid:      number | null;
  logPath:  string;
  stalePath: string;
}

// ---------------------------------------------------------------------------
// PID management
// ---------------------------------------------------------------------------

function writePid(cwd: string, pid: number): void {
  ensureDir(WATCHER_DIR(cwd));
  writeAtomic(PID_FILE(cwd), String(pid));
}

function readPid(cwd: string): number | null {
  const p = PID_FILE(cwd);
  if (!fs.existsSync(p)) return null;
  const n = parseInt(fs.readFileSync(p, 'utf8').trim(), 10);
  return (isNaN(n) || n <= 1) ? null : n;
}

function isProcessRunning(pid: number): boolean {
  // Refuse to interact with PID 0 (broadcast) or PID 1 (init/systemd)
  if (pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Staleness tracking
// ---------------------------------------------------------------------------

export interface StaleEntry {
  file:       string;
  modifiedAt: string;
  reason:     string;
}

function readStale(cwd: string): StaleEntry[] {
  const p = STALE_FILE(cwd);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
}

function appendStale(cwd: string, entry: StaleEntry): void {
  ensureDir(path.dirname(STALE_FILE(cwd)));
  const existing = readStale(cwd).filter(e => e.file !== entry.file);
  existing.push(entry);
  writeAtomic(STALE_FILE(cwd), JSON.stringify(existing.slice(-50), null, 2));
}

function log(cwd: string, msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE(cwd), line);
}

// ---------------------------------------------------------------------------
// Source file patterns that, when changed, make the index stale
// ---------------------------------------------------------------------------

const TRACKED_PATTERNS = [
  '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx',
  'package.json', 'tsconfig.json',
  'README.md', 'CONTRIBUTING.md',
];

const IGNORE_PATTERNS = [
  '**/node_modules/**', '**/.git/**', '**/dist/**',
  '**/build/**', '**/.tokenimizer/**', '**/*.min.*',
];

// ---------------------------------------------------------------------------
// Start watcher — spawns a detached background process
// ---------------------------------------------------------------------------

export async function startWatcher(cwd: string): Promise<{ pid: number }> {
  const existing = readPid(cwd);
  if (existing && isProcessRunning(existing)) {
    return { pid: existing };
  }

  const { spawn } = await import('child_process');
  ensureDir(WATCHER_DIR(cwd));

  // Spawn self with --watcher-daemon flag in detached mode
  const child = spawn(
    process.execPath,
    [process.argv[1], '--watcher-daemon', '--watcher-cwd', cwd],
    {
      detached:  true,
      stdio:     'ignore',
      env:       { ...process.env },
    },
  );

  child.unref();

  const pid = child.pid;
  if (pid == null) {
    throw new Error('Failed to spawn watcher process');
  }
  writePid(cwd, pid);
  return { pid };
}

// ---------------------------------------------------------------------------
// Stop watcher
// ---------------------------------------------------------------------------

export function stopWatcher(cwd: string): { stopped: boolean; pid: number | null } {
  const pid = readPid(cwd);
  if (!pid) return { stopped: false, pid: null };

  if (isProcessRunning(pid)) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch { /* already dead */ }
  }

  const pidFile = PID_FILE(cwd);
  if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
  return { stopped: true, pid };
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export function watcherStatus(cwd: string): WatcherStatus {
  const pid     = readPid(cwd);
  const running = pid !== null && isProcessRunning(pid);

  if (!running && pid !== null) {
    const pidFile = PID_FILE(cwd);
    if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
  }

  return {
    running,
    pid:      running ? pid : null,
    logPath:  LOG_FILE(cwd),
    stalePath: STALE_FILE(cwd),
  };
}

// ---------------------------------------------------------------------------
// Daemon entry point — runs inside spawned child process
// ---------------------------------------------------------------------------

export async function runDaemon(cwd: string): Promise<void> {
  const chokidar = await import('chokidar');

  log(cwd, `Watcher daemon started (pid=${process.pid})`);
  writePid(cwd, process.pid);

  const watcher = chokidar.watch(TRACKED_PATTERNS, {
    cwd,
    ignored:          IGNORE_PATTERNS,
    ignoreInitial:    true,
    persistent:       true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  const onChanged = (filePath: string, reason: string): void => {
    log(cwd, `${reason}: ${filePath}`);
    appendStale(cwd, {
      file:       filePath,
      modifiedAt: new Date().toISOString(),
      reason,
    });
  };

  watcher.on('change', f => onChanged(f, 'changed'));
  watcher.on('add',    f => onChanged(f, 'added'));
  watcher.on('unlink', f => onChanged(f, 'deleted'));

  watcher.on('error', err => log(cwd, `Error: ${err}`));

  // Graceful shutdown
  process.on('SIGTERM', () => {
    log(cwd, 'Daemon stopping (SIGTERM)');
    watcher.close().then(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    log(cwd, 'Daemon stopping (SIGINT)');
    watcher.close().then(() => process.exit(0));
  });
}

export function getStaleFiles(cwd: string): StaleEntry[] {
  return readStale(cwd);
}

export function clearStale(cwd: string): void {
  const p = STALE_FILE(cwd);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
