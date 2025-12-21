import math
from .models import FeatureWeight, NeighborhoodWeight, LearnedPreference, FavoriteLocation, RankingScore

class FeatureRanker:
    NUMERIC_FEATURES = ['beds', 'full_baths', 'sqft', 'year_built', 'lot_sqft', 'parking_garage']
    LEARNING_RATE = 0.01

    @classmethod
    def get_feature_vector(cls, listing):
        """
        Extracts and normalizes features from a listing.
        Returns a dictionary of feature values.
        """
        features = {}
        for f in cls.NUMERIC_FEATURES:
            val = getattr(listing, f, 0)
            features[f] = float(val) if val is not None else 0.0

        # Non-linear price: raw value for now, budget logic applied in score
        features['list_price'] = float(listing.list_price) if listing.list_price else 0.0
        
        # Location: Lat/Lon and Neighborhood
        features['latitude'] = listing.latitude
        features['longitude'] = listing.longitude
        features['neighborhood'] = listing.neighborhoods

        return features

    @classmethod
    def get_score(cls, listing, weights=None, budget_cap=None, penalty_weight=None, hotspots=None, dist_weight=None):
        """
        Calculates the score for a single listing using current weights and preferences.
        """
        features = cls.get_feature_vector(listing)
        score = 0.0

        # Numeric features
        if weights is None:
            weights = {fw.feature_name: fw.weight for fw in FeatureWeight.objects.all()}
        
        for f in cls.NUMERIC_FEATURES:
            score += features[f] * weights.get(f, 0.0)

        # Budget logic
        if budget_cap is None:
            budget_cap = LearnedPreference.objects.filter(key='budget_cap').first()
            budget_cap = budget_cap.value if budget_cap else None
        
        if budget_cap and features['list_price'] > budget_cap:
            if penalty_weight is None:
                pw_obj = LearnedPreference.objects.filter(key='penalty_weight').first()
                penalty_weight = pw_obj.value if pw_obj else 1.0
            
            # Progressive penalty: square of the excess percentage
            excess = (features['list_price'] - budget_cap) / budget_cap
            score -= (excess ** 2) * penalty_weight * 1000 # Scaling factor

        # Neighborhood bonus
        if features['neighborhood']:
            nw = NeighborhoodWeight.objects.filter(neighborhood_name=features['neighborhood']).first()
            if nw:
                score += nw.weight

        # Distance to hotspots
        if hotspots is None:
            hotspots = list(FavoriteLocation.objects.all())
        
        if hotspots and features['latitude'] and features['longitude']:
            min_dist = float('inf')
            for spot in hotspots:
                dist = math.sqrt((features['latitude'] - spot.latitude)**2 + (features['longitude'] - spot.longitude)**2)
                if dist < min_dist:
                    min_dist = dist
            
            if dist_weight is None:
                dw_obj = FeatureWeight.objects.filter(feature_name='distance_to_hotspot').first()
                dist_weight = dw_obj.weight if dw_obj else -10.0
            
            score += min_dist * dist_weight

        return score

    @classmethod
    def update_weights(cls, listing_a, listing_b, winner):
        """
        Updates weights based on a comparison result.
        winner: 'A', 'B', or 'TIE'
        """
        features_a = cls.get_feature_vector(listing_a)
        features_b = cls.get_feature_vector(listing_b)

        # Target difference
        if winner == 'A':
            target_diff = 1.0
            # Update hotspots
            if listing_a.latitude and listing_a.longitude:
                FavoriteLocation.objects.create(latitude=listing_a.latitude, longitude=listing_a.longitude)
            # Update budget cap if A is more expensive and won
            if features_a['list_price'] > features_b['list_price']:
                cap_obj, _ = LearnedPreference.objects.get_or_create(key='budget_cap', defaults={'value': features_a['list_price']})
                if features_a['list_price'] > cap_obj.value:
                    cap_obj.value = features_a['list_price']
                    cap_obj.save()
        elif winner == 'B':
            target_diff = -1.0
            if listing_b.latitude and listing_b.longitude:
                FavoriteLocation.objects.create(latitude=listing_b.latitude, longitude=listing_b.longitude)
            if features_b['list_price'] > features_a['list_price']:
                cap_obj, _ = LearnedPreference.objects.get_or_create(key='budget_cap', defaults={'value': features_b['list_price']})
                if features_b['list_price'] > cap_obj.value:
                    cap_obj.value = features_b['list_price']
                    cap_obj.save()
        elif winner == 'NEITHER':
            target_diff = 0.0
            # For NEITHER, we don't update favorites or budget cap.
            # We just treat it as a neutral tie.
        else:
            target_diff = 0.0

        current_diff = cls.get_score(listing_a) - cls.get_score(listing_b)
        error = target_diff - current_diff

        # Update weights for numeric features
        for f in cls.NUMERIC_FEATURES:
            delta = cls.LEARNING_RATE * error * (features_a[f] - features_b[f])
            fw, _ = FeatureWeight.objects.get_or_create(feature_name=f)
            fw.weight += delta
            fw.save()

        # Update neighborhood weights
        if features_a['neighborhood']:
            nw_a, _ = NeighborhoodWeight.objects.get_or_create(neighborhood_name=features_a['neighborhood'])
            nw_a.weight += cls.LEARNING_RATE * error * 0.5 # Neighborhoods get partial updates
            nw_a.save()
        if features_b['neighborhood']:
            nw_b, _ = NeighborhoodWeight.objects.get_or_create(neighborhood_name=features_b['neighborhood'])
            nw_b.weight -= cls.LEARNING_RATE * error * 0.5
            nw_b.save()

    @classmethod
    def recompute_all_scores(cls):
        """
        Updates RankingScore for all listings.
        """
        from listings.models import MlsHistory
        
        # Pre-fetch all weights and preferences
        weights = {fw.feature_name: fw.weight for fw in FeatureWeight.objects.all()}
        budget_cap = LearnedPreference.objects.filter(key='budget_cap').first()
        budget_cap = budget_cap.value if budget_cap else None
        pw_obj = LearnedPreference.objects.filter(key='penalty_weight').first()
        penalty_weight = pw_obj.value if pw_obj else 1.0
        hotspots = list(FavoriteLocation.objects.all())
        dw_obj = FeatureWeight.objects.filter(feature_name='distance_to_hotspot').first()
        dist_weight = dw_obj.weight if dw_obj else -10.0

        for listing in MlsHistory.objects.all():
            score_obj, _ = RankingScore.objects.get_or_create(listing=listing)
            score_obj.score = cls.get_score(
                listing, 
                weights=weights, 
                budget_cap=budget_cap, 
                penalty_weight=penalty_weight,
                hotspots=hotspots,
                dist_weight=dist_weight
            )
            score_obj.save()
