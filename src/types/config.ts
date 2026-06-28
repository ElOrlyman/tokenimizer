import { z } from 'zod';

export const AssistantIdSchema = z.enum([
  'claude-code',
  'cursor',
  'copilot',
  'windsurf',
  'aider',
]);
export type AssistantId = z.infer<typeof AssistantIdSchema>;

export const ALL_ASSISTANT_IDS: AssistantId[] = [
  'claude-code', 'cursor', 'copilot', 'windsurf', 'aider',
];

export interface DetectedAssistant {
  id:         AssistantId;
  confidence: 'high' | 'medium' | 'low';
  globalPath: string | null;
  projectPath: string | null;
  signals:    string[];
}

export interface InstallRecord {
  skillId:   string;
  target:    AssistantId;
  filePath:  string;
  installedAt: string;
  version:   string;
}

export const LockfileSchema = z.object({
  version:  z.string(),
  installs: z.array(z.object({
    skillId:      z.string(),
    target:       AssistantIdSchema,
    filePath:     z.string(),
    installedAt:  z.string(),
    version:      z.string(),
  })),
});

export type Lockfile = z.infer<typeof LockfileSchema>;

export interface RestoreMap {
  version:  string;
  backups:  Array<{
    originalPath: string;
    backupPath:   string;
    backedUpAt:   string;
  }>;
}

// Alias used by render.ts
export type InstallStatus = 'installed' | 'not-installed' | 'modified' | 'conflict';
