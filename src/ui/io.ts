// UI chrome → stderr, data → stdout, errors → stderr always.
// JSON mode suppresses all human-facing chrome so piping works cleanly.

let _jsonMode = false;
let _dryRun   = false;

export function setJsonMode(v: boolean): void { _jsonMode = v; }
export function setDryRun(v: boolean): void   { _dryRun = v; }
export function isJsonMode(): boolean  { return _jsonMode; }
export function isDryRun(): boolean    { return _dryRun; }

/** Human-facing chrome — stderr only, silent in --json mode */
export function ui(s: string): void {
  if (!_jsonMode) process.stderr.write(s + '\n');
}

/** Machine-readable output — stdout always */
export function out(s: string): void {
  process.stdout.write(s + '\n');
}

/** Errors and warnings — stderr always */
export function err(s: string): void {
  process.stderr.write(s + '\n');
}

/** Emit structured JSON to stdout */
export function json(obj: unknown): void {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}
