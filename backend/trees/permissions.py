from rest_framework import permissions


class IsOwnerOrReadOnlyIfPublic(permissions.BasePermission):
    """Owner has full access. Non-owners may only read public/family-only trees."""

    def has_object_permission(self, request, view, obj):
        if obj.owner_id == request.user.id:
            return True
        if request.method in permissions.SAFE_METHODS:
            return obj.privacy != obj.Privacy.PRIVATE
        return False
