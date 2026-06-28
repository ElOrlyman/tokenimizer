import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/** Atomic write: write to a temp file, then rename into place. */
export function writeAtomic(filePath: string, content: string): void {
  const dir  = path.dirname(filePath);
  const tmp  = path.join(dir, `.tokenimizer_tmp_${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

/** Read a file, returning null if it doesn't exist. */
export function readOrNull(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/** SHA-256 hash of a string or file content. */
export function hashString(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

export function hashFile(filePath: string): string | null {
  const content = readOrNull(filePath);
  return content === null ? null : hashString(content);
}

/** Ensure a directory exists. */
export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

/** Check if a file exists. */
export function exists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
