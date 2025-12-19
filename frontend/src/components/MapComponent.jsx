import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// CSS can be imported statically safely
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

let HighlightIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [30, 49],
    iconAnchor: [15, 49],
    className: 'marker-highlight'
});

L.Marker.prototype.options.icon = DefaultIcon;

// Plugin Loading Hook
const useMapPlugins = () => {
    const [pluginsLoaded, setPluginsLoaded] = useState(false);

    useEffect(() => {
        const loadPlugins = async () => {
            if (typeof window !== 'undefined') {
                // Ensure L is available globally for plugins that expect it
                window.L = L;

                try {
                    await import('@geoman-io/leaflet-geoman-free');
                    await import('leaflet.heat');
                    console.log('Map plugins loaded successfully');
                    setPluginsLoaded(true);
                } catch (e) {
                    console.error("Failed to load map plugins", e);
                    // Even if plugins fail, we might want to show the map (without them)
                    setPluginsLoaded(true);
                }
            }
        };
        loadPlugins();
    }, []);

    return pluginsLoaded;
};



function HeatmapLayer({ data }) {
    const map = useMap();

    useEffect(() => {
        if (!data || data.length === 0) return;

        // Filter invalid points and ensure numbers
        const points = data
            .filter(p => p.latitude && p.longitude && !isNaN(p.latitude) && !isNaN(p.longitude))
            .map(p => [Number(p.latitude), Number(p.longitude), Number(p.intensity || 1.0)]);

        if (points.length === 0) return;

        let heat;
        try {
            heat = L.heatLayer(points, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
            }).addTo(map);
        } catch (error) {
            console.error("Failed to Initialize Heatmap Layer:", error);
        }

        return () => {
            if (heat) map.removeLayer(heat);
        };
    }, [data, map]);

    return null;
}

// Helper to convert Layer to WKT Polygon
const layerToWKT = (layer) => {
    if (!layer.getLatLngs) return null;

    const latlngsRaw = layer.getLatLngs();
    // Leaflet polygons can be nested arrays (rings)
    const latlngs = Array.isArray(latlngsRaw[0]) ? latlngsRaw[0] : latlngsRaw;

    if (!latlngs || latlngs.length === 0) return null;

    // Close the loop
    const coords = latlngs.map(ll => `${ll.lng} ${ll.lat}`);
    coords.push(`${latlngs[0].lng} ${latlngs[0].lat}`);

    return `POLYGON((${coords.join(',')}))`;
};

const GeomanControl = ({ onPolygonChange }) => {
    const map = useMap();
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (initialized) return; // Already initialized

        console.log('GeomanControl useEffect triggered');
        console.log('Map instance:', map);
        console.log('Map.pm available:', !!map.pm);

        // Function to initialize Geoman controls
        // Function to initialize Geoman controls
        const initializeGeoman = () => {
            if (!map.pm) {
                return false;
            }

            console.log('Initializing Geoman controls...');

            // Initialize Geoman Controls
            map.pm.addControls({
                position: 'topright',
                drawCircle: false,
                drawCircleMarker: false,
                drawMarker: false,
                drawPolyline: false,
                drawRectangle: false,
                drawPolygon: true,
                drawText: false,
                editMode: true,
                dragMode: false,
                cutPolygon: false,
                removalMode: true,
            });

            console.log('Geoman controls added successfully');

            // Global Options for robustness
            map.pm.setGlobalOptions({
                allowSelfIntersection: false,
                snapDistance: 20,
                continueDrawing: false, // Prevent multi-polygon drawing in one go
                editable: true,
            });

            // Handler for Creation
            map.on('pm:create', (e) => {
                console.log("Polygon Created:", e);
                const layer = e.layer;

                // Allow only one polygon: Remove others
                map.eachLayer((l) => {
                    if (l instanceof L.Polygon && l !== layer && !l._heat) { // Don't remove heatmap!
                        // Check if it's a PM layer (drawn item) vs a marker/tile
                        if (l.pm) {
                            map.removeLayer(l);
                        }
                    }
                });

                // Listen to changes on this new layer
                layer.on('pm:edit', () => {
                    onPolygonChange(layerToWKT(layer));
                });

                onPolygonChange(layerToWKT(layer));
            });

            // Handler for Removal
            map.on('pm:remove', (e) => {
                console.log("Polygon Removed:", e);
                // If we removed the active polygon
                onPolygonChange(null);
            });

            setInitialized(true);
            return true;
        };

        // Try to initialize immediately
        if (initializeGeoman()) {
            return;
        }

        // If not available, retry with a timeout
        console.log('Geoman not ready, will retry...');
        let retryCount = 0;
        const maxRetries = 50; // Max 5 seconds (50 * 100ms)

        const retryInterval = setInterval(() => {
            retryCount++;

            if (initializeGeoman()) {
                console.log('Geoman initialized successfully after retry');
                clearInterval(retryInterval);
            } else if (retryCount >= maxRetries) {
                console.error('Failed to initialize Geoman after maximum retries');
                clearInterval(retryInterval);
            }
        }, 100);

        // Cleanup function
        return () => {
            clearInterval(retryInterval);
            if (initialized && map.pm) {
                console.log('Cleaning up Geoman controls');
                map.pm.removeControls();
                map.off('pm:create');
                map.off('pm:remove');
            }
        };
    }, [map, onPolygonChange, initialized]);

    return null;
};


const MapComponent = ({ listings, heatmapData, hoveredListingId, onPolygonChange }) => {
    // Default center (Boston)
    const position = [42.3601, -71.0589];
    const pluginsLoaded = useMapPlugins();

    if (!pluginsLoaded) {
        return <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0" }}>Loading Map...</div>;
    }

    return (
        <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }}>
            {/* Plugins are already loaded globally at this point */}

            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            <GeomanControl onPolygonChange={onPolygonChange} />

            {listings.map(listing => (
                <Marker
                    key={listing.id}
                    position={[listing.latitude, listing.longitude]}
                    icon={hoveredListingId === listing.id ? HighlightIcon : DefaultIcon}
                    zIndexOffset={hoveredListingId === listing.id ? 1000 : 0}
                >
                    <Popup>
                        <div style={{ minWidth: '200px' }}>
                            <img src={listing.primary_photo} style={{ width: '100%', borderRadius: '8px', marginBottom: '8px' }} alt="Home" />
                            <strong>{listing.formatted_address}</strong><br />
                            ${Number(listing.list_price).toLocaleString()}
                        </div>
                    </Popup>
                </Marker>
            ))}

            <HeatmapLayer data={heatmapData} />
        </MapContainer>
    );
};

export default MapComponent;
