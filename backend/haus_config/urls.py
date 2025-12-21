from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from listings.views import ListingsViewSet
from rankings.views import get_comparison_pair, submit_comparison, get_ranking_distribution

router = DefaultRouter()
router.register(r'listings', ListingsViewSet, basename='listings')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/comparisons/pair/', get_comparison_pair, name='comparison-pair'),
    path('api/comparisons/', submit_comparison, name='comparison-submit'),
    path('api/rankings/distribution/', get_ranking_distribution, name='ranking-distribution'),
    path('api/', include(router.urls)),
]
