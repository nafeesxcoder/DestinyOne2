import type { StoreProductSelection } from '../../domain/storeCatalog';

const unavailable = () => new Error(
  'Purchases are disabled in the frontend preview. Connect the AWS payments port in the employee-owned integration project.',
);

/** Safe frontend-only billing adapter. It never contacts a store or creates an entitlement. */
export function usePreviewStoreBilling() {
  return {
    connected: false,
    buy: async (_selection: StoreProductSelection): Promise<never> => Promise.reject(unavailable()),
    restore: async (): Promise<Array<{ key: string }>> => [],
  };
}
