// Character-based token estimation. Always labeled as estimates, never claimed as exact.
// ~4 chars/token is widely cited for English/code; actual values vary by tokenizer.

export interface TokenEstimate {
  chars:    number;
  tokens:   number;  // estimate
  label:    string;  // human-readable, always includes "~" prefix
}

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateDetailed(text: string): TokenEstimate {
  const chars  = text.length;
  const tokens = Math.ceil(chars / CHARS_PER_TOKEN);
  return {
    chars,
    tokens,
    label: formatTokens(tokens),
  };
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `~${(tokens / 1000).toFixed(1)}k`;
  }
  return `~${tokens}`;
}

export function summarizeBudget(items: Record<string, number>): {
  total: number;
  label: string;
  breakdown: Array<{ name: string; tokens: number; label: string }>;
} {
  let total = 0;
  const breakdown = Object.entries(items).map(([name, tokens]) => {
    total += tokens;
    return { name, tokens, label: formatTokens(tokens) };
  });
  return { total, label: formatTokens(total), breakdown };
}

// Model tier guidance based on task complexity.
// Used by recommend-model command with routing.json config.
export type TaskComplexity = 'trivial' | 'simple' | 'medium' | 'complex' | 'reasoning';

export function classifyTaskByKeywords(taskDescription: string): TaskComplexity {
  const lower = taskDescription.toLowerCase();

  const reasoningKeywords = [
    'architect', 'design', 'refactor entire', 'migrate', 'security audit',
    'performance analysis', 'optimize system', 'plan', 'strategy',
  ];
  const complexKeywords = [
    'debug', 'investigate', 'analyze', 'implement feature', 'add support for',
    'integrate', 'build', 'create module', 'test coverage',
  ];
  const simpleKeywords = [
    'fix', 'update', 'rename', 'move', 'add field', 'change message',
    'bump version', 'add import', 'format', 'lint', 'comment',
  ];
  const trivialKeywords = [
    'typo', 'spacing', 'whitespace', 'comma', 'period', 'semicolon',
    'trailing newline', 'blank line',
  ];

  if (trivialKeywords.some(k => lower.includes(k)))   return 'trivial';
  if (simpleKeywords.some(k => lower.includes(k)))     return 'simple';
  if (reasoningKeywords.some(k => lower.includes(k)))  return 'reasoning';
  if (complexKeywords.some(k => lower.includes(k)))    return 'complex';
  return 'medium';
}
