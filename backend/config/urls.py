from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from relationships.views import RelationshipPathView, TreeGraphView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/trees/', include('trees.urls')),
    path('api/v1/trees/<uuid:tree_id>/members/', include('members.urls')),
    path('api/v1/trees/<uuid:tree_id>/relationships/', include('relationships.urls')),
    path('api/v1/trees/<uuid:tree_id>/graph/', TreeGraphView.as_view(), name='tree-graph'),
    path('api/v1/trees/<uuid:tree_id>/relationship-path/', RelationshipPathView.as_view(), name='relationship-path'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
