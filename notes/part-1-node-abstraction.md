# Part 1 — Node Abstraction

**Status: complete.** Nine node types, one renderer, zero per-node components.

---

## 1. What was built

```
src/nodes/
  definitions.js     9 node configs — the only file you edit to add a node
  BaseNode.js        renders every node: chrome, fields, handles
  fields.js          5 field components + the kind → component map
  registry.js        derives nodeTypes, categories, and initial data
  registry.test.js   7 invariant tests
```

Deleted: `inputNode.js`, `llmNode.js`, `outputNode.js`, `textNode.js`. Four component files
became nine config objects.

**A node is a plain object.** The richest one:

```js
{
  type: 'llm', label: 'LLM', category: 'LLMs', icon: 'AI', width: 340,
  description: 'Run a prompt through a language model.',
  fields: [
    { key: 'system', label: 'System (Instructions)', kind: 'textarea', input: true },
    { key: 'model',  label: 'Model', kind: 'select', options: [...], default: 'gpt-4o' },
    { key: 'personalKey', label: 'Use Personal API Key', kind: 'toggle', default: false },
  ],
  outputs: [{ key: 'response', type: 'Text', description: 'The response as a single string' }],
}
```

**`registry.js` is the whole integration surface** — four derivations, no lists maintained by hand:

| Export | Derived from | Consumed by |
|---|---|---|
| `nodeTypes` | every definition, wrapped in `BaseNode` | the canvas |
| `categories` | `new Set(d.category)`, declaration order | the palette tabs |
| `definitionsIn(c)` | filter by category | the palette tiles |
| `initialData(type, id)` | field `default`s | `ui.js` on drop |

**Supporting changes.** `store.updateNodeField` was returning the *same* node object after mutating
`node.data`; reactflow memoizes node components on identity, so edits could render stale. Now
returns a new node. `store.nodeIDs` was read but never initialized. `ui.js` imports `nodeTypes`
from the registry and seeds dropped nodes with `initialData`. `toolbar.js` and `draggableNode.js`
render from the registry.

### The five new nodes

| Node | Category | Capability it proves |
|---|---|---|
| Filter | Logic | select + text, one in / one out — the baseline |
| Condition | Logic | **two source handles** (`true` / `false`) — branching |
| Math | Data Transformation | number fields, **two bare inputs** (`a`, `b`) |
| API Request | Integrations | 340px, textarea + select, **two described outputs** |
| Note | General | **zero handles** — a node with no I/O at all |

Note and Condition are the load-bearing ones. Neither required touching `BaseNode`.

---

## 2. Why it was built this way

**Handles are derived, not declared.** This is the decision the whole design rests on. A field
carrying `input: true` produces a left handle *aligned to that field's row*; `outputs` produce
right handles. Nothing anywhere states a pixel position.

The alternative — a `handles: [{ id, position, top: '33%' }]` array, which is what the original
`llmNode.js` did by hand with `top: ${100/3}%` — means every field addition silently invalidates
every hand-tuned offset below it. That class of bug doesn't throw and doesn't show up until
someone looks closely at a diagram. Deriving position from the row that owns the handle makes it
unrepresentable. It also matches how VectorShift's real product behaves.

**Two handle sources, because the reference genuinely has two.** Field-bound handles (LLM's
`system` and `prompt` sit on their textarea rows) and bare `inputs` (Output's `value` has no
field). Collapsing these into one concept would have meant either giving every handle a fake field
or giving every field a fake handle.

**Badges are derived from `kind`.** `select` → `Dropdown`, `textarea` → `Text`. No definition
restates what its own field kind already implies — a config value that never varies independently
is not configuration.

**Output rendering is derived too.** Outputs render as a described list when any of them has a
`description`, otherwise as bare edge handles. No `showOutputList: true` flag, because the flag
would only ever be set when descriptions were present.

**Defaults may be functions of the node id.** `default: (id) => id.replace('customInput-', 'input_')`
preserves the original nodes' auto-naming without a special case in `BaseNode`.

**Fields are controlled through the store.** `BaseNode` holds no `useState`; it reads
`data[field.key]` and writes through `updateNodeField`. The original nodes kept values in local
state and never called the store, which meant Part 4 would have submitted nodes with empty `data`.
This is a Part 1 change because it is an architecture decision — single source of truth — not a
Part 4 bug fix.

