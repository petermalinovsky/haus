from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from listings.views import ListingsViewSet
from rankings.views import UserComparisonFeedbackViewSet, UserPreferenceConfigViewSet

router = DefaultRouter()
router.register(r'listings', ListingsViewSet, basename='listings')
router.register(r'feedback', UserComparisonFeedbackViewSet, basename='feedback')
router.register(r'preferences', UserPreferenceConfigViewSet, basename='preferences')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
