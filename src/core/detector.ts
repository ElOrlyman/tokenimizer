import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { appData, home } from '../utils/paths.js';
import type { AssistantId, DetectedAssistant } from '../types/config.js';

interface AssistantSpec {
  id:           AssistantId;
  globalPaths:  string[];     // checked for global install
  projectFiles: string[];     // checked relative to cwd
  binaries:     string[];     // checked in PATH
}

const SPECS: AssistantSpec[] = [
  {
    id: 'claude-code',
    globalPaths:  [home('.claude'), appData('Claude')],
    projectFiles: ['.claude', '.claude/CLAUDE.md'],
    binaries:     ['claude'],
  },
  {
    id: 'cursor',
    globalPaths:  [home('.cursor'), appData('Cursor')],
    projectFiles: ['.cursorrules', '.cursor'],
    binaries:     ['cursor'],
  },
  {
    id: 'copilot',
    globalPaths:  [appData('Code'), home('.config/Code')],
    projectFiles: ['.github/copilot-instructions.md'],
    binaries:     [],
  },
  {
    id: 'windsurf',
    globalPaths:  [home('.windsurf'), appData('Windsurf')],
    projectFiles: ['.windsurfrules', '.windsurf'],
    binaries:     ['windsurf'],
  },
  {
    id: 'aider',
    globalPaths:  [home('.aider.conf.yml')],
    projectFiles: ['.aider.conf.yml', '.aiderignore'],
    binaries:     ['aider'],
  },
];

function inPath(binary: string): boolean {
  try {
    const cmd = process.platform === 'win32' ? `where ${binary}` : `which ${binary}`;
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function detectAssistants(cwd: string): DetectedAssistant[] {
  const results: DetectedAssistant[] = [];

  for (const spec of SPECS) {
    const signals: string[] = [];
    let globalPath:  string | null = null;
    let projectPath: string | null = null;

    // Global install signals
    for (const p of spec.globalPaths) {
      if (fs.existsSync(p)) {
        signals.push(`global: ${p}`);
        globalPath = globalPath ?? p;
      }
    }

    // Project-level signals
    for (const f of spec.projectFiles) {
      const full = path.join(cwd, f);
      if (fs.existsSync(full)) {
        signals.push(`project: ${f}`);
        projectPath = projectPath ?? full;
      }
    }

    // PATH binary signals
    for (const bin of spec.binaries) {
      if (inPath(bin)) {
        signals.push(`PATH: ${bin}`);
      }
    }

    if (signals.length === 0) continue;

    const confidence: 'high' | 'medium' | 'low' =
      projectPath ? 'high' : globalPath ? 'medium' : 'low';

    results.push({ id: spec.id, confidence, globalPath, projectPath, signals });
  }

  return results;
}