**`nodeTypes` is built once at module scope.** reactflow warns and remounts every node if the
object identity changes between renders.

---

## 2a. State: why zustand rather than Context + useReducer

**Stated honestly: the skeleton shipped with a zustand store, so this was inherited rather than
chosen.** But making fields controlled through it was a real decision, and it is worth being able
to defend the container rather than shrugging at it.

### Context has no selectors, and that is the whole problem

zustand subscribes per component to a *derived slice*:

```js
useStore((state) => state.updateNodeField)          // re-renders: never
useStore((state) => /* this node's connected handle ids */ ids.join('|'))
```

React Context distributes a **value**. Every consumer re-renders when that value changes,
regardless of which part it actually reads, and there is no equality hook to opt out of — nothing
to compare against, because you get the whole value or none of it.

The cost here is not theoretical. Dragging one node fires `onNodesChange` at roughly 60fps,
replacing the `nodes` array each frame. Under Context, every node component re-renders every frame
of every drag. Under selectors, `BaseNode` re-renders only when *its own* connections change —
which is exactly why its selector returns a joined string rather than a `Set`: a fresh `Set` would
compare unequal on every call and loop forever, and a string lets zustand's default `Object.is`
do the work with no equality function at all.

`shallow` exists for the cases where a selector genuinely must return an object — `{ nodes, edges }`
in `TopBar`, the seven handlers in `ui.js`. A new object is never `Object.is`-equal to the last one,
so without `shallow` those two components would re-render on every store write. It compares one
level deep instead. Only two call sites need it; everything else returns a primitive.

### Two things Context cannot do here at all

1. **`getState()` outside a render.** `submit.js` reads `{ nodes, edges }` on click rather than
   subscribing, so the button does not re-render while nodes are dragged. `isValidConnection` does
   the same, and reactflow calls it **mid-drag, not during render**. Context can only be read from
   inside a component render; the Context version of both would need a ref shadowing state, which
   is a workaround, not a design.
2. **reactflow already is a zustand store.** `BaseNode` reads `connectionHandleType` from it via
   `useFlowStore`. Adding Context would put two state systems side by side in the same components.

### `useReducer` is not the part that fails

The store's actions — `addNode`, `onNodesChange`, `updateNodeField` — are already reducer-shaped,
and swapping in `useReducer` would change nothing about them. The problem is **Context as the
distribution mechanism**, not the reducer as the update mechanism.

The Context version that would actually perform — a store instance held in context, consumed via
`useSyncExternalStore`, with a `useSelector` hook taking an equality function — is a fifty-line
reimplementation of zustand with fewer tests.

### What else was considered

| Alternative | Why not |
|---|---|
| **Context + useReducer** | Above. No selectors, no reads outside render. |
| **Redux Toolkit** | Would work, and `useSelector` solves the subscription problem properly. Rejected as weight: a store, slices, and a provider for a nine-node canvas, when reactflow already brings zustand as a dependency. Right answer at a much larger app. |
| **Jotai / Recoil** | Atom-per-value granularity is a genuine fit for a canvas. Rejected because nodes and edges are naturally two arrays, not thousands of atoms, and it would mean a second state library beside reactflow's. |
| **Lifting state into `App` and prop-drilling** | Every node is rendered by reactflow from `nodeTypes`, not by our own JSX, so there is nowhere to drill through. Not available even in principle. |

### Where Context or local state *is* the right answer

Low-frequency state with one consumer, which the app already uses plain `useState` for: the submit
lifecycle in `submit.js`, and the active tab and search query in `NodePalette.js`. Neither belongs
in a global store — putting them there would make them look shared when they are not.

**Ceiling.** Every node currently subscribes to `edges` to know whether its handles are connected,
so an edge change runs one selector per node — O(nodes × edges) per mutation. Fine at demo scale;
an index from handle id to edge would be the fix if this grew.

---

## 3. What else could have been used, and why not

