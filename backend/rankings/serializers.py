from rest_framework import serializers
from .models import RankingScore, RankingComparison

class RankingScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = RankingScore
        fields = '__all__'

class RankingComparisonSerializer(serializers.ModelSerializer):
    class Meta:
        model = RankingComparison
        fields = '__all__'
