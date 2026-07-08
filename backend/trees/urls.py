from rest_framework.routers import DefaultRouter

from .views import FamilyTreeViewSet

router = DefaultRouter()
router.register('', FamilyTreeViewSet, basename='tree')

urlpatterns = router.urls
