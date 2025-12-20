# Haus - Real Estate Analysis Platform

Haus exists to enable dynamic, preference-based exploration of real estate data, addressing the limitations of static, linear search tools (e.g., Zillow, Redfin). The system prioritizes non-linear tradeoffs (e.g., price vs square footage), subjective ranking, and spatial + historical analysis over production readiness.

## Scope & Assumptions
> [!NOTE]
> This is currently a single-user, personal tool. Design choices prioritize velocity and conceptual alignment over internal perfection.

*   **Single-User**: The system assumes a single tenant. Authentication and multi-tenancy are out of scope.
*   **Non-Goals**:
    *   Authentication / Authorization
    *   Scalability / High Availability
    *   Production Hardening (Security, extensive logging)

## System Architecture

The system follows a microservices-based architecture:

1.  **Scraper (`/scraper`)**: A Python service that aggregates property listings from real estate MLS sources using `homeharvest`. It normalizes this data and writes it directly to the PostGIS database.
2.  **Database**: A PostGIS (PostgreSQL) instance that stores property listings with their geospatial coordinates (`POINT` geometry), allowing for efficient spatial querying.
3.  **Backend (`/backend`)**: A Django REST Framework application that serves as the API layer. It connects to the PostGIS database to serve property data, handle user authentication, and manage user preferences (`rankings` app).
4.  **Frontend (`/frontend`)**: A React (Vite) application that visualizes property data on an interactive map. It consumes the Backend API to display listings and allows users to filter properties based on various criteria.

```mermaid
graph LR
    S[Scraper] -->|Writes (SQLAlchemy)| DB[(PostGIS Database)]
    B[Backend (Django)] <-->|Reads/Writes (ORM)| DB
    F[Frontend (React)] <-->|HTTP API| B
```

### Component Evolution
The components represent a data pipeline that evolves from raw ingestion to subjective analysis:
1.  **Scraper**: Appends raw immutable facts (listings) from external sources.
2.  **Backend (Listings)**: Serves these facts spatially.
3.  **Backend (Rankings)**: Layers subjective user preferences on top of facts.
4.  **Frontend**: Visualizes the intersection of facts and preferences.

## File Structure & Descriptions

