from django.test import TestCase
from rest_framework.test import APITestCase

from accounts.models import User
from members.models import FamilyMember
from trees.models import FamilyTree

from .models import Relationship
from .services import build_graph, compute_relationship, find_relationship_path


class RelationshipEngineTests(TestCase):
    """Builds a small multi-generation tree and asserts the graph-traversal
    service derives the correct extended relationships without them ever
    being stored directly."""

    def setUp(self):
        self.owner = User.objects.create_user(email='owner@example.com', password='pw12345!')
        self.tree = FamilyTree.objects.create(owner=self.owner, name='Test Family')

        def make(name):
            return FamilyMember.objects.create(tree=self.tree, full_name=name)

        # Grandparents
        self.grandpa = make('Grandpa')
        self.grandma = make('Grandma')
        # Parents generation: two siblings (children of grandpa/grandma), one married in
        self.dad = make('Dad')
        self.aunt = make('Aunt')
        self.mom = make('Mom')  # married to Dad, not a blood relative
        # Children generation
        self.me = make('Me')
        self.sibling = make('Sibling')
        self.cousin = make('Cousin')  # child of Aunt

        def link_parent_child(parent, child):
            Relationship.objects.create(
                tree=self.tree, kind=Relationship.Kind.PARENT_CHILD,
                from_member=parent, to_member=child,
                parent_link_type=Relationship.ParentLinkType.BIOLOGICAL,
            )

        def link_spouse(a, b, status=Relationship.SpouseStatus.CURRENT):
            Relationship.objects.create(
                tree=self.tree, kind=Relationship.Kind.SPOUSE,
                from_member=a, to_member=b, spouse_status=status,
            )

        link_parent_child(self.grandpa, self.dad)
        link_parent_child(self.grandma, self.dad)
        link_parent_child(self.grandpa, self.aunt)
        link_parent_child(self.grandma, self.aunt)
        link_spouse(self.grandpa, self.grandma)
        link_spouse(self.dad, self.mom)
        link_parent_child(self.dad, self.me)
        link_parent_child(self.mom, self.me)
        link_parent_child(self.dad, self.sibling)
        link_parent_child(self.mom, self.sibling)
        link_parent_child(self.aunt, self.cousin)

        self.parents_of, self.children_of, self.spouses_of = build_graph(self.tree)

    def relation(self, a, b):
        return compute_relationship(a.id, b.id, self.parents_of, self.spouses_of)

    def test_direct_parent_and_child(self):
        self.assertEqual(self.relation(self.me, self.dad), 'parent')
        self.assertEqual(self.relation(self.dad, self.me), 'child')

    def test_spouse(self):
        self.assertEqual(self.relation(self.dad, self.mom), 'spouse')

    def test_full_siblings(self):
        self.assertEqual(self.relation(self.me, self.sibling), 'sibling')

    def test_grandparent_and_grandchild(self):
        self.assertEqual(self.relation(self.me, self.grandpa), 'grandparent')
        self.assertEqual(self.relation(self.grandpa, self.me), 'grandchild')

    def test_aunt_uncle_and_niece_nephew(self):
        self.assertEqual(self.relation(self.me, self.aunt), 'aunt/uncle')
        self.assertEqual(self.relation(self.aunt, self.me), 'niece/nephew')

    def test_first_cousin(self):
        self.assertEqual(self.relation(self.me, self.cousin), 'first cousin')

    def test_step_relationship(self):
        # Mom's parents aren't in the graph at all; Dad's spouse is Mom, so from
        # a hypothetical unlinked "Mom's other child" perspective, step logic
        # applies when there's no shared ancestor but a parent is a spouse.
        stepchild = FamilyMember.objects.create(tree=self.tree, full_name='Stepchild')
        Relationship.objects.create(
            tree=self.tree, kind=Relationship.Kind.PARENT_CHILD,
            from_member=self.mom, to_member=stepchild,
            parent_link_type=Relationship.ParentLinkType.BIOLOGICAL,
        )
        parents_of, children_of, spouses_of = build_graph(self.tree)
        self.assertEqual(
            compute_relationship(stepchild.id, self.dad.id, parents_of, spouses_of),
            'step-parent',
        )
        self.assertEqual(
            compute_relationship(self.dad.id, stepchild.id, parents_of, spouses_of),
            'step-child',
        )

    def test_unrelated_returns_none(self):
        stranger = FamilyMember.objects.create(tree=self.tree, full_name='Stranger')
        self.assertIsNone(self.relation(self.me, stranger))

    def test_relationship_path_between_cousins(self):
        path = find_relationship_path(
            self.me.id, self.cousin.id, self.parents_of, self.children_of, self.spouses_of
        )
        # Me -> Dad -> Grandpa -> Aunt -> Cousin (or via Grandma), length 5
        self.assertIsNotNone(path)
        self.assertEqual(path[0], self.me.id)
        self.assertEqual(path[-1], self.cousin.id)
        self.assertEqual(len(path), 5)


class RelationshipDuplicatePreventionTests(APITestCase):
    """A relationship between two members should only be linkable once,
    regardless of which member the request is made from (from/to order
    reversed) — otherwise both profiles show the other person twice."""

    def setUp(self):
        self.user = User.objects.create_user(email='owner2@example.com', password='pw12345!')
        self.client.force_authenticate(self.user)
        self.tree = FamilyTree.objects.create(owner=self.user, name='Dup Test Family')
        self.alice = FamilyMember.objects.create(tree=self.tree, full_name='Alice')
        self.bob = FamilyMember.objects.create(tree=self.tree, full_name='Bob')
        self.url = f'/api/v1/trees/{self.tree.id}/relationships/'

    def test_reverse_direction_duplicate_is_rejected(self):
        first = self.client.post(
            self.url,
            {'kind': 'spouse', 'from_member': self.alice.id, 'to_member': self.bob.id, 'spouse_status': 'current'},
        )
        self.assertEqual(first.status_code, 201)

        reversed_duplicate = self.client.post(
            self.url,
            {'kind': 'spouse', 'from_member': self.bob.id, 'to_member': self.alice.id, 'spouse_status': 'current'},
        )
        self.assertEqual(reversed_duplicate.status_code, 400)
        self.assertEqual(Relationship.objects.filter(kind='spouse').count(), 1)
