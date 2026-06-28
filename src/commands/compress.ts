import { Command } from 'commander';
import pc from 'picocolors';
import { ui, out, err, json as jsonOut, isDryRun } from '../ui/io.js';
import { theme, icon } from '../ui/theme.js';
import {
  buildCompressedBlock,
  createCheckpoint,
  listCheckpoints,
  generateHandoffBlock,
} from '../context/compressor.js';
import { formatTokens } from '../context/tokenizer.js';

export function makeCompressCommand(): Command {
  return new Command('compress')
    .description('Build a compact session re-entry block from context docs')
    .option('--stdout', 'Print only the block to stdout (pipe-friendly)')
    .action((opts) => {
      const cwd = process.cwd();
      const { content, tokens } = buildCompressedBlock(cwd);

      if (opts.stdout || opts.parent?.opts().json) {
        if (opts.parent?.opts().json) {
          jsonOut({ content, tokens });
        } else {
          out(content);
        }
        return;
      }

      ui('');
      ui(`${icon.backup} Compressed context block ${theme.dim(`(${formatTokens(tokens)} tokens est.)`)}`);
      ui(theme.dim('─'.repeat(60)));
      out(content);
      ui(theme.dim('─'.repeat(60)));
      ui('');
      ui(theme.dim('  Paste this block as the first message of a new AI session.'));
      ui('');
    });
}

export function makeCheckpointCommand(): Command {
  return new Command('checkpoint')
    .description('Snapshot current context to .tokenimizer/snapshots/')
    .argument('[label]', 'Optional label for this snapshot')
    .option('--list', 'List existing snapshots')
    .action((label, opts) => {
      const cwd = process.cwd();

      if (opts.list) {
        const snaps = listCheckpoints(cwd);
        ui('');
        if (!snaps.length) {
          ui(`${icon.prune} No snapshots yet. Run ${pc.bold('tokenimizer checkpoint')} to create one.`);
          ui('');
          return;
        }
        ui(`${icon.backup} ${snaps.length} snapshot(s):`);
        for (const s of snaps) {
          ui(`  ${theme.dim(s.createdAt.split('T')[0])}  ${s.id}  ${theme.dim(formatTokens(s.tokens))}`);
          ui(`  ${theme.dim(s.file)}`);
          ui('');
        }
        if (opts.parent?.opts().json) jsonOut(snaps);
        return;
      }

      if (isDryRun()) {
        ui('');
        ui(`${theme.dim('[dry-run]')} Would create snapshot in .tokenimizer/snapshots/`);
        ui('');
        return;
      }

      const snap = createCheckpoint(cwd, label);
      ui('');
      ui(`${icon.ok} Checkpoint saved:`);
      ui(`  ID:     ${snap.id}`);
      ui(`  Tokens: ${formatTokens(snap.tokens)} (estimate)`);
      ui(`  File:   ${theme.dim(`.tokenimizer/snapshots/${snap.id}.md`)}`);
      ui('');
      ui(theme.dim(`  Paste .tokenimizer/snapshots/${snap.id}.md as first message of a new session.`));
      ui('');

      if (opts.parent?.opts().json) jsonOut({ id: snap.id, tokens: snap.tokens, createdAt: snap.createdAt });
    });
}

export function makeHandoffCommand(): Command {
  return new Command('handoff')
    .description('Generate a handoff block optimized for pasting into a new AI session')
    .option('--stdout', 'Print only the block to stdout')
    .action((opts) => {
      const cwd = process.cwd();
      const { content, tokens } = generateHandoffBlock(cwd);

      if (opts.stdout || opts.parent?.opts().json) {
        if (opts.parent?.opts().json) {
          jsonOut({ content, tokens });
        } else {
          out(content);
        }
        return;
      }

      ui('');
      ui(`${icon.backup} Handoff block ${theme.dim(`(${formatTokens(tokens)} tokens est.)`)}`);
      ui(theme.dim('─'.repeat(60)));
      out(content);
      ui(theme.dim('─'.repeat(60)));
      ui('');
      ui(theme.dim('  Copy the block above and paste it as your first message in a new AI session.'));
      ui('');
    });
}
