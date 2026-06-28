import fs from 'fs';
import path from 'path';
import { RegistryIndexSchema } from '../types/skill.js';
import type { SkillMeta } from '../types/skill.js';
import type { AssistantId } from '../types/config.js';
import { registryDir } from '../utils/paths.js';

let _cache: SkillMeta[] | null = null;

export function loadRegistry(): SkillMeta[] {
  if (_cache) return _cache;

  const dir      = registryDir();
  const indexPath = path.join(dir, 'index.json');

  if (!fs.existsSync(indexPath)) {
    throw new Error(`Registry index not found at ${indexPath}`);
  }

  const raw    = fs.readFileSync(indexPath, 'utf8');
  const parsed = RegistryIndexSchema.parse(JSON.parse(raw));
  _cache = parsed.skills;
  return _cache;
}

export function getSkill(id: string): SkillMeta | null {
  return loadRegistry().find(s => s.id === id) ?? null;
}

/** Load the per-assistant content file for a skill. Returns null if not found. */
export function loadSkillContent(skillId: string, target: AssistantId): string | null {
  const dir  = registryDir();
  const exts = target === 'aider' ? ['yml', 'yaml'] : ['md', 'txt'];

  for (const ext of exts) {
    const p = path.join(dir, 'skills', skillId, `${target}.${ext}`);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }

  // Fall back to a generic content file
  for (const ext of ['md', 'txt']) {
    const p = path.join(dir, 'skills', skillId, `generic.${ext}`);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }

  return null;
}
