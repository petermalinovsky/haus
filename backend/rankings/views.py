from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import RankingScore, RankingComparison, FeatureWeight, NeighborhoodWeight, LearnedPreference
from listings.models import MlsHistory
from listings.serializers import ListingSerializer
from .feature_ranker import FeatureRanker
from django.db import transaction
import random

@api_view(['GET'])
def get_comparison_pair(request):
    """
    GET /api/comparisons/pair/
    """
    listings = list(MlsHistory.objects.all()[:100])
    if len(listings) < 2:
        return Response({"error": "Not enough listings"}, status=status.HTTP_400_BAD_VALUE)
    
    pair = random.sample(listings, 2)
    serializer = ListingSerializer(pair, many=True)
    
    return Response({
        "a": serializer.data[0],
        "b": serializer.data[1]
    })

@api_view(['POST'])
def submit_comparison(request):
    """
    POST /api/comparisons/
    """
    listing_a_id = request.data.get('listing_a_id')
    listing_b_id = request.data.get('listing_b_id')
    winner = request.data.get('winner')

    if winner not in ['A', 'B', 'TIE']:
        return Response({"error": "Invalid winner choice"}, status=status.HTTP_400_BAD_VALUE)

    try:
        listing_a = MlsHistory.objects.get(id=listing_a_id)
        listing_b = MlsHistory.objects.get(id=listing_b_id)
    except MlsHistory.DoesNotExist:
        return Response({"error": "Listing not found"}, status=status.HTTP_404_NOT_FOUND)

    with transaction.atomic():
        # Persist comparison
        RankingComparison.objects.create(
            listing_a=listing_a,
            listing_b=listing_b,
            winner=winner
        )

        # Update weights and recompute scores
        FeatureRanker.update_weights(listing_a, listing_b, winner)
        FeatureRanker.recompute_all_scores()

    return Response({"status": "success"}, status=status.HTTP_201_CREATED)

@api_view(['GET'])
def get_ranking_distribution(request):
    """
    GET /api/rankings/distribution/
    """
    scores = list(RankingScore.objects.values_list('score', flat=True))
    if not scores:
        return Response({"bins": [], "counts": []})
    
    min_score = min(scores)
    max_score = max(scores)
    
    if min_score == max_score:
        return Response({
            "bins": [min_score, max_score + 1],
            "counts": [len(scores)]
        })
    
    num_bins = 10
    bin_size = (max_score - min_score) / num_bins
    bins = [min_score + i * bin_size for i in range(num_bins + 1)]
    counts = [0] * num_bins
    
    for s in scores:
        for i in range(num_bins):
            if s >= bins[i] and (s < bins[i+1] or (i == num_bins - 1 and s <= bins[i+1])):
                counts[i] += 1
                break
                
    return Response({
        "bins": bins,
        "counts": counts
    })

@api_view(['GET'])
def get_feature_insights(request):
    """
    GET /api/rankings/insights/
    Returns current weights and learned preferences.
    """
    weights = FeatureWeight.objects.all().values('feature_name', 'weight')
    neighborhoods = NeighborhoodWeight.objects.all().order_by('-weight')[:5].values('neighborhood_name', 'weight')
    preferences = LearnedPreference.objects.all().values('key', 'value')

    return Response({
        "weights": list(weights),
        "top_neighborhoods": list(neighborhoods),
        "preferences": list(preferences)
    })
