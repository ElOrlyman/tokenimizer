<p align="center">
  <img src="assets/logo.svg" alt="tokenimizer" width="280" />
</p>

# tokenimizer

The operating system for token-efficient AI workflows.

Install once per project. Every AI assistant you use — Claude Code, Copilot, Cursor, Windsurf,
Aider — reads the same instructions and immediately costs less to run.

```bash
npx tokenimizer init
```

---

## How it works

tokenimizer operates across three complementary layers. You configure once; all three run
automatically from that point forward.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         YOUR PROJECT DIRECTORY                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 1 — SKILL FILES  (always on, zero overhead)                  │   │
│  │                                                                     │   │
│  │  .claude/CLAUDE.md          ←  Claude Code reads this on start     │   │
│  │  .cursorrules               ←  Cursor reads this on start          │   │
│  │  .github/copilot-instructions.md  ←  Copilot reads this            │   │
│  │  .windsurfrules             ←  Windsurf reads this on start        │   │
│  │  .aider.conf.yml            ←  Aider reads this on start           │   │
│  │                                                                     │   │
│  │  Each file contains fenced skill blocks installed by tokenimizer.  │   │
│  │  The AI reads them every session. No process running. No cost.     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 2 — GIT HOOKS  (event-driven, fires at git checkpoints)     │   │
│  │                                                                     │   │
│  │  post-commit   →  regenerate context docs (project_summary, handoff)│   │
│  │  post-checkout →  refresh handoff when you switch branches         │   │
│  │  post-merge    →  rebuild repo memory index after a pull/merge     │   │
│  │  pre-push      →  warn if index is stale (non-blocking)            │   │
│  │                                                                     │   │
│  │  Hooks are non-blocking. They never fail a git operation.          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 3 — BACKGROUND WATCHER  (optional, opt-in)                  │   │
│  │                                                                     │   │
│  │  tokenimizer watch  →  chokidar daemon watches src/**              │   │
│  │                         marks index stale when files change         │   │
│  │                         writes only to .tokenimizer/ — never       │   │
│  │                         touches your source files                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  .tokenimizer/                                                              │
│  ├── context/        ← lifecycle docs (user-maintained, commit these)       │
│  │   ├── project_summary.md                                                 │
│  │   ├── architecture.md                                                    │
│  │   ├── session_summary.md                                                 │
│  │   ├── progress.md                                                        │
│  │   ├── handoff.md                                                         │
│  │   └── current_task.md                                                    │
│  ├── cache/          ← generated index (gitignored)                         │
│  │   ├── symbols.json                                                       │
│  │   ├── api-map.json                                                       │
│  │   ├── dependency-graph.json                                              │
│  │   ├── architecture.json                                                  │
│  │   ├── conventions.md                                                     │
│  │   ├── glossary.md                                                        │
│  │   └── wiki.md                                                            │
│  ├── snapshots/      ← session checkpoints (gitignored)                     │
│  └── hooks/          ← hook scripts called by .git/hooks/ (gitignored)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Installation

```bash
# Interactive setup — detects all your AI assistants and installs skills
npx tokenimizer init

# Or install globally
npm install -g tokenimizer
tokenimizer init
```

---

## The 7 token-saving skills

Skills are instruction blocks installed into your AI assistant config files. The AI reads them
on every session start. You install once; the savings apply automatically forever.

### Recommended — install these first

---

#### Caveman Mode  `–65% output tokens`

The single highest-impact skill. Instructs the AI to cut all verbosity: no preambles, no
"Great question!", no trailing summaries of what it just did. Technical accuracy is
preserved — only padding is removed.

```
Before (caveman off):
  "Great catch! Looking at auth.ts, I can see that on line 42 there is a
   missing await keyword before the verifyToken() function call, which would
   cause a Promise to be returned instead of the resolved value..."

After (caveman on):
  "Bug in auth.ts:42 — missing await on verifyToken()"
```

A typical code session generates 3–5x fewer output tokens with this skill active.

Activate with: `/caveman` or "caveman mode"

---

#### Patch-Only Coding  `–80% output tokens on edits`

Instructs the AI to output only the changed lines — never rewrite entire files. Uses unified
diff format, function-level replacements, or line-range patches with context markers.

```
Before (patch-only off):
  [entire 300-line file repeated with one line changed]

After (patch-only on):
  --- a/src/auth.ts
  +++ b/src/auth.ts
  @@ -40,7 +40,7 @@
     const token = req.headers.authorization;
  -  const user = verifyToken(token);
  +  const user = await verifyToken(token);
     return user;
```

If the whole file must be rewritten, the AI states why first.

---

#### Context Compressor  `–70% input tokens on session restart`

Instructs the AI to compress long conversations into a structured ~500-token re-entry block
when asked. Paste it as the first message of a new session to restore full context at a
fraction of the cost.

```
/compress → produces:

## Session Snapshot — 2026-06-28

**Project:** tokenimizer v0.2.0 — token-efficient AI workflow CLI
**Stack:** TypeScript, Node.js, esbuild, commander, vitest
**What was decided:**
- Three-layer architecture: skill files + git hooks + background watcher
- No heavy deps: readline for UI, fast-glob + regex for indexing
**Current state:** v2 complete — 7 skills, 14 commands, 57 tests passing
**Next step:** Publish to npm
```

Pair with `tokenimizer checkpoint` to save snapshots to `.tokenimizer/snapshots/`.

---

#### Repo-Aware Minimal Context  `–40% input tokens`

Instructs the AI to load context progressively instead of pulling in entire repositories
upfront. The loading order is enforced:

```
1. project_summary.md   (~500 tokens)
2. Relevant module      (~200 tokens)
3. Specific files       (only what's needed)
4. Specific functions   (patch-level, not full file)
5. Solve
```

The AI must ask explicitly for more context if needed rather than pre-loading everything.
Locks out node_modules, lockfiles, build outputs, and log files by default.

---

### Optional — situational

---

#### Ask-Less Mode  `eliminates 1–3 roundtrips per task`

Instructs the AI to make a reasonable assumption, state it in one line, and proceed — instead
of asking clarifying questions before acting.

```
Format: "Assuming [X]. If wrong, correct me."

Only stops to ask when ambiguity would cause irreversible harm:
- Deleting files not mentioned
- Force-pushing git history
- Changing a public API contract
```

---

#### Planner / Executor Split  `–20% input / –30% output`

Two-phase workflow that separates reasoning from mechanical execution:

```
PLAN phase   →  reason about the problem, produce a structured plan, write no code
EXECUTE phase →  follow the plan mechanically, output only diffs and confirmations
```

This routes expensive reasoning to capable models and mechanical implementation to cheaper
ones. The plan phase output is compact and can be handed off between model tiers.

Trigger with: `/plan [task]` then `/execute`

---

#### Cost Guardrails  `prevents runaway large operations`

Before executing any operation that touches more than 5 files or generates more than ~500
lines, the AI produces an estimate and asks for confirmation:

```
Cost estimate:
  Scope:         8 files, ~420 lines affected
  Input tokens:  ~8,000–12,000 (estimate)
  Output tokens: ~3,000–5,000 (estimate)
  Risk:          medium — modifies auth module

Proceed?
```

Estimates are always labeled as estimates. Say "yes" or "just do it" to proceed.

---

## Token impact summary

| Skill | Input tokens | Output tokens | When it fires |
|---|---|---|---|
| Caveman Mode | — | **–65%** | Every response |
| Patch-Only Coding | — | **–80%** | Every code edit |
| Context Compressor | **–70%** | — | Session restart |
| Repo-Aware Context | **–40%** | — | Every new session |
| Ask-Less Mode | –15% | –10% | Before each task |
| Planner/Executor | –20% | –30% | Complex tasks |
| Cost Guardrails | –25% | –20% | Large operations |

All figures are estimates. Actual savings depend on your workflow, model, and task type.

---

## The mechanics — why these numbers matter

### Output tokens cost 3–5x more than input tokens

Every major AI provider charges significantly more for generated output than for input context.
At current published rates:

| Provider / Model | Input | Output | Ratio |
|---|---|---|---|
| Claude Sonnet 4.6 | $3 / MTok | $15 / MTok | **5×** |
| Claude Opus 4.8 | $15 / MTok | $75 / MTok | **5×** |
| Claude Haiku 4.5 | $0.80 / MTok | $4 / MTok | **5×** |
| GPT-4o | $2.50 / MTok | $10 / MTok | **4×** |
| GPT-4o-mini | $0.15 / MTok | $0.60 / MTok | **4×** |

This means **output suppression skills (Caveman Mode, Patch-Only) have the highest dollar
return per token saved** — roughly 4–5× better ROI than the same reduction in input tokens.

### Where each skill attacks the bill

**Output token suppression (highest ROI):**

- **Caveman Mode** targets conversational filler — preambles, "Great question!", trailing
  summaries, explanatory prose. These add zero technical value but can double response
  length in a typical session. Removing them cuts output 50–70% while preserving precision.

- **Patch-Only Coding** targets code output. Without it, an AI editing three lines of a
  300-line file often reprints the whole file "for context." With it, output is a function
  replacement or a unified diff — the same information in ~5% of the tokens.

**Input token compression (second priority):**

- **Context Compressor** prevents you from carrying 50,000+ tokens of raw chat history into
  a new session. A compressed snapshot restores full context at 300–600 tokens. Starting
  fresh from a snapshot instead of a continued conversation saves ~70% of input tokens on
  session restart.

- **Repo-Aware Minimal Context** blocks the aggressive context loading common in IDE agents
  (reading lockfiles, entire directory trees, build artifacts). Enforcing progressive loading
  (project summary → module → file → function) keeps the context window lean from the start.

---

## Trade-offs and when it is NOT worth it

tokenimizer has a real cost: every installed skill injects a static instruction block into
your AI assistant's config file. Installing all 7 skills adds approximately **800–1,000
tokens of permanent system context** to every session (measured from the actual skill file
sizes in `src/registry/skills/`).

If you run short, one-off sessions — ask two questions, close the tab — the instruction
overhead can exceed what you save on output. The break-even point is roughly:

> **Break-even:** session output tokens saved > ~1,000 input tokens of overhead

For long coding sessions this break-even is crossed within minutes. For a single quick
lookup, it may never be crossed.

### Known caveats

**Skill toggles are more efficient than always-on**

Caveman Mode is blunt by design. It is the right default during intense coding and
refactoring, but it reduces explanatory quality for learning tasks or architectural
discussions where you want the AI to reason aloud. Use the toggle:

```
/caveman    ← activate for focused implementation work
/normal     ← deactivate when you need detailed explanations
```

**Patch-Only and native IDE tools can interact**

Claude Code and similar tools have built-in targeted edit primitives (they write specific
blocks, not whole files). The Patch-Only skill is compatible with these — it allows
function-level replacements as the primary format, not only strict unified diffs — but
on complex multi-file tasks the instruction overhead occasionally causes the model to
over-think the output format before acting. If you find this happening, uninstall just
the patch-only skill: `tokenimizer uninstall patch-only`.

**Context docs require maintenance**

`session_summary.md`, `progress.md`, and `current_task.md` are templates. If left
unfilled or stale they burn input tokens for no benefit. The git hooks (`post-commit`,
`post-checkout`) refresh the auto-generated docs automatically, but the user-maintained
files are yours to keep current.

---

## Is it worth it for your workflow?

| Profile | Worth it? | Reason |
|---|---|---|
| Heavy IDE agent usage (Claude Code, Cursor, Windsurf) | **Yes — high ROI** | Output tokens accumulate fast in long agentic sessions; caveman + patch-only cut the majority |
| Large codebase refactoring | **Yes — high ROI** | Progressive context loading prevents context window exhaustion; patch-only keeps diffs small |
| API cost-conscious teams | **Yes — high ROI** | Direct reduction in billable output tokens across Anthropic / OpenAI / Gemini keys |
| Learning new concepts or frameworks | **Selective** | Install context-compressor and repo-aware-context; skip caveman (you want the explanations) |
| Casual or beginner use | **Low ROI** | Terse caveman output reduces learning quality; short sessions don't amortize the overhead |
| Short one-off scripting | **Low ROI** | Static instruction overhead (~1,000 tokens) outweighs output savings on brief tasks |

**Recommended minimum setup** for most developers: install `caveman` and `context-compressor`,
skip the rest until you feel the pain they solve. Add skills one at a time so you can
measure their individual effect.

---

## Context lifecycle

`tokenimizer context init` generates six structured documents that tell the AI about your
project without loading the entire codebase:

| Document | Purpose | Target size |
|---|---|---|
| `project_summary.md` | Name, purpose, structure, key scripts | ~500 tokens |
| `architecture.md` | Source layout, config files present | ~1,000 tokens |
| `session_summary.md` | What you worked on this session | ~300 tokens |
| `progress.md` | Task list with completion status | ~400 tokens |
| `handoff.md` | Compact block for session restart | ~600 tokens |
| `current_task.md` | What you are working on right now | ~200 tokens |

Auto-generated docs (`project_summary`, `architecture`, `handoff`) are refreshed by
`tokenimizer context refresh` and by the `post-commit` git hook. User-maintained docs
(`session_summary`, `progress`, `current_task`) are templates — you fill them in.

These files live in `.tokenimizer/context/` and should be committed to your repo.

---

## Repository memory index

`tokenimizer index` scans your project with regex-based analysis (no AST parser required)
and produces LLM-optimized artifacts in `.tokenimizer/cache/`:

| Artifact | Contents |
|---|---|
| `symbols.json` | Every exported function, class, interface, type, and const with file:line |
| `api-map.json` | Public API surface — function signatures only |
| `dependency-graph.json` | Import map — which files import which |
| `architecture.json` | Folder structure with file counts and inferred module purposes |
| `conventions.md` | TypeScript strict flags, package manager, coding conventions |
| `glossary.md` | Domain terms extracted from README and docs |
| `wiki.md` | Auto-generated project wiki from README and docs |

The cache is gitignored. Rebuild with `tokenimizer index`. The background watcher
(`tokenimizer watch`) marks it stale automatically when source files change.

---

## Session compression workflow

```
During a long session:

  User:  /compress
  AI:    [produces Session Snapshot block — ~400 tokens]

  tokenimizer checkpoint my-feature    ← saves snapshot to .tokenimizer/snapshots/

Starting a new session:

  tokenimizer handoff --stdout | pbcopy   ← copy to clipboard
  [paste as first message]                ← AI has full context at ~400 tokens
```

Commands:

```bash
tokenimizer compress              # print compressed block to terminal
tokenimizer checkpoint [label]    # save snapshot to .tokenimizer/snapshots/
tokenimizer checkpoint --list     # list all saved snapshots
tokenimizer handoff               # print handoff block (optimized for pasting)
tokenimizer handoff --stdout      # stdout only — pipe-friendly
```

---

## Model routing

`tokenimizer recommend-model` classifies a task description into a model tier and
recommends the appropriate model tier for cost-efficiency:

```bash
tokenimizer recommend-model "fix typo in comment"
#   Complexity:      Trivial edit
#   Recommendation:  smallest available model / autocomplete
#   Examples:        claude-haiku-4-5, gpt-4o-mini, copilot inline

tokenimizer recommend-model "architect the new payment system"
#   Complexity:      Deep reasoning
#   Recommendation:  highest reasoning model available
#   Examples:        claude-opus-4-8, o3, claude-fable-5

tokenimizer recommend-model --list    # show all 5 tiers
```

Routing rules are stored in `src/registry/routing.json` (bundled) and can be overridden
locally in `.tokenimizer/routing.json`. The config is community-maintained — model
capabilities and pricing change frequently enough that hardcoded rules become wrong.

---

## Full command reference

```bash
# Layer 1 — Skills
tokenimizer init                      # detect assistants + guided install wizard
tokenimizer install <skill-id>        # install a skill to all detected assistants
tokenimizer uninstall <skill-id>      # remove a skill cleanly
tokenimizer restore                   # rollback all changes to pre-install state
tokenimizer list                      # show skills + install status per assistant
tokenimizer doctor                    # health check — verify skills are intact

# Layer 2 — Git hooks
tokenimizer hooks install             # write hooks to .git/hooks/
tokenimizer hooks uninstall           # remove tokenimizer hooks only
tokenimizer hooks status              # show which hooks are active

# Context lifecycle
tokenimizer context init              # generate all 6 context docs
tokenimizer context refresh           # regenerate auto-detected docs only
tokenimizer context status            # show docs with token size estimates

# Repository index
tokenimizer index                     # build full repo memory cache
tokenimizer index --stale             # show files changed since last index

# Session compression
tokenimizer compress                  # print compressed context block
tokenimizer checkpoint [label]        # save named snapshot
tokenimizer checkpoint --list         # list saved snapshots
tokenimizer handoff [--stdout]        # generate session handoff block

# Model routing
tokenimizer recommend-model <task>    # recommend model tier for a task
tokenimizer recommend-model --list    # list all tiers

# Background watcher (Layer 3)
tokenimizer watch                     # start background watcher
tokenimizer watch --stop              # stop watcher
tokenimizer watch --status            # show watcher state
tokenimizer watch --stale             # list files changed since last index
```

### Universal flags

```bash
--dry-run     # preview changes, write nothing
--json        # machine-readable JSON output (data → stdout, chrome suppressed)
--no-color    # disable terminal colors
--no-emoji    # disable emoji icons (falls back to ASCII)
```

---

## How skills are installed

tokenimizer uses section-fenced installs. It appends a marked block to each assistant's
config file and never overwrites your existing content:

```
<!-- tokenimizer:skill:caveman:begin -->
## Caveman Mode

Respond compressed. No preamble, no "Great question!", no trailing summary...
<!-- tokenimizer:skill:caveman:end -->
```

- **Install:** appends the block if not present
- **Uninstall:** removes only the fenced block, leaves everything else intact
- **Update:** replaces the block in-place
- **Conflict detection:** `tokenimizer doctor` checks installed skills against their expected content

Before any install, tokenimizer backs up the target file to `.tokenimizer/backups/`.
`tokenimizer restore` reverses everything.

---

## Supported AI assistants

| Assistant | Config file | Detected by |
|---|---|---|
| Claude Code | `.claude/CLAUDE.md` | `.claude/` directory or `claude` in PATH |
| Cursor | `.cursorrules` | `.cursor/` directory or `cursor` in PATH |
| GitHub Copilot | `.github/copilot-instructions.md` | `.github/copilot-instructions.md` or `gh` extension |
| Windsurf | `.windsurfrules` | `.windsurfrules` or `windsurf` in PATH |
| Aider | `.aider.conf.yml` | `.aider.conf.yml` or `aider` in PATH |

Each assistant gets a tailored version of each skill — not a generic copy. Skills that
don't have a per-assistant file fall back to `generic.md`.

---

## Project layout

```
src/
├── cli.ts                  # entry point + command registration
├── commands/               # one file per command
│   ├── init.ts             # 9-step interactive wizard
│   ├── install.ts
│   ├── context.ts          # context init / refresh / status
│   ├── compress.ts         # compress / checkpoint / handoff
│   ├── index-cmd.ts        # index + stale check
│   ├── recommend-model.ts
│   └── watch.ts
├── context/                # v2 — context intelligence
│   ├── lifecycle.ts        # generate/refresh context docs
│   ├── indexer.ts          # repo memory builder (regex, no AST)
│   ├── compressor.ts       # session compression + checkpoints
│   └── tokenizer.ts        # character-based token estimation
├── core/
│   ├── detector.ts         # AI assistant detection
│   ├── installer.ts        # section-fenced skill install/uninstall
│   ├── backup.ts           # backup + restore
│   ├── registry.ts         # skill registry loader
│   ├── hooks/
│   │   ├── manager.ts      # git hook file management
│   │   └── scripts.ts      # hook script generation
│   └── watcher/
│       └── index.ts        # chokidar background daemon
├── registry/
│   ├── index.json          # skill manifest
│   ├── routing.json        # model routing tiers
│   └── skills/
│       ├── caveman/        # claude-code.md, cursor.md, copilot.md, windsurf.md, aider.yml
│       ├── patch-only/
│       ├── ask-less/
│       ├── planner-executor/
│       ├── context-compressor/
│       ├── repo-aware-context/
│       └── cost-guardrails/
├── ui/
│   ├── theme.ts            # colors + Windows emoji detection
│   ├── io.ts               # stderr/stdout discipline + JSON mode
│   ├── render.ts           # tables + welcome banner
│   └── checkbox.ts         # interactive multi-select (readline only)
└── tests/
    ├── tokenizer.test.ts
    ├── lifecycle.test.ts
    ├── compressor.test.ts
    ├── indexer.test.ts
    └── hooks.test.ts
```

---

## Development

```bash
npm run build        # esbuild bundle → dist/cli.js
npm run build:watch  # rebuild on change
npm test             # vitest (57 tests)
node dist/cli.js     # run local build
```

**Stack:** TypeScript, esbuild (single-file CJS bundle), commander, cli-table3, fast-glob,
picocolors, chokidar, zod. No inquirer, no chalk, no ora — all UI is built from Node's
built-in `readline`.

---

## License

MIT
