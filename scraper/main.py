import os
import sys
import logging
from datetime import datetime
from homeharvest import scrape_property
import pandas as pd
from sqlalchemy import create_engine
from geoalchemy2 import Geometry, WKTElement

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Database Connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL environment variable is not set.")
    sys.exit(1)

# Handle PostGIS URL scheme for SQLAlchemy
if DATABASE_URL.startswith("postgis://"):
    DATABASE_URL = DATABASE_URL.replace("postgis://", "postgresql://")

engine = create_engine(DATABASE_URL)

def run_scraper(location):
    logger.info(f"Starting scrape for location: {location}")
    
    try:
        # Fetch data
        # listing_type: for_sale, for_rent, sold
        properties = scrape_property(
            location=location,
            listing_type="for_sale"
        )
        
        if properties is None or properties.empty:
            logger.info("No properties found.")
            return

        count = len(properties)
        logger.info(f"Found {count} properties. Processing...")

        # Data Cleaning & Mapping to DB Schema
        # Schema expects: property_url, property_id, listing_id, ..., location(Point), ...
        
        # Create a clean DataFrame matching 'listings_mlshistory' columns
        df = pd.DataFrame()

        # Map widely available fields
        # HomeHarvest columns (snake_case): property_url, mls_id, status, list_price, full_street_line, ...
        
        # Helper to safely get col
        def get_col(col_name):
            return properties[col_name] if col_name in properties.columns else None

        df['property_url'] = get_col('property_url')
        df['property_id'] = get_col('property_id')
        df['listing_id'] = get_col('listing_id')
        df['mls'] = get_col('mls')
        df['mls_id'] = get_col('mls_id')
        df['status'] = get_col('status')
        df['text'] = get_col('text')
        df['style'] = get_col('style')
        df['formatted_address'] = get_col('full_street_line') # Use full_street_line or address? full_street_line often street.
        # HomeHarvest generic "address" often contains full string.
        
        # Location logic
        # PostGIS needs WKT Element: POINT(long lat)
        # Verify lat/long exist
        if 'latitude' in properties.columns and 'longitude' in properties.columns:
             # Ensure numeric
            lat = pd.to_numeric(properties['latitude'], errors='coerce')
            lon = pd.to_numeric(properties['longitude'], errors='coerce')
            
            df['latitude'] = lat
            df['longitude'] = lon
            
            # Construct WKT
            # Point(lon lat)
            df['location'] = [
                WKTElement(f"POINT({x} {y})", srid=4326) if pd.notnull(x) and pd.notnull(y) else None
                for x, y in zip(lon, lat)
            ]
        
        df['full_street_line'] = get_col('full_street_line')
        df['street'] = get_col('street')
        df['unit'] = get_col('unit')
        df['city'] = get_col('city')
        df['state'] = get_col('state')
        df['zip_code'] = get_col('zip_code')
        df['neighborhoods'] = get_col('neighborhoods')
        
        df['beds'] = get_col('beds')
        df['full_baths'] = get_col('full_baths')
        df['half_baths'] = get_col('half_baths')
        df['sqft'] = get_col('sqft')
        df['year_built'] = get_col('year_built')
        df['days_on_mls'] = get_col('days_on_mls')
        df['stories'] = get_col('stories')
        # new_construction might be inferred or column?
        df['new_construction'] = get_col('new_construction')
        df['lot_sqft'] = get_col('lot_sqft')
        
        df['list_price'] = get_col('list_price')
        df['sold_price'] = get_col('sold_price')
        # Dates - ensure format
        df['list_date'] = pd.to_datetime(get_col('list_date')).dt.date
        df['last_sold_date'] = pd.to_datetime(get_col('last_sold_date')).dt.date
        
        df['price_per_sqft'] = get_col('price_per_sqft')
        df['hoa_fee'] = get_col('hoa_fee')
        
        df['agent_name'] = get_col('agent') # Check col name? usually 'agent' or 'agent_name'
        df['broker_name'] = get_col('broker')
        
        df['primary_photo'] = get_col('primary_photo')
        df['alt_photos'] = get_col('alt_photos')
        
        # Add timestamp
        df['scrape_timestamp'] = datetime.now()

        # Insert to DB
        # Use simple chunk insertion
        logger.info(f"Inserting {len(df)} records into database...")
        
        # listings_mlshistory is the table name
        dtype = {
            'location': Geometry('POINT', srid=4326)
        }
        
        df.to_sql(
            'listings_mlshistory', 
            engine, 
            if_exists='append', 
            index=False, 
            dtype=dtype,
            chunksize=100
        )
        
        logger.info("Scrape and insert completed successfully.")

    except Exception as e:
        logger.error(f"Error during scrape execution: {e}", exc_info=True)

def run_scraper_for_locations(locations):
    """
    Run the scraper for multiple locations.
    
    Args:
        locations: List of location strings to scrape
    """
    logger.info(f"Starting scraper for {len(locations)} location(s): {', '.join(locations)}")
    
    successful = 0
    failed = 0
    
    for location in locations:
        try:
            run_scraper(location)
            successful += 1
        except Exception as e:
            logger.error(f"Failed to scrape {location}: {e}", exc_info=True)
            failed += 1
            # Continue with next location
    
    logger.info(f"Scraping complete. Successful: {successful}, Failed: {failed}")

if __name__ == "__main__":
    locations = []
    
    # Check for command line arguments (space-separated locations)
    if len(sys.argv) > 1:
        locations = sys.argv[1:]
    else:
        # Check for SCRAPE_LOCATIONS (semicolon-separated)
        locations_str = os.getenv("SCRAPE_LOCATIONS")
        if locations_str:
            locations = [loc.strip() for loc in locations_str.split(";") if loc.strip()]
        else:
            # Fall back to single SCRAPE_LOCATION for backward compatibility
            single_location = os.getenv("SCRAPE_LOCATION", "Boston, MA")
            locations = [single_location]
    
    run_scraper_for_locations(locations)
