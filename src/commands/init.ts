import type { Command } from 'commander';
import { detectAssistants } from '../core/detector.js';
import { loadRegistry, loadSkillContent } from '../core/registry.js';
import { resolveTargetFile, installSkill } from '../core/installer.js';
import { backupFile } from '../core/backup.js';
import { installAllHooks } from '../core/hooks/manager.js';
import { Steps } from '../ui/progress.js';
import { checkboxPrompt } from '../ui/checkbox.js';
import { confirm } from '../ui/confirm.js';
import { ui, json, isJsonMode, isDryRun } from '../ui/io.js';
import { theme, icon } from '../ui/theme.js';
import { reportError } from '../ui/errors.js';
import { renderInstallSummary } from '../ui/render.js';
import type { AssistantId } from '../types/config.js';

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Detect AI assistants and install token-saving skills interactively')
    .option('--yes', 'Skip all confirmations (automation mode)')
    .option('--target <ids>', 'Force specific assistants, e.g. claude-code,cursor')
    .option('--global', 'Install to global user-level config instead of project')
    .action(async (opts) => {
      const cwd    = process.cwd();
      const dryRun = isDryRun();
      const yes    = opts.yes as boolean;
      const global = opts.global as boolean;

      // ── Step 1: Environment scan ─────────────────────────────────────────
      const step1 = new Steps('Scanning for AI assistants');
      const detected = detectAssistants(cwd);

      let targetIds: AssistantId[];

      if (opts.target) {
        targetIds = (opts.target as string).split(',').map((s: string) => s.trim()) as AssistantId[];
        step1.info(`Target override: ${targetIds.join(', ')}`);
      } else if (detected.length === 0) {
        step1.warn('No AI assistants detected automatically.');
        step1.done();
        reportError({
          title:       'No AI assistants found',
          detail:      'tokenimizer could not detect Claude Code, Cursor, Copilot, Windsurf, or Aider.',
          suggestions: [
            'Use --target to specify: --target claude-code,cursor',
            'Or install a supported assistant and run tokenimizer init again.',
          ],
        });
      } else {
        for (const d of detected) {
          step1.step(d.id, `${d.confidence} confidence · ${d.signals[0] ?? ''}`);
        }
        targetIds = detected.map(d => d.id);
      }
      step1.done();

      // ── Step 2: Confirm targets ──────────────────────────────────────────
      if (!yes && detected.length > 0 && !opts.target) {
        ui(`  ${theme.dim('Will install to:')} ${theme.info(targetIds.join(', '))}`);
        const confirmed = await confirm(
          `\n  ${theme.bold('Install skills to all detected assistants?')}`,
          true,
        );
        if (!confirmed) {
          ui(`  ${theme.dim('Run with')} ${theme.info('--target <ids>')} ${theme.dim('to narrow the scope.')}\n`);
          process.exit(0);
        }
      }

      // ── Step 3: Skill selection ──────────────────────────────────────────
      const skills  = loadRegistry();
      const isTTY   = process.stdin.isTTY;

      let selectedIds: string[];

      if (yes || !isTTY) {
        selectedIds = skills.map(s => s.id);
        ui(`\n  ${theme.dim('Auto-selecting all')} ${skills.length} ${theme.dim('skills (--yes mode).')}`);
      } else {
        ui('');
        selectedIds = await checkboxPrompt(
          skills.map(s => ({
            id:       s.id,
            priority: s.priority,
            label:    s.name,
            hint:     `${s.tokenImpact.output < 0 ? s.tokenImpact.output + '% output' : ''}`,
          })),
          'Select skills to install',
        );
      }

      if (selectedIds.length === 0) {
        ui(`  ${theme.dim('No skills selected. Run')} ${theme.info('tokenimizer install <skill>')} ${theme.dim('to install individually.')}\n`);
        process.exit(0);
      }

      // ── Step 4: Scope ────────────────────────────────────────────────────
      const scopeLabel = global ? 'global (user-level config)' : 'project-only';
      ui(`\n  ${theme.dim('Scope:')} ${theme.info(scopeLabel)}`);

      // ── Step 5: Git hooks ────────────────────────────────────────────────
      let installHooksFlag = true;
      if (!yes && isTTY) {
        installHooksFlag = await confirm(
          `\n  ${theme.bold('Install git hooks for automatic context maintenance?')}` +
          theme.dim(' (post-commit, post-checkout, post-merge, pre-push)'),
          true,
        );
      }

      // ── Step 6: Backup confirmation ──────────────────────────────────────
      if (!yes && isTTY) {
        ui(`\n  ${theme.dim('Backups will be written to')} ${theme.info('.tokenimizer/backups/')}`);
        const ok = await confirm(`  ${theme.bold('Proceed?')}`, true);
        if (!ok) {
          ui(`  ${theme.dim('Cancelled.')}\n`);
          process.exit(0);
        }
      }

      // ── Step 7 + 8: Install skills ───────────────────────────────────────
      const installStep = new Steps('Installing skills');
      const summary: Array<{ target: string; skill: string; action: 'installed' | 'skipped' | 'dry-run' | 'backed-up'; path?: string }> = [];

      for (const targetId of targetIds) {
        for (const skillId of selectedIds) {
          const content = loadSkillContent(skillId, targetId);
          if (!content) continue;

          const targetFile = resolveTargetFile(targetId, cwd, global);

          if (!dryRun) {
            const backupPath = backupFile(cwd, targetFile.path);
            summary.push({ target: targetId, skill: skillId, action: 'backed-up', path: backupPath });
          }

          const result = installSkill(skillId, content, targetFile, dryRun);

          if (result === 'installed') {
            installStep.step(`${skillId} → ${targetId}`);
            summary.push({ target: targetId, skill: skillId, action: 'installed', path: targetFile.path });
          } else if (result === 'already-installed') {
            installStep.warn(`${skillId} already in ${targetId} — skipped`);
            summary.push({ target: targetId, skill: skillId, action: 'skipped' });
          } else {
            summary.push({ target: targetId, skill: skillId, action: 'dry-run', path: targetFile.path });
          }
        }
      }
      installStep.done();

      // ── Git hooks ────────────────────────────────────────────────────────
      if (installHooksFlag) {
        const hookStep = new Steps('Installing git hooks');
        try {
          const hookResults = installAllHooks(cwd, dryRun);
          for (const r of hookResults) {
            if (r.result === 'installed') {
              hookStep.step(r.name);
            } else if (r.result === 'already-installed') {
              hookStep.warn(`${r.name} already installed`);
            }
          }
        } catch (e: unknown) {
          hookStep.warn(`Skipped — ${e instanceof Error ? e.message : String(e)}`);
        }
        hookStep.done();
      }

      // ── Step 9: Summary ──────────────────────────────────────────────────
      if (isJsonMode()) {
        json({ dryRun, scope: scopeLabel, targets: targetIds, skills: selectedIds, results: summary });
        return;
      }

      const installed = summary.filter(s => s.action === 'installed').length;
      const skipped   = summary.filter(s => s.action === 'skipped').length;

      ui(`  ${icon.ok} ${theme.ok(`Done.`)} ${theme.bold(`${installed}`)} skill${installed !== 1 ? 's' : ''} installed` +
         (skipped > 0 ? `, ${skipped} skipped (already present)` : '') + '.');
      ui('');
      ui(`  ${theme.dim('Run')} ${theme.info('tokenimizer doctor')} ${theme.dim('to verify.')}`);
      ui(`  ${theme.dim('To undo everything:')} ${theme.info('tokenimizer restore')}`);
      if (dryRun) {
        ui(`  ${theme.info('Dry-run mode — no files were modified.')}`);
      }
      ui('');
    });
}
