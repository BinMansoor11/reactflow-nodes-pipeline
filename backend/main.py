from collections import deque

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title='VectorShift Pipeline API')

# The CRA dev server takes whichever port is free, so allow both. Without this
# every request fails at the preflight, before it ever reaches a handler.
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://localhost:3001'],
    allow_methods=['*'],
    allow_headers=['*'],
)


# The frontend posts whole reactflow nodes and edges. Only these fields matter
# here; pydantic drops the rest, so the graph check does not depend on the
# canvas's shape.
class Node(BaseModel):
    id: str


class Edge(BaseModel):
    source: str
    target: str


class Pipeline(BaseModel):
    nodes: list[Node] = []
    edges: list[Edge] = []


def is_dag(node_ids: set[str], edges: list[tuple[str, str]]) -> bool:
    """Kahn's algorithm.

    Repeatedly remove a node with no remaining incoming edges. Every node in an
    acyclic graph eventually qualifies, so if fewer nodes come out than went in,
    the ones left behind are holding each other up — a cycle.

    A self-loop is caught by the same rule: the node's own edge keeps its
    in-degree above zero, so it is never removed.
    """
    indegree = {node_id: 0 for node_id in node_ids}
    successors = {node_id: [] for node_id in node_ids}

    for source, target in edges:
        # Ignore edges pointing at nodes that are not in the pipeline rather
        # than raising: a stale edge should not fail the whole request.
        if source in node_ids and target in node_ids:
            successors[source].append(target)
            indegree[target] += 1

    queue = deque(node_id for node_id in node_ids if indegree[node_id] == 0)
    removed = 0

    while queue:
        node_id = queue.popleft()
        removed += 1

        for successor in successors[node_id]:
            indegree[successor] -= 1
            if indegree[successor] == 0:
                queue.append(successor)

    return removed == len(node_ids)


@app.get('/')
def read_root():
    return {'Ping': 'Pong'}


@app.post('/pipelines/parse')
def parse_pipeline(pipeline: Pipeline):
    node_ids = {node.id for node in pipeline.nodes}
    edges = [(edge.source, edge.target) for edge in pipeline.edges]

    return {
        'num_nodes': len(pipeline.nodes),
        'num_edges': len(pipeline.edges),
        'is_dag': is_dag(node_ids, edges),
    }
