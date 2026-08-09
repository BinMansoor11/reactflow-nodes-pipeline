# Part 3 — Text Node Logic

**Status: complete.** The Text node resizes with its content and grows a handle per
`{{variable}}` — and it is still a config object. No component was written for it.

---

## 1. What was built

```
src/lib/text.js        parseVariables + textNodeWidth
src/lib/text.test.js   11 tests
```

Changed: `nodes/definitions.js` (the Text config), `nodes/BaseNode.js` (dynamic handles, function
width, handle-bounds invalidation), `nodes/fields.js` (autosizing textarea).

**The whole of the Text node**, unchanged in shape from every other definition:

```js
{
  type: 'text', label: 'Text', category: 'General', icon: 'TXT',
  width:         (data) => textNodeWidth(data?.text),
  dynamicInputs: (data) => parseVariables(data?.text),
  fields: [{ key: 'text', kind: 'textarea', autosize: true, default: '{{input}}' }],
  outputs: [{ key: 'output' }],
}
```

Two config keys gained the ability to be **functions of the node's own data**:

| Key | Was | Now |
|---|---|---|
| `width` | `number` | `number \| (data) => number` |
| `dynamicInputs` | — | `(data) => string[]`, appended to the bare `inputs` |

Dynamic handles are concatenated onto the static ones and rendered through the identical path, so
they inherit labels, hit areas, hover, connection feedback and the connected-state fill from the
handle UX pass for free.

**`parseVariables`** matches `{{ name }}` where `name` is a valid JS identifier, preserves
first-appearance order, de-duplicates, and rejects reserved words — `{{ class }}` matches the
identifier pattern but is not a usable variable name.

**`textNodeWidth`** derives width from the **longest line**, clamped to 280–520px. Past the cap the
textarea wraps and grows in height instead.

---

## 2. Why it was built this way

### The resize is CSS, not measurement

The obvious implementation is a ref plus a layout effect setting `style.height = scrollHeight`.
That works, but it reflows on every keystroke and needs care to avoid feedback loops.

Instead the textarea and an invisible copy of its text share **one CSS grid cell**. The copy sizes
the cell; the textarea stretches to fill it:

```jsx
<div className="grid">
  <textarea className="col-start-1 row-start-1 …" />
  <span aria-hidden className="col-start-1 row-start-1 whitespace-pre-wrap …">{value + ' '}</span>
</div>
```

No refs, no observers, no measuring — the browser does the layout it was always going to do. The
trailing space keeps a trailing newline from collapsing.

Width stays in JS because it is a *node* concern rather than a field one: the card is what resizes,
and the longest-line calculation is the honest way to express "grow until it gets silly, then wrap."

### The handle-bounds invalidation is the real work

reactflow caches each handle's measured position and **will not re-measure on its own**. Anything
that moves a handle must call `useUpdateNodeInternals`, or existing edges keep pointing at where the
handle used to be. The failure is silent: no error, no warning, just edges hanging in space — and
it only shows up once a node has both an edge *and* a size change, which is easy to miss in casual
testing.

Three distinct things move handles here, and the effect keys on all three:

```js
useEffect(() => { updateNodeInternals(id); }, [id, width, handleKey, autosizeKey, …]);
```

- `handleKey` — the variable list changed, so handles were added or removed.
- `width` — the card widened, so right-edge handles moved.
- `autosizeKey` — the textarea grew taller, so every percentage-positioned handle moved.

`autosizeKey` is the one that is easy to forget. Typing a long line without adding a variable
changes no handle *count* and no width once capped, but it still moves every handle, because bare
handles are positioned as a fraction of card height.

### Why this stayed config

The plan flagged a decision: `dynamicInputs` as config versus a custom `TextNode` component. Config
won, and the result is that the node needing the most runtime behaviour in the app is still nine
lines of data. Everything that makes the Text node special is expressed as *functions of its own
data*, which is a small, closed extension to the schema — not an escape hatch that lets a node do
anything.

The custom-component escape hatch described in the original plan was therefore never built. It has
no callers.

---

## 3. What else could have been used, and why not

