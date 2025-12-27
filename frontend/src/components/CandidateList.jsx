import React from 'react';
import {
    Dialog, DialogTitle, DialogContent,
    List, ListItem, ListItemText, ListItemAvatar, Avatar,
    Typography, Button, Box, IconButton
} from '@mui/material';
import { Close } from '@mui/icons-material';

function CandidateList({ isOpen, onClose, candidates, onStartRanking }) {
    if (!isOpen) return null;

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                    Consideration Set ({candidates.length})
                </Typography>
                <IconButton onClick={onClose}>
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {candidates.length === 0 ? (
                    <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
                        No similar candidates found within 1 mile and 2x price.
                    </Typography>
                ) : (
                    <Box>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            These properties are within 1 mile and budget range of your selected home.
                        </Typography>

                        <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
                            {candidates.map((listing) => (
                                <ListItem key={listing.id} alignItems="flex-start" divider>
                                    <ListItemAvatar>
                                        <Avatar
                                            variant="rounded"
                                            src={listing.primary_photo}
                                            alt="House"
                                            sx={{ width: 60, height: 60, mr: 2 }}
                                        />
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={listing.formatted_address}
                                        secondary={
                                            <React.Fragment>
                                                <Typography component="span" variant="body2" color="text.primary">
                                                    ${parseFloat(listing.list_price).toLocaleString()}
                                                </Typography>
                                                {` — ${listing.beds} bds, ${listing.full_baths} ba`}
                                            </React.Fragment>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>

                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button onClick={onClose} color="inherit">
                                Close
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={onStartRanking}
                                disabled={candidates.length < 2}
                            >
                                Rank This Set
                            </Button>
                        </Box>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default CandidateList;
