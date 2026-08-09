# Extension — Type-aware connection validation

**Status: complete.** Beyond the brief. Built because it closes a loop rather than opening one: the
handle states already turned red or green during a drag, but the check behind them always said yes.

---

## 1. What was built

```
src/lib/types.js        the compatibility rule
src/lib/types.test.js   5 tests
```

Changed: `nodes/definitions.js` (every handle declares a type), `nodes/registry.js`
(`handleTypeOf`), `nodes/fields.js` (`FIELD_TYPES`), `nodes/BaseNode.js` (`isValidConnection`, and
receding incompatible handles), `index.css` (one rule), `nodes/registry.test.js` (7 more tests).

**The rule is deliberately tiny** — it exists to stop obvious mistakes, not to model a language:

```js
const ACCEPTS = { Text: ['Text', 'Number'], Number: ['Number'] };
// Any connects to anything; an untyped handle is unconstrained, not incompatible.
```

`Number` widens to `Text` because everything stringifies; `Text` does not narrow to `Number`,
because most strings are not numbers.

**`inputs` became `{ key, type }`**, matching the shape `outputs` already had. Types were assigned
by asking what each handle actually carries: Math's `a`/`b`/`result` are `Number`, LLM's outputs are
`Text` and `Number`, Text's output is `Text`, and anything genuinely polymorphic — Input's `value`,
Filter's pass-through, Condition's branches — is `Any`.

**Field-bound handles derive their type from the field's kind**, so no definition restates what the
kind already implies:

```js
export const FIELD_TYPES = { text: 'Text', textarea: 'Text', select: 'Text', number: 'Number' };
```

**Three moving parts in `BaseNode`:**

- `isValidConnection` on every `Handle` — reactflow calls it mid-drag and already toggles `.valid`
  from the result, so the existing red/green CSS started meaning something with no style changes.
- `rejects(...)` — reads reactflow's in-flight connection (`connectionNodeId`,
  `connectionHandleId`, `connectionHandleType`) and marks handles that could not accept it.
- One CSS rule fading those to 0.2.

---

## 2. Why it was built this way

**This is the argument for the whole architecture, made a second time.** Adding a type system to
every handle in a nine-node app required: one key per handle in `definitions.js`, one 12-line
resolver in the registry, and one predicate. No node component changed, because there are none.
`BaseNode`'s structure didn't change either — only what it passes to `Handle`.

**Types resolve through the registry, not the node.** `handleTypeOf(node, handleId)` takes a *store*
node and looks its config up by `type`, so validation works for the two ends of a connection that
live in different components and never meet. A React-context or prop-drilling approach would not
have worked — the source node's component knows nothing about the target's.

**Handle ids are `${nodeId}-${key}`**, and node ids contain hyphens (`customInput-1`), so the key is
recovered by `handleId.slice(node.id.length + 1)` rather than by splitting on `-`. Splitting would
have turned `customInput-1-value` into the key `1`. There is a test for exactly this.

**Untyped means unconstrained.** `canConnect` returns `true` if either side has no type. A node
author who forgets to declare types gets permissive behaviour, not a node nothing can connect to —
failing open is right when the feature is an assistive check rather than a safety property.

**Incompatible handles recede rather than disappear.** Fading to 0.2 keeps the layout stable and
still lets a determined user see what's there; hiding them would make nodes jump mid-drag.

---

## 3. What else could have been used, and why not

