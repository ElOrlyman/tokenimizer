import fs from 'fs';
import path from 'path';
import { writeAtomic, readOrNull, ensureDir, exists } from '../utils/fs.js';
import { backupsDir, restoreMapPath } from '../utils/paths.js';
import type { RestoreMap } from '../types/config.js';

function loadRestoreMap(cwd: string): RestoreMap {
  const raw = readOrNull(restoreMapPath(cwd));
  if (!raw) return { version: '1', backups: [] };
  try {
    return JSON.parse(raw) as RestoreMap;
  } catch {
    return { version: '1', backups: [] };
  }
}

function saveRestoreMap(cwd: string, map: RestoreMap): void {
  writeAtomic(restoreMapPath(cwd), JSON.stringify(map, null, 2));
}

/** Back up a file before modifying it. Returns the backup path. */
export function backupFile(cwd: string, originalPath: string): string {
  const bDir      = backupsDir(cwd);
  const filename  = path.basename(originalPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(bDir, `${filename}.${timestamp}.bak`);

  ensureDir(bDir);

  if (exists(originalPath)) {
    fs.copyFileSync(originalPath, backupPath);
  } else {
    // Record that the file didn't exist so restore can delete it
    fs.writeFileSync(backupPath, '__TOKENIMIZER_NEW_FILE__', 'utf8');
  }

  const map = loadRestoreMap(cwd);
  const alreadyBacked = map.backups.some(b => b.originalPath === originalPath);
  if (!alreadyBacked) {
    map.backups.push({
      originalPath,
      backupPath,
      backedUpAt: new Date().toISOString(),
    });
    saveRestoreMap(cwd, map);
  }

  return backupPath;
}

/** Restore all backed-up files to their original paths. */
export function restoreAll(cwd: string): Array<{ originalPath: string; status: 'restored' | 'deleted' | 'skipped' }> {
  const map     = loadRestoreMap(cwd);
  const results = [];

  for (const entry of map.backups) {
    if (!exists(entry.backupPath)) {
      results.push({ originalPath: entry.originalPath, status: 'skipped' as const });
      continue;
    }

    const content = fs.readFileSync(entry.backupPath, 'utf8');
    if (content === '__TOKENIMIZER_NEW_FILE__') {
      // File didn't exist before tokenimizer — remove it
      if (exists(entry.originalPath)) fs.unlinkSync(entry.originalPath);
      results.push({ originalPath: entry.originalPath, status: 'deleted' as const });
    } else {
      ensureDir(path.dirname(entry.originalPath));
      writeAtomic(entry.originalPath, content);
      results.push({ originalPath: entry.originalPath, status: 'restored' as const });
    }
  }

  // Clear the restore map
  saveRestoreMap(cwd, { version: '1', backups: [] });
  return results;
}

/** Restore a single file. */
export function restoreFile(cwd: string, originalPath: string): 'restored' | 'deleted' | 'not-found' {
  const map   = loadRestoreMap(cwd);
  const entry = map.backups.find(b => b.originalPath === originalPath);
  if (!entry || !exists(entry.backupPath)) return 'not-found';

  const content = fs.readFileSync(entry.backupPath, 'utf8');
  if (content === '__TOKENIMIZER_NEW_FILE__') {
    if (exists(originalPath)) fs.unlinkSync(originalPath);
    return 'deleted';
  }
  ensureDir(path.dirname(originalPath));
  writeAtomic(originalPath, content);
  return 'restored';
}

export function listBackups(cwd: string): RestoreMap['backups'] {
  return loadRestoreMap(cwd).backups;
}
