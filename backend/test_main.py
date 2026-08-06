"""Covers the graph check. Run with `python test_main.py` or `pytest`.

The counting in /pipelines/parse is a len() call; the cycle detection is the
part that can be wrong, so that is what is tested.
"""

from main import is_dag


def test_empty_pipeline_is_a_dag():
    assert is_dag(set(), []) is True


def test_nodes_with_no_edges():
    assert is_dag({'a', 'b', 'c'}, []) is True


def test_simple_chain():
    assert is_dag({'a', 'b', 'c'}, [('a', 'b'), ('b', 'c')]) is True


def test_diamond_is_acyclic_despite_the_join():
    # a -> b -> d, a -> c -> d. Two paths to the same node is not a cycle,
    # which a naive "have I seen this node" check would get wrong.
    edges = [('a', 'b'), ('a', 'c'), ('b', 'd'), ('c', 'd')]
    assert is_dag({'a', 'b', 'c', 'd'}, edges) is True


def test_two_node_cycle():
    assert is_dag({'a', 'b'}, [('a', 'b'), ('b', 'a')]) is False


def test_longer_cycle():
    edges = [('a', 'b'), ('b', 'c'), ('c', 'a')]
    assert is_dag({'a', 'b', 'c'}, edges) is False


def test_self_loop():
    assert is_dag({'a'}, [('a', 'a')]) is False


def test_cycle_in_one_component_only():
    # An acyclic part must not mask a cycle elsewhere in the graph.
    edges = [('a', 'b'), ('c', 'd'), ('d', 'c')]
    assert is_dag({'a', 'b', 'c', 'd'}, edges) is False


def test_edges_to_unknown_nodes_are_ignored():
    assert is_dag({'a', 'b'}, [('a', 'b'), ('b', 'ghost')]) is True


def test_parallel_edges_between_the_same_pair():
    # Two edges a->b raise b's in-degree to 2; both must be decremented.
    assert is_dag({'a', 'b'}, [('a', 'b'), ('a', 'b')]) is True


if __name__ == '__main__':
    tests = [value for name, value in sorted(globals().items()) if name.startswith('test_')]

    for test in tests:
        test()
        print(f'ok  {test.__name__}')

    print(f'\n{len(tests)} passed')
