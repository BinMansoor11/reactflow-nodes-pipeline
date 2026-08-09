# Bonus ideas — deferred, ranked by what they'd buy

Running list of things deliberately not built. Nothing here is required by the brief. The default
is to ship none of them: a tight four-part submission beats a sprawling five-part one. Revisit
Saturday, and take **at most one**.

Ranked by demo value per hour.

---

## ~~1. Type-aware connection validation~~ ✅ **done** — see [type-validation.md](type-validation.md)

Built. Every handle declares a type, `isValidConnection` enforces it mid-drag, and incompatible
handles recede while a connection is in flight. `Number` widens to `Text`, not the reverse; `Any`
connects to anything; untyped stays permissive.

It cost one key per handle in `definitions.js`, a 12-line resolver in the registry, and one
predicate — no node component changed, because there are none. The architecture argument, made a
second time.

Follow-ups it opened, in value order: a tooltip explaining *why* a connection was refused; `File`
and `Image` types, which would let Input's output type follow its own `Type` field.

---

## 2. Pipeline persistence to localStorage

Reload the page, keep your pipeline. Cheap (`zustand/middleware`'s `persist`, ~5 lines) and
immediately obvious to a reviewer who refreshes.

Weakness: it's plumbing, not architecture. Says little that Parts 1–4 don't already say.

---

## 3. Colour-blind-safe validity signal

Green/red is currently the only channel distinguishing a valid drop target from an invalid one; the
scale change is a partial second. A shape or icon difference would be a real fix.

Small, correct, and unlikely to be noticed unless someone is looking for accessibility — which,
given VectorShift builds a visual editor, someone might be.

---

## 4. Node header actions (gear / close)

The reference has them; we render neither. Delete-on-backspace already works, so this is
discoverability rather than capability. Mostly cosmetic fidelity to the screenshot.

---

## 5. Real vendor icons

`IN` / `AI` / `FX` text badges → inline SVG. The config already has the `icon` seam, so this is a
swap, not a change. Pure polish, and a time sink for how little it proves.

---

## Not bonus — internal ceilings

Recorded in the part reports, listed here so they aren't confused with features:

- Connected-handle lookup is O(nodes × edges) per edge mutation. Fine to a few hundred nodes.
- `zustand` is pinned to v4 by `reactflow@11`. v5 needs reactflow 12 and a `useShallow` migration.
- Bare-input handle spacing crowds past ~4 handles on one side.
