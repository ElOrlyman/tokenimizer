import type { Command } from 'commander';
import { loadRegistry, loadSkillContent } from '../core/registry.js';
import { resolveTargetFile, checkSkill, isInstalled } from '../core/installer.js';
import { detectAssistants } from '../core/detector.js';
import { renderDoctorTable } from '../ui/render.js';
import { ui, out, json, isJsonMode } from '../ui/io.js';
import { theme, icon } from '../ui/theme.js';
import type { AssistantId } from '../types/config.js';
import type { DoctorEntry } from '../ui/render.js';

export function registerDoctor(program: Command): void {
  program
    .command('doctor')
    .description('Health check — verify installed skills are intact and detect conflicts')
    .option('--target <ids>', 'Comma-separated assistant IDs to check')
    .action(async (opts) => {
      const cwd      = process.cwd();
      const skills   = loadRegistry();
      const detected = detectAssistants(cwd);

      if (detected.length === 0 && !opts.target) {
        ui(`\n  ${icon.warn} ${theme.warn('No AI assistants detected.')}`);
        ui(`  ${theme.dim('Run')} ${theme.info('tokenimizer init')} ${theme.dim('to set up.')}\n`);
        return;
      }

      const targetIds: AssistantId[] = opts.target
        ? (opts.target as string).split(',').map((s: string) => s.trim()) as AssistantId[]
        : detected.map(d => d.id);

      const entries: DoctorEntry[] = [];

      for (const targetId of targetIds) {
        for (const skill of skills) {
          const content = loadSkillContent(skill.id, targetId);
          if (!content) continue;

          const tf     = resolveTargetFile(targetId, cwd);
          const status = checkSkill(skill.id, content, tf);

          if (status !== 'healthy') {
            entries.push({
              target: targetId,
              skill:  skill.id,
              status,
              detail: status === 'modified'
                ? 'Skill content differs from registry — run tokenimizer install to repair'
                : 'Skill not installed in this target',
            });
          }
        }
      }

      if (isJsonMode()) {
        json({ healthy: entries.length === 0, issues: entries });
        return;
      }

      ui('');
      if (entries.length === 0) {
        ui(`  ${icon.ok} ${theme.ok('All installed skills are healthy.')}\n`);
      } else {
        ui(`  ${icon.heal} ${theme.bold('Doctor Report')}\n`);
        out(renderDoctorTable(entries));
        ui(`  ${theme.dim(`${entries.length} issue${entries.length > 1 ? 's' : ''} found.`)}`);
        ui(`  ${theme.dim('To reinstall missing/modified skills: ')}${theme.info('tokenimizer install <id>')}`);
        ui('');
      }
    });
}
