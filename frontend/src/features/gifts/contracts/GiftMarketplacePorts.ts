import type { GiftCommerceProduct } from '../../../domain/giftCommerce';
import type { GiftConciergeV2Plan } from '../../../domain/giftExperience';
import type { GiftOrderQuote, GiftOrderRequest, GiftOrderResponse } from './GiftModels';

export type GiftMarketplacePorts = {
  orderingMode: 'demo' | 'live' | 'blocked';
  createIdempotencyKey: () => string;
  estimateQuote: (input: GiftOrderRequest, now?: Date) => GiftOrderQuote;
  formatMoney: (cents: number) => string;
  createOrder: (input: GiftOrderRequest) => Promise<GiftOrderResponse>;
  recordRecommendationFeedback: (input: { productId: string; contextKey: string; signal: 'viewed' | 'added' | 'removed' | 'purchased' | 'substituted' | 'liked' | 'disliked' | 'delivered_positive' | 'delivered_negative'; features?: Record<string, string | number | boolean> }) => Promise<unknown>;
  requestConcierge: (input: {
    prompt: string;
    products: GiftCommerceProduct[];
    currency: 'USD' | 'CAD' | 'INR';
    fallbackBudgetMinor: number;
    relationshipStage?: 'new_match' | 'dating' | 'committed';
  }) => Promise<GiftConciergeV2Plan>;
};
