
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Dialog, DialogTitle, DialogContent,
    Typography, Box, IconButton, Grid, Chip,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper,
    Tabs, Tab, CircularProgress, Divider
} from '@mui/material';
import { Close, House, AttachMoney, History } from '@mui/icons-material';

const ListingDetailModal = ({ listingId, isOpen, onClose }) => {
    const [listing, setListing] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        if (isOpen && listingId) {
            fetchDetails();
        } else {
            setListing(null);
            setHistory([]);
        }
    }, [isOpen, listingId]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            // Parallel fetch: Listing Details + History
            const [resListing, resHistory] = await Promise.all([
                axios.get(`/api/listings/${listingId}/`),
                axios.get(`/api/listings/${listingId}/history/`)
            ]);

            setListing(resListing.data);
            setHistory(resHistory.data);
        } catch (error) {
            console.error("Error fetching listing details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    if (!isOpen) return null;

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            scroll="paper"
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                <Box>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                        {loading ? 'Loading...' : listing?.formatted_address}
                    </Typography>
                    {!loading && listing && (
                        <Typography variant="subtitle2" color="text.secondary">
                            {listing.city}, {listing.state} {listing.zip_code}
                        </Typography>
                    )}
                </Box>
                <IconButton onClick={onClose}><Close /></IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0 }}>
                {loading || !listing ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {/* Hero Image */}
                        {listing.primary_photo && (
                            <Box
                                component="img"
                                src={listing.primary_photo}
                                alt={listing.formatted_address}
                                sx={{ width: '100%', height: 300, objectFit: 'cover' }}
                            />
                        )}

                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={tabValue} onChange={handleTabChange} aria-label="listing details tabs">
                                <Tab icon={<House fontSize="small" />} label="Overview" iconPosition="start" />
                                <Tab icon={<History fontSize="small" />} label="History" iconPosition="start" />
                            </Tabs>
                        </Box>

                        {/* Overview Tab */}
                        <Box sx={{ p: 3 }} role="tabpanel" hidden={tabValue !== 0}>
                            {tabValue === 0 && (
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={8}>
                                        <Typography variant="h4" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
                                            ${Number(listing.list_price).toLocaleString()}
                                        </Typography>

                                        <Grid container spacing={2} sx={{ mb: 3 }}>
                                            <Grid item><Chip label={`${listing.beds} Beds`} variant="outlined" /></Grid>
                                            <Grid item><Chip label={`${listing.full_baths} Baths`} variant="outlined" /></Grid>
                                            <Grid item><Chip label={`${listing.sqft} Sqft`} variant="outlined" /></Grid>
                                            <Grid item><Chip label={`$${Math.round(listing.list_price / listing.sqft)}/sqft`} variant="outlined" /></Grid>
                                        </Grid>

                                        <Typography variant="body1" paragraph>
                                            {listing.text || "No description available."}
                                        </Typography>
                                    </Grid>

                                    <Grid item xs={12} md={4}>
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Property Details</Typography>
                                            <Divider sx={{ mb: 2 }} />
                                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                                <Typography variant="body2" color="text.secondary">MLS#</Typography>
                                                <Typography variant="body2">{listing.mls_id}</Typography>

                                                <Typography variant="body2" color="text.secondary">Type</Typography>
                                                <Typography variant="body2">{listing.style || 'Single Family'}</Typography>

                                                <Typography variant="body2" color="text.secondary">Year Built</Typography>
                                                <Typography variant="body2">{listing.year_built}</Typography>

                                                <Typography variant="body2" color="text.secondary">HOA</Typography>
                                                <Typography variant="body2">${Number(listing.hoa_fee || 0).toLocaleString()}</Typography>

                                                <Typography variant="body2" color="text.secondary">Taxes</Typography>
                                                <Typography variant="body2">${Number(listing.tax || 0).toLocaleString()}</Typography>
                                            </Box>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            )}
                        </Box>

                        {/* History Tab */}
                        <Box role="tabpanel" hidden={tabValue !== 1}>
                            {tabValue === 1 && (
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Date Checked</TableCell>
                                                <TableCell>Event</TableCell>
                                                <TableCell align="right">Price</TableCell>
                                                <TableCell align="right">$/Sqft</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {history.map((record, index) => (
                                                <TableRow key={index} hover>
                                                    <TableCell>{new Date(record.scrape_timestamp).toLocaleDateString()}</TableCell>
                                                    <TableCell>{record.status}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                        ${Number(record.list_price).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        ${Math.round(record.list_price / record.sqft).toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {history.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={4} align="center">No history records found.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ListingDetailModal;
