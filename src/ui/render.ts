import Table from 'cli-table3';
import { theme, icon, priorityIcon } from './theme.js';
import { VERSION } from '../version.js';
import type { SkillMeta } from '../types/skill.js';
import type { InstallStatus } from '../types/config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVisibleLength(str: string): number {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function padRight(str: string, width: number): string {
  const diff = width - getVisibleLength(str);
  return diff <= 0 ? str : str + ' '.repeat(diff);
}

function center(str: string, width: number): string {
  const diff = width - getVisibleLength(str);
  if (diff <= 0) return str;
  const left = Math.floor(diff / 2);
  return ' '.repeat(left) + str + ' '.repeat(diff - left);
}

function truncate(p: string, maxLen: number): string {
  if (p.length <= maxLen) return p;
  const half = Math.floor((maxLen - 3) / 2);
  return p.substring(0, half) + '...' + p.substring(p.length - half);
}

// ---------------------------------------------------------------------------
// Welcome banner
// ---------------------------------------------------------------------------

export function renderWelcomeHeader(cwd: string, skillCount: number): string {
  const cols = process.stdout.columns || 120;
  const slim = cols < 110;

  if (slim) {
    return [
      '',
      theme.orange('┌──────────────────────────────────────────────────────────┐'),
      theme.orange('│') + theme.bold(`  tokenimizer v${VERSION}`) + theme.dim(' · Token-Efficient AI Workflows') + theme.orange('│'),
      theme.orange('│') + theme.dim(`  ${truncate(cwd, 58)}`) + ' '.repeat(Math.max(0, 60 - truncate(cwd, 58).length)) + theme.orange('│'),
      theme.orange('└──────────────────────────────────────────────────────────┘'),
      '',
    ].join('\n');
  }

  const leftW  = 52;
  const rightW = 56;

  const left: string[] = [
    '',
    center(theme.bold(`tokenimizer v${VERSION}`), leftW),
    center(theme.dim('Token-Efficient AI Workflows'), leftW),
    '',
    `  ${theme.dim(truncate(cwd, leftW - 4))}`,
    `  ${theme.dim('─'.repeat(leftW - 4))}`,
    '',
    `  ${theme.white('Commands:')}`,
    `  ${theme.dim('• ')}${theme.info('init')}        ${theme.dim('Detect assistants + install skills')}`,
    `  ${theme.dim('• ')}${theme.info('install')}     ${theme.dim('Install a skill to all targets')}`,
    `  ${theme.dim('• ')}${theme.info('list')}        ${theme.dim('Show skills + install status')}`,
    `  ${theme.dim('• ')}${theme.info('doctor')}      ${theme.dim('Health check + conflict report')}`,
    `  ${theme.dim('• ')}${theme.info('hooks')}       ${theme.dim('Manage git hooks (Layer 2)')}`,
    `  ${theme.dim('• ')}${theme.info('restore')}     ${theme.dim('Rollback all changes')}`,
    `  ${theme.dim('• ')}${theme.info('--help')}      ${theme.dim('Show all commands and flags')}`,
    '',
  ];

  const right: string[] = [
    '',
    center(theme.orange('REGISTRY STATUS'), rightW),
    center(theme.dim('─'.repeat(rightW - 8)), rightW),
    '',
    `  ${theme.bold('Skills available:')}   ${theme.info(String(skillCount))}`,
    '',
    `  ${theme.bold('Layers:')}`,
    `  ${icon.ok} ${theme.dim('Layer 1')}  Skill files (always on)`,
    `  ${icon.hook} ${theme.dim('Layer 2')}  Git hooks ${theme.dim('(run: tokenimizer hooks install)')}`,
    `  ${theme.dim(icon.warn)} ${theme.dim('Layer 3')}  Watcher (coming in v2)`,
    '',
    `  ${theme.bold('Node.js:')}   ${theme.white(process.version)}`,
    `  ${theme.bold('Platform:')}  ${theme.white(`${process.platform} (${process.arch})`)}`,
    '',
  ];

  const height = Math.max(left.length, right.length);
  while (left.length  < height) left.push('');
  while (right.length < height) right.push('');

  const top    = theme.orange(`┌─ tokenimizer v${VERSION} ${'─'.repeat(leftW - 14)}┬${'─'.repeat(rightW + 2)}┐`);
  const bottom = theme.orange(`└${'─'.repeat(leftW + 3)}┴${'─'.repeat(rightW + 2)}┘`);

  const rows = [top];
  for (let i = 0; i < height; i++) {
    rows.push(
      theme.orange('│ ') + padRight(left[i], leftW) +
      theme.orange(' │ ') + padRight(right[i], rightW) +
      theme.orange(' │'),
    );
  }
  rows.push(bottom);

  return '\n' + rows.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Skills list table
// ---------------------------------------------------------------------------

export interface SkillRow {
  skill: SkillMeta;
  installedIn: string[];   // assistant ids where this skill is installed
  allTargets: string[];    // all detected assistant ids
}

export function renderSkillsTable(rows: SkillRow[]): string {
  if (rows.length === 0) {
    return '\n' + theme.dim('  No skills found in registry.') + '\n';
  }

  const table = new Table({
    head: [theme.dim('Priority'), theme.dim('ID'), theme.dim('Description'), theme.dim('Installed in')],
    style: { head: [], border: ['gray'] },
    colWidths: [14, 22, 40, 28],
    wordWrap: true,
  });

  for (const row of rows) {
    const installed = row.installedIn.length === 0
      ? theme.dim('none')
      : row.installedIn.length === row.allTargets.length
        ? theme.ok('all targets')
        : theme.warn(row.installedIn.join(', '));

    table.push([
      `${priorityIcon(row.skill.priority)} ${theme.priority(row.skill.priority)}`,
      theme.bold(row.skill.id),
      row.skill.description,
      installed,
    ]);
  }

  return '\n' + table.toString() + '\n';
}

// ---------------------------------------------------------------------------
// Doctor report table
// ---------------------------------------------------------------------------

export interface DoctorEntry {
  target:  string;
  skill:   string;
  status:  'healthy' | 'missing' | 'modified' | 'conflict';
  detail?: string;
}

export function renderDoctorTable(entries: DoctorEntry[]): string {
  if (entries.length === 0) {
    return `\n  ${icon.ok} ${theme.ok('All installed skills are healthy.')}\n`;
  }

  const table = new Table({
    head: [theme.dim('Target'), theme.dim('Skill'), theme.dim('Status'), theme.dim('Detail')],
    style: { head: [], border: ['gray'] },
    colWidths: [18, 22, 13, 38],
    wordWrap: true,
  });

  for (const e of entries) {
    let statusCell: string;
    switch (e.status) {
      case 'healthy':
        statusCell = `${icon.ok} ${theme.ok('OK')}`; break;
      case 'missing':
        statusCell = `${icon.err} ${theme.error('MISSING')}`; break;
      case 'modified':
        statusCell = `${icon.warn} ${theme.warn('MODIFIED')}`; break;
      case 'conflict':
        statusCell = `${icon.err} ${theme.error('CONFLICT')}`; break;
    }
    table.push([theme.dim(e.target), theme.bold(e.skill), statusCell, e.detail ?? '']);
  }

  return '\n' + table.toString() + '\n';
}

// ---------------------------------------------------------------------------
// Install summary
// ---------------------------------------------------------------------------

export interface InstallSummaryEntry {
  target:  string;
  skill:   string;
  action:  'installed' | 'skipped' | 'dry-run' | 'backed-up';
  path?:   string;
}

export function renderInstallSummary(entries: InstallSummaryEntry[]): string {
  const lines: string[] = [];
  for (const e of entries) {
    switch (e.action) {
      case 'installed':
        lines.push(`  ${icon.fix} ${theme.ok('Installed')} ${theme.bold(e.skill)} ${theme.dim('→')} ${theme.dim(e.target)}${e.path ? theme.dim('  ' + e.path) : ''}`);
        break;
      case 'backed-up':
        lines.push(`  ${icon.backup} ${theme.dim('Backed up')} ${theme.dim(e.path ?? '')}`);
        break;
      case 'skipped':
        lines.push(`  ${theme.dim(icon.warn + ' Skipped')} ${theme.dim(e.skill)} ${theme.dim('(already installed in')} ${e.target}${theme.dim(')')}`);
        break;
      case 'dry-run':
        lines.push(`  ${theme.info('~')} ${theme.dim('[dry-run]')} would install ${theme.bold(e.skill)} ${theme.dim('→')} ${e.target}`);
        break;
    }
  }
  return lines.join('\n') + '\n';
}
