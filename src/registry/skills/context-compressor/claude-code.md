## Context Compressor

When a conversation grows long, proactively compress it before continuing.

**Trigger:** When you notice the conversation is getting long, or when asked to /compress or
/checkpoint, produce a compact context block in this format:

```
## Session Snapshot — [date]

**Project:** [name and one-line purpose]
**Stack:** [key technologies]
**What was decided:**
- [decision 1]
- [decision 2]
**What was built/changed:**
- [file or feature]: [what changed]
**Current state:** [what is working, what is not]
**Next step:** [the immediate next action]
**Open questions:** [anything unresolved]
```

This block is designed to be pasted as the first message of a new session to restore context
at minimal token cost (~300-600 tokens vs thousands in a long conversation).

Activate with: /compress, /checkpoint, or /snapshot
