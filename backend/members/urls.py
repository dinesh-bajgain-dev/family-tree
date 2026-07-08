from rest_framework.routers import DefaultRouter

from .views import FamilyMemberViewSet

router = DefaultRouter()
router.register('', FamilyMemberViewSet, basename='member')

urlpatterns = router.urls
