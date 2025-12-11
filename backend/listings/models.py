from django.contrib.gis.db import models
from django.contrib.postgres.fields import ArrayField

class ListingBase(models.Model):
    # Core Fields
    scrape_timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, null=True, blank=True)
    
    # Property Fields
    property_url = models.TextField(null=True, blank=True)
    property_id = models.CharField(max_length=100, null=True, blank=True)
    listing_id = models.CharField(max_length=100, null=True, blank=True)
    permalink = models.TextField(null=True, blank=True)
    mls = models.CharField(max_length=100, null=True, blank=True)
    mls_id = models.CharField(max_length=100, null=True, blank=True)
    mls_status = models.CharField(max_length=50, null=True, blank=True)
    text = models.TextField(null=True, blank=True)
    style = models.CharField(max_length=100, null=True, blank=True)
    formatted_address = models.TextField(null=True, blank=True)

    # Location
    location = models.PointField(srid=4326, null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    full_street_line = models.CharField(max_length=255, null=True, blank=True)
    street = models.CharField(max_length=255, null=True, blank=True)
    unit = models.CharField(max_length=50, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=50, null=True, blank=True)
    zip_code = models.CharField(max_length=20, null=True, blank=True)
    neighborhoods = models.TextField(null=True, blank=True)
    county = models.CharField(max_length=100, null=True, blank=True)
    fips_code = models.CharField(max_length=20, null=True, blank=True)

    # Details
    beds = models.FloatField(null=True, blank=True)
    full_baths = models.FloatField(null=True, blank=True)
    half_baths = models.FloatField(null=True, blank=True)
    sqft = models.FloatField(null=True, blank=True)
    year_built = models.IntegerField(null=True, blank=True)
    days_on_mls = models.IntegerField(null=True, blank=True)
    stories = models.IntegerField(null=True, blank=True)
    new_construction = models.BooleanField(null=True, blank=True)
    lot_sqft = models.FloatField(null=True, blank=True)
    primary_photo = models.TextField(null=True, blank=True)
    alt_photos = models.TextField(null=True, blank=True) # Could be JSON or TEXT

    # Financials
    list_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    list_price_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    list_price_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    list_date = models.DateField(null=True, blank=True)
    pending_date = models.DateField(null=True, blank=True)
    sold_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    last_sold_date = models.DateField(null=True, blank=True)
    last_sold_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    assessed_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    estimated_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    tax = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    tax_history = models.TextField(null=True, blank=True) # JSON or serialized
    price_per_sqft = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    hoa_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Agent/Office
    agent_id = models.CharField(max_length=100, null=True, blank=True)
    agent_name = models.CharField(max_length=255, null=True, blank=True)
    agent_email = models.EmailField(null=True, blank=True)
    agent_phones = models.TextField(null=True, blank=True)
    agent_mls_set = models.TextField(null=True, blank=True)
    agent_nrds_id = models.CharField(max_length=50, null=True, blank=True)
    broker_id = models.CharField(max_length=100, null=True, blank=True)
    broker_name = models.CharField(max_length=255, null=True, blank=True)
    builder_id = models.CharField(max_length=100, null=True, blank=True)
    builder_name = models.CharField(max_length=255, null=True, blank=True)
    office_id = models.CharField(max_length=100, null=True, blank=True)
    office_mls_set = models.TextField(null=True, blank=True)
    office_name = models.CharField(max_length=255, null=True, blank=True)
    office_email = models.EmailField(null=True, blank=True)
    office_phones = models.TextField(null=True, blank=True)

    # Extras
    nearby_schools = models.TextField(null=True, blank=True)
    parking_garage = models.FloatField(null=True, blank=True)

    class Meta:
        abstract = True

    def __str__(self):
        return f"{self.formatted_address} - {self.list_price}"

class MlsHistory(ListingBase):
    pass

class CurrentListing(ListingBase):
    class Meta:
        managed = False
        db_table = 'current_listings'
