"""Relationship engine: derives extended family relations (sibling, grandparent,
uncle/aunt, cousin, step-relations, ...) from the small set of base-fact edges
(parent/child, spouse) stored in the Relationship model, via graph traversal.
"""
from collections import defaultdict, deque

from .models import Relationship

_DESCENDANT_LABELS = {1: 'child', 2: 'grandchild'}
_ANCESTOR_LABELS = {1: 'parent', 2: 'grandparent'}
_ORDINALS = {1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth'}


def build_graph(tree):
    """Returns (parents_of, children_of, spouses_of, siblings_of) adjacency maps for a tree."""
    parents_of = defaultdict(set)
    children_of = defaultdict(set)
    spouses_of = defaultdict(set)  # member_id -> set of (spouse_id, status)
    siblings_of = defaultdict(set)  # member_id -> set of member_id, from direct SIBLING edges

    for rel in tree.relationships.all():
        if rel.kind == Relationship.Kind.PARENT_CHILD:
            parents_of[rel.to_member_id].add(rel.from_member_id)
            children_of[rel.from_member_id].add(rel.to_member_id)
        elif rel.kind == Relationship.Kind.SPOUSE:
            spouses_of[rel.from_member_id].add((rel.to_member_id, rel.spouse_status))
            spouses_of[rel.to_member_id].add((rel.from_member_id, rel.spouse_status))
        elif rel.kind == Relationship.Kind.SIBLING:
            siblings_of[rel.from_member_id].add(rel.to_member_id)
            siblings_of[rel.to_member_id].add(rel.from_member_id)

    return parents_of, children_of, spouses_of, siblings_of


def _ancestors_with_distance(member_id, parents_of):
    """BFS up the parent graph. Returns {ancestor_or_self_id: distance}, self at 0."""
    distances = {member_id: 0}
    queue = deque([member_id])
    while queue:
        current = queue.popleft()
        for parent_id in parents_of.get(current, ()):
            if parent_id not in distances:
                distances[parent_id] = distances[current] + 1
                queue.append(parent_id)
    return distances


def _ordinal(n):
    return _ORDINALS.get(n, f'{n}th')


def _label_for_distances(da, db, shared_parent_count=None):
    if da == 0 and db == 0:
        return 'self'
    if da == 0:
        if db in _DESCENDANT_LABELS:
            return _DESCENDANT_LABELS[db]
        return f'{"great-" * (db - 2)}grandchild'
    if db == 0:
        if da in _ANCESTOR_LABELS:
            return _ANCESTOR_LABELS[da]
        return f'{"great-" * (da - 2)}grandparent'
    if da == 1 and db == 1:
        return 'sibling' if (shared_parent_count or 0) >= 2 else 'half-sibling'
    if da == 1 and db == 2:
        return 'niece/nephew'
    if da == 2 and db == 1:
        return 'aunt/uncle'
    if da == db:
        return f'{_ordinal(da - 1)} cousin'
    degree = min(da, db) - 1
    removed = abs(da - db)
    return f'{_ordinal(degree)} cousin, {removed}x removed'


def compute_relationship(a_id, b_id, parents_of, spouses_of, siblings_of=None):
    """Returns a human-readable relationship label describing b relative to a,
    or None if no relation can be established from current data."""
    if a_id == b_id:
        return 'self'

    spouse_entries = {sid: status for sid, status in spouses_of.get(a_id, ())}
    if b_id in spouse_entries:
        status = spouse_entries[b_id]
        return 'spouse' if status == Relationship.SpouseStatus.CURRENT else f'spouse ({status})'

    # A direct sibling edge (used when shared parents aren't recorded) takes
    # priority over the shared-parents computation below, which wouldn't
    # find anything in common for these two anyway.
    if siblings_of and b_id in siblings_of.get(a_id, ()):
        return 'sibling'

    ancestors_a = _ancestors_with_distance(a_id, parents_of)
    ancestors_b = _ancestors_with_distance(b_id, parents_of)
    common = set(ancestors_a) & set(ancestors_b)

    if not common:
        a_parents = parents_of.get(a_id, set())
        b_parents = parents_of.get(b_id, set())
        if any(b_id in {sid for sid, _ in spouses_of.get(p, ())} for p in a_parents):
            return 'step-parent'
        if any(a_id in {sid for sid, _ in spouses_of.get(p, ())} for p in b_parents):
            return 'step-child'
        return None

    best = min(common, key=lambda c: ancestors_a[c] + ancestors_b[c])
    da, db = ancestors_a[best], ancestors_b[best]
    shared_count = None
    if da == 1 and db == 1:
        shared_count = len(parents_of.get(a_id, set()) & parents_of.get(b_id, set()))
    return _label_for_distances(da, db, shared_count)


def find_relationship_path(a_id, b_id, parents_of, children_of, spouses_of, siblings_of=None):
    """BFS over the undirected family graph (parent/child/spouse/sibling edges)
    to find the shortest connecting path between two members, for UI
    highlighting."""
    if a_id == b_id:
        return [a_id]

    adjacency = defaultdict(set)
    for child_id, parent_ids in parents_of.items():
        for parent_id in parent_ids:
            adjacency[child_id].add(parent_id)
            adjacency[parent_id].add(child_id)
    for member_id, spouses in spouses_of.items():
        for spouse_id, _status in spouses:
            adjacency[member_id].add(spouse_id)
    for member_id, siblings in (siblings_of or {}).items():
        for sibling_id in siblings:
            adjacency[member_id].add(sibling_id)

    visited = {a_id}
    queue = deque([[a_id]])
    while queue:
        path = queue.popleft()
        current = path[-1]
        for neighbor in adjacency.get(current, ()):
            if neighbor in visited:
                continue
            new_path = path + [neighbor]
            if neighbor == b_id:
                return new_path
            visited.add(neighbor)
            queue.append(new_path)
    return None


def relationship_label_for_member(tree, member_id, other_id):
    parents_of, _children_of, spouses_of, siblings_of = build_graph(tree)
    return compute_relationship(member_id, other_id, parents_of, spouses_of, siblings_of)
