from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import RankingScore, RankingComparison
from listings.models import MlsHistory
from listings.serializers import ListingSerializer
from .elo import EloRatingSystem
from django.db import transaction
import random

@api_view(['GET'])
def get_comparison_pair(request):
    """
    GET /api/comparisons/pair/
    Return two distinct, active listings for comparison.
    """
    listings = list(MlsHistory.objects.all()[:100]) # Get a subset for initial random pool
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
    Fields: listing_a_id, listing_b_id, winner (A, B, TIE)
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

        # Get current scores
        score_a_obj, _ = RankingScore.objects.get_or_create(listing=listing_a)
        score_b_obj, _ = RankingScore.objects.get_or_create(listing=listing_b)

        # Calculate new ratings
        new_a, new_b = EloRatingSystem.calculate_new_ratings(
            score_a_obj.score,
            score_b_obj.score,
            winner
        )

        # Update scores
        score_a_obj.score = new_a
        score_a_obj.save()
        score_b_obj.score = new_b
        score_b_obj.save()

    return Response({"status": "success"}, status=status.HTTP_201_CREATED)

@api_view(['GET'])
def get_ranking_distribution(request):
    """
    GET /api/rankings/distribution/
    Return histogram of current scores.
    """
    scores = list(RankingScore.objects.values_list('score', flat=True))
    if not scores:
        return Response({"bins": [], "counts": []})
    
    # Simple bucketization if numpy is not preferred or to avoid dependency issues
    # but I'll use simple python logic for robustness
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
