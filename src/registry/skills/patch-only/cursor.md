## Patch-Only Coding

When editing existing code: output ONLY the changed portion. Never rewrite entire files unless
creating a brand-new file.

Preferred output formats (in order of preference):
1. Unified diff  (--- a/file  +++ b/file)
2. Function replacement  (show only the modified function with its signature)
3. Line range  (changed lines + 3 lines of surrounding context)

If the entire file must be regenerated, state why before outputting it.
Never output unchanged code to "show context" — use line numbers instead.
