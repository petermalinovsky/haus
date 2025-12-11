from django.db import models

class UserComparisonFeedback(models.Model):
    user_id = models.CharField(max_length=100) # Simple username for now
    winner_listing_id = models.CharField(max_length=100) # Using listing_id string reference
    loser_listing_id = models.CharField(max_length=100)
    timestamp = models.DateTimeField(auto_now_add=True)

class UserRankingScore(models.Model):
    user_id = models.CharField(max_length=100)
    listing_id = models.CharField(max_length=100)
    score = models.FloatField(default=0.5) # 0.0 to 1.0 or similar ELO
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user_id', 'listing_id')

class UserPreferenceConfig(models.Model):
    user_id = models.CharField(max_length=100, unique=True)
    active_features = models.JSONField(default=list) # List of field names e.g. ["list_price", "sqft"]

    def __str__(self):
        return f"Preferences for {self.user_id}"
