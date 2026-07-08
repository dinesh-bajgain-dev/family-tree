from django.contrib import admin

from .models import Relationship


@admin.register(Relationship)
class RelationshipAdmin(admin.ModelAdmin):
    list_display = ('from_member', 'kind', 'to_member', 'tree')
    list_filter = ('kind', 'tree')
