# Terminology proposals

Drop one file per proposed term here. One file per proposal means two agents
working in parallel worktrees never conflict, which is the whole point of this
directory existing.

Name the file after the term: `order-line.md`, `settlement-window.md`.

```markdown
# Order line

**Definition.** A single priced item within an order, including quantity and
the discount applied at the time of sale.

**Not to be confused with.** "Line item", which we use only for invoice rows,
and "product", which is the catalogue entry rather than the purchased instance.

**Established by.** Issue #42, ADR 2026-07-26-order-modelling.
```

The Product Owner is the only writer of `CONTEXT.md`. It folds proposals in,
reconciles synonyms against terms already defined, rejects duplicates, and
deletes the proposal file once absorbed. A term that has not been absorbed yet
is not yet part of the project's language, so do not rely on it in a spec.
