# Backend Documentation (`/backend`)

The backend is a **Django 5** application utilizing **Django REST Framework (DRF)** and **PostGIS** to serve geospatial property data.

## key Architecture & Apps

### 1. `listings` App (Core Data)
Manages the foundational property data.
*   **Lifecycle & Ownership**:
    *   **Ingestion**: New data is appended by the scraper as distinct snapshots (`MlsHistory` records).
    *   **Immutability**: Historical records are PRESERVED. Changes in state (e.g., price drop) result in a NEW record, not an update.
    *   **Ownership**: The Scraper owns *writes* (creation). The Backend owns *reads* and *serving*.
*   **Model: `MlsHistory`**: The primary model representing a property listing snapshot.
    *   Inherits from `ListingBase` (abstract class containing the massive schema).
    *   **Geospatial Field**: `location = models.PointField(srid=4326)` - Enables spatial queries.
*   **ViewSets**: `ListingsViewSet` filters listings by bbox, radius, or polygon.

### 2. `rankings` App (Preference Learning Engine)
> [!NOTE]
> **Status: PLANNED / TODO**
> This application is currently being designed. The specifications below represent the *intended* implementation.

Manages the subjective learning system, not just static preferences.
*   **Purpose**: Implements an **ELO-like pairwise comparison model** to infer user preferences that are difficult to express with linear filters.
*   **Data Types**:
    *   **Explicit**: Comparison results (Win/Loss/Tie).
    *   **Derived**: Relative ranking scores (floating point, essentially unitless).
*   **Status**: Core system for sorting and discovery.

### Ranking Model Overview
*   **Inputs**: Explicit pairwise comparisons (`RankingComparison`):
    *   User selects: `Listing A > Listing B`, `B > A`, or `Tie`.
*   **Model**: Online ELO-style updater.
    *   Updates are **incremental** (occur immediately after feedback).
    *   Handles **ties** as valid signal (equal preference).
*   **Outputs**:
    *   Per-listing `preference_score`.
    *   **Relative Ordering**: Scores are only meaningful relative to each other in the current snapshot.

### Comparison Lifecycle
1.  **Generation**: The system selects pairs to maximize information gain (e.g., similar scores, high uncertainty).
2.  **New Listings**:
    *   Start as `unranked` or with a seed score based on heuristic similarity.
    *   **Introduction**: New listings are prioritized for comparison against trusted anchors to "place" them in the ranking.
3.  **Feedback**: User decision triggers an immediate score update for both participants.

### Ranking History & Time
*   **Snapshots**: Scores are versioned or logged to allow historical analysis.
*   **Time Awareness**: The system supports querying:
    *   *Score at time T*.
    *   *Score distributions* (histograms) to understand market shape.
    *   *Trend analysis*: "Is the market getting better or worse for me?"

## Data Model Design
The `ListingBase` model is designed to be a comprehensive "flat" representation of MLS data to simplify analysis. It includes fields for:
*   **Core**: unique identifiers (`mls_id`), status.
*   **Location**: `latitude`, `longitude`, `city`, `zip_code`.
*   **Details**: `beds`, `baths`, `sqft`, `year_built`.
*   **Financials**: `list_price`, `sold_price`, `taxes`.

### Schema Evolution
To preserve historical integrity while iterating fast:
*   **Adding Columns**: Safe. Add nullable columns for new metrics.
*   **Modifying Columns**: Avoid changing semantics of existing columns. Create a new column instead (e.g., `features_v2`).
*   **Breaking Changes**: If a schema overhaul is needed, consider a new table/model rather than migrating the partial history.
## Database Schema Reference

The core table for querying property data is `listings_mlshistory`.

### Table: `listings_mlshistory`

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `bigint` | Primary Key |
| `listing_id` | `varchar(100)` | Unique identifier for the listing (from source) |
| `mls_id` | `varchar(100)` | MLS number / ID |
| `status` | `varchar(50)` | Listing status (e.g., 'for_sale', 'sold') |
| `list_price` | `numeric(12,2)` | Current listing price |
| `sold_price` | `numeric(12,2)` | Final sold price (if applicable) |
| `location` | `geometry(Point, 4326)` | **Geospatial Point**. Use standard PostGIS functions like `ST_Within` to query. |
| `latitude` | `float` | Latitude (redundant with location, for easy access) |
| `longitude` | `float` | Longitude (redundant with location, for easy access) |
| `formatted_address` | `text` | Full human-readable address |
| `city` | `varchar(100)` | City name |
| `state` | `varchar(50)` | State abbreviation |
| `zip_code` | `varchar(20)` | Postal code |
| `beds` | `float` | Number of bedrooms |
| `full_baths` | `float` | Number of full bathrooms |
| `sqft` | `float` | Interior square footage |
| `year_built` | `integer` | Year of construction |
| `property_url` | `text` | Link to the original listing source |
| `scrape_timestamp` | `timestamp` | Time of data ingestion |

