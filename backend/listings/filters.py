
import django_filters
from .models import CurrentListing

class ListingFilter(django_filters.FilterSet):
    price_min = django_filters.NumberFilter(field_name='list_price', lookup_expr='gte')
    price_max = django_filters.NumberFilter(field_name='list_price', lookup_expr='lte')
    sqft_min = django_filters.NumberFilter(field_name='sqft', lookup_expr='gte')
    sqft_max = django_filters.NumberFilter(field_name='sqft', lookup_expr='lte')
    beds_min = django_filters.NumberFilter(field_name='beds', lookup_expr='gte')
    beds_max = django_filters.NumberFilter(field_name='beds', lookup_expr='lte')
    baths_min = django_filters.NumberFilter(field_name='full_baths', lookup_expr='gte')
    baths_max = django_filters.NumberFilter(field_name='full_baths', lookup_expr='lte')
    
    # Custom Price Per Sqft Filter logic could go here if it was a db field, 
    # but since it's a derived property on the model (mostly) or needs annotation, 
    # we might need robust handling. CurrentListing model HAS price_per_sqft field.
    pps_min = django_filters.NumberFilter(field_name='price_per_sqft', lookup_expr='gte')
    pps_max = django_filters.NumberFilter(field_name='price_per_sqft', lookup_expr='lte')

    class Meta:
        model = CurrentListing
        fields = ['status', 'city', 'zip_code', 'state']
