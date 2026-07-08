from rest_framework import serializers

from .models import FamilyTree


class FamilyTreeSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    member_count = serializers.IntegerField(source='members.count', read_only=True)

    class Meta:
        model = FamilyTree
        fields = (
            'id', 'owner', 'name', 'description', 'cover_image', 'privacy',
            'member_count', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'owner', 'created_at', 'updated_at')
