# Part 2 — Styling

> **Status: complete.** Part 2 was cross-cutting rather than a discrete phase, so this report was
> written in three passes: **Step 0**, the token foundation laid before Part 1; an **interim handle
> UX pass** between Parts 1 and 3; and **Step 4**, the chrome, after Part 4. All three are below,
> in the order they happened.

---

## Step 0 — Token foundation

### 1. What was built

| File | Change |
|---|---|
| `frontend/tailwind.config.js` | New. Content globs + design tokens under `theme.extend`. |
| `frontend/src/index.css` | Added the three `@tailwind` directives above the existing body styles. |
| `frontend/package.json` | `zustand` pinned to `^4.4.1`; `tailwindcss@3`, `postcss`, `autoprefixer` as devDependencies. |
| `frontend/src/ui.js` | `width: '100wv'` → `'100vw'`. |

The token set, deliberately small:

- **Colors** — `accent` (`#6366F1`, DEFAULT) / `accent-strong` (`#4F46E5`) / `accent-tint`
  (`#EEF2FF`); `ink` (`#1F2937`) / `ink-muted` (`#6B7280`); `edge` (`#C7D2FE`) / `edge-muted`
  (`#E5E7EB`).
- **Radius** — `rounded-node` (10px), matching the reference's card corner.
- **Shadow** — `shadow-node` (`0 1px 2px rgb(0 0 0 / .05)`), `shadow-node-selected` (2px accent ring).

No component classes, no `@layer components`, no `Button.jsx`. Nothing exists yet that would
call them.

There is **no `craco.config.js`** — see below.

### 2. Why it was built this way

**Tokens live in `theme.extend`, not as raw CSS custom properties.** The brief asks for an
abstraction that lets you "apply styles across nodes in the future." Putting values in Tailwind's
theme means `text-accent` is generated *from* the token, so changing one hex value restyles every
node, badge, handle and tab at once. Bare CSS variables would give the same indirection but none
of the utility composition — you would still hand-write the rules that consume them.

**Names are semantic, not literal.** `accent` rather than `indigo`, `ink` rather than `gray`,
`edge` rather than `border-light`. Re-theming then never requires renaming a class, and the names
survive a palette change. `edge` also avoids colliding with Tailwind's own `border-*` utility
namespace, which `border` as a color key would have made ambiguous (`border-border`).

**`DEFAULT` keys** so the common case is `text-accent`, not `text-accent-500`.

**Extend, not replace.** `theme.extend` keeps Tailwind's full default scale available. Replacing
`theme` outright would mean re-declaring spacing, font sizes and the neutral ramp for no gain.

**This step precedes Part 1 because the design determines the node config schema.** The reference
screenshot shows each node carrying an icon, a description line, an id pill, and each field
carrying a help affordance and a type badge. Those are config keys, not CSS. Building `BaseNode`
without them would mean rewriting both the component and all nine definitions later.

### 3. What else could have been used, and why not

| Alternative | Why rejected |
|---|---|
| **Plain CSS / CSS Modules with custom properties** | Zero dependencies and genuinely viable. Rejected on iteration speed: matching a reference design means many small spacing and color adjustments, and utility classes make those a one-token edit in JSX rather than a round trip to a stylesheet. Also produces one more file per component. |
| **styled-components / Emotion** | Runtime CSS-in-JS costs a style recalculation on render. This is a canvas app where nodes re-render during drag; paying that per node per frame is the wrong trade. Adds a dependency Tailwind does not. |
| **MUI** | Already in my toolkit, so the fastest path to *a* design — but the wrong one here. The goal is to mirror VectorShift's look, and that means overriding MUI's opinions at every step. Large bundle for a nine-component app. |
| **Tailwind v4** | The current major, so the default choice — and wrong here. v4 moves configuration into CSS via `@theme` and drops `tailwind.config.js`. `react-scripts@5.0.1` detects Tailwind *by the existence of `tailwind.config.js`* (`webpack.config.js:72`). Adopting v4 removes the very file the native integration keys off, breaking the wiring. v3 keeps a zero-config-change path. |
| **CRACO** | Tried, then removed — see below. Both unnecessary and actively harmful. |
| **Ejecting CRA** | Irreversible, produces a huge unreviewable diff, and buys nothing the native integration doesn't already provide. |
| **Migrating to Vite** | Genuinely tempting (faster HMR, modern toolchain). Rejected as scope creep: the brief specifies the app runs via `npm i` && `npm start`, and a reviewer running the submission should meet the toolchain they expect, not a rewrite of it. |

