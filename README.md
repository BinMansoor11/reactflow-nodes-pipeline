# Pipeline Builder

A node-based visual pipeline editor — drag nodes onto a canvas, wire them together, and submit the
graph for validation. React + React Flow on the front, FastAPI on the back.

<!-- ![Pipeline builder canvas](docs/screenshot.png) -->

## What it does

- **Drag-and-drop canvas** — nine node types across five categories (General, LLMs, Logic, Data
  Transformation, Integrations), with a searchable horizontal palette and category tabs.
- **Typed connections** — every handle declares what it carries (`Text`, `Number`, `Any`). While
  you drag a connection, handles that cannot accept it recede and the ones that can stand out; an
  incompatible drop is refused rather than silently accepted.
- **Variable-driven handles** — type `{{ name }}` into a Text node and it grows an input handle for
  `name`, live, as you type. The card resizes to fit its content.
- **Graph validation** — Submit posts the pipeline to the backend, which reports node count, edge
  count, and whether the graph is a DAG. The result lands in a styled dialog with real loading and
  error states, not a `window.alert`.

## How I built it

### Nodes are data, not components

This is the decision the rest of the codebase hangs off. A node is a config object in
[definitions.js](frontend/src/nodes/definitions.js), not a React component:

```js
{
  type: "math",
  label: "Math",
  category: "Data Transformation",
  icon: "FX",
  inputs: [{ key: "a", type: "Number" }, { key: "b", type: "Number" }],
  fields: [{ key: "operation", label: "Operation", kind: "select", options: [...] }],
  outputs: [{ key: "result", type: "Number" }],
}
```

One [BaseNode](frontend/src/nodes/BaseNode.js) renders every node from that shape — header, id
pill, field rows, handle placement, selection state. A field-component map in
[fields.js](frontend/src/nodes/fields.js) renders the inputs, keyed by `kind`.

Adding a node is **one object in one file**. It appears on the canvas, in the palette, and under
its category tab with no other edit anywhere. Categories aren't listed separately — they're
derived:

```js
export const categories = [...new Set(definitions.map((d) => d.category))];
```

So a node in a category that doesn't exist yet creates its own tab. The
[registry](frontend/src/nodes/registry.js) is the single source of truth feeding React Flow's
`nodeTypes`, the palette tiles, and the tab list alike.

### Nothing gets restated

Derivation over declaration, everywhere it's available:

- A field's type badge (`Dropdown`, `Text`, `Number`) comes from its `kind`, not from the config.
- A field-bound handle's connection type comes from that same `kind`.
- Handle positions are computed from the field's row — nothing declares a pixel offset, so adding a
  field can never leave a handle pointing at the wrong place.
- The visible node id (`input_1`) is derived from the label, while the store's id
  (`customInput-1`) stays unique and stable for React Flow.

### The escape hatch, kept narrow

Two config keys accept a function of the node's data instead of a literal:

```js
width: (data) => textNodeWidth(data?.text),
dynamicInputs: (data) => parseVariables(data?.text).map((key) => ({ key, type: "Text" })),
```

That's the whole mechanism behind the Text node's live variable handles and its autosizing. It
stays a config object — no custom component, no second render path through BaseNode. The parsing
lives in [lib/text.js](frontend/src/lib/text.js) as pure functions (identifier regex,
reserved-word filter, first-appearance ordering), which is what makes it testable without mounting
anything.

### Type checking as a lattice, deliberately tiny

[lib/types.js](frontend/src/lib/types.js) is about fifteen lines:

```js
const ACCEPTS = { Text: ['Text', 'Number'], Number: ['Number'] };
```

`Number` widens to `Text` because everything stringifies; `Text` doesn't narrow to `Number`,
because most strings aren't numbers. An untyped handle is *unconstrained* rather than incompatible
— a node that hasn't declared types shouldn't become unconnectable. React Flow's
`isValidConnection` consumes this, which makes its existing red/green drag states finally mean
something instead of always saying yes.

### The two things that bite you in React Flow

Both are silent failures, which is why they're worth naming:

