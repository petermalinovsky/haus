from django.db import models
from listings.models import MlsHistory

class RankingScore(models.Model):
    listing = models.ForeignKey(MlsHistory, on_delete=models.CASCADE, related_name='ranking_scores')
    score = models.FloatField(default=1000.0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.listing} - {self.score}"

class RankingComparison(models.Model):
    CHOICES = [
        ('A', 'Listing A'),
        ('B', 'Listing B'),
        ('TIE', 'Tie'),
    ]
    listing_a = models.ForeignKey(MlsHistory, on_delete=models.CASCADE, related_name='comparisons_as_a')
    listing_b = models.ForeignKey(MlsHistory, on_delete=models.CASCADE, related_name='comparisons_as_b')
    winner = models.CharField(max_length=3, choices=CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Ranking Comparisons"
