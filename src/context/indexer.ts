import fs from 'fs';
import path from 'path';
import glob from 'fast-glob';
import { writeAtomic, ensureDir } from '../utils/fs.js';
import { estimateTokens, formatTokens } from './tokenizer.js';

const CACHE_DIR = (cwd: string) => path.join(cwd, '.tokenimizer', 'cache');

const IGNORE = [
  '**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**',
  '**/coverage/**', '**/.next/**', '**/.tokenimizer/**',
  '**/*.min.js', '**/*.min.css', '**/*.map',
];

export interface IndexResult {
  artifacts: Array<{ name: string; tokens: number; path: string }>;
  totalTokens: number;
}

// ---------------------------------------------------------------------------
// Symbol extractor (regex-based, no AST parser dependency)
// ---------------------------------------------------------------------------

interface Symbol {
  kind:   'function' | 'class' | 'interface' | 'type' | 'const' | 'export';
  name:   string;
  file:   string;
  line:   number;
}

const SYMBOL_PATTERNS: Array<{ kind: Symbol['kind']; re: RegExp }> = [
  { kind: 'function',  re: /^export\s+(?:async\s+)?function\s+(\w+)/m },
  { kind: 'class',     re: /^export\s+(?:abstract\s+)?class\s+(\w+)/m },
  { kind: 'interface', re: /^export\s+interface\s+(\w+)/m },
  { kind: 'type',      re: /^export\s+type\s+(\w+)/m },
  { kind: 'const',     re: /^export\s+const\s+(\w+)/m },
];

async function extractSymbols(cwd: string): Promise<Symbol[]> {
  const files = await glob(['src/**/*.{ts,tsx,js,jsx}', 'lib/**/*.{ts,js}'], {
    cwd, ignore: IGNORE, onlyFiles: true, absolute: true,
  });

  const symbols: Symbol[] = [];

  for (const file of files.slice(0, 100)) {
    let content: string;
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }

    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      for (const { kind, re } of SYMBOL_PATTERNS) {
        const m = line.match(re);
        if (m) {
          symbols.push({
            kind,
            name: m[1],
            file: path.relative(cwd, file).replace(/\\/g, '/'),
            line: idx + 1,
          });
        }
      }
    });
  }

  return symbols;
}

// ---------------------------------------------------------------------------
// Dependency graph (import → file mapping)
// ---------------------------------------------------------------------------

interface DepNode {
  file:    string;
  imports: string[];
}

const IMPORT_RE = /^(?:import|export)\s+(?:.*?)\s+from\s+['"]([^'"]+)['"]/gm;

async function buildDependencyGraph(cwd: string): Promise<DepNode[]> {
  const files = await glob(['src/**/*.{ts,tsx,js,jsx}'], {
    cwd, ignore: IGNORE, onlyFiles: true, absolute: true,
  });

  const nodes: DepNode[] = [];

  for (const file of files.slice(0, 80)) {
    let content: string;
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }

    const imports: string[] = [];
    let m: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(content)) !== null) {
      imports.push(m[1]);
    }

    nodes.push({
      file:    path.relative(cwd, file).replace(/\\/g, '/'),
      imports: [...new Set(imports)],
    });
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// API map — exported functions with signature summary
// ---------------------------------------------------------------------------

interface ApiEntry {
  name:      string;
  file:      string;
  signature: string;
}

const FN_SIG_RE = /^(export\s+(?:async\s+)?function\s+\w+\([^)]{0,120}\)(?:\s*:\s*\S+)?)/m;

