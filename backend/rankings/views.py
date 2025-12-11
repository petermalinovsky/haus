from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, action
from .models import UserComparisonFeedback, UserPreferenceConfig, UserRankingScore
from .serializers import UserComparisonFeedbackSerializer, UserPreferenceConfigSerializer
from listings.models import CurrentListing
from listings.serializers import ListingSerializer
import random

class UserComparisonFeedbackViewSet(viewsets.ModelViewSet):
    queryset = UserComparisonFeedback.objects.all()
    serializer_class = UserComparisonFeedbackSerializer

    @action(detail=False, methods=['get'])
    def pair(self, request):
        """
        Get a pair of listings for the user to compare.
        Strategies: Random, Uncertainty Sampling, etc.
        """
        listings_count = CurrentListing.objects.count()
        if listings_count < 2:
            return Response({"error": "Not enough listings"}, status=400)
            
        # Naive Random Selection
        # Use random offset
        idx1 = random.randint(0, listings_count - 1)
        idx2 = random.randint(0, listings_count - 1)
        while idx1 == idx2:
            idx2 = random.randint(0, listings_count - 1)
            
        l1 = CurrentListing.objects.all()[idx1]
        l2 = CurrentListing.objects.all()[idx2]
        
        serializer1 = ListingSerializer(l1)
        serializer2 = ListingSerializer(l2)
        
        return Response({
            "a": serializer1.data,
            "b": serializer2.data
        })

class UserPreferenceConfigViewSet(viewsets.ModelViewSet):
    queryset = UserPreferenceConfig.objects.all()
    serializer_class = UserPreferenceConfigSerializer
    lookup_field = 'user_id'

    def retrieve(self, request, user_id=None):
        instance, created = UserPreferenceConfig.objects.get_or_create(user_id=user_id)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
