from rest_framework import permissions, viewsets

from .models import FamilyMember
from .permissions import IsTreeOwnerForWrite, get_accessible_tree
from .serializers import FamilyMemberSerializer


class FamilyMemberViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyMemberSerializer
    permission_classes = (permissions.IsAuthenticated, IsTreeOwnerForWrite)

    def get_queryset(self):
        get_accessible_tree(self.request, self.kwargs['tree_id'])
        return FamilyMember.objects.filter(tree_id=self.kwargs['tree_id'])

    def perform_create(self, serializer):
        tree = get_accessible_tree(self.request, self.kwargs['tree_id'])
        serializer.save(tree=tree)
