import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Typography } from '@mui/material';
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

// Helper to convert WKT Polygon to Leaflet latlngs
const wktToLayer = (wkt) => {
    if (!wkt || !wkt.startsWith('POLYGON')) return null;
    try {
        const coordsStr = wkt.match(/\(\((.*)\)\)/)[1];
        const pairs = coordsStr.split(',');
        // Remove last point if it's the same as the first (closed loop in WKT)
        if (pairs.length > 1 && pairs[0] === pairs[pairs.length - 1]) {
            pairs.pop();
        }
        return pairs.map(p => {
            const [lng, lat] = p.trim().split(' ').map(Number);
            return [lat, lng];
        });
    } catch (e) {
        console.error("Failed to parse WKT:", e);
        return null;
    }
};

const GeomanControl = ({ onPolygonChange, polygonWkt }) => {
    const map = useMap();
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (initialized) return; // Already initialized

        const initializeGeoman = () => {
            if (!map.pm) {
                return false;
            }

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

            // Global Options
            map.pm.setGlobalOptions({
                allowSelfIntersection: false,
                snapDistance: 20,
                continueDrawing: false,
                editable: true,
            });

            // Handle initial polygon if exists
            if (polygonWkt) {
                const latlngs = wktToLayer(polygonWkt);
                if (latlngs) {
                    const layer = L.polygon(latlngs).addTo(map);
                    // Enable Geoman on this layer
                    if (layer.pm) {
                        layer.pm.enable();
                        // Listen for edits
                        layer.on('pm:edit', () => {
                            onPolygonChange(layerToWKT(layer));
                        });
                    }
                }
            }

            // Handler for Creation
            map.on('pm:create', (e) => {
                const layer = e.layer;

                // Allow only one polygon: Remove others
                map.eachLayer((l) => {
                    if (l instanceof L.Polygon && l !== layer && !l._heat) {
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
                onPolygonChange(null);
            });

            setInitialized(true);
            return true;
        };

        // Try to initialize immediately or retry
        if (!initializeGeoman()) {
            let retryCount = 0;
            const maxRetries = 50;
            const retryInterval = setInterval(() => {
                retryCount++;
                if (initializeGeoman()) {
                    clearInterval(retryInterval);
                } else if (retryCount >= maxRetries) {
                    clearInterval(retryInterval);
                }
            }, 100);
            return () => clearInterval(retryInterval);
        }

        return () => {
            if (initialized && map.pm) {
                map.pm.removeControls();
                map.off('pm:create');
                map.off('pm:remove');
            }
        };
    }, [map, onPolygonChange, initialized, polygonWkt]);

    return null;
};


const MapComponent = ({
    listings = [],
    heatmapData = [],
    hoveredListingId,
    onPolygonChange,
    polygonWkt,
    showControls = true,
    showHeatmap = true,
    autoFitBounds = false
}) => {
    // Default center (Boston)
    const position = [42.3601, -71.0589];
    const pluginsLoaded = useMapPlugins();

    // Internal component to handle bounds fitting
    const BoundsHandler = () => {
        const map = useMap();
        useEffect(() => {
            const validListings = listings.filter(l => l.latitude && l.longitude);
            if (autoFitBounds && validListings.length > 0) {
                const bounds = L.latLngBounds(validListings.map(l => [l.latitude, l.longitude]));
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }, [map, listings, autoFitBounds]);
        return null;
    };

    if (!pluginsLoaded) {
        return <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0" }}>Loading Map...</div>;
    }

    // Calculate percentiles
    const sortedScores = [...listings].map(l => l.ranking_score || 1000).sort((a, b) => a - b);
    const getPercentile = (score) => {
        if (sortedScores.length === 0) return 50;
        const index = sortedScores.indexOf(score);
        return (index / sortedScores.length) * 100;
    };

    const getMarkerIcon = (score, isHovered) => {
        const percentile = getPercentile(score);
        let color = '#757575'; // default grey
        if (percentile >= 80) color = '#2e7d32'; // dark green (Best)
        else if (percentile >= 60) color = '#4caf50'; // green
        else if (percentile >= 40) color = '#ffeb3b'; // yellow
        else if (percentile >= 20) color = '#ff9800'; // orange
        else color = '#f44336'; // red (Worst)

        const size = isHovered ? 24 : 14;

        return L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="
                background-color: ${color};
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 0 4px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            popupAnchor: [0, -size / 2]
        });
    };

    return (
        <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            {showControls && <GeomanControl onPolygonChange={onPolygonChange} polygonWkt={polygonWkt} />}
            {autoFitBounds && <BoundsHandler />}

            {listings.map(listing => (
                <Marker
                    key={listing.id}
                    position={[listing.latitude, listing.longitude]}
                    icon={getMarkerIcon(listing.ranking_score || 1000, hoveredListingId === listing.id)}
                    zIndexOffset={hoveredListingId === listing.id ? 1000 : 0}
                >
                    <Popup>
                        <div style={{ minWidth: '200px' }}>
                            <img src={listing.primary_photo} style={{ width: '100%', borderRadius: '8px', marginBottom: '8px' }} alt="Home" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{listing.formatted_address}</Typography>
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                                ${Number(listing.list_price).toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Rank: {Math.round(getPercentile(listing.ranking_score || 1000))}% tile
                            </Typography>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {showHeatmap && <HeatmapLayer data={heatmapData} />}
        </MapContainer>
    );
};

export default MapComponent;
