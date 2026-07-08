from django.shortcuts import get_object_or_404
from rest_framework import permissions

from trees.models import FamilyTree


def get_accessible_tree(request, tree_id):
    """Return the FamilyTree for tree_id if the user may view it, else raise 404."""
    tree = get_object_or_404(FamilyTree, pk=tree_id)
    if tree.owner_id == request.user.id or tree.privacy != FamilyTree.Privacy.PRIVATE:
        return tree
    from django.http import Http404
    raise Http404


class IsTreeOwnerForWrite(permissions.BasePermission):
    """Read access follows tree privacy (handled by get_accessible_tree); writes require ownership."""

    def has_permission(self, request, view):
        tree = get_accessible_tree(request, view.kwargs['tree_id'])
        if request.method in permissions.SAFE_METHODS:
            return True
        return tree.owner_id == request.user.id
