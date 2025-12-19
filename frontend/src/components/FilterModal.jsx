
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Box, Typography, Stack, Slider,
    IconButton
} from '@mui/material';
import { Close } from '@mui/icons-material';

const FilterModal = ({ isOpen, onClose, filters, onApply }) => {
    const [localFilters, setLocalFilters] = useState(filters);

    const handleChange = (key, value) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    const handleClear = () => {
        const cleared = {
            price_min: '', price_max: '',
            sqft_min: '', sqft_max: '',
            beds_min: '', baths_min: '',
            pps_min: '', pps_max: ''
        };
        setLocalFilters(cleared);
        onApply(cleared);
        onClose();
    };

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Advanced Filters
                <IconButton onClick={onClose}><Close /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    {/* Price Range */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Price Range</Typography>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Min Price"
                                type="number"
                                size="small"
                                fullWidth
                                value={localFilters.price_min || ''}
                                onChange={(e) => handleChange('price_min', e.target.value)}
                            />
                            <TextField
                                label="Max Price"
                                type="number"
                                size="small"
                                fullWidth
                                value={localFilters.price_max || ''}
                                onChange={(e) => handleChange('price_max', e.target.value)}
                            />
                        </Stack>
                        <Box sx={{ px: 1, mt: 2 }}>
                            <Slider
                                value={[
                                    Number(localFilters.price_min) || 0,
                                    Number(localFilters.price_max) || 5000000
                                ]}
                                onChange={(e, newValue) => {
                                    handleChange('price_min', newValue[0].toString());
                                    handleChange('price_max', newValue[1].toString());
                                }}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `$${value.toLocaleString()}`}
                                min={0}
                                max={5000000}
                                step={50000}
                                disableSwap
                            />
                        </Box>
                    </Box>

                    {/* Sqft Range */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Square Feet</Typography>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Min Sqft"
                                type="number"
                                size="small"
                                fullWidth
                                value={localFilters.sqft_min || ''}
                                onChange={(e) => handleChange('sqft_min', e.target.value)}
                            />
                            <TextField
                                label="Max Sqft"
                                type="number"
                                size="small"
                                fullWidth
                                value={localFilters.sqft_max || ''}
                                onChange={(e) => handleChange('sqft_max', e.target.value)}
                            />
                        </Stack>
                        <Box sx={{ px: 1, mt: 2 }}>
                            <Slider
                                value={[
                                    Number(localFilters.sqft_min) || 0,
                                    Number(localFilters.sqft_max) || 10000
                                ]}
                                onChange={(e, newValue) => {
                                    handleChange('sqft_min', newValue[0].toString());
                                    handleChange('sqft_max', newValue[1].toString());
                                }}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `${value.toLocaleString()} sqft`}
                                min={0}
                                max={10000}
                                step={100}
                                disableSwap
                            />
                        </Box>
                    </Box>

                    {/* Price Per Sqft */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Price per Sqft</Typography>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Min $/sqft"
                                type="number"
                                size="small"
                                fullWidth
                                value={localFilters.pps_min || ''}
                                onChange={(e) => handleChange('pps_min', e.target.value)}
                            />
                            <TextField
                                label="Max $/sqft"
                                type="number"
                                size="small"
                                fullWidth
                                value={localFilters.pps_max || ''}
                                onChange={(e) => handleChange('pps_max', e.target.value)}
                            />
                        </Stack>
                        <Box sx={{ px: 1, mt: 2 }}>
                            <Slider
                                value={[
                                    Number(localFilters.pps_min) || 0,
                                    Number(localFilters.pps_max) || 1000
                                ]}
                                onChange={(e, newValue) => {
                                    handleChange('pps_min', newValue[0].toString());
                                    handleChange('pps_max', newValue[1].toString());
                                }}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `$${value}`}
                                min={0}
                                max={1000}
                                step={10}
                                disableSwap
                            />
                        </Box>
                    </Box>

                    {/* Beds / Baths */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Minimums</Typography>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Min Beds"
                                type="number"
                                size="small"
                                fullWidth
                                value={localFilters.beds_min || ''}
                                onChange={(e) => handleChange('beds_min', e.target.value)}
                            />
                            <TextField
                                label="Min Baths"
                                type="number"
                                size="small"
                                fullWidth
                                value={localFilters.baths_min || ''}
                                onChange={(e) => handleChange('baths_min', e.target.value)}
                            />
                        </Stack>
                    </Box>

                    {/* Geo Hint */}
                    <Typography variant="caption" color="text.secondary">
                        * Use the polygon tool on the map to filter by area.
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClear} color="error">Clear All</Button>
                <Button onClick={handleApply} variant="contained" disableElevation>Apply Filters</Button>
            </DialogActions>
        </Dialog>
    );
};

export default FilterModal;
