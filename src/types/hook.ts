export type HookName = 'post-commit' | 'post-checkout' | 'post-merge' | 'pre-push';

export const ALL_HOOKS: HookName[] = [
  'post-commit',
  'post-checkout',
  'post-merge',
  'pre-push',
];

export interface HookStatus {
  name:      HookName;
  installed: boolean;
  shared:    boolean;  // true if tokenimizer shares the hook file with another tool
  lastFired: string | null;
}
