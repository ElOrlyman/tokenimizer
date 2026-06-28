import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  estimateDetailed,
  formatTokens,
  classifyTaskByKeywords,
  summarizeBudget,
} from '../context/tokenizer.js';

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates ~4 chars per token', () => {
    // 400 chars / 4 = 100 tokens
    const text = 'a'.repeat(400);
    expect(estimateTokens(text)).toBe(100);
  });

  it('rounds up partial tokens', () => {
    // 5 chars → ceil(5/4) = 2
    expect(estimateTokens('hello')).toBe(2);
  });
});

describe('estimateDetailed', () => {
  it('includes chars, tokens, and label', () => {
    const text = 'hello world';
    const result = estimateDetailed(text);
    expect(result.chars).toBe(text.length);
    expect(result.tokens).toBe(Math.ceil(text.length / 4));
    expect(result.label).toMatch(/^~/);
  });
});

describe('formatTokens', () => {
  it('formats small counts with ~ prefix', () => {
    expect(formatTokens(50)).toBe('~50');
  });

  it('formats 1000+ as k notation', () => {
    expect(formatTokens(1000)).toBe('~1.0k');
    expect(formatTokens(2500)).toBe('~2.5k');
  });
});

describe('classifyTaskByKeywords', () => {
  it('classifies typos as trivial', () => {
    expect(classifyTaskByKeywords('fix typo in comment')).toBe('trivial');
  });

  it('classifies renames as simple', () => {
    expect(classifyTaskByKeywords('rename the helper function')).toBe('simple');
  });

  it('classifies architecture work as reasoning', () => {
    expect(classifyTaskByKeywords('architect the new auth module')).toBe('reasoning');
  });

  it('classifies debugging as complex', () => {
    expect(classifyTaskByKeywords('debug the login failure')).toBe('complex');
  });

  it('defaults to medium for ambiguous tasks', () => {
    expect(classifyTaskByKeywords('work on the feature')).toBe('medium');
  });
});

describe('summarizeBudget', () => {
  it('totals all values and provides breakdown', () => {
    const items = { 'project_summary.md': 200, 'architecture.md': 400 };
    const result = summarizeBudget(items);
    expect(result.total).toBe(600);
    expect(result.breakdown).toHaveLength(2);
    expect(result.label).toMatch(/^~/);
  });
});
