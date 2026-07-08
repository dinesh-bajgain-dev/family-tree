from rest_framework.routers import DefaultRouter

from .views import RelationshipViewSet

router = DefaultRouter()
router.register('', RelationshipViewSet, basename='relationship')

urlpatterns = router.urls
