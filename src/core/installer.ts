import fs from 'fs';
import path from 'path';
import { writeAtomic, readOrNull, ensureDir } from '../utils/fs.js';
import { home } from '../utils/paths.js';
import type { AssistantId } from '../types/config.js';

// ---------------------------------------------------------------------------
// Target file resolution — where each assistant's config lives
// ---------------------------------------------------------------------------

export interface TargetFile {
  path:   string;    // absolute path to the config file
  format: 'markdown' | 'plaintext' | 'yaml';
}

export function resolveTargetFile(assistantId: AssistantId, cwd: string, global = false): TargetFile {
  switch (assistantId) {
    case 'claude-code':
      return {
        path:   global ? home('.claude', 'CLAUDE.md') : path.join(cwd, '.claude', 'CLAUDE.md'),
        format: 'markdown',
      };
    case 'cursor':
      return {
        path:   global ? home('.cursor', 'rules') : path.join(cwd, '.cursorrules'),
        format: 'plaintext',
      };
    case 'copilot':
      return {
        path:   path.join(cwd, '.github', 'copilot-instructions.md'),
        format: 'markdown',
      };
    case 'windsurf':
      return {
        path:   global ? home('.windsurf', 'rules') : path.join(cwd, '.windsurfrules'),
        format: 'plaintext',
      };
    case 'aider':
      return {
        path:   global ? home('.aider.conf.yml') : path.join(cwd, '.aider.conf.yml'),
        format: 'yaml',
      };
  }
}

// ---------------------------------------------------------------------------
// Section fence markers
// ---------------------------------------------------------------------------

function beginMarker(skillId: string, format: 'markdown' | 'plaintext' | 'yaml'): string {
  if (format === 'yaml') return `# tokenimizer:skill:${skillId}:begin`;
  return `<!-- tokenimizer:skill:${skillId}:begin -->`;
}

function endMarker(skillId: string, format: 'markdown' | 'plaintext' | 'yaml'): string {
  if (format === 'yaml') return `# tokenimizer:skill:${skillId}:end`;
  return `<!-- tokenimizer:skill:${skillId}:end -->`;
}

// ---------------------------------------------------------------------------
// Install / uninstall / check
// ---------------------------------------------------------------------------

/** Returns true if the skill fence is already present in the file. */
export function isInstalled(skillId: string, filePath: string, format: 'markdown' | 'plaintext' | 'yaml'): boolean {
  const content = readOrNull(filePath);
  if (!content) return false;
  return content.includes(beginMarker(skillId, format));
}

/** Append skill content between fence markers. Returns false if already installed. */
export function installSkill(
  skillId:     string,
  skillContent: string,
  target:      TargetFile,
  dryRun:      boolean,
): 'installed' | 'already-installed' | 'dry-run' {
  const { path: filePath, format } = target;

  if (isInstalled(skillId, filePath, format)) {
    return 'already-installed';
  }

  const begin = beginMarker(skillId, format);
  const end   = endMarker(skillId, format);
  const block = `\n${begin}\n${skillContent.trim()}\n${end}\n`;

  if (dryRun) return 'dry-run';

  ensureDir(path.dirname(filePath));

  const existing = readOrNull(filePath) ?? '';
  writeAtomic(filePath, existing + block);
  return 'installed';
}

/** Remove the skill fence block from the file. Returns false if not found. */
export function uninstallSkill(
  skillId:  string,
  target:   TargetFile,
  dryRun:   boolean,
): 'removed' | 'not-found' | 'dry-run' {
  const { path: filePath, format } = target;
  const content = readOrNull(filePath);
  if (!content) return 'not-found';

  const begin = beginMarker(skillId, format);
  const end   = endMarker(skillId, format);

  if (!content.includes(begin)) return 'not-found';

  if (dryRun) return 'dry-run';

  // Remove everything from begin to end (inclusive), plus leading newline
  const pattern = new RegExp(`\\n?${escapeRegex(begin)}[\\s\\S]*?${escapeRegex(end)}\\n?`, 'g');
  const updated = content.replace(pattern, '\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  writeAtomic(filePath, updated);
  return 'removed';
}

/** Check status of a skill's fence in a file. */
export function checkSkill(
  skillId:      string,
  skillContent: string,
  target:       TargetFile,
): 'healthy' | 'missing' | 'modified' {
  const { path: filePath, format } = target;
  const content = readOrNull(filePath);
  if (!content) return 'missing';

  const begin = beginMarker(skillId, format);
  const end   = endMarker(skillId, format);

  if (!content.includes(begin)) return 'missing';

  // Extract what's between the markers
  const pattern = new RegExp(`${escapeRegex(begin)}([\\s\\S]*?)${escapeRegex(end)}`);
  const match   = content.match(pattern);
  if (!match) return 'missing';

  const installed = match[1].trim();
  const expected  = skillContent.trim();
  return installed === expected ? 'healthy' : 'modified';
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
