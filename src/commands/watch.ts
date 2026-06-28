import { Command } from 'commander';
import pc from 'picocolors';
import { ui, err, json as jsonOut } from '../ui/io.js';
import { theme, icon } from '../ui/theme.js';
import {
  startWatcher,
  stopWatcher,
  watcherStatus,
  runDaemon,
  getStaleFiles,
} from '../core/watcher/index.js';
import { formatTokens } from '../context/tokenizer.js';

export function makeWatchCommand(): Command {
  return new Command('watch')
    .description('Manage the background file-system watcher')
    .option('--stop', 'Stop the running watcher')
    .option('--status', 'Show watcher status')
    .option('--stale', 'List files changed since last index')
    .option('--daemon', '[internal] Run as daemon process')
    .option('--daemon-cwd <path>', '[internal] Working directory for daemon')
    .action(async (opts) => {
      if (opts.daemon) {
        const cwd = opts.daemonCwd ?? process.cwd();
        await runDaemon(cwd);
        return;
      }

      const cwd = process.cwd();

      if (opts.status) {
        const st = watcherStatus(cwd);
        ui('');
        if (st.running) {
          ui(`${icon.ok} Watcher is ${pc.green('running')} (pid ${st.pid})`);
        } else {
          ui(`${icon.warn} Watcher is ${pc.yellow('stopped')}`);
        }
        ui(`  Log:   ${theme.dim(st.logPath)}`);
        ui(`  Stale: ${theme.dim(st.stalePath)}`);
        ui('');

        const stale = getStaleFiles(cwd);
        if (stale.length) {
          ui(`  ${pc.yellow(String(stale.length))} file(s) changed since last index`);
          ui(`  Run ${pc.bold('tokenimizer index')} to rebuild.`);
          ui('');
        }

        if (opts.parent?.opts().json) jsonOut(st);
        return;
      }

      if (opts.stale) {
        const stale = getStaleFiles(cwd);
        ui('');
        if (!stale.length) {
          ui(`${icon.ok} No stale files — index is current.`);
        } else {
          ui(`${icon.warn} ${stale.length} file(s) changed since last index:`);
          for (const s of stale.slice(0, 20)) {
            ui(`  ${theme.dim(s.modifiedAt.split('T')[0])}  ${s.reason.padEnd(8)}  ${s.file}`);
          }
          ui('');
          ui(`  Run ${pc.bold('tokenimizer index')} to rebuild.`);
        }
        ui('');
        if (opts.parent?.opts().json) jsonOut(stale);
        return;
      }

      if (opts.stop) {
        const result = stopWatcher(cwd);
        ui('');
        if (result.stopped) {
          ui(`${icon.ok} Watcher stopped (was pid ${result.pid})`);
        } else {
          ui(`${icon.prune} Watcher was not running`);
        }
        ui('');
        if (opts.parent?.opts().json) jsonOut(result);
        return;
      }

      // Default: start
      const current = watcherStatus(cwd);
      if (current.running) {
        ui('');
        ui(`${icon.ok} Watcher is already running (pid ${current.pid})`);
        ui(`  Use ${pc.bold('tokenimizer watch --stop')} to stop it.`);
        ui('');
        if (opts.parent?.opts().json) jsonOut(current);
        return;
      }

      ui('');
      ui(`${icon.fix} Starting background file watcher...`);
      ui('');
      ui(theme.dim('  Monitors source files for changes and marks the index stale.'));
      ui(theme.dim('  Writes only to .tokenimizer/ — never modifies your source files.'));
      ui('');

      try {
        const { pid } = await startWatcher(cwd);
        ui(`${icon.ok} Watcher started (pid ${pid})`);
        ui(`  Log:  ${theme.dim('.tokenimizer/watcher/watcher.log')}`);
        ui(`  Stop: ${pc.bold('tokenimizer watch --stop')}`);
        ui('');

        if (opts.parent?.opts().json) jsonOut({ running: true, pid });
      } catch (e: unknown) {
        err(`${icon.err} Failed to start watcher: ${(e as Error).message}`);
        process.exit(1);
      }
    });
}
