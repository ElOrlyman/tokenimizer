import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildIndex, getCacheDir } from '../context/indexer.js';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tokenimizer-indexer-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeFile(dir: string, filePath: string, content: string): void {
  const full = path.join(dir, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

describe('buildIndex', () => {
  let cwd: string;

  beforeEach(() => { cwd = tmpDir(); });
  afterEach(() => cleanup(cwd));

  it('builds all 7 artifacts in an empty project', async () => {
    const result = await buildIndex(cwd);
    const names = result.artifacts.map(a => a.name);
    expect(names).toContain('symbols.json');
    expect(names).toContain('api-map.json');
    expect(names).toContain('dependency-graph.json');
    expect(names).toContain('conventions.md');
    expect(names).toContain('glossary.md');
    expect(names).toContain('architecture.json');
    expect(names).toContain('wiki.md');
    expect(result.artifacts).toHaveLength(7);
  });

  it('writes all artifact files to .tokenimizer/cache/', async () => {
    await buildIndex(cwd);
    const cacheDir = getCacheDir(cwd);
    expect(fs.existsSync(path.join(cacheDir, 'symbols.json'))).toBe(true);
    expect(fs.existsSync(path.join(cacheDir, 'api-map.json'))).toBe(true);
    expect(fs.existsSync(path.join(cacheDir, 'conventions.md'))).toBe(true);
    expect(fs.existsSync(path.join(cacheDir, 'manifest.json'))).toBe(true);
  });

  it('extracts exported functions from TypeScript files', async () => {
    writeFile(cwd, 'src/foo.ts', [
      'export function myFunction(x: number): string { return String(x); }',
      'export const myConst = 42;',
      'export class MyClass {}',
    ].join('\n'));

    const result = await buildIndex(cwd);
    const symbolsPath = path.join(getCacheDir(cwd), 'symbols.json');
    const symbols = JSON.parse(fs.readFileSync(symbolsPath, 'utf8'));

    const names = symbols.map((s: { name: string }) => s.name);
    expect(names).toContain('myFunction');
    expect(names).toContain('myConst');
    expect(names).toContain('MyClass');
  });

  it('builds dependency graph from import statements', async () => {
    writeFile(cwd, 'src/a.ts', `import { foo } from './b.js';`);
    writeFile(cwd, 'src/b.ts', `export const foo = 1;`);

    await buildIndex(cwd);
    const depPath = path.join(getCacheDir(cwd), 'dependency-graph.json');
    const deps = JSON.parse(fs.readFileSync(depPath, 'utf8'));
    const aEntry = deps.find((d: { file: string }) => d.file === 'src/a.ts');
    expect(aEntry).toBeDefined();
    expect(aEntry.imports).toContain('./b.js');
  });

  it('writes manifest.json with totalTokens', async () => {
    const result = await buildIndex(cwd);
    const manifestPath = path.join(getCacheDir(cwd), 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.totalTokens).toBe(result.totalTokens);
    expect(manifest.artifacts).toHaveLength(7);
  });

  it('extracts tsconfig flags into conventions.md', async () => {
    writeFile(cwd, 'tsconfig.json', JSON.stringify({
      compilerOptions: { strict: true, noUnusedLocals: true },
    }));

    await buildIndex(cwd);
    const conventionsPath = path.join(getCacheDir(cwd), 'conventions.md');
    const conventions = fs.readFileSync(conventionsPath, 'utf8');
    expect(conventions).toContain('strict');
    expect(conventions).toContain('noUnusedLocals');
  });

  it('reads wiki content from README.md', async () => {
    writeFile(cwd, 'README.md', '# My Project\n\nThis is the readme.\n');

    await buildIndex(cwd);
    const wikiPath = path.join(getCacheDir(cwd), 'wiki.md');
    const wiki = fs.readFileSync(wikiPath, 'utf8');
    expect(wiki).toContain('README.md');
    expect(wiki).toContain('My Project');
  });

  it('all artifacts have positive token estimates', async () => {
    const result = await buildIndex(cwd);
    for (const artifact of result.artifacts) {
      expect(artifact.tokens).toBeGreaterThan(0);
    }
  });
});
