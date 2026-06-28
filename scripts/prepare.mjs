#!/usr/bin/env node
// Runs after npm install. Ensures dist/ exists.
import { existsSync } from 'fs';
import { execSync } from 'child_process';

if (!existsSync('dist/cli.js')) {
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch {
    // Not fatal — build may fail in constrained environments
  }
}