### 4. Trade-offs accepted

- **Tailwind v3 is in maintenance while v4 is current.** Accepted deliberately: compatibility with
  the CRA the brief ships beats being on the newest major for a four-day take-home. If this were a
  long-lived codebase, the honest answer is to migrate the build to Vite and go to v4 — but that is
  a toolchain decision, not a styling one.
- **The token set is intentionally incomplete.** No success/danger colors yet; Part 4 will need
  them for the result dialog's DAG/cycle states. Adding a token when the first caller appears is
  cheaper than guessing the palette now.
- **No dark mode.** The reference is light-only and the brief asks to match it. `dark:` variants
  across nine node types would be real work for something nobody asked for.
- **Utility classes make JSX noisier** than semantic class names. This is the standard Tailwind
  trade. It is largely neutralized here because `BaseNode` centralizes the node chrome — the
  utility soup lives in one file, and the nine definitions stay clean config objects.

### 5. Known ceilings

- `shadow-node-selected` fakes a focus ring with `box-shadow`. Fine for a static selected state;
  if selection ever needs to animate, move to Tailwind's `ring-*` utilities so the ring can
  transition independently of the card's own shadow.
- **`zustand` is pinned to v4 by `reactflow@11`'s peer requirement.** Upgrading to `reactflow@12`
  would unlock zustand v5, but v5 removes the `useStore(selector, equalityFn)` signature that
  `ui.js` uses, so that upgrade is a two-part change. Not worth it inside this assessment.

---

## Interim — Handle UX pass

Done between Part 1 and Part 3, out of build order. Part 3 adds *more* handles to the Text node
(one per `{{variable}}`), so fixing handle interaction first means the new ones inherit it rather
than needing a second pass.

Prompted by review feedback: the handles worked, but were unpleasant to use.

### 1. What was built

All five weaknesses identified in review, in `index.css` (styling and states) and `BaseNode.js`
(the two states that need data).

| # | Problem | Fix |
|---|---|---|
| 1 | 10px dot was the entire grab target | `::after` with `inset: -6px` → a ~22px hit area, invisible, dot unchanged |
| 2 | No signal a handle was interactive | `cursor: crosshair`, plus scale + tint on hover |
| 3 | No feedback while dragging a connection | Node root carries `data-connecting`; incompatible handles fade to 0.25, compatible ones scale up, and the hovered one turns green when valid / red when not |
| 4 | Connected and unconnected looked identical | Wired handles fill solid accent |
| 5 | Bare input handles were anonymous dots | Each renders its name outside the card, plus a `title` |

**Two of these need data, not just CSS.**

*Connected state* — `BaseNode` reads the store for edges touching this node. The selector returns
a **joined string, not a Set**, so zustand's default `Object.is` equality works and the node
re-renders only when its own connections change. Returning a fresh `Set` from a selector would
compare unequal every time and loop forever.

```js
const connectedKey = useStore((state) => { /* … */ return ids.sort().join('|'); });
const connected = useMemo(() => new Set(connectedKey.split('|')), [connectedKey]);
```

*Connection direction* — read from **reactflow's own store**, not ours:
`useFlowStore((s) => s.connectionHandleType)` returns `'source' | 'target' | null`. It's a
primitive, so equality is trivial and each node re-renders twice per drag (start and end), not per
frame.

