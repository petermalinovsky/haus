from django.db.models.signals import post_save
from django.dispatch import receiver
from listings.models import MlsHistory
from .models import RankingScore

@receiver(post_save, sender=MlsHistory)
def create_ranking_score(sender, instance, created, **kwargs):
    if created:
        RankingScore.objects.get_or_create(listing=instance)
