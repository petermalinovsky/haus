# Frontend Documentation (`/frontend`)

The frontend is a **React 19** application built with **Vite**, focusing on high-performance geospatial data visualization using **Leaflet**.

## Tech Stack
*   **Core**: React 19, Vite
*   **Maps**: `react-leaflet`, `leaflet`, `@geoman-io/leaflet-geoman-free` (for drawing tools)
*   **UI Framework**: Material UI (MUI)
*   **State/Data**: Axios for API requests

## Core Components

### Map Visualization (`MapComponent.jsx`)
The heart of the application. It renders a Leaflet map and plots property listings as interactive markers.
*   **Data Consumption**: Fetches listings from the backend API.
*   **Geospatial Tools**: Integrates `leaflet-geoman` to allow users to draw custom polygons for geospatial filtering (e.g., "Only show homes in this specific area").

#
## Component Functionality

### MapComponent (`MapComponent.jsx`)
The `MapComponent` is the central visualization tool. It manages the `Leaflet` map instance and handles:

1.  **Rendering Markers**: Iterates through the `listings` prop and renders a `Marker` for each property.
2.  **Geospatial Filtering (Geoman)**:
    *   Uses `@geoman-io/leaflet-geoman-free` to provide drawing tools.
    *   **Logic**: When a user draws a shape (Polygon/Rectangle), the component captures the `pm:create` event.
    *   It extracts the **WKT (Well-Known Text)** representation of the shape using `layer.toGeoJSON()` and `terraformer-wkt-parser` (or similar logic).
    *   This WKT string is then passed to the parent component to trigger an API fetch with `?polygon=POLYGON(...)`.
3.  **Ranking Visualization** (TODO / Planned):
    *   **Props**: `listings` array now includes `ranking_score` (Float).
    *   **Logic**: Markers color-coded by score percentile.
        *   Top 10% (Score > 1200): **Green**
        *   Average (Score ~1000): **Blue/Gray**
        *   Below Average: **Gray**
    *   **Helper**: `getMarkerColor(score, distributionStats)` determines the color class.

### FilterModal (`FilterModal.jsx`)
A comprehensive form that maps user inputs directly to API query parameters.

| Filter UI | API Parameter |
| :--- | :--- |
| Price Range | `price_min`, `price_max` |
| Bedrooms | `beds_min` |
| Bathrooms | `baths_min` |
| Square Feet | `sqft_min`, `sqft_max` |
| Status | `status` (e.g. 'for_sale') |

### ComparisonModal (`ComparisonModal.jsx`)
The **Training Interface** for the ranking engine.
> [!NOTE]
> **Status: UPDATE PLANNED** - Current implementation is a placeholder "Game".
*   **State Machine**:
    *   `loading`: Boolean (while fetching pair).
    *   `currentPair`: Object `{a: Listing, b: Listing}`.
    *   `sessionVotes`: Integer (count of votes in this session).
*   **Props**:
    *   `onVoteComplete`: Callback to trigger map refresh (optional).
*   **API Interactions**:
    1.  Mount -> `GET /api/comparisons/pair/` -> Set `currentPair`.
    2.  User Vote (A/B/Tie) -> `POST /api/comparisons/` -> Increment `sessionVotes`.
    3.  Success -> `GET /api/comparisons/pair/` (Loop).

### RankingDashboard (`RankingDashboard.jsx`) (TODO)
*   **Purpose**: Visualizes the `GET /api/rankings/distribution/` data.
*   **Charts**:
    *   **Score Distribution**: Bar chart (X=Bin, Y=Count).
    *   **Trend**: Line chart (X=Time, Y=Avg Score) [Future].

## User Interaction Flow
1.  **Exploration**: User pans/zooms map to identify area of interest.
2.  **Filtering**: User applies explicit filters (Price < 1M, Beds > 2).
3.  **Ranking (Future)**: User provides pairwise feedback ("I like this more than that") to train the ranking model.
4.  **Analysis**: Map updates to show the "Best" listings grounded in both facts (filters) and subjective preferences (ranking).

## Visualization & Performance
*   **Ranking Visualization (Planned)**:
    *   **Histograms**: Show the *distribution* of preference scores to see if the market has "good" inventory.
    *   **Map Overlays**: Color markers or heatmap layers by their **approximate percentile** to highlight "hot" zones.
    *   **Note**: Visualizations emphasize *relative* quality (e.g., "Top 10%") vs absolute scores.
*   **Performance Assumptions**:
    *   **Volume**: Capable of handling moderate client-side listing counts (< 2000).
    *   **Clustering**: `react-leaflet-cluster` is planned if rendering bottlenecks occur.

## State Management

The application strictly uses **URL-driven state** as the single source of truth to enable shareable searches.

*   **Contract**: Components read/write to URL Search Params.
    *   `FilterModal` -> Update URL -> Parent `useEffect` -> Fetch API -> Update Map.
*   **Limitations**:
    *   **Length**: Complex polygons may bloat URLs.
    *   **Simplicity**: No global store (Redux/Context) is intentional to reduce boilerplate.
