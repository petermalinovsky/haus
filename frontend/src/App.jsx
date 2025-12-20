import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MapComponent from './components/MapComponent';
import ListingCardStack from './components/ListingCardStack';
import ComparisonModal from './components/ComparisonModal';
import CardSettingsModal from './components/CardSettingsModal';
import ListingDetailModal from './components/ListingDetailModal';
import FilterModal from './components/FilterModal';
import { storage } from './utils/storage';

import { ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Button, Box, Select, MenuItem, IconButton, Badge } from '@mui/material';
import { ArrowUpward, ArrowDownward, Settings, CompareArrows, FilterList } from '@mui/icons-material';
import theme from './theme';

function App() {
  const [listings, setListings] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleAttributes, setVisibleAttributes] = useState(storage.load('visible_attributes', {
    price: true,
    address: true,
    beds: true,
    baths: true,
    sqft: true,
    price_per_sqft: false,
    hoa_fee: false
  }));



  const [hoveredListingId, setHoveredListingId] = useState(null);
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [filters, setFilters] = useState(storage.load('filters', {}));
  const [polygonWkt, setPolygonWkt] = useState(storage.load('polygon_wkt', null));

  const [sortBy, setSortBy] = useState(storage.load('sort_by', 'list_price'));
  const [sortOrder, setSortOrder] = useState(storage.load('sort_order', 'asc'));

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const getSortedListings = () => {
    const sorted = [...listings].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      // Handle derived fields
      if (sortBy === 'price_per_sqft') {
        valA = a.list_price && a.sqft ? Number(a.list_price) / Number(a.sqft) : 0;
        valB = b.list_price && b.sqft ? Number(b.list_price) / Number(b.sqft) : 0;
      } else {
        // Ensure numeric comparison for standard fields (mostly numbers)
        // If they are strings, this parses them. If text (like address), it becomes NaN but we don't sort by address often.
        // Actually address is text. We should check field type.
        if (['list_price', 'beds', 'full_baths', 'sqft', 'hoa_fee'].includes(sortBy)) {
          valA = Number(valA);
          valB = Number(valB);
        }
      }

      // Handle nulls / NaN
      if (valA === null || valA === undefined || isNaN(valA)) valA = -Infinity;
      if (valB === null || valB === undefined || isNaN(valB)) valB = -Infinity;

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const toggleAttribute = (key) => {
    setVisibleAttributes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Persistence Effects
  useEffect(() => {
    storage.save('visible_attributes', visibleAttributes);
  }, [visibleAttributes]);

  useEffect(() => {
    storage.save('filters', filters);
  }, [filters]);

  useEffect(() => {
    storage.save('polygon_wkt', polygonWkt);
  }, [polygonWkt]);

  useEffect(() => {
    storage.save('sort_by', sortBy);
  }, [sortBy]);

  useEffect(() => {
    storage.save('sort_order', sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = { ...filters };
        if (polygonWkt) {
          params.polygon = polygonWkt;
        }

        // Fetch listings (Paginated, Page 1)
        const resListings = await axios.get('/api/listings/', { params });
        setListings(resListings.data.results);

        // Fetch Heatmap Data (All items, simplified)
        // We also apply filters to heatmap for consistency
        const resMetrics = await axios.get('/api/listings/metrics/', { params });
        const data = resMetrics.data
          .filter(l => l.latitude && l.longitude)
          .map(l => ({
            latitude: l.latitude,
            longitude: l.longitude,
            intensity: l.list_price ? Number(l.list_price) / 1000000 : 0.5
          }));
        setHeatmapData(data);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, polygonWkt]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
        <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary' }}>
              Haus
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Select
                  value={sortBy}
                  onChange={handleSortChange}
                  size="small"
                  sx={{ height: 40, minWidth: 120 }}
                >
                  <MenuItem value="list_price">Price</MenuItem>
                  <MenuItem value="beds">Beds</MenuItem>
                  <MenuItem value="full_baths">Baths</MenuItem>
                  <MenuItem value="sqft">Sqft</MenuItem>
                  <MenuItem value="price_per_sqft">$/Sqft</MenuItem>
                  <MenuItem value="hoa_fee">HOA</MenuItem>
                </Select>

                <IconButton onClick={toggleSortOrder} color="primary" sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  {sortOrder === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
                </IconButton>
              </Box>

              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => setIsFilterOpen(true)}
                sx={{ borderColor: 'divider', color: 'text.secondary' }}
              >
                Filters
              </Button>

              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => setIsSettingsOpen(true)}
                sx={{ borderColor: 'divider', color: 'text.secondary' }}
              >
                Display
              </Button>

              <Button
                variant="contained"
                startIcon={<CompareArrows />}
                onClick={() => setIsRankingOpen(true)}
                disableElevation
              >
                Rankings
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          <Box sx={{ flex: 1, position: 'relative' }}>
            <MapComponent
              listings={listings}
              heatmapData={heatmapData}
              hoveredListingId={hoveredListingId}
              onPolygonChange={setPolygonWkt}
              polygonWkt={polygonWkt}
            />
          </Box>

          <ListingCardStack
            listings={getSortedListings()}
            visibleAttributes={visibleAttributes}
            onHoverListing={setHoveredListingId}
            onSelectListing={setSelectedListingId}
          />
        </Box>

        <ComparisonModal isOpen={isRankingOpen} onClose={() => setIsRankingOpen(false)} />
        <CardSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          visibleAttributes={visibleAttributes}
          onToggleAttribute={toggleAttribute}
        />
        <ListingDetailModal
          isOpen={!!selectedListingId}
          listingId={selectedListingId}
          onClose={() => setSelectedListingId(null)}
        />
        <FilterModal
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filters={filters}
          onApply={setFilters}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
