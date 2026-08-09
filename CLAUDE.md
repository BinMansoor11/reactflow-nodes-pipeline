# VectorShift Frontend Technical Assessment

Take-home for a VectorShift Frontend Engineer role. Graded on **successful completion, code
architecture, and design** — architecture counts as much as function. Deliverables are a zip
(`Talha_Mansoor_technical_assessment`) plus a screen recording walking through functionality,
design, and the code.

## Working agreement

The four parts of the brief are built **one at a time, in order**. Do not begin the next part
until the report for the current one is delivered and the go-ahead is given. Never start coding
on a part without an explicit go-ahead.

**Build order is 1 → 3 → 4 → 2**, not the brief's numbering. Part 3 is node work and belongs
beside the abstraction it exercises; Part 4 is an independent layer; Part 2 is cross-cutting and
cannot be a discrete phase. A thin styling foundation (Tailwind + CRACO + design tokens only —
no component classes) is laid *before* Part 1, because the design determines the node config
schema (`icon`, `description`, per-field `help` and `badge`), not merely its CSS. That foundation
is reported as part of Part 2.

Write the report to `notes/part-N-<name>.md` while the reasoning is fresh — on completing the
part, or incrementally where a part spans multiple steps (Part 2 is begun at the foundation step
and finished at the chrome step). Deferring a write-up until days later loses exactly the "why"
detail the reports exist to capture. Each report covers:

1. **What was built** — the files, the shape of the code, how the pieces connect.
2. **Why it was built that way** — the reasoning from an architecture standpoint, not a summary
   of the diff.
3. **What else could have been used instead** — the real alternatives, named specifically
   (libraries, patterns, other structures), each with why it was rejected here.
4. **Trade-offs** — what this design gives up, where it would strain, what would have to change
   if the requirements grew.
5. **Known ceilings** — anything deliberately simplified, and the upgrade path.

Be specific and complete; this is the architecture record, not a changelog. Prefer naming a
concrete alternative and a concrete reason over general statements about clean code.

These reports feed two things: the screen recording, and interview rounds 3–4 where the
founders probe the code directly. Every decision in the submission has to be defensible out
loud. `notes/` is gitignored and does not ship in the zip.

## Commands

```bash
# frontend (CRA)
cd frontend && npm i && npm start        # PORT=3001 if 3000 is taken

# backend (FastAPI)
cd backend && uvicorn main:app --reload  # http://127.0.0.1:8000
```

## Known gotchas in the provided skeleton

These are real, verified by running it — not hypotheticals.

- **`zustand` is not in `frontend/package.json`.** `src/store.js` imports it and only resolves
  because `reactflow` pulls it in transitively. Add it explicitly.
- **`backend/main.py` does not import as shipped.** `Form(...)` requires `python-multipart`.
  The endpoint also needs to become `POST` with a JSON body — `GET` + `Form` is invalid.
- **No CORS middleware on the backend.** Any fetch from the CRA origin fails before reaching
  the handler. Add `CORSMiddleware` allowing **both** `http://localhost:3000` and `:3001` —
  whoever runs the submission gets whichever port is free on their machine.
- **`src/ui.js` has `width: '100wv'`** — typo for `100vw`.
- **Do not add CRACO for Tailwind.** `react-scripts@5.0.1` has native support: its webpack config
  checks for `tailwind.config.js` and injects the `tailwindcss` PostCSS plugin itself. CRACO
  actively breaks this — its `extendsPostcss` overwrites `postcssOptions.plugins` with a function,
  which `postcss-loader` cannot consume, so every plugin is silently dropped and no Tailwind CSS
  is emitted at all.
- **`zustand` must be pinned to v4** (`^4.4.1`), matching what `reactflow` requires. Installing
  the v5 default both duplicates zustand in the bundle and breaks `useStore(selector, shallow)` —
  v5 removed the equality-function argument.
- **No node writes to the store.** `updateNodeField` is defined and never called; every node
  keeps values in local `useState`, so submitted nodes would carry empty `data`. Node fields
  must become controlled through the store.
