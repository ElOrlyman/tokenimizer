import { Command } from 'commander';
import pc from 'picocolors';
import { ui, out, err, json as jsonOut, isDryRun } from '../ui/io.js';
import { theme, icon } from '../ui/theme.js';
import { buildIndex, getCacheDir } from '../context/indexer.js';
import { formatTokens } from '../context/tokenizer.js';
import { getStaleFiles, clearStale } from '../core/watcher/index.js';

export function makeIndexCommand(): Command {
  return new Command('index')
    .description('Build LLM-optimized repository memory index in .tokenimizer/cache/')
    .option('--stale', 'Show files changed since last index')
    .action(async (opts) => {
      const cwd = process.cwd();

      if (opts.stale) {
        const stale = getStaleFiles(cwd);
        if (!stale.length) {
          ui('');
          ui(`${icon.ok} Index is up to date — no changes detected.`);
          ui('');
        } else {
          ui('');
          ui(`${icon.warn} ${stale.length} file(s) changed since last index:`);
          for (const s of stale.slice(0, 20)) {
            ui(`  ${theme.dim(s.reason.padEnd(8))} ${s.file}`);
          }
          ui('');
          ui(`  Run ${pc.bold('tokenimizer index')} to rebuild.`);
          ui('');
        }

        if (opts.parent?.opts().json) jsonOut(stale);
        return;
      }

      ui('');
      ui(`${icon.scan} Building repository index...`);
      ui('');

      if (isDryRun()) {
        ui(`${theme.dim('[dry-run]')} Would generate index artifacts in .tokenimizer/cache/`);
        ui('');
        return;
      }

      try {
        const result = await buildIndex(cwd);

        ui(`${icon.ok} Index built — ${result.artifacts.length} artifacts:`);
        for (const a of result.artifacts) {
          ui(`  ${theme.dim('+')} ${a.name.padEnd(30)} ${theme.dim(formatTokens(a.tokens))}`);
        }
        ui('');
        ui(`  Total: ${formatTokens(result.totalTokens)} tokens (estimate)`);
        ui(`  Path:  ${theme.dim(getCacheDir(cwd))}`);
        ui('');

        clearStale(cwd);

        if (opts.parent?.opts().json) {
          jsonOut({
            artifacts:   result.artifacts.map(a => ({ name: a.name, tokens: a.tokens })),
            totalTokens: result.totalTokens,
            cacheDir:    getCacheDir(cwd),
          });
        }
      } catch (e: unknown) {
        err(`${icon.err} Failed: ${(e as Error).message}`);
        process.exit(1);
      }
    });
}