### Table: `rankings_rankingscore` (TODO)

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `bigint` | Primary Key |
| `listing_id` | `FK (listings_mlshistory)` | One-to-One link to the listing snapshot. |
| `score` | `float` | ELO score (Relative preference). Default ~1000.0. |
| `uncertainty` | `float` | (Optional) Confidence interval for the score. |
| `last_updated` | `timestamp` | When the score most recently changed. |

### Table: `rankings_rankingcomparison` (TODO)

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `bigint` | Primary Key |
| `listing_a_id` | `FK (listings_mlshistory)` | The first listing in the pair. |
| `listing_b_id` | `FK (listings_mlshistory)` | The second listing in the pair. |
| `winner` | `varchar(10)` | Result: `'A'`, `'B'`, or `'TIE'`. |
| `timestamp` | `timestamp` | When the comparison occurred. |

#### Example SQL Query
Find all 3+ bedroom homes within 5km of a specific point, ordered by ranking score:

```sql
SELECT l.formatted_address, l.list_price, r.score
FROM listings_mlshistory l
JOIN rankings_rankingscore r ON l.id = r.listing_id
WHERE l.beds >= 3
  AND ST_DWithin(
      l.location,
      ST_SetSRID(ST_MakePoint(-71.0589, 42.3601), 4326),
      5000
  )
ORDER BY r.score DESC;
```

## REST API Reference

The Backend exposes a standard RESTful API via Django REST Framework.

### API Standards
*   **Pagination**: Limit/Offset based. Default page size = 50.
*   **Sorting**: Field-based via `?sort=`. Prefix with `-` for descending (e.g., `sort=-scrape_timestamp`).
*   **Spatial Units**: All distances in **meters**. Coordinates in WGS84 (EPSG:4326).
*   **Errors**: Returns standard HTTP 4xx/5xx codes with JSON details.

### Listings

#### `GET /api/listings/`
Retrieve a paginated list of properties. Supports extensive filtering.

**Query Parameters:**

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `polygon` | `WKT` | Filter by `POLYGON((...))`. Returns listings strictly inside the shape. |
| `bbox` | `string` | Filter by bounding box: `min_lon,min_lat,max_lon,max_lat`. |
| `price_min` | `number` | Minimum list price. |
| `price_max` | `number` | Maximum list price. |
| `beds_min` | `number` | Minimum bedrooms. |
| `baths_min` | `number` | Minimum full bathrooms. |
| `sqft_min` | `number` | Minimum square footage. |
| `status` | `string` | e.g., "for_sale" |
| `sort` | `string` | e.g. `list_price` (asc) or `-list_price` (desc). |

#### `GET /api/listings/{id}/history/`
Returns all historical records for a specific `listing_id` (e.g., price changes, status updates), ordered by `scrape_timestamp`.

#### `GET /api/listings/metrics/`
Returns a lightweight JSON dataset for generating heatmaps (lat, lon, weight).

### User Feedback & Rankings

### User Feedback & Rankings

#### `POST /api/comparisons/` (TODO)
Submit a pairwise comparison result to update ELO scores.
*   **Body**:
    ```json
    {
      "listing_a": "uuid-or-id",
      "listing_b": "uuid-or-id",
      "winner": "A" // or "B", "TIE"
    }
    ```
*   **Logic**: Triggers `EloRatingSystem.update_ratings(a, b, result)`.

#### `GET /api/comparisons/pair/` (TODO)
Returns two listings (`a` and `b`) for the user to compare.
*   *Logic*: Selects pairs using `Strategy = k * Uncertainty + (1-k) * ScoreCloseness` to maximize learning rate.

#### `GET /api/rankings/distribution/` (TODO)
Returns histogram data of current ranking scores.
*   **Response**:
    ```json
    [
      {"bin_start": 800, "count": 12},
      {"bin_start": 900, "count": 45},
      ...
    ]
    ```

#### `GET /api/preferences/{user_id}/`
Retrieves user-specific configuration (deprecated/merged into rankings).
