import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogTitle, DialogContent, Box, Card, CardActionArea, CardMedia, CardContent, Typography, Stack, IconButton, CircularProgress } from '@mui/material';
import { Close } from '@mui/icons-material';

const ComparisonModal = ({ isOpen, onClose, userId = 'default_user' }) => {
    const [pair, setPair] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchPair = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/feedback/pair/');
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

    const handleVote = async (winnerId, loserId) => {
        setLoading(true); // Show loading while fetching next
        try {
            await axios.post('/api/feedback/', {
                user_id: userId,
                winner_listing_id: winnerId,
                loser_listing_id: loserId
            });
            // Fetch next pair
            fetchPair();
        } catch (error) {
            console.error("Error submitting vote:", error);
            setLoading(false);
        }
    };

    const ComparisonCard = ({ listing, opponentId }) => (
        <Card sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardActionArea
                onClick={() => handleVote(listing.listing_id, opponentId)}
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
                </CardContent>
            </CardActionArea>
        </Card>
    );

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Preference Learning
                <IconButton onClick={onClose} size="small"><Close /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loading || !pair ? (
                        <CircularProgress />
                    ) : (
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="center" width="100%">
                            <ComparisonCard listing={pair.a} opponentId={pair.b.listing_id} />

                            <Box sx={{
                                alignSelf: 'center',
                                p: 2,
                                borderRadius: '50%',
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                fontWeight: 'bold'
                            }}>
                                VS
                            </Box>

                            <ComparisonCard listing={pair.b} opponentId={pair.a.listing_id} />
                        </Stack>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ComparisonModal;
