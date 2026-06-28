# Token-Efficient AI Skills CLI — Master Product Prompt

## Role

You are an expert **Node.js / TypeScript CLI architect**, **AI workflow
optimization specialist**, and **developer experience (DevEx) engineer**.

Design a new **independent npm package** called **tokenimizer** that
installs and manages AI assistant skills focused on **maximizing token
savings without reducing output quality, correctness, or developer
productivity**.

The package must be independent today, but architected so it can later
integrate with **VPSOS**.

Do **not** use the name `autoskills`, since it already exists. Analyze
whether that package can be wrapped, integrated, or used during
onboarding, but assume this project is its own product.

---

# Vision

Create the "operating system" for token-efficient AI workflows.

Rather than simply installing prompt files, the package manages:

- Skills
- Context
- Memory
- Compression
- Model routing
- Workflow orchestration
- Cost optimization
- Analytics

Think of VPSOS as installing **project expertise**, while tokenimizer
optimizes **how AI is used**.

> **Scope discipline:** The full vision is large. Execute it in three
> clearly phased milestones (v1/v2/v3) defined below. Ship a small,
> polished v1 before expanding. A tool that does four things perfectly
> beats a platform that does eighteen things poorly.

---

# Three-Layer Architecture

Tokenimizer operates across three complementary layers. Together they
cover real-time AI behavior, periodic maintenance, and continuous
background monitoring — without requiring the user to think about which
layer handles what.

## Layer 1 — Skill Files (Always On)

AI assistants read their config files on every session start. Install
instruction files once; they apply automatically every time you open
Claude Code, Copilot, Cursor, Codex, or any other supported assistant.

- Zero runtime overhead — no process running
- Works across all assistants simultaneously (install to all on `init`)
- Controls real-time AI behavior: response style, patch discipline,
  planning workflow, model routing hints
- The foundation all other layers build on

**Default behavior:** `tokenimizer init` installs to ALL detected
assistants unless `--target` narrows the scope. Do not make the user
repeat the install per assistant.

## Layer 2 — Git Hooks (Event-Driven)

Fires at natural git checkpoints. No daemon. No idle resource use.
Zero cost between events.

Handles maintenance tasks that are best tied to code change moments:

| Hook | Trigger | Action |
|---|---|---|
| `post-commit` | After each commit | Regenerate `progress.md`, invalidate stale cache entries |
| `post-checkout` | After branch switch | Regenerate `handoff.md`, refresh `current_task.md` |
| `post-merge` | After merge/pull | Rebuild repo memory index if source files changed |
| `pre-push` | Before push | Optionally warn if context docs are stale |

Hooks are opt-in, installed separately from skills:

```bash
tokenimizer hooks install   # write hooks to .git/hooks/
tokenimizer hooks uninstall # remove tokenimizer hooks only
tokenimizer hooks status    # show which hooks are active
```

Hooks are non-blocking — they run fast or skip gracefully if the index
is already fresh. Never fail a git operation due to a tokenimizer hook.

## Layer 3 — Background Watcher (Optional, Opt-In)

A scoped file-system watcher that detects staleness between git events.

**What it can observe:** File system changes in the project directory.

**What it cannot observe:** Live AI conversations. Assistants do not
expose standardized session logs — the watcher cannot read what you
typed or what the AI responded. Design around this constraint.

**What it does with file-system signals:**

- Detects when source files change significantly but context docs have
  not been updated (staleness alert)
- Triggers incremental index rebuilds on significant file changes
- Maintains a local token budget estimate dashboard
- Notifies (terminal bell or OS notification, configurable) when
  context docs need refresh

**What it does not do:**

- It does not intercept or modify AI requests
- It does not read AI session history
- It does not run model inference
- It is not a reverse proxy or API middleware

**Startup:**

```bash
tokenimizer watch           # start watcher in foreground (Ctrl+C to stop)
tokenimizer watch --daemon  # start as background process (writes PID file)
tokenimizer watch --stop    # stop background watcher
tokenimizer watch --status  # show watcher state + last activity
```

**Platform notes:**

- Uses Node.js `fs.watch` / `chokidar` for cross-platform file watching
- On Windows: runs as a foreground process or via `tokenimizer watch
  --daemon` (writes PID to `.tokenimizer/watcher.pid`)
- No `systemd`, no OS service registration — keep it portable
- If the watcher crashes, it fails silently and does not affect the
  assistant or git hooks. Layer 1 and 2 continue working independently.

**Ship timeline:** v2. Do not block v1 on watcher implementation.

---

# Product Goals

The CLI must:

- Detect AI assistants installed on the machine (per-platform strategy
  defined below)
- Install optimized instruction files **safely and reversibly** into all
  detected assistants simultaneously (Layer 1)
- Set up git hooks for automatic context maintenance at commit/checkout
  boundaries (Layer 2, opt-in)
- Optionally run a background file-system watcher for continuous
  staleness detection between git events (Layer 3, opt-in)
- Configure best practices automatically with zero ongoing manual effort
- Reduce unnecessary context sent to models
- Reduce token consumption per task
- Preserve or improve output quality
- Improve perceived latency by reducing prompt bloat
- Reduce API costs
- Remain fully cross-platform (Windows, macOS, Linux)
- **Never silently overwrite existing AI configuration** — always backup
  first, always support restore

