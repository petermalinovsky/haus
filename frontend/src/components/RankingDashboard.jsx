import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogTitle, DialogContent, Box, Typography, IconButton, CircularProgress, Stack, Paper, Button } from '@mui/material';
import { Close, RestartAlt } from '@mui/icons-material';

const RankingDashboard = ({ isOpen, onClose }) => {
    const [data, setData] = useState(null);
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const [distRes, insightRes] = await Promise.all([
                        axios.get('/api/rankings/distribution/'),
                        axios.get('/api/rankings/insights/')
                    ]);
                    setData(distRes.data);
                    setInsights(insightRes.data);
                } catch (error) {
                    console.error("Error fetching data:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [isOpen]);

    const handleReset = async () => {
        if (window.confirm("Are you sure you want to reset all rankings? This cannot be undone.")) {
            try {
                await axios.post('/api/rankings/reset/');
                onClose();
                window.location.reload();
            } catch (error) {
                console.error("Error resetting rankings:", error);
                alert("Failed to reset rankings.");
            }
        }
    };

    const renderHistogram = () => {
        if (!data || !data.bins || data.bins.length === 0) return <Typography>No ranking data yet.</Typography>;

        const maxCount = Math.max(...data.counts);

        return (
            <Box sx={{ mt: 4, height: 160, display: 'flex', alignItems: 'flex-end', gap: '2px', width: '100%', px: 2 }}>
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

    const renderInsights = () => {
        if (!insights) return null;

        return (
            <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>Feature Importance</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                    {insights.weights.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)).map(w => (
                        <Box key={w.feature_name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">{w.feature_name.replace(/_/g, ' ')}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 100, height: 4, bgcolor: 'divider', borderRadius: 2 }}>
                                    <Box sx={{
                                        width: `${Math.min(Math.abs(w.weight) * 10, 100)}%`,
                                        height: '100%',
                                        bgcolor: w.weight >= 0 ? 'success.main' : 'error.main',
                                        borderRadius: 2
                                    }} />
                                </Box>
                                <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'right' }}>
                                    {w.weight.toFixed(2)}
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Stack>

                {insights.top_neighborhoods.length > 0 && (
                    <>
                        <Typography variant="subtitle2" color="primary" sx={{ mt: 4 }} gutterBottom>Top Neighborhoods</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                            {insights.top_neighborhoods.map(nw => (
                                <Paper key={nw.neighborhood_name} variant="outlined" sx={{ px: 1.5, py: 0.5, borderRadius: 4 }}>
                                    <Typography variant="caption">{nw.neighborhood_name}</Typography>
                                </Paper>
                            ))}
                        </Box>
                    </>
                )}

                {insights.preferences.find(p => p.key === 'budget_cap') && (
                    <Box sx={{ mt: 4, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">Estimated Budget Cap</Typography>
                        <Typography variant="h6">
                            ${insights.preferences.find(p => p.key === 'budget_cap').value.toLocaleString()}
                        </Typography>
                    </Box>
                )}
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
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ py: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>Market Score Distribution</Typography>
                        <Typography variant="body2" color="text.secondary">
                            How your evaluations are distributed across all {data?.counts.reduce((a, b) => a + b, 0) || 0} listings.
                        </Typography>

                        {renderHistogram()}
                        {renderInsights()}

                        <Paper variant="outlined" sx={{ p: 2, mt: 4, bgcolor: 'background.default' }}>
                            <Stack direction="row" justifyContent="space-around">
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="h6">{data ? (data.bins.reduce((a, b) => a + b, 0) / data.bins.length).toFixed(0) : '---'}</Typography>
                                    <Typography variant="caption" color="text.secondary">Avg Market Score</Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="h6">{data ? data.counts.reduce((a, b) => a + b, 0) : '---'}</Typography>
                                    <Typography variant="caption" color="text.secondary">Sample Size</Typography>
                                </Box>
                            </Stack>
                        </Paper>

                        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<RestartAlt />}
                                onClick={handleReset}
                                size="small"
                            >
                                Reset All Rankings
                            </Button>
                        </Box>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default RankingDashboard;
