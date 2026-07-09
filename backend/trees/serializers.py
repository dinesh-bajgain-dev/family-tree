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

    def validate(self, attrs):
        request = self.context.get('request')
        if request and not self.instance and FamilyTree.objects.filter(owner=request.user).exists():
            raise serializers.ValidationError('You already have a family tree. Each account may only own one.')
        return attrs
