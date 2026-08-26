import type { MarketplacePlacePage, MarketplaceSearchInput } from './MarketplaceModels';

export type MarketplacePorts = {
  liveSearchConfigured: boolean;
  searchPlaces: (input: MarketplaceSearchInput) => Promise<MarketplacePlacePage | null>;
};
