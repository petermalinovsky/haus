# Scraper Documentation (`/scraper`)

The scraper is a standalone Python service aimed at aggregating real estate data and populating the database.

## Architecture

To ensure decoupling and performance, the scraper **bypasses the Django API** and writes directly to the PostGIS database using **SQLAlchemy** and **GeoAlchemy2**.

### Tech Stack
*   **Extraction**: `homeharvest` (Python library for scraping real estate portals).
*   **Data Processing**: `pandas` for data cleaning and normalization.
*   **Storage**: `SQLAlchemy` + `geoalchemy2` for direct PostGIS insertion.
*   **Scheduling**: `schedule` library for periodic automated runs.

## Workflow

1.  **Trigger**:
    *   **Startup**: Checks if the database is empty (`is_database_empty()` in `scheduler.py`). If yes, runs an initial scrape.
    *   **Scheduled**: Runs daily at **02:00 AM**.
2.  **Execution (`main.py`)**:
    *   Reads `SCRAPE_LOCATIONS` from environment variables.
    *   Iterates through each location.
    *   Fetches "for_sale" listings via `homeharvest`.
    *   cleans data and constructs a `WKTElement` (Well-Known Text) for the `POINT` geometry.
    *   Inserts/Appends data to the `listings_mlshistory` table.

## Interaction with Rankings (`listings_mlshistory` only)
*   **Separation of Concerns**: The Scraper **never** calculates or touches ranking scores. It deals strictly with objective facts.
*   **New Listings**:
    *   When the scraper inserts a new `MlsHistory` record, it implicitly enters the system as `unranked`.
    *   The ranking system (Backend) asynchronously detects these new candidates for comparison.
*   **No Auto-Ranking**: The scraper should not attempt to "guess" a score. Ranking is the domain of the `rankings` app.

## Configuration

*   **`SCRAPE_LOCATIONS`**: Semicolon-separated string of target locations (e.g., "San Francisco, CA; Oakland, CA").
*   **`DATABASE_URL`**: PostGIS connection string.

## Development

You can run the scraper manually for testing:

```bash
# Run for specific locations (bypassing scheduler)
python main.py "New York, NY" "Brooklyn, NY"
```

## Operational Constraints

*   **Idempotency**: The scraper is designed to be **append-only**. Running it multiple times may produce duplicate snapshots for the same day. Downstream analysis handles this by selecting `DISTINCT ON (mls_id, scrape_date)`.
*   **Failure Modes**:
    *   **Source Changes**: If MLS source structures change, the scraper fails fast. Check `docker logs haus_scraper`.
    *   **Permissions**: The scraper has `INSERT` permission on `listings_mlshistory`. It does NOT read or delete user preferences.

## Extending the Scraper

### adding Locations
Simply update the `SCRAPE_LOCATIONS` environment variable in `docker-compose.yml`.

### Adding Fields
1.  **Capture**: ensure `homeharvest` or the cleaning logic captures the new data point.
2.  **Schema**: Add a nullable column to the PostgreSQL `listings_mlshistory` table.
3.  **Model**: Update the SQLAlchemy model mapping in the scraper code.
> [!WARNING]
> Changing the schema requires corresponding updates in the Django Backend `models.py` to prevent read errors.
