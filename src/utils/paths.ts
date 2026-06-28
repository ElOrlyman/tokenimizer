import path from 'path';
import os from 'os';

export function home(...parts: string[]): string {
  return path.join(os.homedir(), ...parts);
}

export function appData(...parts: string[]): string {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA ?? os.homedir(), ...parts);
  }
  return home(...parts);
}

export function tokenimizerDir(cwd: string): string {
  return path.join(cwd, '.tokenimizer');
}

export function backupsDir(cwd: string): string {
  return path.join(tokenimizerDir(cwd), 'backups');
}

export function lockfilePath(cwd: string): string {
  return path.join(tokenimizerDir(cwd), 'tokenimizer.lock.json');
}

export function restoreMapPath(cwd: string): string {
  return path.join(tokenimizerDir(cwd), 'restore.json');
}

export function registryDir(): string {
  // __dirname = dist/ in the bundle; registry/ is copied next to it by the build script.
  return path.join(__dirname, 'registry');
}
