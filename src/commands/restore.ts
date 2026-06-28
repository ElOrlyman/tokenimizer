import type { Command } from 'commander';
import { restoreAll, restoreFile, listBackups } from '../core/backup.js';
import { ui, out, json, isJsonMode, isDryRun } from '../ui/io.js';
import { theme, icon } from '../ui/theme.js';
import { reportError } from '../ui/errors.js';
import { confirm } from '../ui/confirm.js';

export function registerRestore(program: Command): void {
  program
    .command('restore')
    .description('Rollback all tokenimizer changes to pre-install state')
    .option('--file <path>', 'Restore a single file instead of all')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      const cwd    = process.cwd();
      const dryRun = isDryRun();

      const backups = listBackups(cwd);
      if (backups.length === 0) {
        ui(`\n  ${icon.warn} ${theme.warn('No backups found. Nothing to restore.')}`);
        ui(`  ${theme.dim('Backups are created automatically when you install skills.')}\n`);
        return;
      }

      if (isJsonMode()) {
        json({ backups, dryRun });
        return;
      }

      ui('\n  ' + theme.bold('Files that will be restored:'));
      for (const b of backups) {
        ui(`  ${icon.backup} ${theme.dim(b.originalPath)}  ${theme.dim('←')}  ${theme.dim(b.backupPath)}`);
      }
      ui('');

      if (dryRun) {
        ui(`  ${theme.info('Dry-run mode — no files were modified.')}\n`);
        return;
      }

      const yes = opts.yes as boolean;
      if (!yes) {
        const confirmed = await confirm(
          `  ${theme.warn('This will overwrite the above files with their pre-install backups. Continue?')}`,
          false,
        );
        if (!confirmed) {
          ui(`  ${theme.dim('Restore cancelled.')}\n`);
          return;
        }
      }

      ui('');

      if (opts.file) {
        const result = restoreFile(cwd, opts.file as string);
        if (result === 'not-found') {
          reportError({
            title:       'No backup found for that file',
            suggestions: ['Run tokenimizer restore (without --file) to see all available backups.'],
          });
        }
        ui(`  ${icon.ok} ${theme.ok('Restored')} ${theme.dim(opts.file as string)}`);
      } else {
        const results = restoreAll(cwd);
        for (const r of results) {
          if (r.status === 'restored') {
            ui(`  ${icon.ok} ${theme.ok('Restored')}  ${theme.dim(r.originalPath)}`);
          } else if (r.status === 'deleted') {
            ui(`  ${icon.prune} ${theme.dim('Deleted')}   ${theme.dim(r.originalPath)} ${theme.dim('(was created by tokenimizer)')}`);
          } else {
            ui(`  ${icon.warn} ${theme.warn('Skipped')}   ${theme.dim(r.originalPath)} ${theme.dim('(backup missing)')}`);
          }
        }
      }

      ui('');
      ui(`  ${theme.dim('All tokenimizer changes undone.')}`);
      ui(`  ${theme.dim('Run')} ${theme.info('tokenimizer init')} ${theme.dim('to reinstall.')}\n`);
    });
}
