import uuid

from django.db import models

from members.models import FamilyMember
from trees.models import FamilyTree


class Relationship(models.Model):
    """A base-fact edge in the family graph. Extended relations (sibling,
    grandparent, cousin, etc.) are derived at read time by graph traversal
    in relationships/services.py rather than stored here.
    """

    class Kind(models.TextChoices):
        PARENT_CHILD = 'parent_child', 'Parent / Child'
        SPOUSE = 'spouse', 'Spouse'

    class ParentLinkType(models.TextChoices):
        BIOLOGICAL = 'biological', 'Biological'
        ADOPTED = 'adopted', 'Adopted'
        STEP = 'step', 'Step-parent'
        GUARDIAN = 'guardian', 'Guardian'

    class SpouseStatus(models.TextChoices):
        CURRENT = 'current', 'Current'
        DIVORCED = 'divorced', 'Divorced'
        DECEASED = 'deceased', 'Deceased spouse'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tree = models.ForeignKey(FamilyTree, on_delete=models.CASCADE, related_name='relationships')
    kind = models.CharField(max_length=20, choices=Kind.choices)

    # For PARENT_CHILD: from_member is the parent, to_member is the child.
    # For SPOUSE: the pair is unordered but stored once with from_member/to_member.
    from_member = models.ForeignKey(FamilyMember, on_delete=models.CASCADE, related_name='relationships_from')
    to_member = models.ForeignKey(FamilyMember, on_delete=models.CASCADE, related_name='relationships_to')

    parent_link_type = models.CharField(max_length=20, choices=ParentLinkType.choices, blank=True)
    spouse_status = models.CharField(max_length=20, choices=SpouseStatus.choices, blank=True)
    marriage_order = models.PositiveSmallIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('kind', 'from_member', 'to_member'), name='unique_relationship_edge'
            )
        ]

    def __str__(self):
        return f'{self.from_member} -> {self.to_member} ({self.kind})'
