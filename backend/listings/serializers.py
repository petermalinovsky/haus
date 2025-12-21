from rest_framework import serializers
from .models import CurrentListing, MlsHistory
from rankings.models import RankingScore

class ListingSerializer(serializers.ModelSerializer):
    ranking_score = serializers.SerializerMethodField()

    class Meta:
        model = CurrentListing
        fields = '__all__'

    def get_ranking_score(self, obj):
        # Since CurrentListing might be a view or just another model on the same table
        # we try to get the RankingScore for the MlsHistory instance with the same ID
        try:
            score_obj = RankingScore.objects.get(listing_id=obj.id)
            return score_obj.score
        except RankingScore.DoesNotExist:
            return 1000.0

class MlsHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MlsHistory
        fields = '__all__'