---

# Release Milestones

## v1 — Core Installer (Ship This First)

Focus: install skills safely to all detected assistants, set up git
hooks, detect conflicts, support rollback. Nothing else.

**Layers shipped:** Layer 1 (skill files) + Layer 2 (git hooks).

**CLI surface:**

```bash
npx tokenimizer init                # detect assistants, guided setup, install to all
npx tokenimizer install <skill>     # safe install with backup
npx tokenimizer uninstall <skill>   # remove skill cleanly
npx tokenimizer restore             # full rollback to pre-install state
npx tokenimizer list                # available skills + install status per assistant
npx tokenimizer doctor              # audit installed skills, detect conflicts
npx tokenimizer hooks install       # write git hooks to .git/hooks/
npx tokenimizer hooks uninstall     # remove tokenimizer git hooks
npx tokenimizer hooks status        # show active hooks
```

**Skills bundled in v1 (the proven high-ROI set):**

1. Caveman Mode
2. Patch-Only Coding
3. Ask-Less Mode
4. Planner / Executor Split

**Flags (all commands):**

- `--dry-run` — print what would change, touch nothing
- `--yes` — skip confirmations (CI/automation mode)
- `--json` — machine-readable output
- `--global` — install to user-level AI config instead of project
- `--target <id>` — narrow install to specific assistant(s); default is all detected

**Success criteria:** A developer runs `npx tokenimizer init`, skills
are installed across ALL detected assistants without breaking any
existing config, git hooks are set up, `tokenimizer doctor` confirms
health, and `tokenimizer restore` undoes everything cleanly.

---

## v2 — Context Intelligence + Background Watcher

Context lifecycle management, repository memory, conversation compression,
model routing as community-maintained config, and the optional Layer 3
background watcher.

**Layers shipped:** Layer 3 (background watcher, opt-in).

**New CLI commands:**

```bash
npx tokenimizer context init      # scaffold context lifecycle docs
npx tokenimizer context refresh   # regenerate stale docs
npx tokenimizer index             # build LLM-optimized repo memory
npx tokenimizer compress          # compress current session context
npx tokenimizer checkpoint        # save conversation snapshot
npx tokenimizer handoff           # generate compact handoff summary
npx tokenimizer recommend-model   # suggest model for current task
npx tokenimizer watch             # start file-system watcher (foreground)
npx tokenimizer watch --daemon    # start watcher as background process
npx tokenimizer watch --stop      # stop background watcher
npx tokenimizer watch --status    # show watcher state + last activity
```

**New skills:**

- Context Compressor
- Repo-Aware Minimal Context
- Cost Guardrails
- Progressive Context Loader

---

## v3 — Platform & Ecosystem

Remote registry, plugin system, token analytics dashboard, adaptive
recommendations, VPSOS integration.

**New CLI commands:**

```bash
npx tokenimizer update            # pull latest skill versions from registry
npx tokenimizer export            # export skills/config for team sharing
npx tokenimizer analytics         # show token savings report
npx tokenimizer plugin add <id>   # install a platform plugin
```

**Plugins:**

- Git (context-aware diff summarizer)
- GitHub / Azure DevOps / Jira (issue-to-context bridges)
- MCP (Model Context Protocol adapters)
- Local LLMs (Ollama, LM Studio routing)
- VS Code / Cursor / Claude Code
- VPSOS integration

---

# Assistant Detection Strategy

Detection must be concrete and per-platform. Do not rely on PATH alone.

## Detection Matrix

| Assistant | Windows path | macOS/Linux path | Additional signal |
|---|---|---|---|
| Claude Code | `%APPDATA%\Claude\` | `~/.claude/` | `.claude/` in project root |
| Cursor | `%APPDATA%\Cursor\` | `~/.cursor/` | `.cursorrules` in project |
| VS Code + Copilot | `%APPDATA%\Code\` | `~/.config/Code/` | `.github/copilot-instructions.md` |
| Windsurf | `%APPDATA%\Windsurf\` | `~/.windsurf/` | `.windsurfrules` in project |
| Aider | `aider` in PATH | same | `.aider*` files in project |
| Continue.dev | VS Code extension detection | same | `.continue/` in project |

## Detection Algorithm

```
1. Scan known paths for each assistant (global install)
2. Scan current project directory for assistant-specific files
3. Check PATH for CLI binaries (claude, cursor, aider, etc.)
4. Rank by confidence: project-level > global > PATH
5. Report all detected + confidence level
6. Ask user to confirm before installing
```

Detection should never block install — if detection fails, allow manual
target selection via flag: `--target claude-code | cursor | copilot | all`

---

# Skill Install Target Problem

This is the hardest technical problem in the package. Each AI assistant
uses a different config file format and merge strategy.

## Install Targets Per Assistant

| Assistant | Global skill file | Project skill file | Format |
|---|---|---|---|
| Claude Code | `~/.claude/CLAUDE.md` | `.claude/CLAUDE.md` | Markdown, appended sections |
| Cursor | `~/.cursor/rules` | `.cursorrules` | Plain text, full replacement |
| Copilot | N/A | `.github/copilot-instructions.md` | Markdown, appended sections |
| Windsurf | `~/.windsurf/rules` | `.windsurfrules` | Plain text, full replacement |
| Aider | `~/.aider.conf.yml` | `.aider.conf.yml` | YAML, merged keys |

## Safe Write Strategy

Never use full-file replacement. Use section-fenced appends:

```
<!-- tokenimizer:skill:caveman:begin -->
[skill content]
<!-- tokenimizer:skill:caveman:end -->
```

This allows:
- **Install**: append fenced block if not present
- **Update**: replace content between existing fence markers
- **Uninstall**: remove fenced block cleanly
- **Conflict detection**: warn if markers already exist from a different
  version

For formats that don't support inline comments (YAML), use a separate
`tokenimizer.lock.json` to track what was injected where.

## Backup Strategy

Before any write:

1. Copy original file to `.tokenimizer/backups/<filename>.<timestamp>.bak`
2. Write `.tokenimizer/restore.json` mapping each backup to its source
3. `tokenimizer restore` reads this map and reverses all writes

---

# Interactive Wizard

The wizard runs on `tokenimizer init`. It must work in non-interactive
environments (detect TTY; fall back to `--yes` defaults if no TTY).

## Wizard Flow

```
Step 1: Environment scan
  → List detected assistants with confidence level
  → Show project-level vs global detection
  → Default: install to ALL detected assistants
  → Only ask if user wants to narrow scope (--target)
  → If nothing detected: show manual target selection

