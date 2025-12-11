from rest_framework import serializers
from .models import CurrentListing, MlsHistory

class ListingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurrentListing
        fields = '__all__'

class MlsHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MlsHistory
        fields = '__all__'
