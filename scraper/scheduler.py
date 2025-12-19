import time
import schedule
import subprocess
import os
import logging
import sys

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - SCHEDULER - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Parse locations from environment
locations_str = os.getenv("SCRAPE_LOCATIONS")
if locations_str:
    LOCATIONS = [loc.strip() for loc in locations_str.split(";") if loc.strip()]
else:
    # Fall back to single SCRAPE_LOCATION for backward compatibility
    single_location = os.getenv("SCRAPE_LOCATION", "Boston, MA")
    LOCATIONS = [single_location]


def job():
    logger.info(f"Triggering daily scrape for {len(LOCATIONS)} location(s): {', '.join(LOCATIONS)}...")
    try:
        # Run main.py as a subprocess with all locations
        result = subprocess.run(
            ["python", "main.py"] + LOCATIONS, 
            capture_output=True, 
            text=True
        )
        logger.info("Scraper Output:")
        print(result.stdout)
        
        if result.returncode != 0:
            logger.error(f"Scraper failed with error:\n{result.stderr}")
        else:
            logger.info("Scrape job finished successfully.")
            
    except Exception as e:
        logger.error(f"Failed to run scrape job: {e}")


from sqlalchemy import create_engine, text

def is_database_empty():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return False
    
    if db_url.startswith("postgis://"):
        db_url = db_url.replace("postgis://", "postgresql://")
        
    try:
        engine = create_engine(db_url)
        with engine.connect() as connection:
            # Check if table exists
            result = connection.execute(text("SELECT to_regclass('public.listings_mlshistory')"))
            if not result.scalar():
                logger.info("Table 'listings_mlshistory' does not exist. Treating as empty.")
                return True
                
            result = connection.execute(text("SELECT count(*) FROM listings_mlshistory"))
            count = result.scalar()
            logger.info(f"Database contains {count} records.")
            return count == 0
    except Exception as e:
        logger.error(f"Error checking database state: {e}")
        # If we can't check, typically safest not to spam, but request was "if empty". 
        # If error (e.g. db down), scraper will likely fail too. 
        # Let's fail safe and NOT run, or retry? 
        # User wants initialization. Let's return False to stick to schedule if unsure, 
        # but if table missing exception, we handled above.
        return False

if __name__ == "__main__":
    logger.info(f"Starting Scheduler. Targets: {', '.join(LOCATIONS)}. Schedule: Daily at 02:00 AM.")
    
    # Check emptiness and run if needed
    if is_database_empty():
        logger.info("Database is empty. Running initial scrape job...")
        job()
    else:
        logger.info("Database is not empty. Waiting for scheduled run.")
    
    # Schedule
    schedule.every().day.at("02:00").do(job)
    
    while True:
        schedule.run_pending()
        time.sleep(60)