### 2. Why it was built this way

**The hit area is a pseudo-element, not a bigger handle.** Growing the handle would push the dot
off the card border and change the design. `::after` decouples the target from the visual — the
standard fix, and it inherits `pointer-events` from the handle, which reactflow sets to `all` via
its `.connectionindicator` class.

**States are CSS, driven by classes reactflow already sets.** reactflow v11 puts `.connecting` on
the handle under the cursor and toggles `.valid` on it. Those are free; no React state, no
re-render mid-drag. I verified these names in `@reactflow/core`'s source rather than assuming —
the v12 names (`connectingfrom` / `connectingto`) don't exist in v11, and guessing would have
produced rules that silently never matched.

**Specificity, not `!important`.** reactflow's stylesheet is imported from `ui.js` and lands
*after* `index.css` in the bundle, so equal-specificity rules would lose. Every rule pairs
`.react-flow__handle` with `.node-handle` (0,2,0 beats 0,1,0). The rules are then ordered by
ascending specificity — base, hover, connecting, valid — so each state overrides the previous
without fighting.

**Only bare inputs get labels.** Field-bound handles are already named by the row they sit on, and
listed outputs by their own name. Bare *outputs* are all single-per-node, so a label would state
the obvious. Bare *inputs* include Math's `a`/`b`, which are genuinely ambiguous.

### 3. What else could have been used, and why not

| Alternative | Why rejected |
|---|---|
| **Bigger handles** | Simplest fix, but changes the design and crowds a 240px card. The pseudo-element gets the ergonomics without the cost. |
| **`isValidConnection` per handle for validity feedback** | reactflow supports it, and it would let us reject type-mismatched connections. Rejected as out of scope: no type system exists yet on outputs, so it would be validation theatre. Right answer once outputs carry real types. |
| **Global dim via a class on the reactflow wrapper** | There is no such class in v11; it would mean a DOM write on every connection start. Reading `connectionHandleType` per node is idiomatic and cheap. |
| **Tracking connected handles in our own store** (a derived `connectedHandles` set maintained by `onConnect`) | Faster to read, but duplicates state already implied by `edges` and would drift on edge deletion. Deriving is correct; the cost is a selector. |
| **Rendering labels inside the card** | Overlaps the fields — Math's `a`/`b` sit at 33% and 66% of card height, directly over the Operation row. Outside-left is clear and reads like the reference. |
| **Tooltip-only labels** (`title` alone) | Requires hovering to discover what you're connecting to, which is exactly the moment you need to already know. Kept `title` as well, but a visible label is the actual fix. |

### 4. Trade-offs accepted

- **Every node subscribes to `edges`.** The string-returning selector keeps re-renders scoped to
  nodes whose own connections changed, but each node still runs the selector on every edge change —
  O(nodes × edges) per mutation. Irrelevant at demo scale; would want an index at a few hundred
  nodes.
- **Colour alone signals validity** (green / red). Fails for colour-blind users. The scale change
  is a partial second channel, but a shape or icon change would be better. Noted, not fixed.
- **The 22px hit areas of adjacent handles could overlap** on a node with many closely spaced bare
  inputs. Currently the tightest is Math at ~60px apart, so there's ample room.
- **Labels sit outside the card**, so they can visually collide with an incoming edge or a node
  placed immediately to the left. Acceptable; the alternative overlapped the fields.

### 5. Known ceilings

- Validity is currently "is this structurally connectable," not "do these types match." Real type
  checking wants `isValidConnection` plus a type on every handle — see the table above.
- The dim/highlight rules assume every handle is left or right (they compose with
  `translate(0, -50%)`). A top or bottom handle would need its own transform. Fine while the design
  is horizontal.

### How this was verified

Drove a real connection drag in the browser and sampled state mid-flight:

