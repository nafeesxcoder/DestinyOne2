export type MarketplacePlaceCategory = 'Restaurant' | 'Cafe' | 'Hotel' | 'Wellness' | 'Tourist' | 'Activity' | 'Park' | 'Dessert' | 'Lounge' | 'Cultural';
export type MarketplacePlace = { id: string; name: string; address: string; city: string; category: MarketplacePlaceCategory; price: string; rating?: number; ratingCount?: number; openNow?: boolean; mapsUrl?: string; latitude?: number; longitude?: number };
export type MarketplacePlacePage = { places: MarketplacePlace[]; nextPageToken?: string };
export type MarketplaceSearchInput = { city: string; query?: string; category?: MarketplacePlaceCategory | 'All'; pageToken?: string };
