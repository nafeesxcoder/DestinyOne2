import type { GiftCountry, GiftCurrency } from '../../../domain/giftCommerce';

export type GiftDeliveryProvider = 'demo_local' | 'doordash_drive' | 'uber_direct';
export type GiftServiceLevel = 'on_demand' | 'same_day' | 'scheduled';
export type GiftEtaConfidence = 'fast' | 'same_day' | 'scheduled';
export type GiftDeliveryWindow = 'asap' | 'today' | 'scheduled';
export type GiftDeliverySlot = 'recipient_choice' | 'morning' | 'afternoon' | 'evening';
export type GiftRecipientAvailability = 'confirm_before_dispatch' | 'available' | 'not_sure';
export type GiftConfirmationStatus = 'sent' | 'queued' | 'preview_only' | 'failed';
export type GiftFulfillmentStatus = 'recipient_pending' | 'recipient_accepted' | 'payment_authorized' | 'merchant_preparing' | 'courier_assigned' | 'picked_up' | 'delivered' | 'cancelled' | 'failed';
export type GiftStepStatus = 'done' | 'active' | 'pending';

export type GiftFulfillmentStep = {
  key: 'request' | 'recipient' | 'payment' | 'partner' | 'delivery';
  label: string;
  body: string;
  status: GiftStepStatus;
  eta?: string;
};

export type GiftOrderQuote = {
  quoteId: string; provider: GiftDeliveryProvider; providerLabel: string; productId: string; productName: string;
  serviceLevel: GiftServiceLevel; serviceLevelLabel: string; itemSubtotalCents: number; addOnSubtotalCents: number;
  deliveryFeeCents: number; distanceFeeCents: number; rushFeeCents: number; smallOrderFeeCents: number;
  serviceFeeCents: number; estimatedTaxCents: number; discountCents: number; tipCents: number;
  refundableAuthorizationCents: number; finalPayableCents: number; totalCents: number; currency: GiftCurrency;
  pricingVersion: string; quotedAt: string; deliveryCity: string; deliveryWindow: GiftDeliveryWindow;
  deliveryWindowLabel: string; estimatedDistanceMiles: number; exactRoutePending: boolean; etaMinutesMin: number;
  etaMinutesMax: number; etaLabel: string; etaConfidence: GiftEtaConfidence; pickupPartnerName: string;
  providerRecommendation: string; providerCapability: string; paymentPolicy: string; cancellationPolicy: string;
  supportPolicy: string; acceptanceWindowMinutes: number; quoteValidMinutes: number; recipientPrivacy: string;
  acceptanceExpiresAt: string; expiresAt: string;
};

export type GiftConfirmationChannel = { channel: 'in_app' | 'email' | 'push' | 'sms'; audience: 'sender' | 'recipient'; label: string; status: GiftConfirmationStatus; detail: string };
export type GiftConfirmationPlan = { channels: GiftConfirmationChannel[]; emailAdapter: 'developer_required' | 'configured'; senderReceiptLabel: string; recipientRequestLabel: string };
export type GiftFulfillmentPlanItem = { title: string; body: string; owner: 'app' | 'recipient' | 'payment' | 'provider' | 'support'; ready: boolean };
export type GiftOrderSummary = { headline: string; body: string; cta: string; tone: 'waiting' | 'active' | 'success' | 'support' };

export type GiftDeliveryAddress = { recipientName: string; line1: string; line2?: string; city: string; region: string; postalCode: string; country: 'US' | 'CA' | 'IN'; phone?: string; instructions?: string };
export type GiftAddressSuggestion = GiftDeliveryAddress & { id: string; label: string; source: 'preview' | 'google_places' };
export type GiftOrderRequest = {
  contractVersion?: 'gift-checkout-v2'; idempotencyKey?: string; productId: string; recipientId: string;
  lineItems?: Array<{ productId: string; quantity: number }>; productName?: string; recipientName?: string;
  senderDisplayName?: string; senderDisplayMode?: 'first_name'; recipientAddressMode?: 'recipient_supplied_private' | 'sender_supplied_known_address';
  deliveryAddress?: GiftDeliveryAddress; paymentMethod?: 'apple_pay' | 'google_pay' | 'card'; paymentTokenMode?: 'provider_token_required';
  confirmationEmail?: string; confirmationPhone?: string; marketCountry?: GiftCountry; currency?: GiftCurrency;
  allowSubstitution?: boolean; maxSubstitutionPriceIncreaseMinor?: number; occasion?: string; deliveryWindow?: GiftDeliveryWindow;
  deliverySlot?: GiftDeliverySlot; recipientAvailability?: GiftRecipientAvailability; surpriseHideExactGift?: boolean;
  requestedDeliveryAt?: string; deliveryCity?: string; deliveryDistanceMilesEstimate?: number; priceCents?: number;
  etaHint?: string; note?: string; addOnSubtotalCents?: number; tipCents?: number; moments?: Array<{ kind: string; value?: string }>;
  paymentToken?: string;
};
export type GiftRecipientResponse = { orderId: string; status: GiftFulfillmentStatus; deliveryStatus: GiftFulfillmentStatus; accepted: boolean; addressStoredPrivately: boolean; inventoryReservationStatus?: 'preview_reserved' | 'reserved' | 'unavailable'; inventoryReservedUntil?: string };
export type GiftOrderResponse = { contractVersion?: 'gift-checkout-v2'; orderId: string; demo: boolean; status: GiftFulfillmentStatus; deliveryStatus: GiftFulfillmentStatus; provider: GiftDeliveryProvider; trackingUrl?: string; quote: GiftOrderQuote; steps: GiftFulfillmentStep[]; confirmations: GiftConfirmationPlan; lineItems?: Array<{ productId: string; productName: string; quantity: number; unitPriceCents: number }>; recipientAddressMode?: 'recipient_supplied_private' | 'sender_supplied_known_address'; inventoryReservationStatus?: string; inventoryReservedUntil?: string; courierStatus?: string; courierDisplayName?: string; courierVehicleSummary?: string; proofStatus?: string; proofMethod?: string };
export type GiftOrderIssueType = 'failed_delivery' | 'damaged_item' | 'wrong_item' | 'missing_item' | 'late_delivery' | 'payment' | 'other';
export type GiftOrderIssueResponse = { issueId: string; orderId: string; status: 'open' | 'investigating' | 'awaiting_evidence' | 'resolved' | 'declined'; priority: 'normal' | 'high' | 'urgent'; responseTarget: string };