### Root Directory
- [README.md](file:///home/peter/haus/README.md): Main project documentation and architectural overview.
- [docker-compose.yml](file:///home/peter/haus/docker-compose.yml): Orchestrates the full stack (DB, Backend, Frontend, Scraper) using Docker.
- [backend.md](file:///home/peter/haus/backend.md), [frontend.md](file:///home/peter/haus/frontend.md), [scraper.md](file:///home/peter/haus/scraper.md): Service-specific documentation with technical specs and API details.

### Backend (`/backend`)
- [Dockerfile](file:///home/peter/haus/backend/Dockerfile): Container definition for the Django application.
- [requirements.txt](file:///home/peter/haus/backend/requirements.txt): Python dependencies (Django, DRF, psycopg2, etc.).
- [manage.py](file:///home/peter/haus/backend/manage.py): Django's command-line utility for administrative tasks.
- [haus_config/](file:///home/peter/haus/backend/haus_config/): Core project settings.
    - [settings.py](file:///home/peter/haus/backend/haus_config/settings.py): Django configuration (database, apps, middleware).
    - [urls.py](file:///home/peter/haus/backend/haus_config/urls.py): Root URL routing and API entry points.
- [listings/](file:///home/peter/haus/backend/listings/): App managing property data and spatial queries.
    - [models.py](file:///home/peter/haus/backend/listings/models.py): Defines the `MlsHistory` PostGIS-enabled schema.
    - [views.py](file:///home/peter/haus/backend/listings/views.py): REST API logic for filtering and serving listing data.
    - [serializers.py](file:///home/peter/haus/backend/listings/serializers.py): Converts model instances to JSON.
    - [filters.py](file:///home/peter/haus/backend/listings/filters.py): Custom Django-filter logic for complex spatial/linear queries.
- [rankings/](file:///home/peter/haus/backend/rankings/): App implementing the ELO-based preference learning engine.
    - [models.py](file:///home/peter/haus/backend/rankings/models.py): Schema for `RankingScore` and `RankingComparison`.
    - [views.py](file:///home/peter/haus/backend/rankings/views.py): API for pair generation and comparison result submission.

### Frontend (`/frontend`)
- [Dockerfile](file:///home/peter/haus/frontend/Dockerfile): Container definition for the React development environment.
- [package.json](file:///home/peter/haus/frontend/package.json): Node.js dependencies and scripts (React, Vite, MUI, Leaflet).
- [vite.config.js](file:///home/peter/haus/frontend/vite.config.js): Vite configuration for builds and development server.
- [index.html](file:///home/peter/haus/frontend/index.html): Main entry-point HTML file.
- [src/](file:///home/peter/haus/frontend/src/): React source code.
    - [main.jsx](file:///home/peter/haus/frontend/src/main.jsx): Application entry point and DOM mounting.
    - [App.jsx](file:///home/peter/haus/frontend/src/App.jsx): Main container component, layout, and state orchestration.
    - [theme.js](file:///home/peter/haus/frontend/src/theme.js): Global Material UI theme customization.
    - [components/](file:///home/peter/haus/frontend/src/components/): Reusable UI pieces.
        - [MapComponent.jsx](file:///home/peter/haus/frontend/src/components/MapComponent.jsx): Leaflet map logic, markers, and Geoman drawing.
        - [FilterModal.jsx](file:///home/peter/haus/frontend/src/components/FilterModal.jsx): Sidebar/modal for setting search parameters.
        - [ComparisonModal.jsx](file:///home/peter/haus/frontend/src/components/ComparisonModal.jsx): Interface for pairwise property ranking.
        - [ListingDetailModal.jsx](file:///home/peter/haus/frontend/src/components/ListingDetailModal.jsx): Detailed view for individual properties.
    - [utils/](file:///home/peter/haus/frontend/src/utils/): Helper functions.
        - [storage.js](file:///home/peter/haus/frontend/src/utils/storage.js): Local storage persistence for session data.

### Scraper (`/scraper`)
- [Dockerfile](file:///home/peter/haus/scraper/Dockerfile): Container definition for the Python scraper service.
- [requirements.txt](file:///home/peter/haus/scraper/requirements.txt): Scraper-specific dependencies (`homeharvest`, `geoalchemy2`).
- [main.py](file:///home/peter/haus/scraper/main.py): Core data scraping logic (portal ingestion and normalization).
- [scheduler.py](file:///home/peter/haus/scraper/scheduler.py): Logic for periodic task execution and initial DB checks.

> [!TIP]
> **Technical Implementation**: For detailed database schemas, ELO algorithms, and component specs, see:
> *   [Backend Technical & API Specs](backend.md#table-rankings_rankingscore)
> *   [Frontend Component Specs](frontend.md#comparisonmodal-comparisonmodaljsx)

## Core System: Preference Learning
Haus is fundamentally a **preference learning engine**. It assumes that:
*   User preferences are **non-linear** and hard to articulate with filters alone.
*   **Pairwise comparisons** (A vs B) are the most reliable way to capture these subjective trade-offs.
*   The system uses an **ELO-like** model to infer relative rankings, adapting over time as new listings appear and tastes evolve.

## Getting Started

### Prerequisites
*   Docker & Docker Compose
*   Git

### Installation & Running

1.  Clone the repository:
    ```bash
    git clone <repository_url>
    cd haus
    ```

2.  Start the application stack:
    ```bash
    docker compose up --build
    ```

    This command spins up the Database, Backend (port 8000), Frontend (port 3000), and Scraper services.

## Environment Configuration

All core configuration is managed via environment variables found in `docker-compose.yml`.

| Variable | Service | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | All | `postgis://...` | Connection string for PostGIS. |
| `SCRAPE_LOCATIONS` | Scraper | `"Boston, MA;..."` | Semicolon-separated list of target cities. |
| `DEBUG` | Backend | `"True"` | Toggles Django debug mode. |
| `NODE_ENV` | Frontend | `development` | Node environment mode. |
| `POSTGRES_DB` | DB | `haus` | Database name. |
## Glossary
*   **MlsHistory**: A single snapshot of a listing's state at a specific time. A property may have multiple `MlsHistory` records.
*   **Ranking**: A derived score tailored to the user's non-linear preferences.
*   **Preference**: A user-defined weight or rule (e.g., "Penalize locations > 5km from downtown").

## Lightweight Roadmap
1.  **Preference-Based Ranking**: Implement the **ELO-style pairwise comparison model** to sort listings by subjective score.
2.  **Incremental Learning**: Mechanism to introduce new listings into the ranking pool specifically via comparisons.
3.  **Spatial Visualization**: Heatmaps showing "high score" zones and ranking score distributions.
4.  **Historical Trends**: Analysis of price/inventory and preference alignment over time.

## Ranking System Guarantees
To set expectations for the single-user design:
*   **Relative Truth**: Scores are relative comparisons, not absolute objective quality.
*   **Shifting Baselines**: A listing's score may change as *other* listings are entered or as new feedback is provided.
*   **Persistence**: Historical ranking data is never deleted, enabling "time-travel" analysis of preferences.

**Trade-offs**: Speed > Polish; Intent > Implementation Details. Breaking changes are acceptable if historical data is preserved.

## Module Documentation

For detailed developer guides on each component, please refer to:

*   [**Frontend Documentation**](./frontend.md): Details on the React/Leaflet map implementation and component structure.
*   [**Backend Documentation**](./backend.md): Information on the Django/PostGIS data models and API services.
*   [**Scraper Documentation**](./scraper.md): Explanation of the data ingestion pipeline and scheduling.
