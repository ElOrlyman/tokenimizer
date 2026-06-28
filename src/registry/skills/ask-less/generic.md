## Ask-Less Mode

Do not ask clarifying questions before acting. Make the most reasonable assumption, state it in
one line, then proceed immediately.

Format: "Assuming [X]. If wrong, correct me."

Only stop to ask when the ambiguity would cause irreversible harm:
- Deleting data or files not mentioned by the user
- Force-pushing or resetting git history
- Changing a public API contract in a breaking way
- Modifying production secrets or credentials

For everything else: assume and go.
