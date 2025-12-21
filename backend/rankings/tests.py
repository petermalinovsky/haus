from django.test import TestCase
from listings.models import MlsHistory
from .models import FeatureWeight, LearnedPreference, NeighborhoodWeight, RankingScore
from .feature_ranker import FeatureRanker

class FeatureRankingTests(TestCase):
    def setUp(self):
        # Create some listings
        self.listing_a = MlsHistory.objects.create(
            formatted_address="123 Alpha St",
            list_price=500000,
            beds=3,
            full_baths=2,
            neighborhoods="Northside",
            latitude=40.0,
            longitude=-70.0
        )
        self.listing_b = MlsHistory.objects.create(
            formatted_address="456 Beta St",
            list_price=600000,
            beds=4,
            full_baths=3,
            neighborhoods="Southside",
            latitude=41.0,
            longitude=-71.0
        )

    def test_feature_extraction(self):
        features = FeatureRanker.get_feature_vector(self.listing_a)
        self.assertEqual(features['beds'], 3.0)
        self.assertEqual(features['list_price'], 500000.0)
        self.assertEqual(features['neighborhood'], "Northside")

    def test_scoring_with_no_weights(self):
        # Default scores should be 0 if no weights/preferences set
        score = FeatureRanker.get_score(self.listing_a)
        self.assertEqual(score, 0.0)

    def test_linear_weight_updates(self):
        # Prefer A over B (A has fewer beds/baths/price, but let's say user likes A)
        FeatureRanker.update_weights(self.listing_a, self.listing_b, 'A')
        
        # Bedrooms should now have a negative weight (since A has fewer beds and won)
        bed_weight = FeatureWeight.objects.get(feature_name='beds').weight
        self.assertLess(bed_weight, 0)

    def test_budget_cap_learning(self):
        # A wins, set initial cap
        FeatureRanker.update_weights(self.listing_a, self.listing_b, 'A')
        cap = LearnedPreference.objects.get(key='budget_cap').value
        self.assertEqual(cap, 500000.0)

        # B wins (more expensive), cap should increase
        FeatureRanker.update_weights(self.listing_a, self.listing_b, 'B')
        cap = LearnedPreference.objects.get(key='budget_cap').value
        self.assertEqual(cap, 600000.0)

    def test_ranking_uncompared_listings(self):
        # Create a third listing
        listing_c = MlsHistory.objects.create(
            formatted_address="789 Gamma St",
            list_price=550000,
            beds=3,
            full_baths=2
        )
        
        # Set some weights manually
        FeatureWeight.objects.create(feature_name='beds', weight=10.0)
        
        # Listing B (4 beds) should score higher than C (3 beds) even if never compared
        score_b = FeatureRanker.get_score(self.listing_b)
        score_c = FeatureRanker.get_score(listing_c)
        self.assertGreater(score_b, score_c)
