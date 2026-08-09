# Part 4 — Backend Integration

**Status: complete.** Build a pipeline, hit Submit, get node and edge counts plus a DAG verdict in
a styled dialog. The graph check runs entirely on the backend.

---

## 1. What was built

```
backend/main.py           POST /pipelines/parse, CORS, Kahn's algorithm
backend/test_main.py      10 graph tests, runnable with or without pytest
backend/requirements.txt  new — the app could not be installed from the repo before

frontend/src/lib/api.js                  the only module that knows the backend URL
frontend/src/components/ResultDialog.js  presentation for all four states
frontend/src/submit.js                   owns the request lifecycle
```

### Backend

The shipped endpoint **could not import at all** — `Form(...)` requires `python-multipart`, which
was not declared anywhere, and `GET` + `Form` is not a valid combination regardless. It is now a
`POST` taking a JSON body.

```python
@app.post('/pipelines/parse')
def parse_pipeline(pipeline: Pipeline):
    return {
        'num_nodes': len(pipeline.nodes),
        'num_edges': len(pipeline.edges),
        'is_dag': is_dag(node_ids, edges),
    }
```

`is_dag` is **Kahn's algorithm**: repeatedly remove a node with no remaining incoming edges. In an
acyclic graph every node eventually qualifies, so if fewer come out than went in, the ones left are
holding each other up — a cycle. Self-loops fall out of the same rule without a special case: the
node's own edge keeps its in-degree above zero, so it is never removed.

`CORSMiddleware` allows **both** `localhost:3000` and `:3001`, because CRA takes whichever port is
free on the reviewer's machine.

### Frontend

Three files with one job each:

- **`lib/api.js`** — builds the request, and is the only place the backend URL appears
  (`REACT_APP_API_URL`, defaulting to `http://127.0.0.1:8000`).
- **`components/ResultDialog.js`** — renders `idle | loading | error | success`. Owns no state.
- **`submit.js`** — holds the lifecycle state and calls the API.

The dialog reads the store with `useStore.getState()` **at submit time** rather than subscribing,
so the submit button does not re-render while nodes are being dragged around.

---

## 2. Why it was built this way

**The DAG check lives on the backend, and only there.** The brief puts it there, but it is also the
right place: the endpoint is the authority on whether a pipeline is valid, and duplicating the
check on the frontend would create two answers that can disagree. There is no graph logic in the
React app at all.

**`is_dag` takes primitives, not pydantic models.** Its signature is `(set[str], list[tuple])`,
which means the tests exercise the algorithm without constructing request bodies, and the algorithm
does not know it is being served over HTTP.

**Kahn's rather than DFS colouring.** Both are correct and O(V+E). Kahn's wins on the failure mode:
its answer is a *count*, so "fewer nodes came out than went in" is the whole test — no recursion, no
stack depth limit on a large pipeline, and no three-state colour bookkeeping to get subtly wrong.
It also generalises for free: the nodes never removed *are* the cycle, if we ever want to highlight
them on the canvas.

**Unknown edge endpoints are ignored, not rejected.** An edge referencing a node that is not in the
payload is skipped rather than raising a 422. A stale edge should not fail the whole request when
the question being asked — is this shape acyclic — still has a sensible answer.

**The "alert" is a dialog.** `window.alert` cannot show three values legibly, cannot show a loading
state, cannot be styled, and blocks the main thread. The brief says "user-friendly", which is a
design instruction; `window.alert` is the literal reading that loses the point.

**The error message names the URL and asks the obvious question.** `Failed to fetch` — what the
browser actually throws — tells the user nothing. `fetch` only rejects when the request never
completed, so that case is caught specifically and rewritten as
*"Could not reach the backend at http://127.0.0.1:8000. Is it running?"* This matters for a
submission a stranger will run: the most likely failure is that they started only the frontend.

**Node fields being store-backed (from Part 1) is what makes the payload real.** The original nodes
kept values in local `useState` and never wrote to the store, so this endpoint would have received
nodes with empty `data`. That fix was made in Part 1 as an architecture decision, and this is where
it pays off.

---

## 3. What else could have been used, and why not

