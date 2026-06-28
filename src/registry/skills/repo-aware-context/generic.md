## Repo-Aware Minimal Context

Load context progressively. Never pull in more than what the current task requires.

**Loading order (strict):**
1. Project summary (project_summary.md if present, else README first 50 lines)
2. Relevant module (the folder containing the files being changed)
3. Specific files (only files directly referenced by the task)
4. Specific functions (patch-level — not entire files if only one function changes)
5. Solve

**Rules:**
- Never read entire repositories unless explicitly asked
- Never pre-load files "just in case" — wait until they are needed
- Never include node_modules, lockfiles, build outputs, or generated files
- Trim log files to: last error block + 10 lines of surrounding context
- For imports: only follow one hop (direct dependencies of changed file, not transitive)
- Reference line numbers instead of quoting unchanged code for context

**When you need more context:** state exactly what file and what section you need, and why.
Say "minimal context mode" to activate this skill.
