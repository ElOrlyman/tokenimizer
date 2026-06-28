import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import pc from 'picocolors';
import { ui, out, err, json as jsonOut } from '../ui/io.js';
import { theme, icon } from '../ui/theme.js';
import { classifyTaskByKeywords, TaskComplexity } from '../context/tokenizer.js';
import { registryDir } from '../utils/paths.js';

interface RoutingTier {
  label:          string;
  description:    string;
  recommendation: string;
  examples:       string[];
}

interface RoutingConfig {
  version: string;
  tiers: Record<TaskComplexity, RoutingTier>;
  patterns: Array<{ keywords: string[]; tier: TaskComplexity }>;
}

function loadRouting(): RoutingConfig {
  const localPath   = path.join(process.cwd(), '.tokenimizer', 'routing.json');
  const bundledPath = path.join(registryDir(), 'routing.json');

  for (const p of [localPath, bundledPath]) {
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { /* try next */ }
    }
  }
  throw new Error('routing.json not found. Run `tokenimizer init` or reinstall.');
}

function classifyByRouting(task: string, routing: RoutingConfig): TaskComplexity {
  const lower = task.toLowerCase();
  for (const pattern of routing.patterns) {
    if (pattern.keywords.some(k => lower.includes(k))) {
      return pattern.tier;
    }
  }
  return classifyTaskByKeywords(task);
}

export function makeRecommendModelCommand(): Command {
  return new Command('recommend-model')
    .description('Recommend a model tier for a given task description')
    .argument('[task]', 'Task description (quoted string)')
    .option('--list', 'List all tiers and their example models')
    .action((task, opts) => {
      let routing: RoutingConfig;
      try {
        routing = loadRouting();
      } catch (e: unknown) {
        err(`${icon.err} ${(e as Error).message}`);
        process.exit(1);
      }

      if (opts.list) {
        ui('');
        ui(`${icon.skill} ${pc.bold('Model routing tiers:')}`);
        ui('');
        for (const [key, tier] of Object.entries(routing.tiers)) {
          ui(`  ${pc.bold(pc.cyan(tier.label))} ${theme.dim(`[${key}]`)}`);
          ui(`  ${theme.dim(tier.description)}`);
          ui(`  ${pc.green('Recommendation:')} ${tier.recommendation}`);
          ui(`  ${theme.dim('Examples: ' + tier.examples.join(', '))}`);
          ui('');
        }
        ui(theme.dim('  To customize, copy .tokenimizer/routing.json and edit.'));
        ui('');

        if (opts.parent?.opts().json) jsonOut(routing.tiers);
        return;
      }

      if (!task) {
        ui('');
        err(`${icon.err} Provide a task description, e.g.:`);
        err(`  tokenimizer recommend-model "fix the login bug"`);
        err(`  tokenimizer recommend-model "architect the new auth module"`);
        ui('');
        process.exit(1);
      }

      const complexity = classifyByRouting(task, routing);
      const tier       = routing.tiers[complexity];

      ui('');
      ui(`${icon.skill} Task: ${pc.bold(task)}`);
      ui('');
      ui(`  ${pc.cyan('Complexity:')}      ${tier.label} ${theme.dim(`(${complexity})`)}`);
      ui(`  ${pc.cyan('Description:')}     ${tier.description}`);
      ui(`  ${pc.cyan('Recommendation:')}  ${pc.green(tier.recommendation)}`);
      ui(`  ${pc.cyan('Examples:')}        ${tier.examples.join(', ')}`);
      ui('');
      ui(theme.dim('  routing.json is community-maintained. Customize in .tokenimizer/routing.json'));
      ui('');

      if (opts.parent?.opts().json) {
        jsonOut({ task, complexity, tier });
      }
    });
}
