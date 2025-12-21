from django.db import models
from listings.models import MlsHistory

class FeatureWeight(models.Model):
    feature_name = models.CharField(max_length=50, unique=True)
    weight = models.FloatField(default=0.0)

    def __str__(self):
        return f"{self.feature_name}: {self.weight}"

class NeighborhoodWeight(models.Model):
    neighborhood_name = models.CharField(max_length=255, unique=True)
    weight = models.FloatField(default=0.0)

    def __str__(self):
        return f"{self.neighborhood_name}: {self.weight}"

class LearnedPreference(models.Model):
    key = models.CharField(max_length=50, unique=True)
    value = models.FloatField()

    def __str__(self):
        return f"{self.key}: {self.value}"

class FavoriteLocation(models.Model):
    latitude = models.FloatField()
    longitude = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

class RankingScore(models.Model):
    listing = models.ForeignKey(MlsHistory, on_delete=models.CASCADE, related_name='ranking_scores')
    score = models.FloatField(default=0.0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.listing} - {self.score}"

class RankingComparison(models.Model):
    CHOICES = [
        ('A', 'Listing A'),
        ('B', 'Listing B'),
        ('TIE', 'Tie'),
        ('NEITHER', 'Neither'),
    ]
    listing_a = models.ForeignKey(MlsHistory, on_delete=models.CASCADE, related_name='comparisons_as_a')
    listing_b = models.ForeignKey(MlsHistory, on_delete=models.CASCADE, related_name='comparisons_as_b')
    winner = models.CharField(max_length=7, choices=CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Ranking Comparisons"