- **Stale handle positions.** React Flow caches handle geometry and won't re-measure on its own. When
  a Text node grows a handle or resizes, existing edges keep pointing at the old coordinates. The
  fix is `useUpdateNodeInternals`, keyed on width, the handle list, and autosize content.
- **Mutated node data.** Node components are memoized on identity, so mutating `node.data` in place
  leaves a node rendering its previous value. The store returns new objects.

Store selectors return **primitives or joined strings** rather than fresh objects, so zustand's
default equality check works and a node only re-renders when its own connections change. Where
state is needed only at event time — the submit handler, mid-drag validation — I read
`useStore.getState()` instead of subscribing, so dragging one node doesn't re-render the top bar.

### Autosizing without measuring

The autosize textarea grows with its content using **no refs, no ResizeObserver, no layout effect**.
The textarea and an invisible copy of its text share one CSS grid cell — the copy dictates the
cell's size and the textarea stretches to fill it:

```jsx
<div className="grid">
  <textarea className="col-start-1 row-start-1" rows={1} … />
  <span aria-hidden className="col-start-1 row-start-1 invisible whitespace-pre-wrap">{value + ' '}</span>
</div>
```

### Backend

[main.py](backend/main.py) is a single POST endpoint. The DAG check is Kahn's algorithm —
repeatedly remove a node with no remaining incoming edges; if fewer come out than went in, the
survivors are holding each other up, which is a cycle. Self-loops fall out of the same rule for
free.

The Pydantic models pick out only `id`, `source`, and `target`, so the graph check doesn't depend
on the canvas's node shape and won't break when a node gains a field. No graph logic lives on the
frontend — the endpoint is the source of truth. [lib/api.js](frontend/src/lib/api.js) is the only
module that knows the backend URL, and it turns a bare `Failed to fetch` into something a person
can act on.

### Styling

Tailwind with a design-token theme in [tailwind.config.js](frontend/tailwind.config.js) —
`accent`, `ink`, and `edge` scales, one node radius, one node shadow. No component classes: the
tokens are the shared vocabulary and the markup composes them. CRA 5 injects the Tailwind PostCSS
plugin natively once it sees `tailwind.config.js`, so there's no build tooling to configure and
nothing to eject.

The one place raw CSS earns its keep is [index.css](frontend/src/index.css), where connection
states react to a `data-connecting` attribute set on an ancestor — a cross-element cascade
Tailwind's utilities can't express.

## Tests

Pure logic is covered where covering it is worth something: variable parsing and width derivation,
the type lattice, and the registry's handle-type resolution and data seeding — 30 assertions, plus
the backend DAG check. No component-render tests; they'd assert markup, which is the part most
likely to change for design reasons.

```bash
cd frontend && npm test
cd backend && pytest
```

## Running it

```bash
# frontend
cd frontend && npm install && npm start        # PORT=3001 if 3000 is taken

# backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload                      # http://127.0.0.1:8000
```

The frontend reads `REACT_APP_API_URL` if you need to point it somewhere else; it defaults to
`http://127.0.0.1:8000`.

## Structure

```
frontend/src/
  nodes/
    definitions.js   every node config — the one file you edit to add a node
    registry.js      derived lookups: nodeTypes, categories, handle types
    BaseNode.js      renders all nodes; owns handle placement and validation
    fields.js        field components keyed by kind, plus badge and type maps
  components/        TopBar, NodePalette, DraggableNode, ResultDialog
  lib/               text.js (variable parsing), types.js (lattice), api.js
  store.js           zustand: nodes, edges, id allocation, field writes
  ui.js              the React Flow canvas
backend/
  main.py            POST /pipelines/parse — counts and Kahn's DAG check
```

## What I'd do next

- **Persistence.** The store is in memory, so a pipeline dies on refresh. Serializing
  `{nodes, edges}` to `localStorage` is small; versioning it against a definitions file that keeps
  changing isn't, so it waits for a real schema.
- **A richer type system.** The lattice catches obvious mistakes. Structured types (`File<pdf>`,
  `List<Text>`) would need a real subtyping check rather than a lookup table.
- **Node execution.** The backend validates shape, not semantics. Actually running a pipeline means
  a scheduler over the topological order Kahn's algorithm already produces.