```
hit area:      reachable at 8px from centre, not at 14px   → ~22px target, as designed
mid-drag:      node root data-connecting = "source"
hovered target: … node-handle target … connecting valid    → both classes applied
sibling source: opacity 0.25                               → incompatible handle receded
after connect: math-1-a connected, math-1-b connected,
               math-1-result NOT connected                 → indicator tracks real edges
```

The last line is the one worth keeping. Two of Math's three handles reported connected, which
looked like a bug until the edge list confirmed two edges genuinely existed — and `result`, with no
edge, correctly stayed hollow.

Screenshot: `notes/img/handles-ux.png`.

---

## Step 4 — The chrome

The last piece: everything that is not a node. Triggered in part by a plain bug report — *"I can't
see the submit button anywhere."*

### 1. What was built

```
src/App.js                        layout shell
src/components/TopBar.js          breadcrumb, live counts, primary action
src/components/NodePalette.js     search, category tabs, tile row
src/components/DraggableNode.js   moved from src/draggableNode.js
src/ui.js                         canvas fills its parent; dot grid, minimap, empty state
src/submit.js                     button only — its wrapper moved into TopBar
```

Deleted: `src/toolbar.js`, `src/draggableNode.js`.

**The layout is a fixed-height column.** `h-screen flex flex-col overflow-hidden`: chrome takes
what it needs, `<main className="min-h-0 flex-1">` takes the rest, and the canvas is the only thing
that pans.

**The palette is horizontal with category tabs**, matching the reference. Tabs come from
`categories`, tiles from `definitionsIn(active)` — both registry derivations, so a new node in a new
category creates its own tab with no edit to `NodePalette.js`.

**Search spans every category** rather than filtering within the active tab, and deselects the tab
while a query is active.

Also: a dot grid on `edge-muted`, minimap and zoom controls bottom-left, an empty state on a blank
canvas, and the node id pill now renders the reference's readable form (`input_1`) derived from the
node's label rather than the raw store id (`customInput-1`).

### 2. Why it was built this way

**`min-h-0` is the load-bearing class.** A flex child's default `min-height: auto` refuses to shrink
below its content, so `flex-1` alone would let the canvas push the page taller than the viewport —
which is exactly the bug that hid the submit button. `min-h-0` lets it shrink to the space left over.

**The submit button moved into the top bar** because that is where a primary action belongs, and
because its previous home — a strip below a `70vh` canvas — was only ever reachable by scrolling.
`submit.js` still owns the request lifecycle; only its wrapper moved, so `TopBar` renders a button
and knows nothing about fetches.

**Counts live in the top bar** and read `nodes.length` / `edges.length` through a `shallow`
selector, so the header re-renders on structural changes but not while a node is dragged.

**Search ignores the active tab.** A name you half-remember is rarely one you can also place in the
right category, so filtering within a tab would hide the match you were looking for.

### 3. What else could have been used, and why not

| Alternative | Why rejected |
|---|---|
| **Left sidebar palette** (the original plan) | What the skeleton implied and what I first proposed. Replaced after seeing the reference: VectorShift uses a horizontal tab bar, and matching the product being interviewed for is worth more than my layout preference. |
| **`h-screen` on a scrollable body** | The status quo, and the bug. |
| **`100vh` instead of `h-screen`** | Identical here, but `100vh` is wrong on mobile browsers where the toolbar overlays it. Tailwind's `h-screen` keeps the option of `h-dvh` later. |
| **A routing library for the breadcrumb** | The breadcrumb is decorative — there is one screen. A router for a static string would be pure ceremony. |
| **Headless UI / Radix tabs** | Correct answer for a real tab widget with keyboard semantics. Overkill for five buttons that swap an array, and it would pull in a dependency for markup that is already accessible via `aria-current`. |
| **Debounced search** | Nine definitions filtered by `includes`. Debouncing would add latency to a synchronous array filter. |
| **Virtualised tile row** | Nine tiles. |

### 4. Trade-offs accepted

