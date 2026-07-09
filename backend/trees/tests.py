from rest_framework.test import APITestCase

from accounts.models import User
from members.models import FamilyMember

from .models import FamilyTree


class OneTreePerAccountTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='owner3@example.com', password='pw12345!')
        self.client.force_authenticate(self.user)

    def test_second_tree_create_is_rejected(self):
        first = self.client.post('/api/v1/trees/', {'name': 'First Tree'})
        self.assertEqual(first.status_code, 201)

        second = self.client.post('/api/v1/trees/', {'name': 'Second Tree'})
        self.assertEqual(second.status_code, 400)
        self.assertEqual(FamilyTree.objects.filter(owner=self.user).count(), 1)


class NonOwnerAccessControlTests(APITestCase):
    """A non-owner may read a public tree and its members, but every write
    (tree edit/delete, member create/edit/delete) must be rejected even via
    direct API calls, regardless of what the frontend does or doesn't show."""

    def setUp(self):
        self.owner = User.objects.create_user(email='owner4@example.com', password='pw12345!')
        self.other = User.objects.create_user(email='other4@example.com', password='pw12345!')
        self.tree = FamilyTree.objects.create(owner=self.owner, name='Public Family', privacy='public')
        self.member = FamilyMember.objects.create(tree=self.tree, full_name='Alice')
        self.client.force_authenticate(self.other)

    def test_non_owner_can_read_public_tree_and_members(self):
        tree_resp = self.client.get(f'/api/v1/trees/{self.tree.id}/')
        self.assertEqual(tree_resp.status_code, 200)

        members_resp = self.client.get(f'/api/v1/trees/{self.tree.id}/members/')
        self.assertEqual(members_resp.status_code, 200)

    def test_non_owner_cannot_edit_or_delete_tree(self):
        patch_resp = self.client.patch(f'/api/v1/trees/{self.tree.id}/', {'name': 'Hijacked'})
        self.assertEqual(patch_resp.status_code, 403)

        delete_resp = self.client.delete(f'/api/v1/trees/{self.tree.id}/')
        self.assertEqual(delete_resp.status_code, 403)
        self.assertTrue(FamilyTree.objects.filter(id=self.tree.id).exists())

    def test_non_owner_cannot_create_or_edit_members(self):
        create_resp = self.client.post(f'/api/v1/trees/{self.tree.id}/members/', {'full_name': 'Intruder'})
        self.assertEqual(create_resp.status_code, 403)

        patch_resp = self.client.patch(
            f'/api/v1/trees/{self.tree.id}/members/{self.member.id}/', {'full_name': 'Renamed'}
        )
        self.assertEqual(patch_resp.status_code, 403)

        delete_resp = self.client.delete(f'/api/v1/trees/{self.tree.id}/members/{self.member.id}/')
        self.assertEqual(delete_resp.status_code, 403)
        self.assertTrue(FamilyMember.objects.filter(id=self.member.id).exists())

    def test_non_owner_cannot_see_private_tree(self):
        private_owner = User.objects.create_user(email='private-owner4@example.com', password='pw12345!')
        private_tree = FamilyTree.objects.create(owner=private_owner, name='Secret', privacy='private')
        resp = self.client.get(f'/api/v1/trees/{private_tree.id}/')
        self.assertEqual(resp.status_code, 404)