async function buildApiMap(cwd: string): Promise<ApiEntry[]> {
  const files = await glob(['src/**/*.{ts,tsx,js,jsx}'], {
    cwd, ignore: IGNORE, onlyFiles: true, absolute: true,
  });

  const entries: ApiEntry[] = [];

  for (const file of files.slice(0, 80)) {
    let content: string;
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }

    const relFile = path.relative(cwd, file).replace(/\\/g, '/');
    const lines   = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const chunk = lines.slice(i, i + 3).join('\n');
      const m = chunk.match(FN_SIG_RE);
      if (m) {
        const sig  = m[1].replace(/\s+/g, ' ').trim();
        const name = sig.match(/function\s+(\w+)/)?.[1] ?? '';
        if (name) {
          entries.push({ name, file: relFile, signature: sig });
        }
      }
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Conventions extractor
// ---------------------------------------------------------------------------

async function extractConventions(cwd: string): Promise<string> {
  const sources: string[] = [];

  // Read existing contributing/convention docs
  const conventionFiles = [
    'CONTRIBUTING.md', 'CONVENTIONS.md', 'STYLE.md', '.github/CONTRIBUTING.md',
    'docs/conventions.md', 'docs/contributing.md',
  ];
  for (const f of conventionFiles) {
    const full = path.join(cwd, f);
    if (fs.existsSync(full)) {
      sources.push(fs.readFileSync(full, 'utf8').slice(0, 2000));
    }
  }

  // tsconfig strictness
  const tsconfigPath = path.join(cwd, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    try {
      const tc = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      const opts = tc.compilerOptions ?? {};
      const flags = ['strict', 'noImplicitAny', 'strictNullChecks', 'esModuleInterop', 'noUnusedLocals']
        .filter(k => opts[k] === true);
      if (flags.length) sources.push(`TypeScript strict flags: ${flags.join(', ')}`);
    } catch { /* ignore */ }
  }

  // Package manager
  const hasYarn   = fs.existsSync(path.join(cwd, 'yarn.lock'));
  const hasPnpm   = fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'));
  const hasBun    = fs.existsSync(path.join(cwd, 'bun.lock'));
  const pm = hasYarn ? 'yarn' : hasPnpm ? 'pnpm' : hasBun ? 'bun' : 'npm';
  sources.push(`Package manager: ${pm}`);

  if (!sources.length) {
    return '# Conventions\n\n_No convention files found. Add CONTRIBUTING.md or CONVENTIONS.md._\n';
  }

  return [
    '# Conventions',
    '',
    ...sources.map((s, i) => (sources.length > 1 ? `## Source ${i + 1}\n${s}` : s)),
    '',
    `_Generated by tokenimizer on ${new Date().toISOString().split('T')[0]}_`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Architecture JSON — machine-readable folder structure + module purposes
// ---------------------------------------------------------------------------

async function buildArchitectureJson(cwd: string): Promise<object> {
  const IGNORE = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.tokenimizer'];
  const result: Record<string, { files: number; types: string[]; purpose?: string }> = {};

  const sourceFiles = await glob(['**/*.{ts,tsx,js,jsx,py,go,rs,java,cs}'], {
    cwd,
    ignore: IGNORE.map(d => `**/${d}/**`),
    onlyFiles: true,
    deep: 4,
  });

  for (const f of sourceFiles) {
    const dir = path.dirname(f) || '.';
    if (!result[dir]) result[dir] = { files: 0, types: [] };
    result[dir].files++;
    const ext = path.extname(f).replace('.', '');
    if (!result[dir].types.includes(ext)) result[dir].types.push(ext);
  }

  // Heuristic purpose detection from directory name
  const PURPOSE_HINTS: Record<string, string> = {
    commands: 'CLI command handlers',
    core:     'Core business logic',
    utils:    'Utility helpers',
    ui:       'Terminal UI components',
    types:    'TypeScript type definitions',
    context:  'Context lifecycle and compression',
    registry: 'Skill registry and routing config',
    tests:    'Test files',
    hooks:    'Git hook scripts',
    watcher:  'Background file system watcher',
    scripts:  'Build and utility scripts',
  };

  for (const dir of Object.keys(result)) {
    const base = path.basename(dir);
    if (PURPOSE_HINTS[base]) result[dir].purpose = PURPOSE_HINTS[base];
  }

  return {
    generatedAt: new Date().toISOString(),
    root:        cwd,
    modules:     result,
  };
}

// ---------------------------------------------------------------------------
// Wiki — auto-generated project wiki from README + docs
// ---------------------------------------------------------------------------

async function buildWiki(cwd: string): Promise<string> {
  const sections: string[] = [
    '# Project Wiki',
    '',
    '> Auto-generated from README and docs. Edit this file to add detail.',
    '',
  ];

  // Find all markdown docs
  const docFiles = await glob(['README.md', 'docs/**/*.md', 'CHANGELOG.md', 'CONTRIBUTING.md'], {
    cwd,
    ignore: ['**/node_modules/**', '**/.tokenimizer/**'],
    onlyFiles: true,
    deep: 3,
  });

  for (const f of docFiles.slice(0, 8)) {
    const full    = path.join(cwd, f);
    const content = fs.readFileSync(full, 'utf8');
    // Extract headings + first paragraph after each
    const lines   = content.split('\n');
    const excerpt: string[] = [];
    let   chars = 0;
    const LIMIT = 600;

    for (const line of lines) {
      if (chars >= LIMIT) break;
      excerpt.push(line);
      chars += line.length + 1;
    }

    sections.push(`## ${f}`);
    sections.push(excerpt.join('\n').trim());
    sections.push('');
  }

  if (docFiles.length === 0) {
    sections.push('_No README or docs found. Add a README.md to seed the wiki._');
  }

  sections.push(`_Generated by tokenimizer on ${new Date().toISOString().split('T')[0]}_`);
  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// Glossary — scan for recurring domain terms
// ---------------------------------------------------------------------------

async function buildGlossary(cwd: string): Promise<string> {
  const readmePath = [
    path.join(cwd, 'README.md'),
    path.join(cwd, 'docs/README.md'),
  ].find(p => fs.existsSync(p));

  if (!readmePath) {
    return '# Glossary\n\n_Add a README.md to enable glossary generation._\n';
  }

  const readme  = fs.readFileSync(readmePath, 'utf8').slice(0, 8000);
  // Extract bold/code terms as potential domain vocabulary
  const terms   = new Set<string>();
  const boldRe  = /\*\*([^*]{2,40})\*\*/g;
  const codeRe  = /`([a-zA-Z]\w{2,30})`/g;
  let m: RegExpExecArray | null;

  while ((m = boldRe.exec(readme)) !== null) terms.add(m[1]);
  while ((m = codeRe.exec(readme)) !== null) terms.add(m[1]);

  const termList = [...terms].slice(0, 40).map(t => `- **${t}** — [describe]`).join('\n');

  return [
    '# Glossary',
    '',
    '> Auto-detected domain terms. Fill in definitions.',
    '',
    termList || '_No terms detected._',
    '',
    `_Generated by tokenimizer on ${new Date().toISOString().split('T')[0]}_`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function buildIndex(cwd: string): Promise<IndexResult> {
  const dir = CACHE_DIR(cwd);
  ensureDir(dir);

  const artifacts: IndexResult['artifacts'] = [];

  // symbols.json
  const symbols = await extractSymbols(cwd);
  const symbolsJson = JSON.stringify(symbols, null, 2);
  const symbolsPath = path.join(dir, 'symbols.json');
  writeAtomic(symbolsPath, symbolsJson);
  artifacts.push({ name: 'symbols.json', tokens: estimateTokens(symbolsJson), path: symbolsPath });

  // api-map.json
  const apiMap = await buildApiMap(cwd);
  const apiMapJson = JSON.stringify(apiMap, null, 2);
  const apiMapPath = path.join(dir, 'api-map.json');
  writeAtomic(apiMapPath, apiMapJson);
  artifacts.push({ name: 'api-map.json', tokens: estimateTokens(apiMapJson), path: apiMapPath });

  // dependency-graph.json
  const depGraph = await buildDependencyGraph(cwd);
  const depGraphJson = JSON.stringify(depGraph, null, 2);
  const depGraphPath = path.join(dir, 'dependency-graph.json');
  writeAtomic(depGraphPath, depGraphJson);
  artifacts.push({ name: 'dependency-graph.json', tokens: estimateTokens(depGraphJson), path: depGraphPath });

  // conventions.md
  const conventions = await extractConventions(cwd);
  const conventionsPath = path.join(dir, 'conventions.md');
  writeAtomic(conventionsPath, conventions);
  artifacts.push({ name: 'conventions.md', tokens: estimateTokens(conventions), path: conventionsPath });

  // glossary.md
  const glossary = await buildGlossary(cwd);
  const glossaryPath = path.join(dir, 'glossary.md');
  writeAtomic(glossaryPath, glossary);
  artifacts.push({ name: 'glossary.md', tokens: estimateTokens(glossary), path: glossaryPath });

  // architecture.json
  const archJson     = await buildArchitectureJson(cwd);
  const archJsonStr  = JSON.stringify(archJson, null, 2);
  const archJsonPath = path.join(dir, 'architecture.json');
  writeAtomic(archJsonPath, archJsonStr);
  artifacts.push({ name: 'architecture.json', tokens: estimateTokens(archJsonStr), path: archJsonPath });

  // wiki.md
  const wiki     = await buildWiki(cwd);
  const wikiPath = path.join(dir, 'wiki.md');
  writeAtomic(wikiPath, wiki);
  artifacts.push({ name: 'wiki.md', tokens: estimateTokens(wiki), path: wikiPath });

  // Write manifest
  const manifest = {
    generatedAt:  new Date().toISOString(),
    cwd,
    artifacts: artifacts.map(a => ({ name: a.name, tokens: a.tokens })),
    totalTokens: artifacts.reduce((s, a) => s + a.tokens, 0),
  };
  writeAtomic(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  return {
    artifacts,
    totalTokens: manifest.totalTokens,
  };
}

export function getCacheDir(cwd: string): string {
  return CACHE_DIR(cwd);
}
