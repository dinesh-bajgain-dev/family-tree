from django.db.models import Q
from rest_framework import permissions, viewsets

from .models import FamilyTree
from .permissions import IsOwnerOrReadOnlyIfPublic
from .serializers import FamilyTreeSerializer


class FamilyTreeViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyTreeSerializer
    permission_classes = (permissions.IsAuthenticated, IsOwnerOrReadOnlyIfPublic)

    def get_queryset(self):
        user = self.request.user
        return FamilyTree.objects.filter(
            Q(owner=user) | ~Q(privacy=FamilyTree.Privacy.PRIVATE)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
