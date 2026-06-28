import type { Command } from 'commander';
import { installAllHooks, uninstallAllHooks, hookStatus, installHook, uninstallHook } from '../core/hooks/manager.js';
import { ui, out, json, isJsonMode, isDryRun } from '../ui/io.js';
import { theme, icon } from '../ui/theme.js';
import type { HookName } from '../types/hook.js';
import Table from 'cli-table3';

export function registerHooks(program: Command): void {
  const hooks = program
    .command('hooks')
    .description('Manage git hooks (Layer 2 — event-driven context maintenance)');

  hooks
    .command('install [hook-name]')
    .description('Install tokenimizer git hooks (all by default, or specify one)')
    .action(async (hookName?: string, opts?: { yes?: boolean }) => {
      const cwd    = process.cwd();
      const dryRun = isDryRun();

      let results: Array<{ name: string; result: string }>;

      try {
        if (hookName) {
          const result = installHook(cwd, hookName as HookName, dryRun);
          results = [{ name: hookName, result }];
        } else {
          results = installAllHooks(cwd, dryRun);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        ui(`\n  ${icon.err} ${theme.error(msg)}\n`);
        process.exit(1);
      }

      if (isJsonMode()) {
        json({ dryRun, results });
        return;
      }

      ui('');
      for (const r of results) {
        if (r.result === 'installed') {
          ui(`  ${icon.hook} ${theme.ok('Installed')} hook: ${theme.bold(r.name)}`);
        } else if (r.result === 'already-installed') {
          ui(`  ${theme.dim(icon.warn + ' Already installed:')} ${r.name}`);
        } else {
          ui(`  ${theme.info('~')} ${theme.dim('[dry-run] would install')} ${r.name}`);
        }
      }
      if (!dryRun && results.some(r => r.result === 'installed')) {
        ui('');
        ui(`  ${theme.dim('Hooks are non-blocking — they skip gracefully if nothing has changed.')}`);
      }
      ui('');
    });

  hooks
    .command('uninstall [hook-name]')
    .description('Remove tokenimizer git hooks (all by default, or specify one)')
    .action(async (hookName?: string) => {
      const cwd    = process.cwd();
      const dryRun = isDryRun();

      let results: Array<{ name: string; result: string }>;

      try {
        if (hookName) {
          const result = uninstallHook(cwd, hookName as HookName, dryRun);
          results = [{ name: hookName, result }];
        } else {
          results = uninstallAllHooks(cwd, dryRun);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        ui(`\n  ${icon.err} ${theme.error(msg)}\n`);
        process.exit(1);
      }

      if (isJsonMode()) {
        json({ dryRun, results });
        return;
      }

      ui('');
      for (const r of results) {
        if (r.result === 'removed') {
          ui(`  ${icon.prune} ${theme.ok('Removed')} hook: ${theme.bold(r.name)}`);
        } else if (r.result === 'not-found') {
          ui(`  ${theme.dim(icon.warn + ' Not installed:')} ${r.name}`);
        } else {
          ui(`  ${theme.info('~')} ${theme.dim('[dry-run] would remove')} ${r.name}`);
        }
      }
      ui('');
    });

  hooks
    .command('status')
    .description('Show which tokenimizer git hooks are active')
    .action(async () => {
      const cwd = process.cwd();
      let statuses;

      try {
        statuses = hookStatus(cwd);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        ui(`\n  ${icon.err} ${theme.error(msg)}\n`);
        process.exit(1);
      }

      if (isJsonMode()) {
        json(statuses);
        return;
      }

      const table = new Table({
        head: [theme.dim('Hook'), theme.dim('Status'), theme.dim('Notes')],
        style: { head: [], border: ['gray'] },
        colWidths: [18, 14, 40],
      });

      for (const s of statuses) {
        const statusCell = s.installed
          ? `${icon.ok} ${theme.ok('Active')}`
          : `${theme.dim('—  Inactive')}`;
        const notes = s.installed && s.shared
          ? theme.dim('Shared with existing hook')
          : s.installed ? theme.dim('Managed by tokenimizer') : '';
        table.push([theme.bold(s.name), statusCell, notes]);
      }

      ui('');
      out(table.toString());
      ui('');
    });
}
