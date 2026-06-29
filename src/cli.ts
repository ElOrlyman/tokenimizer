#!/usr/bin/env node
import path from 'path';
import { Command } from 'commander';
import { disableColors, disableEmoji } from './ui/theme.js';
import { setJsonMode, setDryRun, ui, out } from './ui/io.js';
import { renderWelcomeHeader } from './ui/render.js';
import { loadRegistry } from './core/registry.js';
import { VERSION } from './version.js';

import { registerInit }      from './commands/init.js';
import { registerInstall }   from './commands/install.js';
import { registerUninstall } from './commands/uninstall.js';
import { registerRestore }   from './commands/restore.js';
import { registerList }      from './commands/list.js';
import { registerDoctor }    from './commands/doctor.js';
import { registerHooks }     from './commands/hooks.js';

// v2 commands
import { makeContextCommand }       from './commands/context.js';
import { makeIndexCommand }         from './commands/index-cmd.js';
import { makeCompressCommand, makeCheckpointCommand, makeHandoffCommand } from './commands/compress.js';
import { makeRecommendModelCommand } from './commands/recommend-model.js';
import { makeWatchCommand }         from './commands/watch.js';

const program = new Command();

program
  .name('tokenimizer')
  .description('The operating system for token-efficient AI workflows')
  .version(VERSION, '-v, --version', 'Print version')
  .option('--no-color',  'Disable terminal colors')
  .option('--no-emoji',  'Disable emoji icons')
  .option('--json',      'Machine-readable JSON output')
  .option('--dry-run',   'Preview changes without writing any files')
  .hook('preAction', (_thisCommand, actionCommand) => {
    const opts = program.opts();
    if (opts.noColor)  disableColors();
    if (opts.noEmoji)  disableEmoji();
    if (opts.json)     setJsonMode(true);
    if (opts.dryRun)   setDryRun(true);
  });

// Register all commands
registerInit(program);
registerInstall(program);
registerUninstall(program);
registerRestore(program);
registerList(program);
registerDoctor(program);
registerHooks(program);

// v2 commands
program.addCommand(makeContextCommand());
program.addCommand(makeIndexCommand());
program.addCommand(makeCompressCommand());
program.addCommand(makeCheckpointCommand());
program.addCommand(makeHandoffCommand());
program.addCommand(makeRecommendModelCommand());
program.addCommand(makeWatchCommand());

// Daemon entry point — watcher process spawns itself with --watcher-daemon
const daemonCwdIdx = process.argv.indexOf('--watcher-cwd');
if (process.argv.includes('--watcher-daemon')) {
  const rawCwd    = daemonCwdIdx !== -1 ? process.argv[daemonCwdIdx + 1] : process.cwd();
  const daemonCwd = path.resolve(rawCwd);
  // Reject paths that escaped cwd via traversal (daemon must stay inside a real directory)
  if (!daemonCwd || daemonCwd === path.sep) {
    process.stderr.write('tokenimizer: invalid --watcher-cwd\n');
    process.exit(1);
  }
  import('./core/watcher/index.js')
    .then(({ runDaemon }) => runDaemon(daemonCwd))
    .catch(() => process.exit(1));
} else if (process.argv.length <= 2) {
  // Show welcome banner when called with no arguments
  try {
    const skills = loadRegistry();
    out(renderWelcomeHeader(process.cwd(), skills.length));
  } catch {
    ui(`\ntokenimizer v${VERSION} — run --help to see commands\n`);
  }
} else {
  program.parse(process.argv);
}
