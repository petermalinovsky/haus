from rest_framework import serializers
from .models import UserComparisonFeedback, UserPreferenceConfig, UserRankingScore

class UserComparisonFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserComparisonFeedback
        fields = '__all__'

class UserPreferenceConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreferenceConfig
        fields = '__all__'

class UserRankingScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRankingScore
        fields = '__all__'
