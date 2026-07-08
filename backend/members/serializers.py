from rest_framework import serializers

from .models import FamilyMember


class FamilyMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyMember
        fields = (
            'id', 'tree', 'full_name', 'nickname', 'gender', 'date_of_birth',
            'place_of_birth', 'nationality', 'occupation', 'education', 'biography',
            'blood_group', 'religion', 'is_living', 'date_of_death', 'burial_location',
            'notes', 'profile_photo', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'tree', 'created_at', 'updated_at')

    def validate(self, attrs):
        is_living = attrs.get('is_living', getattr(self.instance, 'is_living', True))
        date_of_death = attrs.get('date_of_death', getattr(self.instance, 'date_of_death', None))
        if is_living and date_of_death:
            raise serializers.ValidationError('A living member cannot have a date of death.')
        return attrs
