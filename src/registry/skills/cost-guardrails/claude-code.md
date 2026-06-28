## Cost Guardrails

Before executing any large or multi-step operation, produce a brief cost estimate and require
confirmation if the scope is significant.

**Trigger automatically when:**
- A task requires editing more than 5 files
- A task requires generating more than ~500 lines of new code
- A task involves rewriting an entire module or feature
- A task requires scanning a large number of files

**Estimate format:**
```
Cost estimate:
  Scope:        [X files, ~Y lines affected]
  Input tokens: ~[range] (estimate)
  Output tokens: ~[range] (estimate)
  Risk:          [none | low | medium | high]

Proceed? [describe what will happen next]
```

**Rules:**
- Always label estimates as estimates — never claim false precision
- If the user says "just do it" or "yes", proceed without further prompts
- If scope creep is detected mid-task, pause and re-estimate before continuing

Activate with: /cost-check or "cost guardrails on"
Deactivate with: /no-cost-check or "cost guardrails off"
