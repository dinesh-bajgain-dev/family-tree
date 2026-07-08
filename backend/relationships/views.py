import uuid

from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from members.models import FamilyMember
from members.permissions import IsTreeOwnerForWrite, get_accessible_tree
from members.serializers import FamilyMemberSerializer

from .models import Relationship
from .serializers import RelationshipSerializer
from .services import build_graph, compute_relationship, find_relationship_path


class RelationshipViewSet(viewsets.ModelViewSet):
    serializer_class = RelationshipSerializer
    permission_classes = (permissions.IsAuthenticated, IsTreeOwnerForWrite)

    def get_queryset(self):
        get_accessible_tree(self.request, self.kwargs['tree_id'])
        return Relationship.objects.filter(tree_id=self.kwargs['tree_id'])

    def perform_create(self, serializer):
        tree = get_accessible_tree(self.request, self.kwargs['tree_id'])
        serializer.save(tree=tree)


class TreeGraphView(APIView):
    """Returns the tree as nodes + base-fact edges for the frontend to render directly."""

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, tree_id):
        tree = get_accessible_tree(request, tree_id)
        members = FamilyMember.objects.filter(tree=tree)
        relationships = Relationship.objects.filter(tree=tree)

        nodes = FamilyMemberSerializer(members, many=True).data
        edges = [
            {
                'id': str(rel.id),
                'kind': rel.kind,
                'from_member': str(rel.from_member_id),
                'to_member': str(rel.to_member_id),
                'parent_link_type': rel.parent_link_type,
                'spouse_status': rel.spouse_status,
            }
            for rel in relationships
        ]
        return Response({'nodes': nodes, 'edges': edges})


class RelationshipPathView(APIView):
    """Given ?from=<member_id>&to=<member_id>, returns the computed relationship
    label and the connecting path of member ids, for relationship-path highlighting."""

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, tree_id):
        tree = get_accessible_tree(request, tree_id)
        from_id = request.query_params.get('from')
        to_id = request.query_params.get('to')
        if not from_id or not to_id:
            return Response({'detail': 'from and to query params are required.'}, status=400)
        try:
            from_id = uuid.UUID(from_id)
            to_id = uuid.UUID(to_id)
        except ValueError:
            return Response({'detail': 'from and to must be valid member ids.'}, status=400)

        parents_of, children_of, spouses_of = build_graph(tree)
        label = compute_relationship(from_id, to_id, parents_of, spouses_of)
        path = find_relationship_path(from_id, to_id, parents_of, children_of, spouses_of)
        return Response({'relationship': label, 'path': [str(p) for p in path] if path else path})