- **The tab list can overflow** on a narrow window. It scrolls horizontally rather than wrapping or
  collapsing into a menu — fine at five categories, would want an overflow menu at fifteen.
- **The displayed node id differs from the real one.** The pill shows `input_1`; the store and every
  edge use `customInput-1`. This matches the reference and reads better, but anyone debugging via
  the DOM should know the pill is a display string, not the identity. It is commented as such.
- **Tabs are buttons, not a roving-tabindex tab widget.** They are keyboard reachable and announce
  their state via `aria-current`, but do not implement full ARIA tab semantics (arrow-key
  navigation, `role="tablist"`). Honest middle ground; a real product should use the full pattern.
- **No responsive breakpoints.** The layout assumes a desktop canvas. A node editor on a phone is a
  different product, not a media query.
- **The empty state is `pointer-events-none` text**, not an interactive hint. It cannot swallow a
  drop, but it also cannot offer a "add your first node" shortcut.

### 5. Known ceilings

- The breadcrumb and pipeline name are static. Renaming a pipeline implies persistence, which the
  brief does not ask for.
- No zoom-to-fit on load, no keyboard shortcuts, no undo. `Backspace` deletes a selection because
  reactflow provides it.
- The minimap is sized in fixed pixels, so it will crowd a short viewport.

### How this was verified

The reported bug, directly:

```
pageScrollsVertically:   false
pageScrollsHorizontally: false
submitVisible:           true   (top: 10, right: 1424 in a 1440×900 viewport)
```

And the registry-derived chrome, by clicking through it:

| Action | Result |
|---|---|
| Default | General tab active → Input, Output, Text, Note |
| Click **LLMs** | → LLM, `aria-current="true"` moves |
| Click **Logic** | → Filter, Condition |
| Search `no` | → Note, found across categories, tab deselected |
| Search `zzz` | → no tiles, *"No nodes match “zzz”."* |

18 tests still pass; the build compiles with no warnings.

Screenshots: `notes/img/step4-empty.png` (empty state), `notes/img/step4-pipeline.png` (populated),
`notes/img/step4-chrome.png` (Logic tab active).

---

## Findings worth keeping

Two build-level discoveries that cost real time and are not obvious from any documentation.

**`react-scripts@5.0.1` supports Tailwind natively, and CRACO breaks it.** The official Tailwind
guide for CRA prescribes CRACO. That guidance is stale for `react-scripts@5.0.1`, whose webpack
config checks for `tailwind.config.js` and injects the `tailwindcss` PostCSS plugin itself
(`webpack.config.js:72,144`). Adding CRACO on top made things *worse*: its `extendsPostcss` sets
`postcssOptions.plugins` to a **function**, and `postcss-loader` only accepts an array — so every
PostCSS plugin was silently dropped and not one line of Tailwind CSS was emitted. No error, no
warning, a compiling build, and a completely unstyled app.

Removing CRACO fixed it. The correct configuration is one dependency and one config file fewer
than the documented one.

**`zustand` must be pinned to v4.** `npm i zustand` resolves to v5. `reactflow@11` requires
`^4.4.1`, so v5 both duplicates zustand in the bundle and breaks the existing
`useStore(selector, shallow)` call in `ui.js` — v5 removed the equality-function argument. Pinned
to `^4.5.7`, which dedupes against reactflow's own copy.

### How this was verified

A Tailwind config that silently no-ops looks *identical* to a working one: the build compiles, the
app renders, nothing errors. So verification was not "does it run" but a computed-style probe in
the browser — a throwaway element carrying `text-accent bg-accent-tint rounded-node shadow-node`,
read back via `getComputedStyle`. First run returned `rgb(0,0,0)` and no radius, which is how the
CRACO fault was caught at all. After removing CRACO it returned `rgb(99,102,241)`,
`rgb(238,242,255)`, `10px`, and the shadow — all four tokens confirmed reaching the DOM. The probe
was then removed.

This is the check worth repeating whenever the build config changes.
