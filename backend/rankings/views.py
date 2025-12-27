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

    if winner not in ['A', 'B', 'TIE', 'NEITHER']:
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
def get_random_listing(request):
    """
    GET /api/comparisons/random/
    Returns a single random listing.
    """
    exclude_ids = request.query_params.getlist('exclude') + request.query_params.getlist('exclude[]')
    subset_ids = request.query_params.getlist('subset_ids') + request.query_params.getlist('subset_ids[]')

    queryset = MlsHistory.objects.exclude(id__in=exclude_ids)
    
    if subset_ids:
        queryset = queryset.filter(id__in=subset_ids)
    
    if not queryset.exists():
        return Response({"error": "No listings available"}, status=status.HTTP_404_NOT_FOUND)
    
    # Optimization: count is cheaper than fetching all
    count = queryset.count()
    random_index = random.randint(0, count - 1)
    listing = queryset[random_index]
    
    serializer = ListingSerializer(listing)
    return Response(serializer.data)

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

@api_view(['POST'])
def get_candidates(request):
    """
    POST /api/candidates/
    Identify candidates based on a seed listing.
    """
    seed_id = request.data.get('seed_id')
    if not seed_id:
        return Response({"error": "Seed ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        seed = MlsHistory.objects.get(id=seed_id)
    except MlsHistory.DoesNotExist:
        return Response({"error": "Seed listing not found"}, status=status.HTTP_404_NOT_FOUND)

    # Phase 1 Logic:
    # 1. Location: Within 1 mile (approx 1609 meters)
    # 2. Price: <= Seed Price * 2
    
    # We use DWithin for spatial query if available, else basic lat/lon box?
    # The user has PointField, so we can use GIS lookups.
    # Note: Using MlsHistory which inherits ListingBase with PointField.
    
    candidates = MlsHistory.objects.exclude(id=seed.id)
    
    if seed.location:
        from django.contrib.gis.measure import D
        candidates = candidates.filter(location__distance_lte=(seed.location, D(mi=1)))
    elif seed.latitude and seed.longitude:
        # Fallback if location field is empty but lat/lon exists (though ListingBase usually syncs them)
        # Simple bounding box approximation for 1 mile ~ 1/69 degrees lat
        lat_delta = 1.0 / 69.0
        lon_delta = 1.0 / 50.0 # roughly at typical US latitudes
        candidates = candidates.filter(
            latitude__range=(seed.latitude - lat_delta, seed.latitude + lat_delta),
            longitude__range=(seed.longitude - lon_delta, seed.longitude + lon_delta)
        )

    if seed.list_price:
        max_price = seed.list_price * 2
        candidates = candidates.filter(list_price__lte=max_price)
        
    # Limit for sanity?
    candidates = candidates[:50]
    
    serializer = ListingSerializer(candidates, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def get_subset_comparison_pair(request):
    """
    POST /api/comparisons/subset-pair/
    Get a pair from a specific list of candidate IDs.
    """
    candidate_ids = request.data.get('candidate_ids', [])
    if len(candidate_ids) < 2:
        return Response({"error": "Not enough candidates provided"}, status=status.HTTP_400_BAD_REQUEST)
        
    # Filter to valid IDs only
    valid_ids = list(MlsHistory.objects.filter(id__in=candidate_ids).values_list('id', flat=True))
    
    if len(valid_ids) < 2:
         return Response({"error": "Not enough valid candidates found"}, status=status.HTTP_400_BAD_REQUEST)
         
    # Pick 2 random
    pair_ids = random.sample(valid_ids, 2)
    pair = MlsHistory.objects.filter(id__in=pair_ids)
    
    # Ensure order matches random sample to keep randomness
    # iterating querysets doesn't guarantee order, so we map back
    obj_map = {obj.id: obj for obj in pair}
    ordered_pair = [obj_map[pid] for pid in pair_ids]
    
    serializer = ListingSerializer(ordered_pair, many=True)
    
    return Response({
        "a": serializer.data[0],
        "b": serializer.data[1]
    })

@api_view(['POST'])
def reset_rankings(request):
    """
    POST /api/rankings/reset/
    Clear all ranking data.
    """
    with transaction.atomic():
        RankingComparison.objects.all().delete()
        RankingScore.objects.all().delete()
        FeatureWeight.objects.all().delete()
        NeighborhoodWeight.objects.all().delete()
        LearnedPreference.objects.all().delete()
        
    return Response({"status": "success", "message": "All ranking data reset."})
