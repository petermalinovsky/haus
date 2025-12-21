from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.gis.geos import Polygon, GEOSGeometry
from django.db.models import F, ExpressionWrapper, FloatField
from .models import CurrentListing, MlsHistory
from .serializers import ListingSerializer, MlsHistorySerializer
from .filters import ListingFilter
import logging

logger = logging.getLogger(__name__)

class ListingsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CurrentListing.objects.all()
    serializer_class = ListingSerializer
    filterset_class = ListingFilter
    # filterset_fields removed in favor of class

    def get_queryset(self):
        qs = super().get_queryset()
        
        # Polygon Filtering
        polygon_wkt = self.request.query_params.get('polygon', None)
        if polygon_wkt:
            try:
                # Expecting WKT POLYGON((...))
                poly = GEOSGeometry(polygon_wkt)
                qs = qs.filter(location__within=poly)
            except Exception as e:
                logger.error(f"Invalid polygon WKT: {e}")
                pass
        
        # Bounding Box Filtering ?bbox=min_lon,min_lat,max_lon,max_lat
        bbox = self.request.query_params.get('bbox', None)
        if bbox:
            try:
                bbox_vals = [float(x) for x in bbox.split(',')]
                if len(bbox_vals) == 4:
                    bbox_poly = Polygon.from_bbox(bbox_vals)
                    qs = qs.filter(location__within=bbox_poly)
            except Exception as e:
                logger.error(f"Invalid bbox: {e}")
                pass

        # Arithmetic / Custom Sorting
        # Example: ?custom_sort=list_price/sqft&direction=asc
        custom_sort = self.request.query_params.get('custom_sort', None)
        direction = self.request.query_params.get('direction', 'asc')
        
        if custom_sort:
            # ... existing custom sort logic ...
            try:
                if '/' in custom_sort:
                    num_field, denom_field = custom_sort.split('/')
                    valid_fields = [f.name for f in CurrentListing._meta.get_fields()]
                    if num_field in valid_fields and denom_field in valid_fields:
                        expression = ExpressionWrapper(
                            F(num_field) / F(denom_field),
                            output_field=FloatField()
                        )
                        qs = qs.annotate(custom_metric=expression)
                        order_prefix = '-' if direction == 'desc' else ''
                        qs = qs.order_by(f'{order_prefix}custom_metric')
            except Exception as e:
                logger.error(f"Error parsing custom sort: {e}")
                pass
        
        # Ranking Sorting
        sort = self.request.query_params.get('sort', None)
        if sort in ['ranking_score', '-ranking_score']:
            from rankings.models import RankingScore
            from django.db.models import OuterRef, Subquery
            
            # Subquery to get the score
            score_subquery = RankingScore.objects.filter(listing_id=OuterRef('pk')).values('score')[:1]
            qs = qs.annotate(annotated_ranking_score=Subquery(score_subquery))
            
            # Use Coalesce to handle listings without a score, defaulting to 1000.0
            from django.db.models.functions import Coalesce
            from django.db.models import Value
            qs = qs.annotate(
                final_ranking_score=Coalesce(F('annotated_ranking_score'), Value(1000.0))
            )
            
            order_by = 'final_ranking_score' if sort == 'ranking_score' else '-final_ranking_score'
            qs = qs.order_by(order_by)

        return qs

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """
        Return aggregated metrics for the current view (heatmap data).
        """
        qs = self.filter_queryset(self.get_queryset())
        # For simple heatmap: return lat, lon, weight (e.g. price per sqft or price)
        # Limit to reasonable number
        data = qs.values('latitude', 'longitude', 'list_price', 'sqft')[:2000]
        return Response(list(data))

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Return the full history for a specific listing using listing_id.
        """
        instance = self.get_object()
        listing_id = instance.listing_id
        
        if not listing_id:
            # Fallback if no listing_id, return empty or just self
            return Response([])

        # Query MlsHistory for all records with this listing_id, oldest to newest
        history_qs = MlsHistory.objects.filter(listing_id=listing_id).order_by('scrape_timestamp')
        serializer = MlsHistorySerializer(history_qs, many=True)
        return Response(serializer.data)