| Alternative | Why rejected |
|---|---|
| **DFS with white/grey/black colouring** | Equally correct. Rejected for recursion depth on long pipelines and a fiddlier failure mode — see above. |
| **`networkx.is_directed_acyclic_graph()`** | One line, and a whole graph library added to a service that needs exactly one 20-line function. The algorithm is also the most interesting thing in the backend; importing it away would be hiding the part worth discussing. |
| **Frontend-side DAG check** (before or instead of the request) | Faster feedback and works offline, but creates a second source of truth that can disagree with the server. If instant feedback were wanted, the right shape is the server staying authoritative and the client hinting — not the client deciding. |
| **`window.alert`** | The literal reading of the brief. Cannot show a loading state or style three values, and blocks the thread. |
| **A toast instead of a modal** | Less intrusive and a reasonable choice. Rejected because the result is exactly what the user asked for by clicking Submit — it deserves focus, not a corner. A toast also gives nowhere sensible to put the DAG explanation. |
| **React Query / SWR** | Would give loading and error states, retries and caching for free. Rejected as a dependency for **one** non-cacheable request that must not be deduplicated or retried silently. |
| **A global store slice for submit state** | The state has exactly one consumer. `useState` in `submit.js` is the correct scope; putting it in zustand would make it look shared when it is not. |
| **`useStore(state => state.nodes)` in the button** | Would re-render the submit button on every node drag to produce data that is only read on click. `getState()` at call time is both cheaper and more honest about when the data is needed. |
| **Pydantic models mirroring the full reactflow node** | Brittle and pointless — the endpoint needs `id`, `source`, `target`. Extra fields are dropped, so the API does not break when the canvas adds a field. |

---

## 4. Trade-offs accepted

- **The whole reactflow node is posted**, including position, dimensions and all field data. Larger
  than necessary for a payload that only needs ids, but it is what "send the nodes and edges" means,
  and it keeps the door open for the endpoint to do more later without a frontend change.
- **No request cancellation.** Clicking Submit twice quickly fires two requests; the second result
  wins. The button disables during flight, which covers it in practice. An `AbortController` would
  be correct if this became a real product.
- **Errors are shown as a message, not retried.** No retry button, no backoff. Deliberate: the
  failure is nearly always "the backend is not running", which a retry will not fix.
- **`allow_methods=['*']` and `allow_headers=['*']`** are broader than the endpoint needs. Fine for
  a local dev service; a real deployment should name `POST` and `content-type`, and the origins
  should come from configuration rather than a literal list.
- **The connection-failure path takes a few seconds** to surface, because it waits on the OS TCP
  timeout. The loading state covers it, but a `signal: AbortSignal.timeout(5000)` would make it
  crisper.

---

## 5. Known ceilings

- **No cycle localisation.** The response says a cycle exists, not where. Kahn's already knows —
  the nodes it never removed are exactly the ones in cycles — so returning those ids and
  highlighting them on the canvas is a genuinely small change. This is the most valuable next step
  in the backend.
- **No validation beyond the DAG check.** Disconnected nodes, required-but-empty fields, and nodes
  with no path to an Output are all accepted silently.
- **No persistence.** The endpoint computes and forgets; nothing is stored, and there is no pipeline
  id. Correct for the brief.
- **`requirements.txt` uses floors, not pins.** Reproducible enough to install, not enough to
  guarantee identical versions. A lockfile would be right for a deployed service.
- **The backend has no logging** and returns no request id, so a failure in someone else's
  environment is diagnosed by reading the uvicorn console.

---

## How this was verified

**Backend, directly.** 10 tests on `is_dag` covering the cases that break naive implementations:

- a **diamond** (`a→b→d`, `a→c→d`) is acyclic despite two paths reaching the same node — a naive
  "have I seen this node" check calls this a cycle
- a **self-loop** is not a DAG
- a **cycle in one component** is not masked by an acyclic component elsewhere
- **parallel edges** between the same pair decrement in-degree correctly
- edges to **unknown nodes** are ignored

Then against the running server:

```
chain a→b→c            {"num_nodes":3,"num_edges":2,"is_dag":true}
cycle a→b→a            {"num_nodes":2,"num_edges":2,"is_dag":false}
empty                  {"num_nodes":0,"num_edges":0,"is_dag":true}
full reactflow node    {"num_nodes":1,"num_edges":0,"is_dag":true}   ← extra fields ignored
CORS preflight :3001   200, access-control-allow-origin: http://localhost:3001
```

**End to end in the browser**, all four dialog states:

| Scenario | Result |
|---|---|
| Input → Text | `2 NODES · 1 EDGES` · *is a DAG* |
| Two LLMs wired into each other | `2 NODES · 2 EDGES` · *is not a DAG* |
| Backend stopped | *"Could not reach the backend at http://127.0.0.1:8000. Is it running?"* |
| In flight | *"Parsing pipeline…"*, Submit disabled |

Screenshots: `notes/img/part4-dag.png`, `notes/img/part4-cycle.png`.

18 frontend tests and 10 backend tests pass.

### One note on the harness

The first attempt to build a cycle failed silently — both connections reported success but no edge
appeared. The cause was the test driver, not the app: the LLM node's output handle sat at y=947 in a
900px viewport, so `elementFromPoint` returned null and the drag never started. It reproduced
because the current vertical palette pushes the canvas below the fold — which is itself a real
finding, and exactly what Step 4's horizontal tab chrome fixes.
