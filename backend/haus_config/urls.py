from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from listings.views import ListingsViewSet
from rankings.views import get_comparison_pair, submit_comparison, get_ranking_distribution, get_feature_insights, get_random_listing

router = DefaultRouter()
router.register(r'listings', ListingsViewSet, basename='listings')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/comparisons/pair/', get_comparison_pair, name='comparison-pair'),
    path('api/comparisons/random/', get_random_listing, name='random-listing'),
    path('api/comparisons/', submit_comparison, name='comparison-submit'),
    path('api/rankings/distribution/', get_ranking_distribution, name='ranking-distribution'),
    path('api/rankings/insights/', get_feature_insights, name='ranking-insights'),
    path('api/', include(router.urls)),
]
