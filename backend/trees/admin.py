from django.contrib import admin

from .models import FamilyTree


@admin.register(FamilyTree)
class FamilyTreeAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'privacy', 'created_at')
    search_fields = ('name', 'owner__email')