Step 2: Explain token-saving philosophy
  → Show estimated savings per skill (honest: "typically 20-40%
    reduction" — not fake exact numbers)
  → Show which assistants each skill will be installed into
  → Link to docs for each technique

Step 3: Skill selection
  → Recommend the 4 v1 skills pre-checked
  → Allow individual toggle
  → Show what each skill does to config files (preview mode)
  → Show the exact fenced block that will be appended

Step 4: Scope choice
  → Project-only (default, safest — installs to .claude/CLAUDE.md etc.)
  → Global (applies to all projects — installs to ~/.claude/CLAUDE.md etc.)

Step 5: Git hooks (Layer 2)
  → Explain what hooks do and when they fire
  → Default: YES (opt-out, not opt-in — hooks are low-risk and high value)
  → Show which hooks will be written to .git/hooks/
  → Note: hooks are non-blocking and skip gracefully if index is fresh

Step 6: Backup confirmation
  → Show what will be backed up and where
  → Confirm backup location (.tokenimizer/backups/)
  → Require explicit confirmation (skip with --yes)

Step 7: Dry-run preview
  → Show exact diff of what will be written per assistant
  → Require confirmation to proceed

Step 8: Install
  → Write skills with section-fenced appends to all targets
  → Install git hooks if confirmed
  → Confirm each file written
  → Print restore command

Step 9: Verification
  → Run doctor automatically
  → Show install summary: N skills × M assistants installed
  → Suggest next: tokenimizer list | tokenimizer watch (v2)
```

---

# Required Skills

## v1 Skills (Ship These)

### 1. Caveman Mode

**Token impact:** 60-75% reduction in response verbosity.

**What it does:** Instructs the AI to respond like a caveman — short,
compressed, technically accurate. Drops politeness padding, preambles,
summaries, and explanations of what was just done.

**When to use:** High-frequency back-and-forth sessions, code reviews,
quick lookups.

**Example skill content:**

```markdown
<!-- tokenimizer:skill:caveman:begin -->
## Caveman Mode

Communicate compressed. No preamble, no "Great question!", no trailing
summaries. Answer direct. Use fragments. Technical accuracy required —
verbosity is not.

Good: "Bug in auth.ts:42 — missing await on verifyToken()"
Bad: "Great catch! Looking at the auth.ts file, I can see that on line 42
there is a missing await keyword before the verifyToken() function call,
which would cause..."

Activate with: /caveman or "caveman mode"
Deactivate with: /normal or "normal mode"
<!-- tokenimizer:skill:caveman:end -->
```

---

### 2. Patch-Only Coding

**Token impact:** 70-90% reduction in code output tokens for edits.

**What it does:** Instructs the AI to output only changed lines with
context markers — never rewrite entire files. Uses unified diff format or
function-level replacements.

**When to use:** Any code editing task on existing files.

**Example skill content:**

```markdown
<!-- tokenimizer:skill:patch-only:begin -->
## Patch-Only Coding

When editing existing code: output ONLY the changed portion.
Never rewrite entire files unless creating a new file.

Preferred output formats (in order):
1. Unified diff (--- a/file +++ b/file)
2. Function replacement (show only the modified function)
3. Line range replacement (show changed lines + 3 lines context)

If the entire file must be regenerated, state why before outputting.
<!-- tokenimizer:skill:patch-only:end -->
```

---

### 3. Ask-Less Mode

**Token impact:** Eliminates clarification roundtrips (saves 1-3 full
exchanges per task).

**What it does:** Instructs the AI to make reasonable assumptions and
proceed rather than asking clarifying questions. State assumptions made,
then act.

**When to use:** Experienced developers who want fewer interruptions.

**Example skill content:**

```markdown
<!-- tokenimizer:skill:ask-less:begin -->
## Ask-Less Mode

Do not ask clarifying questions before acting. Make the most reasonable
assumption, state it in one line, then proceed.

Format: "Assuming [X]. If wrong, say so and I'll correct."

Only ask when the ambiguity would cause irreversible harm (e.g., deleting
data, force-pushing, changing a public API contract).
<!-- tokenimizer:skill:ask-less:end -->
```

---

### 4. Planner / Executor Split

**Token impact:** Routes expensive reasoning to capable models; routes
mechanical implementation to cheaper models.

**What it does:** Establishes a two-phase workflow. Planning phase
produces a compact, structured execution plan. Execution phase follows
the plan without re-deriving context.

**Plan format (standardized):**

```markdown
## Execution Plan

**Goal:** [one sentence]
**Affected files:** [list]
**Steps:**
1. [atomic action]
2. [atomic action]
**Assumptions:** [list]
**Risk:** [none | low | medium | high] — [reason if non-trivial]
```

**Example skill content:**

```markdown
<!-- tokenimizer:skill:planner-executor:begin -->
## Planner / Executor Split

For non-trivial tasks, use two phases:

PLAN phase: Reason about the problem. Produce a structured execution plan
in the format above. Do not write code yet.

EXECUTE phase: Follow the plan mechanically. Do not re-explain reasoning
already in the plan. Output only diffs and confirmations.

Trigger plan phase with: /plan [task description]
Trigger execute phase with: /execute
<!-- tokenimizer:skill:planner-executor:end -->
```

---

## v2 Skills (Next Milestone)

### 5. Context Compressor

Summarizes long conversations into a compact handoff prompt. Produces
a structured `session_summary.md` that can restart a session with
minimal token cost.

### 6. Repo-Aware Minimal Context

Progressive context loading — project summary first, then modules, then
files, then functions. Never loads entire repos. Uses repository memory
index (see below) to identify the minimal relevant file set.

### 7. Cost Guardrails

Before any large operation, estimates input + output tokens, recommended
model, estimated cost, and expected savings. Requires confirmation above
a configurable threshold (default: $0.10 per request).

---

# Community-Proven Token Saving Features

## Context Lifecycle (v2)

Generate and maintain these files automatically. Each is sized to fit
in a model's context without crowding out task-specific content.

| File | Purpose | Max size |
|---|---|---|
| `project_summary.md` | 1-page project overview | ~500 tokens |
| `architecture.md` | Module map + key decisions | ~1000 tokens |
| `session_summary.md` | Current session state | ~300 tokens |
| `progress.md` | Task list + completion status | ~400 tokens |
| `handoff.md` | Compact context for session restart | ~600 tokens |
| `current_task.md` | What is being worked on right now | ~200 tokens |

Regenerate on: `tokenimizer context refresh` or on git commit hook
(optional, opt-in).

---

## Repository Memory (v2)

**Do not reinvent language servers.** Wrap existing tools and emit
output in LLM-optimized compact format. The value is in the format
and the token budget discipline, not in the indexing itself.

**Tooling to wrap:**

| Output needed | Tool to wrap |
|---|---|
| Symbol index | `tree-sitter` / `ts-morph` (TypeScript), `ctags` |
| Dependency graph | `madge` (JS/TS), `depcheck` |
| API surface | TypeScript compiler API, JSDoc extraction |
| Folder summaries | Stat-based heuristics + file count/type analysis |
| Coding conventions | ESLint config + `.editorconfig` + Prettier config extraction |

**Output format principle:** Every generated artifact must fit within
a configurable token budget (default: 2000 tokens per artifact). If the
repo is too large, generate per-module artifacts instead of one global
file.

**Generated artifacts (stored in `.tokenimizer/cache/`):**

```
.tokenimizer/
  cache/
    symbols.json          # function/class/type map with file:line refs
    api-map.json          # public API surface only
    dependency-graph.json # module dependency adjacency list
    architecture.json     # folder structure + module purposes
    conventions.md        # coding style extracted from config files
    wiki.md               # auto-generated project wiki
    glossary.md           # domain terms extracted from code + docs
  backups/                # pre-install config backups
  restore.json            # rollback map
  tokenimizer.lock.json   # install state
```

Artifacts are invalidated and regenerated when relevant source files
change (tracked via file hash, not mtime).

---

## Intelligent Context Selection (v2)

Only include in context:

- Files directly referenced by the current task
- Files that import/export the changed symbol (one hop only)
- Relevant test files for changed functions
- Changed lines in git diff (not entire files)
- Logs trimmed to the last N relevant lines (configurable, default: 50)

**Never include:**

- Entire repositories
- Unchanged files
- Full build logs (trim to error block + 10 lines context)
- `node_modules`, lockfiles, generated files

---

## Conversation Compression (v2)

| Command | What it does |
|---|---|
| `compress` | Summarize conversation to date into a compact context block |
| `summarize` | Produce a human-readable summary of what was decided |
| `checkpoint` | Save current state + produce a re-entry prompt |
| `handoff` | Generate `handoff.md` for session restart or team handoff |

All outputs use a standardized compact format designed to be pasted
as the first message of a new session.

---

## Planner → Executor Workflow (v1 skill, v2 tooling)

**Model routing recommendation:**

| Task type | Recommended tier | Rationale |
|---|---|---|
| Architecture, planning | Highest capability | Reasoning quality matters |
| Debugging, root cause | Highest capability | Inference chains matter |
| Code review | High capability | Subtle bug detection |
| Implementation of a plan | Mid-tier | Mechanical execution |
| Formatting, docs, comments | Low-cost | No reasoning required |
| Tests (from a spec) | Low-cost | Pattern matching |
| Repetitive code generation | Low-cost | Template-like output |

> **Note:** Model routing config ships as a community-maintained YAML
> file pulled from the remote registry, NOT hardcoded logic. Model
> capabilities and pricing change every few months — baking routing rules
> into the binary is a maintenance trap.

---

## Patch-First Development (v1 skill)

Already covered in the Patch-Only Coding skill above.

**Additional tooling (v2):** `tokenimizer compress` can auto-trim code
blocks in context to function-level patches before sending to a model.

---

## Progressive Context Loading (v2)

Enforced loading sequence:

```
1. project_summary.md          (~500 tokens)
2. Relevant module from index  (~200 tokens)
3. Specific files              (only what's needed)
4. Specific functions          (patch-level, not full file)
5. Solve
```

The AI is instructed to request more context explicitly if needed rather
than having it pre-loaded. This inverts the default behavior of loading
everything upfront.

---

## Context Budget Manager (v2)

Before any large prompt, estimate and display:

- Estimated input tokens (using the provider's tokenizer, not character
  counting — integrate `@anthropic-ai/tokenizer` for Anthropic,
  `tiktoken` for OpenAI)
- Estimated output tokens (based on task type + typical ratios)
- Recommended model for this task
- Estimated cost (provider pricing config, community-maintained)
- Expected token savings vs. unoptimized baseline
- Warning if estimate exceeds user-configured budget threshold

**Honesty requirement:** All estimates must be labeled as estimates.
Never display fake precision. Show ranges: "~8,000–12,000 input tokens".
Integrate real tokenizer libraries — character-count-based estimates
erode user trust when they diverge from actual billing.

---

## Local Compression (v2)

Before sending long context to a model:

- Strip comments from code blocks (optional, user-configured)
- Collapse blank lines
- Trim stack traces to first error + relevant frames
- Compress log files (keep errors, warnings, and surrounding context)
- Remove boilerplate (license headers, auto-generated markers)

All compression is lossless from a task-relevance perspective.
Provide a `--no-compress` flag for users who need the raw content.

---

## Knowledge Cache (v2)

See Repository Memory section above. Cache lives in `.tokenimizer/cache/`
and is gitignored by default (add to `.gitignore` on init).

Invalidation: hash-based, per-artifact. Regenerate only what changed.

---

## Adaptive Recommendations (v3)

Detect patterns from session logs and suggest relevant skills:

- Long sessions without compression → suggest `compress` skill
- Repeated full-file outputs → suggest `patch-only` skill
- Frequent clarification roundtrips → suggest `ask-less` skill
- Tasks consistently above cost threshold → suggest model routing

---

## Model Router (v2 / v3)

- Config stored in `.tokenimizer/routing.yml`
- Community-maintained defaults pulled from remote registry
- User overrides respected
- CLI command: `tokenimizer recommend-model [task description]`

---

## Token Analytics (v3)

Track across sessions:

- Input tokens saved (vs. estimated baseline)
- Output tokens saved
- Compression ratio per skill
- Estimated cost saved (in USD, using provider pricing config)
- Model usage breakdown
- Most effective skills for this project

**Honesty requirement:** Use real tokenizer counts where possible.
Label all cost estimates with pricing date — provider prices change.
Display as dashboard: `tokenimizer analytics [--since 30d]`

---

# CLI

## Full Command Reference

```bash
# v1 — Layer 1: Skill files
npx tokenimizer init                    # detect all assistants + guided setup
npx tokenimizer install <skill>         # install skill to all detected assistants
npx tokenimizer uninstall <skill>       # remove skill from all targets cleanly
npx tokenimizer restore                 # rollback all changes to pre-install state
npx tokenimizer list [--installed]      # list skills + install status per assistant
npx tokenimizer doctor                  # health check + conflict report across all targets

# v1 — Layer 2: Git hooks
npx tokenimizer hooks install           # write hooks to .git/hooks/
npx tokenimizer hooks uninstall         # remove tokenimizer hooks only
npx tokenimizer hooks status            # show which hooks are active + last fired

# v2 — Context intelligence
npx tokenimizer context init            # scaffold context lifecycle docs
npx tokenimizer context refresh         # regenerate stale context docs
npx tokenimizer index                   # build LLM-optimized repo memory cache
npx tokenimizer compress                # compress current session context
npx tokenimizer checkpoint              # save session snapshot
npx tokenimizer handoff                 # generate handoff.md for restart or team
npx tokenimizer recommend-model         # suggest model for current task

# v2 — Layer 3: Background watcher (opt-in)
npx tokenimizer watch                   # start file-system watcher in foreground
npx tokenimizer watch --daemon          # start watcher as background process
npx tokenimizer watch --stop            # stop background watcher
npx tokenimizer watch --status          # show watcher state + last activity

# v3 — Platform & ecosystem
npx tokenimizer update                  # pull latest skill versions from registry
npx tokenimizer export                  # export config for team sharing
npx tokenimizer analytics [--since 30d] # token savings dashboard
npx tokenimizer plugin add <id>         # install a platform plugin
```

## Universal Flags

```bash
--dry-run          # preview changes, touch nothing
--yes              # skip all confirmations (CI mode)
--json             # machine-readable output
--global           # operate on user-level config, not project
--target <id,...>  # narrow to specific assistant(s); default: all detected
--verbose          # debug output
--no-backup        # skip backup (not recommended; requires --yes)
```

---

# Registry

## v1: Local Bundled Registry

Skills ship inside the npm package. No network required. Structured as:

```
src/registry/
  index.json            # skill manifest
  skills/
    caveman/
      skill.json        # metadata + compatibility matrix
      claude-code.md    # skill content for Claude Code
      cursor.md         # skill content for Cursor
      copilot.md        # skill content for Copilot
    patch-only/
      ...
```

**skill.json schema:**

```json
{
  "id": "caveman",
  "name": "Caveman Mode",
  "version": "1.0.0",
  "description": "Compress AI responses to reduce output tokens 60-75%",
  "category": "verbosity",
  "tokenImpact": { "output": -65, "input": 0 },
  "targets": ["claude-code", "cursor", "copilot", "windsurf"],
  "conflicts": [],
  "requires": [],
  "tags": ["compression", "verbosity", "output"]
}
```

## v2: Remote Versioned Registry

- Hosted JSON registry (CDN-backed, versioned)
- Skills can be updated independently of the CLI version
- Community submissions via PR to a `tokenimizer-registry` GitHub repo
- Checksums (SHA-256) for integrity verification
- Signing with npm's provenance for security-sensitive installs

## Conflict Detection

Before install, check:

1. Are fence markers for this skill already present? (duplicate install)
2. Does this skill conflict with another installed skill? (declared in
   `skill.json` `conflicts` field)
3. Does this skill's content overlap with existing CLAUDE.md sections?
   (fuzzy match on headings — warn, don't block)

---

# Technical Requirements

## Language & Build

- **Language:** TypeScript (strict mode), TypeScript 6.x
- **Bundler:** `esbuild` — single-file bundle output to `dist/cli.js`
  (same as vpsos-enterprise: `esbuild src/cli.ts --bundle --platform=node --outdir=dist`)
- **Module format:** CommonJS output via esbuild (esbuild default for
  `--platform=node`); keep source as ESM imports
- **Node.js minimum:** 18.x (LTS)
- **Test runner:** Vitest

## Dependencies

Mirror the vpsos-enterprise dependency set exactly. Do not add a
dependency without a specific justification.

**Runtime:**

| Package | Purpose |
|---|---|
| `commander` | CLI argument parsing + subcommands |
| `cli-table3` | Terminal table rendering (skills list, doctor report, analytics) |
| `fast-glob` | File globbing for assistant detection + repo indexing |
| `js-yaml` | YAML parsing for routing config + Aider skill files |
| `minimatch` | Glob matching for ignore patterns |
| `picocolors` | Terminal colors (zero-dependency, no transitive bloat) |
| `zod` | Runtime schema validation for registry + config files |
| `chokidar` | Cross-platform file watching (Layer 3 watcher, v2 only) |
| `@anthropic-ai/tokenizer` | Token counting for Anthropic models (v2 only) |

**Do NOT add:** `@inquirer/prompts`, `inquirer`, `chalk`, `ora`, `boxen`,
or any other interactive/UI library. All interactive components are
built from Node's built-in `readline` module, exactly as vpsos-enterprise
does it.

## UI System

Replicate the vpsos-enterprise `src/ui/` architecture exactly:

| File | Purpose |
|---|---|
| `src/ui/theme.ts` | Semantic color helpers + icon system with Windows emoji detection |
| `src/ui/io.ts` | IO discipline: UI chrome → stderr, data → stdout, JSON mode |
| `src/ui/render.ts` | cli-table3 table renderers + welcome banner |
| `src/ui/checkbox.ts` | Interactive multi-select via raw-mode readline keypress |
| `src/ui/confirm.ts` | Yes/no confirm via readline |
| `src/ui/prompt.ts` | Free-text prompt + numbered picker via readline |
| `src/ui/progress.ts` | Steps class for step-by-step progress reporting |
| `src/ui/errors.ts` | Structured error reporting: title + detail + suggestions |

**IO discipline (non-negotiable):**

- Human-facing chrome (banners, progress, prompts) → `stderr` only
- Machine-readable data (tables, lists) → `stdout`
- Errors → `stderr` always, even in `--json` mode
- `--json` flag suppresses all chrome; emits structured JSON to `stdout`
- This ensures `npx tokenimizer list --json | jq` works cleanly

**Windows emoji detection** (copy from vpsos-enterprise `theme.ts`):

```typescript
const isWindows          = process.platform === 'win32';
const hasWindowsTerminal = !!process.env.WT_SESSION;
const hasVSCode          = process.env.TERM_PROGRAM === 'vscode';
const nativeEmojiTerm    = !isWindows || hasWindowsTerminal || hasVSCode;
```

**Welcome banner:** Dual-pane ASCII frame (wide terminals) with
automatic fallback to compact single-pane (narrow terminals). Shows
registry stats on the right, quick-start commands on the left. Pattern
identical to vpsos-enterprise `renderWelcomeHeader`.

## Constraints

- No full-file overwrites of existing AI config files
- No silent writes (always log what was written)
- No hardcoded model prices (use community-maintained config)
- No character-count-based token estimates presented as exact
- No git hook that can fail a git operation (hooks must exit 0 on error)
- No watcher that intercepts or modifies AI API requests
- No OS service registration (no `systemd`, no Windows services)

## Cross-Platform

Test on Windows (PowerShell + Git Bash), macOS, Ubuntu. Path handling
via `node:path` only. Git hook scripts use POSIX `sh` for
compatibility; on Windows, Git Bash provides the POSIX shell.

## File Safety

All writes are atomic (write to temp, rename). All destructive
operations require a backup to exist first.

## Git Hooks Safety

Hooks installed to `.git/hooks/` must co-exist with existing hooks. If
a hook file already exists, append a delegating call to the tokenimizer
hook script rather than replacing the file. Provide a clean removal path.

## Watcher Safety (v2)

The watcher is a read-only observer of the file system. It must never
write to source files. It may only write to `.tokenimizer/`. PID file
written on daemon start; cleaned up on stop or SIGTERM.

## Testing

Unit tests for: registry loader, installer (fence-parser, append,
remove), backup/restore, hook installer co-existence logic.
Integration tests using a sandboxed temp directory for wizard flow and
multi-assistant install. Watcher tests use a mock file-system event
emitter.

## Extensible Architecture

Plugin interface defined as a TypeScript interface in
`src/types/plugin.ts`. First-party plugins implement the same interface
as community plugins.

---

# Folder Structure

```
tokenimizer/
  src/
    cli.ts                  # entry point — mirrors vpsos-enterprise src/cli.ts
    ui/                     # UI system — mirrors vpsos-enterprise src/ui/ exactly
      theme.ts              # semantic colors + icon system + Windows emoji detection
      io.ts                 # stderr/stdout discipline + JSON mode
      render.ts             # cli-table3 renderers + welcome banner (dual-pane)
      checkbox.ts           # interactive multi-select via raw-mode readline
      confirm.ts            # yes/no prompt via readline
      prompt.ts             # free-text + numbered picker via readline
      progress.ts           # Steps class for step-by-step progress
      errors.ts             # structured error: title + detail + suggestions
    commands/
      init.ts               # wizard + multi-assistant setup (all detected by default)
      install.ts            # skill install to all detected targets
      uninstall.ts          # skill removal
      restore.ts            # full rollback
      list.ts               # skills + per-assistant install status
      doctor.ts             # health check across all targets
      hooks.ts              # git hook management (v1, Layer 2)
      context.ts            # context lifecycle commands (v2)
      compress.ts           # session compression (v2)
      watch.ts              # file-system watcher (v2, Layer 3)
      analytics.ts          # token savings dashboard (v3)
    core/
      detector.ts           # assistant detection (path + signal based)
      installer.ts          # safe write / section-fence logic
      backup.ts             # backup + restore logic
      registry.ts           # registry loader + resolver (zod-validated)
      hooks/
        manager.ts          # install/remove/status for git hooks
        templates/
          post-commit.sh    # regenerate progress.md
          post-checkout.sh  # regenerate handoff.md, current_task.md
          post-merge.sh     # rebuild index if source files changed
          pre-push.sh       # warn if context docs are stale (optional)
      watcher/              # v2
        index.ts            # chokidar-based file watcher
        staleness.ts        # detect stale context docs
        notifier.ts         # terminal bell / OS notification
    context/                # v2
      lifecycle.ts          # generate/refresh context lifecycle docs
      indexer.ts            # LLM-optimized repo memory builder
      compressor.ts         # conversation compression
      tokenizer.ts          # real token counting (Anthropic + OpenAI libs)
    registry/
      index.json            # skill manifest (zod-validated on load)
      skills/
        caveman/
          skill.json        # metadata + compatibility matrix
          claude-code.md    # skill content for Claude Code
          cursor.md         # skill content for Cursor
          copilot.md        # skill content for Copilot
          windsurf.md       # skill content for Windsurf
          aider.yml         # skill content for Aider (YAML format)
        patch-only/
        ask-less/
        planner-executor/
    plugins/                # v3
      git/
      github/
      mcp/
    types/
      skill.ts
      plugin.ts             # plugin interface (same for first-party + community)
      config.ts
      hook.ts               # git hook types
      watcher.ts            # watcher event types
    utils/
      paths.ts              # cross-platform path resolution
      fs.ts                 # atomic write helpers
      suggest.ts            # "did you mean?" typo correction (mirrors vpsos-enterprise)
      hash.ts               # SHA-256 file/string hashing for cache invalidation
  tests/
    unit/
    integration/            # sandboxed temp directory tests
  dist/                     # esbuild bundle output
  scripts/
    prepare.js              # post-install setup (mirrors vpsos-enterprise pattern)
  package.json
  tsconfig.json
  README.md
```

**Per-repo runtime directory (created on `init`, gitignored):**

```
.tokenimizer/
  backups/                  # pre-install config file backups
  cache/                    # LLM-optimized repo memory (v2)
    symbols.json
    api-map.json
    dependency-graph.json
    architecture.json
    conventions.md
    wiki.md
    glossary.md
  restore.json              # rollback map: backup → original path
  tokenimizer.lock.json     # install state: skills × targets
  routing.yml               # model routing config (community-maintained, v2)
  watcher.pid               # background watcher PID (v2, if --daemon)
```

---

# Uninstall + Rollback (First-Class Feature)

This is not optional. Without a reliable restore path, adoption stalls.

## Uninstall a single skill

```bash
tokenimizer uninstall caveman
```

- Locate `<!-- tokenimizer:skill:caveman:begin -->` and `<!-- end -->`
  markers in all target files
- Remove the fenced block
- Log which files were modified
- Do NOT restore the backup (the file is still correct, just with the
  block removed)

## Full restore

```bash
tokenimizer restore
```

- Read `.tokenimizer/restore.json`
- For each entry: copy `.tokenimizer/backups/<file>.<timestamp>.bak`
  back to its original path
- Remove `.tokenimizer/tokenimizer.lock.json`
- Confirm each file restored
- Print warning: "All tokenimizer changes undone. Run tokenimizer init
  to reinstall."

## Restore a specific file

```bash
tokenimizer restore --file .claude/CLAUDE.md
```

---

# Integration with Existing `autoskills`

Analyze `autoskills` (the existing npm package) during onboarding:

- If detected, offer to migrate its installed skills to tokenimizer
  management (wrap, don't duplicate)
- If the user declines, install tokenimizer skills in a non-conflicting
  way (section fencing ensures isolation)
- Do not depend on `autoskills` as a runtime dependency — tokenimizer
  must work independently

---

# Future VPSOS Integration

Architecture boundary:

- **VPSOS** provides: domain expertise, project conventions, role-specific
  knowledge, team workflows
- **tokenimizer** provides: token efficiency, context management, model
  routing, cost control

Integration point: tokenimizer exposes a `vpsos` plugin that reads
VPSOS-generated context files and includes them in the progressive
context loading chain at the appropriate budget tier.

VPSOS should be able to call `tokenimizer index` to pre-build repository
memory as part of its own setup flow.

---

# Deliverables

Provide:

1. Product vision and positioning
2. Package name rationale (why `tokenimizer`)
3. Three-layer architecture design (skill files / git hooks / watcher)
4. CLI architecture with command hierarchy
5. Wizard flow (step-by-step with branching logic, defaults to all assistants)
6. Registry design (local v1 + remote v2 schema)
7. Folder structure with file purposes
8. Skill schema (complete `skill.json` spec including per-assistant content)
9. All four v1 skill implementations (one content file per supported assistant)
10. Git hook templates for all four hooks (post-commit, post-checkout,
    post-merge, pre-push) with safe co-existence logic
11. Background watcher design with honest scope limitations
12. Token optimization strategy (per feature, with impact estimates)
13. Model routing strategy (YAML schema + community-maintained approach)
14. Integration strategy with existing `autoskills`
15. Future VPSOS integration boundary and API
16. Complete implementation roadmap (v1 → v2 → v3 with acceptance criteria)
17. Example CLI code for `install`, `doctor`, and `hooks install` commands
18. README (user-facing, installation-focused)
19. Risks and mitigations
20. Future roadmap (post-v3)

---

# Reference Implementation

The vpsos-enterprise project (`@apex-accelerators/vpsos`) is the
established reference for the CLI architecture, UI system, and build
pipeline. Tokenimizer must follow the same patterns exactly unless
there is a strong technical reason to diverge.

**Mirror from vpsos-enterprise:**

| What to mirror | Where to find it |
|---|---|
| `src/ui/` — full UI system | `src/ui/*.ts` |
| IO discipline (stderr/stdout/JSON) | `src/ui/io.ts` |
| Theme + icon system + Windows emoji | `src/ui/theme.ts` |
| Interactive checkbox (raw-mode readline) | `src/ui/checkbox.ts` |
| Welcome banner (dual-pane ASCII frame) | `src/ui/render.ts` |
| Structured error format | `src/ui/errors.ts` |
| Steps progress reporter | `src/ui/progress.ts` |
| Build pipeline (esbuild) | `package.json` scripts |
| Test runner (vitest) | `package.json` devDependencies |
| `suggest.ts` typo correction utility | `src/utils/suggest.ts` |
| `scripts/prepare.js` post-install hook | `scripts/prepare.js` |

**Dependency parity:** Use the same `commander`, `cli-table3`,
`fast-glob`, `js-yaml`, `minimatch`, `picocolors`, `zod` versions.
Do not substitute any of these without justification.

**When to diverge:** Only when tokenimizer has a domain requirement
vpsos-enterprise doesn't have (e.g., multi-target assistant installs,
git hook management, file-system watcher). In those cases, extend the
pattern rather than replacing it.

---

# Output Style

Be implementation-focused, practical, and opinionated. Justify
architectural decisions with tradeoffs, not just preferences.

When multiple approaches exist, recommend one and explain why — do not
list options without a conclusion.

Prioritize token efficiency **without sacrificing correctness,
maintainability, or developer experience**.

**Scope gate:** If a deliverable would primarily serve v2 or v3, note
it clearly and keep the v1 implementation path unblocked. Do not let
future-vision work delay a shippable v1.

**UI gate:** All interactive components must use the vpsos-enterprise
`src/ui/` pattern. Do not propose or implement `@inquirer/prompts`,
`chalk`, `ora`, `boxen`, or any other third-party UI library as a
replacement.
