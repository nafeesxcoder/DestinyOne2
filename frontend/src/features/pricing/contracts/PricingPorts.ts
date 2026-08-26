import type { StoreProductSelection } from '../../../domain/storeCatalog';

export type PricingPorts = {
  serverMode: boolean;
  previewEntitlementsAllowed: boolean;
  restorePreviewPurchases: () => Promise<Array<{ key: string }>>;
  storeBilling: {
    buy: (selection: StoreProductSelection) => Promise<unknown>;
    restore: () => Promise<Array<{ key: string }>>;
  };
};
