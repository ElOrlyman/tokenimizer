import type { Command } from 'commander';
import { getSkill, loadSkillContent } from '../core/registry.js';
import { resolveTargetFile, installSkill } from '../core/installer.js';
import { backupFile } from '../core/backup.js';
import { detectAssistants } from '../core/detector.js';
import { renderInstallSummary } from '../ui/render.js';
import { ui, out, err, json, isJsonMode, isDryRun } from '../ui/io.js';
import { theme, icon } from '../ui/theme.js';
import { reportError } from '../ui/errors.js';
import { suggest } from '../utils/suggest.js';
import { loadRegistry } from '../core/registry.js';
import type { AssistantId } from '../types/config.js';

export function registerInstall(program: Command): void {
  program
    .command('install <skill-id>')
    .description('Install a skill to all detected assistants (or --target to narrow scope)')
    .option('--target <ids>', 'Comma-separated assistant IDs, e.g. claude-code,cursor')
    .action(async (skillId: string, opts) => {
      const cwd   = process.cwd();
      const skill = getSkill(skillId);

      if (!skill) {
        const all        = loadRegistry().map(s => s.id);
        const suggestion = suggest(skillId, all);
        reportError({
          title:       `Unknown skill: ${skillId}`,
          detail:      `No skill with ID "${skillId}" found in the registry.`,
          suggestions: [
            suggestion ? `Did you mean: ${suggestion}?` : '',
            'Run tokenimizer list to see available skills.',
          ].filter(Boolean),
        });
      }

      const detected = detectAssistants(cwd);
      if (detected.length === 0 && !opts.target) {
        reportError({
          title:       'No AI assistants detected',
          detail:      'tokenimizer could not find any supported AI assistants in this project.',
          suggestions: [
            'Use --target to specify: --target claude-code,cursor',
            'Run tokenimizer init for a guided setup.',
          ],
        });
      }

      const targetIds: AssistantId[] = opts.target
        ? (opts.target as string).split(',').map((s: string) => s.trim()) as AssistantId[]
        : detected.map(d => d.id);

      const summary: Array<{ target: string; skill: string; action: 'installed' | 'skipped' | 'dry-run' | 'backed-up'; path?: string }> = [];
      const dryRun = isDryRun();

      for (const targetId of targetIds) {
        const content = loadSkillContent(skillId, targetId);
        if (!content) {
          ui(`  ${icon.warn} ${theme.warn(`No content file for ${skillId} → ${targetId}, skipping.`)}`);
          continue;
        }

        const targetFile = resolveTargetFile(targetId, cwd);

        if (!dryRun) {
          const backupPath = backupFile(cwd, targetFile.path);
          summary.push({ target: targetId, skill: skillId, action: 'backed-up', path: backupPath });
        }

        const result = installSkill(skillId, content, targetFile, dryRun);

        switch (result) {
          case 'installed':
            summary.push({ target: targetId, skill: skillId, action: 'installed', path: targetFile.path });
            break;
          case 'already-installed':
            summary.push({ target: targetId, skill: skillId, action: 'skipped' });
            break;
          case 'dry-run':
            summary.push({ target: targetId, skill: skillId, action: 'dry-run', path: targetFile.path });
            break;
        }
      }

      if (isJsonMode()) {
        json({ skillId, dryRun, results: summary });
        return;
      }

      ui('');
      out(renderInstallSummary(summary));

      const installed = summary.filter(s => s.action === 'installed').length;
      const skipped   = summary.filter(s => s.action === 'skipped').length;

      if (installed > 0) {
        ui(`  ${theme.ok(`✓ ${skill.name} installed in ${installed} assistant${installed > 1 ? 's' : ''}.`)}`);
      }
      if (skipped > 0) {
        ui(`  ${theme.dim(`${skipped} already installed — skipped.`)}`);
      }
      if (dryRun) {
        ui(`  ${theme.info('Dry-run mode — no files were modified.')}`);
      }
      if (installed > 0 && !dryRun) {
        ui(`  ${theme.dim('To undo: ')}${theme.info('tokenimizer restore')}`);
      }
      ui('');
    });
}