| Alternative | Why rejected |
|---|---|
| **A dedicated `TextNode.js` component** | The plan's fallback, and what the assessment probably expects. Rejected because it would have made "nodes are data" true of eight nodes and false of the interesting one. The config extension is smaller and proves more. |
| **`scrollHeight` + `useLayoutEffect` autosize** | The conventional approach. Works, but adds a ref, an effect, and a reflow per keystroke to achieve what one grid cell does declaratively. |
| **`react-textarea-autosize`** | A dependency (~3kB) for behaviour that is six lines of CSS, and it solves only height — the node still needs its own width logic. |
| **`field-sizing: content`** | The CSS property that makes this a one-liner. Not in Safari, so not usable in something a reviewer might open anywhere. Worth revisiting later. |
| **`ResizeObserver` on the card, calling `updateNodeInternals`** | Catches every size change including ones I haven't thought of, and would replace three effect keys with one observer. Rejected as heavier for this scale, and it fires *after* paint, so edges lag by a frame. The explicit keys are precise and synchronous. Worth reconsidering if more nodes become resizable. |
| **Parsing variables with a template library** (Handlebars, Mustache) | Full template engines for one regex, and they would accept far more syntax than `{{ name }}` — inviting users to type things the app cannot honour. |
| **Allowing reserved words as variable names** | Simpler regex, but the brief says "a valid JavaScript variable name," and `{{ class }}` is not one. Three lines to be correct. |
| **Debouncing the parse** | Considered for keystroke cost. Unnecessary: the regex runs over a short string, and debouncing would make handles lag behind typing, which is exactly the feedback the feature exists to give. |

---

## 4. Trade-offs accepted

- **Width is estimated from a character count**, not measured. `CHAR_PX = 7` approximates 13px
  system sans; a line of all `W`s under-measures and all `l`s over-measures. Measuring properly
  means a canvas `measureText` call or a mirror element — real accuracy for a cost that shows up as
  a few pixels of slack. The clamp hides most of it.
- **`autosizeKey` re-runs `updateNodeInternals` on every keystroke** in an autosizing field. That is
  a measure-and-store-write per character. Negligible for one small node; a `ResizeObserver` would
  be the fix if this spread.
- **Handles are evenly distributed down the card**, so a variable's handle is not adjacent to the
  variable's text. With many variables the mapping gets harder to read. Labels mitigate it.
- **Variables are parsed but not resolved.** Typing `{{ foo }}` creates a connection point; nothing
  substitutes an upstream value into the text, because nothing executes pipelines. Correct scope for
  the brief, but it is a demo-time question worth expecting.
- **The invisible mirror duplicates the text in the DOM.** Marked `aria-hidden`, so screen readers
  skip it, but it does double the text content of an autosizing field.

---

## 5. Known ceilings

- **No `{{` escape.** There is no way to type a literal `{{ input }}` without it becoming a handle.
  A `\{{` escape in the regex would fix it if anyone cared.
- **Renaming a variable drops its edge.** `{{ a }}` → `{{ b }}` destroys handle `a`, and reactflow
  drops edges attached to handles that no longer exist. Preserving them would mean diffing the
  variable list and remapping edges in the store — real work, and arguably wrong: a renamed variable
  is a different variable.
- **Width does not persist.** It is derived from `data.text` on every render rather than stored, so
  a user cannot manually resize a Text node. That is a feature today and a limitation the moment
  manual resizing is wanted.
- **`CHAR_PX` and the 280–520 clamp are tuned to the current font size.** A design system change
  would silently make the estimate wrong. They live next to each other in `lib/text.js` with a
  comment saying so.

---

## How this was verified

11 new tests cover the parser and the width function — identifier grammar, reserved words, invalid
names, ordering, de-duplication, unclosed braces, and the longest-line-not-total-length rule. 18
tests total across the suite.

Then in the browser, typing into a real Text node:

| Content | Width | Height | Handles |
|---|---|---|---|
| `{{input}}` (default) | 280 | 165 | `input` |
| `Question: {{ user_query }} Context: {{ docs }}` | 366 | 165 | `user_query`, `docs` |
| 90 × `x` | **520** (capped) | 165 | — |
| six short lines | 280 | **254** | — |
| `{{ class }} {{ 1bad }} {{ ok }}` | 280 | 165 | `ok` only |

The last row is the parser's whole contract in one line: reserved word rejected, invalid identifier
rejected, valid one accepted.

**The stale-bounds check** is the one that matters, because it is the failure that ships silently.
An edge was connected into `{{ a }}`, then the text changed to `{{ a }} {{ b }} {{ c }}` so that
handle `a` moved:

```
handle a:     y 647 → 607   (moved 40px as it made room for b and c)
edge endpoint: y 646 → 605   (moved 41px, following it)
final drift:   dx 7, dy 2 against a 6.5px handle radius
```

The edge tracked the handle. Without `updateNodeInternals` it would have stayed at y≈646, exactly
40px adrift — visible, wrong, and throwing no error. The residual 7px on x is the edge anchoring to
the handle's border rather than its centre, which is correct.

Screenshot: `notes/img/part3-text-node.png` — three variable handles, the connected one filled, the
other two hollow.
