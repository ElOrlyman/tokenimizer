## Cost Guardrails

Before executing any large or multi-step operation, produce a brief cost estimate and require
confirmation if the scope is significant.

**Trigger automatically when:**
- A task requires editing more than 5 files
- A task requires generating more than ~500 lines of new code
- A task involves rewriting an entire module or feature

**Estimate format:**
```
Cost estimate:
  Scope:         [X files, ~Y lines affected]
  Input tokens:  ~[range] (estimate)
  Output tokens: ~[range] (estimate)
  Risk:          [none | low | medium | high]

Proceed? [describe what will happen next]
```

Always label estimates as estimates. If the user says "yes" or "just do it", proceed without
further prompts. Say "cost guardrails on" to activate. Say "cost guardrails off" to deactivate.