| Alternative | Why rejected |
|---|---|
| **A real type lattice** (subtyping, generics, unions like `Text \| File`) | Where this goes if the product grows, and far too much for four types. The current rule is two lines and a lookup table; a lattice needs a resolution algorithm and a way to explain failures to users. |
| **Validating in `onConnect` and rejecting after the fact** | Simpler — one check in the store — but the user only learns after dropping, and the edge either flickers in or vanishes silently. `isValidConnection` refuses during the drag, which is the point. |
| **Blocking invalid connections silently** (no visual feedback) | reactflow refuses the drop either way. Without the red handle it looks like the app is broken rather than disagreeing. |
| **Typing handles by field `kind` alone** | Works for field-bound handles and was reused there, but bare handles (`a`, `b`, `trigger`) have no field to derive from, and outputs never do. |
| **Deriving Input's output type from its `inputType` field** (`Text`/`File`) | Genuinely appealing — `type` would become a function of data, like `width` and `dynamicInputs` already are, and the demo would be sharper. Rejected for now because `File` is not in the lattice, so it would mostly produce confusing refusals. Worth doing alongside a `File` type. |
| **Runtime validation in the backend** | The backend checks graph shape, not types. Type checking exists to prevent the mistake at the point of making it; catching it at submit time is too late to be useful. |

---

## 4. Trade-offs accepted

- **The lattice is not extensible without editing `ACCEPTS`.** Adding `File` or `Image` means a code
  change, not a config one. Correct at four types; a registry of types would be the move at twenty.
- **`rejects` runs on every handle of every node** at the start of a drag. Each call is a small array
  scan, and the subscription returns a primitive so it costs two renders per drag, not per frame —
  but it is O(nodes × handles) per drag start.
- **A refused connection explains nothing.** The handle turns red; it does not say *"Text cannot
  feed a Number input."* A tooltip on the rejecting handle would be a real improvement and is the
  obvious next step.
- **`Any` is doing a lot of work.** Filter, Condition and Input are all `Any`, so a large share of
  connections are still unchecked. That is honest — those nodes really are polymorphic — but it
  means the feature catches less than the type coverage suggests.
- **Validation is advisory, not enforced downstream.** Nothing stops an edge that predates a type
  change from persisting; types are checked when connecting, never re-checked.

---

## 5. Known ceilings

- No `File`/`Image` types, despite Input and Output offering them as *field* values. Closing that
  gap is what would let Input's output type follow its own field.
- No explanation on rejection (see above) — the highest-value follow-up.
- Existing edges are never re-validated. If a node's types changed, stale edges would survive.
- `canConnect` is not symmetric and deliberately so, but nothing enforces that `ACCEPTS` stays
  transitive if more types are added — a lattice with three levels could develop inconsistencies no
  test would currently catch.

---

## How this was verified

12 new tests (30 total): the widening rule in both directions, `Any` in both positions, untyped
handles staying permissive, unknown types accepting only themselves, `handleTypeOf` across declared
outputs, declared bare inputs, kind-derived field handles, runtime `{{variable}}` handles, and the
hyphenated-node-id case. Plus an invariant test that every declared handle has a type.

Then in the browser, dragging real connections between an LLM and a Math node:

| Attempt | Hovered handle | Edge created |
|---|---|---|
| `llm-1-response` (**Text**) → `math-1-a` (**Number**) | `connecting`, **no** `valid` | **no** |
| `llm-1-tokens_used` (**Number**) → `math-1-a` (**Number**) | `connecting valid` | yes |
| `math-1-result` (**Number**) → `llm-1-prompt` (**Text**) | `connecting valid` | yes |

The final edge list contained exactly the two valid connections. The Text→Number attempt produced
no edge in any run.

Mid-drag from the Text output, both of Math's `Number` inputs carried
`node-handle--incompatible` and faded — visible in `notes/img/type-validation.png`.

### A measurement trap worth remembering

The first run reported `edgeCreated: false` for *all three* attempts, including the valid ones, and
showed no incompatible siblings. Both were artefacts of reading the DOM synchronously after
dispatching the events:

- reactflow sets `.connecting` and `.valid` by writing to `classList` directly, so those appear
  immediately — which is why they looked correct while everything else looked broken.
- `node-handle--incompatible` comes from React state, and the edge list from a React re-render, so
  neither had flushed yet.

Adding waits fixed both. The second trap was that `addEdge` de-duplicates identical connections, so
re-running the valid attempts created nothing new and looked like another failure — the edge list
had to be inspected directly to see the two edges from the first run.
