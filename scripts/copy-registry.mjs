#!/usr/bin/env node
// Copies src/registry/ → dist/registry/ after the esbuild bundle step.
import { cpSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src  = join(__dirname, '..', 'src', 'registry');
const dest = join(__dirname, '..', 'dist', 'registry');

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('  ✓ registry copied to dist/registry/');
