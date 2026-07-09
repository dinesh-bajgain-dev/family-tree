import uuid

from django.conf import settings
from django.db import models


class FamilyTree(models.Model):
    class Privacy(models.TextChoices):
        PUBLIC = 'public', 'Public'
        PRIVATE = 'private', 'Private'
        FAMILY_ONLY = 'family_only', 'Family only'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_tree')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to='tree_covers/', blank=True, null=True)
    privacy = models.CharField(max_length=20, choices=Privacy.choices, default=Privacy.PRIVATE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return self.name
