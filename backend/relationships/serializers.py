from django.db.models import Q
from rest_framework import serializers

from .models import Relationship


class RelationshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Relationship
        fields = (
            'id', 'tree', 'kind', 'from_member', 'to_member',
            'parent_link_type', 'spouse_status', 'marriage_order', 'created_at',
        )
        read_only_fields = ('id', 'tree', 'created_at')

    def validate(self, attrs):
        from_member = attrs.get('from_member', getattr(self.instance, 'from_member', None))
        to_member = attrs.get('to_member', getattr(self.instance, 'to_member', None))
        kind = attrs.get('kind', getattr(self.instance, 'kind', None))
        if from_member and to_member:
            if from_member.tree_id != to_member.tree_id:
                raise serializers.ValidationError('Both members must belong to the same tree.')
            if from_member.id == to_member.id:
                raise serializers.ValidationError('A member cannot have a relationship with themselves.')

            duplicate = Relationship.objects.filter(kind=kind).filter(
                Q(from_member=from_member, to_member=to_member)
                | Q(from_member=to_member, to_member=from_member)
            )
            if self.instance:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError('This relationship already exists between these two members.')
        return attrs
