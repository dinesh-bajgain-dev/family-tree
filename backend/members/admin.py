from django.contrib import admin

from .models import FamilyMember


@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'tree', 'gender', 'is_living', 'date_of_birth')
    search_fields = ('full_name', 'nickname')
    list_filter = ('is_living', 'gender', 'tree')
