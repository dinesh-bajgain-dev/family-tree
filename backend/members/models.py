import uuid

from django.db import models

from trees.models import FamilyTree


class FamilyMember(models.Model):
    class Gender(models.TextChoices):
        MALE = 'male', 'Male'
        FEMALE = 'female', 'Female'
        OTHER = 'other', 'Other'

    class BloodGroup(models.TextChoices):
        A_POS = 'A+', 'A+'
        A_NEG = 'A-', 'A-'
        B_POS = 'B+', 'B+'
        B_NEG = 'B-', 'B-'
        AB_POS = 'AB+', 'AB+'
        AB_NEG = 'AB-', 'AB-'
        O_POS = 'O+', 'O+'
        O_NEG = 'O-', 'O-'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tree = models.ForeignKey(FamilyTree, on_delete=models.CASCADE, related_name='members')

    full_name = models.CharField(max_length=255)
    nickname = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True)
    date_of_birth = models.DateField(blank=True, null=True)
    place_of_birth = models.CharField(max_length=255, blank=True)
    nationality = models.CharField(max_length=100, blank=True)
    occupation = models.CharField(max_length=255, blank=True)
    education = models.CharField(max_length=255, blank=True)
    biography = models.TextField(blank=True)
    blood_group = models.CharField(max_length=3, choices=BloodGroup.choices, blank=True)
    religion = models.CharField(max_length=100, blank=True)

    is_living = models.BooleanField(default=True)
    date_of_death = models.DateField(blank=True, null=True)
    burial_location = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    profile_photo = models.ImageField(upload_to='member_photos/', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('full_name',)

    def __str__(self):
        return self.full_name
