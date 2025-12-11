import React from 'react';
import { Dialog, DialogTitle, DialogContent, FormGroup, FormControlLabel, Checkbox, IconButton, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';

const CardSettingsModal = ({ isOpen, onClose, visibleAttributes, onToggleAttribute }) => {
    const attributes = [
        { key: 'price', label: 'Price' },
        { key: 'address', label: 'Address' },
        { key: 'beds', label: 'Bedrooms' },
        { key: 'baths', label: 'Bathrooms' },
        { key: 'sqft', label: 'Square Feet' },
        { key: 'price_per_sqft', label: 'Price per Sqft' },
        { key: 'hoa_fee', label: 'HOA Fee' }
    ];

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Card Settings
                <IconButton onClick={onClose} size="small">
                    <Close />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Select which attributes to show on listing cards.
                </Typography>
                <FormGroup>
                    {attributes.map(attr => (
                        <FormControlLabel
                            key={attr.key}
                            control={
                                <Checkbox
                                    checked={visibleAttributes[attr.key]}
                                    onChange={() => onToggleAttribute(attr.key)}
                                />
                            }
                            label={attr.label}
                        />
                    ))}
                </FormGroup>
            </DialogContent>
        </Dialog>
    );
};

export default CardSettingsModal;
