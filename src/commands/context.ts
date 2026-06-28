import { Command } from 'commander';
import Table from 'cli-table3';
import pc from 'picocolors';
import { ui, out, err, json as jsonOut, isDryRun } from '../ui/io.js';
import { theme, icon } from '../ui/theme.js';
import { initContextDocs, refreshContextDocs, listContextDocs } from '../context/lifecycle.js';
import { formatTokens } from '../context/tokenizer.js';

export function makeContextCommand(): Command {
  const context = new Command('context')
    .description('Manage AI context lifecycle documents in .tokenimizer/context/');

  // ── context init ─────────────────────────────────────────────────────────
  context
    .command('init')
    .description('Generate all context lifecycle docs for this project')
    .option('--force', 'Overwrite existing docs')
    .action(async (opts) => {
      const cwd = process.cwd();
      ui('');
      ui(`${icon.fix} Initializing context lifecycle docs...`);
      ui('');

      if (isDryRun()) {
        ui(`${theme.dim('[dry-run]')} Would generate context docs in .tokenimizer/context/`);
        ui('');
        return;
      }

      try {
        const result = await initContextDocs(cwd, opts.force ?? false);

        if (result.created.length) {
          ui(`${icon.ok} Created ${result.created.length} context doc(s):`);
          for (const name of result.created) {
            const t = result.tokens[name] ?? 0;
            ui(`  ${theme.dim('+')} ${name} ${theme.dim(`(${formatTokens(t)} tokens est.)`)}`);
          }
        }

        if (result.skipped.length) {
          ui('');
          ui(`${icon.prune} Skipped (already exist, use --force to overwrite):`);
          for (const name of result.skipped) {
            ui(`  ${theme.dim('-')} ${name}`);
          }
        }

        ui('');
        ui(theme.dim('Docs in .tokenimizer/context/ — edit them to add your session notes.'));
        ui(theme.dim('Run `tokenimizer context refresh` to regenerate auto-detected docs.'));
        ui('');

        if (opts.parent?.opts().json) {
          jsonOut({ created: result.created, skipped: result.skipped, tokens: result.tokens });
        }
      } catch (e: unknown) {
        err(`${icon.err} Failed: ${(e as Error).message}`);
        process.exit(1);
      }
    });

  // ── context refresh ───────────────────────────────────────────────────────
  context
    .command('refresh')
    .description('Regenerate auto-detected docs (project_summary, architecture, handoff)')
    .action(async (opts) => {
      const cwd = process.cwd();
      ui('');
      ui(`${icon.fix} Refreshing auto-generated context docs...`);
      ui('');

      if (isDryRun()) {
        ui(`${theme.dim('[dry-run]')} Would refresh project_summary.md, architecture.md, handoff.md`);
        ui('');
        return;
      }

      try {
        const result = await refreshContextDocs(cwd);
        for (const name of result.created) {
          const t = result.tokens[name] ?? 0;
          ui(`  ${icon.ok} ${name} ${theme.dim(`(${formatTokens(t)} tokens est.)`)}`);
        }
        ui('');

        if (opts.parent?.opts().json) {
          jsonOut({ refreshed: result.created, tokens: result.tokens });
        }
      } catch (e: unknown) {
        err(`${icon.err} Failed: ${(e as Error).message}`);
        process.exit(1);
      }
    });

  // ── context status ────────────────────────────────────────────────────────
  context
    .command('status')
    .description('Show context doc status and token usage')
    .action((opts) => {
      const cwd = process.cwd();
      const docs = listContextDocs(cwd);

      ui('');
      ui(`${icon.heal} ${pc.bold('Context docs')} — .tokenimizer/context/`);
      ui('');

      if (opts.parent?.opts().json) {
        jsonOut(docs);
        return;
      }

      const table = new Table({
        head: [
          pc.cyan('Document'),
          pc.cyan('Status'),
          pc.cyan('Size (est.)'),
        ],
        style: { head: [], border: [] },
      });

      let total = 0;
      for (const doc of docs) {
        const status = doc.exists
          ? pc.green('exists')
          : pc.red('missing');
        table.push([doc.name, status, doc.exists ? formatTokens(doc.tokens) : theme.dim('-')]);
        total += doc.tokens;
      }

      out(table.toString());
      ui('');
      ui(`  Total: ${formatTokens(total)} tokens (estimate across all docs)`);
      ui('');
      ui(theme.dim('  Run `tokenimizer context init` to create missing docs.'));
      ui('');
    });

  return context;
}
