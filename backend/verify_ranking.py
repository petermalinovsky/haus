import os
import django
import sys
import json

# Setup Django environment
sys.path.append('/home/peter/haus/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'haus_config.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from rankings.views import get_candidates, get_subset_comparison_pair, get_random_listing
from listings.models import MlsHistory

def test_phases():
    factory = APIRequestFactory()
    
    # 1. Get a Seed Listing
    seed = MlsHistory.objects.first()
    if not seed:
        print("No listings found in DB to test.")
        return

    print(f"Seed Listing: {seed.id} - ${seed.list_price} - {seed.location}")

    # 2. Test Candidates Endpoint
    print("\nTesting /api/candidates/...")
    request = factory.post('/api/candidates/', {'seed_id': seed.id}, format='json')
    response = get_candidates(request)
    
    if response.status_code != 200:
        print(f"FAILED: {response.status_code} - {response.data}")
        return
        
    candidates = response.data
    print(f"Found {len(candidates)} candidates.")
    candidate_ids = [c['id'] for c in candidates]
    
    if len(candidates) < 2:
        print("Not enough candidates to test subset ranking. Try a different seed or add mock data.")
        # Try to artificially add some ids if needed, but for now just warn
        if len(candidates) == 0:
             return

    # 3. Test Subset Pair Endpoint
    print("\nTesting /api/comparisons/subset-pair/...")
    # Add seed to candidate list to ensure we have enough if needed, 
    # though in practice candidates excludes seed.
    # Let's just use what we have if >= 2.
    
    if len(candidates) >= 2:
        request = factory.post('/api/comparisons/subset-pair/', {'candidate_ids': candidate_ids}, format='json')
        response = get_subset_comparison_pair(request)
        
        if response.status_code == 200:
            print("SUCCESS: Retrieved subset pair.")
            print(f"A: {response.data['a']['id']}")
            print(f"B: {response.data['b']['id']}")
            
            # Verify they are in the candidate list
            if response.data['a']['id'] in candidate_ids and response.data['b']['id'] in candidate_ids:
                print("Verified: Pair is from subset.")
            else:
                print("FAILED: Pair contains ID not in subset!")
        else:
            print(f"FAILED: {response.status_code} - {response.data}")

    # 4. Test Random Listing with Subset
    print("\nTesting /api/comparisons/random/ with subset...")
    request = factory.get('/api/comparisons/random/', {'subset_ids': candidate_ids})
    response = get_random_listing(request)
    
    if response.status_code == 200:
        print(f"SUCCESS: Retrieved random listing: {response.data['id']}")
        if response.data['id'] in candidate_ids:
             print("Verified: Listing is from subset.")
        else:
             print("FAILED: Listing not in subset!")
    else:
        print(f"FAILED: {response.status_code} - {response.data}")

if __name__ == "__main__":
    test_phases()