| Alternative | Why rejected |
|---|---|
| **`BaseNode` as a layout shell with `children`** (each node stays a component, imports the shell) | The obvious first answer, and it does remove the chrome duplication. But it leaves nine components to maintain, and adding a node still means writing JSX, wiring handles by hand, and editing the toolbar. The brief asks for an abstraction that "speeds up your ability to create new nodes" — a shared wrapper speeds up *styling* and barely touches *creation*. |
| **Higher-order component** (`createNode(config)` returning a bespoke component per type) | Nearly what `registry.js` does, but it hides the config behind a factory and makes the node harder to inspect. The current `wrap` is three lines and the config stays a plain readable object. |
| **Render props / slot components** (`<BaseNode header={…} body={…}>`) | Maximum flexibility, and wrong here: it pushes layout decisions back into every definition, so "apply styles across nodes" stops being a single-file change. |
| **JSON Schema + a form library** (react-jsonschema-form, Formik) | Real answer for a large form product. Rejected on weight: a dependency and a schema dialect to render five input types, plus fighting its layout to match the reference. |
| **A `handles` array on each config** | Discussed above — reintroduces the hand-maintained positions the abstraction exists to eliminate. |
| **One file per node config** (`nodes/definitions/llm.js` …) | Nine files, nine imports, an index to maintain. At ~25 lines each they read better as one scrollable file — and it demos better, since the whole system fits on one screen. Worth revisiting at ~30 nodes. |
| **A `fields/` directory** | Same reasoning: five components averaging 12 lines. A directory here is filing, not architecture. |
| **Keeping `useState` in nodes and lifting only on submit** | Would work, and is less code today. Rejected because it makes the store a lie — two sources of truth for the same value, reconciled only at submit time. |

---

## 4. Trade-offs accepted

- **Config expressiveness has a ceiling.** Anything the schema can't say needs either a new schema
  key or an escape hatch. The bet is that most nodes are "header + fields + handles," which the
  reference product supports. Part 3 is the real test.
- **`BaseNode` carries all the layout complexity.** It is the longest file and the one place a
  styling mistake affects every node. That's the intended trade — one place to fix is the point —
  but it does mean `BaseNode` deserves care that `definitions.js` does not.
- **Two special cases live in `BaseNode`**: toggles render their own inline label (so no label row),
  and outputs switch between list and bare handles. Both are driven by the reference design rather
  than by config flags, but they *are* branches in the renderer, and a third would be worth
  questioning.
- **No per-node style overrides.** A definition can set `width`, nothing else. Deliberate: the
  moment definitions can pass class names, "apply styles across nodes" stops holding.
- **Icons are text abbreviations** (`IN`, `AI`, `FX`) in a tinted square, not real logos. Zero
  dependencies and visually consistent; the reference uses vendor logos. Upgradeable to inline SVG
  in Part 2 if time allows, and the config already has the seam (`icon`).

---

## 5. Known ceilings

- **`dynamicInputs` was deliberately not built.** The plan called for a config hook returning
  runtime-computed handles, for Part 3's `{{variable}}` parsing. It was left out because it would
  have had zero callers — the rule against speculative abstraction applies to my own plan. It
  lands in Part 3, alongside its first caller, and `BaseNode`'s handle list is already shaped to
  take it.
- **No custom-component escape hatch either**, for the same reason. If Part 3 resists a config-only
  solution, `registry.wrap` is the one place it gets added.
- **Handle spacing for bare inputs is `(i+1)/(n+1)` of card height.** Fine to about four handles;
  beyond that they crowd. If a node ever needs many bare inputs, they should get label rows and
  become field-bound.
- **No node deletion or duplication UI** — reactflow's default backspace-to-delete works. The
  gear/close icons in the reference header are not implemented.
- **`registry.test.js` covers derivations, not rendering.** A `BaseNode` layout regression would
  not be caught. Deliberate: rendering assertions on a design still in flux would be rewritten in
  Part 2 anyway.

---

## How this was verified

Beyond the 7 passing tests, the two claims that matter were checked in the running app.

**Handle derivation** — DOM query of every rendered node's handles:

```
customInput-1  targets: []                     sources: [value]
llm-1          targets: [system, prompt]       sources: [response, tokens_used]
condition-1    targets: [input]                sources: [true, false]
note-1         targets: []                     sources: []
```

Condition branching and Note's total absence of handles are the two cases that would have exposed
a schema that secretly assumes "one in, one out." Both came out of config alone.

**Store round-trip** — typed into Input's Name field; the value went from the seeded `input_1` to
`user_question` and the input re-rendered with it. Since `BaseNode` holds no local state, the only
path for that value is store → render. This also confirms function defaults resolve on drop.

Screenshot: `notes/img/part1-nodes.png`.

The build compiles with no warnings — the pre-existing `react-hooks/exhaustive-deps` warning in
`ui.js` was fixed while touching that callback.
