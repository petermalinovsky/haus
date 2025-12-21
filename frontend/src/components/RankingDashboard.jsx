import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogTitle, DialogContent, Box, Typography, IconButton, CircularProgress, Stack, Paper } from '@mui/material';
import { Close } from '@mui/icons-material';

const RankingDashboard = ({ isOpen, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const res = await axios.get('/api/rankings/distribution/');
                    setData(res.data);
                } catch (error) {
                    console.error("Error fetching distribution:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [isOpen]);

    const renderHistogram = () => {
        if (!data || !data.bins || data.bins.length === 0) return <Typography>No ranking data yet.</Typography>;

        const maxCount = Math.max(...data.counts);

        return (
            <Box sx={{ mt: 4, height: 200, display: 'flex', alignItems: 'flex-end', gap: '2px', width: '100%', px: 2 }}>
                {data.counts.map((count, i) => {
                    const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                        <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Box
                                sx={{
                                    width: '100%',
                                    height: `${height}%`,
                                    bgcolor: 'primary.main',
                                    borderRadius: '4px 4px 0 0',
                                    minHeight: count > 0 ? 2 : 0,
                                    position: 'relative'
                                }}
                                title={`Count: ${count}`}
                            />
                            <Typography variant="caption" sx={{ fontSize: '8px', mt: 0.5, transform: 'rotate(-45deg)', height: 20 }}>
                                {Math.round(data.bins[i])}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        );
    };

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Ranking Insights
                <IconButton onClick={onClose} size="small"><Close /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ py: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Market Score Distribution</Typography>
                    <Typography variant="body2" color="text.secondary">
                        How your property evaluations are distributed across the market.
                    </Typography>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        renderHistogram()
                    )}

                    <Paper variant="outlined" sx={{ p: 2, mt: 6, bgcolor: 'background.default' }}>
                        <Stack direction="row" justifyContent="space-around">
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h6">{data ? (data.bins.reduce((a, b) => a + b, 0) / data.bins.length).toFixed(0) : '---'}</Typography>
                                <Typography variant="caption" color="text.secondary">Avg Score</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h6">{data ? data.counts.reduce((a, b) => a + b, 0) : '---'}</Typography>
                                <Typography variant="caption" color="text.secondary">Comparisons</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default RankingDashboard;