- Use `PORT=3001` if 3000 is already occupied.

## Architecture conventions

Node definitions are **data, not components**. A node is a config object; one `BaseNode` renders
the chrome and a field-component map renders the inputs. A single registry feeds the canvas
`nodeTypes`, the palette tiles, **and the category tab list**, so adding a node means adding one
object in one file — nothing else. Categories are derived, never listed separately:
`[...new Set(definitions.map(d => d.category))]`. Tab order is therefore the order nodes appear
in `definitions.js`, and a node in a new category creates its tab automatically.

```
src/
  nodes/
    BaseNode.js      # header, body, handle rendering, selection state
    fields/          # Text, Select, TextArea, Number, Toggle
    registry.js      # type -> config. single source of truth
    definitions.js   # all node configs (small, keep in one file — demos better)
    TextNode.js      # the one node needing custom logic (dynamic handles)
  components/        # TopBar, NodePalette, DraggableNode, ResultDialog
  lib/               # parseVariables.js, api.js
  store.js
```

**Submit flow.** `lib/api.js` owns the single `POST /pipelines/parse` call and is the only module
that knows the backend URL; it sends `{nodes, edges}` straight off the store. `components/ResultDialog`
owns presentation and the loading/error states — the brief says "user-friendly alert", so this is a
styled dialog, not `window.alert`. The DAG check itself lives entirely in the backend
(`backend/main.py`, Kahn's algorithm — topological sort that consumes fewer nodes than it started
with iff there's a cycle). No graph logic on the frontend; the endpoint is the source of truth.

Rules:
- Config first. Reach for a custom component only when config genuinely can't express it, and
  keep the escape hatch explicit (the Text node is the intended example).
- No abstraction with one caller. No config value that never changes.
- When a node's handle count changes at runtime, call reactflow's `useUpdateNodeInternals` —
  otherwise existing edges render against stale handle positions. This bug is silent and easy
  to ship.

## Design reference

Mirroring the real VectorShift pipeline builder. The brief explicitly allows this ("You can use
VectorShift's existing styles as inspiration"). Light theme, indigo accent, dot-grid canvas.

**Color**

| Token | Value | Use |
|---|---|---|
| accent | `#6366F1` | node titles, handles, active tab, links |
| accent-strong | `#4F46E5` | primary button |
| accent-tint | `#EEF2FF` | badge bg, node id pill |
| border | `#C7D2FE` | node card border |
| border-muted | `#E5E7EB` | inputs, tiles, dot grid |
| surface | `#FFFFFF` | node cards, canvas |
| text | `#1F2937` | body |
| text-muted | `#6B7280` | descriptions, help text |

**Node card** — white, 1px `border` at 8–10px radius, subtle shadow (`0 1px 2px rgb(0 0 0 / .05)`),
12px padding, width 200px (Input) to 340px (LLM). Header is icon + 13–14px semibold accent title,
with gear/close icons right-aligned. A full-width `accent-tint` pill under the header shows the
node id (`openai_0`). Field labels are 12px with a trailing `?` help affordance and a small
right-aligned type badge (`Dropdown`, `Text`) in `accent-tint`. Inputs are 1px `border-muted`,
6px radius, 13px text. Handles are ~10px white circles with a 2px accent ring, aligned to their
field's row.

**Chrome** — three stacked bars above the canvas: breadcrumb (`Pipelines > Untitled Pipeline`)
with a right-aligned primary button; a search input beside horizontal category tabs (General,
LLMs, Knowledge Base, Integrations, Logic, …) where the active tab is accent with an underline;
then a row of node tiles, each an icon above a label at ~72×64. Canvas is dot-grid with the
minimap bottom-left and vertical zoom controls beside it.

Note this is a **horizontal palette with category tabs**, not a left sidebar.

**Output-field lists** (Outputs node) render as accent-colored field name, type badge, then a
muted one-line description.
