import React from 'react';
import { Card, CardContent, CardMedia, Typography, Box, Stack, Chip } from '@mui/material';

const ListingCard = ({ listing, visibleAttributes, onHover, onSelect }) => {
    // Calculate derived fields if not present
    const pricePerSqft = listing.sqft && listing.list_price
        ? Math.round(listing.list_price / listing.sqft)
        : null;

    return (
        <Card
            onMouseEnter={() => onHover(listing.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(listing.id)}
            sx={{ mb: 2, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}
        >
            {listing.primary_photo && (
                <CardMedia
                    component="img"
                    height="200"
                    image={listing.primary_photo}
                    alt={listing.formatted_address}
                />
            )}
            <CardContent>
                {visibleAttributes.price && (
                    <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
                        ${Number(listing.list_price).toLocaleString()}
                    </Typography>
                )}

                {visibleAttributes.address && (
                    <Typography variant="subtitle1" gutterBottom sx={{ lineHeight: 1.2 }}>
                        {listing.formatted_address}
                    </Typography>
                )}

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {visibleAttributes.beds && <Chip label={`${listing.beds} bds`} size="small" variant="outlined" />}
                    {visibleAttributes.baths && <Chip label={`${listing.full_baths} ba`} size="small" variant="outlined" />}
                    {visibleAttributes.sqft && <Chip label={`${listing.sqft} sqft`} size="small" variant="outlined" />}
                    {visibleAttributes.price_per_sqft && pricePerSqft && (
                        <Chip label={`$${pricePerSqft}/sqft`} size="small" variant="outlined" />
                    )}
                    {visibleAttributes.hoa_fee && listing.hoa_fee && (
                        <Chip label={`HOA: $${Number(listing.hoa_fee).toLocaleString()}`} size="small" variant="outlined" />
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
};

const ListingCardStack = ({ listings, visibleAttributes, onHoverListing, onSelectListing }) => {
    return (
        <Box sx={{ width: 400, height: '100%', overflowY: 'auto', p: 2, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper', zIndex: 10 }}>
            {listings.map(listing => (
                <ListingCard
                    key={listing.id}
                    listing={listing}
                    visibleAttributes={visibleAttributes}
                    onHover={onHoverListing}
                    onSelect={onSelectListing}
                />
            ))}
        </Box>
    );
};

export default ListingCardStack;
