#!/usr/bin/env node
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

// Show welcome banner when called with no arguments
if (process.argv.length <= 2) {
  try {
    const skills = loadRegistry();
    out(renderWelcomeHeader(process.cwd(), skills.length));
  } catch {
    ui(`\ntokenimizer v${VERSION} — run --help to see commands\n`);
  }
} else {
  program.parse(process.argv);
}
