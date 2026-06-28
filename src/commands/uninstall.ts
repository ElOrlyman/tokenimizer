import type { Command } from 'commander';
import { getSkill, loadSkillContent } from '../core/registry.js';
import { resolveTargetFile, uninstallSkill } from '../core/installer.js';
import { detectAssistants } from '../core/detector.js';
import { ui, out, json, isJsonMode, isDryRun } from '../ui/io.js';
import { theme, icon } from '../ui/theme.js';
import { reportError } from '../ui/errors.js';
import { suggest } from '../utils/suggest.js';
import { loadRegistry } from '../core/registry.js';
import type { AssistantId } from '../types/config.js';

export function registerUninstall(program: Command): void {
  program
    .command('uninstall <skill-id>')
    .description('Remove a skill from all detected assistants')
    .option('--target <ids>', 'Comma-separated assistant IDs')
    .action(async (skillId: string, opts) => {
      const cwd   = process.cwd();
      const skill = getSkill(skillId);

      if (!skill) {
        const suggestion = suggest(skillId, loadRegistry().map(s => s.id));
        reportError({
          title:       `Unknown skill: ${skillId}`,
          suggestions: [
            suggestion ? `Did you mean: ${suggestion}?` : '',
            'Run tokenimizer list --installed to see what is installed.',
          ].filter(Boolean),
        });
      }

      const detected   = detectAssistants(cwd);
      const targetIds: AssistantId[] = opts.target
        ? (opts.target as string).split(',').map((s: string) => s.trim()) as AssistantId[]
        : detected.map(d => d.id);

      const dryRun  = isDryRun();
      const results: Array<{ target: string; result: string }> = [];

      for (const targetId of targetIds) {
        const targetFile = resolveTargetFile(targetId, cwd);
        const result     = uninstallSkill(skillId, targetFile, dryRun);
        results.push({ target: targetId, result });
      }

      if (isJsonMode()) {
        json({ skillId, dryRun, results });
        return;
      }

      ui('');
      for (const r of results) {
        if (r.result === 'removed') {
          ui(`  ${icon.prune} ${theme.ok('Removed')} ${theme.bold(skillId)} ${theme.dim('from')} ${r.target}`);
        } else if (r.result === 'not-found') {
          ui(`  ${theme.dim(icon.warn + ' Not installed in')} ${r.target}`);
        } else {
          ui(`  ${theme.info('~')} ${theme.dim('[dry-run] would remove')} ${theme.bold(skillId)} ${theme.dim('from')} ${r.target}`);
        }
      }
      ui('');
    });
}
