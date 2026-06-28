import type { Command } from 'commander';
import { loadRegistry, loadSkillContent } from '../core/registry.js';
import { resolveTargetFile, isInstalled } from '../core/installer.js';
import { detectAssistants } from '../core/detector.js';
import { renderSkillsTable } from '../ui/render.js';
import { ui, out, json, isJsonMode } from '../ui/io.js';
import { theme, icon } from '../ui/theme.js';
import type { AssistantId } from '../types/config.js';

export function registerList(program: Command): void {
  program
    .command('list')
    .description('Show available skills and their install status per assistant')
    .option('--installed', 'Show only installed skills')
    .option('--target <ids>', 'Comma-separated assistant IDs to check')
    .action(async (opts) => {
      const cwd      = process.cwd();
      const skills   = loadRegistry();
      const detected = detectAssistants(cwd);
      const allIds   = detected.map(d => d.id);

      const targetIds: AssistantId[] = opts.target
        ? (opts.target as string).split(',').map((s: string) => s.trim()) as AssistantId[]
        : allIds;

      const rows = skills
        .filter(skill => !opts.installed || targetIds.some(t => {
          const content = loadSkillContent(skill.id, t);
          if (!content) return false;
          const tf = resolveTargetFile(t, cwd);
          return isInstalled(skill.id, tf.path, tf.format);
        }))
        .map(skill => {
          const installedIn = targetIds.filter(t => {
            const content = loadSkillContent(skill.id, t);
            if (!content) return false;
            const tf = resolveTargetFile(t, cwd);
            return isInstalled(skill.id, tf.path, tf.format);
          });
          return { skill, installedIn, allTargets: targetIds };
        });

      if (isJsonMode()) {
        json(rows.map(r => ({
          id:          r.skill.id,
          name:        r.skill.name,
          version:     r.skill.version,
          installedIn: r.installedIn,
        })));
        return;
      }

      if (detected.length === 0) {
        ui(`\n  ${icon.warn} ${theme.warn('No AI assistants detected in this project.')}`);
        ui(`  ${theme.dim('Run')} ${theme.info('tokenimizer init')} ${theme.dim('to set up.')}\n`);
      } else {
        ui(`\n  ${theme.dim('Detected assistants:')} ${theme.info(detected.map(d => d.id).join(', '))}`);
      }

      out(renderSkillsTable(rows));

      ui(`  ${theme.dim(`${skills.length} skills available · ${rows.filter(r => r.installedIn.length > 0).length} installed`)}`);
      ui('');
    });
}
