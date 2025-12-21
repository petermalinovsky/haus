import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogTitle, DialogContent, Box, Card, CardActionArea, CardMedia, CardContent, Typography, Stack, IconButton, CircularProgress, Button } from '@mui/material';
import { Close } from '@mui/icons-material';
import MapComponent from './MapComponent';

const ComparisonModal = ({ isOpen, onClose, onVote }) => {
    const [pair, setPair] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchPair = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/comparisons/pair/');
            setPair(res.data);
        } catch (error) {
            console.error("Error fetching pair:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchPair();
        }
    }, [isOpen]);

    const handleVote = async (winner) => {
        if (!pair) return;
        setLoading(true);
        try {
            await axios.post('/api/comparisons/', {
                listing_a_id: pair.a.id,
                listing_b_id: pair.b.id,
                winner: winner
            });
            // Notify parent to refresh listings if needed
            if (onVote) {
                onVote();
            }
            // Fetch next pair
            fetchPair();
        } catch (error) {
            console.error("Error submitting vote:", error);
            setLoading(false);
        }
    };

    const ComparisonCard = ({ listing, winner }) => (
        <Card sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardActionArea
                onClick={() => handleVote(winner)}
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}
            >
                <CardMedia
                    component="img"
                    height="240"
                    image={listing.primary_photo}
                    alt={listing.formatted_address}
                />
                <CardContent sx={{ width: '100%' }}>
                    <Typography variant="h6" gutterBottom noWrap>
                        {listing.formatted_address}
                    </Typography>
                    <Typography variant="h5" color="primary" fontWeight="bold">
                        ${Number(listing.list_price).toLocaleString()}
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 1, color: 'text.secondary' }}>
                        <Typography variant="body2">{listing.beds} Beds</Typography>
                        <Typography variant="body2">{listing.full_baths} Baths</Typography>
                        <Typography variant="body2">{listing.sqft} Sqft</Typography>
                    </Stack>
                    <Button variant="contained" fullWidth sx={{ mt: 2 }} disableElevation>
                        Prefer This
                    </Button>
                </CardContent>
            </CardActionArea>
        </Card>
    );

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Preference Learning
                <IconButton onClick={onClose} size="small"><Close /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {loading && !pair ? (
                        <CircularProgress />
                    ) : pair ? (
                        <>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="stretch" width="100%">
                                <ComparisonCard listing={pair.a} winner="A" />

                                <Box sx={{
                                    alignSelf: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    alignItems: 'center'
                                }}>
                                    <Box sx={{
                                        p: 2,
                                        borderRadius: '50%',
                                        bgcolor: 'background.paper',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        fontWeight: 'bold'
                                    }}>
                                        VS
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        onClick={() => handleVote('TIE')}
                                        sx={{ minWidth: 80 }}
                                    >
                                        Tie
                                    </Button>
                                </Box>

                                <ComparisonCard listing={pair.b} winner="B" />
                            </Stack>

                            <Box sx={{ width: '100%', height: 300, mt: 4, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                                <MapComponent
                                    listings={[pair.a, pair.b]}
                                    showControls={false}
                                    showHeatmap={false}
                                    autoFitBounds={true}
                                />
                            </Box>

                            {loading && (
                                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.5)', zIndex: 1 }}>
                                    <CircularProgress />
                                </Box>
                            )}
                        </>
                    ) : (
                        <Typography>No listings available for comparison</Typography>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ComparisonModal;
